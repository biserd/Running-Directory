import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RaceCard } from "@/components/race-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Calendar, ArrowRight, Info, Bell } from "lucide-react";
import type { ReactNode } from "react";
import type { Race } from "@shared/schema";

interface RelatedLink {
  label: string;
  href: string;
}

interface SeoListingProps {
  breadcrumbs: Array<{ label: string; href?: string }>;
  eyebrow?: string;
  title: string;
  intro: string;
  races: Race[];
  isLoading?: boolean;
  relatedLinks?: RelatedLink[];
  emptyState?: {
    title: string;
    body: string;
    fallbackHref?: string;
    fallbackLabel?: string;
  };
  showAlertCta?: boolean;
  alertCtaText?: string;
  noindex?: boolean;
  testIdPrefix?: string;
  children?: ReactNode;
}

export function SeoListing({
  breadcrumbs,
  eyebrow,
  title,
  intro,
  races,
  isLoading,
  relatedLinks = [],
  emptyState,
  showAlertCta = true,
  alertCtaText = "Get an alert when a new race is added",
  noindex,
  testIdPrefix = "seo",
  children,
}: SeoListingProps) {
  const hasRaces = races.length > 0;
  return (
    <Layout>
      <section className="bg-background">
        <div className="container mx-auto px-4 pt-6 pb-2">
          <Breadcrumbs items={breadcrumbs} />
        </div>
        <div className="container mx-auto px-4 pb-8 pt-2">
          {eyebrow && (
            <Badge variant="secondary" className="mb-3" data-testid={`${testIdPrefix}-eyebrow`}>
              {eyebrow}
            </Badge>
          )}
          <h1 className="text-3xl md:text-5xl font-heading font-bold leading-tight mb-3" data-testid={`${testIdPrefix}-title`}>
            {title}
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl" data-testid={`${testIdPrefix}-intro`}>
            {intro}
          </p>
          {noindex && (
            <p className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5" data-testid={`${testIdPrefix}-noindex-note`}>
              <Info className="h-3.5 w-3.5" />
              We don't have enough data here yet, so this page isn't indexed by search engines.
            </p>
          )}
        </div>

        <div className="container mx-auto px-4 pb-12">
          {isLoading && (
            <p className="text-muted-foreground" data-testid={`${testIdPrefix}-loading`}>Loading races…</p>
          )}

          {!isLoading && hasRaces && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid={`${testIdPrefix}-list`}>
              {races.map(race => (
                <RaceCard key={race.id} race={race} />
              ))}
            </div>
          )}

          {!isLoading && !hasRaces && emptyState && (
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="font-semibold text-lg mb-2" data-testid={`${testIdPrefix}-empty-title`}>{emptyState.title}</h2>
                <p className="text-muted-foreground mb-5" data-testid={`${testIdPrefix}-empty-body`}>{emptyState.body}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild data-testid={`${testIdPrefix}-empty-fallback`}>
                    <Link href={emptyState.fallbackHref || "/races"}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {emptyState.fallbackLabel || "Browse all races"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoading && hasRaces && showAlertCta && (
            <div className="mt-10">
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold leading-tight" data-testid={`${testIdPrefix}-alert-title`}>{alertCtaText}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Save this search and we'll email you when a matching race opens registration or drops in price.</p>
                    </div>
                  </div>
                  <Button variant="outline" asChild data-testid={`${testIdPrefix}-alert-cta`}>
                    <Link href="/favorites">Save this search</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {relatedLinks.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-heading font-semibold mb-4" data-testid={`${testIdPrefix}-related-heading`}>Explore more</h2>
              <div className="flex flex-wrap gap-2">
                {relatedLinks.map(link => (
                  <Button key={link.href} variant="outline" size="sm" asChild data-testid={`${testIdPrefix}-related-${link.href.replace(/[^a-z0-9]/gi, "-").replace(/^-|-$/g, "")}`}>
                    <Link href={link.href}>
                      {link.label}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {children}
        </div>
      </section>
    </Layout>
  );
}
