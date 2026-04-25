import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, ExternalLink } from "lucide-react";
import { RaceCard } from "@/components/race-card";
import type { Race, RaceSeries } from "@shared/schema";

type SeriesDetail = { series: RaceSeries; races: Race[] };

export default function SeriesDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data, isLoading } = useQuery<SeriesDetail | null>({
    queryKey: [`/api/series/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/series/${slug}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <p className="text-muted-foreground" data-testid="text-loading">Loading series…</p>
          </div>
        </section>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h1 className="text-3xl font-heading font-bold mb-3" data-testid="text-series-not-found">Series not found</h1>
            <p className="text-muted-foreground mb-6">We don't have a profile for this race series yet.</p>
            <Button asChild data-testid="button-back-to-races">
              <Link href="/races"><Calendar className="mr-2 h-4 w-4" /> Browse races</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const { series, races } = data;

  return (
    <Layout>
      <section className="bg-background">
        <div className="container mx-auto px-4 pt-6 pb-2">
          <Breadcrumbs items={[
            { label: "Races", href: "/races" },
            { label: "Series" },
            { label: series.name },
          ]} />
        </div>
        <div className="container mx-auto px-4 pb-8 pt-2 max-w-5xl">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Trophy className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-5xl font-heading font-bold leading-tight" data-testid="text-series-name">{series.name}</h1>
              {series.description && (
                <p className="text-muted-foreground mt-3 text-lg" data-testid="text-series-description">{series.description}</p>
              )}
              {series.website && (
                <a href={series.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3" data-testid="link-series-website">
                  Series website <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-12 max-w-5xl">
          <h2 className="text-xl font-heading font-semibold mb-4" data-testid="text-series-races-heading">
            Races in this series {races.length > 0 ? `(${races.length})` : ""}
          </h2>
          {races.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-empty-series-races">
                No upcoming races listed for this series.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="list-series-races">
              {races.map(race => <RaceCard key={race.id} race={race} />)}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
