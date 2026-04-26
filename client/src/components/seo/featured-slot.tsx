import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Sparkles, ArrowRight, Calendar, MapPin, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiGetFeaturedRaces } from "@/lib/api";
import type { Race } from "@shared/schema";
import { format, parseISO } from "date-fns";

interface FeaturedSlotProps {
  cityId?: number;
  distance?: string;
  isTurkeyTrot?: boolean;
  limit?: number;
  testIdPrefix?: string;
}

export function FeaturedSlot({ cityId, distance, isTurkeyTrot, limit = 3, testIdPrefix = "featured-slot" }: FeaturedSlotProps) {
  const { data: races } = useQuery<Race[]>({
    queryKey: ["/api/featured/races", { cityId, distance, isTurkeyTrot, limit }],
    queryFn: () => apiGetFeaturedRaces({ cityId, distance, isTurkeyTrot, limit }),
    staleTime: 60_000,
  });

  if (!races || races.length === 0) return null;

  return (
    <section className="mb-8" data-testid={testIdPrefix}>
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Badge className="bg-amber-500 text-white border-0">
            <Sparkles className="h-3 w-3 mr-1" /> Featured
          </Badge>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200">
            Promoted by the organizer
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {races.map((r) => (
            <Link key={r.id} href={`/races/${r.slug}`} data-testid={`${testIdPrefix}-link-${r.slug}`} className="block bg-card rounded-lg border p-4 hover-elevate">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-sm leading-tight">{r.name}</h3>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {r.date && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {(() => { try { return format(parseISO(r.date), "MMM d"); } catch { return r.date; } })()}
                  </span>
                )}
                {(r.city || r.state) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {[r.city, r.state].filter(Boolean).join(", ")}
                  </span>
                )}
                {r.distance && <Badge variant="outline" className="text-[10px] py-0 h-4">{r.distance}</Badge>}
                {(r.priceMin != null || r.priceMax != null) && (
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {r.priceMin != null && r.priceMax != null && r.priceMin !== r.priceMax
                      ? `${r.priceMin}–$${r.priceMax}`
                      : `${r.priceMin ?? r.priceMax}`}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
