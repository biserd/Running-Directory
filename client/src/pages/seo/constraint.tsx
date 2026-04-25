import { useParams, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SeoListing } from "@/components/seo/seo-listing";
import { apiSearchRaces, buildRaceSearchQs } from "@/lib/api";
import type { Race, City, State } from "@shared/schema";

type Metro = { city: City; state: State };

export default function ConstraintPage() {
  const params = useParams<{ metro: string }>();
  const [isWalker] = useRoute("/walker-friendly-5k/:metro");
  const constraint = isWalker ? "walker" : "stroller";
  const metroSlug = params.metro;

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
    distance: "5K",
    walkerFriendly: constraint === "walker" ? true : undefined,
    strollerFriendly: constraint === "stroller" ? true : undefined,
    sort: "date" as const,
    limit: 60,
  };
  const apiQs = buildRaceSearchQs(searchParams);
  const { data: races, isLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", apiQs],
    queryFn: () => apiSearchRaces(searchParams),
    enabled: !!stateAbbr && !!cityName,
  });

  const list = races || [];
  const constraintLabel = constraint === "walker" ? "Walker-friendly" : "Stroller-friendly";
  const constraintBlurb = constraint === "walker"
    ? "5Ks with generous time limits and a walking-friendly course"
    : "5Ks where strollers are welcome on the course";

  if (!metro) {
    return (
      <SeoListing
        breadcrumbs={[{ label: "Races", href: "/races" }, { label: `${constraintLabel} 5Ks` }]}
        title={`${constraintLabel} 5Ks in ${metroSlug}`}
        intro="We don't recognize this metro yet."
        races={[]}
        emptyState={{
          title: "Metro not found",
          body: "Try the full race calendar instead.",
          fallbackHref: "/races",
          fallbackLabel: "Browse all races",
        }}
        noindex
      />
    );
  }

  return (
    <SeoListing
      breadcrumbs={[
        { label: "Races", href: "/races" },
        { label: metro.state.name, href: `/races/state/${metro.state.slug}` },
        { label: metro.city.name, href: `/races/state/${metro.state.slug}/city/${metro.city.slug}` },
        { label: `${constraintLabel} 5Ks` },
      ]}
      eyebrow={`${constraintLabel} · ${metro.city.name}`}
      title={`${constraintLabel} 5Ks in ${metro.city.name}, ${metro.state.abbreviation}`}
      intro={`${constraintBlurb} in or near ${metro.city.name}. Each event is flagged for its accessibility, time limit, and family options.`}
      races={list}
      isLoading={isLoading}
      relatedLinks={[
        { label: `All 5Ks in ${metro.city.name}`, href: `/${metroSlug}/5k-races` },
        { label: "Family-friendly 5Ks (national)", href: "/best/family-friendly-5ks" },
        ...(constraint === "walker"
          ? [{ label: `Stroller-friendly 5Ks in ${metro.city.name}`, href: `/stroller-friendly-5k/${metroSlug}` }]
          : [{ label: `Walker-friendly 5Ks in ${metro.city.name}`, href: `/walker-friendly-5k/${metroSlug}` }]),
      ]}
      emptyState={{
        title: `No ${constraintLabel.toLowerCase()} 5Ks listed yet`,
        body: `We don't have a ${constraintLabel.toLowerCase()} 5K on the calendar in ${metro.city.name} right now. Browse all 5Ks in the city or check the national family-friendly list.`,
        fallbackHref: `/${metroSlug}/5k-races`,
        fallbackLabel: `All 5Ks in ${metro.city.name}`,
      }}
      noindex={list.length < 5}
      testIdPrefix={`constraint-${constraint}`}
    />
  );
}
