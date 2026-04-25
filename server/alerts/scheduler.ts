import crypto from "crypto";
import { Resend } from "resend";
import { storage } from "../storage";
import {
  buildPriceIncreaseEmail,
  buildRegistrationCloseEmail,
  buildSavedRaceReminderEmail,
  buildThisWeekendDigestEmail,
  buildSavedSearchMatchesEmail,
  buildTurkeyTrotWatchEmail,
  type EmailEnvelope,
} from "./templates";
import type { Race, RaceSearchFilters } from "@shared/schema";

const FROM_EMAIL = "running.services <hello@running.services>";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Per-process lock so the hourly cron doesn't double-fire when multiple ticks overlap.
let running = false;

function todayKey(prefix: string): string {
  const d = new Date();
  return `${prefix}:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function token(): string {
  return crypto.randomBytes(18).toString("base64url");
}

function getBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL || process.env.BASE_URL || "https://running.services";
}

function shouldDeliver(unsubAll: boolean, unsubTypes: string[], type: string): boolean {
  if (unsubAll) return false;
  if (unsubTypes?.includes(type)) return false;
  return true;
}

function dateOnly(d: string | null | undefined): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

// ───────── Dispatcher ─────────

async function sendAlertEmail(params: {
  userId: number;
  userEmail: string;
  alertType: string;
  dispatchKey: string;
  raceId?: number | null;
  savedSearchId?: number | null;
  raceAlertId?: number | null;
  matchCount?: number | null;
  build: (opts: { baseUrl: string; unsubToken: string; trackToken: string }) => EmailEnvelope;
  unsubAll: boolean;
  unsubTypes: string[];
}): Promise<boolean> {
  if (!shouldDeliver(params.unsubAll, params.unsubTypes, params.alertType)) return false;

  // Idempotency: if a successful dispatch row already exists for this key (today), skip.
  const existing = await storage.findDispatchByKey(params.dispatchKey);
  if (existing) return false;

  const unsubToken = token();
  const trackToken = token();
  const baseUrl = getBaseUrl();
  const envelope = params.build({ baseUrl, unsubToken, trackToken });

  // Send first; only persist the dispatch row on success so failures don't suppress retries.
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: params.userEmail,
        subject: envelope.subject,
        html: envelope.html,
        text: envelope.text,
        headers: {
          "List-Unsubscribe": `<${baseUrl}/api/alerts/unsubscribe?t=${unsubToken}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      if (result.error) {
        console.error("[alerts] Resend error", result.error, "for", envelope.subject);
        return false;
      }
    } catch (err) {
      console.error("[alerts] send failure", err);
      return false;
    }
  } else {
    console.log(`[alerts] (no Resend key) would send "${envelope.subject}" to ${params.userEmail}`);
  }

  // Persist after a successful (or simulated) send so future ticks honor idempotency.
  const dispatch = await storage.recordAlertDispatch({
    userId: params.userId,
    alertType: params.alertType,
    raceId: params.raceId ?? null,
    savedSearchId: params.savedSearchId ?? null,
    raceAlertId: params.raceAlertId ?? null,
    dispatchKey: params.dispatchKey,
    unsubToken,
    trackToken,
    emailSubject: envelope.subject,
    emailTo: params.userEmail,
    matchCount: params.matchCount ?? null,
  });
  return !!dispatch;
}

async function dispatchPriceIncrease(): Promise<number> {
  const rows = await storage.getActiveRaceAlertsWithRace();
  const now = new Date();
  let sent = 0;
  for (const row of rows) {
    if (row.alert.alertType !== "price-drop" && row.alert.alertType !== "price-increase") continue;
    const hike = dateOnly(row.race.nextPriceIncreaseAt);
    if (!hike) continue;
    const days = daysBetween(hike, now);
    if (days < 0 || days > 3) continue;
    const dispatchKey = `${todayKey("price-inc")}:u${row.alert.userId}:r${row.race.id}`;
    const ok = await sendAlertEmail({
      userId: row.alert.userId,
      userEmail: row.userEmail,
      alertType: "price-increase",
      dispatchKey,
      raceId: row.race.id,
      raceAlertId: row.alert.id,
      unsubAll: row.unsubscribedAll,
      unsubTypes: row.unsubscribedAlertTypes,
      build: (opts) => buildPriceIncreaseEmail(opts, row.race),
    });
    if (ok) {
      await storage.updateRaceAlertNotified(row.alert.id);
      sent += 1;
    }
  }
  return sent;
}

