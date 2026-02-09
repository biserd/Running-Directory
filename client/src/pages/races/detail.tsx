import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FavoriteButton } from "@/components/favorite-button";
import { useParams, Link } from "wouter";
import { MapPin, Calendar, Trophy, ExternalLink, CloudRain, Sun, CloudSun, Cloud, Snowflake, CloudFog, Wind, Droplets, Thermometer, Gauge, Mountain, BookOpen, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolsCTA } from "@/components/tools-cta";
import { useQuery } from "@tanstack/react-query";
import { apiGetRace, apiGetRoutes, apiGetWeather, apiGetElevationProfile, apiGetBooks, apiGetPodcasts, type WeatherData, type ElevationProfile } from "@/lib/api";
import { format } from "date-fns";
import { parseRaceDate } from "@/lib/dates";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Race } from "@shared/schema";
import { getStateSlug, getStateName } from "@/lib/states";

function getWeatherIcon(code?: number) {
  if (code === undefined) return <Sun className="h-8 w-8 text-amber-500" />;
  if (code <= 1) return <Sun className="h-8 w-8 text-amber-500" />;
  if (code <= 3) return <CloudSun className="h-8 w-8 text-blue-400" />;
  if (code <= 48) return <CloudFog className="h-8 w-8 text-gray-400" />;
  if (code <= 67) return <CloudRain className="h-8 w-8 text-blue-500" />;
  if (code <= 77) return <Snowflake className="h-8 w-8 text-blue-300" />;
  if (code <= 82) return <CloudRain className="h-8 w-8 text-blue-600" />;
  if (code <= 86) return <Snowflake className="h-8 w-8 text-blue-200" />;
  return <Cloud className="h-8 w-8 text-gray-500" />;
}

function getWeatherLabel(code?: number) {
  if (code === undefined) return "";
  if (code === 0) return "Clear skies";
  if (code <= 1) return "Mostly clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 55) return "Light rain";
  if (code <= 57) return "Freezing drizzle";
  if (code <= 65) return "Rain";
  if (code <= 67) return "Freezing rain";
  if (code <= 75) return "Snow";
  if (code <= 77) return "Snow grains";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunderstorm";
  return "Mixed conditions";
}

