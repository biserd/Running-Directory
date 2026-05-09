import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link } from "wouter";
import { Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BLOG_DISTANCE_SLUGS, blogPostHref, rollingMonths } from "@shared/blog-months";
import { DISTANCE_SLUG_TO_LABEL, MONTH_NAMES } from "@shared/metro";

export default function BlogPage() {
  // 12-month rolling window starting this month
  const months = rollingMonths(new Date(), 12);

  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Blog" }]} />
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <h1 className="font-heading font-extrabold text-4xl md:text-5xl mb-3" data-testid="text-blog-title">
          Race Guides Blog
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-3xl">
          Month-by-month guides to the best marathons, half marathons, 10Ks, 5Ks, and trail races
          across the USA — ranked by RaceScore, our 0–100 composite of PR potential, value,
          vibe, and beginner-friendliness. Updated continuously as new races open.
        </p>

        {BLOG_DISTANCE_SLUGS.map((distanceSlug) => {
          const cfg = DISTANCE_SLUG_TO_LABEL[distanceSlug];
          return (
            <section key={distanceSlug} className="mb-12" data-testid={`section-blog-${distanceSlug}`}>
              <h2 className="font-heading font-bold text-2xl mb-4">Best {cfg.plural} by Month</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {months.map(({ monthNum, year }) => (
                  <Link
                    key={`${distanceSlug}-${year}-${monthNum}`}
                    href={blogPostHref(distanceSlug, monthNum, year)}
                    data-testid={`link-blog-${distanceSlug}-${MONTH_NAMES[monthNum].toLowerCase()}-${year}`}
                  >
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3 w-3" />
                          {MONTH_NAMES[monthNum]} {year}
                        </div>
                        <div className="font-semibold text-sm">
                          Best {cfg.plural} in {MONTH_NAMES[monthNum]} {year}
                        </div>
                        <div className="mt-2 text-primary text-xs font-medium flex items-center gap-1">
                          Read guide <ArrowRight className="h-3 w-3" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Layout>
  );
}
