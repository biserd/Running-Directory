import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RaceCard } from "@/components/race-card";
import { RouteCard } from "@/components/route-card";
import { ToolsCTA } from "@/components/tools-cta";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Calendar } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiGetRaces, apiGetRoutes, apiGetStates } from "@/lib/api";
import heroImage from "@/assets/images/hero-races.jpg";

export default function Home() {
  const { data: races, isLoading: racesLoading } = useQuery({ queryKey: ["/api/races", { limit: 4 }], queryFn: () => apiGetRaces({ limit: 4 }) });
  const { data: routes, isLoading: routesLoading } = useQuery({ queryKey: ["/api/routes", { limit: 4 }], queryFn: () => apiGetRoutes({ limit: 4 }) });
  const { data: allStates, isLoading: statesLoading } = useQuery({ queryKey: ["/api/states"], queryFn: apiGetStates });

  const topStates = allStates?.sort((a, b) => b.raceCount - a.raceCount).slice(0, 6) ?? [];

  return (
    <Layout>
      <Hero 
        title="Find your next race." 
        subtitle="The comprehensive USA race calendar and route directory. Data-driven tools to help you train smarter."
        image={heroImage}
        showSearch={true}
        size="default"
      >
        <div className="flex justify-center gap-4">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-semibold" asChild>
            <Link href="/races">
              <Calendar className="mr-2 h-4 w-4" />
              Race Calendar
            </Link>
          </Button>
        </div>
      </Hero>

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
                <Link key={state.slug} href={`/races/state/${state.slug}`} className="group block p-4 bg-muted/30 hover:bg-primary/5 border hover:border-primary/30 rounded-lg transition-colors text-center" data-testid={`link-state-${state.slug}`}>
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
                <Link href="/races">View Directory</Link>
             </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
