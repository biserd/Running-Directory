import { useMemo } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RaceCard } from "@/components/race-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Calendar, ArrowRight, Info } from "lucide-react";
import { apiSearchRaces, buildRaceSearchQs } from "@/lib/api";
import { computeRaceScore } from "@shared/race-score";
import { parseBlogPostSlug, blogPostHref, BLOG_DISTANCE_SLUGS } from "@shared/blog-months";
import { MONTH_NAMES } from "@shared/metro";
import type { Race } from "@shared/schema";

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const parsed = params.slug ? parseBlogPostSlug(params.slug) : null;

  const searchParams = parsed
    ? {
        distance: parsed.distanceCfg.distance || undefined,
        surface: parsed.distanceCfg.surface || undefined,
        month: parsed.monthNum,
        year: parsed.year,
        sort: "date" as const,
        limit: 60,
      }
    : null;

  const apiQs = searchParams ? buildRaceSearchQs(searchParams) : "";
  const { data: races, isLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", apiQs],
    queryFn: () => apiSearchRaces(searchParams!),
    enabled: !!searchParams,
  });

  const sorted = useMemo(() => {
    const list = (races || []).slice();
    return list.sort((a, b) => computeRaceScore(b as any).score - computeRaceScore(a as any).score);
  }, [races]);

  if (!parsed) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-2">Article not found</h1>
          <p className="text-muted-foreground mb-6">That blog URL isn't recognized.</p>
          <Button asChild><Link href="/blog">Back to blog</Link></Button>
        </div>
      </Layout>
    );
  }

  const { distanceSlug, distanceCfg, monthNum, monthLabel, year } = parsed;
  const distLower = distanceCfg.label.toLowerCase();
  const distPluralLower = distanceCfg.plural.toLowerCase();
  const top = sorted.slice(0, 10);
  const dateRangeLabel = `${monthLabel} ${year}`;

  // Related posts: same distance, prev/next month; same month other distances
  const prevMonth = monthNum === 1 ? { m: 12, y: year - 1 } : { m: monthNum - 1, y: year };
  const nextMonth = monthNum === 12 ? { m: 1, y: year + 1 } : { m: monthNum + 1, y: year };
  const relatedSameDistance = [
    { label: `Best ${distanceCfg.plural} in ${MONTH_NAMES[prevMonth.m]} ${prevMonth.y}`, href: blogPostHref(distanceSlug, prevMonth.m, prevMonth.y) },
    { label: `Best ${distanceCfg.plural} in ${MONTH_NAMES[nextMonth.m]} ${nextMonth.y}`, href: blogPostHref(distanceSlug, nextMonth.m, nextMonth.y) },
  ];
  const relatedSameMonth = BLOG_DISTANCE_SLUGS
    .filter((d) => d !== distanceSlug)
    .map((d) => ({
      label: `Best ${d.replace(/-/g, " ")} in ${monthLabel} ${year}`,
      href: blogPostHref(d, monthNum, year),
    }));

  return (
    <Layout>
      <article className="bg-background">
        <div className="container mx-auto px-4 pt-6 pb-2 max-w-5xl">
          <Breadcrumbs
            items={[
              { label: "Blog", href: "/blog" },
              { label: `${distanceCfg.plural} in ${monthLabel} ${year}` },
            ]}
          />
        </div>

        <header className="container mx-auto px-4 pb-6 pt-2 max-w-5xl">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Calendar className="h-3.5 w-3.5" />
            <time dateTime={`${year}-${String(monthNum).padStart(2, "0")}-01`}>{dateRangeLabel}</time>
            <span>•</span>
            <span>USA Race Guide</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-bold leading-tight mb-3" data-testid="text-blogpost-title">
            Best {distanceCfg.plural} in {monthLabel} {year} (USA)
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl" data-testid="text-blogpost-intro">
            The top {distPluralLower} happening across the United States in {dateRangeLabel}, ranked by{" "}
            <strong>RaceScore</strong> — our 0–100 composite of PR potential, value for money, vibe,
            beginner-friendliness, and data confidence. Whether you're chasing a personal record,
            looking for a beginner-friendly first {distLower}, or planning a destination race weekend,
            this guide narrows the calendar to the events most worth your time.
          </p>
        </header>

        <div className="container mx-auto px-4 pb-12 max-w-5xl">
          <h2 className="text-2xl font-heading font-bold mb-4 mt-2">
            Top {top.length || ""} {distPluralLower} this {monthLabel.toLowerCase()}
          </h2>

          {isLoading && <p className="text-muted-foreground" data-testid="text-blogpost-loading">Loading races…</p>}

          {!isLoading && top.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="font-semibold text-lg mb-2">No {distPluralLower} on the calendar yet</h3>
                <p className="text-muted-foreground mb-5">
                  We don't have enough confirmed {distPluralLower} for {dateRangeLabel} to publish a confident list.
                  Check back soon, or browse the full search.
                </p>
                <Button asChild>
                  <Link href="/races">
                    <Calendar className="mr-2 h-4 w-4" />
                    Browse all races
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {!isLoading && top.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10" data-testid="list-blogpost-races">
                {top.map((r) => <RaceCard key={r.id} race={r} />)}
              </div>

              {sorted.length > top.length && (
                <p className="text-sm text-muted-foreground mb-10">
                  Showing the top {top.length} of {sorted.length} {distPluralLower} we track for{" "}
                  {dateRangeLabel}.{" "}
                  <Link href={`/best-races/${distanceSlug}/${parsed.monthSlug}`} className="text-primary underline">
                    See the full list →
                  </Link>
                </p>
              )}

              <h2 className="text-2xl font-heading font-bold mb-3 mt-12">
                How we rank {distPluralLower}
              </h2>
              <p className="text-muted-foreground mb-3">
                Every race on running.services is scored on a deterministic 0–100 scale we call{" "}
                <strong>RaceScore</strong>. It's a weighted blend of:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-6">
                <li><strong>PR potential</strong> — flat, fast, weather-friendly courses score higher.</li>
                <li><strong>Value for money</strong> — entry fee versus what's included.</li>
                <li><strong>Vibe</strong> — crowd, scenery, post-race party, festival features.</li>
                <li><strong>Beginner-friendliness</strong> — generous cutoffs, walker policy, course support.</li>
                <li><strong>Family-fit</strong> — kids races, stroller policy, spectator access.</li>
                <li><strong>Data completeness</strong> — verified course, photos, elevation, reviews.</li>
              </ul>

              <h2 className="text-2xl font-heading font-bold mb-3 mt-10">
                Frequently asked questions
              </h2>
              <div className="space-y-4 text-muted-foreground" data-testid="section-blogpost-faq">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    What is the best {distLower} in {monthLabel} {year}?
                  </h3>
                  <p>
                    Based on RaceScore, the highest-rated {distLower} in {dateRangeLabel} is{" "}
                    <strong>{top[0]?.name}</strong> in {top[0]?.city}, {top[0]?.state}. It scores well
                    on a balance of PR potential, value, and runner-rated vibe.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    How many {distPluralLower} are there in the USA in {monthLabel} {year}?
                  </h3>
                  <p>
                    We currently track <strong>{sorted.length}</strong> confirmed {distPluralLower} on
                    the {dateRangeLabel} calendar. The list updates automatically as organizers
                    publish new events.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Is {monthLabel} a good month to run a {distLower}?
                  </h3>
                  <p>
                    {monthAdvice(monthNum, distanceCfg.label)}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    How do I find a beginner-friendly {distLower}?
                  </h3>
                  <p>
                    Look for races with a generous time cutoff, a walker-friendly policy, and a flat
                    course. Each race detail page on running.services shows a beginner-friendliness
                    sub-score so you can filter accordingly.
                  </p>
                </div>
              </div>

              <div className="mt-12 grid md:grid-cols-2 gap-3">
                {[...relatedSameDistance, ...relatedSameMonth].map((link) => (
                  <Button key={link.href} variant="outline" asChild className="justify-between" data-testid={`link-blogpost-related-${link.href.replace(/[^a-z0-9]/gi, "-")}`}>
                    <Link href={link.href}>
                      {link.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ))}
              </div>
            </>
          )}

          {sorted.length > 0 && sorted.length < 5 && (
            <p className="mt-6 text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              We have limited data for this month — this guide is hidden from search engines until we have more races.
            </p>
          )}
        </div>
      </article>
    </Layout>
  );
}

function monthAdvice(monthNum: number, distance: string): string {
  const cool = monthNum === 3 || monthNum === 4 || monthNum === 10 || monthNum === 11;
  const cold = monthNum === 12 || monthNum === 1 || monthNum === 2;
  const hot = monthNum >= 6 && monthNum <= 8;
  if (cool) return `${MONTH_NAMES[monthNum]} is one of the best months in the USA for a ${distance.toLowerCase()} — cool, stable temperatures across most of the country make it prime PR season.`;
  if (cold) return `${MONTH_NAMES[monthNum]} runs cold in most of the country, which is great for distance running if you train in layers, but watch for icy starts in northern states. Southern races (FL, AZ, TX) tend to draw the biggest fields.`;
  if (hot) return `${MONTH_NAMES[monthNum]} can be hot and humid, especially in the Southeast and Midwest. Look for early-morning starts, mountain or coastal courses, and races with strong aid-station support.`;
  return `${MONTH_NAMES[monthNum]} sits in the shoulder season for most US race regions — expect mild weather and a mix of championship and casual events.`;
}
