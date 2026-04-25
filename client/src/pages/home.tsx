import { Layout } from "@/components/layout";
import { HomeHero } from "@/components/home-hero";
import { RaceCard } from "@/components/race-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CalendarRange, Sparkles, Trophy, DollarSign, Smile, Building2, MapPin } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiGetStates } from "@/lib/api";
import type { Race } from "@shared/schema";

const POPULAR_METROS: { name: string; href: string }[] = [
  { name: "New York City", href: "/state/new-york/city/new-york" },
  { name: "Los Angeles", href: "/state/california/city/los-angeles" },
  { name: "Chicago", href: "/state/illinois/city/chicago" },
  { name: "Boston", href: "/state/massachusetts/city/boston" },
  { name: "San Francisco", href: "/state/california/city/san-francisco" },
  { name: "Austin", href: "/state/texas/city/austin" },
  { name: "Denver", href: "/state/colorado/city/denver" },
  { name: "Seattle", href: "/state/washington/city/seattle" },
  { name: "Portland", href: "/state/oregon/city/portland" },
  { name: "Miami", href: "/state/florida/city/miami" },
  { name: "Phoenix", href: "/state/arizona/city/phoenix" },
  { name: "San Diego", href: "/state/california/city/san-diego" },
];

async function fetchRacesJson(url: string): Promise<Race[]> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed to load races");
  return r.json() as Promise<Race[]>;
}

