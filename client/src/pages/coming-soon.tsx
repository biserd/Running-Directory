import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Calendar, Sparkles, ArrowRight, MapPin, DollarSign, Users, Trophy, Heart, Zap, Building2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ComingSoonProps {
  title: string;
  description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <Layout>
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-7 w-7" />
              </div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3" data-testid="text-coming-soon-title">{title}</h1>
              <p className="text-muted-foreground mb-8" data-testid="text-coming-soon-description">{description}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild data-testid="button-browse-races">
                  <Link href="/races">
                    <Calendar className="mr-2 h-4 w-4" />
                    Browse all races
                  </Link>
                </Button>
                <Button variant="outline" asChild data-testid="button-go-home">
                  <Link href="/">
                    Home <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-8">We're building this out — the underlying data and scoring are already live.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}

const SHOPPER_GOALS: Array<{ slug: string; title: string; blurb: string; icon: React.ReactNode; href: string }> = [
  { slug: "beginner", title: "First-time race", blurb: "Walker-friendly, gentle elevation, kids-OK.", icon: <Heart className="h-5 w-5" />, href: "/race-shopper/beginner" },
  { slug: "pr", title: "Set a PR", blurb: "Fast, flat courses with strong fields and good weather.", icon: <Zap className="h-5 w-5" />, href: "/race-shopper/pr" },
  { slug: "value", title: "Best value", blurb: "Great experience for the money. Affordable entry fees.", icon: <DollarSign className="h-5 w-5" />, href: "/race-shopper/value" },
  { slug: "vibe", title: "Big vibe", blurb: "Costume races, themed events, festival energy.", icon: <Sparkles className="h-5 w-5" />, href: "/race-shopper/vibe" },
  { slug: "family", title: "Family-friendly", blurb: "Strollers, kids races, walkers welcome.", icon: <Users className="h-5 w-5" />, href: "/race-shopper/family" },
];

export const RaceShopperPage = () => (
  <Layout>
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4" data-testid="text-coming-soon-title">Race Shopper</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-coming-soon-description">
            Tell us what you actually want — a PR, your first 5K, the best value, or a big-vibe event — and we'll rank every upcoming race for that goal.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {SHOPPER_GOALS.map(g => (
            <Link key={g.slug} href={g.href} data-testid={`link-shopper-goal-${g.slug}`}>
              <Card className="h-full hover-elevate cursor-pointer">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                    {g.icon}
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{g.title}</h3>
                  <p className="text-sm text-muted-foreground">{g.blurb}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Or browse the full race calendar</p>
          <Button asChild data-testid="button-browse-races">
            <Link href="/races">
              <Calendar className="mr-2 h-4 w-4" />
              Browse all races
            </Link>
          </Button>
        </div>
      </div>
    </section>
  </Layout>
);

export const ComparePage = () => (
  <Layout>
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
            <Trophy className="h-7 w-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3" data-testid="text-coming-soon-title">Compare Races</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-coming-soon-description">
            Side-by-side comparison of any 2–4 races on weather, difficulty, vibe, value, and PR potential.
          </p>
        </div>
        <Card>
          <CardContent className="p-8">
            <h2 className="font-semibold mb-4">How comparison will work</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3"><span className="text-primary font-bold">·</span> Pick races from any state, any distance.</li>
              <li className="flex gap-3"><span className="text-primary font-bold">·</span> See entry fees, elevation, course type, weather history side-by-side.</li>
              <li className="flex gap-3"><span className="text-primary font-bold">·</span> See deterministic 0–100 scores for difficulty, vibe, value, PR potential.</li>
              <li className="flex gap-3"><span className="text-primary font-bold">·</span> Decide based on data, not vibes alone.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild data-testid="button-browse-races">
                <Link href="/races"><Calendar className="mr-2 h-4 w-4" /> Browse races to compare</Link>
              </Button>
              <Button variant="outline" asChild data-testid="button-go-home">
                <Link href="/">Home <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </Layout>
);

type RaceLite = {
  id: number;
  slug: string;
  name: string;
  city: string;
  state: string;
  distance: string;
  date: string;
  priceMin?: number | null;
  priceMax?: number | null;
  nextPriceIncreaseAt?: string | null;
  nextPriceIncreaseAmount?: number | null;
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function RaceListItem({ race, secondary }: { race: RaceLite; secondary?: React.ReactNode }) {
  const price = race.priceMin && race.priceMax && race.priceMin !== race.priceMax
    ? `$${race.priceMin}–$${race.priceMax}`
    : race.priceMin ? `$${race.priceMin}` : null;
  return (
    <Link href={`/races/${race.slug}`} data-testid={`link-race-${race.slug}`}>
      <Card className="hover-elevate cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight mb-1">{race.name}</h3>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(race.date)}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {race.city}, {race.state}</span>
                {race.distance && <Badge variant="secondary">{race.distance}</Badge>}
                {price && <span className="inline-flex items-center gap-1 font-medium text-foreground"><DollarSign className="h-3.5 w-3.5" />{price}</span>}
              </div>
              {secondary}
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export const ThisWeekendPage = () => {
  const { data, isLoading } = useQuery<RaceLite[]>({
    queryKey: ["/api/races/this-weekend"],
    queryFn: async () => {
      const res = await fetch("/api/races/this-weekend");
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });
  const races = data || [];
  return (
    <Layout>
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-5xl font-heading font-bold mb-3" data-testid="text-coming-soon-title">Races This Weekend</h1>
            <p className="text-muted-foreground text-lg max-w-2xl" data-testid="text-coming-soon-description">
              Every race happening across the USA in the next 72 hours. Last-minute signups, walk-up registrations, and last-call entries.
            </p>
          </div>
          {isLoading && <p className="text-muted-foreground" data-testid="text-loading">Loading races…</p>}
          {!isLoading && races.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-empty-this-weekend">
                No races in our database for the next 72 hours right now. Check back tomorrow, or browse upcoming races.
                <div className="mt-4">
                  <Button asChild data-testid="button-browse-races"><Link href="/races"><Calendar className="mr-2 h-4 w-4" /> Browse all races</Link></Button>
                </div>
              </CardContent>
            </Card>
          )}
          {races.length > 0 && (
            <div className="space-y-3" data-testid="list-this-weekend">
              {races.map(r => <RaceListItem key={r.id} race={r} />)}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export const PriceWatchPage = () => {
  const { data, isLoading } = useQuery<RaceLite[]>({
    queryKey: ["/api/races/price-increase-soon", { days: 21, limit: 30 }],
    queryFn: async () => {
      const res = await fetch("/api/races/price-increase-soon?days=21&limit=30");
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });
  const races = data || [];
  return (
    <Layout>
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-5xl font-heading font-bold mb-3" data-testid="text-coming-soon-title">Price Watch</h1>
            <p className="text-muted-foreground text-lg max-w-2xl" data-testid="text-coming-soon-description">
              Races whose registration fee is about to go up. Lock in the lower price by signing up before the next price tier kicks in.
            </p>
          </div>
          {isLoading && <p className="text-muted-foreground" data-testid="text-loading">Loading races…</p>}
          {!isLoading && races.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-empty-price-watch">
                No upcoming price increases tracked right now. We add this data as organizers publish their pricing schedules.
                <div className="mt-4">
                  <Button asChild data-testid="button-browse-races"><Link href="/races"><Calendar className="mr-2 h-4 w-4" /> Browse all races</Link></Button>
                </div>
              </CardContent>
            </Card>
          )}
          {races.length > 0 && (
            <div className="space-y-3" data-testid="list-price-watch">
              {races.map(r => (
                <RaceListItem
                  key={r.id}
                  race={r}
                  secondary={r.nextPriceIncreaseAt ? (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 px-2 py-1 rounded">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Price goes up {formatDate(r.nextPriceIncreaseAt)}
                      {r.nextPriceIncreaseAmount ? ` (+$${r.nextPriceIncreaseAmount})` : ""}
                    </div>
                  ) : null}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

type OrganizerLite = {
  id: number;
  slug: string;
  name: string;
  city?: string | null;
  state?: string | null;
  raceCount?: number | null;
  isVerified?: boolean | null;
  websiteUrl?: string | null;
  description?: string | null;
};

export const OrganizerDetailPage = ({ params }: { params: { slug: string } }) => {
  const slug = params.slug;
  const { data, isLoading } = useQuery<{ organizer: OrganizerLite; races: RaceLite[] } | null>({
    queryKey: [`/api/organizers/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/organizers/${slug}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <p className="text-muted-foreground" data-testid="text-loading">Loading organizer…</p>
          </div>
        </section>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h1 className="text-3xl font-heading font-bold mb-3" data-testid="text-organizer-not-found">Organizer not found</h1>
            <p className="text-muted-foreground mb-6">We don't have a profile for this organizer yet.</p>
            <Button asChild data-testid="button-back-to-organizers">
              <Link href="/organizers"><Building2 className="mr-2 h-4 w-4" /> Browse organizers</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const { organizer, races } = data;
  return (
    <Layout>
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <Link href="/organizers" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4" data-testid="link-back-to-organizers">
              <ArrowRight className="h-3.5 w-3.5 rotate-180" /> All organizers
            </Link>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Building2 className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl md:text-4xl font-heading font-bold leading-tight" data-testid="text-organizer-name">{organizer.name}</h1>
                {(organizer.city || organizer.state) && (
                  <p className="text-muted-foreground mt-1 inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {[organizer.city, organizer.state].filter(Boolean).join(", ")}
                  </p>
                )}
                {organizer.description && (
                  <p className="text-muted-foreground mt-3" data-testid="text-organizer-description">{organizer.description}</p>
                )}
              </div>
            </div>
          </div>
          <h2 className="text-xl font-heading font-semibold mb-4" data-testid="text-organizer-races-heading">
            Races by {organizer.name} {races.length > 0 ? `(${races.length})` : ""}
          </h2>
          {races.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground" data-testid="text-empty-organizer-races">
                No races listed for this organizer yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3" data-testid="list-organizer-races">
              {races.map(r => <RaceListItem key={r.id} race={r} />)}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export const OrganizersPage = () => {
  const { data, isLoading } = useQuery<OrganizerLite[]>({
    queryKey: ["/api/organizers"],
    queryFn: async () => {
      const res = await fetch("/api/organizers?limit=100");
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });
  const orgs = data || [];
  return (
    <Layout>
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-5xl font-heading font-bold mb-3" data-testid="text-coming-soon-title">Race Organizers</h1>
            <p className="text-muted-foreground text-lg max-w-2xl" data-testid="text-coming-soon-description">
              The race directors and organizations behind the events. See every race a given organizer puts on.
            </p>
          </div>
          {isLoading && <p className="text-muted-foreground" data-testid="text-loading">Loading organizers…</p>}
          {!isLoading && orgs.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-empty-organizers">
                We're still building organizer profiles. In the meantime, every race already shows its organizing entity.
                <div className="mt-4">
                  <Button asChild data-testid="button-browse-races"><Link href="/races"><Calendar className="mr-2 h-4 w-4" /> Browse all races</Link></Button>
                </div>
              </CardContent>
            </Card>
          )}
          {orgs.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="list-organizers">
              {orgs.map(o => (
                <Link key={o.id} href={`/organizers/${o.slug}`} data-testid={`link-organizer-${o.slug}`}>
                  <Card className="h-full hover-elevate cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold leading-tight">{o.name}</h3>
                          {(o.city || o.state) && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {[o.city, o.state].filter(Boolean).join(", ")}
                            </p>
                          )}
                          {o.raceCount != null && o.raceCount > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">{o.raceCount} race{o.raceCount === 1 ? "" : "s"}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};
