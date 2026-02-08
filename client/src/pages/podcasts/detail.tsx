import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolsCTA } from "@/components/tools-cta";
import { useQuery } from "@tanstack/react-query";
import { apiGetPodcast, apiGetPodcasts, apiGetBooks } from "@/lib/api";
import { ExternalLink, Headphones } from "lucide-react";

export default function PodcastDetail() {
  const { slug } = useParams();

  const { data: morePodcasts } = useQuery({
    queryKey: ["/api/podcasts", { limit: 4 }],
    queryFn: () => apiGetPodcasts({ limit: 4 }),
  });

  const { data: podcastBooks } = useQuery({
    queryKey: ["/api/books", { limit: 3 }],
    queryFn: () => apiGetBooks({ limit: 3 }),
  });

  const { data: podcast, isLoading } = useQuery({
    queryKey: ["/api/podcasts", slug],
    queryFn: () => apiGetPodcast(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 space-y-8">
          <Skeleton className="h-12 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!podcast) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">Podcast Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find this podcast.</p>
          <Button asChild><Link href="/podcasts" data-testid="link-browse-podcasts">Browse Podcasts</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <Breadcrumbs items={[
            { label: "Podcasts", href: "/podcasts" },
            { label: podcast.name }
          ]} />

          <div className="mt-8 flex flex-col md:flex-row items-start gap-8">
            <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Headphones className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-2" data-testid="text-podcast-name">{podcast.name}</h1>
              <p className="text-lg text-muted-foreground">Hosted by <span className="font-medium text-foreground">{podcast.host}</span></p>
              <div className="flex items-center gap-3 mt-3">
                {podcast.category && <Badge variant="secondary">{podcast.category}</Badge>}
                {podcast.episodeCount && (
                  <span className="text-sm text-muted-foreground">{podcast.episodeCount} episodes</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {podcast.description && (
          <section className="mb-12">
            <h2 className="font-heading font-bold text-2xl mb-4">About This Podcast</h2>
            <p className="text-muted-foreground leading-relaxed" data-testid="text-podcast-description">{podcast.description}</p>
          </section>
        )}

        <section className="mb-12">
          <h2 className="font-heading font-bold text-2xl mb-4">Listen Now</h2>
          <div className="flex flex-wrap gap-3">
            {podcast.spotifyUrl && (
              <Button variant="outline" asChild data-testid="button-spotify">
                <a href={podcast.spotifyUrl} target="_blank" rel="noopener noreferrer">
                  Spotify <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            {podcast.appleUrl && (
              <Button variant="outline" asChild data-testid="button-apple">
                <a href={podcast.appleUrl} target="_blank" rel="noopener noreferrer">
                  Apple Podcasts <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            {podcast.website && (
              <Button variant="outline" asChild data-testid="button-website">
                <a href={podcast.website} target="_blank" rel="noopener noreferrer">
                  Website <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </section>

        {morePodcasts && morePodcasts.filter(p => p.id !== podcast?.id).length > 0 && (
          <section className="mb-12">
            <h2 className="font-heading font-bold text-2xl mb-4">More Running Podcasts</h2>
            <div className="space-y-4">
              {morePodcasts.filter(p => p.id !== podcast?.id).slice(0, 3).map(p => (
                <Link key={p.id} href={`/podcasts/${p.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-more-podcast-${p.id}`}>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{p.host}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {podcastBooks && podcastBooks.length > 0 && (
          <section className="mb-12">
            <h2 className="font-heading font-bold text-2xl mb-4">Running Books You'll Love</h2>
            <div className="space-y-4">
              {podcastBooks.map(book => (
                <Link key={book.id} href={`/books/${book.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-podcast-book-${book.id}`}>
                  <div className="font-semibold">{book.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{book.author}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3 mb-12">
          <Button variant="outline" asChild>
            <Link href="/influencers" data-testid="link-running-influencers">Running Influencers</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/books" data-testid="link-running-books">Running Books</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/races" data-testid="link-find-races">Find Races</Link>
          </Button>
        </div>

        <div className="mt-12">
          <ToolsCTA />
        </div>
      </div>
    </Layout>
  );
}
