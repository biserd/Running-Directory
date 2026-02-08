import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useParams, Link } from "wouter";
import { MapPin, Calendar, Trophy, Share2, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolsCTA } from "@/components/tools-cta";
import { useQuery } from "@tanstack/react-query";
import { apiGetRace, apiGetRoutes } from "@/lib/api";
import { format } from "date-fns";
import { parseRaceDate } from "@/lib/dates";

export default function RaceDetail() {
  const { slug } = useParams();
  
  const { data: race, isLoading } = useQuery({
    queryKey: ["/api/races", slug],
    queryFn: () => apiGetRace(slug!),
    enabled: !!slug,
  });

  const { data: nearbyRoutes } = useQuery({
    queryKey: ["/api/routes", { state: race?.state, limit: 3 }],
    queryFn: () => apiGetRoutes({ state: race?.state, limit: 3 }),
    enabled: !!race,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 space-y-8">
          <Skeleton className="h-12 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }
  
  if (!race) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">Race Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find a race with that URL.</p>
          <Button asChild><Link href="/races" data-testid="link-browse-races">Browse All Races</Link></Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs items={[
            { label: "Races", href: "/races" },
            { label: race.state },
            { label: race.name }
          ]} />
          
          <div className="mt-8 flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
               <div className="flex gap-2 mb-4">
                 <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20" data-testid="badge-race-distance">{race.distance}</Badge>
                 <Badge variant="outline" data-testid="badge-race-surface">{race.surface}</Badge>
               </div>
               <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-4" data-testid="text-race-name">{race.name}</h1>
               <div className="flex flex-wrap gap-6 text-muted-foreground">
                 <div className="flex items-center gap-2">
                   <Calendar className="h-5 w-5" />
                   <span className="font-medium text-foreground" data-testid="text-race-date">{format(parseRaceDate(race.date), "MMMM d, yyyy")}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <MapPin className="h-5 w-5" />
                   <span className="font-medium text-foreground" data-testid="text-race-location">{race.city}, {race.state}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Trophy className="h-5 w-5" />
                   <span className="font-medium text-foreground" data-testid="text-race-elevation">{race.elevation} Course</span>
                 </div>
               </div>
            </div>
            
            <div className="flex flex-col gap-3 min-w-[200px]">
              {(race.registrationUrl || race.website) && (
                <Button size="lg" className="w-full font-semibold" asChild data-testid="button-register">
                  <a href={race.registrationUrl || race.website!} target="_blank" rel="noopener noreferrer">
                    Register Now <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
              {race.website && (
                <Button variant="outline" className="w-full" asChild data-testid="button-website">
                  <a href={race.website} target="_blank" rel="noopener noreferrer">
                    Visit Website <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="font-heading font-bold text-2xl mb-4">About the Race</h2>
            <div className="prose max-w-none text-muted-foreground">
              <p data-testid="text-race-description">{race.description || `Experience one of the premier ${race.distance} events in ${race.state}. The ${race.name} offers a ${race.elevation.toLowerCase()} course through the scenic streets of ${race.city}.`}</p>
            </div>
          </section>
          
          <section>
             <h2 className="font-heading font-bold text-2xl mb-4">Course Profile</h2>
             <div className="bg-muted h-64 rounded-xl flex items-center justify-center border border-dashed">
               <p className="text-muted-foreground">Course map & elevation profile coming soon</p>
             </div>
          </section>

          <section>
            <ToolsCTA />
          </section>
        </div>
        
        <aside className="space-y-8">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold mb-4">Race Logistics</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Start Time</span>
                <span className="font-medium" data-testid="text-start-time">{race.startTime || "TBA"}</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Time Limit</span>
                <span className="font-medium" data-testid="text-time-limit">{race.timeLimit || "None"}</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Surface</span>
                <span className="font-medium">{race.surface}</span>
              </li>
              {race.bostonQualifier !== null && (
                <li className="flex justify-between pt-2">
                  <span className="text-muted-foreground">Boston Qualifier</span>
                  <span className={`font-medium ${race.bostonQualifier ? "text-green-600" : "text-muted-foreground"}`} data-testid="text-bq">
                    {race.bostonQualifier ? "Yes" : "No"}
                  </span>
                </li>
              )}
            </ul>
          </div>
          
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold mb-4">Data Source</h3>
            <ul className="space-y-3 text-sm">
              {race.lastSeenAt && (
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium" data-testid="text-last-updated">{format(new Date(race.lastSeenAt), "MMM d, yyyy")}</span>
                </li>
              )}
              {race.qualityScore != null && (
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Data Quality</span>
                  <span className="font-medium" data-testid="text-quality-score">
                    {race.qualityScore >= 80 ? "High" : race.qualityScore >= 50 ? "Good" : "Basic"}
                  </span>
                </li>
              )}
              {race.distanceLabel && race.distanceLabel !== race.distance && (
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="font-medium" data-testid="text-distance-label">{race.distanceLabel}</span>
                </li>
              )}
            </ul>
            <p className="text-xs text-muted-foreground mt-4">
              Race data sourced from RunSignUp and verified public records.
            </p>
          </div>

          <div>
            <h3 className="font-heading font-semibold mb-4">Nearby Routes</h3>
             <div className="space-y-4">
               {nearbyRoutes?.map(route => (
                 <Link key={route.id} href={`/routes/${route.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-nearby-route-${route.id}`}>
                     <div className="font-semibold">{route.name}</div>
                     <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                       <span>{route.distance} mi</span>
                       <span>·</span>
                       <span>{route.type}</span>
                     </div>
                 </Link>
               ))}
             </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
