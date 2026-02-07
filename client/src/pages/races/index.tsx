import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RaceCard } from "@/components/race-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RACES, STATES } from "@/lib/mock-data";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/images/hero-races.jpg";

export default function RacesHub() {
  const params = useParams();
  const stateSlug = params.state;
  const stateData = stateSlug ? STATES.find(s => s.slug === stateSlug) : null;
  
  const title = stateData ? `${stateData.name} Race Calendar` : "USA Race Calendar";
  const subtitle = stateData 
    ? `Find the best 5Ks, Half Marathons, and Marathons in ${stateData.name}.`
    : "Discover thousands of races from 5Ks to Ultras across all 50 states.";
    
  // Filter races if state is selected
  const displayRaces = stateData 
    ? RACES.filter(r => r.state === stateData.abbreviation)
    : RACES;

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
          {/* Sidebar / Filters Placeholder */}
          <aside className="space-y-8">
            <div>
              <h3 className="font-heading font-semibold mb-4">State</h3>
              <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
                <Link href="/races">
                  <a className={`text-sm flex justify-between ${!stateData ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"}`}>
                    All States
                  </a>
                </Link>
                {STATES.map(state => (
                   <Link key={state.slug} href={`/races/state/${state.slug}`}>
                    <a className={`text-sm flex justify-between ${stateSlug === state.slug ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"}`}>
                      {state.name} <span>({state.raceCount})</span>
                    </a>
                   </Link>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-heading font-semibold mb-4">Distance</h3>
              <div className="space-y-2">
                {["5K", "10K", "Half Marathon", "Marathon", "Ultra"].map(d => (
                  <div key={d} className="flex items-center gap-2">
                    <input type="checkbox" id={d} className="rounded border-gray-300 text-primary focus:ring-primary" />
                    <label htmlFor={d} className="text-sm text-muted-foreground">{d}</label>
                  </div>
                ))}
              </div>
            </div>
          </aside>
          
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            <div>
              <h2 className="font-heading font-bold text-2xl mb-6">
                {stateData ? `Events in ${stateData.name}` : "Featured Events"}
              </h2>
              
              {displayRaces.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayRaces.map(race => (
                    <RaceCard key={race.id} race={race} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/10">
                  <p className="text-muted-foreground">No races found for this selection in our preview data.</p>
                  <Button variant="link" asChild><Link href="/races">View all races</Link></Button>
                </div>
              )}
            </div>
            
            {!stateData && (
              <div className="bg-muted/30 p-8 rounded-xl border text-center">
                <h3 className="font-heading font-bold text-xl mb-2">Can't find your race?</h3>
                <p className="text-muted-foreground mb-4">Our calendar is constantly updated with new events.</p>
                <Button>Submit a Race</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