export default function Home() {
  const { data: weekendRaces, isLoading: weekendLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/this-weekend"],
    queryFn: () => fetchRacesJson("/api/races/this-weekend"),
  });

  const { data: bestValue5K, isLoading: bestValueLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", { distance: "5K", sort: "value", limit: 4 }],
    queryFn: () => fetchRacesJson("/api/races/search?distance=5K&sort=value&limit=4"),
  });

  const { data: beginnerHalfs, isLoading: beginnerLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", { distance: "Half Marathon", sort: "beginner", limit: 4 }],
    queryFn: () => fetchRacesJson("/api/races/search?distance=Half+Marathon&sort=beginner&limit=4"),
  });

  const { data: turkeyTrots, isLoading: turkeyLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", { isTurkeyTrot: true, limit: 3 }],
    queryFn: () => fetchRacesJson("/api/races/search?isTurkeyTrot=true&limit=3"),
  });

  const { data: allStates, isLoading: statesLoading } = useQuery({
    queryKey: ["/api/states"],
    queryFn: apiGetStates,
  });

  const topStates = allStates?.slice().sort((a, b) => b.raceCount - a.raceCount).slice(0, 6) ?? [];

  return (
    <Layout>
      <HomeHero />

      {/* This weekend digest */}
      <section className="py-16 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-2" data-testid="text-this-weekend">
                <CalendarRange className="inline-block mr-2 h-7 w-7" />Races this weekend
              </h2>
              <p className="text-muted-foreground">Last-minute picks for the next 72 hours.</p>
            </div>
            <Button variant="ghost" asChild data-testid="link-all-this-weekend">
              <Link href="/this-weekend">See all <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          {weekendLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-80 rounded-lg" />)}
            </div>
          ) : weekendRaces && weekendRaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {weekendRaces.slice(0, 4).map(race => <RaceCard key={race.id} race={race} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-no-weekend-races">
                No races in our directory this weekend yet — try the full <Link href="/races" className="text-primary hover:underline">race calendar</Link>.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Best value 5Ks */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-2" data-testid="text-best-value-heading">
                <DollarSign className="inline-block mr-2 h-7 w-7" />Best value 5Ks
              </h2>
              <p className="text-muted-foreground">Great races without the premium price tag.</p>
            </div>
            <Button variant="ghost" asChild data-testid="link-all-value">
              <Link href="/race-shopper/value">More value picks <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          {bestValueLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-80 rounded-lg" />)}
            </div>
          ) : bestValue5K && bestValue5K.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestValue5K.slice(0, 4).map(race => <RaceCard key={race.id} race={race} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-no-value-races">
                Adding more 5Ks soon — meanwhile <Link href="/races?distance=5K" className="text-primary hover:underline">browse all 5Ks</Link>.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Beginner-friendly halves */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-2" data-testid="text-beginner-heading">
                <Smile className="inline-block mr-2 h-7 w-7" />Beginner-friendly half marathons
              </h2>
              <p className="text-muted-foreground">Flat, gentle, welcoming half marathons for your first 13.1.</p>
            </div>
            <Button variant="ghost" asChild data-testid="link-all-beginner">
              <Link href="/race-shopper/beginner">More first-timer picks <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          {beginnerLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-80 rounded-lg" />)}
            </div>
          ) : beginnerHalfs && beginnerHalfs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {beginnerHalfs.slice(0, 4).map(race => <RaceCard key={race.id} race={race} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-no-beginner-races">
                Adding more half marathons soon — <Link href="/races?distance=Half+Marathon" className="text-primary hover:underline">browse every half</Link>.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Popular metros */}
      <section className="py-16 bg-background border-t">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-heading font-bold mb-2" data-testid="text-popular-metros-heading">
              <Building2 className="inline-block mr-2 h-7 w-7" />Popular metros
            </h2>
            <p className="text-muted-foreground">Race calendars for the biggest running cities.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
            {POPULAR_METROS.map(m => (
              <Link
                key={m.name}
                href={m.href}
                className="block p-3 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center text-sm font-medium"
                data-testid={`link-metro-${m.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {m.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Turkey Trot teaser */}
      {turkeyTrots && turkeyTrots.length > 0 && (
        <section className="py-16 bg-amber-50/50 dark:bg-amber-900/10 border-y border-amber-200/50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-heading font-bold mb-2" data-testid="text-turkey-trot-heading">
                  🦃 Turkey Trot watch
                </h2>
                <p className="text-muted-foreground">The biggest running day of the year. Lock in early.</p>
              </div>
              <Button variant="ghost" asChild data-testid="link-all-turkey-trots">
                <Link href="/races?turkeyTrot=true">All Turkey Trots <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            {turkeyLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-80 rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {turkeyTrots.slice(0, 3).map(race => <RaceCard key={race.id} race={race} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Race Shopper invite */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-primary/5 border border-primary/20 rounded-2xl p-8 md:p-12 text-center">
            <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-heading font-bold mb-3" data-testid="text-shop-by-goal">Not sure what you want?</h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Open the Race Shopper. Tell us what matters — a PR, your first 5K, a fun weekend with friends, the cheapest option — and we'll rank every upcoming race for it.
            </p>
            <Button asChild size="lg" data-testid="button-open-shopper">
              <Link href="/race-shopper"><Trophy className="mr-2 h-4 w-4" /> Open Race Shopper</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* For organizers */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-background border rounded-2xl p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-3" data-testid="text-organizers-callout-heading">Run a race?</h2>
              <p className="text-muted-foreground mb-4">
                Claim your race listing, keep details accurate, and reach runners who are searching by distance, vibe, and goal — not just date.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-6">
                <li>· Free claim — verify and you own the listing</li>
                <li>· Update pricing, dates, and registration links anytime</li>
                <li>· See real interest data on your race page</li>
              </ul>
              <Button asChild data-testid="button-organizer-cta">
                <Link href="/organizers"><Building2 className="mr-2 h-4 w-4" /> Claim your race</Link>
              </Button>
            </div>
            <div className="hidden md:block bg-primary/5 border border-primary/10 rounded-xl p-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Why claim?</p>
              <p className="mb-2">Runners decide based on data. If your race page is missing prices, deadlines, terrain, and stroller policy, you're losing registrations.</p>
              <p>Claiming takes about 60 seconds and your listing is live the same day.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by state */}
      <section className="py-16 bg-background border-t">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-heading font-bold mb-8 text-center" data-testid="text-browse-state">
            <MapPin className="inline-block mr-2 h-7 w-7" />Browse by state
          </h2>
          {statesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {topStates.map(state => (
                <Link key={state.slug} href={`/state/${state.slug}`} className="group block p-4 bg-muted/30 hover:bg-primary/5 border hover:border-primary/30 rounded-lg transition-colors text-center" data-testid={`link-state-${state.slug}`}>
                  <div className="font-heading font-bold text-lg mb-1">{state.name}</div>
                  <div className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    {state.raceCount} races
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link href="/races/usa" data-testid="link-all-50-states">All 50 states</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
