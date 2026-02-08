import type { RawRaceRecord } from "./pipeline";

const BASE_URL = "https://api.runsignup.com/rest/races";
const RESULTS_PER_PAGE = 200;
const REQUEST_DELAY_MS = 500;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

const VIRTUAL_CITIES = new Set(["anywhere", "virtual", "everywhere", "your city", "any city"]);

interface RunSignUpRace {
  race_id: number;
  name: string;
  next_date: string | null;
  last_date: string | null;
  description: string | null;
  url: string;
  external_race_url: string | null;
  created: string;
  last_modified: string;
  is_draft_race: string;
  is_private_race: string;
  is_registration_open: string;
  address: {
    street?: string;
    city: string;
    state: string;
    zipcode: string;
    country_code: string;
  };
  timezone: string;
  logo_url: string | null;
  events?: Array<{
    event_id: number;
    name: string;
    start_time: string;
    end_time?: string;
    event_type: string;
    distance: number | null;
    distance_units?: string;
    registration_periods?: Array<{
      race_fee: number | string;
    }>;
  }>;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRunSignUpDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split(" ")[0].split("/");
  if (parts.length !== 3) return null;
  const [month, day, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function classifyDistance(distanceValue: number | null, units: string | undefined, eventName: string): { distance: string; distanceLabel: string; distanceMeters: number } {
  if (distanceValue && units) {
    let meters = distanceValue;
    if (units === "K" || units === "Kilometers") meters = distanceValue * 1000;
    else if (units === "M" || units === "Miles") meters = distanceValue * 1609.34;

    if (meters >= 80000) return { distance: "Ultra", distanceLabel: "Ultra", distanceMeters: Math.round(meters) };
    if (meters >= 41000 && meters <= 43000) return { distance: "Marathon", distanceLabel: "Marathon", distanceMeters: 42195 };
    if (meters >= 20500 && meters <= 22000) return { distance: "Half Marathon", distanceLabel: "Half Marathon", distanceMeters: 21097 };
    if (meters >= 9500 && meters <= 10500) return { distance: "10K", distanceLabel: "10K", distanceMeters: 10000 };
    if (meters >= 4800 && meters <= 5200) return { distance: "5K", distanceLabel: "5K", distanceMeters: 5000 };
    if (meters >= 1500 && meters <= 1700) return { distance: "1 Mile", distanceLabel: "1 Mile", distanceMeters: 1609 };
    return { distance: "Other", distanceLabel: `${distanceValue} ${units}`, distanceMeters: Math.round(meters) };
  }

  const nameLower = eventName.toLowerCase();
  if (nameLower.includes("marathon") && !nameLower.includes("half") && !nameLower.includes("ultra"))
    return { distance: "Marathon", distanceLabel: "Marathon", distanceMeters: 42195 };
  if (nameLower.includes("half marathon") || nameLower.includes("half-marathon") || nameLower.includes("13.1"))
    return { distance: "Half Marathon", distanceLabel: "Half Marathon", distanceMeters: 21097 };
  if (nameLower.includes("ultra") || nameLower.includes("100 mile") || nameLower.includes("50 mile") || nameLower.includes("100k") || nameLower.includes("50k"))
    return { distance: "Ultra", distanceLabel: "Ultra", distanceMeters: 80000 };
  if (nameLower.includes("10k") || nameLower.includes("10 k"))
    return { distance: "10K", distanceLabel: "10K", distanceMeters: 10000 };
  if (nameLower.includes("5k") || nameLower.includes("5 k"))
    return { distance: "5K", distanceLabel: "5K", distanceMeters: 5000 };
  if (nameLower.includes("1 mile") || nameLower.includes("mile run"))
    return { distance: "1 Mile", distanceLabel: "1 Mile", distanceMeters: 1609 };

  return { distance: "Other", distanceLabel: "Other", distanceMeters: 0 };
}

function classifyEventType(eventType: string): string | null {
  if (eventType === "running_race") return "Road";
  if (eventType === "trail_race") return "Trail";
  if (eventType === "virtual_race") return null;
  if (eventType === "obstacle_mud_race") return null;
  if (eventType === "triathlon") return null;
  if (eventType === "cycling_race") return null;
  if (eventType === "swimming") return null;
  if (eventType === "walking") return "Road";
  return "Road";
}

function isVirtualRace(race: RunSignUpRace): boolean {
  if (VIRTUAL_CITIES.has(race.address.city.toLowerCase())) return true;
  if (race.events?.every(e => e.event_type === "virtual_race")) return true;
  if (race.address.zipcode === "99999" || race.address.zipcode === "00000") return true;
  return false;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 80);
}

function transformRace(rsuRace: RunSignUpRace): RawRaceRecord | null {
  if (rsuRace.is_draft_race === "T") return null;
  if (rsuRace.is_private_race === "T") return null;
  if (isVirtualRace(rsuRace)) return null;
  if (rsuRace.address.country_code !== "US") return null;

  const date = parseRunSignUpDate(rsuRace.next_date) || parseRunSignUpDate(rsuRace.last_date);
  if (!date) return null;

  const city = rsuRace.address.city;
  const state = rsuRace.address.state;
  if (!city || !state || city.length < 2) return null;

  const primaryEvent = rsuRace.events?.find(e => {
    const surface = classifyEventType(e.event_type);
    return surface !== null;
  }) || rsuRace.events?.[0];

  const surface = primaryEvent ? (classifyEventType(primaryEvent.event_type) || "Road") : "Road";

  const distInfo = classifyDistance(
    primaryEvent?.distance || null,
    primaryEvent?.distance_units,
    primaryEvent?.name || rsuRace.name
  );

  const description = rsuRace.description ? stripHtml(rsuRace.description) : undefined;
  const trimmedDesc = description && description.length > 500 ? description.substring(0, 497) + "..." : description;

  const website = rsuRace.external_race_url || rsuRace.url;
  const registrationUrl = rsuRace.url;

  let startTime: string | undefined;
  if (primaryEvent?.start_time) {
    const timePart = primaryEvent.start_time.split(" ")[1];
    if (timePart && timePart !== "00:00") {
      const [h, m] = timePart.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      startTime = `${hour12}:${m} ${ampm}`;
    }
  }

  return {
    sourceName: "runsignup",
    externalId: String(rsuRace.race_id),
    externalUrl: rsuRace.url,
    name: rsuRace.name.trim(),
    date,
    city,
    state,
    distance: distInfo.distance,
    distanceLabel: distInfo.distanceLabel,
    distanceMeters: distInfo.distanceMeters,
    surface,
    elevation: "Rolling",
    description: trimmedDesc,
    website,
    registrationUrl,
    startTime,
  };
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchRacesByState(
  stateAbbr: string,
  options?: {
    startDate?: string;
    endDate?: string;
    modifiedSince?: string;
    maxPages?: number;
  }
): Promise<RawRaceRecord[]> {
  const records: RawRaceRecord[] = [];
  const maxPages = options?.maxPages || 10;
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= maxPages) {
    const params = new URLSearchParams({
      format: "json",
      state: stateAbbr,
      results_per_page: String(RESULTS_PER_PAGE),
      page: String(page),
      events: "T",
      sort: "date ASC",
    });

    if (options?.startDate) params.set("start_date", options.startDate);
    else params.set("start_date", new Date().toISOString().split("T")[0]);

    if (options?.endDate) params.set("end_date", options.endDate);
    if (options?.modifiedSince) params.set("modified_since", options.modifiedSince);

    try {
      const url = `${BASE_URL}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`RunSignUp API error for ${stateAbbr} page ${page}: ${response.status}`);
        break;
      }

      const data = await response.json();
      const races: Array<{ race: RunSignUpRace }> = data.races || [];

      if (races.length === 0) {
        hasMore = false;
        break;
      }

      for (const { race } of races) {
        const record = transformRace(race);
        if (record) {
          records.push(record);
        }
      }

      if (races.length < RESULTS_PER_PAGE) {
        hasMore = false;
      }

      page++;

      if (hasMore) await delay(REQUEST_DELAY_MS);
    } catch (err) {
      console.error(`RunSignUp fetch error for ${stateAbbr} page ${page}:`, err);
      break;
    }
  }

  return records;
}

export async function fetchAllStates(options?: {
  states?: string[];
  startDate?: string;
  endDate?: string;
  modifiedSince?: string;
  maxPagesPerState?: number;
  onStateComplete?: (state: string, count: number) => void;
}): Promise<RawRaceRecord[]> {
  const statesToFetch = options?.states || US_STATES;
  const allRecords: RawRaceRecord[] = [];

  for (const state of statesToFetch) {
    const records = await fetchRacesByState(state, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      modifiedSince: options?.modifiedSince,
      maxPages: options?.maxPagesPerState || 5,
    });

    allRecords.push(...records);

    if (options?.onStateComplete) {
      options.onStateComplete(state, records.length);
    }

    await delay(300);
  }

  return allRecords;
}
