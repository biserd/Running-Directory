import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Calendar, Sparkles, ArrowRight } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <Layout>
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-7 w-7" />
              </div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3" data-testid="text-coming-soon-title">{title}</h1>
              <p className="text-muted-foreground mb-8" data-testid="text-coming-soon-description">{description}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild data-testid="button-browse-races">
                  <Link href="/races">
                    <Calendar className="mr-2 h-4 w-4" />
                    Browse all races
                  </Link>
                </Button>
                <Button variant="outline" asChild data-testid="button-go-home">
                  <Link href="/">
                    Home <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-8">We're building this out — the underlying data and scoring are already live.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}

export const RaceShopperPage = () => (
  <ComingSoon
    title="Race Shopper"
    description="A goal-driven race picker is coming soon. Tell us what you want — a PR, your first 5K, a value pick, or a big-vibe event — and we'll rank every upcoming race for it."
  />
);

export const ComparePage = () => (
  <ComingSoon
    title="Compare Races"
    description="Side-by-side comparison of any 2-4 races on weather, difficulty, vibe, value, and PR potential is on the way."
  />
);

export const ThisWeekendPage = () => (
  <ComingSoon
    title="Races This Weekend"
    description="A live feed of races happening in the next 72 hours, filterable by state and distance, is launching soon."
  />
);

export const PriceWatchPage = () => (
  <ComingSoon
    title="Price Watch"
    description="Track which races have a registration-price increase coming up so you can save money by signing up early."
  />
);

export const OrganizersPage = () => (
  <ComingSoon
    title="Race Organizers"
    description="Profiles for the race directors and organizers behind the events, including all of their upcoming races, are coming soon."
  />
);
