import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { Race } from "@shared/schema";
import { Calendar, MapPin, Mountain, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export function RaceCard({ race }: { race: Race }) {
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
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(race.date), "MMM d, yyyy")}
          </span>
        </div>
        
        <Link href={`/races/${race.slug}`} className="block group-hover:text-primary transition-colors" data-testid={`link-race-${race.id}`}>
            <h3 className="font-heading font-bold text-lg leading-tight mb-2">
              {race.name}
            </h3>
        </Link>
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <MapPin className="h-3 w-3" />
          <span>{race.city}, {race.state}</span>
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
