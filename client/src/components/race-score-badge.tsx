import {
  computeRaceScore,
  raceScoreColorClass,
  type RaceScoreInput,
} from "@shared/race-score";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  race: RaceScoreInput;
  size?: "sm" | "md" | "lg";
  showHeadline?: boolean;
  testIdSuffix?: string | number;
  className?: string;
}

// Circular dial that mimics the Zillow Zestimate badge — a single
// composite 0-100 number with an A+/A/B/C/D grade and a popover that
// shows exactly how it was computed (weights + bonuses).
export function RaceScoreBadge({
  race,
  size = "md",
  showHeadline = false,
  testIdSuffix,
  className,
}: Props) {
  const result = computeRaceScore(race);
  const color = raceScoreColorClass(result.score);

  const sizing =
    size === "sm"
      ? { box: "h-12 w-12", text: "text-lg", grade: "text-[9px]" }
      : size === "lg"
        ? { box: "h-24 w-24", text: "text-4xl", grade: "text-xs" }
        : { box: "h-16 w-16", text: "text-2xl", grade: "text-[10px]" };

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = (result.score / 100) * circumference;

  const testId = testIdSuffix != null ? `race-score-${testIdSuffix}` : "race-score";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group relative inline-flex items-center gap-2 outline-none",
            className,
          )}
          data-testid={testId}
          aria-label={`RaceScore ${result.score} out of 100, grade ${result.grade}`}
        >
          <span className={cn("relative inline-flex items-center justify-center", sizing.box)}>
            <svg className="absolute inset-0" viewBox="0 0 100 100" aria-hidden="true">
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="8"
                className="stroke-muted/40"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={cn("transition-[stroke-dasharray] duration-500", color.ring)}
                strokeDasharray={`${dash} ${circumference}`}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <span className="flex flex-col items-center leading-none">
              <span className={cn("font-bold tabular-nums", sizing.text, color.text)} data-testid={`${testId}-value`}>
                {result.score}
              </span>
              <span className={cn("uppercase font-semibold tracking-wider opacity-70", sizing.grade)}>
                {result.grade}
              </span>
            </span>
          </span>
          {showHeadline && (
            <span className="text-left">
              <span className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                RaceScore
              </span>
              <span className="block text-sm font-medium leading-snug max-w-[220px]" data-testid={`${testId}-headline`}>
                {result.headline}
              </span>
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                <Info className="h-3 w-3" />
                How we calculated this
              </span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" data-testid={`${testId}-popover`}>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">
                RaceScore
              </div>
              <div className="text-2xl font-bold leading-none">
                {result.score}
                <span className="text-sm font-normal text-muted-foreground"> / 100</span>
              </div>
              <div className="text-xs mt-1">
                Grade <span className="font-semibold">{result.grade}</span> ·{" "}
                <span className="text-muted-foreground capitalize">{result.confidence} confidence</span>
              </div>
            </div>
            <div
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-semibold",
                color.bg,
                color.border,
                color.text,
              )}
            >
              {result.grade}
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-snug" data-testid={`${testId}-popover-headline`}>
            {result.headline}
          </p>

          {result.components.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                What went into it
              </div>
              <ul className="space-y-1.5" data-testid={`${testId}-popover-components`}>
                {result.components.map((c) => (
                  <li key={c.key} className="text-xs">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-medium">{c.label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {Math.round(c.value)}/100 · {Math.round(c.weight * 100)}% weight
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full", color.ring.replace("stroke-", "bg-"))}
                        style={{ width: `${c.value}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.bonuses.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                Bonuses applied
              </div>
              <ul className="text-xs space-y-0.5" data-testid={`${testId}-popover-bonuses`}>
                {result.bonuses.map((b) => (
                  <li key={b.key} className="flex items-center justify-between">
                    <span>{b.label}</span>
                    <span className="text-emerald-700 font-semibold">+{b.points}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/70 leading-snug border-t pt-2">
            RaceScore is a weighted blend of PR potential, value, vibe,
            beginner-friendliness, family-fit, urgency, and data completeness,
            plus small bonuses for trust signals. Missing scores are skipped and
            their weight is redistributed.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
