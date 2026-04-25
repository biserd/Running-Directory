import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RaceCard } from "@/components/race-card";
import { BestForBadges } from "@/components/best-for-badges";
import { Sparkles, Heart, Zap, DollarSign, PartyPopper, Users, Trophy, Search, Wand2, Lightbulb, MapPin } from "lucide-react";
import { apiShopperRaces, type ShopperInput } from "@/lib/api";
import { apiGetStates } from "@/lib/api";
import type { Race, State } from "@shared/schema";

type Goal = "beginner" | "pr" | "value" | "vibe" | "family" | "urgency";

const GOALS: Array<{ key: Goal; title: string; blurb: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "beginner", title: "First race", blurb: "Walker-friendly, gentle, generous time limits.", icon: Heart },
  { key: "pr", title: "Set a PR", blurb: "Fast, flat, well-organized.", icon: Zap },
  { key: "value", title: "Best value", blurb: "Most race for the entry fee.", icon: DollarSign },
  { key: "vibe", title: "Big vibe", blurb: "Themes, costumes, festival energy.", icon: PartyPopper },
  { key: "family", title: "Family-friendly", blurb: "Strollers, kids races, walkers welcome.", icon: Users },
  { key: "urgency", title: "Sign up soon", blurb: "Closing fast or about to get pricier.", icon: Sparkles },
];

const DISTANCES = ["5K", "10K", "Half Marathon", "Marathon", "Ultra"];
const MONTHS = [
  { v: "1", l: "January" }, { v: "2", l: "February" }, { v: "3", l: "March" }, { v: "4", l: "April" },
  { v: "5", l: "May" }, { v: "6", l: "June" }, { v: "7", l: "July" }, { v: "8", l: "August" },
  { v: "9", l: "September" }, { v: "10", l: "October" }, { v: "11", l: "November" }, { v: "12", l: "December" },
];
const TERRAINS = ["Road", "Trail", "Track", "Mixed"];
const SURFACES = ["paved", "trail", "mixed", "track"];
const DIFFICULTY: Array<{ v: "easy" | "moderate" | "hard"; l: string }> = [
  { v: "easy", l: "Easy / flat" },
  { v: "moderate", l: "Moderate" },
  { v: "hard", l: "Hard / hilly" },
];
const RADIUS_OPTIONS = [25, 50, 100, 250, 500];

function pickRationale(race: Race, goal: Goal): string {
  const parts: string[] = [];
  switch (goal) {
    case "beginner":
      if (race.walkerFriendly) parts.push("walkers welcome");
      if (race.beginnerScore && race.beginnerScore >= 70) parts.push("strong beginner score");
      if (race.elevation && /flat|easy/i.test(race.elevation)) parts.push("flat course");
      if (race.kidsRace) parts.push("includes a kids race");
      break;
    case "pr":
      if (race.prScore && race.prScore >= 70) parts.push("high PR-potential score");
      if (race.elevation && /flat/i.test(race.elevation)) parts.push("flat & fast");
      if (race.bostonQualifier) parts.push("Boston qualifier");
      if ((race.fieldSize ?? 0) >= 1000) parts.push("strong competitive field");
      break;
    case "value":
      if (race.priceMin != null) parts.push(`entry from $${race.priceMin}`);
      if (race.valueScore && race.valueScore >= 70) parts.push("top value rating");
      if ((race.fieldSize ?? 0) >= 1000) parts.push("big-event production");
      break;
    case "vibe":
      if (race.vibeScore && race.vibeScore >= 70) parts.push("high-vibe rating");
      if (race.vibeTags && race.vibeTags.length > 0) parts.push(race.vibeTags.slice(0, 2).map(t => t.replace(/-/g, " ")).join(", "));
      if (race.isTurkeyTrot) parts.push("turkey trot");
      break;
    case "family":
      if (race.kidsRace) parts.push("kids race included");
      if (race.strollerFriendly) parts.push("strollers welcome");
      if (race.dogFriendly) parts.push("dog-friendly");
      if (race.familyScore && race.familyScore >= 70) parts.push("strong family score");
      break;
    case "urgency":
      if (race.nextPriceIncreaseAt) parts.push(`price hike on ${race.nextPriceIncreaseAt}`);
      if (race.registrationDeadline) parts.push(`closes ${race.registrationDeadline}`);
      if (race.urgencyScore && race.urgencyScore >= 70) parts.push("urgent — register soon");
      break;
  }
  if (parts.length === 0) {
    if (race.qualityScore >= 70) parts.push("well-documented race");
    else parts.push("matches your filters");
  }
  return parts[0].charAt(0).toUpperCase() + parts.slice(0, 3).join(" · ").slice(1);
}

