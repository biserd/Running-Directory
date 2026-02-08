import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RaceCard } from "@/components/race-card";
import { RouteCard } from "@/components/route-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiGetState, apiGetRaces, apiGetRoutes, apiGetCitiesByState } from "@/lib/api";
import heroImage from "@/assets/images/hero-races.jpg";
import { MapPin, ArrowRight, Navigation } from "lucide-react";

export default function StateHub() {
  const params = useParams();
  const stateSlug = params.state;

  const { data: stateData } = useQuery({
    queryKey: ["/api/states", stateSlug],
    queryFn: () => apiGetState(stateSlug!),
    enabled: !!stateSlug,
  });

  const { data: races, isLoading: racesLoading } = useQuery({
    queryKey: ["/api/races", { state: stateData?.abbreviation, limit: 6 }],
    queryFn: () => apiGetRaces({ state: stateData?.abbreviation, limit: 6 }),
    enabled: !!stateData?.abbreviation,
  });

  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ["/api/routes", { state: stateData?.abbreviation, limit: 6 }],
    queryFn: () => apiGetRoutes({ state: stateData?.abbreviation, limit: 6 }),
    enabled: !!stateData?.abbreviation,
  });

  const { data: cities } = useQuery({
    queryKey: ["/api/states", stateSlug, "cities"],
    queryFn: () => apiGetCitiesByState(stateSlug!),
    enabled: !!stateSlug,
  });

  const stateName = stateData?.name || stateSlug?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";

  return (
    <Layout>
      <Hero
        title={`${stateName} Running Hub`}
        subtitle={`Races, routes, and running resources in ${stateName}.`}
        image={heroImage}
        showSearch={false}
        size="sm"
      />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: stateName }]} />

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-bar">
          <div className="p-4 border rounded-lg text-center bg-muted/10">
            <div className="text-2xl font-bold text-primary" data-testid="stat-race-count">{stateData?.raceCount ?? "—"}</div>
            <div className="text-sm text-muted-foreground">Races</div>
          </div>
          <div className="p-4 border rounded-lg text-center bg-muted/10">
            <div className="text-2xl font-bold text-primary" data-testid="stat-route-count">{stateData?.routeCount ?? "—"}</div>
            <div className="text-sm text-muted-foreground">Routes</div>
          </div>
        </div>

        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading font-bold text-2xl" data-testid="text-races-title">Races in {stateName}</h2>
            <Button variant="link" asChild>
              <Link href={`/races/state/${stateSlug}`} data-testid="link-view-all-races">
                View all {stateName} races <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          {racesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
            </div>
          ) : races && races.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {races.map(race => (
                <RaceCard key={race.id} race={race} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <p className="text-muted-foreground" data-testid="text-no-races">No races listed in {stateName} yet.</p>
            </div>
          )}
        </div>

        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading font-bold text-2xl" data-testid="text-routes-title">Routes in {stateName}</h2>
            <Button variant="link" asChild>
              <Link href={`/routes/state/${stateSlug}`} data-testid="link-view-all-routes">
                View all {stateName} routes <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          {routesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
            </div>
          ) : routes && routes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {routes.map(route => (
                <RouteCard key={route.id} route={route} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <p className="text-muted-foreground" data-testid="text-no-routes">No routes listed in {stateName} yet.</p>
            </div>
          )}
        </div>

        {stateData?.popularCities && stateData.popularCities.length > 0 && (
          <div className="mt-12">
            <h2 className="font-heading font-bold text-2xl mb-6" data-testid="text-cities-title">Popular Cities in {stateName}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stateData.popularCities.map((city) => {
                const citySlug = city.toLowerCase().replace(/\s+/g, "-");
                return (
                  <Link
                    key={city}
                    href={`/state/${stateSlug}/city/${citySlug}`}
                    className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                    data-testid={`link-city-${citySlug}`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-semibold text-sm group-hover:text-primary transition-colors">{city}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {cities && cities.length > 0 && (!stateData?.popularCities || stateData.popularCities.length === 0) && (
          <div className="mt-12">
            <h2 className="font-heading font-bold text-2xl mb-6" data-testid="text-cities-title">Cities in {stateName}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cities.map((city) => {
                const citySlug = city.slug || city.name.toLowerCase().replace(/\s+/g, "-");
                return (
                  <Link
                    key={city.id}
                    href={`/state/${stateSlug}/city/${citySlug}`}
                    className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                    data-testid={`link-city-${citySlug}`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-semibold text-sm group-hover:text-primary transition-colors">{city.name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-12 p-8 bg-muted/30 rounded-xl border">
          <h3 className="font-heading font-bold text-xl mb-4" data-testid="text-explore-more-title">Explore More</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/influencers" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center" data-testid="link-explore-influencers">
              <div className="font-bold text-sm">Running Influencers</div>
              <p className="text-xs text-muted-foreground mt-1">Follow top runners</p>
            </Link>
            <Link href="/podcasts" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center" data-testid="link-explore-podcasts">
              <div className="font-bold text-sm">Running Podcasts</div>
              <p className="text-xs text-muted-foreground mt-1">Listen and learn</p>
            </Link>
            <Link href="/books" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center" data-testid="link-explore-books">
              <div className="font-bold text-sm">Running Books</div>
              <p className="text-xs text-muted-foreground mt-1">Top reads for runners</p>
            </Link>
            <Link href="/collections" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center" data-testid="link-explore-collections">
              <div className="font-bold text-sm">Collections</div>
              <p className="text-xs text-muted-foreground mt-1">Curated race lists</p>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
