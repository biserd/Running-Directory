import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RACES, ROUTES } from "@/lib/mock-data";
import { useParams, Link } from "wouter";
import { MapPin, Calendar, Clock, Trophy, ArrowRight, Share2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolsCTA } from "@/components/tools-cta";
import { format } from "date-fns";

export default function RaceDetail() {
  const { slug } = useParams();
  // In a real app we'd fetch based on slug, here we just find one or default to first
  const race = RACES.find(r => r.slug === slug) || RACES[0];
  
  return (
    <Layout>
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs items={[
            { label: "Races", href: "/races" },
            { label: race.state, href: `/races/state/${race.state.toLowerCase()}` },
            { label: race.name }
          ]} />
          
          <div className="mt-8 flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
               <div className="flex gap-2 mb-4">
                 <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">{race.distance}</Badge>
                 <Badge variant="outline">{race.surface}</Badge>
               </div>
               <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-4">{race.name}</h1>
               <div className="flex flex-wrap gap-6 text-muted-foreground">
                 <div className="flex items-center gap-2">
                   <Calendar className="h-5 w-5" />
                   <span className="font-medium text-foreground">{format(new Date(race.date), "MMMM d, yyyy")}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <MapPin className="h-5 w-5" />
                   <span className="font-medium text-foreground">{race.city}, {race.state}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Trophy className="h-5 w-5" />
                   <span className="font-medium text-foreground">{race.elevation} Course</span>
                 </div>
               </div>
            </div>
            
            <div className="flex flex-col gap-3 min-w-[200px]">
              <Button size="lg" className="w-full font-semibold">Register Now</Button>
              <Button variant="outline" className="w-full">
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="font-heading font-bold text-2xl mb-4">About the Race</h2>
            <div className="prose max-w-none text-muted-foreground">
              <p>
                Experience one of the premier {race.distance} events in {race.state}. 
                The {race.name} offers a {race.elevation.toLowerCase()} course through the scenic streets of {race.city}.
                Perfect for runners looking to set a PR or enjoy a supported long run.
              </p>
              <p className="mt-4">
                Course highlights include historic landmarks, river views, and an electric finish line atmosphere.
                Aid stations are located every 2 miles.
              </p>
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
                <span className="font-medium">7:00 AM</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Time Limit</span>
                <span className="font-medium">6 Hours</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Avg Temp</span>
                <span className="font-medium">55°F / 42°F</span>
              </li>
              <li className="flex justify-between pt-2">
                <span className="text-muted-foreground">Boston Qualifier</span>
                <span className="font-medium text-green-600">Yes</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-heading font-semibold mb-4">Nearby Routes</h3>
             <div className="space-y-4">
               {ROUTES.slice(0, 3).map(route => (
                 <Link key={route.id} href={`/routes/${route.slug}`}>
                   <a className="block p-4 border rounded-lg hover:border-primary/50 transition-colors">
                     <div className="font-semibold">{route.name}</div>
                     <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                       <span>{route.distance} mi</span>
                       <span>•</span>
                       <span>{route.type}</span>
                     </div>
                   </a>
                 </Link>
               ))}
             </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
