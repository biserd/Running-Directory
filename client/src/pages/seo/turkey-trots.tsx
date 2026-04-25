import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SeoListing } from "@/components/seo/seo-listing";
import { apiSearchRaces, buildRaceSearchQs } from "@/lib/api";
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

  const searchParams = metroSlug
    ? { isTurkeyTrot: true, state: stateAbbr, city: cityName, sort: "date" as const, limit: 60 }
    : { isTurkeyTrot: true, sort: "date" as const, limit: 60 };

  const apiQs = buildRaceSearchQs(searchParams);
  const { data: races, isLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", apiQs],
    queryFn: () => apiSearchRaces(searchParams),
    enabled: metroSlug ? !!stateAbbr && !!cityName : true,
  });

  const list = races || [];

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
        noindex={list.length < 5}
        testIdPrefix="turkey-trots-metro"
      />
    );
  }

  return (
    <SeoListing
      breadcrumbs={[{ label: "Turkey Trots" }]}
      eyebrow="Thanksgiving 5K"
      title="Turkey Trots in the USA"
      intro="The complete national list of Thanksgiving morning Turkey Trots — sorted by date so you can lock in your Thanksgiving 5K before it sells out."
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
    />
  );
}
