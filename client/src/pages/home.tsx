import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RaceCard } from "@/components/race-card";
import { RouteCard } from "@/components/route-card";
import { ToolsCTA } from "@/components/tools-cta";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Sparkles, CalendarRange, Scale, AlarmClock, Trophy, Heart, Smile, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiGetRaces, apiGetRoutes, apiGetStates } from "@/lib/api";
import heroImage from "@/assets/images/hero-races.jpg";

const SHOPPER_GOALS = [
  { slug: "beginner", label: "Beginner-friendly", icon: Smile, blurb: "Flat, gentle, welcoming first races." },
  { slug: "pr", label: "Built for a PR", icon: Trophy, blurb: "Fast, flat courses and ideal weather windows." },
  { slug: "value", label: "Best value", icon: DollarSign, blurb: "Great races without the premium price tag." },
  { slug: "vibe", label: "Big-vibe events", icon: Sparkles, blurb: "Crowds, music, costumes, and a party feel." },
  { slug: "family", label: "Family & kids", icon: Heart, blurb: "Strollers, kids races, walker-friendly." },
];

export default function Home() {
  const { data: races, isLoading: racesLoading } = useQuery({ queryKey: ["/api/races", { limit: 4 }], queryFn: () => apiGetRaces({ limit: 4 }) });
  const { data: routes, isLoading: routesLoading } = useQuery({ queryKey: ["/api/routes", { limit: 4 }], queryFn: () => apiGetRoutes({ limit: 4 }) });
  const { data: allStates, isLoading: statesLoading } = useQuery({ queryKey: ["/api/states"], queryFn: apiGetStates });
  const { data: weekendRaces, isLoading: weekendLoading } = useQuery({
    queryKey: ["/api/races/this-weekend"],
    queryFn: async () => {
      const r = await fetch("/api/races/this-weekend");
      if (!r.ok) throw new Error("Failed");
      return (await r.json()) as any[];
    },
  });
  const { data: priceSoon, isLoading: priceSoonLoading } = useQuery({
    queryKey: ["/api/races/price-increase-soon", { days: 21, limit: 4 }],
    queryFn: async () => {
      const r = await fetch("/api/races/price-increase-soon?days=21&limit=4");
      if (!r.ok) throw new Error("Failed");
      return (await r.json()) as any[];
    },
  });

  const topStates = allStates?.sort((a, b) => b.raceCount - a.raceCount).slice(0, 6) ?? [];

  return (
    <Layout>
      <Hero
        title="Find the right race, not just the next race."
        subtitle="A decision engine for runners. Compare races by goal, weather, vibe, price, and difficulty — backed by real data, not hype."
        image={heroImage}
        showSearch={false}
        size="default"
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-semibold" asChild data-testid="button-hero-shopper">
            <Link href="/race-shopper">
              <Sparkles className="mr-2 h-4 w-4" />
              Open Race Shopper
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild data-testid="button-hero-this-weekend">
            <Link href="/this-weekend">
              <CalendarRange className="mr-2 h-4 w-4" />
              Races This Weekend
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild data-testid="button-hero-compare">
            <Link href="/compare">
              <Scale className="mr-2 h-4 w-4" />
              Compare Races
            </Link>
          </Button>
        </div>
      </Hero>

      <section className="py-16 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-heading font-bold mb-2" data-testid="text-shop-by-goal">Shop races by what you actually want</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Pick a goal. We rank every upcoming race for it — from your first 5K to a Boston-qualifying marathon.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {SHOPPER_GOALS.map(g => {
              const Icon = g.icon;
              return (
                <Link key={g.slug} href={`/race-shopper/${g.slug}`} data-testid={`link-shopper-${g.slug}`}>
                  <Card className="h-full hover:border-primary/50 transition-colors">
                    <CardContent className="p-5">
                      <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="font-heading font-bold mb-1">{g.label}</div>
                      <div className="text-sm text-muted-foreground">{g.blurb}</div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-2" data-testid="text-upcoming-races">Upcoming Major Races</h2>
              <p className="text-muted-foreground">Premier events happening across the country.</p>
            </div>
            <Button variant="ghost" asChild data-testid="link-all-races">
              <Link href="/races">View all races <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          
          {racesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {races?.map(race => (
                <RaceCard key={race.id} race={race} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-2" data-testid="text-popular-routes">Popular Routes</h2>
              <p className="text-muted-foreground">Top-rated running paths and trails near you.</p>
            </div>
            <Button variant="ghost" asChild data-testid="link-all-routes">
              <Link href="/routes">View all routes <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          
          {routesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {routes?.map(route => (
                <RouteCard key={route.id} route={route} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <ToolsCTA />
        </div>
      </section>

      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-2" data-testid="text-this-weekend">
                <CalendarRange className="inline-block mr-2 h-7 w-7" />Races This Weekend
              </h2>
              <p className="text-muted-foreground">Last-minute picks for the next 72 hours.</p>
            </div>
            <Button variant="ghost" asChild data-testid="link-all-this-weekend">
              <Link href="/this-weekend">See all <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          {weekendLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
            </div>
          ) : weekendRaces && weekendRaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {weekendRaces.slice(0, 4).map((race: any) => (
                <RaceCard key={race.id} race={race} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-no-weekend-races">
                No races in our directory this weekend yet — check back as our calendar grows.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-2" data-testid="text-price-watch">
                <AlarmClock className="inline-block mr-2 h-7 w-7" />Register before the price goes up
              </h2>
              <p className="text-muted-foreground">Races whose entry fee is about to increase in the next few weeks.</p>
            </div>
            <Button variant="ghost" asChild data-testid="link-all-price-watch">
              <Link href="/price-watch">All deadlines <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          {priceSoonLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
            </div>
          ) : priceSoon && priceSoon.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {priceSoon.map((race: any) => (
                <RaceCard key={race.id} race={race} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-no-price-soon">
                Nothing about to spike in price right now. We'll surface deadlines here as soon as we see them.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="py-20 bg-background border-t">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-heading font-bold mb-8 text-center" data-testid="text-browse-state">Browse by State</h2>
          {statesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
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
          <div className="mt-8 text-center flex justify-center gap-4">
             <Button variant="outline" asChild>
                <Link href="/races/usa" data-testid="link-all-50-states">All 50 States Directory</Link>
             </Button>
             <Button variant="outline" asChild>
                <Link href="/collections" data-testid="link-collections-home">Race Collections</Link>
             </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
