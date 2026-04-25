import { Layout } from "@/components/layout";
import { Link, useSearch, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, DollarSign, Users, Mountain, ExternalLink, Trophy, X, Scale, ArrowRight, AlarmClock } from "lucide-react";
import type { Race } from "@shared/schema";
import { apiCompareRaces, apiTrackOutbound } from "@/lib/api";
import { format } from "date-fns";
import { parseRaceDate } from "@/lib/dates";
import { getStateName } from "@/lib/states";
import { useCompareCart } from "@/hooks/use-compare-cart";
import { ScoreBlock } from "@/components/score-block";
import { BestForBadges } from "@/components/best-for-badges";
import { cn } from "@/lib/utils";

function parseIds(qs: string): number[] {
  const params = new URLSearchParams(qs);
  const raw = params.get("ids") || "";
  return raw
    .split(",")
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isFinite(n) && n > 0)
    .slice(0, 4);
}

function fmtPrice(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null && min !== max) return `$${min}–$${max}`;
  return `$${min ?? max}`;
}

const HIGHLIGHT_KEYS: Array<{ key: keyof Race; better: "lower" | "higher" }> = [
  { key: "priceMin", better: "lower" },
  { key: "elevationGainM", better: "lower" },
  { key: "fieldSize", better: "higher" },
  { key: "beginnerScore", better: "higher" },
  { key: "prScore", better: "higher" },
  { key: "valueScore", better: "higher" },
  { key: "vibeScore", better: "higher" },
  { key: "familyScore", better: "higher" },
  { key: "urgencyScore", better: "higher" },
];

function bestIdsFor(races: Race[], key: keyof Race, better: "lower" | "higher"): Set<number> {
  const vals = races.map(r => {
    const v = r[key];
    return typeof v === "number" ? v : null;
  });
  const filtered = vals.filter((v): v is number => v != null);
  if (filtered.length === 0) return new Set();
  const target = better === "higher" ? Math.max(...filtered) : Math.min(...filtered);
  const out = new Set<number>();
  races.forEach((r, i) => { if (vals[i] === target) out.add(r.id); });
  return out;
}

function CellHighlight({ best, children }: { best: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("py-2 px-2 rounded text-sm", best && "bg-emerald-500/10 ring-1 ring-emerald-500/30")}>
      {children}
    </div>
  );
}

