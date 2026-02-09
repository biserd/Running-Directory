import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link } from "wouter";
import { MapPin, Calendar, Route, Users, Podcast, BookOpen } from "lucide-react";

export default function AboutPage() {
  return (
    <Layout>
      <Breadcrumbs items={[{ label: "About Us" }]} />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="font-heading font-extrabold text-4xl mb-8" data-testid="text-about-title">About running.services</h1>
        <div className="prose max-w-none text-muted-foreground space-y-8">
          <p className="text-lg leading-relaxed">
            running.services is a data-driven running hub for the United States — a comprehensive race calendar and route directory built for runners who want reliable, up-to-date information without the clutter.
          </p>

          <section>
            <h2 className="font-heading font-bold text-2xl text-foreground mb-4">What We Do</h2>
            <p>We aggregate and organize running data from across the country so you can find your next race, discover new routes, and connect with the running community — all in one place.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 not-prose">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-foreground text-sm">17,150+ Races</div>
                  <div className="text-xs text-muted-foreground">Across all 50 states, updated regularly from official sources</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Route className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-foreground text-sm">Running Routes</div>
                  <div className="text-xs text-muted-foreground">Curated routes with maps, elevation profiles, and difficulty ratings</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-foreground text-sm">Every State & City</div>
                  <div className="text-xs text-muted-foreground">Dedicated hubs for every state and hundreds of cities</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-foreground text-sm">Community Directory</div>
                  <div className="text-xs text-muted-foreground">Influencers, podcasts, and books for the running community</div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-heading font-bold text-2xl text-foreground mb-4">Our Mission</h2>
            <p>We believe finding your next race or running route shouldn't be hard. Our mission is to make high-quality running data freely accessible to every runner in America — whether you're training for your first 5K or your tenth marathon.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-2xl text-foreground mb-4">Where Our Data Comes From</h2>
            <p>Our race data is sourced from the RunSignUp API and other public race databases. We normalize, deduplicate, and quality-score every entry to ensure accuracy. Route data is curated from community sources and verified for completeness.</p>
            <p>If you notice incorrect information, we'd love to hear from you on our <a href="/contact" className="text-primary hover:underline">Contact page</a>.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-2xl text-foreground mb-4">Get Started</h2>
            <div className="not-prose flex flex-wrap gap-3">
              <Link href="/races" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors" data-testid="link-about-races">
                <Calendar className="h-4 w-4" /> Browse Races
              </Link>
              <Link href="/routes" className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors" data-testid="link-about-routes">
                <Route className="h-4 w-4" /> Explore Routes
              </Link>
              <Link href="/races/nearby" className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors" data-testid="link-about-nearby">
                <MapPin className="h-4 w-4" /> Races Near Me
              </Link>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