interface CategorizedSection {
  key: string;
  title: string;
  blurb: string;
  icon: React.ComponentType<{ className?: string }>;
  races: Race[];
}

function categorize(races: Race[], goal: Goal): CategorizedSection[] {
  const seen = new Set<number>();
  const take = (filter: (r: Race) => boolean, limit: number): Race[] => {
    const out: Race[] = [];
    for (const r of races) {
      if (out.length >= limit) break;
      if (seen.has(r.id)) continue;
      if (filter(r)) {
        out.push(r);
        seen.add(r.id);
      }
    }
    return out;
  };

  const sections: CategorizedSection[] = [];

  const overall = take(() => true, 6);
  if (overall.length > 0) {
    sections.push({
      key: "overall",
      title: "Top picks for your goal",
      blurb: `Best matches we found for "${GOALS.find(g => g.key === goal)?.title || goal}".`,
      icon: Trophy,
      races: overall,
    });
  }

  const value = take(r => (r.valueScore ?? 0) >= 65 || ((r.priceMin ?? 999) <= 35), 4);
  if (value.length > 0 && goal !== "value") sections.push({ key: "value", title: "Best value", blurb: "Strong race for the entry fee.", icon: DollarSign, races: value });

  const beginner = take(r => (r.beginnerScore ?? 0) >= 65 || !!r.walkerFriendly, 4);
  if (beginner.length > 0 && goal !== "beginner") sections.push({ key: "beginner", title: "Beginner-friendly", blurb: "Welcoming for first-timers and walkers.", icon: Heart, races: beginner });

  const pr = take(r => (r.prScore ?? 0) >= 65, 4);
  if (pr.length > 0 && goal !== "pr") sections.push({ key: "pr", title: "PR potential", blurb: "Fast, flat, well-organized.", icon: Zap, races: pr });

  const vibe = take(r => (r.vibeScore ?? 0) >= 65 || (r.vibeTags?.length ?? 0) >= 2, 4);
  if (vibe.length > 0 && goal !== "vibe") sections.push({ key: "vibe", title: "Big vibe", blurb: "Strong atmosphere — themes, costumes, festival energy.", icon: PartyPopper, races: vibe });

  const hidden = take(r => (r.fieldSize ?? 0) > 0 && (r.fieldSize ?? 0) < 500 && r.qualityScore >= 60, 4);
  if (hidden.length > 0) sections.push({ key: "hidden", title: "Hidden gems", blurb: "Smaller, well-documented races worth a look.", icon: Lightbulb, races: hidden });

  const urgency = take(r => (r.urgencyScore ?? 0) >= 65 || !!r.nextPriceIncreaseAt, 4);
  if (urgency.length > 0 && goal !== "urgency") sections.push({ key: "urgency", title: "Sign up soon", blurb: "Closing fast or about to get pricier.", icon: Sparkles, races: urgency });

  return sections;
}

function PickCard({ race, goal }: { race: Race; goal: Goal }) {
  const reason = pickRationale(race, goal);
  return (
    <Card className="flex flex-col h-full" data-testid={`pick-card-${race.id}`}>
      <CardContent className="p-4 flex flex-col gap-2 flex-1">
        <Link href={`/races/${race.slug}`} className="font-heading font-semibold text-base leading-tight hover:text-primary line-clamp-2" data-testid={`pick-link-${race.id}`}>
          {race.name}
        </Link>
        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{race.distance}</span>
          <span>·</span>
          <span>{race.city}, {race.state}</span>
          <span>·</span>
          <span>{race.date}</span>
        </div>
        <div className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 rounded px-2 py-1.5 inline-flex items-start gap-1.5" data-testid={`pick-reason-${race.id}`}>
          <Lightbulb className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{reason}</span>
        </div>
        <BestForBadges race={race} className="mt-auto pt-1" />
      </CardContent>
    </Card>
  );
}

