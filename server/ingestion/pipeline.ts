import { storage } from "../storage";
import { normalizeName, normalizeLocationKey, normalizeUrl, generateHashKey, computeQualityScore } from "./normalize";
import type { InsertRace, InsertSourceRecord } from "@shared/schema";

export interface RawRaceRecord {
  sourceName: string;
  externalId: string;
  externalUrl?: string;
  name: string;
  date: string;
  city: string;
  state: string;
  distance?: string;
  distanceLabel?: string;
  distanceMeters?: number;
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 80);
}

function makeUniqueSlug(name: string, city: string, state: string): string {
  const base = slugify(name);
  const suffix = slugify(`${city}-${state}`);
  if (base.includes(suffix) || base.length > 60) return base;
  return `${base}-${suffix}`.substring(0, 80);
}

export async function processRaceImport(records: RawRaceRecord[]): Promise<{
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}> {
  const stats = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  const source = await storage.getSourceByName("runsignup");
  const sourceId = source?.id || 1;

  const seenSlugs = new Set<string>();

  for (const record of records) {
    try {
      const normalizedName = normalizeName(record.name);
      const locationKey = normalizeLocationKey(record.city, record.state, record.lat, record.lng);
      const hashKey = generateHashKey(normalizedName, locationKey, record.date);
      const qualityScore = computeQualityScore(record);

      const existingSource = await storage.findSourceRecord(sourceId, record.externalId);

      if (existingSource?.canonicalRaceId) {
        await storage.updateRaceLastSeen(existingSource.canonicalRaceId);

        const sourceRecord: InsertSourceRecord = {
          sourceId,
          externalId: record.externalId,
          externalUrl: record.externalUrl,
          normalizedName,
          normalizedLocationKey: locationKey,
          normalizedDate: record.date,
          hashKey,
          canonicalRaceId: existingSource.canonicalRaceId,
        };
        await storage.upsertSourceRecord(sourceRecord);

        stats.updated++;
        continue;
      }

      let slug = makeUniqueSlug(record.name, record.city, record.state);
      if (seenSlugs.has(slug)) {
        slug = `${slug}-${record.externalId}`;
      }
      seenSlugs.add(slug);

      const raceData: InsertRace = {
        slug,
        name: record.name,
        date: record.date,
        city: record.city,
        state: record.state,
        distance: record.distance || "Other",
        surface: record.surface || "Road",
        elevation: record.elevation || "Rolling",
        description: record.description,
        website: record.website,
        registrationUrl: record.registrationUrl,
        startTime: record.startTime,
        timeLimit: record.timeLimit,
        distanceLabel: record.distanceLabel,
        distanceMeters: record.distanceMeters,
        lat: record.lat,
        lng: record.lng,
        isActive: true,
        qualityScore,
      };

      const result = await storage.upsertRace(raceData);

      const sourceRecord: InsertSourceRecord = {
        sourceId,
        externalId: record.externalId,
        externalUrl: record.externalUrl,
        normalizedName,
        normalizedLocationKey: locationKey,
        normalizedDate: record.date,
        hashKey,
        canonicalRaceId: result.id,
      };
      await storage.upsertSourceRecord(sourceRecord);

      if (result.created) {
        stats.created++;
      } else {
        stats.updated++;
      }

    } catch (err) {
      stats.errors.push(`Error processing ${record.name}: ${err}`);
    }
  }

  return stats;
}

export async function markInactiveRaces(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 45);
  const count = await storage.markRacesInactive(cutoffDate);
  console.log(`Marked ${count} races as inactive (not seen in 45 days)`);
  return count;
}

export async function refreshRaceData(options?: {
  states?: string[];
  startDate?: string;
  endDate?: string;
}): Promise<{
  totalFetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  console.log("=== Starting race data refresh from RunSignUp ===");

  const { fetchAllStates } = await import("./runsignup");

  const now = new Date();
  const defaultStartDate = now.toISOString().split("T")[0];
  const futureDate = new Date(now);
  futureDate.setMonth(futureDate.getMonth() + 18);
  const defaultEndDate = futureDate.toISOString().split("T")[0];

  const rawRecords = await fetchAllStates({
    states: options?.states,
    startDate: options?.startDate || defaultStartDate,
    endDate: options?.endDate || defaultEndDate,
    maxPagesPerState: 5,
    onStateComplete: (state, count) => {
      console.log(`  ${state}: ${count} races fetched`);
    },
  });

  console.log(`Fetched ${rawRecords.length} total race records`);
  console.log("Processing through ingestion pipeline...");

  const result = await processRaceImport(rawRecords);

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log(`=== Race refresh complete in ${duration}s ===`);
  console.log(`  Created: ${result.created}`);
  console.log(`  Updated: ${result.updated}`);
  console.log(`  Skipped: ${result.skipped}`);
  console.log(`  Errors: ${result.errors.length}`);

  return {
    totalFetched: rawRecords.length,
    ...result,
    duration,
  };
}
