import { useMemo } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SeoListing } from "@/components/seo/seo-listing";
import { apiSearchRaces, buildRaceSearchQs } from "@/lib/api";
import { DISTANCE_SLUG_TO_LABEL, isValidDistanceSlug, MONTH_SLUG_TO_NUM, isValidMonthSlug, MONTH_NAMES } from "@shared/metro";
import { computeRaceScore } from "@shared/race-score";
import type { Race } from "@shared/schema";

export default function BestDistanceMonthPage() {
  const params = useParams<{ distance: string; month: string }>();
  const distanceSlug = params.distance;
  const monthSlug = params.month?.toLowerCase();
  const distanceCfg = isValidDistanceSlug(distanceSlug) ? DISTANCE_SLUG_TO_LABEL[distanceSlug] : null;
  const monthNum = monthSlug && isValidMonthSlug(monthSlug) ? MONTH_SLUG_TO_NUM[monthSlug] : null;

  const searchParams = {
    distance: distanceCfg?.distance || undefined,
    surface: distanceCfg?.surface || undefined,
    month: monthNum || undefined,
    sort: "date" as const,
    limit: 60,
  };
  const apiQs = buildRaceSearchQs(searchParams);
  const { data: races, isLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", apiQs],
    queryFn: () => apiSearchRaces(searchParams),
    enabled: !!distanceCfg && !!monthNum,
  });

  // Sort by computed RaceScore so the page is genuinely "best" rather than just by date.
  const sorted = useMemo(() => {
    const list = (races || []).slice();
    return list.sort((a, b) => {
      const sa = computeRaceScore(a as any).score;
      const sb = computeRaceScore(b as any).score;
      return sb - sa;
    });
  }, [races]);

  if (!distanceCfg || !monthNum) {
    return (
      <SeoListing
        breadcrumbs={[{ label: "Best of", href: "/" }, { label: "Not found" }]}
        title="Page not found"
        intro="That distance or month shortcut isn't recognized."
        races={[]}
        emptyState={{ title: "Try a different combo", body: "Pick a distance (5K, 10K, half marathon, marathon, or trail) and a month." }}
        noindex
      />
    );
  }

  const monthLabel = MONTH_NAMES[monthNum];
  return (
    <SeoListing
      breadcrumbs={[
        { label: "Races", href: "/races" },
        { label: "Best of" },
        { label: `${distanceCfg.plural} in ${monthLabel}` },
      ]}
      eyebrow={`Best ${distanceCfg.label} • ${monthLabel}`}
      title={`Best ${distanceCfg.plural} in ${monthLabel}`}
      intro={`The top-rated ${distanceCfg.label.toLowerCase()}s happening across the USA in ${monthLabel}, ranked by RaceScore — our 0–100 composite of PR potential, value, vibe, beginner-friendliness, and data confidence.`}
      races={sorted}
      isLoading={isLoading}
      emptyState={{
        title: "Not enough data yet",
        body: `We don't have enough ${distanceCfg.label.toLowerCase()}s on the calendar for ${monthLabel} to make a confident list. Try a different month or browse the full search.`,
        fallbackHref: "/races",
        fallbackLabel: "Browse all races",
      }}
      noindex={sorted.length < 5}
      testIdPrefix={`best-${distanceSlug}-${monthSlug}`}
    />
  );
}
