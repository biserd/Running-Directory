import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RaceCard } from "@/components/race-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiGetRaces } from "@/lib/api";
import heroImage from "@/assets/images/hero-races.jpg";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function RacesYearPage() {
  const params = useParams();
  const year = parseInt(params.year || "");
  const monthStr = params.month;
  const month = monthStr ? parseInt(monthStr) : undefined;

  const { data: races, isLoading } = useQuery({
    queryKey: ["/api/races", { year, month }],
    queryFn: () => apiGetRaces({ year, month }),
    enabled: !isNaN(year),
  });

  const title = month && month >= 1 && month <= 12
    ? `${MONTH_NAMES[month - 1]} ${year} Races`
    : `${year} Race Calendar`;

  const subtitle = month && month >= 1 && month <= 12
    ? `Running races happening in ${MONTH_NAMES[month - 1]} ${year}.`
    : `Browse all running races scheduled for ${year}.`;

  const breadcrumbs: { label: string; href?: string }[] = [
    { label: "Races", href: "/races" },
    { label: String(year), href: month ? `/races/year/${year}` : undefined },
  ];
  if (month && month >= 1 && month <= 12) {
    breadcrumbs.push({ label: MONTH_NAMES[month - 1] });
  }

  return (
    <Layout>
      <Hero
        title={title}
        subtitle={subtitle}
        image={heroImage}
        showSearch={false}
        size="sm"
      />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        {!month && (
          <div className="mt-8 mb-12">
            <h3 className="font-heading font-semibold text-lg mb-4" data-testid="text-browse-by-month">Browse by Month</h3>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {MONTH_NAMES.map((name, i) => (
                <Link key={i} href={`/races/year/${year}/month/${String(i + 1).padStart(2, "0")}`} className="p-3 text-center border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm font-medium" data-testid={`link-month-${i + 1}`}>
                  {name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="font-heading font-bold text-2xl mb-6" data-testid="text-year-title">{title}</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
            </div>
          ) : races && races.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {races.map(race => (
                <RaceCard key={race.id} race={race} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <p className="text-muted-foreground mb-4" data-testid="text-no-races">No races found for this period.</p>
              <Button variant="link" asChild><Link href="/races" data-testid="link-view-all-races">View all races</Link></Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
