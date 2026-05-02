export const SOURCE_TRUST: Record<string, number> = {
  organizer: 100,
  manual: 90,
  rrca: 70,
  raceroster: 60,
  active: 60,
  eventbrite: 55,
  runsignup: 50,
  athlinks: 40,
  scrape: 30,
};

export type ProvenanceSource = keyof typeof SOURCE_TRUST | string;

export const TRACKED_FIELDS = [
  "name",
  "date",
  "city",
  "state",
  "distance",
  "distanceLabel",
  "distanceMeters",
  "surface",
  "elevation",
  "description",
  "website",
  "registrationUrl",
  "startTime",
  "timeLimit",
  "priceMin",
  "priceMax",
  "registrationOpen",
  "registrationDeadline",
  "nextPriceIncreaseAt",
  "nextPriceIncreaseAmount",
  "terrain",
  "elevationGainM",
  "courseType",
  "courseMapUrl",
  "elevationProfileUrl",
  "fieldSize",
  "refundPolicy",
  "deferralPolicy",
  "packetPickup",
  "parkingNotes",
  "transitFriendly",
  "walkerFriendly",
  "strollerFriendly",
  "dogFriendly",
  "kidsRace",
  "charity",
  "charityPartner",
  "vibeTags",
  "couponCode",
  "couponDiscount",
  "couponExpiresAt",
  "photoUrls",
  "faq",
] as const;

export type TrackedField = (typeof TRACKED_FIELDS)[number];

const TRACKED_FIELD_SET: ReadonlySet<string> = new Set(TRACKED_FIELDS);

export function isTrackedField(field: string): field is TrackedField {
  return TRACKED_FIELD_SET.has(field);
}

export function sourceTrust(source: string): number {
  return SOURCE_TRUST[source] ?? 0;
}

export interface ProvenanceObservation {
  source: string;
  value: unknown;
  confidence: number;
  observedAt: Date;
}

/**
 * Pick the winning observation for a single field across multiple source observations.
 * Ranking: trust × confidence (higher wins). Ties broken by most recent observedAt.
 * Null/undefined values are skipped — a higher-trust source that doesn't know the value
 * loses to a lower-trust source that does.
 */
export function pickWinner(
  observations: ProvenanceObservation[],
): ProvenanceObservation | undefined {
  let best: ProvenanceObservation | undefined;
  let bestScore = -Infinity;
  for (const obs of observations) {
    if (obs.value === null || obs.value === undefined) continue;
    const score = sourceTrust(obs.source) * (obs.confidence / 100);
    if (
      score > bestScore ||
      (score === bestScore &&
        best !== undefined &&
        obs.observedAt.getTime() > best.observedAt.getTime())
    ) {
      best = obs;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Resolve all fields from a list of provenance rows grouped by field.
 * Returns a partial map of field → winning value (undefined fields are omitted).
 */
export function resolveFieldWinners(
  rows: Array<{
    fieldName: string;
    sourceKey: string;
    value: unknown;
    confidence: number;
    observedAt: Date;
  }>,
): Record<string, unknown> {
  const byField = new Map<string, ProvenanceObservation[]>();
  for (const r of rows) {
    if (!isTrackedField(r.fieldName)) continue;
    const obs: ProvenanceObservation = {
      source: r.sourceKey,
      value: r.value,
      confidence: r.confidence,
      observedAt: r.observedAt,
    };
    const list = byField.get(r.fieldName);
    if (list) list.push(obs);
    else byField.set(r.fieldName, [obs]);
  }
  const result: Record<string, unknown> = {};
  for (const [field, obsList] of Array.from(byField.entries())) {
    const winner = pickWinner(obsList);
    if (winner) result[field] = winner.value;
  }
  return result;
}
