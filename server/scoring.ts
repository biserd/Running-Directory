import type { Race, ScoreBreakdown, ScoreFactor } from "@shared/schema";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

const VIBE_KEYWORDS = [
  { tag: "beer", patterns: [/\bbeer\b/i, /\bbrewery?\b/i, /\bipa\b/i, /\bpub\b/i] },
  { tag: "wine", patterns: [/\bwine\b/i, /\bvineyard\b/i] },
  { tag: "costume", patterns: [/\bcostume\b/i, /\bhalloween\b/i, /\bzombie\b/i] },
  { tag: "music", patterns: [/\brock\s*['n]?\s*roll\b/i, /\bmusic\b/i, /\bband\b/i, /\bconcert\b/i] },
  { tag: "scenic", patterns: [/\bbeach\b/i, /\bmountain\b/i, /\bsunset\b/i, /\bsunrise\b/i, /\boceanside?\b/i, /\briver\b/i, /\blake\b/i, /\bvineyard\b/i] },
  { tag: "festive", patterns: [/\bturkey\s*trot\b/i, /\bjingle\b/i, /\bsanta\b/i, /\bholiday\b/i, /\bnew\s*year\b/i, /\bfourth\s*of\s*july\b/i, /\bjuly\s*4\b/i, /\bmemorial\s*day\b/i] },
  { tag: "color", patterns: [/\bcolor\s*run\b/i, /\bcolor\s*blast\b/i, /\bglow\s*run\b/i, /\bneon\b/i] },
  { tag: "obstacle", patterns: [/\bobstacle\b/i, /\bspartan\b/i, /\btough\s*mudder\b/i, /\bmud\s*run\b/i] },
  { tag: "charity", patterns: [/\bcharity\b/i, /\bfoundation\b/i, /\bbenefit\b/i, /\bawareness\b/i, /\bcure\b/i, /\bhope\b/i] },
];

const FAMILY_KEYWORDS = [
  { tag: "kids", patterns: [/\bkids?\b/i, /\bfun\s*run\b/i, /\bfamily\b/i, /\bdiaper\s*dash\b/i] },
  { tag: "stroller", patterns: [/\bstroller\b/i] },
  { tag: "walker", patterns: [/\bwalk(ers?)?\b/i, /\bwalk\/run\b/i, /\bwalk-?run\b/i] },
  { tag: "dog", patterns: [/\bdog\b/i, /\bpup(py|s)?\b/i, /\bpaws?\b/i, /\bk-?9\b/i] },
];

const CHARITY_KEYWORDS = /\b(charity|foundation|benefit|awareness|cure|hope|memorial|cancer|hospital|hospice|alz|als|st\.?\s*jude|wishes?|veterans?|families?\s*first)\b/i;

const TURKEY_TROT_RE = /\bturkey\s*trot\b/i;
const HALLOWEEN_RE = /\b(halloween|spooky|monster\s*dash|zombie|ghoul|witch)\b/i;
const JINGLE_BELL_RE = /\b(jingle\s*bell|santa\s*run|reindeer|christmas)\b/i;

export type DerivedRaceFlags = {
  vibeTags: string[];
  isTurkeyTrot: boolean;
  isHalloween: boolean;
  isJingleBell: boolean;
  charity: boolean;
  walkerFriendly: boolean;
  strollerFriendly: boolean;
  dogFriendly: boolean;
  kidsRace: boolean;
  terrain: string | null;
};

export function deriveRaceFlags(race: Pick<Race, "name" | "description" | "surface" | "date" | "vibeTags" | "walkerFriendly" | "strollerFriendly" | "dogFriendly" | "kidsRace" | "charity" | "terrain" | "isTurkeyTrot" | "isHalloween" | "isJingleBell">): DerivedRaceFlags {
  const text = `${race.name} ${race.description ?? ""}`;
  const tags = new Set<string>(race.vibeTags ?? []);

  for (const { tag, patterns } of VIBE_KEYWORDS) {
    if (patterns.some(p => p.test(text))) tags.add(tag);
  }

  let walkerFriendly = race.walkerFriendly === true;
  let strollerFriendly = race.strollerFriendly === true;
  let dogFriendly = race.dogFriendly === true;
  let kidsRace = race.kidsRace === true;

  for (const { tag, patterns } of FAMILY_KEYWORDS) {
    const matched = patterns.some(p => p.test(text));
    if (!matched) continue;
    if (tag === "walker") walkerFriendly = true;
    if (tag === "stroller") strollerFriendly = true;
    if (tag === "dog") dogFriendly = true;
    if (tag === "kids") kidsRace = true;
  }

  const isTurkeyTrot = race.isTurkeyTrot || TURKEY_TROT_RE.test(text);
  const isHalloween = race.isHalloween || HALLOWEEN_RE.test(text);
  const isJingleBell = race.isJingleBell || JINGLE_BELL_RE.test(text);

  if (isTurkeyTrot || isHalloween || isJingleBell) tags.add("festive");

  let dateMonth: number | null = null;
  if (race.date) {
    const m = race.date.match(/^(\d{4})-(\d{2})/);
    if (m) dateMonth = parseInt(m[2], 10);
  }
  if (dateMonth === 10 && /\bdash|\brun\b/.test(text)) {
    if (HALLOWEEN_RE.test(text)) tags.add("costume");
  }

  const charity = race.charity === true || CHARITY_KEYWORDS.test(text);
  if (charity) tags.add("charity");

  let terrain = race.terrain ?? null;
  if (!terrain && race.surface) {
    const s = race.surface.toLowerCase();
    if (s.includes("trail")) terrain = "trail";
    else if (s.includes("track")) terrain = "track";
    else if (s.includes("road")) terrain = "road";
    else if (s.includes("mixed")) terrain = "mixed";
  }

  return {
    vibeTags: Array.from(tags),
    isTurkeyTrot,
    isHalloween,
    isJingleBell,
    charity,
    walkerFriendly,
    strollerFriendly,
    dogFriendly,
    kidsRace,
    terrain,
  };
}

const DISTANCE_MEDIAN_PRICE: Record<string, number> = {
  "5K": 35,
  "10K": 50,
  "Half Marathon": 80,
  "Marathon": 130,
  "Ultra": 160,
  "Multiple": 60,
};

function distanceCategory(race: Pick<Race, "distance" | "distanceMeters">): string {
  if (race.distance) {
    const d = race.distance;
    if (/^5k$/i.test(d)) return "5K";
    if (/^10k$/i.test(d)) return "10K";
    if (/half/i.test(d)) return "Half Marathon";
    if (/^marathon$/i.test(d)) return "Marathon";
    if (/ultra/i.test(d)) return "Ultra";
    if (/multiple/i.test(d)) return "Multiple";
  }
  const m = race.distanceMeters ?? 0;
  if (m === 0) return "Other";
  if (m <= 5500) return "5K";
  if (m <= 10500) return "10K";
  if (m <= 22000) return "Half Marathon";
  if (m <= 43000) return "Marathon";
  return "Ultra";
}

export type ScoredRace = {
  beginnerScore: number;
  prScore: number;
  valueScore: number;
  vibeScore: number;
  familyScore: number;
  urgencyScore: number;
  scoreBreakdown: ScoreBreakdown;
};

export function computeRaceScores(race: Race, opts: { now?: Date } = {}): ScoredRace {
  const now = opts.now ?? new Date();
  const flags = deriveRaceFlags(race);
  const cat = distanceCategory(race);

  const beginner: ScoreFactor[] = [{ factor: "Baseline", points: 50 }];
  if (cat === "5K") beginner.push({ factor: "5K distance", points: 25 });
  else if (cat === "10K") beginner.push({ factor: "10K distance", points: 15 });
  else if (cat === "Half Marathon") beginner.push({ factor: "Half marathon distance", points: 0 });
  else if (cat === "Marathon") beginner.push({ factor: "Marathon distance", points: -15 });
  else if (cat === "Ultra") beginner.push({ factor: "Ultra distance", points: -30 });

  if (flags.terrain === "road") beginner.push({ factor: "Road surface", points: 5 });
  else if (flags.terrain === "trail") beginner.push({ factor: "Trail surface", points: -10 });

  if (flags.walkerFriendly) beginner.push({ factor: "Walker friendly", points: 10 });
  if (flags.strollerFriendly) beginner.push({ factor: "Stroller friendly", points: 5 });
  if (flags.kidsRace) beginner.push({ factor: "Kids race", points: 5 });

  if (race.elevationGainM != null) {
    if (race.elevationGainM <= 50) beginner.push({ factor: "Very flat", points: 10 });
    else if (race.elevationGainM <= 200) beginner.push({ factor: "Mostly flat", points: 5 });
    else if (race.elevationGainM > 500) beginner.push({ factor: "Significant climbing", points: -10 });
  } else if (race.elevation) {
    const e = race.elevation.toLowerCase();
    if (e.includes("flat")) beginner.push({ factor: "Flat course", points: 10 });
    else if (e.includes("downhill")) beginner.push({ factor: "Downhill course", points: 5 });
    else if (e.includes("hilly")) beginner.push({ factor: "Hilly course", points: -10 });
  }

  if (race.timeLimit) {
    const tl = race.timeLimit.toLowerCase();
    if (tl.includes("none") || /\b[7-9]|1[0-2]\s*hours?\b/.test(tl)) beginner.push({ factor: "Generous time limit", points: 5 });
  }

  const pr: ScoreFactor[] = [{ factor: "Baseline", points: 50 }];
  if (flags.terrain === "road") pr.push({ factor: "Road surface", points: 15 });
  else if (flags.terrain === "trail") pr.push({ factor: "Trail surface", points: -15 });
  else if (flags.terrain === "track") pr.push({ factor: "Track surface", points: 20 });

  if (race.elevationGainM != null) {
    if (race.elevationGainM <= 50) pr.push({ factor: "Pancake flat", points: 20 });
    else if (race.elevationGainM <= 150) pr.push({ factor: "Flat course", points: 10 });
    else if (race.elevationGainM > 500) pr.push({ factor: "Hilly course", points: -15 });
  } else if (race.elevation) {
    const e = race.elevation.toLowerCase();
    if (e.includes("downhill")) pr.push({ factor: "Net downhill", points: 25 });
    else if (e.includes("flat")) pr.push({ factor: "Flat course", points: 15 });
    else if (e.includes("rolling")) pr.push({ factor: "Rolling hills", points: -5 });
    else if (e.includes("hilly")) pr.push({ factor: "Hilly course", points: -15 });
  }

  if (race.bostonQualifier) pr.push({ factor: "Boston qualifier", points: 10 });
  if (cat === "5K" || cat === "10K") pr.push({ factor: "Short distance favors PRs", points: 5 });
  if (race.fieldSize != null && race.fieldSize >= 1000) pr.push({ factor: "Large field with pacers", points: 5 });
  if (race.courseType) {
    if (race.courseType === "loop") pr.push({ factor: "Loop course", points: 0 });
    else if (race.courseType === "out-and-back") pr.push({ factor: "Out-and-back course", points: 0 });
    else if (race.courseType === "point-to-point") pr.push({ factor: "Point-to-point course", points: 5 });
  }
  if (race.yearsRunning != null && race.yearsRunning >= 5) pr.push({ factor: "Established race", points: 5 });

  const value: ScoreFactor[] = [{ factor: "Baseline", points: 50 }];
  const median = DISTANCE_MEDIAN_PRICE[cat] ?? 60;
  let avgPrice: number | null = null;
  if (race.priceMax != null && race.priceMin != null) avgPrice = (race.priceMin + race.priceMax) / 2;
  else if (race.priceMax != null) avgPrice = race.priceMax;
  else if (race.priceMin != null) avgPrice = race.priceMin;

  if (avgPrice != null) {
    if (avgPrice === 0) value.push({ factor: "Free race", points: 50 });
    else {
      const ratio = avgPrice / median;
      const adj = Math.round(clamp((1 - ratio) * 50, -40, 40));
      value.push({ factor: `Price $${Math.round(avgPrice)} vs median $${median}`, points: adj });
    }
  } else {
    value.push({ factor: "Price unavailable", points: -10 });
  }

  if (flags.charity) value.push({ factor: "Charity benefit", points: 10 });
  if (race.isClaimed) value.push({ factor: "Verified by organizer", points: 5 });

  const vibe: ScoreFactor[] = [{ factor: "Baseline", points: 30 }];
  const tagCount = flags.vibeTags.length;
  if (tagCount > 0) vibe.push({ factor: `${tagCount} vibe tag${tagCount > 1 ? "s" : ""}`, points: Math.min(40, tagCount * 10) });
  if (flags.charity) vibe.push({ factor: "Charity", points: 10 });
  if (race.seriesId != null) vibe.push({ factor: "Race series", points: 10 });
  if (flags.isTurkeyTrot) vibe.push({ factor: "Turkey trot tradition", points: 15 });
  if (flags.isHalloween) vibe.push({ factor: "Halloween race", points: 10 });
  if (flags.isJingleBell) vibe.push({ factor: "Holiday race", points: 10 });
  if (race.qualityScore >= 90) vibe.push({ factor: "Iconic event", points: 15 });
  else if (race.qualityScore >= 80) vibe.push({ factor: "Highly rated", points: 10 });

  const family: ScoreFactor[] = [{ factor: "Baseline", points: 30 }];
  if (flags.strollerFriendly) family.push({ factor: "Stroller friendly", points: 25 });
  if (flags.kidsRace) family.push({ factor: "Kids race option", points: 25 });
  if (flags.walkerFriendly) family.push({ factor: "Walker friendly", points: 15 });
  if (flags.dogFriendly) family.push({ factor: "Dog friendly", points: 10 });
  if (cat === "5K") family.push({ factor: "5K distance", points: 15 });
  else if (cat === "10K") family.push({ factor: "10K distance", points: 5 });
  else if (cat === "Marathon" || cat === "Ultra") family.push({ factor: "Long distance", points: -15 });
  if (flags.charity) family.push({ factor: "Family-friendly cause", points: 5 });

  const urgency: ScoreFactor[] = [{ factor: "Baseline", points: 30 }];
  let raceDate: Date | null = null;
  if (race.date) {
    const d = new Date(race.date);
    if (!isNaN(d.getTime())) raceDate = d;
  }
  if (raceDate) {
    const days = Math.round((raceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) urgency.push({ factor: "Race has passed", points: -100 });
    else if (days <= 7) urgency.push({ factor: "This week", points: 50 });
    else if (days <= 30) urgency.push({ factor: "Within 30 days", points: 30 });
    else if (days <= 60) urgency.push({ factor: "Within 60 days", points: 15 });
    else if (days <= 90) urgency.push({ factor: "Within 90 days", points: 5 });
    else if (days > 365) urgency.push({ factor: "Far future", points: -15 });
  }

  if (race.nextPriceIncreaseAt) {
    const inc = new Date(race.nextPriceIncreaseAt);
    if (!isNaN(inc.getTime())) {
      const days = Math.round((inc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 14) urgency.push({ factor: "Price increase within 2 weeks", points: 30 });
      else if (days > 14 && days <= 30) urgency.push({ factor: "Price increase within 30 days", points: 15 });
    }
  }

  if (race.registrationDeadline) {
    const dl = new Date(race.registrationDeadline);
    if (!isNaN(dl.getTime())) {
      const days = Math.round((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 14) urgency.push({ factor: "Deadline within 2 weeks", points: 30 });
      else if (days > 14 && days <= 30) urgency.push({ factor: "Deadline within 30 days", points: 15 });
    }
  }

  if (race.registrationOpen === false) urgency.push({ factor: "Registration closed", points: -50 });

  const sumFactors = (arr: ScoreFactor[]) => clamp(arr.reduce((s, f) => s + f.points, 0));

  return {
    beginnerScore: sumFactors(beginner),
    prScore: sumFactors(pr),
    valueScore: sumFactors(value),
    vibeScore: sumFactors(vibe),
    familyScore: sumFactors(family),
    urgencyScore: sumFactors(urgency),
    scoreBreakdown: { beginner, pr: pr, value, vibe, family, urgency },
  };
}
