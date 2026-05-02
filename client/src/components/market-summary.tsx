import { useQuery } from "@tanstack/react-query";
import { apiGetMarketStats } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, Clock, BarChart3 } from "lucide-react";

interface Props {
  state?: string;
  city?: string;
  distance?: string;
  scopeLabel: string;
}

export function MarketSummary({ state, city, distance, scopeLabel }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/markets/summary", { state, city, distance }],
    queryFn: () => apiGetMarketStats({ state, city, distance }),
    enabled: Boolean(state || city || distance),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <Card data-testid="card-market-summary-loading">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.raceCount === 0) return null;

  return (
    <Card data-testid="card-market-summary">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-bold text-xl" data-testid="text-market-title">
            {scopeLabel} market snapshot
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          A live snapshot of the running market — race volume, pricing, urgency, and what runners actually do here.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={<BarChart3 className="h-4 w-4" />} label="Active races" value={data.raceCount.toLocaleString()} testId="stat-race-count" />
          <Stat
            icon={<DollarSign className="h-4 w-4" />}
            label="Avg entry"
            value={data.avgPriceMin != null ? `$${data.avgPriceMin}` : "—"}
            testId="stat-avg-price"
          />
          <Stat
            icon={<TrendingUp className="h-4 w-4" />}
            label="Quality score"
            value={data.medianQualityScore != null ? `${data.medianQualityScore}/100` : "—"}
            testId="stat-quality"
          />
          <Stat
            icon={<Clock className="h-4 w-4" />}
            label="Next 30 days"
            value={data.next30Days.toLocaleString()}
            sub={data.registrationClosingSoon > 0 ? `${data.registrationClosingSoon} closing soon` : undefined}
            testId="stat-upcoming"
          />
        </div>

        {data.distanceMix.length > 0 && (
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Distance mix</div>
            <div className="flex flex-wrap gap-2">
              {data.distanceMix.map((d) => (
                <div
                  key={d.distance}
                  className="px-3 py-1 rounded-full bg-muted text-sm"
                  data-testid={`chip-distance-${d.distance}`}
                >
                  <span className="font-medium">{d.distance}</span>
                  <span className="text-muted-foreground ml-2">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.avgPriceByDistance.length > 0 && (
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Avg price by distance</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {data.avgPriceByDistance.map((d) => (
                <div
                  key={d.distance}
                  className="flex items-center justify-between text-sm border rounded-md px-3 py-1.5"
                  data-testid={`row-priceavg-${d.distance}`}
                >
                  <span className="text-muted-foreground">{d.distance}</span>
                  <span className="font-semibold">{d.avgPriceMin != null ? `$${d.avgPriceMin}` : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value, sub, testId }: { icon: React.ReactNode; label: string; value: string; sub?: string; testId: string }) {
  return (
    <div className="border rounded-lg p-3 bg-muted/20" data-testid={testId}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-primary leading-tight">{value}</div>
      {sub && <div className="text-xs text-amber-600 mt-0.5">{sub}</div>}
    </div>
  );
}
