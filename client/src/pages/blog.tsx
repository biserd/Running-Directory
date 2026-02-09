import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link } from "wouter";
import { Calendar, ArrowRight } from "lucide-react";

const blogPosts = [
  {
    slug: "how-to-choose-your-first-marathon",
    title: "How to Choose Your First Marathon",
    excerpt: "Picking the right marathon as a first-timer can make or break your experience. Here's what to look for in course profile, timing, weather, and logistics.",
    date: "February 5, 2026",
    category: "Training",
  },
  {
    slug: "best-spring-races-2026",
    title: "The 15 Best Spring Races in 2026",
    excerpt: "From the Boston Marathon to hidden gems across the South, these are the spring races worth putting on your calendar this year.",
    date: "January 28, 2026",
    category: "Race Guides",
  },
  {
    slug: "trail-running-beginners-guide",
    title: "A Beginner's Guide to Trail Running",
    excerpt: "Trail running offers a refreshing change from pavement. Learn about gear, technique, safety, and the best beginner-friendly trails across the USA.",
    date: "January 20, 2026",
    category: "Guides",
  },
  {
    slug: "running-in-the-heat",
    title: "Running in the Heat: Safety Tips for Summer",
    excerpt: "Summer training doesn't have to be dangerous. Learn the signs of heat exhaustion, hydration strategies, and how to adjust your pace in warm weather.",
    date: "January 12, 2026",
    category: "Training",
  },
  {
    slug: "race-day-nutrition-guide",
    title: "Race Day Nutrition: What to Eat Before, During, and After",
    excerpt: "Your fueling strategy can be the difference between a PR and a bonk. A practical guide to race day nutrition for every distance.",
    date: "January 5, 2026",
    category: "Nutrition",
  },
];

export default function BlogPage() {
  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Blog" }]} />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="font-heading font-extrabold text-4xl mb-4" data-testid="text-blog-title">Blog</h1>
        <p className="text-lg text-muted-foreground mb-10">Tips, guides, and race insights for runners of every level.</p>

        <div className="space-y-8">
          {blogPosts.map((post) => (
            <article key={post.slug} className="group border rounded-lg p-6 hover:border-primary/50 transition-colors" data-testid={`card-blog-${post.slug}`}>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">{post.category}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {post.date}
                </span>
              </div>
              <h2 className="font-heading font-bold text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">{post.excerpt}</p>
              <span className="text-primary text-sm font-medium flex items-center gap-1">
                Coming soon <ArrowRight className="h-3 w-3" />
              </span>
            </article>
          ))}
        </div>

        <div className="mt-12 p-8 bg-muted/50 rounded-lg text-center">
          <h2 className="font-heading font-bold text-xl mb-2">More articles coming soon</h2>
          <p className="text-sm text-muted-foreground">We're working on in-depth guides, race reviews, and training tips. Check back regularly for new content.</p>
        </div>
      </div>
    </Layout>
  );
}
