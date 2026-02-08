import { Layout } from "@/components/layout";
import { RaceCard } from "@/components/race-card";
import { RouteCard } from "@/components/route-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolsCTA } from "@/components/tools-cta";
import { useQuery } from "@tanstack/react-query";
import { apiGetCollection, apiGetRaces, apiGetRoutes } from "@/lib/api";

export default function CollectionDetail() {
  const { slug } = useParams();

  const { data: collection, isLoading: collectionLoading } = useQuery({
    queryKey: ["/api/collections", slug],
    queryFn: () => apiGetCollection(slug!),
    enabled: !!slug,
  });

  const queryFilters = (collection?.queryJson || {}) as Record<string, any>;

  const { data: raceItems } = useQuery({
    queryKey: ["/api/races", "collection", slug],
    queryFn: () => apiGetRaces({
      distance: queryFilters.distance,
      surface: queryFilters.surface,
      limit: queryFilters.limit || 20,
    }),
    enabled: !!collection && collection.type === "races",
  });

  const { data: routeItems } = useQuery({
    queryKey: ["/api/routes", "collection", slug],
    queryFn: () => apiGetRoutes({
      surface: queryFilters.surface,
      type: queryFilters.type,
      limit: queryFilters.limit || 20,
    }),
    enabled: !!collection && collection.type === "routes",
  });

  if (collectionLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 space-y-8">
          <Skeleton className="h-12 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!collection) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">Collection Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find this collection.</p>
          <Button asChild><Link href="/races" data-testid="link-browse-races">Browse Races</Link></Button>
        </div>
      </Layout>
    );
  }

  const items = collection.type === "races" ? raceItems : routeItems;

  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <Breadcrumbs items={[
            { label: "Collections" },
            { label: collection.title }
          ]} />

          <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mt-6 mb-4" data-testid="text-collection-title">{collection.title}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl" data-testid="text-collection-description">{collection.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {!items ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collection.type === "races"
              ? (items as any[]).map(race => <RaceCard key={race.id} race={race} />)
              : (items as any[]).map(route => <RouteCard key={route.id} route={route} />)
            }
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">No items in this collection yet.</p>
          </div>
        )}

        <div className="mt-16">
          <ToolsCTA />
        </div>
      </div>
    </Layout>
  );
}
