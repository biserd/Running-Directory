import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiGetFavoritesEnriched } from "@/lib/api";
import { Layout } from "@/components/layout";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Race, Route } from "@shared/schema";
import { FavoriteButton } from "@/components/favorite-button";
import { getStateName } from "@/lib/states";

function FavoriteRaceItem({ race }: { race: Race }) {
  return (
    <a href={`/races/${race.slug}`} className="block group" data-testid={`card-favorite-race-${race.id}`}>
      <div className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 hover:bg-muted/30 transition-colors">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate group-hover:text-primary transition-colors">{race.name}</h3>
          <p className="text-sm text-muted-foreground">
            {race.city}, {getStateName(race.state)} &middot; {race.date} &middot; {race.distance}
          </p>
        </div>
        <FavoriteButton itemType="race" itemId={race.id} size="sm" />
      </div>
    </a>
  );
}

function FavoriteRouteItem({ route }: { route: Route }) {
  return (
    <a href={`/routes/${route.slug}`} className="block group" data-testid={`card-favorite-route-${route.id}`}>
      <div className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 hover:bg-muted/30 transition-colors">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate group-hover:text-primary transition-colors">{route.name}</h3>
          <p className="text-sm text-muted-foreground">
            {route.city}, {getStateName(route.state)} &middot; {route.distance} mi &middot; {route.surface}
          </p>
        </div>
        <FavoriteButton itemType="route" itemId={route.id} size="sm" />
      </div>
    </a>
  );
}

export default function FavoritesPage() {
  const { user, isLoading: authLoading, openLogin } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/favorites/enriched"],
    queryFn: apiGetFavoritesEnriched,
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      openLogin();
    }
  }, [authLoading, user, openLogin]);

  const raceItems = data?.races || [];
  const routeItems = data?.routes || [];
  const hasFavorites = raceItems.length > 0 || routeItems.length > 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Heart className="h-6 w-6 text-red-500 fill-red-500" />
            <h1 className="font-heading text-3xl font-bold" data-testid="text-favorites-title">My Favorites</h1>
          </div>

          {!user && !authLoading && (
            <div className="text-center py-20" data-testid="favorites-login-prompt">
              <Heart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">Sign in to see your favorites</h2>
              <p className="text-muted-foreground mb-6">Save your favorite races and routes for easy access.</p>
              <Button onClick={openLogin} data-testid="button-favorites-sign-in">Sign in</Button>
            </div>
          )}

          {user && isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {user && !isLoading && !hasFavorites && (
            <div className="text-center py-20" data-testid="favorites-empty">
              <Heart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">No favorites yet</h2>
              <p className="text-muted-foreground mb-6">
                Browse races and routes and tap the heart icon to save your favorites.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate("/races")} data-testid="button-browse-races">
                  Browse Races
                </Button>
                <Button variant="outline" onClick={() => navigate("/routes")} data-testid="button-browse-routes">
                  Browse Routes
                </Button>
              </div>
            </div>
          )}

          {user && !isLoading && hasFavorites && (
            <div className="space-y-8">
              {raceItems.length > 0 && (
                <section>
                  <h2 className="font-heading text-lg font-semibold mb-4" data-testid="text-favorite-races-heading">
                    Races ({raceItems.length})
                  </h2>
                  <div className="space-y-2">
                    {raceItems.map(race => (
                      <FavoriteRaceItem key={race.id} race={race} />
                    ))}
                  </div>
                </section>
              )}

              {routeItems.length > 0 && (
                <section>
                  <h2 className="font-heading text-lg font-semibold mb-4" data-testid="text-favorite-routes-heading">
                    Routes ({routeItems.length})
                  </h2>
                  <div className="space-y-2">
                    {routeItems.map(route => (
                      <FavoriteRouteItem key={route.id} route={route} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
