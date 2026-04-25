import { db } from "./db";
import { races } from "@shared/schema";
import { eq, sql, and, isNull, or } from "drizzle-orm";
import { computeRaceScores, deriveRaceFlags } from "./scoring";

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
