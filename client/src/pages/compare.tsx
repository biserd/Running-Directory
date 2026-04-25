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
import { useCompareCart } from "@/hooks/use-compare-cart";
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

// Centralised field definitions so the desktop table and the mobile stacked
// cards stay in sync. Each row describes its label, its renderer, and the
// (optional) "best in row" highlighter.
type FieldRow = {
  label: string;
  testId?: (raceId: number) => string;
  highlight?: { key: keyof Race; better: "lower" | "higher" };
  render: (race: Race) => React.ReactNode;
};
type FieldGroup = { heading?: string; rows: FieldRow[] };

function buildFieldGroups(): FieldGroup[] {
  return [
    {
      rows: [
        { label: "Distance", render: r => <span className="uppercase tracking-wide text-xs font-semibold">{r.distance}</span> },
        { label: "Date", render: r => format(parseRaceDate(r.date), "EEE, MMM d, yyyy") },
        { label: "Start time", render: r => r.startTime || "TBA" },
        { label: "Location", render: r => `${r.city}, ${r.state}` },
        {
          label: "Travel time",
          render: () => (
            <span className="text-xs text-muted-foreground italic">Add a starting ZIP on the race page for an estimate.</span>
          ),
        },
        { label: "Course type", render: r => r.courseType || "Not stated" },
        { label: "Surface", render: r => r.terrain || r.surface || "—" },
        {
          label: "Race-day weather",
          testId: id => `compare-weather-link-${id}`,
          render: r => (
            <Link href={`/races/${r.slug}#weather`} className="text-primary hover:underline" data-testid={`compare-weather-link-${r.id}`}>
              See forecast & averages
            </Link>
          ),
        },
        {
          label: "Weather (typical)",
          render: r => (
            <span className="text-xs text-muted-foreground">
              Avg for {format(parseRaceDate(r.date), "MMMM")} in {r.state} — see race page.
            </span>
          ),
        },
        {
          label: "Elevation",
          highlight: { key: "elevationGainM", better: "lower" },
          render: r => (r.elevationGainM != null ? `${r.elevationGainM}m gain` : r.elevation || "—"),
        },
        {
          label: "Entry fee",
          highlight: { key: "priceMin", better: "lower" },
          render: r => fmtPrice(r.priceMin, r.priceMax),
        },
        {
          label: "Field size",
          highlight: { key: "fieldSize", better: "higher" },
          render: r => (r.fieldSize ? r.fieldSize.toLocaleString() + " runners" : "—"),
        },
        {
          label: "Registration closes",
          render: r => (r.registrationDeadline ? format(parseRaceDate(r.registrationDeadline), "MMM d, yyyy") : "—"),
        },
        {
          label: "Next price hike",
          render: r => r.nextPriceIncreaseAt ? (
            <span className="text-amber-700 inline-flex items-center gap-1">
              <AlarmClock className="h-3.5 w-3.5" />
              {format(parseRaceDate(r.nextPriceIncreaseAt), "MMM d")}
              {r.nextPriceIncreaseAmount ? ` (+$${r.nextPriceIncreaseAmount})` : ""}
            </span>
          ) : "—",
        },
        { label: "Boston qualifier", render: r => r.bostonQualifier ? "Yes" : "No" },
        {
          label: "Walker / stroller",
          render: r => [r.walkerFriendly && "Walkers", r.strollerFriendly && "Strollers", r.dogFriendly && "Dogs", r.kidsRace && "Kids race"].filter(Boolean).join(" · ") || "—",
        },
        { label: "Refund policy", render: r => <span className="text-xs leading-snug">{r.refundPolicy || "Not stated"}</span> },
        { label: "Deferral policy", render: r => <span className="text-xs leading-snug">{r.deferralPolicy || "Not stated"}</span> },
        {
          label: "Reviews",
          testId: id => `compare-reviews-link-${id}`,
          render: r => (
            <Link href={`/races/${r.slug}#reviews`} className="text-primary hover:underline" data-testid={`compare-reviews-link-${r.id}`}>
              Read runner reviews
            </Link>
          ),
        },
      ],
    },
    {
      heading: "Decision scores (0–100)",
      rows: [
        { label: "Beginner", highlight: { key: "beginnerScore", better: "higher" }, render: r => r.beginnerScore ?? "—" },
        { label: "PR potential", highlight: { key: "prScore", better: "higher" }, render: r => r.prScore ?? "—" },
        { label: "Value", highlight: { key: "valueScore", better: "higher" }, render: r => r.valueScore ?? "—" },
        { label: "Vibe", highlight: { key: "vibeScore", better: "higher" }, render: r => r.vibeScore ?? "—" },
        { label: "Family", highlight: { key: "familyScore", better: "higher" }, render: r => r.familyScore ?? "—" },
      ],
    },
    {
      heading: "Best fit",
      rows: [
        { label: "Race is great for", render: r => <BestForBadges race={r} testId={`compare-best-${r.id}`} /> },
      ],
    },
  ];
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

function RegisterCTAs({ race }: { race: Race }) {
  const url = race.registrationUrl || race.website;
  return (
    <div className="space-y-2">
      {url ? (
        <Button
          asChild
          className="w-full"
          data-testid={`compare-button-register-${race.id}`}
          onClick={() => apiTrackOutbound({ raceId: race.id, destination: race.registrationUrl ? "registration" : "website", targetUrl: url })}
        >
          <a href={url} target="_blank" rel="noopener noreferrer nofollow">
            Register <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </a>
        </Button>
      ) : (
        <Button asChild variant="outline" className="w-full" data-testid={`compare-button-details-${race.id}`}>
          <Link href={`/races/${race.slug}`}>View details</Link>
        </Button>
      )}
      <Button asChild variant="outline" className="w-full" data-testid={`compare-button-page-${race.id}`}>
        <Link href={`/races/${race.slug}`}>Race page <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
      </Button>
    </div>
  );
}

function DesktopCompareTable({ races, groups, onRemove }: { races: Race[]; groups: FieldGroup[]; onRemove: (id: number) => void }) {
  const cols = `repeat(${races.length}, minmax(0, 1fr))`;
  const colCount = races.length;

  return (
    <div className="hidden md:block overflow-x-auto" data-testid="compare-table-desktop">
      <div className="min-w-[640px]">
        <div className="grid gap-3 mb-4 items-stretch" style={{ gridTemplateColumns: `180px ${cols}` }}>
          <div />
          {races.map(r => (
            <RaceColumnHeader key={r.id} race={r} onRemove={() => onRemove(r.id)} />
          ))}
        </div>

        {groups.map((group, gi) => (
          <div key={gi}>
            {group.heading && (
              <div className="grid gap-3 items-center mt-6 mb-1" style={{ gridTemplateColumns: `180px ${cols}` }}>
                <div className="text-[11px] uppercase tracking-wider font-bold text-primary py-2">{group.heading}</div>
                {Array.from({ length: colCount }).map((_, i) => <div key={i} />)}
              </div>
            )}
            {group.rows.map(row => {
              const bestSet = row.highlight ? bestIdsFor(races, row.highlight.key, row.highlight.better) : new Set<number>();
              return (
                <div key={row.label} className="grid gap-3 items-center border-t" style={{ gridTemplateColumns: `180px ${cols}` }}>
                  <div className="text-xs font-semibold text-muted-foreground py-2 px-2">{row.label}</div>
                  {races.map(r => (
                    <CellHighlight key={r.id} best={bestSet.has(r.id)}>
                      {row.render(r)}
                    </CellHighlight>
                  ))}
                </div>
              );
            })}
          </div>
        ))}

        <div className="grid gap-3 mt-6 items-start" style={{ gridTemplateColumns: `180px ${cols}` }}>
          <div />
          {races.map(r => <RegisterCTAs key={r.id} race={r} />)}
        </div>
      </div>
    </div>
  );
}

function MobileCompareCards({ races, groups, onRemove }: { races: Race[]; groups: FieldGroup[]; onRemove: (id: number) => void }) {
  // Compute "best" sets once across all races so highlighting works the same
  // on mobile as on desktop.
  const bestSets = new Map<string, Set<number>>();
  groups.forEach(g => g.rows.forEach(row => {
    if (row.highlight) {
      bestSets.set(row.label, bestIdsFor(races, row.highlight.key, row.highlight.better));
    }
  }));

  return (
    <div className="md:hidden space-y-6" data-testid="compare-table-mobile">
      {races.map(race => (
        <div key={race.id} className="bg-card border rounded-2xl shadow-sm overflow-hidden" data-testid={`compare-mobile-card-${race.id}`}>
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Badge variant="secondary" className="text-[10px] uppercase">{race.distance}</Badge>
              <button
                type="button"
                onClick={() => onRemove(race.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remove ${race.name} from compare`}
                data-testid={`button-compare-mobile-remove-${race.id}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Link href={`/races/${race.slug}`} className="font-heading font-bold text-lg leading-tight hover:text-primary block" data-testid={`compare-mobile-link-${race.id}`}>
              {race.name}
            </Link>
            <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(parseRaceDate(race.date), "MMM d, yyyy")}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{race.city}, {race.state}</span>
            </div>
          </div>
          <div className="divide-y">
            {groups.map((group, gi) => (
              <div key={gi}>
                {group.heading && (
                  <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider font-bold text-primary">{group.heading}</div>
                )}
                {group.rows.map(row => {
                  const isBest = bestSets.get(row.label)?.has(race.id) ?? false;
                  return (
                    <div key={row.label} className={cn("px-4 py-2.5 grid grid-cols-2 gap-3 items-start text-sm", isBest && "bg-emerald-500/5")}>
                      <div className="text-xs font-semibold text-muted-foreground">{row.label}</div>
                      <div className={cn(isBest && "font-semibold text-emerald-700")}>{row.render(race)}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="p-4 border-t bg-muted/20">
            <RegisterCTAs race={race} />
          </div>
        </div>
      ))}
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

  const groups = buildFieldGroups();

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
              <DesktopCompareTable races={races} groups={groups} onRemove={handleRemove} />
              <MobileCompareCards races={races} groups={groups} onRemove={handleRemove} />
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
