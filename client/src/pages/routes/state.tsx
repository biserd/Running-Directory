import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RouteCard } from "@/components/route-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiGetRoutes, apiGetState } from "@/lib/api";
import heroImage from "@/assets/images/hero-routes.jpg";

export default function RoutesStatePage() {
  const params = useParams();
  const stateSlug = params.state;

  const { data: stateData } = useQuery({
    queryKey: ["/api/states", stateSlug],
    queryFn: () => apiGetState(stateSlug!),
    enabled: !!stateSlug,
  });

  const { data: routes, isLoading } = useQuery({
    queryKey: ["/api/routes", { state: stateData?.abbreviation }],
    queryFn: () => apiGetRoutes({ state: stateData?.abbreviation }),
    enabled: !!stateData?.abbreviation,
  });

  const stateName = stateData?.name || stateSlug?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";

  return (
    <Layout>
      <Hero
        title={`${stateName} Running Routes`}
        subtitle={`Discover the best running paths, trails, and loops in ${stateName}.`}
        image={heroImage}
        showSearch={false}
        size="sm"
      />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { label: "Routes", href: "/routes" },
          { label: stateName }
        ]} />

        <div className="mt-8">
          <h2 className="font-heading font-bold text-2xl mb-6" data-testid="text-state-routes-title">Routes in {stateName}</h2>

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
              <p className="text-muted-foreground mb-4" data-testid="text-no-routes">No routes listed in {stateName} yet.</p>
              <Button variant="link" asChild><Link href="/routes" data-testid="link-view-all-routes">View all routes</Link></Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
