import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, Globe, ShieldCheck, ArrowRight, Calendar, DollarSign, Sparkles } from "lucide-react";
import type { Race } from "@shared/schema";
import { format, parseISO } from "date-fns";

interface OrganizerProfile {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  websiteUrl?: string | null;
  city?: string | null;
  state?: string | null;
  raceCount?: number | null;
  isVerified?: boolean | null;
  email?: string | null;
}

function formatRaceDate(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  try { return format(parseISO(dateStr), "MMM d, yyyy"); } catch { return dateStr; }
}

function isFeatured(race: Race): boolean {
  if (!race.featuredUntil) return false;
  return new Date(race.featuredUntil).getTime() > Date.now();
}

export default function OrganizerDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data, isLoading } = useQuery<{ organizer: OrganizerProfile; races: Race[] } | null>({
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
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
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
  const upcoming = races.filter((r) => r.date && new Date(r.date).getTime() >= Date.now() - 86400000);
  const past = races.filter((r) => r.date && new Date(r.date).getTime() < Date.now() - 86400000);

  return (
    <Layout>
      <section className="py-10 md:py-14 bg-gradient-to-b from-blue-50/40 to-background dark:from-blue-950/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link href="/organizers" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4" data-testid="link-back-to-organizers">
            <ArrowRight className="h-3.5 w-3.5 rotate-180" /> All organizers
          </Link>

          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Building2 className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-3xl md:text-4xl font-heading font-bold leading-tight" data-testid="text-organizer-name">{organizer.name}</h1>
                {organizer.isVerified && (
                  <Badge variant="outline" className="text-emerald-700 border-emerald-300" data-testid="badge-verified">
                    <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {(organizer.city || organizer.state) && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {[organizer.city, organizer.state].filter(Boolean).join(", ")}</span>
                )}
                {organizer.websiteUrl && (
                  <a href={organizer.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary" data-testid="link-organizer-website">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
                <span>{races.length} race{races.length === 1 ? "" : "s"} listed</span>
              </div>
              {organizer.description && (
                <p className="text-muted-foreground mt-3 max-w-2xl" data-testid="text-organizer-description">{organizer.description}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 bg-background">
        <div className="container mx-auto px-4 max-w-4xl space-y-10">
          <div>
            <h2 className="text-xl font-heading font-semibold mb-4" data-testid="text-upcoming-heading">
              Upcoming races {upcoming.length > 0 ? `(${upcoming.length})` : ""}
            </h2>
            {upcoming.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground" data-testid="text-no-upcoming">
                  No upcoming races listed for this organizer right now.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3" data-testid="list-upcoming-races">
                {upcoming.map((r) => (
                  <Link key={r.id} href={`/races/${r.slug}`} data-testid={`link-race-${r.slug}`}>
                    <Card className="hover-elevate cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-lg leading-tight">{r.name}</h3>
                              {isFeatured(r) && (
                                <Badge className="bg-amber-500 text-white border-0 text-xs">
                                  <Sparkles className="h-3 w-3 mr-0.5" /> Featured
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatRaceDate(r.date)}</span>
                              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {r.city}, {r.state}</span>
                              {r.distance && <Badge variant="secondary">{r.distance}</Badge>}
                              {(r.priceMin != null || r.priceMax != null) && (
                                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  {r.priceMin != null && r.priceMax != null && r.priceMin !== r.priceMax
                                    ? `${r.priceMin}–$${r.priceMax}`
                                    : `${r.priceMin ?? r.priceMax}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="text-xl font-heading font-semibold mb-4" data-testid="text-past-heading">Past races ({past.length})</h2>
              <div className="grid sm:grid-cols-2 gap-3" data-testid="list-past-races">
                {past.slice(0, 12).map((r) => (
                  <Link key={r.id} href={`/races/${r.slug}`} className="text-sm border rounded-lg p-3 hover-elevate" data-testid={`link-past-race-${r.slug}`}>
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{formatRaceDate(r.date)} · {r.city}, {r.state}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Card className="border-2 border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Are you {organizer.name}? <Link href="/for-organizers" className="text-primary hover:underline" data-testid="link-claim-org">Claim this profile</Link> to edit details and see analytics.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
