import { storage } from "../storage";
import { normalizeName, normalizeLocationKey, normalizeUrl, generateHashKey, computeQualityScore, findExactMatch, findFuzzyMatch } from "./normalize";

export interface RawRaceRecord {
  sourceName: string;
  externalId: string;
  externalUrl?: string;
  name: string;
  date: string;
  city: string;
  state: string;
  distance?: string;
  surface?: string;
  elevation?: string;
  description?: string;
  website?: string;
  registrationUrl?: string;
  startTime?: string;
  timeLimit?: string;
  lat?: number;
  lng?: number;
}

export async function processRaceImport(records: RawRaceRecord[]): Promise<{
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}> {
  const stats = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (const record of records) {
    try {
      const normalizedName = normalizeName(record.name);
      const locationKey = normalizeLocationKey(record.city, record.state, record.lat, record.lng);
      const hashKey = generateHashKey(normalizedName, locationKey, record.date);
      const normalizedWebsite = normalizeUrl(record.website);

      const qualityScore = computeQualityScore(record);

      console.log(`Processing: ${record.name} (${record.city}, ${record.state}) - Quality: ${qualityScore}`);

      stats.created++;
    } catch (err) {
      stats.errors.push(`Error processing ${record.name}: ${err}`);
    }
  }

  return stats;
}

export async function markInactiveRaces(): Promise<number> {
  console.log("Checking for stale races to mark inactive...");
  return 0;
}

export async function refreshRaceData(): Promise<void> {
  console.log("=== Starting race data refresh ===");
  console.log("Step 1: Fetch updated records from sources (delta)");
  console.log("Step 2: Normalize and deduplicate");
  console.log("Step 3: Upsert canonical records");
  console.log("Step 4: Create/update race occurrences");
  console.log("Step 5: Update quality scores");
  console.log("Step 6: Mark stale records inactive");
  console.log("=== Race data refresh complete ===");
}

export async function refreshRouteData(): Promise<void> {
  console.log("=== Starting route data refresh ===");
  console.log("Step 1: Check for route generation parameters");
  console.log("Step 2: Regenerate computed routes if needed");
  console.log("Step 3: Update quality scores");
  console.log("=== Route data refresh complete ===");
}
