/**
 * One-time (re-runnable) geocoder backfill.
 *
 * Why: as of writing, every row in `races` (and `cities`) has NULL lat/lng.
 * That breaks the Race Shopper's travel-radius filter and the per-race map
 * markers. This script fills them in by geocoding distinct (city, state)
 * pairs through Open-Meteo's free geocoding API and writing the result back
 * to every race in that pair.
 *
 * Open-Meteo allows ~10k requests/day at no cost and no key. We have
 * ~5,400 unique pairs, so a single run fits well inside the free tier.
 *
 * Usage: `tsx script/backfill-geocodes.ts`
 *   --dry-run   resolve coords but don't update the database
 *   --limit=N   only process the first N pairs (useful for smoke tests)
 */
import { db } from "../server/db";
import { races, cities } from "../shared/schema";
import { sql, and, isNull, eq } from "drizzle-orm";

type Coords = { lat: number; lng: number };

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : Infinity;

// Soft rate limit so we stay well under Open-Meteo's free tier and don't
// look like a runaway scraper. ~5 req/s = ~1080 lookups/min.
const REQ_INTERVAL_MS = 100;

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocode(city: string, state: string): Promise<Coords | null> {
  const stateName = STATE_NAMES[state.toUpperCase()] || state;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json&countryCode=US`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j: any = await r.json();
    const results: any[] = Array.isArray(j.results) ? j.results : [];
    if (results.length === 0) return null;

    // Prefer results in the same admin1 (state) so "Manhattan, KS" doesn't get
    // tagged with NYC's coords. Fall back to the highest-population US match.
    const sameState = results.find(
      (x) => (x.admin1 || "").toLowerCase() === stateName.toLowerCase(),
    );
    const pick = sameState
      || results.find((x) => x.country_code === "US")
      || results[0];
    if (typeof pick.latitude !== "number" || typeof pick.longitude !== "number") {
      return null;
    }
    return { lat: pick.latitude, lng: pick.longitude };
  } catch {
    return null;
  }
}

async function loadPairs(): Promise<{ city: string; state: string; n: number }[]> {
  const rows = await db.execute<{ city: string; state: string; n: number }>(sql`
    SELECT city, state, COUNT(*)::int AS n
    FROM races
    WHERE lat IS NULL AND city IS NOT NULL AND state IS NOT NULL
    GROUP BY city, state
    ORDER BY n DESC
  `);
  return (rows as any).rows ?? (rows as any);
}

async function updateRaces(city: string, state: string, c: Coords) {
  await db
    .update(races)
    .set({ lat: c.lat, lng: c.lng })
    .where(and(eq(races.city, city), eq(races.state, state), isNull(races.lat)));
}

async function updateCity(city: string, state: string, c: Coords) {
  // cities are keyed by (name, state_id); we don't always have state_id here,
  // so just set lat/lng on every row whose name matches in that state via a
  // raw join. No-op if no matching row exists.
  await db.execute(sql`
    UPDATE cities
       SET lat = ${c.lat}, lng = ${c.lng}
     WHERE lat IS NULL
       AND name = ${city}
       AND state_id IN (SELECT id FROM states WHERE abbreviation = ${state})
  `);
}

async function main() {
  const startedAt = Date.now();
  const pairs = await loadPairs();
  console.log(
    `[geocode] ${pairs.length} unique (city, state) pairs to resolve` +
    (LIMIT < pairs.length ? ` (limited to ${LIMIT})` : "") +
    (DRY_RUN ? " — DRY RUN" : ""),
  );

  let resolved = 0, skipped = 0, racesUpdated = 0;
  const slice = pairs.slice(0, LIMIT === Infinity ? pairs.length : LIMIT);

  for (let i = 0; i < slice.length; i++) {
    const { city, state, n } = slice[i];
    const coords = await geocode(city, state);
    if (!coords) {
      skipped++;
      if (skipped <= 20) console.log(`  ✗ ${city}, ${state} (no result, ${n} races)`);
    } else {
      resolved++;
      racesUpdated += n;
      if (!DRY_RUN) {
        await updateRaces(city, state, coords);
        await updateCity(city, state, coords);
      }
    }

    if ((i + 1) % 100 === 0) {
      const pct = Math.round(((i + 1) / slice.length) * 100);
      const rate = Math.round((i + 1) / ((Date.now() - startedAt) / 1000));
      console.log(
        `[geocode] ${i + 1}/${slice.length} (${pct}%) — ` +
        `${resolved} ok, ${skipped} miss, ~${rate}/s`,
      );
    }
    await sleep(REQ_INTERVAL_MS);
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  console.log(
    `[geocode] done in ${elapsed}s — ${resolved} pairs resolved, ${skipped} unresolved, ` +
    `${racesUpdated.toLocaleString()} race rows ${DRY_RUN ? "would be" : ""} updated.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("[geocode] fatal:", err);
  process.exit(1);
});
