import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RaceCard } from "@/components/race-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiGetRaces, apiGetStates, apiGetState } from "@/lib/api";
import heroImage from "@/assets/images/hero-races.jpg";

export default function RacesHub() {
  const params = useParams();
  const stateSlug = params.state;

  const { data: stateData } = useQuery({
    queryKey: ["/api/states", stateSlug],
    queryFn: () => apiGetState(stateSlug!),
    enabled: !!stateSlug,
  });

  const { data: allStates, isLoading: statesLoading } = useQuery({
    queryKey: ["/api/states"],
    queryFn: apiGetStates,
  });

  const { data: races, isLoading: racesLoading } = useQuery({
    queryKey: ["/api/races", { state: stateData?.abbreviation }],
    queryFn: () => apiGetRaces(stateData ? { state: stateData.abbreviation } : undefined),
    enabled: stateSlug ? !!stateData : true,
  });
  
  const title = stateData ? `${stateData.name} Race Calendar` : "USA Race Calendar";
  const subtitle = stateData 
    ? `Find the best 5Ks, Half Marathons, and Marathons in ${stateData.name}.`
    : "Discover thousands of races from 5Ks to Ultras across all 50 states.";

  const breadcrumbs: { label: string; href?: string }[] = [{ label: "Races", href: "/races" }];
  if (stateData) {
    breadcrumbs.push({ label: stateData.name });
  }

  return (
    <Layout>
      <Hero 
        title={title}
        subtitle={subtitle}
        image={heroImage}
        showSearch={true}
        size="sm"
      />
      
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
          <aside className="space-y-8">
            <div>
              <h3 className="font-heading font-semibold mb-4">State</h3>
              <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
                <Link href="/races" className={`text-sm flex justify-between ${!stateData ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"}`} data-testid="link-all-states">
                    All States
                </Link>
                {statesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
                ) : (
                  allStates?.map(state => (
                     <Link key={state.slug} href={`/races/state/${state.slug}`} className={`text-sm flex justify-between ${stateSlug === state.slug ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"}`} data-testid={`link-state-filter-${state.slug}`}>
                        {state.name} <span>({state.raceCount})</span>
                     </Link>
                  ))
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-heading font-semibold mb-4">Distance</h3>
              <div className="space-y-2">
                {["5K", "10K", "Half Marathon", "Marathon", "Ultra"].map(d => (
                  <div key={d} className="flex items-center gap-2">
                    <input type="checkbox" id={d} className="rounded border-gray-300 text-primary focus:ring-primary" data-testid={`checkbox-distance-${d}`} />
                    <label htmlFor={d} className="text-sm text-muted-foreground">{d}</label>
                  </div>
                ))}
              </div>
            </div>
          </aside>
          
          <div className="lg:col-span-3 space-y-8">
            <div>
              <h2 className="font-heading font-bold text-2xl mb-6" data-testid="text-events-title">
                {stateData ? `Events in ${stateData.name}` : "Featured Events"}
              </h2>
              
              {racesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
                </div>
              ) : races && races.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {races.map(race => (
                    <RaceCard key={race.id} race={race} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/10">
                  <p className="text-muted-foreground">No races found for this selection.</p>
                  <Button variant="link" asChild><Link href="/races">View all races</Link></Button>
                </div>
              )}
            </div>
            
            {!stateData && (
              <div className="bg-muted/30 p-8 rounded-xl border text-center">
                <h3 className="font-heading font-bold text-xl mb-2">Can't find your race?</h3>
                <p className="text-muted-foreground mb-4">Our calendar is constantly updated with new events.</p>
                <Button data-testid="button-submit-race">Submit a Race</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
