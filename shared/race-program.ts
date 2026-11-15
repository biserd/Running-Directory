import { getStateName, getStateSlug } from "./states";

export interface RaceProgram {
  venue?: { street: string; postalCode?: string };
  timeZone?: string;
  options: { name: string; date: string; startTime: string; distance?: string; fee?: number }[];
}

interface RaceFacts {
  name: string;
  date: string;
  city: string;
  state: string;
  distance: string;
  distanceLabel?: string | null;
  description?: string | null;
  website?: string | null;
  registrationUrl?: string | null;
  startTime?: string | null;
  registrationDeadline?: string | null;
  priceMin?: number | null;
  courseMapUrl?: string | null;
  packetPickup?: string | null;
}

export function publishedRaceDistance(race: Pick<RaceFacts, "distance" | "distanceLabel">) {
  const label = race.distanceLabel?.trim() || race.distance.trim();
  return label && !/^(?:other|unknown|tbd|various|n\/a)$/i.test(label) ? label : undefined;
}

export function hasRaceListingValue(race: RaceFacts) {
  const knownLogistics = race.startTime?.trim() || race.registrationDeadline || race.priceMin != null
    || race.courseMapUrl || race.packetPickup?.trim();
  return Boolean(race.name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(race.date) && race.city.trim() && race.state.trim()
    && publishedRaceDistance(race) && [race.registrationUrl, race.website].some(url => /^https?:\/\//i.test(url ?? ""))
    && (knownLogistics || (race.description?.trim().length ?? 0) >= 120));
}

export function raceDateLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

export function raceListingDescription(race: RaceFacts) {
  const date = raceDateLabel(race.date);
  const distance = publishedRaceDistance(race);
  const place = `${race.city}, ${getStateName(race.state)}`;
  const location = date === "Invalid Date" ? place : `${place} on ${date}`;
  const timing = race.startTime ? ` First start at ${race.startTime} local time.` : "";
  return `${location}${distance ? ` · ${distance}` : ""}.${timing}`;
}

export function raceEventStartDate(date: string, program?: RaceProgram | null) {
  const start = program?.options[0];
  const clock = start?.startTime.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!clock || start?.date !== date || !program?.timeZone) return date;
  const hours = Number(clock[1]) % 12 + (clock[3] === "PM" ? 12 : 0);
  const local = `${date}T${String(hours).padStart(2, "0")}:${clock[2]}:00`;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: program.timeZone, timeZoneName: "longOffset" });
    const offsetAt = (iso: string) => formatter.formatToParts(new Date(iso))
      .find(part => part.type === "timeZoneName")?.value.replace(/^GMT$/, "GMT+00:00").slice(3);
    const guess = offsetAt(`${local}Z`);
    const offset = guess && offsetAt(`${local}${guess}`);
    return offset && offsetAt(`${local}${offset}`) === offset ? `${local}${offset}` : date;
  } catch {
    return date;
  }
}

export function stateRaceCalendarHref(state: string, page = 1) {
  const base = `/races/state/${getStateSlug(state)}`;
  return page === 1 ? base : `${base}/page/${page}`;
}

export const RACE_CALENDAR_PAGE_SIZE = 24;
