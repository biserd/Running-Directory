import { DISTANCE_SLUG_TO_LABEL, MONTH_NAMES, MONTH_SLUG_TO_NUM } from "./metro";

export const BLOG_DISTANCE_SLUGS = ["marathons", "half-marathons", "10k-races", "5k-races", "trail-races"] as const;
export type BlogDistanceSlug = typeof BLOG_DISTANCE_SLUGS[number];

const MONTH_NUM_TO_SLUG: Record<number, string> = Object.entries(MONTH_SLUG_TO_NUM).reduce(
  (acc, [slug, num]) => ({ ...acc, [num]: slug }),
  {} as Record<number, string>,
);

export function monthNumToSlug(n: number): string {
  return MONTH_NUM_TO_SLUG[n];
}

export function blogPostSlug(distanceSlug: string, monthNum: number, year: number): string {
  return `best-${distanceSlug}-in-${monthNumToSlug(monthNum)}-${year}`;
}

export function blogPostHref(distanceSlug: string, monthNum: number, year: number): string {
  return `/blog/${blogPostSlug(distanceSlug, monthNum, year)}`;
}

export interface ParsedBlogSlug {
  distanceSlug: string;
  monthSlug: string;
  monthNum: number;
  year: number;
  monthLabel: string;
  distanceCfg: { distance: string; surface?: string; label: string; plural: string };
}

export function parseBlogPostSlug(slug: string): ParsedBlogSlug | null {
  const m = /^best-(.+)-in-([a-z]+)-(\d{4})$/.exec(slug);
  if (!m) return null;
  const [, distanceSlug, monthSlug, yearStr] = m;
  if (!(distanceSlug in DISTANCE_SLUG_TO_LABEL)) return null;
  if (!(monthSlug in MONTH_SLUG_TO_NUM)) return null;
  const year = parseInt(yearStr, 10);
  if (year < 2020 || year > 2099) return null;
  const monthNum = MONTH_SLUG_TO_NUM[monthSlug];
  return {
    distanceSlug,
    monthSlug,
    monthNum,
    year,
    monthLabel: MONTH_NAMES[monthNum],
    distanceCfg: DISTANCE_SLUG_TO_LABEL[distanceSlug],
  };
}

/**
 * Returns the rolling list of (month, year) starting from `from` for `count`
 * months forward — the set of months a blog index should advertise.
 */
export function rollingMonths(from: Date, count: number): Array<{ monthNum: number; year: number }> {
  const out: Array<{ monthNum: number; year: number }> = [];
  let y = from.getUTCFullYear();
  let m = from.getUTCMonth() + 1;
  for (let i = 0; i < count; i++) {
    out.push({ monthNum: m, year: y });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
