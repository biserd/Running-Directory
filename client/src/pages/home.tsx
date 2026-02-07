import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RaceCard } from "@/components/race-card";
import { RouteCard } from "@/components/route-card";
import { ToolsCTA } from "@/components/tools-cta";
import { RACES, ROUTES, STATES } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Calendar, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import heroImage from "@/assets/images/hero-races.jpg";

export default function Home() {
  const upcomingRaces = RACES.slice(0, 4);
  const popularRoutes = ROUTES.slice(0, 4);
  const topStates = STATES.sort((a, b) => b.raceCount - a.raceCount).slice(0, 6);

  return (
    <Layout>
      <Hero 
        title="Find your next race." 
        subtitle="The comprehensive USA race calendar and route directory. Data-driven tools to help you train smarter."
        image={heroImage}
        showSearch={true}
        size="lg"
      />

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-2">Upcoming Major Races</h2>
              <p className="text-muted-foreground">Premier events happening across the country.</p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/races">View all races <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {upcomingRaces.map(race => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-2">Popular Routes</h2>
              <p className="text-muted-foreground">Top-rated running paths and trails near you.</p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/routes">View all routes <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularRoutes.map(route => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <ToolsCTA />
        </div>
      </section>

      <section className="py-20 bg-background border-t">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-heading font-bold mb-8 text-center">Browse by State</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {topStates.map(state => (
              <Link key={state.slug} href={`/races/state/${state.slug}`}>
                <a className="group block p-4 bg-muted/30 hover:bg-primary/5 border hover:border-primary/30 rounded-lg transition-colors text-center">
                  <div className="font-heading font-bold text-lg mb-1">{state.name}</div>
                  <div className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    {state.raceCount} races
                  </div>
                </a>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
             <Button variant="outline" asChild>
                <Link href="/races">View Directory</Link>
             </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
