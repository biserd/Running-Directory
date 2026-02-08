import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link } from "wouter";
import { BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLACEHOLDER_GUIDES = [
  { slug: "beginner-5k", title: "Beginner's Guide to Your First 5K", category: "Training", description: "Everything you need to know to complete your first 5K race, from choosing shoes to race-day strategy." },
  { slug: "marathon-training", title: "Marathon Training 101", category: "Training", description: "A comprehensive guide to preparing for your first marathon, covering mileage buildup, nutrition, and recovery." },
  { slug: "trail-running-gear", title: "Essential Trail Running Gear", category: "Gear", description: "The must-have gear for trail running, from shoes and hydration to navigation and safety essentials." },
  { slug: "race-day-nutrition", title: "Race Day Nutrition Strategy", category: "Nutrition", description: "How to fuel before, during, and after your race to maximize performance and recovery." },
];

export default function GuidesHub() {
  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <Breadcrumbs items={[{ label: "Guides" }]} />
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mt-6 mb-4" data-testid="text-guides-title">Running Guides</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">Expert guides for runners of all levels. Training tips, gear reviews, and race-day strategies.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLACEHOLDER_GUIDES.map(guide => (
            <div key={guide.slug} className="group p-6 border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all" data-testid={`card-guide-${guide.slug}`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0 mt-1">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-primary" data-testid={`text-guide-category-${guide.slug}`}>{guide.category}</span>
                  <h3 className="font-heading font-bold text-xl mt-1 mb-2" data-testid={`text-guide-title-${guide.slug}`}>{guide.title}</h3>
                  <p className="text-sm text-muted-foreground" data-testid={`text-guide-description-${guide.slug}`}>{guide.description}</p>
                  <span className="inline-flex items-center text-sm text-primary font-medium mt-3">
                    Coming soon <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center bg-muted/30 p-12 rounded-xl border">
          <h2 className="font-heading font-bold text-2xl mb-3" data-testid="text-guides-cta-title">Want more guides?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto" data-testid="text-guides-cta-description">We're working on comprehensive guides for every aspect of running. Check back soon for new content.</p>
          <Button asChild>
            <Link href="/races" data-testid="link-browse-races">Browse Races</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
