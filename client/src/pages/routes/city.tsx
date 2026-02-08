import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RouteCard } from "@/components/route-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiGetRoutes, apiGetState, apiGetCity } from "@/lib/api";
import heroImage from "@/assets/images/hero-routes.jpg";

export default function RoutesCityPage() {
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

  const { data: routes, isLoading } = useQuery({
    queryKey: ["/api/routes", { city: cityData?.name, state: stateData?.abbreviation }],
    queryFn: () => apiGetRoutes({ city: cityData?.name, state: stateData?.abbreviation }),
    enabled: !!cityData?.name && !!stateData?.abbreviation,
  });

  const cityName = cityData?.name || citySlug?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";
  const stateName = stateData?.name || stateSlug?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";

  return (
    <Layout>
      <Hero
        title={`${cityName} Running Routes`}
        subtitle={`Explore running paths and trails in ${cityName}, ${stateName}.`}
        image={heroImage}
        showSearch={false}
        size="sm"
      />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { label: "Routes", href: "/routes" },
          { label: stateName, href: `/routes/state/${stateSlug}` },
          { label: cityName }
        ]} />

        <div className="mt-8">
          <h2 className="font-heading font-bold text-2xl mb-6" data-testid="text-city-routes-title">Routes in {cityName}</h2>

          {isLoading ? (
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
              <p className="text-muted-foreground mb-4" data-testid="text-no-routes">No routes listed in {cityName} yet.</p>
              <Button variant="link" asChild><Link href={`/routes/state/${stateSlug}`} data-testid="link-view-state-routes">View all {stateName} routes</Link></Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
