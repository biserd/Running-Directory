import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SeoListing } from "@/components/seo/seo-listing";
import { RaceCard } from "@/components/race-card";
import { apiSearchRaces, buildRaceSearchQs } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Bell, MapPin } from "lucide-react";
import type { Race, City, State } from "@shared/schema";

type Metro = { city: City; state: State };

export default function TurkeyTrotsPage() {
  const params = useParams<{ metro?: string }>();
  const metroSlug = params.metro;

  const { data: metro } = useQuery<Metro | null>({
    queryKey: [`/api/metros/${metroSlug}`],
    queryFn: async () => {
      if (!metroSlug) return null;
      const res = await fetch(`/api/metros/${metroSlug}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    enabled: !!metroSlug,
  });

  const stateAbbr = metro?.state?.abbreviation;
  const cityName = metro?.city?.name;

  // Turkey Trots are Thanksgiving morning races — scope to November only.
  const searchParams = metroSlug
    ? { isTurkeyTrot: true, month: 11, state: stateAbbr, city: cityName, sort: "date" as const, limit: 60 }
    : { isTurkeyTrot: true, month: 11, sort: "date" as const, limit: 60 };

  const apiQs = buildRaceSearchQs(searchParams);
  const { data: races, isLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", apiQs],
    queryFn: () => apiSearchRaces(searchParams),
    enabled: metroSlug ? !!stateAbbr && !!cityName : true,
  });

  // For per-metro pages with too few races, fetch the national set so we can
  // suggest nearby metros as a graceful fallback experience.
  const nationalParams = { isTurkeyTrot: true, month: 11, sort: "date" as const, limit: 60 };
  const nationalQs = buildRaceSearchQs(nationalParams);
  const localCount = (races || []).length;
  const { data: nationalRaces } = useQuery<Race[]>({
    queryKey: ["/api/races/search", nationalQs],
    queryFn: () => apiSearchRaces(nationalParams),
    enabled: !!metroSlug && !isLoading && localCount < 5,
  });

  const list = races || [];

  // Per-metro page (unchanged)
  if (metroSlug) {
    if (!metro) {
      return (
        <SeoListing
          breadcrumbs={[{ label: "Turkey Trots", href: "/turkey-trots" }, { label: metroSlug }]}
          eyebrow="Thanksgiving 5K"
          title={`Turkey Trots in ${metroSlug}`}
          intro="We don't recognize this metro. Try one of the cities listed on the national Turkey Trot page."
          races={[]}
          isLoading={false}
          emptyState={{
            title: "Metro not found",
            body: "Browse all Turkey Trots across the USA, or pick a different metro.",
            fallbackHref: "/turkey-trots",
            fallbackLabel: "All Turkey Trots",
          }}
          noindex
        />
      );
    }
    // Graceful nearby fallback when we have too little metro data:
    // render a dedicated "see nearby" page and skip the normal listing.
    if (!isLoading && list.length < 5) {
      const nearbyMetros = (() => {
        const counts = new Map<string, { city: string; state: string; count: number }>();
        for (const r of nationalRaces || []) {
          if (!r.city || !r.state) continue;
          if (r.state === metro.state.abbreviation && r.city === metro.city.name) continue;
          const key = `${r.city}|${r.state}`;
          const existing = counts.get(key);
          if (existing) existing.count += 1;
          else counts.set(key, { city: r.city, state: r.state, count: 1 });
        }
        return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 8);
      })();

      return (
        <SeoListing
          breadcrumbs={[
            { label: "Turkey Trots", href: "/turkey-trots" },
            { label: `${metro.city.name}, ${metro.state.abbreviation}` },
          ]}
          eyebrow="Thanksgiving 5K"
          title={`Turkey Trots near ${metro.city.name}, ${metro.state.abbreviation}`}
          intro={`We don't have enough Turkey Trots tracked in ${metro.city.name} yet. Here are nearby alternatives and the national list.`}
          races={[]}
          isLoading={false}
          showAlertCta={false}
          emptyState={{
            title: `Not enough Turkey Trots in ${metro.city.name} yet`,
            body: "Browse the full national Turkey Trot list, or try one of these metros nearby.",
            fallbackHref: "/turkey-trots",
            fallbackLabel: "All Turkey Trots in the USA",
          }}
          noindex
          testIdPrefix="turkey-trots-metro-fallback"
        >
          {nearbyMetros.length > 0 && (
            <section className="mt-8" data-testid="section-nearby-metros">
              <h2 className="text-xl font-heading font-semibold mb-1">Try a nearby metro</h2>
              <p className="text-sm text-muted-foreground mb-4">Other US metros with Turkey Trots on the calendar.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {nearbyMetros.map((nm) => {
                  const slug = `${nm.city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${nm.state.toLowerCase()}`;
                  return (
                    <Link
                      key={slug}
                      href={`/turkey-trots/${slug}`}
                      className="border rounded-lg px-4 py-3 hover-elevate flex items-center justify-between"
                      data-testid={`link-nearby-metro-${slug}`}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        {nm.city}, {nm.state}
                      </span>
                      <span className="text-xs text-muted-foreground">{nm.count}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </SeoListing>
      );
    }

    return (
      <SeoListing
        breadcrumbs={[
          { label: "Turkey Trots", href: "/turkey-trots" },
          { label: `${metro.city.name}, ${metro.state.abbreviation}` },
        ]}
        eyebrow="Thanksgiving 5K"
        title={`Turkey Trots near ${metro.city.name}, ${metro.state.abbreviation}`}
        intro={`Every Thanksgiving morning Turkey Trot we know about within reach of ${metro.city.name}. Walker- and family-friendly options are flagged on each card.`}
        races={list}
        isLoading={isLoading}
        relatedLinks={[
          { label: "All Turkey Trots", href: "/turkey-trots" },
          { label: `5Ks in ${metro.city.name}`, href: `/${metroSlug}/5k-races` },
          { label: `Family-friendly 5Ks`, href: "/best/family-friendly-5ks" },
        ]}
        emptyState={{
          title: `No Turkey Trots listed in ${metro.city.name} yet`,
          body: "We're still gathering data for this metro. Try the national list or browse all 5Ks nearby.",
          fallbackHref: "/turkey-trots",
          fallbackLabel: "All Turkey Trots",
        }}
        testIdPrefix="turkey-trots-metro"
      />
    );
  }

  // National page — categorized sections
  // Top metros: count Turkey Trots per "city, state" string
  const metroCount = new Map<string, { city: string; state: string; count: number }>();
  for (const r of list) {
    if (!r.city || !r.state) continue;
    const key = `${r.city}|${r.state}`;
    const existing = metroCount.get(key);
    if (existing) existing.count += 1;
    else metroCount.set(key, { city: r.city, state: r.state, count: 1 });
  }
  const topMetros = Array.from(metroCount.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const familyFriendly = list.filter((r) => (r.familyScore ?? 0) >= 60).slice(0, 6);
  const withKidsRace = list.filter((r) => r.kidsRace === true).slice(0, 6);
  const under40 = list
    .filter((r) => {
      const p = r.priceMin ?? r.priceMax;
      return p != null && p > 0 && p <= 40;
    })
    .slice(0, 6);

  const intro =
    "The complete national list of Thanksgiving morning Turkey Trots — sorted by date so you can lock in your Thanksgiving 5K before it sells out.";

  return (
    <SeoListing
      breadcrumbs={[{ label: "Turkey Trots" }]}
      eyebrow="Thanksgiving 5K"
      title="Turkey Trots in the USA"
      intro={intro}
      races={list}
      isLoading={isLoading}
      relatedLinks={[
        { label: "Best value 5Ks", href: "/best/cheap-races" },
        { label: "Family-friendly 5Ks", href: "/best/family-friendly-5ks" },
        { label: "Charity races", href: "/best/charity-races" },
      ]}
      emptyState={{
        title: "No Turkey Trots in our database yet",
        body: "We add Turkey Trots as race directors publish their fall schedules. Check back this fall.",
      }}
      noindex={list.length < 5}
      testIdPrefix="turkey-trots"
    >
      {list.length > 0 && (
        <div className="space-y-12 mt-12" data-testid="section-turkey-trots-extras">
          {/* Tracking CTA — Turkey-Trot-specific copy */}
          <section
            className="rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40 p-8 text-center"
            data-testid="cta-track-turkey-trots"
          >
            <h2 className="text-2xl font-heading font-bold mb-2">Track Turkey Trots near you</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-4">
              Get a single email when a new Turkey Trot is added near you, or when registration opens for next year's race.
            </p>
            <Button size="lg" asChild className="bg-orange-600 hover:bg-orange-700" data-testid="button-track-turkey-trots">
              <Link href="/favorites">
                <Bell className="mr-2 h-4 w-4" /> Track Turkey Trots
              </Link>
            </Button>
          </section>

          {/* Top metros */}
          {topMetros.length > 0 && (
            <section data-testid="section-top-metros">
              <h2 className="text-2xl font-heading font-bold mb-1">Top metros for Turkey Trots</h2>
              <p className="text-sm text-muted-foreground mb-4">Cities with the most Thanksgiving morning races on the calendar.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {topMetros.map((m) => {
                  const slug = `${m.city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${m.state.toLowerCase()}`;
                  return (
                    <Link
                      key={`${m.city}-${m.state}`}
                      href={`/turkey-trots/${slug}`}
                      className="border rounded-lg px-4 py-3 hover-elevate flex items-center justify-between"
                      data-testid={`link-top-metro-${slug}`}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        {m.city}, {m.state}
                      </span>
                      <span className="text-xs text-muted-foreground">{m.count}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Family-friendly Turkey Trots */}
          {familyFriendly.length > 0 && (
            <section data-testid="section-family-friendly">
              <h2 className="text-2xl font-heading font-bold mb-1">Family-friendly Turkey Trots</h2>
              <p className="text-sm text-muted-foreground mb-4">Strollers welcome, walkers welcome, kids welcome.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {familyFriendly.map((r) => (
                  <RaceCard key={`family-${r.id}`} race={r} />
                ))}
              </div>
            </section>
          )}

          {/* With a kids race */}
          {withKidsRace.length > 0 && (
            <section data-testid="section-kids-race">
              <h2 className="text-2xl font-heading font-bold mb-1">Turkey Trots with a kids race</h2>
              <p className="text-sm text-muted-foreground mb-4">A short Tot Trot or kids dash before or after the main 5K.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {withKidsRace.map((r) => (
                  <RaceCard key={`kids-${r.id}`} race={r} />
                ))}
              </div>
            </section>
          )}

          {/* Under $40 */}
          {under40.length > 0 && (
            <section data-testid="section-under-40">
              <h2 className="text-2xl font-heading font-bold mb-1">Turkey Trots under $40</h2>
              <p className="text-sm text-muted-foreground mb-4">Budget-friendly Thanksgiving 5Ks.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {under40.map((r) => (
                  <RaceCard key={`under40-${r.id}`} race={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </SeoListing>
  );
}
