import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Route } from "@shared/schema";
import { Footprints, MapPin, Mountain, Navigation } from "lucide-react";
import { Link } from "wouter";

export function RouteCard({ route }: { route: Route }) {
  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors group h-full" data-testid={`card-route-${route.id}`}>
      <div className="relative h-32 bg-muted flex items-center justify-center">
        <MapPin className="h-8 w-8 text-muted-foreground/30" />
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
