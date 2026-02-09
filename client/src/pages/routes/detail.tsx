import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FavoriteButton } from "@/components/favorite-button";
import { useParams, Link } from "wouter";
import { MapPin, Mountain, Ruler, Share2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolsCTA } from "@/components/tools-cta";
import { RouteMap } from "@/components/route-map";
import { useQuery } from "@tanstack/react-query";
import { apiGetRoute, apiGetRaces, apiGetPodcasts, apiGetBooks } from "@/lib/api";
import { getStateSlug, getStateName } from "@/lib/states";

export default function RouteDetail() {
  const { slug } = useParams();

  const { data: route, isLoading } = useQuery({
    queryKey: ["/api/routes", slug],
    queryFn: () => apiGetRoute(slug!),
    enabled: !!slug,
  });

  const { data: routePodcasts } = useQuery({
    queryKey: ["/api/podcasts", { limit: 3 }],
    queryFn: () => apiGetPodcasts({ limit: 3 }),
  });

  const { data: routeBooks } = useQuery({
    queryKey: ["/api/books", { limit: 3 }],
    queryFn: () => apiGetBooks({ limit: 3 }),
  });

  const { data: nearbyRaces } = useQuery({
    queryKey: ["/api/races", { state: route?.state, limit: 3 }],
    queryFn: () => apiGetRaces({ state: route?.state, limit: 3 }),
    enabled: !!route?.state,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 space-y-8">
          <Skeleton className="h-12 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!route) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">Route Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find a route with that URL.</p>
          <Button asChild><Link href="/routes" data-testid="link-browse-routes">Browse All Routes</Link></Button>
        </div>
      </Layout>
    );
  }

  const difficultyColor = route.difficulty === "Easy" ? "text-green-600" : route.difficulty === "Moderate" ? "text-yellow-600" : "text-red-600";

  return (
    <Layout>
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs items={[
            { label: "Routes", href: "/routes" },
            { label: getStateName(route.state), href: `/state/${getStateSlug(route.state)}` },
            { label: route.name }
          ]} />

          <div className="mt-8 flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex gap-2 mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20" data-testid="badge-route-surface">{route.surface}</Badge>
                <Badge variant="outline" data-testid="badge-route-type">{route.type}</Badge>
                <Badge variant="outline" className={difficultyColor} data-testid="badge-route-difficulty">{route.difficulty}</Badge>
              </div>
              <div className="flex items-start gap-3">
                <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-4 flex-1" data-testid="text-route-name">{route.name}</h1>
                <FavoriteButton itemType="route" itemId={route.id} className="mt-2" />
              </div>
              <div className="flex flex-wrap gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Ruler className="h-5 w-5" />
                  <span className="font-medium text-foreground" data-testid="text-route-distance">{route.distance} mi</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mountain className="h-5 w-5" />
                  <span className="font-medium text-foreground" data-testid="text-route-elevation">{route.elevationGain} ft gain</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span className="font-medium text-foreground" data-testid="text-route-location">{route.city}, {getStateName(route.state)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 min-w-[200px]">
              <Button size="lg" className="w-full font-semibold" asChild data-testid="button-train-aitracker">
                <a href="https://aitracker.run" target="_blank" rel="noopener noreferrer">
                  Train with AITracker <ArrowUpRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" className="w-full" data-testid="button-share-route">
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="font-heading font-bold text-2xl mb-4">About This Route</h2>
            <div className="prose max-w-none text-muted-foreground">
              <p data-testid="text-route-description">{route.description || `A ${route.difficulty.toLowerCase()} ${route.distance}-mile ${route.type.toLowerCase()} route on ${route.surface.toLowerCase()} in ${route.city}, ${getStateName(route.state)}.`}</p>
            </div>
          </section>

          <section>
            <h2 className="font-heading font-bold text-2xl mb-4">Route Map</h2>
            {route.lat && route.lng ? (
              <RouteMap lat={route.lat} lng={route.lng} name={route.name} polyline={route.polyline} className="h-[400px] border" />
            ) : (
              <div className="bg-muted h-64 rounded-xl flex items-center justify-center border border-dashed">
                <p className="text-muted-foreground">Map location not available for this route</p>
              </div>
            )}
          </section>

          <section>
            <ToolsCTA />
          </section>
        </div>

        <aside className="space-y-8">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold mb-4">Route Details</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Distance</span>
                <span className="font-medium">{route.distance} mi</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Elevation Gain</span>
                <span className="font-medium">{route.elevationGain} ft</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Surface</span>
                <span className="font-medium">{route.surface}</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{route.type}</span>
              </li>
              <li className="flex justify-between pt-2">
                <span className="text-muted-foreground">Difficulty</span>
                <span className={`font-medium ${difficultyColor}`}>{route.difficulty}</span>
              </li>
            </ul>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold mb-4">Explore {getStateName(route.state)}</h3>
            <div className="space-y-3">
              <Link href={`/state/${getStateSlug(route.state)}`} className="block p-3 border rounded-lg hover:border-primary/50 transition-colors text-sm" data-testid="link-state-hub">
                <div className="font-semibold">{getStateName(route.state)} Running Hub</div>
                <div className="text-xs text-muted-foreground mt-0.5">Races, routes & more</div>
              </Link>
              <Link href={`/routes/state/${getStateSlug(route.state)}`} className="block p-3 border rounded-lg hover:border-primary/50 transition-colors text-sm" data-testid="link-state-routes">
                <div className="font-semibold">All {getStateName(route.state)} Routes</div>
                <div className="text-xs text-muted-foreground mt-0.5">Browse all paths & trails</div>
              </Link>
              <Link href="/collections" className="block p-3 border rounded-lg hover:border-primary/50 transition-colors text-sm" data-testid="link-collections">
                <div className="font-semibold">Collections</div>
                <div className="text-xs text-muted-foreground mt-0.5">Curated "best of" lists</div>
              </Link>
            </div>
          </div>

          {nearbyRaces && nearbyRaces.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold mb-4">Races in {getStateName(route.state)}</h3>
              <div className="space-y-4">
                {nearbyRaces.map(race => (
                  <Link key={race.id} href={`/races/${race.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-nearby-race-${race.id}`}>
                    <div className="font-semibold">{race.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                      <span>{race.distance}</span>
                      <span>·</span>
                      <span>{race.city}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {routePodcasts && routePodcasts.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold mb-4">Running Podcasts</h3>
              <div className="space-y-4">
                {routePodcasts.map(podcast => (
                  <Link key={podcast.id} href={`/podcasts/${podcast.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-route-podcast-${podcast.id}`}>
                    <div className="font-semibold">{podcast.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{podcast.host}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {routeBooks && routeBooks.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold mb-4">Running Books</h3>
              <div className="space-y-4">
                {routeBooks.map(book => (
                  <Link key={book.id} href={`/books/${book.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-route-book-${book.id}`}>
                    <div className="font-semibold">{book.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{book.author}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </Layout>
  );
}
