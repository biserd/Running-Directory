import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SeoListing } from "@/components/seo/seo-listing";
import { apiGetState, apiSearchRaces, buildRaceSearchQs } from "@/lib/api";
import { DISTANCE_SLUG_TO_LABEL, DISTANCE_SLUGS, isValidDistanceSlug } from "@shared/metro";
import { MapPin } from "lucide-react";
import type { Race, State } from "@shared/schema";

export default function StateDistancePage() {
  const params = useParams<{ state: string; distance: string }>();
  const stateSlug = params.state;
  const distanceSlug = params.distance;

  const distanceCfg = isValidDistanceSlug(distanceSlug) ? DISTANCE_SLUG_TO_LABEL[distanceSlug] : null;

  const { data: state } = useQuery<State | undefined>({
    queryKey: ["/api/states", stateSlug],
    queryFn: () => apiGetState(stateSlug),
  });

  const stateAbbr = state?.abbreviation;
  const searchParams = {
    state: stateAbbr,
    distance: distanceCfg?.distance || undefined,
    surface: distanceCfg?.surface || undefined,
    sort: "date" as const,
    limit: 60,
  };
  const apiQs = buildRaceSearchQs(searchParams);
  const { data: races, isLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", apiQs],
    queryFn: () => apiSearchRaces(searchParams),
    enabled: !!stateAbbr && !!distanceCfg,
  });

  const list = races || [];

  if (!distanceCfg) {
    return (
      <SeoListing
        breadcrumbs={[{ label: "Races", href: "/races" }, { label: distanceSlug }]}
        title="Distance not found"
        intro="That race-distance shortcut isn't recognized."
        races={[]}
        emptyState={{
          title: "Try a different distance",
          body: "We support 5K, 10K, half-marathon, marathon, and trail-race shortcuts.",
        }}
        noindex
      />
    );
  }

  if (!state) {
    return (
      <SeoListing
        breadcrumbs={[{ label: "Races", href: "/races" }, { label: stateSlug }]}
        title={`${distanceCfg.plural} in ${stateSlug}`}
        intro="State not found."
        races={[]}
        emptyState={{
          title: "State not found",
          body: "Try the all-states race calendar.",
          fallbackHref: "/races/usa",
          fallbackLabel: "All states",
        }}
        noindex
      />
    );
  }

  const otherDistances = Object.entries(DISTANCE_SLUG_TO_LABEL)
    .filter(([slug]) => slug !== distanceSlug)
    .map(([slug, cfg]) => ({ label: `${cfg.plural} in ${state.name}`, href: `/state/${stateSlug}/${slug}` }));

  // Top metros within this state (derived from the fetched race list).
  const metroCount = new Map<string, { city: string; slug: string; count: number }>();
  for (const r of list) {
    if (!r.city) continue;
    const slug = r.city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const key = slug;
    const existing = metroCount.get(key);
    if (existing) existing.count += 1;
    else metroCount.set(key, { city: r.city, slug, count: 1 });
  }
  const topMetros = Array.from(metroCount.values()).sort((a, b) => b.count - a.count).slice(0, 12);

  const toolbar = (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Distance</div>
        <div className="flex flex-wrap gap-1.5">
          {DISTANCE_SLUGS.map((s) => {
            const cfg = DISTANCE_SLUG_TO_LABEL[s];
            const active = s === distanceSlug;
            return (
              <Link
                key={s}
                href={`/state/${stateSlug}/${s}`}
                className={`px-2.5 py-1 rounded-full text-xs border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover-elevate"}`}
                data-testid={`chip-distance-${s}`}
              >
                {cfg.plural}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="text-xs">
        <Link
          href={`/races?state=${state.abbreviation}${distanceCfg.distance ? `&distance=${encodeURIComponent(distanceCfg.distance)}` : ""}${distanceCfg.surface ? `&surface=${encodeURIComponent(distanceCfg.surface)}` : ""}`}
          className="text-primary hover:underline"
          data-testid="link-open-in-search"
        >
          Open in race search for full filters →
        </Link>
      </div>
    </div>
  );

  return (
    <SeoListing
      breadcrumbs={[
        { label: "Races", href: "/races" },
        { label: state.name, href: `/races/state/${stateSlug}` },
        { label: distanceCfg.plural },
      ]}
      eyebrow={`${distanceCfg.label} · ${state.name}`}
      title={`${distanceCfg.plural} in ${state.name}`}
      intro={`Every ${distanceCfg.label.toLowerCase()} we track across ${state.name}, sorted by date. Each card shows deterministic 0–100 scores for beginner-friendliness, PR potential, value, vibe, and family appeal.`}
      races={list}
      isLoading={isLoading}
      toolbar={toolbar}
      relatedLinks={[
        ...otherDistances,
        { label: `All races in ${state.name}`, href: `/races/state/${stateSlug}` },
        { label: `${state.name} city hub`, href: `/state/${stateSlug}` },
      ]}
      emptyState={{
        title: `No ${distanceCfg.plural} listed in ${state.name}`,
        body: `We don't have a ${distanceCfg.label.toLowerCase()} on the calendar in ${state.name} right now. Try another distance or browse all races in the state.`,
        fallbackHref: `/races/state/${stateSlug}`,
        fallbackLabel: `All ${state.name} races`,
      }}
      noindex={list.length < 5}
      testIdPrefix="state-distance"
    >
      {topMetros.length > 0 && (
        <section className="mt-12" data-testid="section-top-metros-in-state">
          <h2 className="text-2xl font-heading font-bold mb-1">Top metros in {state.name} for {distanceCfg.plural.toLowerCase()}</h2>
          <p className="text-sm text-muted-foreground mb-4">Cities in {state.name} with the most {distanceCfg.label.toLowerCase()} races on the calendar.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {topMetros.map((m) => {
              const metroSlug = `${m.slug}-${state.abbreviation.toLowerCase()}`;
              return (
                <Link
                  key={m.slug}
                  href={`/${metroSlug}/${distanceSlug}`}
                  className="border rounded-lg px-4 py-3 hover-elevate flex items-center justify-between"
                  data-testid={`link-state-top-metro-${m.slug}`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 text-primary" />
                    {m.city}
                  </span>
                  <span className="text-xs text-muted-foreground">{m.count}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </SeoListing>
  );
}
