/**
 * Shared metro slug helpers used by both client and server for programmatic
 * city+state SEO routes (e.g. "/turkey-trots/seattle-wa").
 *
 * Format: `<city-slug>-<state-abbr>` where state abbr is the 2-letter USPS
 * code (lowercase). Example: `seattle-wa`, `san-francisco-ca`.
 */

export type ParsedMetroSlug = {
  citySlug: string;
  stateAbbr: string;
};

const STATE_ABBR_RE = /^[a-z]{2}$/;

export function parseMetroSlug(slug: string | undefined | null): ParsedMetroSlug | null {
  if (!slug || typeof slug !== "string") return null;
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed.includes("-")) return null;
  const idx = trimmed.lastIndexOf("-");
  const citySlug = trimmed.slice(0, idx);
  const stateAbbr = trimmed.slice(idx + 1);
  if (!citySlug || !STATE_ABBR_RE.test(stateAbbr)) return null;
  return { citySlug, stateAbbr };
}

export function buildMetroSlug(citySlug: string, stateAbbr: string): string {
  return `${citySlug.toLowerCase()}-${stateAbbr.toLowerCase()}`;
}

/**
 * Distance slugs used in city+distance routes: `/[metro]/5k-races`, etc.
 */
export const DISTANCE_SLUG_TO_LABEL: Record<string, { distance: string; surface?: string; label: string; plural: string }> = {
  "5k-races": { distance: "5K", label: "5K", plural: "5Ks" },
  "10k-races": { distance: "10K", label: "10K", plural: "10Ks" },
  "half-marathons": { distance: "Half Marathon", label: "Half Marathon", plural: "Half Marathons" },
  "marathons": { distance: "Marathon", label: "Marathon", plural: "Marathons" },
  "trail-races": { distance: "", surface: "Trail", label: "Trail Race", plural: "Trail Races" },
};

export const DISTANCE_SLUGS = Object.keys(DISTANCE_SLUG_TO_LABEL);

export function isValidDistanceSlug(slug: string): boolean {
  return slug in DISTANCE_SLUG_TO_LABEL;
}

export const MONTH_SLUG_TO_NUM: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

export const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTH_SLUGS = Object.keys(MONTH_SLUG_TO_NUM);

export function isValidMonthSlug(slug: string): boolean {
  return slug.toLowerCase() in MONTH_SLUG_TO_NUM;
}
