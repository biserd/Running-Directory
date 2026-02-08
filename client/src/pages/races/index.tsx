import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RaceCard } from "@/components/race-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiGetRaces, apiGetStates, apiGetState, apiGetPopularRaces, apiGetTrendingRaces } from "@/lib/api";
import { format } from "date-fns";
import { parseRaceDate } from "@/lib/dates";
import { Flame, Star, TrendingUp, Calendar, MapPin, MessageCircle, ThumbsUp, Share2 } from "lucide-react";
import heroImage from "@/assets/images/hero-races.jpg";

function SocialBuzzWidget() {
  const buzzItems = [
    { type: "trending", text: "Boston Marathon registrations trending 15% higher this year", time: "2h ago", likes: 342, comments: 58 },
    { type: "popular", text: "NYC Half Marathon sold out in record time - waitlist now open", time: "5h ago", likes: 891, comments: 124 },
    { type: "news", text: "Trail running participation up 23% year-over-year across the US", time: "8h ago", likes: 567, comments: 89 },
    { type: "community", text: "Chicago Marathon course changes announced for 2026 edition", time: "12h ago", likes: 234, comments: 41 },
    { type: "trending", text: "Ultra marathon participation continues to surge in western states", time: "1d ago", likes: 445, comments: 73 },
  ];

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm" data-testid="widget-social-buzz">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="font-heading font-semibold">Running Community Buzz</h3>
      </div>
      <div className="space-y-4">
        {buzzItems.map((item, i) => (
          <div key={i} className="border-b last:border-0 pb-3 last:pb-0" data-testid={`buzz-item-${i}`}>
            <div className="flex items-start gap-2">
              {item.type === "trending" && <Flame className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />}
              {item.type === "popular" && <Star className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />}
              {item.type === "news" && <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />}
              {item.type === "community" && <MessageCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{item.text}</p>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                  <span>{item.time}</span>
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {item.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {item.comments}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-3">
        Community buzz from running forums and social media
      </p>
    </div>
  );
}

function TrendingRaceRow({ race, rank }: { race: any; rank: number }) {
  return (
    <Link href={`/races/${race.slug}`} className="flex items-center gap-4 p-3 border rounded-lg hover:border-primary/50 transition-colors group" data-testid={`trending-race-${race.id}`}>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{race.name}</div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {race.city}, {race.state}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(parseRaceDate(race.date), "MMM d")}</span>
        </div>
      </div>
      <Badge variant="secondary" className="text-xs flex-shrink-0">{race.distance}</Badge>
    </Link>
  );
}

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

  const { data: popularRaces } = useQuery({
    queryKey: ["/api/races/popular"],
    queryFn: apiGetPopularRaces,
    enabled: !stateSlug,
  });

  const { data: trendingRaces } = useQuery({
    queryKey: ["/api/races/trending"],
    queryFn: apiGetTrendingRaces,
    enabled: !stateSlug,
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

        {!stateSlug && trendingRaces && trendingRaces.length > 0 && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="h-5 w-5 text-orange-500" />
                <h2 className="font-heading font-bold text-2xl" data-testid="text-trending-title">Trending Races</h2>
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              </div>
              <div className="space-y-2">
                {trendingRaces.slice(0, 5).map((race, i) => (
                  <TrendingRaceRow key={race.id} race={race} rank={i + 1} />
                ))}
              </div>
            </div>
            <div>
              <SocialBuzzWidget />
            </div>
          </div>
        )}

        {!stateSlug && popularRaces && popularRaces.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-6">
              <Star className="h-5 w-5 text-amber-500" />
              <h2 className="font-heading font-bold text-2xl" data-testid="text-popular-title">Popular Races</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularRaces.slice(0, 8).map(race => (
                <RaceCard key={race.id} race={race} />
              ))}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-12">
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
                {stateData ? `Events in ${stateData.name}` : "All Events"}
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
                  <p className="text-muted-foreground" data-testid="text-no-races">No races found for this selection.</p>
                  <Button variant="link" asChild><Link href="/races" data-testid="link-view-all-races">View all races</Link></Button>
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

        <div className="mt-12 p-8 bg-muted/30 rounded-xl border">
          <h3 className="font-heading font-bold text-xl mb-4">Explore More</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/routes" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center" data-testid="link-explore-routes">
              <div className="font-bold text-sm">Running Routes</div>
              <p className="text-xs text-muted-foreground mt-1">Discover paths and trails</p>
            </Link>
            <Link href="/books" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center" data-testid="link-explore-books">
              <div className="font-bold text-sm">Running Books</div>
              <p className="text-xs text-muted-foreground mt-1">Top reads for runners</p>
            </Link>
            <Link href="/podcasts" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center" data-testid="link-explore-podcasts">
              <div className="font-bold text-sm">Running Podcasts</div>
              <p className="text-xs text-muted-foreground mt-1">Listen and learn</p>
            </Link>
            <Link href="/influencers" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center" data-testid="link-explore-influencers">
              <div className="font-bold text-sm">Running Influencers</div>
              <p className="text-xs text-muted-foreground mt-1">Follow top runners</p>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
