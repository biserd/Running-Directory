import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RaceCard } from "@/components/race-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiGetRaces, apiGetState, apiGetCity } from "@/lib/api";
import heroImage from "@/assets/images/hero-races.jpg";

export default function RacesCityPage() {
  const params = useParams();
  const stateSlug = params.state;
  const citySlug = params.city;

  const { data: cityData } = useQuery({
    queryKey: ["/api/cities", stateSlug, citySlug],
    queryFn: () => apiGetCity(stateSlug!, citySlug!),
    enabled: !!stateSlug && !!citySlug,
  });

  const { data: stateData } = useQuery({
    queryKey: ["/api/states", stateSlug],
    queryFn: () => apiGetState(stateSlug!),
    enabled: !!stateSlug,
  });

  const { data: races, isLoading } = useQuery({
    queryKey: ["/api/races", { city: cityData?.name, state: stateData?.abbreviation }],
    queryFn: () => apiGetRaces({ city: cityData?.name, state: stateData?.abbreviation }),
    enabled: !!cityData?.name && !!stateData?.abbreviation,
  });

  const cityName = cityData?.name || citySlug?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";
  const stateName = stateData?.name || stateSlug?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";

  return (
    <Layout>
      <Hero
        title={`${cityName} Races`}
        subtitle={`Find running races in ${cityName}, ${stateName}.`}
        image={heroImage}
        showSearch={false}
        size="sm"
      />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { label: "Races", href: "/races" },
          { label: stateName, href: `/races/state/${stateSlug}` },
          { label: cityName }
        ]} />

        <div className="mt-8">
          <h2 className="font-heading font-bold text-2xl mb-6" data-testid="text-city-title">
            Races in {cityName}, {stateName}
          </h2>

          {isLoading ? (
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
              <p className="text-muted-foreground mb-4" data-testid="text-no-races">No races currently listed in {cityName}.</p>
              <Button variant="link" asChild><Link href={`/races/state/${stateSlug}`} data-testid="link-view-state-races">View all {stateName} races</Link></Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
