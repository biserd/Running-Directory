import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Route } from "@shared/schema";
import { Footprints, MapPin, Mountain, Navigation } from "lucide-react";
import { Link } from "wouter";

function RoutePreview({ route }: { route: Route }) {
  if (!route.polyline || !route.lat || !route.lng) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <MapPin className="h-8 w-8 text-muted-foreground/30" />
      </div>
    );
  }

  try {
    const coords: [number, number][] = JSON.parse(route.polyline);
    if (coords.length < 2) throw new Error("too few");

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const [lat, lng] of coords) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    const padding = 0.15;
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const pMinLat = minLat - latRange * padding;
    const pMaxLat = maxLat + latRange * padding;
    const pMinLng = minLng - lngRange * padding;
    const pMaxLng = maxLng + lngRange * padding;
    const pLatRange = pMaxLat - pMinLat;
    const pLngRange = pMaxLng - pMinLng;

    const svgWidth = 300;
    const svgHeight = 128;

    const toX = (lng: number) => ((lng - pMinLng) / pLngRange) * svgWidth;
    const toY = (lat: number) => svgHeight - ((lat - pMinLat) / pLatRange) * svgHeight;

    const pathD = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${toX(c[1]).toFixed(1)},${toY(c[0]).toFixed(1)}`)
      .join(" ");

    return (
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <rect width={svgWidth} height={svgHeight} fill="none" />
        <path d={pathD} fill="none" stroke="hsl(221.2, 83.2%, 53.3%)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        <circle cx={toX(coords[0][1])} cy={toY(coords[0][0])} r="4" fill="hsl(142, 76%, 36%)" stroke="white" strokeWidth="1.5" />
        <circle cx={toX(coords[coords.length - 1][1])} cy={toY(coords[coords.length - 1][0])} r="4" fill="hsl(0, 84%, 60%)" stroke="white" strokeWidth="1.5" />
      </svg>
    );
  } catch {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <MapPin className="h-8 w-8 text-muted-foreground/30" />
      </div>
    );
  }
}

export function RouteCard({ route }: { route: Route }) {
  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors group h-full" data-testid={`card-route-${route.id}`}>
      <div className="relative h-32 bg-muted flex items-center justify-center">
        <RoutePreview route={route} />
        <Badge className="absolute top-2 right-2 bg-background/90 text-foreground hover:bg-background/100">
          {route.distance} mi
        </Badge>
      </div>
      <CardContent className="p-5">
        <Link href={`/routes/${route.slug}`} className="block group-hover:text-primary transition-colors" data-testid={`link-route-${route.id}`}>
            <h3 className="font-heading font-bold text-lg leading-tight mb-2 truncate">
              {route.name}
            </h3>
        </Link>
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <MapPin className="h-3 w-3" />
          <span>{route.city}, {route.state}</span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded text-secondary-foreground">
            <Mountain className="h-3 w-3" />
            <span>{route.elevationGain}ft</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded text-secondary-foreground">
            <Footprints className="h-3 w-3" />
            <span>{route.surface}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded text-secondary-foreground">
            <Navigation className="h-3 w-3" />
            <span>{route.type}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
