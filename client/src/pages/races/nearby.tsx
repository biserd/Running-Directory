import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiGetRacesNearby } from "@/lib/api";
import { Link } from "wouter";
import { getStateName } from "@/lib/states";
import { Calendar, MapPin, Mountain, TrendingUp, Navigation, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { parseRaceDate } from "@/lib/dates";
import { useState, useEffect } from "react";
import type { Race } from "@shared/schema";
import heroImage from "@/assets/images/hero-races.jpg";

type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; lat: number; lng: number }
  | { status: "denied"; message: string }
  | { status: "unavailable" };

function NearbyRaceCard({ race, distanceMiles }: { race: Race; distanceMiles: number }) {
  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors group h-full flex flex-col" data-testid={`card-race-${race.id}`}>
      <CardHeader className="p-0">
        <div className="h-2 w-full bg-muted group-hover:bg-primary transition-colors" />
      </CardHeader>
      <CardContent className="p-5 flex-1">
        <div className="flex justify-between items-start mb-3">
          <Badge variant="secondary" className="font-mono text-xs font-normal uppercase tracking-wider" data-testid={`badge-distance-${race.id}`}>
            {race.distance}
          </Badge>
          <Badge variant="outline" className="text-xs font-medium flex items-center gap-1" data-testid={`badge-miles-${race.id}`}>
            <Navigation className="h-3 w-3" />
            {distanceMiles} mi away
          </Badge>
        </div>

        <Link href={`/races/${race.slug}`} className="block group-hover:text-primary transition-colors" data-testid={`link-race-${race.id}`}>
          <h3 className="font-heading font-bold text-lg leading-tight mb-2">
            {race.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Calendar className="h-3 w-3" />
          <span>{format(parseRaceDate(race.date), "MMM d, yyyy")}</span>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <MapPin className="h-3 w-3" />
          <span>{race.city}, {getStateName(race.state)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 bg-secondary/50 p-1.5 rounded">
            <TrendingUp className="h-3 w-3" />
            <span>{race.surface}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-secondary/50 p-1.5 rounded">
            <Mountain className="h-3 w-3" />
            <span>{race.elevation}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-5 pt-0 border-t bg-muted/5 mt-auto">
        <Link href={`/races/${race.slug}`} className="w-full pt-4 text-center text-sm font-medium text-primary hover:underline" data-testid={`link-race-detail-${race.id}`}>
          View Details
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function RacesNearbyPage() {
  const [location, setLocation] = useState<LocationState>({ status: "idle" });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ status: "unavailable" });
      return;
    }

    setLocation({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          status: "success",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocation({ status: "denied", message: "Location access was denied. Please enable location permissions in your browser settings to find races near you." });
        } else {
          setLocation({ status: "denied", message: "Unable to determine your location. Please try again later." });
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const { data: races, isLoading: racesLoading } = useQuery({
    queryKey: ["/api/races/nearby", location.status === "success" ? location.lat : null, location.status === "success" ? location.lng : null],
    queryFn: () => {
      if (location.status !== "success") throw new Error("No location");
      return apiGetRacesNearby(location.lat, location.lng, 30);
    },
    enabled: location.status === "success",
  });

  const breadcrumbs = [
    { label: "Races", href: "/races" },
    { label: "Near Me" },
  ];

  return (
    <Layout>
      <Hero
        title="Races Near You"
        subtitle="Discover upcoming races closest to your current location."
        image={heroImage}
        size="sm"
      />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-8">
          {location.status === "idle" || location.status === "loading" ? (
            <div className="text-center py-16" data-testid="status-loading-location">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <h2 className="font-heading font-bold text-xl mb-2">Finding your location...</h2>
              <p className="text-muted-foreground">Please allow location access when prompted by your browser.</p>
            </div>
          ) : location.status === "unavailable" ? (
            <div className="text-center py-16 border rounded-lg bg-muted/10" data-testid="status-unavailable">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-heading font-bold text-xl mb-2">Geolocation Not Available</h2>
              <p className="text-muted-foreground mb-4">Your browser doesn't support geolocation.</p>
              <Button variant="link" asChild>
                <Link href="/races" data-testid="link-browse-races">Browse all races instead</Link>
              </Button>
            </div>
          ) : location.status === "denied" ? (
            <div className="text-center py-16 border rounded-lg bg-muted/10" data-testid="status-denied">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-heading font-bold text-xl mb-2">Location Access Required</h2>
              <p className="text-muted-foreground mb-4">{location.message}</p>
              <Button variant="link" asChild>
                <Link href="/races" data-testid="link-browse-races">Browse all races instead</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground" data-testid="status-location-found">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Showing races near your location</span>
              </div>

              {racesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-72 rounded-lg" />
                  ))}
                </div>
              ) : races && races.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-nearby-races">
                  {races.map((race) => (
                    <NearbyRaceCard key={race.id} race={race} distanceMiles={race.distanceMiles} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/10" data-testid="text-no-nearby-races">
                  <p className="text-muted-foreground mb-4">No upcoming races found near your location.</p>
                  <Button variant="link" asChild>
                    <Link href="/races" data-testid="link-browse-races">Browse all races</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
