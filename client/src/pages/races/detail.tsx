import { useState } from "react";
import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import heroImage from "@/assets/images/hero-race-detail.jpg";
import { FavoriteButton } from "@/components/favorite-button";
import { useParams, Link, useLocation } from "wouter";
import {
  MapPin, Calendar, Trophy, ExternalLink, CloudRain, Sun, CloudSun, Cloud, Snowflake, CloudFog,
  Wind, Droplets, Thermometer, Gauge, Mountain, BookOpen, Headphones, DollarSign, AlarmClock,
  Users, Heart, Zap, PartyPopper, Bell, BellRing, Scale, Check, Map as MapIcon, Building2, ShieldCheck,
  Sparkles, Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToolsCTA } from "@/components/tools-cta";
import { ReviewSection } from "@/components/review-section";
import { ScoreBlock } from "@/components/score-block";
import { BestForBadges } from "@/components/best-for-badges";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiGetRace, apiGetRoutes, apiGetWeather, apiGetElevationProfile, apiGetBooks, apiGetPodcasts,
  apiSimilarRaces, apiSubmitRaceClaim, apiTrackOutbound,
  type WeatherData, type ElevationProfile,
} from "@/lib/api";
import { format } from "date-fns";
import { parseRaceDate } from "@/lib/dates";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Race, RaceAlert } from "@shared/schema";
import { getStateSlug, getStateName } from "@/lib/states";
import { useAuth } from "@/hooks/use-auth";
import { setPendingAction } from "@/lib/pending-action";
import { useToast } from "@/hooks/use-toast";
import { useCompareCart } from "@/hooks/use-compare-cart";
import { cn } from "@/lib/utils";

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

function fmtPrice(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `$${min}–$${max}`;
  return `$${min ?? max}`;
}

