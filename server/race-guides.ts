import { and, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import { FEATURED_RACE_GUIDES, RACE_GUIDE_YEAR, type GuideRace, type RaceGuide } from "@shared/race-guides";
import { hasRaceListingValue, publishedRaceDistance } from "@shared/race-program";
import { cities, races } from "@shared/schema";
import { db } from "./db";

const featuredSlugs = FEATURED_RACE_GUIDES.flatMap(guide => guide.picks.map(pick => pick.slug));

async function guideRows(state?: string) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  // Keep the year guide useful as an archive once a new race season starts.
  const from = now.getUTCFullYear() === RACE_GUIDE_YEAR ? today : `${RACE_GUIDE_YEAR}-01-01`;
  const fields = {
    slug: races.slug,
    name: races.name,
    state: races.state,
    city: races.city,
    date: races.date,
    surface: races.surface,
    distance: races.distance,
    distanceLabel: races.distanceLabel,
    registrationUrl: races.registrationUrl,
    website: races.website,
    description: sql<string | null>`substr(${races.description}, 1, 160)`.as("guide_description"),
    startTime: races.startTime,
    registrationDeadline: races.registrationDeadline,
    priceMin: races.priceMin,
    courseMapUrl: races.courseMapUrl,
    packetPickup: races.packetPickup,
    priceCurrency: races.priceCurrency,
    raceProgram: races.raceProgram,
    lat: sql<number | null>`coalesce(${races.lat}, ${cities.lat})`.as("guide_lat"),
    lng: sql<number | null>`coalesce(${races.lng}, ${cities.lng})`.as("guide_lng"),
    lastVerifiedAt: races.lastVerifiedAt,
    lastSeenAt: races.lastSeenAt,
    qualityScore: races.qualityScore,
  };
  const dated = db.$with("dated_guide_races").as(db.select({
    ...fields,
    cityRank: sql<number>`row_number() over (
      partition by ${races.state}, substr(${races.date}, 1, 7), lower(trim(${races.city}))
      order by ${races.priceMin} is null, ${races.qualityScore} desc, ${races.date}, ${races.slug}
    )`.as("guide_city_rank"),
  }).from(races).leftJoin(cities, eq(races.cityId, cities.id)).where(and(
    eq(races.isActive, true),
    gte(races.date, from),
    lt(races.date, `${RACE_GUIDE_YEAR + 1}-01-01`),
    state ? eq(races.state, state) : undefined,
    sql`trim(${races.city}) <> '' and (
      ${races.registrationUrl} like 'http%' or ${races.website} like 'http%'
    )`,
  )));
  const ranked = db.$with("ranked_guide_races").as(db.select({
    ...Object.fromEntries(Object.keys(fields).map(key => [key, dated[key as keyof typeof fields]])) as Pick<typeof dated, keyof typeof fields>,
    monthRank: sql<number>`row_number() over (
      partition by ${dated.state}, substr(${dated.date}, 1, 7)
      order by ${dated.cityRank}, ${dated.priceMin} is null, ${dated.qualityScore} desc, ${dated.date}, ${dated.slug}
    )`.as("guide_month_rank"),
  }).from(dated));

  return db.with(dated, ranked).select().from(ranked)
    .where(or(lte(ranked.monthRank, 4), inArray(ranked.slug, featuredSlugs)))
    .orderBy(ranked.date, ranked.slug);
}

type GuideRow = Awaited<ReturnType<typeof guideRows>>[number];

function toGuideRace(race: GuideRow, guide: RaceGuide): GuideRace[] {
  if (!hasRaceListingValue(race) || /\b(?:virtual only|test event|practice registration)\b/i.test(race.name)) return [];
  const source = [race.registrationUrl, race.website].find(url => /^https?:\/\//i.test(url ?? ""));
  if (!source) return [];
  const pick = guide.picks.find(candidate => candidate.slug === race.slug);
  const options = race.raceProgram?.options ?? [];
  const selected = pick ? pick.entries.flatMap(name => {
    const wanted = name.toLowerCase();
    const option = options.find(entry => {
      const label = entry.name.toLowerCase();
      return label === wanted || (wanted.endsWith(":") && label.startsWith(wanted));
    });
    return option ? [option] : [];
  }) : options.filter(option =>
    option.distance && !/\b(?:virtual|wheelchair|relay|challenge|kids?|youth|junior|child(?:ren)?|family fun|volunteer|shirt only)\b/i.test(option.name),
  );
  const checked = race.lastVerifiedAt ?? race.lastSeenAt;
  return [{
    slug: race.slug, name: race.name, city: race.city, date: race.date, source,
    distance: publishedRaceDistance(race)!, surface: race.surface,
    coordinates: race.lat != null && race.lng != null ? [race.lat, race.lng] : undefined,
    checkedDate: checked ? new Date(checked).toISOString().slice(0, 10) : undefined,
    venue: race.raceProgram?.venue?.street,
    startTime: race.startTime || undefined,
    entries: selected.filter(option => option.date.startsWith(`${RACE_GUIDE_YEAR}-`)).slice(0, 5).map(option => ({
      name: option.name, distance: option.distance, date: option.date, startTime: option.startTime,
      fee: race.priceCurrency === "USD" && Number.isFinite(option.fee) && option.fee! >= 0 ? option.fee : undefined,
    })),
  }];
}

export async function loadGuideRaces(guide: RaceGuide): Promise<GuideRace[]> {
  return (await guideRows(guide.state)).flatMap(race => toGuideRace(race, guide));
}

export async function loadAllGuideRaces(guides: readonly RaceGuide[]) {
  const byState = new Map(guides.map(guide => [guide.state, { guide, races: [] as GuideRace[] }]));
  for (const row of await guideRows()) {
    const group = byState.get(row.state);
    if (group) group.races.push(...toGuideRace(row, group.guide));
  }
  return [...byState.values()];
}