export default function RaceShopperPage() {
  const params = useParams();
  const initialGoal = (params.goal && GOALS.some(g => g.key === params.goal as Goal) ? (params.goal as Goal) : "beginner");

  const [goal, setGoal] = useState<Goal>(initialGoal);
  const [distance, setDistance] = useState<string>("");
  const [stateAbbr, setStateAbbr] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [terrain, setTerrain] = useState<string>("");
  const [surface, setSurface] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"easy" | "moderate" | "hard" | "">("");
  const [radiusMiles, setRadiusMiles] = useState<string>("");
  const [walkerFriendly, setWalkerFriendly] = useState(false);
  const [strollerFriendly, setStrollerFriendly] = useState(false);
  const [bostonQualifier, setBostonQualifier] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: states } = useQuery<State[]>({ queryKey: ["/api/states"], queryFn: apiGetStates });

  const input = useMemo<ShopperInput>(() => {
    const dateRange: { dateFrom?: string; dateTo?: string } = {};
    // Explicit date range wins over month picker
    if (dateFrom || dateTo) {
      if (dateFrom) dateRange.dateFrom = dateFrom;
      if (dateTo) dateRange.dateTo = dateTo;
    } else if (month) {
      const m = parseInt(month, 10);
      const now = new Date();
      let year = now.getFullYear();
      if (m < now.getMonth() + 1) year += 1;
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0);
      const fmt = (d: Date) => d.toISOString().split("T")[0];
      dateRange.dateFrom = fmt(start);
      dateRange.dateTo = fmt(end);
    }
    return {
      goal,
      distance: distance || undefined,
      state: stateAbbr || undefined,
      terrain: terrain || undefined,
      surface: surface || undefined,
      difficulty: difficulty || undefined,
      // Radius only takes effect when paired with a state — server derives the centroid.
      radiusMiles: radiusMiles && stateAbbr ? parseInt(radiusMiles, 10) : undefined,
      ...dateRange,
      budget: budget ? parseInt(budget, 10) : undefined,
      walkerFriendly: walkerFriendly || undefined,
      strollerFriendly: strollerFriendly || undefined,
      bostonQualifier: bostonQualifier || undefined,
      limit: 30,
    };
  }, [goal, distance, stateAbbr, month, dateFrom, dateTo, budget, terrain, surface, difficulty, radiusMiles, walkerFriendly, strollerFriendly, bostonQualifier]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["/api/races/shopper", input, submitted],
    queryFn: () => apiShopperRaces(input),
    enabled: submitted,
  });

  const sections = useMemo(() => (data?.races ? categorize(data.races, goal) : []), [data, goal]);
  const noResults = submitted && !isFetching && (!data || data.races.length === 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Layout>
      <section className="py-10 md:py-14 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
              <Wand2 className="h-4 w-4" />
              Race Shopper
            </div>
            <h1 className="text-3xl md:text-5xl font-heading font-bold mb-3" data-testid="text-shopper-title">
              Find the right race for your goal.
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl" data-testid="text-shopper-description">
              Tell us what you actually want — a PR, your first 5K, the best value, or a big-vibe event — and we'll rank every upcoming race for that goal.
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="font-heading font-semibold text-lg mb-4">What's your goal?</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
                {GOALS.map(g => {
                  const Icon = g.icon;
                  const active = goal === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setGoal(g.key)}
                      className={`text-left rounded-lg border p-3 transition-colors hover:border-primary/50 ${active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : ""}`}
                      data-testid={`goal-${g.key}`}
                      aria-pressed={active}
                    >
                      <Icon className={`h-5 w-5 mb-1.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="font-semibold text-sm">{g.title}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-2">{g.blurb}</div>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="shopper-distance" className="text-xs uppercase tracking-wider mb-1 block">Distance</Label>
                    <Select value={distance || "any"} onValueChange={v => setDistance(v === "any" ? "" : v)}>
                      <SelectTrigger id="shopper-distance" data-testid="select-distance"><SelectValue placeholder="Any distance" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any distance</SelectItem>
                        {DISTANCES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shopper-state" className="text-xs uppercase tracking-wider mb-1 block">State</Label>
                    <Select value={stateAbbr || "any"} onValueChange={v => setStateAbbr(v === "any" ? "" : v)}>
                      <SelectTrigger id="shopper-state" data-testid="select-state"><SelectValue placeholder="Any state" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any state</SelectItem>
                        {(states || []).map(s => <SelectItem key={s.id} value={s.abbreviation}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shopper-month" className="text-xs uppercase tracking-wider mb-1 block">Month</Label>
                    <Select value={month || "any"} onValueChange={v => setMonth(v === "any" ? "" : v)} disabled={!!(dateFrom || dateTo)}>
                      <SelectTrigger id="shopper-month" data-testid="select-month"><SelectValue placeholder="Any month" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any month</SelectItem>
                        {MONTHS.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shopper-budget" className="text-xs uppercase tracking-wider mb-1 block">Budget (USD)</Label>
                    <Input
                      id="shopper-budget"
                      type="number"
                      min={0}
                      max={1000}
                      placeholder="e.g. 75"
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                      data-testid="input-budget"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="shopper-date-from" className="text-xs uppercase tracking-wider mb-1 block">Date from</Label>
                    <Input
                      id="shopper-date-from"
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      data-testid="input-date-from"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shopper-date-to" className="text-xs uppercase tracking-wider mb-1 block">Date to</Label>
                    <Input
                      id="shopper-date-to"
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      data-testid="input-date-to"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shopper-terrain" className="text-xs uppercase tracking-wider mb-1 block">Terrain</Label>
                    <Select value={terrain || "any"} onValueChange={v => setTerrain(v === "any" ? "" : v)}>
                      <SelectTrigger id="shopper-terrain" data-testid="select-terrain"><SelectValue placeholder="Any terrain" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any terrain</SelectItem>
                        {TERRAINS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shopper-difficulty" className="text-xs uppercase tracking-wider mb-1 block">Effort</Label>
                    <Select value={difficulty || "any"} onValueChange={v => setDifficulty(v === "any" ? "" : (v as "easy" | "moderate" | "hard"))}>
                      <SelectTrigger id="shopper-difficulty" data-testid="select-difficulty"><SelectValue placeholder="Any effort" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any effort</SelectItem>
                        {DIFFICULTY.map(d => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="shopper-surface" className="text-xs uppercase tracking-wider mb-1 block">Surface</Label>
                    <Select value={surface || "any"} onValueChange={v => setSurface(v === "any" ? "" : v)}>
                      <SelectTrigger id="shopper-surface" data-testid="select-surface"><SelectValue placeholder="Any surface" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any surface</SelectItem>
                        {SURFACES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shopper-radius" className="text-xs uppercase tracking-wider mb-1 block">Travel radius (mi)</Label>
                    <Select value={radiusMiles || "any"} onValueChange={v => setRadiusMiles(v === "any" ? "" : v)}>
                      <SelectTrigger id="shopper-radius" data-testid="select-radius"><SelectValue placeholder="Any distance" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any distance</SelectItem>
                        {RADIUS_OPTIONS.map(r => <SelectItem key={r} value={String(r)}>{r} mi</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">Pick a state above to anchor the radius.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={walkerFriendly} onCheckedChange={c => setWalkerFriendly(!!c)} data-testid="checkbox-walker" />
                    Walker-friendly
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={strollerFriendly} onCheckedChange={c => setStrollerFriendly(!!c)} data-testid="checkbox-stroller" />
                    Stroller-friendly
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={bostonQualifier} onCheckedChange={c => setBostonQualifier(!!c)} data-testid="checkbox-bq" />
                    Boston qualifier
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" size="lg" data-testid="button-shopper-submit">
                    <Search className="mr-2 h-4 w-4" />
                    Find my races
                  </Button>
                  <p className="text-xs text-muted-foreground">Adjust the form anytime — we'll re-rank instantly.</p>
                </div>
              </form>
            </CardContent>
          </Card>

          {!submitted && (
            <Card>
              <CardContent className="p-8 text-center" data-testid="card-shopper-cta">
                <MapPin className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">Pick a goal and hit "Find my races" to see ranked results.</p>
              </CardContent>
            </Card>
          )}

          {submitted && isFetching && (
            <Card><CardContent className="p-8 text-center text-muted-foreground" data-testid="text-shopper-loading">Ranking races…</CardContent></Card>
          )}

          {submitted && error && (
            <Card><CardContent className="p-8 text-center text-muted-foreground" data-testid="text-shopper-error">Something went wrong. Try adjusting your filters.</CardContent></Card>
          )}

          {noResults && (
            <Card>
              <CardContent className="p-8 text-center" data-testid="card-shopper-empty">
                <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-heading font-semibold text-lg mb-1">No matches for those filters</h3>
                <p className="text-muted-foreground mb-4">Try a wider month range, a different state, or a higher budget.</p>
                <Button asChild variant="outline" data-testid="button-browse-races"><Link href="/races">Browse all races</Link></Button>
              </CardContent>
            </Card>
          )}

          {submitted && !isFetching && data && data.races.length > 0 && (
            <div className="space-y-10">
              <div className="text-sm text-muted-foreground" data-testid="text-shopper-count">
                Found <span className="font-semibold text-foreground">{data.count}</span> race{data.count === 1 ? "" : "s"} that match — categorized below.
              </div>

              {sections.map(section => {
                const Icon = section.icon;
                const isOverall = section.key === "overall";
                return (
                  <section key={section.key} data-testid={`section-${section.key}`}>
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          {section.title}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">{section.blurb}</p>
                      </div>
                      <Badge variant="outline">{section.races.length}</Badge>
                    </div>
                    {isOverall ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {section.races.map(r => (
                          <div key={r.id} className="space-y-2" data-testid={`overall-pick-${r.id}`}>
                            <RaceCard race={r} />
                            <div className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 rounded px-2 py-1.5 inline-flex items-start gap-1.5 w-full" data-testid={`overall-reason-${r.id}`}>
                              <Lightbulb className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                              <span>{pickRationale(r, goal)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {section.races.map(r => <PickCard key={r.id} race={r} goal={goal} />)}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
