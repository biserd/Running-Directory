import { type RaceGuide, type GuideRace, RACE_GUIDE_YEAR } from "@shared/race-guides";
import { hasRaceListingValue } from "@shared/race-program";
import { storage } from "./storage";

export async function loadGuideRaces(guide: RaceGuide): Promise<GuideRace[]> {
  const rows = await Promise.all(guide.picks.map(pick => storage.getRaceBySlug(pick.slug)));
  return rows.flatMap((race, index) => {
    if (!race?.isActive || race.state !== guide.state || !race.date.startsWith(`${RACE_GUIDE_YEAR}-`) || !hasRaceListingValue(race)) return [];
    const source = [race.registrationUrl, race.website].find(url => /^https?:\/\//i.test(url ?? ""));
    if (!source) return [];
    const requested = guide.picks[index].entries.map(name => name.toLowerCase());
    const entries = requested.flatMap(name => {
      const option = race.raceProgram?.options.find(entry => {
        const label = entry.name.toLowerCase();
        return label === name || (name.endsWith(":") && label.startsWith(name));
      });
      if (!option) return [];
      const fee = race.priceCurrency === "USD" && Number.isFinite(option.fee) && option.fee! >= 0 ? option.fee : undefined;
      return [{ name: option.name, distance: option.distance, date: option.date, fee }];
    });
    return [{
      slug: race.slug, date: race.date, source, entries,
      checkedDate: race.lastSeenAt ? new Date(race.lastSeenAt).toISOString().slice(0, 10) : undefined,
      venue: race.raceProgram?.venue?.street,
    }];
  });
}
