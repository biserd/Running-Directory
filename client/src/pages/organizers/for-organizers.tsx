import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Building2, BarChart3, Pencil, Megaphone, ShieldCheck, Search, ArrowRight, Sparkles, Bell, Mail } from "lucide-react";
import type { Race } from "@shared/schema";

function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function ForOrganizersPage() {
  const [q, setQ] = useState("");
  const debounced = useDebounced(q.trim(), 250);

  const { data: results, isFetching } = useQuery<Race[]>({
    queryKey: ["/api/races/search", { q: debounced }],
    queryFn: async () => {
      const res = await fetch(`/api/races/search?q=${encodeURIComponent(debounced)}&limit=8`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: debounced.length >= 2,
  });

  return (
    <Layout>
      <section className="bg-gradient-to-b from-blue-50 to-background dark:from-blue-950/30 py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-4" data-testid="badge-for-organizers">For race organizers</Badge>
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4 leading-tight" data-testid="text-organizers-hero-title">
              Own your race listing.<br />Reach runners actually shopping.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-organizers-hero-sub">
              Claim your race in a minute. Edit your registration link, pricing, refund policy, and course details. See who's looking — for free.
            </p>
          </div>

          <Card className="max-w-2xl mx-auto" data-testid="card-claim-search">
            <CardContent className="p-6">
              <label className="text-sm font-medium mb-2 block" htmlFor="claim-search-input">
                Find your race to claim it
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="claim-search-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by race name or city…"
                  className="pl-9"
                  data-testid="input-claim-search"
                  autoFocus
                />
              </div>
              {debounced.length >= 2 && (
                <div className="mt-4 border rounded-lg divide-y bg-card max-h-80 overflow-y-auto" data-testid="list-claim-search-results">
                  {isFetching && <p className="p-4 text-sm text-muted-foreground" data-testid="text-claim-search-loading">Searching…</p>}
                  {!isFetching && (results || []).length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground" data-testid="text-claim-search-empty">
                      No matches. Try a different name, or <Link href="/contact" className="text-primary hover:underline">tell us about your race</Link>.
                    </p>
                  )}
                  {!isFetching && (results || []).slice(0, 8).map((r) => (
                    <Link key={r.id} href={`/races/${r.slug}`} className="flex items-center justify-between p-3 hover-elevate" data-testid={`link-claim-result-${r.slug}`}>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.city}, {r.state} · {r.distance} {r.isClaimed ? "· Claimed" : ""}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-3" />
                    </Link>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                Already claimed your race? <Link href="/organizers/dashboard" className="text-primary hover:underline" data-testid="link-go-dashboard">Go to your dashboard</Link>.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-8 text-center" data-testid="text-what-you-get">What you get when you claim</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: <Pencil className="h-5 w-5" />, title: "Edit your race details", body: "Registration URL, pricing, deadlines, refund policy, packet pickup, parking notes, and course info — fix anything that's stale." },
              { icon: <BarChart3 className="h-5 w-5" />, title: "See real demand", body: "30-day timeline of page views, saves, and outbound clicks to your registration link. Know what runners actually do." },
              { icon: <ShieldCheck className="h-5 w-5" />, title: "A verified badge", body: "Claimed races get a verification badge runners can trust. No more wrong dates or dead links." },
            ].map((it) => (
              <Card key={it.title}>
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">{it.icon}</div>
                  <h3 className="font-semibold mb-1">{it.title}</h3>
                  <p className="text-sm text-muted-foreground">{it.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/40">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-7">
                <Badge variant="secondary" className="mb-3">Free</Badge>
                <h3 className="font-heading font-semibold text-xl mb-2">Self-serve organizer dashboard</h3>
                <p className="text-sm text-muted-foreground mb-4">Everything above. No credit card. No quotas. Always free.</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2"><span className="text-emerald-600">✓</span> Claim every race you organize</li>
                  <li className="flex gap-2"><span className="text-emerald-600">✓</span> Edit details and policies</li>
                  <li className="flex gap-2"><span className="text-emerald-600">✓</span> 30-day analytics + outbound click reports</li>
                  <li className="flex gap-2"><span className="text-emerald-600">✓</span> Public organizer profile page</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-2 border-amber-400 bg-amber-50/40 dark:bg-amber-950/20">
              <CardContent className="p-7">
                <Badge className="mb-3 bg-amber-500 text-white hover:bg-amber-600 border-0">
                  <Sparkles className="h-3 w-3 mr-1" /> Featured
                </Badge>
                <h3 className="font-heading font-semibold text-xl mb-2">Promote a race to the top</h3>
                <p className="text-sm text-muted-foreground mb-4">A featured slot on local race pages and Turkey Trot hubs for the runners who matter to you.</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2"><Megaphone className="h-4 w-4 text-amber-600" /> Featured slot on city + distance pages</li>
                  <li className="flex gap-2"><Megaphone className="h-4 w-4 text-amber-600" /> Highlighted card across search</li>
                  <li className="flex gap-2"><Megaphone className="h-4 w-4 text-amber-600" /> Inclusion in Turkey Trot watch alerts</li>
                  <li className="flex gap-2"><Bell className="h-4 w-4 text-amber-600" /> Custom duration (30, 60, 90 days)</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-4">Request a featured slot from the dashboard after you claim. Our team reviews requests within 2 business days.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">Three steps to get started</h2>
          <ol className="space-y-3 text-left max-w-md mx-auto mb-8">
            <li className="flex gap-3"><span className="font-bold text-primary">1.</span> Find your race in the search above and tap "Claim this race."</li>
            <li className="flex gap-3"><span className="font-bold text-primary">2.</span> We email you a verification link. Click it.</li>
            <li className="flex gap-3"><span className="font-bold text-primary">3.</span> You land on the dashboard. Edit, update, and watch your stats.</li>
          </ol>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild data-testid="button-browse-to-claim">
              <Link href="/races"><Building2 className="mr-2 h-4 w-4" /> Browse races to claim</Link>
            </Button>
            <Button asChild variant="outline" data-testid="button-organizer-contact">
              <Link href="/contact"><Mail className="mr-2 h-4 w-4" /> Talk to a human</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
