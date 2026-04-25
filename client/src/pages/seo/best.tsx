import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SeoListing } from "@/components/seo/seo-listing";
import { apiSearchRaces, buildRaceSearchQs } from "@/lib/api";
import { BEST_CONFIGS, resolveBestSearch } from "@shared/best-configs";
import type { Race } from "@shared/schema";


export default function BestPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const cfg = BEST_CONFIGS[slug];

  const search = cfg ? resolveBestSearch(slug, cfg) : null;
  const apiQs = search ? buildRaceSearchQs(search) : "";
  const { data: races, isLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", apiQs],
    queryFn: () => apiSearchRaces(search!),
    enabled: !!search,
  });

  if (!cfg) {
    return (
      <SeoListing
        breadcrumbs={[{ label: "Best of", href: "/" }, { label: slug }]}
        title="Best-of list not found"
        intro="That curated list isn't recognized."
        races={[]}
        emptyState={{ title: "Try a different list", body: "Browse all races to find the right one for you." }}
        noindex
      />
    );
  }

  const list = races || [];

  return (
    <SeoListing
      breadcrumbs={[{ label: "Best of" }, { label: cfg.title }]}
      eyebrow={cfg.eyebrow}
      title={cfg.title}
      intro={cfg.intro}
      races={list}
      isLoading={isLoading}
      relatedLinks={cfg.related}
      emptyState={{
        title: "Not enough data yet",
        body: cfg.emptyBody,
      }}
      noindex={list.length === 0}
      testIdPrefix={`best-${slug}`}
    />
  );
}
