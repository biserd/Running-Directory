import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SeoListing } from "@/components/seo/seo-listing";
import { apiGetState, apiSearchRaces, buildRaceSearchQs } from "@/lib/api";
import { DISTANCE_SLUG_TO_LABEL, isValidDistanceSlug } from "@shared/metro";
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
    />
  );
}
