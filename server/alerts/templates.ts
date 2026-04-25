import type { Race } from "@shared/schema";
import { format } from "date-fns";

const BRAND_COLOR = "#dc2626";
const TEXT_COLOR = "#111";
const MUTED = "#666";
const BORDER = "#e5e7eb";

export interface EmailEnvelope {
  subject: string;
  html: string;
  text: string;
}

interface BuildOptions {
  baseUrl: string;
  unsubToken: string;
  trackToken: string;
  trackingPath?: string;
}

function fmtDate(d?: string | null): string {
  if (!d) return "TBD";
  try {
    return format(new Date(d), "EEE, MMM d, yyyy");
  } catch {
    return d;
  }
}

function fmtPrice(min?: number | null, max?: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `$${min}–$${max}`;
  return `$${min ?? max}`;
}

function shell(opts: BuildOptions, body: string, preview: string): string {
  const { baseUrl, unsubToken, trackToken, trackingPath = "/api/alerts/track/open" } = opts;
  const pixel = `${baseUrl}${trackingPath}?t=${trackToken}`;
  const unsubUrl = `${baseUrl}/api/alerts/unsubscribe?t=${unsubToken}`;
  const prefsUrl = `${baseUrl}/alerts`;
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(preview)}</title></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;color:${TEXT_COLOR};">
<div style="display:none;max-height:0;overflow:hidden;color:#f7f7f7;">${escape(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
      <tr><td style="padding:24px 28px;border-bottom:1px solid ${BORDER};">
        <a href="${baseUrl}" style="text-decoration:none;color:${TEXT_COLOR};font-family:'Outfit',sans-serif;font-size:20px;font-weight:700;">running<span style="color:${BRAND_COLOR};">.services</span></a>
      </td></tr>
      <tr><td style="padding:28px;">${body}</td></tr>
      <tr><td style="padding:20px 28px;background:#fafafa;border-top:1px solid ${BORDER};font-size:12px;color:${MUTED};line-height:1.5;">
        You're getting this because you set up an alert on running.services.
        <br/>
        <a href="${unsubUrl}" style="color:${MUTED};">Unsubscribe from this alert type</a> &nbsp;·&nbsp;
        <a href="${prefsUrl}" style="color:${MUTED};">Manage all alerts</a>
      </td></tr>
    </table>
  </td></tr>
</table>
<img src="${pixel}" width="1" height="1" alt="" style="display:block;border:0;" />
</body></html>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function trackedHref(opts: BuildOptions, url: string): string {
  return `${opts.baseUrl}/api/alerts/track/click?t=${opts.trackToken}&u=${encodeURIComponent(url)}`;
}

function raceLine(opts: BuildOptions, race: Race): string {
  const url = trackedHref(opts, `${opts.baseUrl}/races/${race.slug}`);
  const price = fmtPrice(race.priceMin, race.priceMax);
  return `<tr><td style="padding:14px 0;border-bottom:1px solid ${BORDER};">
    <a href="${url}" style="text-decoration:none;color:${TEXT_COLOR};font-weight:600;font-size:15px;">${escape(race.name)}</a>
    <div style="color:${MUTED};font-size:13px;margin-top:4px;">
      ${escape(race.distance)} · ${escape(race.city)}, ${escape(race.state)} · ${fmtDate(race.date)}${price ? ` · ${price}` : ""}
    </div>
  </td></tr>`;
}

function raceListTable(opts: BuildOptions, races: Race[]): string {
  if (races.length === 0) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">${races.map(r => raceLine(opts, r)).join("")}</table>`;
}

function ctaButton(href: string, label: string): string {
  return `<div style="margin-top:24px;"><a href="${href}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">${escape(label)}</a></div>`;
}

export function buildPriceIncreaseEmail(opts: BuildOptions, race: Race): EmailEnvelope {
  const goesUp = fmtDate(race.nextPriceIncreaseAt);
  const subject = `Heads up: ${race.name} price goes up ${goesUp}`;
  const url = trackedHref(opts, `${opts.baseUrl}/races/${race.slug}`);
  const body = `
    <h1 style="font-family:'Outfit',sans-serif;font-size:22px;margin:0 0 12px;">Price goes up soon</h1>
    <p style="font-size:15px;line-height:1.5;color:${TEXT_COLOR};margin:0;">
      <strong>${escape(race.name)}</strong> is set to raise its entry fee on <strong>${goesUp}</strong>${race.nextPriceIncreaseAmount ? ` (about +$${race.nextPriceIncreaseAmount})` : ""}. If you were thinking about it, now's the time to lock in.
    </p>
    ${ctaButton(url, "Register before the price hike")}
    <p style="margin-top:20px;font-size:13px;color:${MUTED};">${escape(race.city)}, ${escape(race.state)} · ${fmtDate(race.date)}</p>
  `;
  const text = `${race.name} — price goes up ${goesUp}. Register now: ${opts.baseUrl}/races/${race.slug}`;
  return { subject, html: shell(opts, body, `${race.name} price goes up ${goesUp}`), text };
}

export function buildRegistrationCloseEmail(opts: BuildOptions, race: Race): EmailEnvelope {
  const closes = fmtDate(race.registrationDeadline);
  const subject = `Registration closing soon: ${race.name}`;
  const url = trackedHref(opts, `${opts.baseUrl}/races/${race.slug}`);
  const body = `
    <h1 style="font-family:'Outfit',sans-serif;font-size:22px;margin:0 0 12px;">Last chance to sign up</h1>
    <p style="font-size:15px;line-height:1.5;margin:0;">
      Registration for <strong>${escape(race.name)}</strong> closes <strong>${closes}</strong>. Don't miss out.
    </p>
    ${ctaButton(url, "Register now")}
    <p style="margin-top:20px;font-size:13px;color:${MUTED};">${escape(race.city)}, ${escape(race.state)} · ${fmtDate(race.date)}</p>
  `;
  const text = `${race.name} — registration closes ${closes}. Register: ${opts.baseUrl}/races/${race.slug}`;
  return { subject, html: shell(opts, body, `Registration for ${race.name} closes ${closes}`), text };
}

export function buildSavedRaceReminderEmail(opts: BuildOptions, race: Race): EmailEnvelope {
  const subject = `${race.name} is in 1 week`;
  const url = trackedHref(opts, `${opts.baseUrl}/races/${race.slug}`);
  const body = `
    <h1 style="font-family:'Outfit',sans-serif;font-size:22px;margin:0 0 12px;">Race week!</h1>
    <p style="font-size:15px;line-height:1.5;margin:0;">
      <strong>${escape(race.name)}</strong> is coming up on <strong>${fmtDate(race.date)}</strong>. Time to check the weather, packet pickup details, and your race-day plan.
    </p>
    ${ctaButton(url, "Open race page")}
    <p style="margin-top:20px;font-size:13px;color:${MUTED};">${escape(race.city)}, ${escape(race.state)}</p>
  `;
  const text = `${race.name} is in 1 week. ${opts.baseUrl}/races/${race.slug}`;
  return { subject, html: shell(opts, body, `${race.name} is in 1 week`), text };
}

export function buildThisWeekendDigestEmail(opts: BuildOptions, races: Race[], savedSearchName?: string): EmailEnvelope {
  const subject = savedSearchName
    ? `This weekend in "${savedSearchName}": ${races.length} race${races.length === 1 ? "" : "s"}`
    : `${races.length} race${races.length === 1 ? "" : "s"} this weekend`;
  const browseUrl = trackedHref(opts, `${opts.baseUrl}/this-weekend`);
  const body = `
    <h1 style="font-family:'Outfit',sans-serif;font-size:22px;margin:0 0 8px;">This weekend's races${savedSearchName ? ` matching "${escape(savedSearchName)}"` : ""}</h1>
    <p style="font-size:14px;color:${MUTED};margin:0;">${races.length} race${races.length === 1 ? "" : "s"} you might still register for in the next 72 hours.</p>
    ${raceListTable(opts, races.slice(0, 12))}
    ${ctaButton(browseUrl, "See all weekend races")}
  `;
  const text = `This weekend (${races.length} races):\n` + races.slice(0, 12).map(r => `• ${r.name} — ${r.city}, ${r.state} (${r.date})`).join("\n");
  return { subject, html: shell(opts, body, subject), text };
}

export function buildSavedSearchMatchesEmail(opts: BuildOptions, savedSearchName: string, races: Race[], destinationUrl: string): EmailEnvelope {
  const subject = `${races.length} new race${races.length === 1 ? "" : "s"} match "${savedSearchName}"`;
  const url = trackedHref(opts, destinationUrl);
  const body = `
    <h1 style="font-family:'Outfit',sans-serif;font-size:22px;margin:0 0 8px;">New races for "${escape(savedSearchName)}"</h1>
    <p style="font-size:14px;color:${MUTED};margin:0;">We added ${races.length} race${races.length === 1 ? "" : "s"} that match your saved search.</p>
    ${raceListTable(opts, races.slice(0, 10))}
    ${ctaButton(url, "Open saved search")}
  `;
  const text = `${races.length} new races match "${savedSearchName}":\n` + races.slice(0, 10).map(r => `• ${r.name} — ${r.city}, ${r.state}`).join("\n");
  return { subject, html: shell(opts, body, subject), text };
}

export function buildTurkeyTrotWatchEmail(opts: BuildOptions, races: Race[], metroLabel: string | null): EmailEnvelope {
  const subject = metroLabel
    ? `Turkey Trots near ${metroLabel} — ${races.length} option${races.length === 1 ? "" : "s"}`
    : `Turkey Trot watchlist update — ${races.length} race${races.length === 1 ? "" : "s"}`;
  const url = trackedHref(opts, `${opts.baseUrl}/turkey-trots`);
  const body = `
    <h1 style="font-family:'Outfit',sans-serif;font-size:22px;margin:0 0 8px;">🦃 Turkey Trot watchlist</h1>
    <p style="font-size:14px;color:${MUTED};margin:0;">${races.length} Thanksgiving race${races.length === 1 ? "" : "s"} we're tracking${metroLabel ? ` near ${escape(metroLabel)}` : ""}.</p>
    ${raceListTable(opts, races.slice(0, 12))}
    ${ctaButton(url, "Browse all Turkey Trots")}
  `;
  const text = `Turkey Trot watchlist (${races.length}):\n` + races.slice(0, 12).map(r => `• ${r.name} — ${r.city}, ${r.state} (${r.date})`).join("\n");
  return { subject, html: shell(opts, body, subject), text };
}
