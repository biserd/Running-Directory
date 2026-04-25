import type { Race } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Heart, Zap, Users, DollarSign, PartyPopper, Plane, Mountain, HandHeart } from "lucide-react";
import { cn } from "@/lib/utils";

type Best = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; tone: string };

function deriveBests(race: Race): Best[] {
  const out: Best[] = [];
  const surface = (race.surface || "").toLowerCase();
  const elevation = (race.elevation || "").toLowerCase();
  const terrain = (race.terrain || "").toLowerCase();
  const isTrail = surface.includes("trail") || terrain.includes("trail");

  if ((race.beginnerScore ?? 0) >= 60 || race.walkerFriendly) {
    out.push({ key: "beginners", label: "Great for beginners", icon: Heart, tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" });
  }
  if ((race.prScore ?? 0) >= 65 && !isTrail && !elevation.includes("hill")) {
    out.push({ key: "prs", label: "PR-friendly", icon: Zap, tone: "border-blue-500/30 bg-blue-500/10 text-blue-700" });
  }
  if (race.walkerFriendly) {
    out.push({ key: "walkers", label: "Walker-friendly", icon: Users, tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" });
  }
  if ((race.familyScore ?? 0) >= 60 || race.strollerFriendly || race.kidsRace) {
    out.push({ key: "families", label: "Family-friendly", icon: Users, tone: "border-pink-500/30 bg-pink-500/10 text-pink-700" });
  }
  if ((race.valueScore ?? 0) >= 65 || (race.priceMin != null && race.priceMin <= 35)) {
    out.push({ key: "value", label: "Strong value", icon: DollarSign, tone: "border-amber-500/30 bg-amber-500/10 text-amber-700" });
  }
  if ((race.vibeScore ?? 0) >= 65 || (race.vibeTags && race.vibeTags.length >= 2)) {
    out.push({ key: "vibe", label: "Big local vibe", icon: PartyPopper, tone: "border-violet-500/30 bg-violet-500/10 text-violet-700" });
  }
  if ((race.fieldSize ?? 0) >= 5000) {
    out.push({ key: "destination", label: "Destination event", icon: Plane, tone: "border-sky-500/30 bg-sky-500/10 text-sky-700" });
  }
  if (race.charity) {
    out.push({ key: "charity", label: "Charity race", icon: HandHeart, tone: "border-rose-500/30 bg-rose-500/10 text-rose-700" });
  }
  if (isTrail || elevation.includes("hill") || elevation.includes("mountain") || (race.elevationGainM ?? 0) > 200) {
    out.push({ key: "trail-challenge", label: "Trail / hill challenge", icon: Mountain, tone: "border-stone-500/30 bg-stone-500/10 text-stone-700" });
  }

  return out.slice(0, 9);
}

interface BestForBadgesProps {
  race: Race;
  className?: string;
  testId?: string;
}

export function BestForBadges({ race, className, testId }: BestForBadgesProps) {
  const bests = deriveBests(race);
  if (bests.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)} data-testid={testId || `best-for-empty-${race.id}`}>
        <Sparkles className="h-3.5 w-3.5" />
        <span>We're still profiling this race — fit signals coming soon.</span>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} data-testid={testId || `best-for-${race.id}`}>
      {bests.map(b => {
        const Icon = b.icon;
        return (
          <Badge key={b.key} variant="outline" className={cn("gap-1 font-medium", b.tone)} data-testid={`badge-best-${b.key}-${race.id}`}>
            <Icon className="h-3 w-3" />
            {b.label}
          </Badge>
        );
      })}
    </div>
  );
}
