import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Route } from "@shared/schema";
import { Footprints, MapPin, Mountain, Navigation } from "lucide-react";
import { Link } from "wouter";
import { getStateName } from "@/lib/states";

function latLngToWorldPixel(lat: number, lng: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;
  return { x, y };
}

function getZoomForBounds(
  minLat: number, maxLat: number, minLng: number, maxLng: number,
  viewW: number, viewH: number
): number {
  for (let z = 16; z >= 1; z--) {
    const topLeft = latLngToWorldPixel(maxLat, minLng, z);
    const bottomRight = latLngToWorldPixel(minLat, maxLng, z);
    const w = bottomRight.x - topLeft.x;
    const h = bottomRight.y - topLeft.y;
    if (w <= viewW * 0.75 && h <= viewH * 0.75) return z;
  }
  return 1;
}

const TILE_SIZE = 256;

function RoutePreview({ route }: { route: Route }) {
  if (!route.polyline || !route.lat || !route.lng) {
    return (
      <div className="h-full w-full bg-muted flex items-center justify-center">
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

    const viewW = 400;
    const viewH = 180;
    const zoom = getZoomForBounds(minLat, maxLat, minLng, maxLng, viewW, viewH);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const centerPx = latLngToWorldPixel(centerLat, centerLng, zoom);

    const vpLeft = centerPx.x - viewW / 2;
    const vpTop = centerPx.y - viewH / 2;

    const tileMinX = Math.floor(vpLeft / TILE_SIZE);
    const tileMaxX = Math.floor((vpLeft + viewW) / TILE_SIZE);
    const tileMinY = Math.floor(vpTop / TILE_SIZE);
    const tileMaxY = Math.floor((vpTop + viewH) / TILE_SIZE);

    const maxTile = Math.pow(2, zoom) - 1;
    const tiles: { x: number; y: number; left: number; top: number }[] = [];
    for (let tx = tileMinX; tx <= tileMaxX; tx++) {
      for (let ty = tileMinY; ty <= tileMaxY; ty++) {
        if (ty < 0 || ty > maxTile) continue;
        const wrappedX = ((tx % (maxTile + 1)) + (maxTile + 1)) % (maxTile + 1);
        tiles.push({
          x: wrappedX,
          y: ty,
          left: tx * TILE_SIZE - vpLeft,
          top: ty * TILE_SIZE - vpTop,
        });
      }
    }

    const pathPoints = coords.map(([lat, lng]) => {
      const wp = latLngToWorldPixel(lat, lng, zoom);
      return { x: wp.x - vpLeft, y: wp.y - vpTop };
    });

    const pathD = pathPoints
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");

    return (
      <div className="h-full w-full relative overflow-hidden">
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          {tiles.map((t) => (
            <image
              key={`${t.x}-${t.y}`}
              href={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
              x={t.left}
              y={t.top}
              width={TILE_SIZE}
              height={TILE_SIZE}
            />
          ))}
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d={pathD}
            fill="none"
            stroke="white"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
          />
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <circle cx={pathPoints[0].x} cy={pathPoints[0].y} r="5" fill="#16a34a" stroke="white" strokeWidth="2" />
          <circle cx={pathPoints[pathPoints.length - 1].x} cy={pathPoints[pathPoints.length - 1].y} r="5" fill="#dc2626" stroke="white" strokeWidth="2" />
        </svg>
      </div>
    );
  } catch {
    return (
      <div className="h-full w-full bg-muted flex items-center justify-center">
        <MapPin className="h-8 w-8 text-muted-foreground/30" />
      </div>
    );
  }
}

export function RouteCard({ route }: { route: Route }) {
  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors group h-full" data-testid={`card-route-${route.id}`}>
      <div className="relative h-36 bg-muted">
        <RoutePreview route={route} />
        <Badge className="absolute top-2 right-2 bg-background/90 text-foreground hover:bg-background/100 z-10">
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
          <span>{route.city}, {getStateName(route.state)}</span>
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
