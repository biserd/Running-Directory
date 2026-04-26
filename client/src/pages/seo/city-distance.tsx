import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SeoListing } from "@/components/seo/seo-listing";
import { FeaturedSlot } from "@/components/seo/featured-slot";
import { apiSearchRaces, buildRaceSearchQs } from "@/lib/api";
import {
  DISTANCE_SLUG_TO_LABEL,
  DISTANCE_SLUGS,
  isValidDistanceSlug,
  isValidMonthSlug,
  MONTH_NAMES,
  MONTH_SLUG_TO_NUM,
  MONTH_SLUGS,
} from "@shared/metro";
import type { Race, City, State } from "@shared/schema";

type Metro = { city: City; state: State };

export default function CityDistancePage() {
  const params = useParams<{ metro: string; distance: string; month?: string }>();
  const metroSlug = params.metro;
  const distanceSlug = params.distance;
  const monthSlug = params.month?.toLowerCase();

  const distanceCfg = isValidDistanceSlug(distanceSlug) ? DISTANCE_SLUG_TO_LABEL[distanceSlug] : null;
  const monthValid = !monthSlug || isValidMonthSlug(monthSlug);
  const monthNum = monthSlug && isValidMonthSlug(monthSlug) ? MONTH_SLUG_TO_NUM[monthSlug] : undefined;

  const { data: metro } = useQuery<Metro | null>({
    queryKey: [`/api/metros/${metroSlug}`],
    queryFn: async () => {
      const res = await fetch(`/api/metros/${metroSlug}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const stateAbbr = metro?.state?.abbreviation;
  const cityName = metro?.city?.name;

  const searchParams = {
    state: stateAbbr,
    city: cityName,
    distance: distanceCfg?.distance || undefined,
    surface: distanceCfg?.surface || undefined,
    month: monthNum,
    sort: "date" as const,
    limit: 60,
  };
  const apiQs = buildRaceSearchQs(searchParams);
  const { data: races, isLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", apiQs],
    queryFn: () => apiSearchRaces(searchParams),
    enabled: !!stateAbbr && !!cityName && !!distanceCfg,
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

  if (!monthValid) {
    return (
      <SeoListing
        breadcrumbs={[{ label: "Races", href: "/races" }, { label: monthSlug || "" }]}
        title="Month not recognized"
        intro="That month name isn't one we recognize."
        races={[]}
        emptyState={{
          title: "Try a month name",
          body: "Use january, february, march, etc.",
          fallbackHref: `/${metroSlug}/${distanceSlug}`,
          fallbackLabel: "All months",
        }}
        noindex
      />
    );
  }

  if (!metro) {
    return (
      <SeoListing
        breadcrumbs={[{ label: "Races", href: "/races" }, { label: metroSlug }]}
        title={`${distanceCfg.plural} in ${metroSlug}`}
        intro="We don't recognize this metro yet."
        races={[]}
        emptyState={{
          title: "Metro not found",
          body: "Try a different metro or browse the full race calendar.",
          fallbackHref: "/races",
          fallbackLabel: "Browse all races",
        }}
        noindex
      />
    );
  }

  const monthLabel = monthNum ? MONTH_NAMES[monthNum] : null;
  const titleSuffix = monthLabel ? ` in ${monthLabel}` : "";
  const title = `${distanceCfg.plural} in ${metro.city.name}, ${metro.state.abbreviation}${titleSuffix}`;
  const intro = monthLabel
    ? `Every ${distanceCfg.label.toLowerCase()} happening in or near ${metro.city.name} during ${monthLabel}. Sorted by date with deterministic 0–100 scores so you can pick the right one for your goal.`
    : `Every ${distanceCfg.label.toLowerCase()} happening in or near ${metro.city.name}, ${metro.state.name}. Sorted by date with deterministic 0–100 scores so you can pick the right one for your goal.`;

  const otherDistances = Object.entries(DISTANCE_SLUG_TO_LABEL)
    .filter(([slug]) => slug !== distanceSlug)
    .map(([slug, cfg]) => ({ label: `${cfg.plural} in ${metro.city.name}`, href: `/${metroSlug}/${slug}` }));

  const relatedLinks = [
    ...otherDistances,
    { label: `All races in ${metro.state.name}`, href: `/state/${metro.state.slug}/${distanceSlug}` },
    ...(monthLabel ? [{ label: `${distanceCfg.plural} in ${metro.city.name} (all months)`, href: `/${metroSlug}/${distanceSlug}` }] : []),
  ];

  const toolbar = (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Distance</div>
        <div className="flex flex-wrap gap-1.5">
          {DISTANCE_SLUGS.map((s) => {
            const cfg = DISTANCE_SLUG_TO_LABEL[s];
            const active = s === distanceSlug;
            const href = monthSlug ? `/${metroSlug}/${s}/${monthSlug}` : `/${metroSlug}/${s}`;
            return (
              <Link
                key={s}
                href={href}
                className={`px-2.5 py-1 rounded-full text-xs border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover-elevate"}`}
                data-testid={`chip-distance-${s}`}
              >
                {cfg.plural}
              </Link>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Month</div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/${metroSlug}/${distanceSlug}`}
            className={`px-2.5 py-1 rounded-full text-xs border ${!monthSlug ? "bg-primary text-primary-foreground border-primary" : "bg-background hover-elevate"}`}
            data-testid="chip-month-all"
          >
            All months
          </Link>
          {MONTH_SLUGS.map((m) => {
            const active = m === monthSlug;
            return (
              <Link
                key={m}
                href={`/${metroSlug}/${distanceSlug}/${m}`}
                className={`px-2.5 py-1 rounded-full text-xs border capitalize ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover-elevate"}`}
                data-testid={`chip-month-${m}`}
              >
                {MONTH_NAMES[MONTH_SLUG_TO_NUM[m]].slice(0, 3)}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="text-xs">
        <Link
          href={`/races?state=${metro.state.abbreviation}&city=${encodeURIComponent(metro.city.name)}${distanceCfg.distance ? `&distance=${encodeURIComponent(distanceCfg.distance)}` : ""}${distanceCfg.surface ? `&surface=${encodeURIComponent(distanceCfg.surface)}` : ""}${monthNum ? `&month=${monthNum}` : ""}`}
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
        { label: metro.state.name, href: `/races/state/${metro.state.slug}` },
        { label: metro.city.name, href: `/races/state/${metro.state.slug}/city/${metro.city.slug}` },
        { label: monthLabel ? `${distanceCfg.plural} (${monthLabel})` : distanceCfg.plural },
      ]}
      eyebrow={`${distanceCfg.label} · ${metro.city.name}`}
      title={title}
      intro={intro}
      races={list}
      isLoading={isLoading}
      relatedLinks={relatedLinks}
      toolbar={toolbar}
      emptyState={{
        title: monthLabel ? `No ${distanceCfg.plural} in ${monthLabel}` : `No ${distanceCfg.plural} listed yet`,
        body: monthLabel
          ? `We couldn't find a ${distanceCfg.label.toLowerCase()} in ${metro.city.name} for ${monthLabel}. Try another month or browse all ${distanceCfg.plural.toLowerCase()} here.`
          : `We don't have a ${distanceCfg.label.toLowerCase()} listed in ${metro.city.name} right now. Browse all races or try a nearby metro.`,
        fallbackHref: `/${metroSlug}/${distanceSlug}`,
        fallbackLabel: `All ${distanceCfg.plural} in ${metro.city.name}`,
      }}
      noindex={list.length < 5}
      testIdPrefix="city-distance"
    >
      <div className="-mt-4">
        <FeaturedSlot
          cityId={metro.city.id}
          distance={distanceCfg.distance ?? undefined}
          testIdPrefix="featured-city-distance"
        />
      </div>
    </SeoListing>
  );
}
