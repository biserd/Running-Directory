import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Race, RaceAlert } from "@shared/schema";
import { setPendingAction } from "@/lib/pending-action";
import { Calendar, MapPin, Mountain, DollarSign, AlarmClock, Users, Heart, Scale, Bell, BellRing, ExternalLink, Check } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { parseRaceDate } from "@/lib/dates";
import { getStateName } from "@/lib/states";
import { useCompareCart } from "@/hooks/use-compare-cart";
import { FavoriteButton } from "@/components/favorite-button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

function fmtPrice(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `$${min}–$${max}`;
  return `$${min ?? max}`;
}

function fmtFieldSize(n: number | null | undefined): string | null {
  if (!n || n <= 0) return null;
  if (n >= 10000) return `${Math.round(n / 1000)}K runners`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K runners`;
  return `${n} runners`;
}

function ScoreChip({ label, value, testId }: { label: string; value: number | null | undefined; testId: string }) {
  if (value == null) return null;
  const tone = value >= 80 ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" : value >= 60 ? "bg-amber-500/15 text-amber-700 border-amber-500/30" : "bg-muted text-muted-foreground border-muted-foreground/20";
  return (
    <span
      className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium", tone)}
      data-testid={testId}
      title={`${label} score: ${value}/100`}
    >
      <span className="font-mono">{value}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}

interface RaceCardProps {
  race: Race;
  showCompare?: boolean;
  showAlert?: boolean;
}

export function RaceCard({ race, showCompare = true, showAlert = true }: RaceCardProps) {
  const { has, toggle, isFull } = useCompareCart();
  const { toast } = useToast();
  const { user, openLogin } = useAuth();
  const queryClient = useQueryClient();
  const [alertPending, setAlertPending] = useState(false);
  const inCompare = has(race.id);

  const { data: alerts } = useQuery<RaceAlert[]>({
    queryKey: ["/api/alerts"],
    enabled: !!user && showAlert,
    staleTime: 60_000,
  });
  const myAlert = alerts?.find(a => a.raceId === race.id);
  const hasAlert = !!myAlert;

  const price = fmtPrice(race.priceMin ?? null, race.priceMax ?? null);
  const fieldSize = fmtFieldSize(race.fieldSize ?? null);
  const terrain = race.terrain || race.surface;
  const elevation = race.elevationGainM != null && race.elevationGainM > 0 ? `${race.elevationGainM}m gain` : race.elevation;
  const deadline = race.registrationDeadline;
  const priceUpAt = race.nextPriceIncreaseAt;
  const priceUpAmount = race.nextPriceIncreaseAmount;

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inCompare && isFull) {
      toast({ title: "Compare list is full", description: "You can compare up to 4 races at a time.", variant: "destructive" });
      return;
    }
    toggle(race.id);
    toast({ title: inCompare ? "Removed from compare" : "Added to compare", description: race.name });
  };

  const handleAlert = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setPendingAction({ type: "race-alert", payload: { raceId: race.id, alertType: "price-drop" } });
      toast({ title: "Sign in to set this alert", description: "We'll set your alert as soon as you're signed in." });
      openLogin();
      return;
    }
    if (alertPending) return;
    setAlertPending(true);
    try {
      if (myAlert) {
        const res = await fetch(`/api/alerts/${myAlert.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to remove alert");
        toast({ title: "Alert removed", description: race.name });
      } else {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raceId: race.id, alertType: "price-drop" }),
        });
        if (!res.ok) throw new Error("Failed to create alert");
        toast({ title: "Alert set", description: `We'll notify you about ${race.name}.` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    } catch (err) {
      toast({ title: "Couldn't update alert", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setAlertPending(false);
    }
  };

  const handleRegister = async (e: React.MouseEvent) => {
    if (!race.registrationUrl) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      void fetch("/api/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId: race.id, destination: "registration", targetUrl: race.registrationUrl }),
        keepalive: true,
      }).catch(() => undefined);
    } finally {
      window.open(race.registrationUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors group h-full flex flex-col" data-testid={`card-race-${race.id}`}>
      <CardContent className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 mb-3">
          <Badge variant="secondary" className="font-mono text-xs font-normal uppercase tracking-wider" data-testid={`badge-distance-${race.id}`}>
            {race.distance}
          </Badge>
          <div className="flex items-center gap-1">
            {race.isTurkeyTrot && <Badge variant="outline" className="text-[10px] uppercase">🦃 Turkey Trot</Badge>}
            {race.bostonQualifier && <Badge variant="outline" className="text-[10px] uppercase">BQ</Badge>}
          </div>
        </div>

        <Link href={`/races/${race.slug}`} className="block group-hover:text-primary transition-colors mb-2" data-testid={`link-race-${race.id}`}>
          <h3 className="font-heading font-bold text-lg leading-tight line-clamp-2">
            {race.name}
          </h3>
        </Link>

        <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{format(parseRaceDate(race.date), "EEE, MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{race.city}, {getStateName(race.state)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          {price && (
            <div className="flex items-center gap-1.5 bg-secondary/50 p-2 rounded" data-testid={`text-price-${race.id}`}>
              <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">{price}</span>
            </div>
          )}
          {fieldSize && (
            <div className="flex items-center gap-1.5 bg-secondary/50 p-2 rounded" data-testid={`text-field-size-${race.id}`}>
              <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{fieldSize}</span>
            </div>
          )}
          {terrain && (
            <div className="flex items-center gap-1.5 bg-secondary/50 p-2 rounded" data-testid={`text-terrain-${race.id}`}>
              <Mountain className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{terrain}</span>
            </div>
          )}
          {elevation && (
            <div className="flex items-center gap-1.5 bg-secondary/50 p-2 rounded" data-testid={`text-elevation-${race.id}`}>
              <Mountain className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{elevation}</span>
            </div>
          )}
        </div>

        {(deadline || priceUpAt) && (
          <div className="text-xs space-y-1 mb-3">
            {deadline && (
              <div className="flex items-center gap-1.5 text-muted-foreground" data-testid={`text-deadline-${race.id}`}>
                <AlarmClock className="h-3 w-3 flex-shrink-0" />
                <span>Closes {format(parseRaceDate(deadline), "MMM d")}</span>
              </div>
            )}
            {priceUpAt && (
              <div className="flex items-center gap-1.5 text-amber-700" data-testid={`text-price-up-${race.id}`}>
                <AlarmClock className="h-3 w-3 flex-shrink-0" />
                <span>Price goes up {format(parseRaceDate(priceUpAt), "MMM d")}{priceUpAmount ? ` (+$${priceUpAmount})` : ""}</span>
              </div>
            )}
          </div>
        )}

        {(race.beginnerScore != null || race.prScore != null || race.valueScore != null) && (
          <div className="flex flex-wrap gap-1 mb-3" data-testid={`scores-${race.id}`}>
            <ScoreChip label="beginner" value={race.beginnerScore} testId={`score-beginner-${race.id}`} />
            <ScoreChip label="PR" value={race.prScore} testId={`score-pr-${race.id}`} />
            <ScoreChip label="value" value={race.valueScore} testId={`score-value-${race.id}`} />
          </div>
        )}

        {race.vibeTags && race.vibeTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3" data-testid={`vibe-tags-${race.id}`}>
            {race.vibeTags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] font-normal capitalize">
                {tag.replace(/-/g, " ")}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3 border-t flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5">
            <FavoriteButton itemType="race" itemId={race.id} size="sm" />
            {showCompare && (
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", inCompare && "text-primary")}
                onClick={handleCompare}
                title={inCompare ? "Remove from compare" : "Add to compare"}
                data-testid={`button-compare-${race.id}`}
              >
                {inCompare ? <Check className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
              </Button>
            )}
            {showAlert && (
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", hasAlert && "text-primary")}
                onClick={handleAlert}
                disabled={alertPending}
                title={hasAlert ? "Remove alert" : "Set price-drop alert"}
                data-testid={`button-alert-${race.id}`}
              >
                {hasAlert ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </Button>
            )}
          </div>
          {race.registrationUrl ? (
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleRegister}
              data-testid={`button-register-${race.id}`}
            >
              Register <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="h-8 text-xs">
              <Link href={`/races/${race.slug}`} data-testid={`button-details-${race.id}`}>Details</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
