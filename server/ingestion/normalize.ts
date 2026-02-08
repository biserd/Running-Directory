const STRIP_TOKENS = ["the", "annual", "and", "of", "a", "an", "for", "in", "at", "by"];

export function normalizeName(name: string): string {
  let normalized = name
    .toLowerCase()
    .replace(/[''""]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized.split(" ").filter(w => !STRIP_TOKENS.includes(w));
  return words.join(" ");
}

export function normalizeLocationKey(city: string, state: string, lat?: number | null, lng?: number | null): string {
  const cityNorm = city.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const stateNorm = state.toLowerCase().trim();

  if (lat != null && lng != null) {
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `${cityNorm}|${stateNorm}|${roundedLat}|${roundedLng}`;
  }

  return `${cityNorm}|${stateNorm}`;
}

export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
  }
}

export function generateHashKey(normalizedName: string, locationKey: string, date: string): string {
  return `${normalizedName}|${locationKey}|${date}`;
}

export function computeQualityScore(record: {
  description?: string | null;
  website?: string | null;
  registrationUrl?: string | null;
  startTime?: string | null;
  distance?: string | null;
  surface?: string | null;
  elevation?: string | null;
}): number {
  let score = 10;

  if (record.description && record.description.length > 50) score += 20;
  if (record.description && record.description.length > 200) score += 10;
  if (record.website) score += 15;
  if (record.registrationUrl) score += 10;
  if (record.startTime) score += 10;
  if (record.distance && record.distance !== "Other") score += 10;
  if (record.surface && record.surface !== "unknown") score += 5;
  if (record.elevation) score += 5;

  return Math.min(score, 100);
}

export interface DedupeMatch {
  type: "exact_url" | "exact_match" | "fuzzy_match";
  canonicalRaceId: number;
  confidence: number;
}

export function findExactMatch(
  normalizedName: string,
  locationKey: string,
  date: string,
  existingRecords: Array<{ id: number; normalizedName: string; locationKey: string; date: string; normalizedUrl?: string | null }>
): DedupeMatch | null {
  for (const existing of existingRecords) {
    if (existing.normalizedName === normalizedName && existing.locationKey === locationKey && existing.date === date) {
      return { type: "exact_match", canonicalRaceId: existing.id, confidence: 1.0 };
    }
  }

  for (const existing of existingRecords) {
    if (existing.normalizedName === normalizedName && existing.locationKey === locationKey) {
      const dateDiff = Math.abs(new Date(date).getTime() - new Date(existing.date).getTime());
      if (dateDiff <= 86400000) {
        return { type: "exact_match", canonicalRaceId: existing.id, confidence: 0.95 };
      }
    }
  }

  return null;
}

export function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length < 3 || b.length < 3) return 0;

  const trigramsA = new Set<string>();
  const trigramsB = new Set<string>();

  for (let i = 0; i <= a.length - 3; i++) trigramsA.add(a.substring(i, i + 3));
  for (let i = 0; i <= b.length - 3; i++) trigramsB.add(b.substring(i, i + 3));

  let intersection = 0;
  trigramsA.forEach(t => {
    if (trigramsB.has(t)) intersection++;
  });

  return intersection / (trigramsA.size + trigramsB.size - intersection);
}

export function findFuzzyMatch(
  normalizedName: string,
  locationKey: string,
  date: string,
  existingRecords: Array<{ id: number; normalizedName: string; locationKey: string; date: string }>,
  threshold = 0.6
): DedupeMatch | null {
  for (const existing of existingRecords) {
    if (existing.locationKey !== locationKey) continue;

    const dateDiff = Math.abs(new Date(date).getTime() - new Date(existing.date).getTime());
    if (dateDiff > 86400000) continue;

    const similarity = trigramSimilarity(normalizedName, existing.normalizedName);
    if (similarity >= threshold) {
      return { type: "fuzzy_match", canonicalRaceId: existing.id, confidence: similarity };
    }
  }

  return null;
}
