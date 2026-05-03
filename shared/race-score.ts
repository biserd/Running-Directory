// RaceScore — the "Zestimate" for races. A single 0-100 composite
// that runners can use to compare any two races at a glance.
//
// Pure function (no DB / no network / no React) so it can run on the
// server (storage layer, sitemaps, JSON-LD) and the client (race card,
// race detail) without duplication.

export type RaceScoreInput = {
  beginnerScore?: number | null;
  prScore?: number | null;
  valueScore?: number | null;
  vibeScore?: number | null;
  familyScore?: number | null;
  urgencyScore?: number | null;
  qualityScore?: number | null;
  // Bonuses
  bostonQualifier?: boolean | null;
  photoUrls?: string[] | null;
  elevationGainM?: number | null;
  fieldSize?: number | null;
  reviewCount?: number | null;
  averageRating?: number | null;
};

export type RaceScoreComponent = {
  key: "pr" | "value" | "vibe" | "beginner" | "family" | "urgency" | "quality";
  label: string;
  weight: number; // share of the final score, 0-1, after redistribution
  value: number; // 0-100 raw sub-score
  contribution: number; // value * weight
};

export type RaceScoreBonus = {
  key: string;
  label: string;
  points: number;
};

export type RaceScoreResult = {
  score: number; // 0-100, integer
  grade: "A+" | "A" | "B" | "C" | "D";
  components: RaceScoreComponent[];
  bonuses: RaceScoreBonus[];
  confidence: "high" | "medium" | "low";
  // Top 1-2 reasons we chose this number, for tooltips & cards
  headline: string;
};

// Default weights — these reflect what a typical race-shopper cares about
// most. PR + Value carry the most weight; Family/Urgency are tiebreakers.
const BASE_WEIGHTS: Record<RaceScoreComponent["key"], number> = {
  pr: 0.20,
  value: 0.25,
  vibe: 0.15,
  beginner: 0.10,
  family: 0.05,
  urgency: 0.10,
  quality: 0.15,
};

const COMPONENT_LABEL: Record<RaceScoreComponent["key"], string> = {
  pr: "PR potential",
  value: "Value for money",
  vibe: "Vibe & atmosphere",
  beginner: "Beginner-friendly",
  family: "Family-friendly",
  urgency: "Sign-up urgency",
  quality: "Data completeness",
};

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function gradeFor(score: number): RaceScoreResult["grade"] {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

export function computeRaceScore(input: RaceScoreInput): RaceScoreResult {
  // Gather raw sub-scores. A null/undefined sub-score is treated as
  // "missing" — its weight gets redistributed to whatever IS present.
  const raw: Array<{ key: RaceScoreComponent["key"]; value: number | null }> = [
    { key: "pr", value: input.prScore ?? null },
    { key: "value", value: input.valueScore ?? null },
    { key: "vibe", value: input.vibeScore ?? null },
    { key: "beginner", value: input.beginnerScore ?? null },
    { key: "family", value: input.familyScore ?? null },
    { key: "urgency", value: input.urgencyScore ?? null },
    { key: "quality", value: input.qualityScore ?? null },
  ];

  const present = raw.filter((r) => r.value != null) as Array<{
    key: RaceScoreComponent["key"];
    value: number;
  }>;

  // Total weight of present components; we'll normalize against this so
  // the final score is always 0-100 even when half the data is missing.
  const totalWeight = present.reduce((sum, r) => sum + BASE_WEIGHTS[r.key], 0);

  let core = 0;
  const components: RaceScoreComponent[] = [];
  if (totalWeight > 0) {
    for (const r of present) {
      const w = BASE_WEIGHTS[r.key] / totalWeight;
      const v = clamp(r.value);
      const contribution = v * w;
      core += contribution;
      components.push({
        key: r.key,
        label: COMPONENT_LABEL[r.key],
        weight: w,
        value: v,
        contribution,
      });
    }
  } else {
    // No sub-scores at all — fall back to a neutral 50.
    core = 50;
  }

  // Bonuses: small lifts for trust signals. Capped at +8 total so they
  // can't run away with the score.
  const bonuses: RaceScoreBonus[] = [];
  if (input.bostonQualifier) bonuses.push({ key: "bq", label: "Boston-qualifier certified", points: 3 });
  if ((input.photoUrls?.length ?? 0) >= 3) bonuses.push({ key: "photos", label: "Course photos available", points: 2 });
  if (input.elevationGainM != null) bonuses.push({ key: "elev", label: "Verified elevation profile", points: 1 });
  if ((input.fieldSize ?? 0) >= 1000) bonuses.push({ key: "field", label: "Large competitive field", points: 2 });
  if ((input.reviewCount ?? 0) >= 5 && (input.averageRating ?? 0) >= 4.0) {
    bonuses.push({ key: "reviews", label: "Highly-rated by runners", points: 3 });
  }
  const bonusPoints = Math.min(8, bonuses.reduce((s, b) => s + b.points, 0));

  const final = Math.round(clamp(core + bonusPoints));

  // Confidence is driven by how much real data we had to work with.
  const confidence: RaceScoreResult["confidence"] =
    totalWeight >= 0.7 ? "high" : totalWeight >= 0.4 ? "medium" : "low";

  // Headline — pick the highest contributor as the "why this score" hook.
  const sortedComps = [...components].sort((a, b) => b.contribution - a.contribution);
  const top = sortedComps[0];
  let headline: string;
  if (final >= 85) {
    headline = top
      ? `Top-tier race — strongest on ${top.label.toLowerCase()}.`
      : "Top-tier race overall.";
  } else if (final >= 70) {
    headline = top
      ? `Solid choice, especially for ${top.label.toLowerCase()}.`
      : "Solid choice overall.";
  } else if (final >= 55) {
    headline = top
      ? `Decent option — best feature is ${top.label.toLowerCase()}.`
      : "Decent option overall.";
  } else {
    headline = confidence === "low"
      ? "Limited data — score may shift as we learn more."
      : "Below-average fit for most runners.";
  }

  return {
    score: final,
    grade: gradeFor(final),
    components: sortedComps,
    bonuses,
    confidence,
    headline,
  };
}

// UI helpers (pure, so they live in shared too).
export function raceScoreColorClass(score: number): {
  ring: string;
  text: string;
  bg: string;
  border: string;
} {
  if (score >= 85) return {
    ring: "stroke-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
  };
  if (score >= 70) return {
    ring: "stroke-blue-500",
    text: "text-blue-700",
    bg: "bg-blue-500/10",
    border: "border-blue-500/40",
  };
  if (score >= 55) return {
    ring: "stroke-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
  };
  return {
    ring: "stroke-rose-500",
    text: "text-rose-700",
    bg: "bg-rose-500/10",
    border: "border-rose-500/40",
  };
}