async function dispatchRegistrationClose(): Promise<number> {
  const rows = await storage.getActiveRaceAlertsWithRace();
  const now = new Date();
  let sent = 0;
  for (const row of rows) {
    if (row.alert.alertType !== "reg-close" && row.alert.alertType !== "registration-close" && row.alert.alertType !== "price-drop") continue;
    const closes = dateOnly(row.race.registrationDeadline);
    if (!closes) continue;
    const days = daysBetween(closes, now);
    if (days < 0 || days > 1) continue;
    const dispatchKey = `${todayKey("reg-close")}:u${row.alert.userId}:r${row.race.id}`;
    const ok = await sendAlertEmail({
      userId: row.alert.userId,
      userEmail: row.userEmail,
      alertType: "registration-close",
      dispatchKey,
      raceId: row.race.id,
      raceAlertId: row.alert.id,
      unsubAll: row.unsubscribedAll,
      unsubTypes: row.unsubscribedAlertTypes,
      build: (opts) => buildRegistrationCloseEmail(opts, row.race),
    });
    if (ok) {
      await storage.updateRaceAlertNotified(row.alert.id);
      sent += 1;
    }
  }
  return sent;
}

async function dispatchSavedRaceReminder(): Promise<number> {
  const rows = await storage.getFavoritedRacesForReminders(7);
  const now = new Date();
  let sent = 0;
  for (const row of rows) {
    const raceDate = dateOnly(row.race.date);
    if (!raceDate) continue;
    const days = daysBetween(raceDate, now);
    if (days < 6 || days > 8) continue;
    const dispatchKey = `${todayKey("saved-race-reminder")}:u${row.userId}:r${row.race.id}`;
    const ok = await sendAlertEmail({
      userId: row.userId,
      userEmail: row.userEmail,
      alertType: "saved-race-reminder",
      dispatchKey,
      raceId: row.race.id,
      unsubAll: row.unsubscribedAll,
      unsubTypes: row.unsubscribedAlertTypes,
      build: (opts) => buildSavedRaceReminderEmail(opts, row.race),
    });
    if (ok) sent += 1;
  }
  return sent;
}

function isWithinNext72h(d: string | null | undefined): boolean {
  const date = dateOnly(d);
  if (!date) return false;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return diff >= 0 && diff <= 72 * 60 * 60 * 1000;
}

function savedSearchToFilters(query: unknown): RaceSearchFilters {
  if (!query || typeof query !== "object") return {};
  const q = query as Record<string, unknown>;
  const filters: RaceSearchFilters = {};
  if (typeof q.distance === "string") filters.distance = q.distance;
  if (typeof q.surface === "string") filters.surface = q.surface;
  if (typeof q.terrain === "string") filters.terrain = q.terrain;
  if (typeof q.state === "string") filters.state = q.state;
  if (typeof q.priceMax === "string" && q.priceMax) filters.priceMax = Number(q.priceMax);
  if (q.walkerFriendly === true) filters.walkerFriendly = true;
  if (q.strollerFriendly === true) filters.strollerFriendly = true;
  if (q.dogFriendly === true) filters.dogFriendly = true;
  if (q.kidsRace === true) filters.kidsRace = true;
  if (q.charity === true) filters.charity = true;
  if (q.bostonQualifier === true) filters.bostonQualifier = true;
  if (q.turkeyTrot === true) filters.isTurkeyTrot = true;
  if (typeof q.vibeTag === "string" && q.vibeTag) filters.vibeTag = q.vibeTag;
  if (typeof q.month === "string" && q.month) filters.month = Number(q.month);
  filters.limit = 50;
  return filters;
}

function buildSavedSearchUrl(query: unknown): string {
  if (!query || typeof query !== "object") return "/races";
  const q = query as Record<string, unknown>;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v == null || v === "" || v === false) continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `/races?${qs}` : "/races";
}

async function dispatchThisWeekendDigest(): Promise<number> {
  const searches = await storage.getActiveSavedSearches();
  let sent = 0;

  // Saved-search-driven this-weekend digests (delivered Friday UTC only to avoid daily spam).
  const isFriday = new Date().getUTCDay() === 5;
  if (!isFriday) return 0;

  for (const search of searches) {
    const filters = savedSearchToFilters(search.queryJson);
    const races = await storage.getRacesAdvanced({ ...filters, limit: 30 });
    const weekend = races.filter(r => isWithinNext72h(r.date));
    if (weekend.length === 0) continue;
    const dispatchKey = `${todayKey("this-weekend")}:u${search.userId}:s${search.id}`;
    const ok = await sendAlertEmail({
      userId: search.userId,
      userEmail: search.userEmail,
      alertType: "this-weekend",
      dispatchKey,
      savedSearchId: search.id,
      matchCount: weekend.length,
      unsubAll: search.unsubscribedAll,
      unsubTypes: search.unsubscribedAlertTypes,
      build: (opts) => buildThisWeekendDigestEmail(opts, weekend, search.name),
    });
    if (ok) {
      await storage.updateSavedSearchNotified(search.id);
      sent += 1;
    }
  }

  return sent;
}

