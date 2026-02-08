import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiGetStates } from "@/lib/api";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/images/hero-races.jpg";

export default function RacesUSAPage() {
  const { data: allStates, isLoading } = useQuery({
    queryKey: ["/api/states"],
    queryFn: apiGetStates,
  });

  const sortedStates = allStates?.slice().sort((a, b) => a.name.localeCompare(b.name)) ?? [];

  return (
    <Layout>
      <Hero
        title="USA Race Directory"
        subtitle="Browse running races across all 50 states. Find marathons, half marathons, 5Ks, trail races, and more."
        image={heroImage}
        showSearch={false}
        size="sm"
      />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { label: "Races", href: "/races" },
          { label: "USA" }
        ]} />

        <div className="mt-8">
          <h2 className="font-heading font-bold text-2xl mb-6" data-testid="text-usa-title">Browse by State</h2>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 20 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {sortedStates.map(state => (
                <Link key={state.slug} href={`/races/state/${state.slug}`} className="group block p-4 bg-muted/30 hover:bg-primary/5 border hover:border-primary/30 rounded-lg transition-colors" data-testid={`link-state-${state.slug}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-heading font-bold text-lg mb-1" data-testid={`text-state-abbr-${state.slug}`}>{state.abbreviation}</div>
                      <div className="text-sm text-muted-foreground" data-testid={`text-state-name-${state.slug}`}>{state.name}</div>
                      <div className="text-xs text-muted-foreground mt-1" data-testid={`text-state-race-count-${state.slug}`}>{state.raceCount} races</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
