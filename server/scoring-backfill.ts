import { db } from "./db";
import { races, raceOccurrences } from "@shared/schema";
import { eq, sql, and, isNull, or } from "drizzle-orm";
import { computeRaceScores, deriveRaceFlags } from "./scoring";

/**
 * Backfill races.priceMin / priceMax / elevationGainM from the next-upcoming
 * race_occurrence (the source of truth from RunSignUp ingestion).
 *
 * NOTE: races.nextPriceIncreaseAt and races.nextPriceIncreaseAmount intentionally
 * are NOT derived here. Those fields require a per-tier price ladder
 * (e.g., "fee is $40 today, jumps to $50 on May 1, $60 on June 1"). The current
 * race_occurrences schema only stores a single priceMin/priceMax snapshot per
 * occurrence, not a tier ladder, so we can't truthfully infer the next bump
 * from it. Inferring from a *different year*'s occurrence (next year's race)
 * would be misleading. Those fields are populated by the organizer-pricing
 * ingestion pipeline scoped under Task #2 (RunSignUp event-detail ingestion
 * with priceTiers / regOpensAt / regClosesAt) and Task #3 (organizer pricing
 * scrape), and surfaced by the /price-watch page once that data lands.
 */
export async function backfillPricingFromOccurrences(): Promise<{ updated: number }> {
  const result = await db.execute(sql`
    WITH latest_occ AS (
      SELECT DISTINCT ON (race_id)
        race_id,
        price_min,
        price_max,
        course_elevation_gain_m
      FROM ${raceOccurrences}
      WHERE start_date >= CURRENT_DATE::text
      ORDER BY race_id, start_date ASC, COALESCE(last_modified_at, NOW()) DESC
    )
    UPDATE ${races} r
    SET
      price_min = COALESCE(r.price_min, lo.price_min),
      price_max = COALESCE(r.price_max, lo.price_max),
      elevation_gain_m = COALESCE(r.elevation_gain_m, lo.course_elevation_gain_m)
    FROM latest_occ lo
    WHERE r.id = lo.race_id
      AND (
        (r.price_min IS NULL AND lo.price_min IS NOT NULL)
        OR (r.price_max IS NULL AND lo.price_max IS NOT NULL)
        OR (r.elevation_gain_m IS NULL AND lo.course_elevation_gain_m IS NOT NULL)
      )
  `);
  const updated = (result as { rowCount?: number }).rowCount ?? 0;
  return { updated };
}

export async function backfillRaceScores(opts: { force?: boolean; batchSize?: number } = {}): Promise<{ processed: number; updated: number }> {
  const batchSize = opts.batchSize ?? 500;
  let processed = 0;
  let updated = 0;
  let lastId = 0;

  while (true) {
    const where = opts.force
      ? sql`${races.id} > ${lastId}`
      : and(
          sql`${races.id} > ${lastId}`,
          or(isNull(races.scoresUpdatedAt), sql`${races.scoresUpdatedAt} < NOW() - INTERVAL '7 days'`)
        );

    const batch = await db.select().from(races)
      .where(where)
      .orderBy(races.id)
      .limit(batchSize);

    if (batch.length === 0) break;

    for (const race of batch) {
      processed++;
      lastId = race.id;
      try {
        const flags = deriveRaceFlags(race);
        const scores = computeRaceScores(race);
        await db.update(races)
          .set({
            beginnerScore: scores.beginnerScore,
            prScore: scores.prScore,
            valueScore: scores.valueScore,
            vibeScore: scores.vibeScore,
            familyScore: scores.familyScore,
            urgencyScore: scores.urgencyScore,
            scoreBreakdown: scores.scoreBreakdown,
            scoresUpdatedAt: new Date(),
            vibeTags: flags.vibeTags,
            terrain: flags.terrain ?? race.terrain,
            isTurkeyTrot: flags.isTurkeyTrot,
            isHalloween: flags.isHalloween,
            isJingleBell: flags.isJingleBell,
            charity: race.charity ?? flags.charity,
            walkerFriendly: race.walkerFriendly ?? flags.walkerFriendly,
            strollerFriendly: race.strollerFriendly ?? flags.strollerFriendly,
            dogFriendly: race.dogFriendly ?? flags.dogFriendly,
            kidsRace: race.kidsRace ?? flags.kidsRace,
          })
          .where(eq(races.id, race.id));
        updated++;
      } catch (err) {
        console.warn(`[scoring-backfill] failed race ${race.id}: ${(err as Error).message}`);
      }
    }
  }

  return { processed, updated };
}

export async function recomputeUrgencyScores(): Promise<{ processed: number }> {
  let processed = 0;
  let lastId = 0;
  const batchSize = 500;

  while (true) {
    const batch = await db.select().from(races)
      .where(and(
        sql`${races.id} > ${lastId}`,
        eq(races.isActive, true),
        sql`${races.date} >= CURRENT_DATE::text`,
        sql`${races.date} <= (CURRENT_DATE + INTERVAL '120 days')::text`
      ))
      .orderBy(races.id)
      .limit(batchSize);

    if (batch.length === 0) break;

    for (const race of batch) {
      processed++;
      lastId = race.id;
      const scores = computeRaceScores(race);
      await db.update(races)
        .set({
          urgencyScore: scores.urgencyScore,
          scoreBreakdown: scores.scoreBreakdown,
          scoresUpdatedAt: new Date(),
        })
        .where(eq(races.id, race.id));
    }
  }
  return { processed };
}
