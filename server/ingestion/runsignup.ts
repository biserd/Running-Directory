import type { RawRaceRecord } from "./pipeline";

const BASE_URL = "https://api.runsignup.com/rest/races";
export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

interface RunSignupEvent {
  name: string;
  event_type: string;
  volunteer?: string;
  start_time?: string;
  distance?: number | string | null;
  distance_units?: string;
  registration_periods?: {
    registration_opens?: string;
    registration_closes?: string;
    race_fee?: number | string;
  }[];
}

interface RunSignupRace {
  race_id: number;
  name: string;
  next_date?: string | null;
  description?: string | null;
  url: string;
  external_race_url?: string | null;
  is_draft_race?: string;
  is_private_race?: string;
  is_registration_open?: string;
  address?: { city?: string; state?: string; zipcode?: string; country_code?: string };
  events?: RunSignupEvent[];
}

function raceDate(value?: string | null): string | undefined {
  const match = value?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/);
  if (!match) return;
  const [, month, day, year] = match;
  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().startsWith(date) ? date : undefined;
}

function dateTime(value?: string): string | undefined {
  const date = raceDate(value);
  const time = value?.match(/\s(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (date && time) return `${date} ${time[1].padStart(2, "0")}:${time[2]}`;
}

function surfaceFor(event: RunSignupEvent, raceName: string): "Road" | "Trail" | undefined {
  if (event.volunteer === "T" || /^test\b/i.test(event.name) || /\b(?:virtual|volunteer|test event|testing|practice registration)\b/i.test(event.name) ||
    (/\bchallenge\b/i.test(event.name) && event.name.includes("+"))) return;
  if (["trail_race", "trail_run"].includes(event.event_type) || (["running_only", "running_race"].includes(event.event_type) && /\btrail\b/i.test(event.name))) return "Trail";
  if (["running_only", "running_race"].includes(event.event_type)) return "Road";
  if (["other", "nonprofit_event", "run_walk"].includes(event.event_type)
    && /\b(?:run|running|\d+\s*k|marathon|turkey trot)\b/i.test(event.name)
    && !/\b(?:triathlon|duathlon|swim|swimming|cycling|bike)\b/i.test(`${event.name} ${raceName}`)) return "Road";
}

function distanceFor(event: RunSignupEvent) {
  const description = event.name.toLowerCase();
  const advertised = description.match(/\b(\d+(?:\.\d+)?)\s*(k(?:m)?|mi(?:les?)?|meters?)\b/i);
  const match = advertised ?? String(event.distance ?? "").trim()
    .match(/^(\d+(?:\.\d+)?)\s*(k(?:m|ilometers?)?|mi(?:les?)?|meters?|m)$/i);
  const value = match ? Number(match[1]) : typeof event.distance === "number" ? event.distance : null;
  const unit = (match?.[2] ?? event.distance_units ?? "").toLowerCase();
  const meters = value && unit ? Math.round(value * (unit.startsWith("k") ? 1000 : unit === "mi" || unit.startsWith("mile") ? 1609.344 : unit === "m" && !match ? 1609.344 : 1)) : undefined;
  const label = meters && value ? `${value}${unit.startsWith("k") ? "K" : unit.startsWith("mi") ? " mi" : " m"}` : undefined;
  if (meters && meters > 42500) return { distance: "Ultra", label, meters };
  if (meters && meters >= 41000) return { distance: "Marathon", label: "Marathon", meters };
  if ((meters && meters >= 20500 && meters <= 22000) || /half[ -]marathon|\b13\.1\b/.test(description)) return { distance: "Half Marathon", label: "Half Marathon", meters };
  if ((meters && meters >= 9500 && meters <= 10500) || /\b10\s*k\b/.test(description)) return { distance: "10K", label: "10K", meters };
  if ((meters && meters >= 4800 && meters <= 5200) || /\b5\s*k\b/.test(description)) return { distance: "5K", label: "5K", meters };
  if (meters && meters >= 1500 && meters <= 1700) return { distance: "1 Mile", label: "1 Mile", meters };
  if (/\bultra\b/.test(description)) return { distance: "Ultra", label: "Ultra", meters };
  if (/\bmarathon\b/.test(description) && !meters) return { distance: "Marathon", label: "Marathon", meters };
  return { distance: "Other", label, meters };
}

function cleanDescription(html?: string | null) {
  return html?.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim().slice(0, 500) || undefined;
}

export function transformRace(race: RunSignupRace, now = new Date()): RawRaceRecord | null {
  const city = race.address?.city?.trim();
  const state = race.address?.state?.toUpperCase();
  const name = race.name?.trim();
  if (!city || !state || !name || !US_STATES.includes(state) || race.address?.country_code !== "US") return null;
  if (race.is_draft_race === "T" || race.is_private_race === "T" ||
    /^(?:anywhere|virtual|everywhere|world wide\W*|your city|any city|test|sample)$/i.test(city) || /^(?:00000|99999)$/.test(race.address.zipcode ?? "")) return null;
  if (/^test(?:\b|\d)/i.test(name) || /\bTEST$/.test(name) ||
    /\b(?:RaceDay Certification|test (?:race|page|site)|demo race|charity demo|run template|teams test|check.in testing|practice registration|mailing list)\b/i.test(name)) return null;
  if (!/^https?:\/\/(?:www\.)?runsignup\.com\/Race\//i.test(race.url)) return null;

  const date = raceDate(race.next_date);
  if (!date) return null;
  const events = (race.events ?? []).flatMap(event => {
    const surface = surfaceFor(event, name);
    const start = dateTime(event.start_time);
    if (!surface || !start || start.slice(0, 10) < date) return [];
    return [{ event, surface, start, ...distanceFor(event) }];
  }).sort((a, b) => a.start.localeCompare(b.start));
  if (!events.length || events[0].start.slice(0, 10) > date) return null;
  const edition = events.filter(item => Date.parse(item.start.slice(0, 10)) - Date.parse(date) <= 3 * 86400000);
  const primary = edition.find(item => item.distance !== "Other") ?? edition[0];
  const labels = [...new Set(edition.flatMap(item => item.label ? [item.label] : []))];
  if (!labels.length) return null;
  if (primary.meters && primary.meters > 500_000 && /\bchallenge\b/i.test(name)) return null;

  const periods = edition.flatMap(item => item.event.registration_periods ?? []);
  const easternNow = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/New_York", dateStyle: "short", timeStyle: "short",
  }).format(now);
  const activePeriods = periods.filter(period => {
    const opens = dateTime(period.registration_opens);
    const closes = dateTime(period.registration_closes);
    return opens && closes && opens <= easternNow && easternNow < closes;
  });
  const fees = activePeriods.flatMap(period => {
    const cost = String(period.race_fee ?? "").trim();
    return /^\$?\d+(?:\.\d{1,2})?$/.test(cost) ? [Number(cost.replace(/^\$/, ""))] : [];
  });
  const deadline = periods.map(period => raceDate(period.registration_closes)).filter(Boolean).sort().at(-1);
  const [h, m] = edition[0].start.slice(-5).split(":").map(Number);
  return {
    sourceName: "runsignup",
    externalId: String(race.race_id),
    externalUrl: race.url,
    name, date, city, state,
    distance: primary.distance,
    distanceOptions: [...new Set(edition.map(item => item.distance))],
    distanceLabel: labels.join(", "),
    distanceMeters: primary.meters,
    surface: primary.surface,
    description: cleanDescription(race.description),
    website: /^https?:\/\//i.test(race.external_race_url ?? "") ? race.external_race_url! : race.url,
    registrationUrl: race.url,
    startTime: `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`,
    registrationOpen: race.is_registration_open === "T" ? true : race.is_registration_open === "F" ? false : undefined,
    registrationDeadline: deadline,
    priceMin: race.is_registration_open === "T" && fees.length ? Math.min(...fees) : undefined,
    priceMax: race.is_registration_open === "T" && fees.length ? Math.max(...fees) : undefined,
  };
}

interface FetchOptions {
  startDate?: string;
  endDate?: string;
  modifiedSince?: string;
  maxPages?: number;
  onExcluded?: (externalId: string) => void;
}

export async function fetchRacesByState(state: string, options: FetchOptions = {}): Promise<RawRaceRecord[]> {
  if (!US_STATES.includes(state)) throw new Error(`Unknown U.S. state: ${state}`);
  const records = new Map<string, RawRaceRecord>();
  const pageSize = 200;
  const start = options.startDate ?? new Date().toISOString().slice(0, 10);
  const end = options.endDate ?? new Date(Date.parse(start) + 548 * 86_400_000).toISOString().slice(0, 10);
  const maxPages = Math.min(options.maxPages ?? 5, 5);
  for (let page = 1; page <= maxPages; page++) {
    const query = new URLSearchParams({
      format: "json", country: "US", state, page: String(page), results_per_page: String(pageSize),
      events: "T", start_date: start, end_date: end, search_start_date_only: "T",
    });
    if (options.modifiedSince) query.set("modified_since", options.modifiedSince);
    const response = await fetch(`${BASE_URL}?${query}`, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`RunSignup failed for ${state} page ${page} (HTTP ${response.status})`);
    const listing = await response.json() as { races?: { race: RunSignupRace }[] };
    if (!Array.isArray(listing.races)) throw new Error(`RunSignup omitted race data for ${state} page ${page}`);
    for (const { race } of listing.races) {
      const record = transformRace(race);
      if (!record) {
        if (raceDate(race.next_date) && race.address?.state === state) options.onExcluded?.(String(race.race_id));
        continue;
      }
      if (record.state === state && record.date >= start && record.date <= end) {
        records.set(record.externalId, record);
      }
    }
    if (listing.races.length < pageSize) return [...records.values()];
    await new Promise(resolve => setTimeout(resolve, 450));
  }
  // The public endpoint limits every query to 1,000 results. Divide dense
  // states into date windows so their calendars are fetched without a key.
  if (end <= start) throw new Error(`RunSignup reached the page cap for ${state} on ${start}`);
  const dayMs = 86_400_000;
  const midpoint = Date.parse(start) + Math.floor((Date.parse(end) - Date.parse(start)) / (2 * dayMs)) * dayMs;
  const leftEnd = new Date(midpoint).toISOString().slice(0, 10);
  const rightStart = new Date(midpoint + dayMs).toISOString().slice(0, 10);
  const left = await fetchRacesByState(state, { ...options, startDate: start, endDate: leftEnd });
  const right = await fetchRacesByState(state, { ...options, startDate: rightStart, endDate: end });
  return [...new Map([...left, ...right].map(record => [record.externalId, record])).values()];
}

export async function fetchAllStates(options: Omit<FetchOptions, "maxPages"> & {
  states?: string[];
  maxPagesPerState?: number;
  onStateComplete?: (state: string, count: number) => void;
} = {}): Promise<RawRaceRecord[]> {
  const records: RawRaceRecord[] = [];
  for (const state of options.states ?? US_STATES) {
    const races = await fetchRacesByState(state, { ...options, maxPages: options.maxPagesPerState });
    records.push(...races);
    options.onStateComplete?.(state, races.length);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return records;
}
