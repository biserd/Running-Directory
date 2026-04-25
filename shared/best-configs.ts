/**
 * Curated "best of" listing configurations shared by client pages and server SSR.
 * Each entry maps a slug (under /best/:slug) to display copy plus a deterministic
 * RaceSearchParams query that drives both the page render and the SSR prefetch.
 */

export type BestSearchParams = {
  state?: string;
  city?: string;
  distance?: string;
  surface?: string;
  terrain?: string;
  month?: number;
  isTurkeyTrot?: boolean;
  walkerFriendly?: boolean;
  strollerFriendly?: boolean;
  charity?: boolean;
  kidsRace?: boolean;
  bostonQualifier?: boolean;
  organizerId?: number;
  seriesId?: number;
  priceMax?: number;
  minBeginnerScore?: number;
  minPrScore?: number;
  minValueScore?: number;
  minVibeScore?: number;
  minFamilyScore?: number;
  sort?: "date" | "price" | "beginner" | "pr" | "value" | "vibe" | "family" | "urgency" | "quality";
  limit?: number;
  offset?: number;
};

export type BestConfig = {
  title: string;
  intro: string;
  eyebrow: string;
  search: BestSearchParams;
  emptyBody: string;
  related: Array<{ label: string; href: string }>;
};

export const BEST_CONFIGS: Record<string, BestConfig> = {
  "beginner-half-marathons": {
    title: "Best Beginner Half Marathons",
    intro: "Flat, well-supported half marathons with generous time limits and walker-friendly courses — built for first-timers.",
    eyebrow: "Best for first-timers",
    search: { distance: "Half Marathon", minBeginnerScore: 70, sort: "beginner", limit: 30 },
    emptyBody: "We don't have enough beginner-friendly halves rated yet. Browse all half marathons and filter by beginner score.",
    related: [
      { label: "All half marathons", href: "/races?distance=Half+Marathon" },
      { label: "Family-friendly 5Ks", href: "/best/family-friendly-5ks" },
      { label: "Cheap races", href: "/best/cheap-races" },
    ],
  },
  "flat-fast-marathons": {
    title: "Best Flat & Fast Marathons (PR-friendly)",
    intro: "Marathons with the highest PR potential — flat profiles, strong fields, and good weather windows.",
    eyebrow: "Best for a PR",
    search: { distance: "Marathon", minPrScore: 70, sort: "pr", limit: 30 },
    emptyBody: "No marathons have a high enough PR score yet. Browse all marathons and sort by PR potential.",
    related: [
      { label: "All marathons", href: "/races?distance=Marathon" },
      { label: "Boston-qualifier marathons", href: "/races?distance=Marathon&bostonQualifier=true" },
    ],
  },
  "cheap-races": {
    title: "Cheap & Best-Value Races",
    intro: "Great experience for the money — races with strong overall scores and low entry fees.",
    eyebrow: "Best value",
    search: { sort: "value", priceMax: 40, limit: 30 },
    emptyBody: "We don't have enough budget-friendly races yet. Browse all races and sort by value.",
    related: [
      { label: "Best 5Ks", href: "/races?distance=5K&sort=value" },
      { label: "Family-friendly 5Ks", href: "/best/family-friendly-5ks" },
    ],
  },
  "charity-races": {
    title: "Charity Races",
    intro: "Races that raise money for a cause — sorted by date so you can find one that fits your calendar.",
    eyebrow: "For a cause",
    search: { charity: true, sort: "date", limit: 60 },
    emptyBody: "No charity races are listed right now. Check back soon.",
    related: [
      { label: "Family-friendly 5Ks", href: "/best/family-friendly-5ks" },
      { label: "Turkey Trots", href: "/turkey-trots" },
    ],
  },
  "family-friendly-5ks": {
    title: "Family-Friendly 5Ks",
    intro: "5Ks designed for families — strollers welcome, kids races available, walkers always welcome.",
    eyebrow: "For the whole family",
    search: { distance: "5K", minFamilyScore: 60, sort: "family", limit: 30 },
    emptyBody: "We don't have enough family-friendly 5Ks rated yet. Browse all 5Ks.",
    related: [
      { label: "Dog-friendly 5Ks", href: "/best/dog-friendly-5ks" },
      { label: "Turkey Trots", href: "/turkey-trots" },
    ],
  },
  "scenic-10ks": {
    title: "Scenic 10Ks",
    intro: "10Ks with the highest vibe scores — beautiful courses you'll actually remember.",
    eyebrow: "Big vibes",
    search: { distance: "10K", minVibeScore: 60, sort: "vibe", limit: 30 },
    emptyBody: "We don't have enough scenic 10Ks rated yet.",
    related: [
      { label: "All 10Ks", href: "/races?distance=10K" },
      { label: "Beer runs", href: "/best/beer-runs" },
    ],
  },
  "dog-friendly-5ks": {
    title: "Dog-Friendly 5Ks",
    intro: "5Ks where you can bring your four-legged training partner.",
    eyebrow: "Bring the dog",
    search: { distance: "5K", sort: "date", limit: 60 },
    emptyBody: "We don't have dog-friendly 5Ks tagged yet — let us know if you've raced one.",
    related: [
      { label: "All 5Ks", href: "/races?distance=5K" },
      { label: "Family-friendly 5Ks", href: "/best/family-friendly-5ks" },
    ],
  },
  "beer-runs": {
    title: "Beer Runs & After-Party Races",
    intro: "Races with great post-finish vibes — beer gardens, live music, festival energy.",
    eyebrow: "Big vibes",
    search: { minVibeScore: 70, sort: "vibe", limit: 30 },
    emptyBody: "We don't have enough beer-run-style races rated yet.",
    related: [
      { label: "Scenic 10Ks", href: "/best/scenic-10ks" },
      { label: "Charity races", href: "/best/charity-races" },
    ],
  },
  "this-weekend": {
    title: "Races This Weekend",
    intro: "Last-minute races happening across the USA in the next 72 hours.",
    eyebrow: "Last-minute",
    search: { sort: "date", limit: 60 },
    emptyBody: "No races this weekend in our database. Browse upcoming races.",
    related: [
      { label: "Price Watch", href: "/price-watch" },
      { label: "Cheap races", href: "/best/cheap-races" },
    ],
  },
};

export const BEST_SLUGS = Object.keys(BEST_CONFIGS);

export function buildBestSearchQs(params: BestSearchParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "" || v === false) continue;
    qs.set(k, String(v));
  }
  return qs.toString();
}