function WeatherCard({ weather }: { weather: WeatherData }) {
  if (weather.type === "unavailable") return null;
  const isForecast = weather.type === "forecast";
  return (
    <div className="bg-gradient-to-b from-sky-50/50 to-transparent border border-t-4 border-sky-400 rounded-xl p-6 shadow-sm" data-testid="card-weather">
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
          <div className="flex items-center gap-2"><Droplets className="h-4 w-4 text-blue-500" /><span className="text-muted-foreground">{weather.precipProbability}% rain</span></div>
        )}
        {weather.precipAmount !== undefined && weather.precipAmount > 0 && (
          <div className="flex items-center gap-2"><CloudRain className="h-4 w-4 text-blue-500" /><span className="text-muted-foreground">{weather.precipAmount}" precip</span></div>
        )}
        {weather.windSpeed !== undefined && (
          <div className="flex items-center gap-2"><Wind className="h-4 w-4 text-gray-500" /><span className="text-muted-foreground">{weather.windSpeed} mph wind</span></div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-3">Data from Open-Meteo.com</p>
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
const difficultyCardStyles: Record<number, string> = {
  1: "border-t-4 border-green-500 bg-gradient-to-b from-green-50/50 to-transparent",
  2: "border-t-4 border-blue-500 bg-gradient-to-b from-blue-50/50 to-transparent",
  3: "border-t-4 border-amber-500 bg-gradient-to-b from-amber-50/50 to-transparent",
  4: "border-t-4 border-orange-500 bg-gradient-to-b from-orange-50/50 to-transparent",
  5: "border-t-4 border-red-500 bg-gradient-to-b from-red-50/50 to-transparent",
};

function DifficultyCard({ race, weather }: { race: Race; weather?: WeatherData | null }) {
  const { score, label, factors } = computeDifficulty(race, weather);
  const color = difficultyColors[score] || difficultyColors[3];
  return (
    <div className={`border rounded-xl p-6 shadow-sm ${difficultyCardStyles[score] || difficultyCardStyles[3]}`} data-testid="card-difficulty">
      <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Gauge className="h-4 w-4" />Difficulty Rating</h3>
      <div className="flex items-center gap-3 mb-4">
        <div className={`text-3xl font-bold w-12 h-12 rounded-lg border flex items-center justify-center ${color}`} data-testid="text-difficulty-score">{score}</div>
        <div><div className="font-semibold" data-testid="text-difficulty-label">{label}</div><div className="text-xs text-muted-foreground">out of 5</div></div>
        <div className="flex gap-1 ml-auto">{[1, 2, 3, 4, 5].map(i => (<div key={i} className={`w-2 h-6 rounded-full ${i <= score ? "bg-primary" : "bg-muted"}`} />))}</div>
      </div>
      {factors.length > 0 && (
        <div className="space-y-1">
          {factors.slice(0, 4).map(f => (<div key={f} className="text-xs text-muted-foreground flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-muted-foreground/50" />{f}</div>))}
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
      <h2 className="font-heading font-bold text-2xl mb-4 flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
        <Mountain className="h-5 w-5" />Area Elevation Profile
      </h2>
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex gap-6 mb-4 text-sm">
          <div><span className="text-muted-foreground">Min</span><span className="font-semibold ml-1" data-testid="text-elev-min">{minElev.toLocaleString()} ft</span></div>
          <div><span className="text-muted-foreground">Max</span><span className="font-semibold ml-1" data-testid="text-elev-max">{maxElev.toLocaleString()} ft</span></div>
          <div><span className="text-muted-foreground">Gain</span><span className="font-semibold ml-1" data-testid="text-elev-gain">{gain.toLocaleString()} ft</span></div>
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
              <XAxis dataKey="mile" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}`} label={{ value: "Distance", position: "insideBottom", offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v} ft`} domain={[minElev - 20, maxElev + 20]} width={65} />
              <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ft`, "Elevation"]} labelFormatter={(label: number) => `Point ${label}`} />
              <Area type="monotone" dataKey="elevation" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#elevGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-2">Elevation data from area surrounding race location. Actual course may vary.</p>
      </div>
    </section>
  );
}

function ClaimRaceCard({ race }: { race: Race }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const res = await apiSubmitRaceClaim(race.slug, { claimerEmail: email, claimerName: name || undefined, claimerRole: role || undefined, message: message || undefined });
      toast({ title: "Claim submitted", description: res.message });
      setDone(true);
      // Redirect to the for-organizers hub so the claimer can see what's available next
      setTimeout(() => setLocation("/for-organizers"), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Please try again.";
      toast({ title: "Couldn't submit claim", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-t-4 border-blue-500 rounded-xl p-6 shadow-sm" data-testid="card-claim">
      <h3 className="font-heading font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-500" />Are you the organizer?</h3>
      <p className="text-sm text-muted-foreground mb-3">Claim this race to update details, fix data, set pricing, and reach our runners.</p>
      {done ? (
        <div className="space-y-3">
          <p className="text-sm text-emerald-600 font-medium" data-testid="text-claim-success">Claim received — taking you to the organizer hub…</p>
          <Button asChild variant="outline" size="sm" className="w-full" data-testid="button-claim-organizer-hub">
            <Link href="/for-organizers">Open organizer hub</Link>
          </Button>
        </div>
      ) : !open ? (
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setOpen(true)} data-testid="button-claim-open">Claim this race</Button>
          <Button asChild variant="ghost" size="sm" className="w-full" data-testid="button-organizer-info">
            <Link href="/for-organizers">Learn about organizer tools →</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="claim-email" className="text-xs">Your email *</Label>
            <Input id="claim-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} data-testid="input-claim-email" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="claim-name" className="text-xs">Name</Label>
              <Input id="claim-name" value={name} onChange={e => setName(e.target.value)} data-testid="input-claim-name" />
            </div>
            <div>
              <Label htmlFor="claim-role" className="text-xs">Role</Label>
              <Input id="claim-role" placeholder="Race director" value={role} onChange={e => setRole(e.target.value)} data-testid="input-claim-role" />
            </div>
          </div>
          <div>
            <Label htmlFor="claim-message" className="text-xs">Message (optional)</Label>
            <Textarea id="claim-message" rows={3} value={message} onChange={e => setMessage(e.target.value)} data-testid="textarea-claim-message" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !email} size="sm" data-testid="button-claim-submit">{submitting ? "Submitting…" : "Submit claim"}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} data-testid="button-claim-cancel">Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

function CompareToggle({ raceId }: { raceId: number }) {
  const { has, toggle, isFull } = useCompareCart();
  const { toast } = useToast();
  const inCompare = has(raceId);
  const onClick = () => {
    if (!inCompare && isFull) {
      toast({ title: "Compare list is full", description: "You can compare up to 4 races.", variant: "destructive" });
      return;
    }
    toggle(raceId);
    toast({ title: inCompare ? "Removed from compare" : "Added to compare" });
  };
  return (
    <Button variant="outline" className="w-full bg-white/10 text-white border-white/30 hover:bg-white/20" onClick={onClick} data-testid="button-detail-compare">
      {inCompare ? <><Check className="mr-2 h-4 w-4" /> Added to compare</> : <><Scale className="mr-2 h-4 w-4" /> Add to compare</>}
    </Button>
  );
}

function AlertToggle({ race }: { race: Race }) {
  const { user, openLogin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const { data: alerts } = useQuery<RaceAlert[]>({ queryKey: ["/api/alerts"], enabled: !!user, staleTime: 60_000 });
  const myAlert = alerts?.find(a => a.raceId === race.id);

  const onClick = async () => {
    if (!user) {
      setPendingAction({ type: "race-alert", payload: { raceId: race.id, alertType: "price-drop" } });
      toast({ title: "Sign in to set this alert", description: "We'll set your alert as soon as you're signed in." });
      openLogin();
      return;
    }
    if (pending) return;
    setPending(true);
    try {
      if (myAlert) {
        const res = await fetch(`/api/alerts/${myAlert.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast({ title: "Alert removed" });
      } else {
        const res = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raceId: race.id, alertType: "price-drop" }) });
        if (!res.ok) throw new Error();
        toast({ title: "Alert set", description: `We'll notify you about ${race.name}.` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    } catch {
      toast({ title: "Couldn't update alert", variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant="outline" className="w-full bg-white/10 text-white border-white/30 hover:bg-white/20" onClick={onClick} disabled={pending} data-testid="button-detail-alert">
      {myAlert ? <><BellRing className="mr-2 h-4 w-4" /> Alert set</> : <><Bell className="mr-2 h-4 w-4" /> Notify me</>}
    </Button>
  );
}

function SimilarRacesGrid({ slug, currentId }: { slug: string; currentId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/races", slug, "similar"],
    queryFn: () => apiSimilarRaces(slug, 6),
    enabled: !!slug,
  });
  const races = (data || []).filter(r => r.id !== currentId).slice(0, 6);
  if (isLoading) return <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>;
  if (races.length === 0) return <p className="text-sm text-muted-foreground" data-testid="text-no-similar">No similar races found yet — try the calendar for more options.</p>;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="grid-similar-races">
      {races.map(r => (
        <Link key={r.id} href={`/races/${r.slug}`} data-testid={`similar-race-${r.id}`}>
          <Card className="h-full hover-elevate cursor-pointer">
            <CardContent className="p-4">
              <Badge variant="secondary" className="text-[10px] uppercase mb-2">{r.distance}</Badge>
              <div className="font-semibold leading-tight line-clamp-2">{r.name}</div>
              <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(parseRaceDate(r.date), "MMM d, yyyy")}</div>
                <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city}, {r.state}</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function RaceDetail() {
  const { slug } = useParams();
  const { toast } = useToast();

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
    queryFn: () => apiGetWeather({ lat: race!.lat, lng: race!.lng, date: race!.date, city: race!.city, state: race!.state }),
    enabled: !!race?.date,
    staleTime: 1000 * 60 * 30,
  });

  const { data: elevation } = useQuery({
    queryKey: ["/api/elevation-profile", race?.city, race?.state],
    queryFn: () => apiGetElevationProfile({ lat: race!.lat, lng: race!.lng, city: race!.city, state: race!.state }),
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

  const price = fmtPrice(race.priceMin, race.priceMax);
  const handleRegister = (e: React.MouseEvent) => {
    const url = race.registrationUrl || race.website;
    if (!url) return;
    e.preventDefault();
    void apiTrackOutbound({ raceId: race.id, destination: race.registrationUrl ? "registration" : "website", targetUrl: url });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Layout>
      {/* Section 1: Hero */}
      <div className="relative">
        <div className="absolute inset-0 z-0">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
        </div>
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="text-white/80 [&_a]:text-white/80 [&_a:hover]:text-white [&_span]:text-white [&_svg]:text-white/50">
            <Breadcrumbs items={[
              { label: "Races", href: "/races" },
              { label: getStateName(race.state), href: `/state/${getStateSlug(race.state)}` },
              { label: race.name }
            ]} />
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur font-semibold" data-testid="badge-race-distance">{race.distance}</Badge>
                <Badge variant="outline" className="bg-white/20 text-white border-white/30 backdrop-blur" data-testid="badge-race-surface">{race.surface}</Badge>
                {race.bostonQualifier && <Badge variant="outline" className="bg-white/20 text-white border-white/30 backdrop-blur">BQ</Badge>}
                {race.isTurkeyTrot && <Badge variant="outline" className="bg-white/20 text-white border-white/30 backdrop-blur">🦃 Turkey Trot</Badge>}
                {race.charity && <Badge variant="outline" className="bg-white/20 text-white border-white/30 backdrop-blur">Charity</Badge>}
              </div>
              <div className="flex items-start gap-3">
                <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-4 flex-1 text-white drop-shadow-lg" data-testid="text-race-name">{race.name}</h1>
                <FavoriteButton itemType="race" itemId={race.id} className="mt-2" />
              </div>
              <div className="flex flex-wrap gap-6 text-white/80">
                <div className="flex items-center gap-2"><Calendar className="h-5 w-5" /><span className="font-medium text-white" data-testid="text-race-date">{format(parseRaceDate(race.date), "MMMM d, yyyy")}</span></div>
                <div className="flex items-center gap-2"><MapPin className="h-5 w-5" /><span className="font-medium text-white" data-testid="text-race-location">{race.city}, {getStateName(race.state)}</span></div>
                <div className="flex items-center gap-2"><Trophy className="h-5 w-5" /><span className="font-medium text-white" data-testid="text-race-elevation">{race.elevation} Course</span></div>
              </div>
            </div>

            <div className="flex flex-col gap-3 min-w-[220px]">
              {(race.registrationUrl || race.website) && (
                <Button size="lg" className="w-full font-semibold" onClick={handleRegister} data-testid="button-register">
                  Register Now <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              )}
              <CompareToggle raceId={race.id} />
              <AlertToggle race={race} />
              {race.website && (
                <Button variant="outline" className="w-full bg-white/10 text-white border-white/30 hover:bg-white/20" asChild data-testid="button-website">
                  <a href={race.website} target="_blank" rel="noopener noreferrer nofollow" onClick={() => apiTrackOutbound({ raceId: race.id, destination: "website", targetUrl: race.website! })}>
                    Visit Website <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Quick decision strip */}
      <div className="border-b bg-muted/40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="font-heading font-bold text-xl flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Decision scores</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Six 0–100 scores telling you, at a glance, who this race is for.</p>
            </div>
            <Link href="/race-shopper" className="text-xs text-primary hover:underline" data-testid="link-shopper-from-detail">Use the Race Shopper →</Link>
          </div>
          <ScoreBlock race={race} />
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Section 3: Best for badges */}
          <section data-testid="section-best-for">
            <h2 className="font-heading font-bold text-2xl mb-3 border-l-4 border-emerald-500 pl-3">Best for</h2>
            <BestForBadges race={race} />
          </section>

          {/* Section 4: About */}
          <section>
            <h2 className="font-heading font-bold text-2xl mb-4 border-l-4 border-blue-500 pl-3">About the Race</h2>
            <div className="prose max-w-none text-muted-foreground">
              <p data-testid="text-race-description">{race.description || `Experience one of the premier ${race.distance} events in ${getStateName(race.state)}. The ${race.name} offers a ${race.elevation.toLowerCase()} course through the scenic streets of ${race.city}.`}</p>
            </div>
          </section>

          {/* Section 5: Course profile / elevation */}
          {elevation && elevation.type === "available" ? (
            <ElevationProfileChart elevation={elevation} />
          ) : (
            <section>
              <h2 className="font-heading font-bold text-2xl mb-4 border-l-4 border-emerald-500 pl-3 flex items-center gap-2"><Mountain className="h-5 w-5" />Course Profile</h2>
              <div className="bg-muted h-32 rounded-xl flex items-center justify-center border border-dashed">
                <p className="text-muted-foreground text-sm" data-testid="text-elevation-unavailable">Course profile data unavailable for this race.</p>
              </div>
            </section>
          )}

          {/* Section 6: Course features */}
          <section data-testid="section-course-features">
            <h2 className="font-heading font-bold text-2xl mb-4 border-l-4 border-stone-500 pl-3 flex items-center gap-2"><MapIcon className="h-5 w-5" />Course features</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <FeatureRow label="Terrain" value={race.terrain || "Not stated"} />
              <FeatureRow label="Surface" value={race.surface || "Not stated"} />
              <FeatureRow label="Elevation gain" value={race.elevationGainM != null ? `${race.elevationGainM}m` : "Not measured"} />
              <FeatureRow label="Course type" value={race.courseType || "Not stated"} />
              <FeatureRow label="Field size" value={race.fieldSize != null ? `${race.fieldSize.toLocaleString()} runners` : "Unknown"} />
              <FeatureRow label="Boston qualifier" value={race.bostonQualifier == null ? "Unknown" : (race.bostonQualifier ? "Yes" : "No")} />
              {race.courseMapUrl ? (
                <a href={race.courseMapUrl} target="_blank" rel="noopener noreferrer nofollow" className="rounded-lg border p-3 hover:border-primary/50 transition-colors" onClick={() => apiTrackOutbound({ raceId: race.id, destination: "course-map", targetUrl: race.courseMapUrl! })} data-testid="link-course-map">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Course map</div>
                  <div className="font-semibold text-sm flex items-center gap-1.5 mt-0.5">View map <ExternalLink className="h-3 w-3" /></div>
                </a>
              ) : (
                <div className="rounded-lg border border-dashed p-3 bg-muted/30" data-testid="placeholder-course-map">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Course map</div>
                  <div className="font-medium text-sm text-muted-foreground italic mt-0.5">Not yet published</div>
                </div>
              )}
              {race.elevationProfileUrl ? (
                <a href={race.elevationProfileUrl} target="_blank" rel="noopener noreferrer nofollow" className="rounded-lg border p-3 hover:border-primary/50 transition-colors" onClick={() => apiTrackOutbound({ raceId: race.id, destination: "elevation", targetUrl: race.elevationProfileUrl! })} data-testid="link-elevation-profile-url">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Elevation profile</div>
                  <div className="font-semibold text-sm flex items-center gap-1.5 mt-0.5">View profile <ExternalLink className="h-3 w-3" /></div>
                </a>
              ) : (
                <div className="rounded-lg border border-dashed p-3 bg-muted/30" data-testid="placeholder-elevation-profile">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Elevation profile</div>
                  <div className="font-medium text-sm text-muted-foreground italic mt-0.5">{race.elevationGainM != null ? "Profile not published" : "Not measured"}</div>
                </div>
              )}
            </div>
          </section>

          {/* Section 7: Accessibility & inclusion */}
          <section data-testid="section-accessibility">
            <h2 className="font-heading font-bold text-2xl mb-4 border-l-4 border-pink-500 pl-3 flex items-center gap-2"><Users className="h-5 w-5" />Accessibility & inclusion</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <AccessibilityRow label="Walker-friendly" value={race.walkerFriendly} />
              <AccessibilityRow label="Stroller-friendly" value={race.strollerFriendly} />
              <AccessibilityRow label="Dog-friendly" value={race.dogFriendly} />
              <AccessibilityRow label="Kids race" value={race.kidsRace} />
            </div>
          </section>

          {/* Section 8: Vibe & charity */}
          <section data-testid="section-vibe">
            <h2 className="font-heading font-bold text-2xl mb-4 border-l-4 border-violet-500 pl-3 flex items-center gap-2"><PartyPopper className="h-5 w-5" />Vibe & community</h2>
            {race.vibeTags && race.vibeTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {race.vibeTags.map(t => (<Badge key={t} variant="secondary" className="capitalize" data-testid={`vibe-tag-${t}`}>{t.replace(/-/g, " ")}</Badge>))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-3" data-testid="text-vibe-unknown">We don't have vibe tags for this race yet — organizers can claim the listing to add them.</p>
            )}
            {race.charity ? (
              <div className="text-sm text-muted-foreground" data-testid="text-charity">
                <Heart className="h-4 w-4 inline-block mr-1.5 text-rose-500" />Charity race{race.charityPartner ? ` benefiting ${race.charityPartner}` : ""}.
              </div>
            ) : (
              <div className="text-xs text-muted-foreground/70" data-testid="text-no-charity">No charity partner listed.</div>
            )}
          </section>

          {/* Section 9: History & past results */}
          <section data-testid="section-history">
            <h2 className="font-heading font-bold text-2xl mb-4 border-l-4 border-amber-500 pl-3 flex items-center gap-2"><Trophy className="h-5 w-5" />History & past results</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border p-3" data-testid="history-years-running">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Years running</div>
                <div className="font-semibold text-sm mt-0.5">{race.yearsRunning ? `${race.yearsRunning} year${race.yearsRunning === 1 ? "" : "s"}` : "Unknown — claim to add"}</div>
              </div>
              <div className="rounded-lg border p-3" data-testid="history-recurrence">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Recurrence</div>
                <div className="font-semibold text-sm mt-0.5 capitalize">{race.recurrencePattern || "Annual (assumed)"}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Past finisher times and year-over-year participation will appear here once the organizer publishes them.
            </p>
          </section>

          {/* Section 10: Reviews */}
          <div id="reviews" className="scroll-mt-24">
            <ReviewSection itemType="race" itemId={race.id} />
          </div>

          {/* Section 11: Similar races */}
          <section data-testid="section-similar-races">
            <h2 className="font-heading font-bold text-2xl mb-4 border-l-4 border-orange-500 pl-3 flex items-center gap-2"><Lightbulb className="h-5 w-5" />Similar races worth a look</h2>
            <SimilarRacesGrid slug={race.slug} currentId={race.id} />
            {(() => {
              const distMap: Record<string, string> = {
                "5K": "5k-races",
                "10K": "10k-races",
                "Half Marathon": "half-marathons",
                "Marathon": "marathons",
              };
              const distSlug = race.surface === "Trail"
                ? "trail-races"
                : (race.distance && distMap[race.distance]);
              const citySlug = race.citySlug;
              if (!distSlug || !citySlug || !race.state) return null;
              const metroSlug = `${citySlug}-${race.state.toLowerCase()}`;
              return (
                <p className="text-sm text-muted-foreground mt-4">
                  More like this:{" "}
                  <Link
                    href={`/${metroSlug}/${distSlug}`}
                    className="text-primary hover:underline font-medium"
                    data-testid="link-more-in-metro"
                  >
                    All {race.distance || race.surface} races in {race.city}, {race.state}
                  </Link>
                </p>
              );
            })()}
          </section>

          {/* Section 12: Tools CTA */}
          <section><ToolsCTA /></section>
        </div>

        <aside className="space-y-8">
          {/* Section 12: Logistics */}
          <div className="bg-card border border-t-4 border-blue-500 rounded-xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold mb-4">Race Logistics</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Start Time</span><span className="font-medium" data-testid="text-start-time">{race.startTime || "TBA"}</span></li>
              <li className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Time Limit</span><span className="font-medium" data-testid="text-time-limit">{race.timeLimit || "None"}</span></li>
              <li className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Surface</span><span className="font-medium">{race.surface}</span></li>
              <li className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Packet pickup</span><span className="font-medium text-right max-w-[60%]" data-testid="text-packet-pickup">{race.packetPickup || <span className="text-muted-foreground italic">Not provided</span>}</span></li>
              <li className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Parking</span><span className="font-medium text-right max-w-[60%]" data-testid="text-parking">{race.parkingNotes || <span className="text-muted-foreground italic">Not provided</span>}</span></li>
              <li className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Transit-friendly</span><span className="font-medium" data-testid="text-transit-friendly">{race.transitFriendly == null ? <span className="text-muted-foreground italic">Unknown</span> : (race.transitFriendly ? "Yes" : "No")}</span></li>
              <li className="flex justify-between pt-2"><span className="text-muted-foreground">Boston Qualifier</span><span className={`font-medium ${race.bostonQualifier === true ? "text-green-600" : "text-muted-foreground"}`} data-testid="text-bq">{race.bostonQualifier == null ? <span className="text-muted-foreground italic">Unknown</span> : (race.bostonQualifier ? "Yes" : "No")}</span></li>
            </ul>
          </div>

          {/* Section 13: Pricing & registration */}
          <div className="bg-card border border-t-4 border-amber-500 rounded-xl p-6 shadow-sm" data-testid="card-pricing">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><DollarSign className="h-4 w-4" />Pricing & registration</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between"><span className="text-muted-foreground">Entry fee</span><span className="font-medium" data-testid="text-entry-fee">{price || "—"}</span></li>
              {race.registrationDeadline && (
                <li className="flex justify-between"><span className="text-muted-foreground">Closes</span><span className="font-medium" data-testid="text-deadline">{format(parseRaceDate(race.registrationDeadline), "MMM d, yyyy")}</span></li>
              )}
              {race.nextPriceIncreaseAt && (
                <li className="flex justify-between text-amber-700"><span className="inline-flex items-center gap-1"><AlarmClock className="h-3.5 w-3.5" />Price hike</span><span className="font-semibold" data-testid="text-next-price-hike">{format(parseRaceDate(race.nextPriceIncreaseAt), "MMM d")}{race.nextPriceIncreaseAmount ? ` (+$${race.nextPriceIncreaseAmount})` : ""}</span></li>
              )}
              <li className="border-t pt-2"><span className="text-muted-foreground block text-xs mb-1">Refund policy</span><span data-testid="text-refund-policy">{race.refundPolicy || <span className="text-muted-foreground italic">Not stated by organizer</span>}</span></li>
              <li className="border-t pt-2"><span className="text-muted-foreground block text-xs mb-1">Deferral policy</span><span data-testid="text-deferral-policy">{race.deferralPolicy || <span className="text-muted-foreground italic">Not stated by organizer</span>}</span></li>
            </ul>
          </div>

          {/* Section 14: Difficulty */}
          <DifficultyCard race={race} weather={weather} />

          {/* Section 15: Weather */}
          <div id="weather" className="scroll-mt-24">
            {weather && weather.type !== "unavailable" ? (
              <WeatherCard weather={weather} />
            ) : (
              <div className="bg-gradient-to-b from-sky-50/50 to-transparent border border-t-4 border-sky-400 rounded-xl p-6 shadow-sm" data-testid="card-weather-unavailable">
                <h3 className="font-heading font-semibold mb-1">Race Day Weather</h3>
                <p className="text-xs text-muted-foreground">Weather data isn't available for this race yet — try checking back closer to race day.</p>
              </div>
            )}
          </div>

          {/* Section 16: Organizer / Claim */}
          {race.organizerId ? (
            <div className="bg-card border border-t-4 border-indigo-500 rounded-xl p-6 shadow-sm" data-testid="card-organizer">
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Building2 className="h-4 w-4" />Organizer</h3>
              <p className="text-sm text-muted-foreground mb-3">This race is run by an organizer in our directory.</p>
              <Button variant="outline" asChild className="w-full" data-testid="button-organizer">
                <Link href={`/organizers`}><Building2 className="mr-2 h-4 w-4" /> See all organizers</Link>
              </Button>
              {!race.isClaimed && <div className="mt-4"><ClaimRaceCard race={race} /></div>}
            </div>
          ) : (
            <ClaimRaceCard race={race} />
          )}

          {/* Section 17: Data source */}
          <div className="bg-card border border-t-4 border-emerald-500 rounded-xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold mb-4">Data Source</h3>
            <ul className="space-y-3 text-sm">
              {race.lastSeenAt && (<li className="flex justify-between"><span className="text-muted-foreground">Last Updated</span><span className="font-medium" data-testid="text-last-updated">{format(new Date(race.lastSeenAt), "MMM d, yyyy")}</span></li>)}
              {race.qualityScore != null && (<li className="flex justify-between"><span className="text-muted-foreground">Data Quality</span><span className="font-medium" data-testid="text-quality-score">{race.qualityScore >= 80 ? "High" : race.qualityScore >= 50 ? "Good" : "Basic"}</span></li>)}
              {race.distanceLabel && race.distanceLabel !== race.distance && (<li className="flex justify-between"><span className="text-muted-foreground">Distance</span><span className="font-medium" data-testid="text-distance-label">{race.distanceLabel}</span></li>)}
            </ul>
            <p className="text-xs text-muted-foreground mt-4">Race data sourced from RunSignUp and verified public records.</p>
          </div>

          {/* Section 18: Explore the area */}
          <div className="bg-card border border-t-4 border-amber-500 rounded-xl p-6 shadow-sm">
            <h3 className="font-heading font-semibold mb-4">Explore {getStateName(race.state)}</h3>
            <div className="space-y-3">
              <Link href={`/state/${getStateSlug(race.state)}`} className="block p-3 border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-colors text-sm" data-testid="link-state-hub"><div className="font-semibold">{getStateName(race.state)} Running Hub</div><div className="text-xs text-muted-foreground mt-0.5">Races, routes & more</div></Link>
              <Link href={`/races/state/${getStateSlug(race.state)}`} className="block p-3 border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-colors text-sm" data-testid="link-state-races"><div className="font-semibold">All {getStateName(race.state)} Races</div><div className="text-xs text-muted-foreground mt-0.5">Browse the full calendar</div></Link>
              {race.date && (<Link href={`/races/year/${race.date.split("-")[0]}/month/${race.date.split("-")[1]}`} className="block p-3 border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-colors text-sm" data-testid="link-month-calendar"><div className="font-semibold">{new Date(race.date + "T12:00:00").toLocaleString("en-US", { month: "long", year: "numeric" })} Races</div><div className="text-xs text-muted-foreground mt-0.5">See all races this month</div></Link>)}
              <Link href="/collections" className="block p-3 border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-colors text-sm" data-testid="link-collections"><div className="font-semibold">Race Collections</div><div className="text-xs text-muted-foreground mt-0.5">Curated "best of" lists</div></Link>
            </div>
          </div>

          {nearbyRoutes && nearbyRoutes.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold mb-4">Nearby Routes</h3>
              <div className="space-y-4">
                {nearbyRoutes.map(route => (
                  <Link key={route.id} href={`/routes/${route.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-nearby-route-${route.id}`}>
                    <div className="font-semibold">{route.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-2"><span>{route.distance} mi</span><span>·</span><span>{route.type}</span></div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {recommendedBooks && recommendedBooks.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><BookOpen className="h-4 w-4" />Recommended Reading</h3>
              <div className="space-y-4">
                {recommendedBooks.map(book => (
                  <Link key={book.id} href={`/books/${book.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-recommended-book-${book.id}`}>
                    <div className="font-semibold">{book.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-2"><span>{book.author}</span>{book.category && (<><span>·</span><span>{book.category}</span></>)}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {recommendedPodcasts && recommendedPodcasts.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Headphones className="h-4 w-4" />Listen While You Train</h3>
              <div className="space-y-4">
                {recommendedPodcasts.map(podcast => (
                  <Link key={podcast.id} href={`/podcasts/${podcast.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-recommended-podcast-${podcast.id}`}>
                    <div className="font-semibold">{podcast.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2"><span>{podcast.host}</span>{podcast.category && (<><span>·</span><Badge variant="outline" className="text-[10px] px-1.5 py-0">{podcast.category}</Badge></>)}</div>
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

function FeatureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3" data-testid={`feature-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm mt-0.5">{value}</div>
    </div>
  );
}

function AccessibilityRow({ label, value }: { label: string; value: boolean | null | undefined }) {
  const dim = value == null;
  const yes = value === true;
  return (
    <div className={cn("rounded-lg border p-3 flex items-center justify-between gap-3", dim && "opacity-60")} data-testid={`access-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
      <div className="text-sm font-medium">{label}</div>
      <div className={cn("text-xs font-bold uppercase tracking-wider", yes ? "text-emerald-600" : dim ? "text-muted-foreground" : "text-muted-foreground")}>
        {value == null ? "Unknown" : yes ? "Yes" : "No"}
      </div>
    </div>
  );
}