async function dispatchSavedSearchMatches(): Promise<number> {
  const baseUrl = getBaseUrl();
  const searches = await storage.getActiveSavedSearches();
  let sent = 0;

  // Weekly Monday roundup of new races matching saved searches.
  const isMonday = new Date().getUTCDay() === 1;
  if (!isMonday) return 0;

  for (const search of searches) {
    const filters = savedSearchToFilters(search.queryJson);
    const races = await storage.getRacesAdvanced({ ...filters, limit: 20 });
    if (races.length === 0) continue;
    const dispatchKey = `${todayKey("ss-match")}:u${search.userId}:s${search.id}`;
    const destination = `${baseUrl}${buildSavedSearchUrl(search.queryJson)}`;
    const ok = await sendAlertEmail({
      userId: search.userId,
      userEmail: search.userEmail,
      alertType: "saved-search-matches",
      dispatchKey,
      savedSearchId: search.id,
      matchCount: races.length,
      unsubAll: search.unsubscribedAll,
      unsubTypes: search.unsubscribedAlertTypes,
      build: (opts) => buildSavedSearchMatchesEmail(opts, search.name, races, destination),
    });
    if (ok) {
      await storage.updateSavedSearchNotified(search.id);
      sent += 1;
    }
  }
  return sent;
}

async function dispatchTurkeyTrotWatch(): Promise<number> {
  const now = new Date();
  // In season Oct 15 → Nov 5 UTC, run weekly on Wednesday.
  // JS months: 9 = October, 10 = November.
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const inSeason = (month === 9 && day >= 15) || (month === 10 && day <= 5);
  if (!inSeason) return 0;
  if (now.getUTCDay() !== 3) return 0;

  const races = await storage.getRacesAdvanced({ isTurkeyTrot: true, limit: 30 });
  if (races.length === 0) return 0;

  const searches = await storage.getActiveSavedSearches();
  let sent = 0;
  for (const search of searches) {
    const q = (search.queryJson || {}) as Record<string, unknown>;
    if (q.turkeyTrot !== true) continue;
    const dispatchKey = `${todayKey("turkey-trot")}:u${search.userId}:s${search.id}`;
    const stateLabel = typeof q.state === "string" ? q.state : null;
    const ok = await sendAlertEmail({
      userId: search.userId,
      userEmail: search.userEmail,
      alertType: "turkey-trot-watch",
      dispatchKey,
      savedSearchId: search.id,
      matchCount: races.length,
      unsubAll: search.unsubscribedAll,
      unsubTypes: search.unsubscribedAlertTypes,
      build: (opts) => buildTurkeyTrotWatchEmail(opts, races, stateLabel),
    });
    if (ok) sent += 1;
  }
  return sent;
}

export async function runAlertDispatch(opts: { force?: boolean } = {}): Promise<{ priceIncrease: number; registrationClose: number; savedRaceReminder: number; thisWeekend: number; savedSearchMatches: number; turkeyTrotWatch: number }> {
  if (running && !opts.force) {
    console.log("[alerts] dispatch already running — skipping");
    return { priceIncrease: 0, registrationClose: 0, savedRaceReminder: 0, thisWeekend: 0, savedSearchMatches: 0, turkeyTrotWatch: 0 };
  }
  running = true;
  try {
    const result = {
      priceIncrease: await dispatchPriceIncrease(),
      registrationClose: await dispatchRegistrationClose(),
      savedRaceReminder: await dispatchSavedRaceReminder(),
      thisWeekend: await dispatchThisWeekendDigest(),
      savedSearchMatches: await dispatchSavedSearchMatches(),
      turkeyTrotWatch: await dispatchTurkeyTrotWatch(),
    };
    console.log("[alerts] dispatch complete", result);
    return result;
  } catch (err) {
    console.error("[alerts] dispatch failed", err);
    throw err;
  } finally {
    running = false;
  }
}

let timer: NodeJS.Timeout | null = null;

export function startAlertScheduler(): void {
  if (timer || process.env.DISABLE_ALERT_SCHEDULER === "1") return;
  const HOUR = 60 * 60 * 1000;
  // First run after 5 minutes to let the app settle, then hourly.
  setTimeout(() => {
    void runAlertDispatch().catch(err => console.error("[alerts] tick failed", err));
    timer = setInterval(() => {
      void runAlertDispatch().catch(err => console.error("[alerts] tick failed", err));
    }, HOUR);
  }, 5 * 60 * 1000);
  console.log("[alerts] scheduler started (hourly)");
}

export function stopAlertScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
