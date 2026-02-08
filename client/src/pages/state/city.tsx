import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RaceCard } from "@/components/race-card";
import { RouteCard } from "@/components/route-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiGetState, apiGetCity, apiGetRaces, apiGetRoutes } from "@/lib/api";
import heroImage from "@/assets/images/hero-races.jpg";
import { MapPin, ArrowRight } from "lucide-react";

export default function CityHub() {
  const params = useParams();
  const stateSlug = params.state;
  const citySlug = params.city;

  const { data: stateData } = useQuery({
    queryKey: ["/api/states", stateSlug],
    queryFn: () => apiGetState(stateSlug!),
    enabled: !!stateSlug,
  });

  const { data: cityData } = useQuery({
    queryKey: ["/api/cities", stateSlug, citySlug],
    queryFn: () => apiGetCity(stateSlug!, citySlug!),
    enabled: !!stateSlug && !!citySlug,
  });

  const { data: races, isLoading: racesLoading } = useQuery({
    queryKey: ["/api/races", { city: cityData?.name, state: stateData?.abbreviation }],
    queryFn: () => apiGetRaces({ city: cityData?.name, state: stateData?.abbreviation }),
    enabled: !!cityData?.name && !!stateData?.abbreviation,
  });

  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ["/api/routes", { city: cityData?.name, state: stateData?.abbreviation }],
    queryFn: () => apiGetRoutes({ city: cityData?.name, state: stateData?.abbreviation }),
    enabled: !!cityData?.name && !!stateData?.abbreviation,
  });

  const cityName = cityData?.name || citySlug?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";
  const stateName = stateData?.name || stateSlug?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";

  return (
    <Layout>
      <Hero
        title={`${cityName}, ${stateName}`}
        subtitle={`Races, routes, and running resources in ${cityName}.`}
        image={heroImage}
        showSearch={false}
        size="sm"
      />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { label: stateName, href: `/state/${stateSlug}` },
          { label: cityName },
        ]} />

        <section className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading font-bold text-2xl flex items-center gap-2" data-testid="text-races-heading">
              <MapPin className="h-5 w-5 text-primary" />
              Races in {cityName}
            </h2>
            <Link href={`/races/state/${stateSlug}/city/${citySlug}`}>
              <Button variant="ghost" size="sm" data-testid="link-view-all-races">
                View all {cityName} races <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
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
              <p className="text-muted-foreground" data-testid="text-no-races">No races currently listed in {cityName}.</p>
            </div>
          )}
        </section>

        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading font-bold text-2xl flex items-center gap-2" data-testid="text-routes-heading">
              <MapPin className="h-5 w-5 text-primary" />
              Routes in {cityName}
            </h2>
            <Link href={`/routes/state/${stateSlug}/city/${citySlug}`}>
              <Button variant="ghost" size="sm" data-testid="link-view-all-routes">
                View all {cityName} routes <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
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
              <p className="text-muted-foreground" data-testid="text-no-routes">No routes listed in {cityName} yet.</p>
            </div>
          )}
        </section>

        <section className="mt-12 p-6 border rounded-lg bg-muted/5">
          <h2 className="font-heading font-bold text-xl mb-4" data-testid="text-also-in-state">Also in {stateName}</h2>
          <div className="flex flex-wrap gap-3">
            <Link href={`/state/${stateSlug}`}>
              <Button variant="outline" size="sm" data-testid="link-state-hub">
                {stateName} Hub <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href={`/races/state/${stateSlug}`}>
              <Button variant="outline" size="sm" data-testid="link-state-races">
                {stateName} Races <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href={`/routes/state/${stateSlug}`}>
              <Button variant="outline" size="sm" data-testid="link-state-routes">
                {stateName} Routes <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-12 mb-4 p-6 border rounded-lg bg-muted/5">
          <h2 className="font-heading font-bold text-xl mb-4" data-testid="text-explore-more">Explore More</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/influencers">
              <Button variant="outline" size="sm" data-testid="link-explore-influencers">
                Influencers <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/podcasts">
              <Button variant="outline" size="sm" data-testid="link-explore-podcasts">
                Podcasts <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/books">
              <Button variant="outline" size="sm" data-testid="link-explore-books">
                Books <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/collections">
              <Button variant="outline" size="sm" data-testid="link-explore-collections">
                Collections <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
