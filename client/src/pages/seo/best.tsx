import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SeoListing } from "@/components/seo/seo-listing";
import { apiSearchRaces, buildRaceSearchQs } from "@/lib/api";
import { BEST_CONFIGS } from "@shared/best-configs";
import type { Race } from "@shared/schema";


export default function BestPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const cfg = BEST_CONFIGS[slug];

  const apiQs = cfg ? buildRaceSearchQs(cfg.search) : "";
  const { data: races, isLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", apiQs],
    queryFn: () => apiSearchRaces(cfg!.search),
    enabled: !!cfg,
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