function WeatherCard({ weather }: { weather: WeatherData }) {
  if (weather.type === "unavailable") return null;

  const isForecast = weather.type === "forecast";

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm" data-testid="card-weather">
      <h3 className="font-heading font-semibold mb-1">Race Day Weather</h3>
      <p className="text-xs text-muted-foreground mb-4">
        {isForecast ? "Live forecast" : "Historical average for this date"}
      </p>
      <div className="flex items-center gap-4 mb-4">
        {isForecast ? getWeatherIcon(weather.weatherCode) : <Thermometer className="h-8 w-8 text-orange-500" />}
        <div>
          <div className="text-2xl font-bold" data-testid="text-weather-temp">
            {weather.tempHigh}° / {weather.tempLow}°F
          </div>
          {isForecast && weather.weatherCode !== undefined && (
            <div className="text-sm text-muted-foreground" data-testid="text-weather-condition">
              {getWeatherLabel(weather.weatherCode)}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {weather.precipProbability !== undefined && (
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">{weather.precipProbability}% rain</span>
          </div>
        )}
        {weather.precipAmount !== undefined && weather.precipAmount > 0 && (
          <div className="flex items-center gap-2">
            <CloudRain className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">{weather.precipAmount}" precip</span>
          </div>
        )}
        {weather.windSpeed !== undefined && (
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-gray-500" />
            <span className="text-muted-foreground">{weather.windSpeed} mph wind</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-3">
        Data from Open-Meteo.com
      </p>
    </div>
  );
}

function computeDifficulty(race: Race, weather?: WeatherData | null): { score: number; label: string; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  const dist = race.distance?.toLowerCase() || "";
  if (dist.includes("ultra") || dist.includes("100")) { score += 2; factors.push("Ultra distance"); }
  else if (dist.includes("marathon") && !dist.includes("half")) { score += 1.5; factors.push("Marathon distance"); }
  else if (dist.includes("half")) { score += 1; factors.push("Half marathon distance"); }
  else if (dist.includes("10k")) { score += 0.5; factors.push("10K distance"); }
  else if (dist.includes("5k")) { score += 0.3; }
  else {
    const meters = race.distanceMeters || 0;
    if (meters > 42195) { score += 2; factors.push("Ultra distance"); }
    else if (meters > 21097) { score += 1.5; factors.push("Marathon distance"); }
    else if (meters > 10000) { score += 1; }
    else { score += 0.5; }
  }

  const elev = race.elevation?.toLowerCase() || "";
  if (elev.includes("hilly") || elev.includes("mountainous")) { score += 1.5; factors.push("Hilly terrain"); }
  else if (elev.includes("rolling")) { score += 0.8; factors.push("Rolling hills"); }
  else { score += 0.2; }

  const surface = race.surface?.toLowerCase() || "";
  if (surface.includes("trail")) { score += 1; factors.push("Trail surface"); }
  else if (surface.includes("mixed")) { score += 0.5; factors.push("Mixed surface"); }
  else { score += 0.1; }

  if (weather && weather.type !== "unavailable") {
    const high = weather.tempHigh || 70;
    if (high > 85) { score += 0.5; factors.push("Hot conditions expected"); }
    else if (high < 35) { score += 0.3; factors.push("Cold conditions expected"); }
    if ((weather.windSpeed || 0) > 15) { score += 0.3; factors.push("Windy conditions"); }
    if ((weather.precipProbability || 0) > 50) { score += 0.2; factors.push("Rain likely"); }
  }

  const normalized = Math.min(5, Math.max(1, Math.round(score)));
  const labels: Record<number, string> = { 1: "Easy", 2: "Moderate", 3: "Challenging", 4: "Hard", 5: "Extreme" };

  return { score: normalized, label: labels[normalized] || "Moderate", factors };
}

const difficultyColors: Record<number, string> = {
  1: "text-green-600 bg-green-50 border-green-200",
  2: "text-blue-600 bg-blue-50 border-blue-200",
  3: "text-amber-600 bg-amber-50 border-amber-200",
  4: "text-orange-600 bg-orange-50 border-orange-200",
  5: "text-red-600 bg-red-50 border-red-200",
};

function DifficultyCard({ race, weather }: { race: Race; weather?: WeatherData | null }) {
  const { score, label, factors } = computeDifficulty(race, weather);
  const color = difficultyColors[score] || difficultyColors[3];

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm" data-testid="card-difficulty">
      <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
        <Gauge className="h-4 w-4" />
        Difficulty Rating
      </h3>
      <div className="flex items-center gap-3 mb-4">
        <div className={`text-3xl font-bold w-12 h-12 rounded-lg border flex items-center justify-center ${color}`} data-testid="text-difficulty-score">
          {score}
        </div>
        <div>
          <div className="font-semibold" data-testid="text-difficulty-label">{label}</div>
          <div className="text-xs text-muted-foreground">out of 5</div>
        </div>
        <div className="flex gap-1 ml-auto">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`w-2 h-6 rounded-full ${i <= score ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>
      {factors.length > 0 && (
        <div className="space-y-1">
          {factors.slice(0, 4).map(f => (
            <div key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ElevationProfileChart({ elevation }: { elevation: ElevationProfile }) {
  if (elevation.type === "unavailable" || !elevation.profile) return null;

  const data = elevation.profile;
  const minElev = Math.min(...data.map(d => d.elevation));
  const maxElev = Math.max(...data.map(d => d.elevation));
  const gain = maxElev - minElev;

  return (
    <section data-testid="section-elevation-profile">
      <h2 className="font-heading font-bold text-2xl mb-4 flex items-center gap-2">
        <Mountain className="h-5 w-5" />
        Area Elevation Profile
      </h2>
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex gap-6 mb-4 text-sm">
          <div>
            <span className="text-muted-foreground">Min</span>
            <span className="font-semibold ml-1" data-testid="text-elev-min">{minElev.toLocaleString()} ft</span>
          </div>
          <div>
            <span className="text-muted-foreground">Max</span>
            <span className="font-semibold ml-1" data-testid="text-elev-max">{maxElev.toLocaleString()} ft</span>
          </div>
          <div>
            <span className="text-muted-foreground">Gain</span>
            <span className="font-semibold ml-1" data-testid="text-elev-gain">{gain.toLocaleString()} ft</span>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="mile"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${v}`}
                label={{ value: "Distance", position: "insideBottom", offset: -2, fontSize: 11 }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${v} ft`}
                domain={[minElev - 20, maxElev + 20]}
                width={65}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString()} ft`, "Elevation"]}
                labelFormatter={(label: number) => `Point ${label}`}
              />
              <Area
                type="monotone"
                dataKey="elevation"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#elevGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-2">
          Elevation data from area surrounding race location. Actual course may vary.
        </p>
      </div>
    </section>
  );
}

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

  const { data: recommendedBooks } = useQuery({
    queryKey: ["/api/books", { limit: 3 }],
    queryFn: () => apiGetBooks({ limit: 3 }),
  });

  const { data: recommendedPodcasts } = useQuery({
    queryKey: ["/api/podcasts", { limit: 3 }],
    queryFn: () => apiGetPodcasts({ limit: 3 }),
  });

  const { data: weather } = useQuery({
    queryKey: ["/api/weather", race?.city, race?.state, race?.date],
    queryFn: () => apiGetWeather({
      lat: race!.lat,
      lng: race!.lng,
      date: race!.date,
      city: race!.city,
      state: race!.state,
    }),
    enabled: !!race?.date,
    staleTime: 1000 * 60 * 30,
  });

  const { data: elevation } = useQuery({
    queryKey: ["/api/elevation-profile", race?.city, race?.state],
    queryFn: () => apiGetElevationProfile({
      lat: race!.lat,
      lng: race!.lng,
      city: race!.city,
      state: race!.state,
    }),
    enabled: !!race,
    staleTime: 1000 * 60 * 60,
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
            { label: getStateName(race.state), href: `/state/${getStateSlug(race.state)}` },
            { label: race.name }
          ]} />
          
          <div className="mt-8 flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
               <div className="flex gap-2 mb-4">
                 <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20" data-testid="badge-race-distance">{race.distance}</Badge>
                 <Badge variant="outline" data-testid="badge-race-surface">{race.surface}</Badge>
               </div>
               <div className="flex items-start gap-3">
                 <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-4 flex-1" data-testid="text-race-name">{race.name}</h1>
                 <FavoriteButton itemType="race" itemId={race.id} className="mt-2" />
               </div>
               <div className="flex flex-wrap gap-6 text-muted-foreground">
                 <div className="flex items-center gap-2">
                   <Calendar className="h-5 w-5" />
                   <span className="font-medium text-foreground" data-testid="text-race-date">{format(parseRaceDate(race.date), "MMMM d, yyyy")}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <MapPin className="h-5 w-5" />
                   <span className="font-medium text-foreground" data-testid="text-race-location">{race.city}, {getStateName(race.state)}</span>
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
                  <a href={race.registrationUrl || race.website!} target="_blank" rel="noopener noreferrer nofollow">
                    Register Now <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
              {race.website && (
                <Button variant="outline" className="w-full" asChild data-testid="button-website">
                  <a href={race.website} target="_blank" rel="noopener noreferrer nofollow">
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
              <p data-testid="text-race-description">{race.description || `Experience one of the premier ${race.distance} events in ${getStateName(race.state)}. The ${race.name} offers a ${race.elevation.toLowerCase()} course through the scenic streets of ${race.city}.`}</p>
            </div>
          </section>
          
          {elevation && elevation.type === "available" ? (
            <ElevationProfileChart elevation={elevation} />
          ) : (
            <section>
              <h2 className="font-heading font-bold text-2xl mb-4">Course Profile</h2>
              <div className="bg-muted h-64 rounded-xl flex items-center justify-center border border-dashed animate-pulse">
                <p className="text-muted-foreground">Loading elevation data...</p>
              </div>
            </section>
          )}

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

          <DifficultyCard race={race} weather={weather} />
          
          {weather && weather.type !== "unavailable" && (
            <WeatherCard weather={weather} />
          )}

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

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold mb-4">Explore {getStateName(race.state)}</h3>
            <div className="space-y-3">
              <Link href={`/state/${getStateSlug(race.state)}`} className="block p-3 border rounded-lg hover:border-primary/50 transition-colors text-sm" data-testid="link-state-hub">
                <div className="font-semibold">{getStateName(race.state)} Running Hub</div>
                <div className="text-xs text-muted-foreground mt-0.5">Races, routes & more</div>
              </Link>
              <Link href={`/races/state/${getStateSlug(race.state)}`} className="block p-3 border rounded-lg hover:border-primary/50 transition-colors text-sm" data-testid="link-state-races">
                <div className="font-semibold">All {getStateName(race.state)} Races</div>
                <div className="text-xs text-muted-foreground mt-0.5">Browse the full calendar</div>
              </Link>
              {race.date && (
                <Link href={`/races/year/${race.date.split("-")[0]}/month/${race.date.split("-")[1]}`} className="block p-3 border rounded-lg hover:border-primary/50 transition-colors text-sm" data-testid="link-month-calendar">
                  <div className="font-semibold">{new Date(race.date + "T12:00:00").toLocaleString("en-US", { month: "long", year: "numeric" })} Races</div>
                  <div className="text-xs text-muted-foreground mt-0.5">See all races this month</div>
                </Link>
              )}
              <Link href="/collections" className="block p-3 border rounded-lg hover:border-primary/50 transition-colors text-sm" data-testid="link-collections">
                <div className="font-semibold">Race Collections</div>
                <div className="text-xs text-muted-foreground mt-0.5">Curated "best of" lists</div>
              </Link>
            </div>
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

          {recommendedBooks && recommendedBooks.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Recommended Reading
              </h3>
              <div className="space-y-4">
                {recommendedBooks.map(book => (
                  <Link key={book.id} href={`/books/${book.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-recommended-book-${book.id}`}>
                    <div className="font-semibold">{book.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                      <span>{book.author}</span>
                      {book.category && (
                        <>
                          <span>·</span>
                          <span>{book.category}</span>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {recommendedPodcasts && recommendedPodcasts.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                <Headphones className="h-4 w-4" />
                Listen While You Train
              </h3>
              <div className="space-y-4">
                {recommendedPodcasts.map(podcast => (
                  <Link key={podcast.id} href={`/podcasts/${podcast.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-recommended-podcast-${podcast.id}`}>
                    <div className="font-semibold">{podcast.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{podcast.host}</span>
                      {podcast.category && (
                        <>
                          <span>·</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{podcast.category}</Badge>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </Layout>
  );
}