function RaceColumnHeader({ race, onRemove }: { race: Race; onRemove: () => void }) {
  return (
    <div className="bg-card border rounded-xl p-4 h-full flex flex-col" data-testid={`compare-col-header-${race.id}`}>
      <div className="flex items-start justify-between gap-2">
        <Badge variant="secondary" className="text-[10px] uppercase">{race.distance}</Badge>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors"
          aria-label={`Remove ${race.name} from compare`}
          data-testid={`button-compare-remove-${race.id}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Link href={`/races/${race.slug}`} className="font-heading font-bold text-base leading-tight mt-2 line-clamp-2 hover:text-primary" data-testid={`compare-link-race-${race.id}`}>
        {race.name}
      </Link>
      <div className="text-xs text-muted-foreground mt-1.5 space-y-1">
        <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(parseRaceDate(race.date), "MMM d, yyyy")}</div>
        <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{race.city}, {race.state}</div>
      </div>
    </div>
  );
}

function CompareTable({ races, onRemove }: { races: Race[]; onRemove: (id: number) => void }) {
  const bestPrice = bestIdsFor(races, "priceMin", "lower");
  const bestElev = bestIdsFor(races, "elevationGainM", "lower");
  const bestField = bestIdsFor(races, "fieldSize", "higher");
  const bestBeginner = bestIdsFor(races, "beginnerScore", "higher");
  const bestPr = bestIdsFor(races, "prScore", "higher");
  const bestValue = bestIdsFor(races, "valueScore", "higher");
  const bestVibe = bestIdsFor(races, "vibeScore", "higher");
  const bestFamily = bestIdsFor(races, "familyScore", "higher");

  const cols = `repeat(${races.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-x-auto" data-testid="compare-table">
      <div className="min-w-[640px]">
        <div className="grid gap-3 mb-4 items-stretch" style={{ gridTemplateColumns: `180px ${cols}` }}>
          <div />
          {races.map(r => (
            <RaceColumnHeader key={r.id} race={r} onRemove={() => onRemove(r.id)} />
          ))}
        </div>

        <Section label="Date" cols={cols}>
          {races.map(r => <CellHighlight key={r.id} best={false}>{format(parseRaceDate(r.date), "EEE, MMM d, yyyy")}</CellHighlight>)}
        </Section>
        <Section label="Surface" cols={cols}>
          {races.map(r => <CellHighlight key={r.id} best={false}>{r.terrain || r.surface || "—"}</CellHighlight>)}
        </Section>
        <Section label="Elevation" cols={cols}>
          {races.map(r => (
            <CellHighlight key={r.id} best={bestElev.has(r.id)}>
              {r.elevationGainM != null ? `${r.elevationGainM}m gain` : r.elevation || "—"}
            </CellHighlight>
          ))}
        </Section>
        <Section label="Entry fee" cols={cols}>
          {races.map(r => (
            <CellHighlight key={r.id} best={bestPrice.has(r.id)}>
              {fmtPrice(r.priceMin, r.priceMax)}
            </CellHighlight>
          ))}
        </Section>
        <Section label="Field size" cols={cols}>
          {races.map(r => (
            <CellHighlight key={r.id} best={bestField.has(r.id)}>
              {r.fieldSize ? r.fieldSize.toLocaleString() + " runners" : "—"}
            </CellHighlight>
          ))}
        </Section>
        <Section label="Registration closes" cols={cols}>
          {races.map(r => (
            <CellHighlight key={r.id} best={false}>
              {r.registrationDeadline ? format(parseRaceDate(r.registrationDeadline), "MMM d, yyyy") : "—"}
            </CellHighlight>
          ))}
        </Section>
        <Section label="Next price hike" cols={cols}>
          {races.map(r => (
            <CellHighlight key={r.id} best={false}>
              {r.nextPriceIncreaseAt ? (
                <span className="text-amber-700 inline-flex items-center gap-1"><AlarmClock className="h-3.5 w-3.5" />{format(parseRaceDate(r.nextPriceIncreaseAt), "MMM d")}{r.nextPriceIncreaseAmount ? ` (+$${r.nextPriceIncreaseAmount})` : ""}</span>
              ) : "—"}
            </CellHighlight>
          ))}
        </Section>
        <Section label="Boston qualifier" cols={cols}>
          {races.map(r => <CellHighlight key={r.id} best={false}>{r.bostonQualifier ? "Yes" : "No"}</CellHighlight>)}
        </Section>
        <Section label="Walker / stroller" cols={cols}>
          {races.map(r => (
            <CellHighlight key={r.id} best={false}>
              {[r.walkerFriendly && "Walkers", r.strollerFriendly && "Strollers", r.dogFriendly && "Dogs", r.kidsRace && "Kids race"].filter(Boolean).join(" · ") || "—"}
            </CellHighlight>
          ))}
        </Section>

        <SectionHeader label="Decision scores (0–100)" cols={cols} />
        <Section label="Beginner" cols={cols}>
          {races.map(r => <CellHighlight key={r.id} best={bestBeginner.has(r.id)}>{r.beginnerScore ?? "—"}</CellHighlight>)}
        </Section>
        <Section label="PR potential" cols={cols}>
          {races.map(r => <CellHighlight key={r.id} best={bestPr.has(r.id)}>{r.prScore ?? "—"}</CellHighlight>)}
        </Section>
        <Section label="Value" cols={cols}>
          {races.map(r => <CellHighlight key={r.id} best={bestValue.has(r.id)}>{r.valueScore ?? "—"}</CellHighlight>)}
        </Section>
        <Section label="Vibe" cols={cols}>
          {races.map(r => <CellHighlight key={r.id} best={bestVibe.has(r.id)}>{r.vibeScore ?? "—"}</CellHighlight>)}
        </Section>
        <Section label="Family" cols={cols}>
          {races.map(r => <CellHighlight key={r.id} best={bestFamily.has(r.id)}>{r.familyScore ?? "—"}</CellHighlight>)}
        </Section>

        <SectionHeader label="Best fit" cols={cols} />
        <div className="grid gap-3 items-start mb-2" style={{ gridTemplateColumns: `180px ${cols}` }}>
          <div className="text-xs font-semibold text-muted-foreground py-2">Race is great for</div>
          {races.map(r => (
            <div key={r.id} className="py-2 px-2">
              <BestForBadges race={r} testId={`compare-best-${r.id}`} />
            </div>
          ))}
        </div>

        <div className="grid gap-3 mt-6 items-start" style={{ gridTemplateColumns: `180px ${cols}` }}>
          <div />
          {races.map(r => {
            const url = r.registrationUrl || r.website;
            return (
              <div key={r.id} className="space-y-2">
                {url ? (
                  <Button
                    asChild
                    className="w-full"
                    data-testid={`compare-button-register-${r.id}`}
                    onClick={() => apiTrackOutbound({ raceId: r.id, destination: r.registrationUrl ? "registration" : "website", targetUrl: url })}
                  >
                    <a href={url} target="_blank" rel="noopener noreferrer nofollow">
                      Register <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="w-full" data-testid={`compare-button-details-${r.id}`}>
                    <Link href={`/races/${r.slug}`}>View details</Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="w-full" data-testid={`compare-button-page-${r.id}`}>
                  <Link href={`/races/${r.slug}`}>Race page <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Section({ label, cols, children }: { label: string; cols: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 items-center border-t" style={{ gridTemplateColumns: `180px ${cols}` }}>
      <div className="text-xs font-semibold text-muted-foreground py-2 px-2">{label}</div>
      {children}
    </div>
  );
}

function SectionHeader({ label, cols }: { label: string; cols: string }) {
  return (
    <div className="grid gap-3 items-center mt-6 mb-1" style={{ gridTemplateColumns: `180px ${cols}` }}>
      <div className="text-[11px] uppercase tracking-wider font-bold text-primary py-2">{label}</div>
      {Array.from({ length: cols.match(/repeat\((\d+)/)?.[1] ? parseInt(cols.match(/repeat\((\d+)/)![1]) : 0 }).map((_, i) => <div key={i} />)}
    </div>
  );
}

export default function ComparePage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const ids = parseIds(search);
  const { remove: removeFromCart, clear } = useCompareCart();

  const { data: races, isLoading, error } = useQuery({
    queryKey: ["/api/races/compare", ids.join(",")],
    queryFn: () => apiCompareRaces(ids),
    enabled: ids.length >= 2,
  });

  const handleRemove = (id: number) => {
    removeFromCart(id);
    const next = ids.filter(x => x !== id);
    if (next.length === 0) {
      setLocation("/compare");
    } else {
      setLocation(`/compare?ids=${next.join(",")}`);
    }
  };

  const handleClear = () => {
    clear();
    setLocation("/races");
  };

  return (
    <Layout>
      <section className="py-10 md:py-14 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
              <Scale className="h-4 w-4" />
              Compare
            </div>
            <h1 className="text-3xl md:text-5xl font-heading font-bold mb-3" data-testid="text-compare-title">
              Side-by-side race comparison
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl" data-testid="text-compare-description">
              Stack 2–4 races against each other on entry fee, elevation, weather, vibe, value, and PR potential. Best value in each row is highlighted.
            </p>
          </div>

          {ids.length < 2 ? (
            <Card>
              <CardContent className="p-10 text-center" data-testid="card-compare-empty">
                <Trophy className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
                <h2 className="font-heading font-semibold text-xl mb-2">Add at least 2 races to compare</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Browse the calendar and click the compare icon on any race card. You can stack up to 4 races at once.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild data-testid="button-browse-races">
                    <Link href="/races"><Calendar className="mr-2 h-4 w-4" /> Browse races</Link>
                  </Button>
                  <Button asChild variant="outline" data-testid="button-shopper">
                    <Link href="/race-shopper">Try the Race Shopper</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground" data-testid="text-compare-loading">Loading races…</CardContent></Card>
          ) : error || !races ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground" data-testid="text-compare-error">We couldn't load those races. Please try again.</CardContent></Card>
          ) : races.length < 2 ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground" data-testid="text-compare-not-found">Some of those races aren't in our database. Try picking different ones.</CardContent></Card>
          ) : (
            <>
              <CompareTable races={races} onRemove={handleRemove} />
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Highlighted cells show the strongest option in that category. "—" means we don't have that data yet.</p>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" data-testid="button-add-more"><Link href="/races"><Calendar className="mr-2 h-4 w-4" /> Add more races</Link></Button>
                  <Button variant="outline" size="sm" onClick={handleClear} data-testid="button-clear-compare">Clear compare</Button>
                </div>
              </div>

              <div className="mt-10">
                <h2 className="font-heading font-bold text-xl mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                  How to read this
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-muted-foreground">
                  <div className="bg-card border rounded-lg p-4">
                    <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><Mountain className="h-4 w-4" />Elevation</div>
                    <p>Lower elevation gain usually means a faster, less leg-trashing race.</p>
                  </div>
                  <div className="bg-card border rounded-lg p-4">
                    <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><Users className="h-4 w-4" />Field size</div>
                    <p>Bigger fields mean stronger competition and more energy on course.</p>
                  </div>
                  <div className="bg-card border rounded-lg p-4">
                    <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><DollarSign className="h-4 w-4" />Entry fee</div>
                    <p>Lower fees win on value, but check field size and finisher gear before deciding.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
