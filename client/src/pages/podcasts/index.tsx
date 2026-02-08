import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiGetPodcasts } from "@/lib/api";
import { ArrowRight, Headphones, ExternalLink } from "lucide-react";

export default function PodcastsHub() {
  const { data: podcasts, isLoading } = useQuery({
    queryKey: ["/api/podcasts"],
    queryFn: () => apiGetPodcasts(),
  });

  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <Breadcrumbs items={[{ label: "Podcasts" }]} />
          <div className="flex items-center gap-3 mt-6 mb-4">
            <Headphones className="h-8 w-8 text-primary" />
            <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight" data-testid="text-podcasts-title">Running Podcasts</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl" data-testid="text-podcasts-subtitle">
            The best podcasts for runners — from training tips to elite athlete interviews.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {podcasts?.map(podcast => (
              <Link key={podcast.id} href={`/podcasts/${podcast.slug}`} className="group block border rounded-xl hover:border-primary/50 hover:shadow-md transition-all" data-testid={`card-podcast-${podcast.id}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <Headphones className="h-7 w-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-lg group-hover:text-primary transition-colors" data-testid={`text-podcast-name-${podcast.id}`}>{podcast.name}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">Hosted by {podcast.host}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {podcast.category && <Badge variant="secondary" className="text-xs">{podcast.category}</Badge>}
                          {podcast.episodeCount && <span className="text-xs text-muted-foreground">{podcast.episodeCount} episodes</span>}
                        </div>
                        {podcast.description && (
                          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{podcast.description}</p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1 ml-2" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
