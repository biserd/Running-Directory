import type { Race } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Sparkles, Zap, DollarSign, Heart, PartyPopper, Clock } from "lucide-react";

type ScoreKey = "beginner" | "pr" | "value" | "vibe" | "family" | "urgency";

const SCORE_META: Record<ScoreKey, {
  label: string;
  blurb: string;
  icon: React.ComponentType<{ className?: string }>;
  good: string;
  bad: string;
}> = {
  beginner: {
    label: "Beginner",
    blurb: "How welcoming this race is for first-timers and walkers.",
    icon: Heart,
    good: "Walker-friendly, gentle elevation, generous time limits.",
    bad: "Hilly, strict cutoffs, or no walker accommodations.",
  },
  pr: {
    label: "PR potential",
    blurb: "How likely this course is to deliver a personal record.",
    icon: Zap,
    good: "Flat, fast, well-organized, big competitive field.",
    bad: "Lots of climbing, small field, or hot weather.",
  },
  value: {
    label: "Value",
    blurb: "How much race you get for the entry fee.",
    icon: DollarSign,
    good: "Low fee, included extras, big-event production.",
    bad: "Expensive entry with limited frills.",
  },
  vibe: {
    label: "Vibe",
    blurb: "Atmosphere — costumes, themes, festival energy.",
    icon: PartyPopper,
    good: "Themed, costume-friendly, post-race party.",
    bad: "Standard course, no themed elements.",
  },
  family: {
    label: "Family",
    blurb: "Fit for kids, strollers, and multi-generational outings.",
    icon: Sparkles,
    good: "Kids race, strollers welcome, dog-friendly.",
    bad: "No kids race, restricted strollers.",
  },
  urgency: {
    label: "Urgency",
    blurb: "How soon you should sign up — close date and price hikes.",
    icon: Clock,
    good: "Coming up fast or about to get more expensive.",
    bad: "Plenty of time before close.",
  },
};

function tone(value: number | null | undefined): string {
  if (value == null) return "bg-muted text-muted-foreground border-muted-foreground/20";
  if (value >= 80) return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  if (value >= 60) return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  if (value >= 40) return "bg-orange-500/10 text-orange-700 border-orange-500/30";
  return "bg-muted text-muted-foreground border-muted-foreground/20";
}

interface ScoreCellProps {
  scoreKey: ScoreKey;
  value: number | null | undefined;
  rationale?: string;
  raceId: number;
  compact?: boolean;
}

function ScoreCell({ scoreKey, value, rationale, raceId, compact }: ScoreCellProps) {
  const meta = SCORE_META[scoreKey];
  const Icon = meta.icon;
  const display = value == null ? "—" : value;
  const why = rationale || (value == null ? "Not yet scored." : value >= 60 ? meta.good : meta.bad);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded-lg border p-3 text-left transition-colors hover:border-primary/50 w-full",
            compact ? "" : "min-h-[88px]",
          )}
          data-testid={`score-cell-${scoreKey}-${raceId}`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
            <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={cn("text-2xl font-bold tabular-nums px-2 py-0.5 rounded border", tone(value))}
              data-testid={`score-value-${scoreKey}-${raceId}`}
            >
              {display}
            </span>
            {value != null && <span className="text-[11px] text-muted-foreground">/100</span>}
          </div>
          {!compact && (
            <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{meta.blurb}</p>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-semibold text-xs">{meta.label} — {value ?? "—"}/100</div>
          <div className="text-xs">{why}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface ScoreBlockProps {
  race: Pick<Race, "id" | "beginnerScore" | "prScore" | "valueScore" | "vibeScore" | "familyScore" | "urgencyScore" | "scoreBreakdown">;
  compact?: boolean;
  hide?: ScoreKey[];
}

function rationaleFor(race: ScoreBlockProps["race"], key: ScoreKey): string | undefined {
  const b = race.scoreBreakdown as Record<string, unknown> | null | undefined;
  if (!b || typeof b !== "object") return undefined;
  const node = (b[key] || b[`${key}Score`] || b[`${key}_score`]) as { rationale?: string; reason?: string; why?: string } | undefined;
  if (node && typeof node === "object") {
    return node.rationale || node.reason || node.why;
  }
  return undefined;
}

export function ScoreBlock({ race, compact, hide = [] }: ScoreBlockProps) {
  const all: Array<{ key: ScoreKey; value: number | null | undefined }> = [
    { key: "beginner", value: race.beginnerScore },
    { key: "pr", value: race.prScore },
    { key: "value", value: race.valueScore },
    { key: "vibe", value: race.vibeScore },
    { key: "family", value: race.familyScore },
    { key: "urgency", value: race.urgencyScore },
  ];
  const items = all.filter(item => !hide.includes(item.key));

  return (
    <div
      className={cn(
        "grid gap-2",
        compact ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
      )}
      data-testid={`score-block-${race.id}`}
    >
      {items.map(item => (
        <ScoreCell
          key={item.key}
          scoreKey={item.key}
          value={item.value}
          rationale={rationaleFor(race, item.key)}
          raceId={race.id}
          compact={compact}
        />
      ))}
    </div>
  );
}
