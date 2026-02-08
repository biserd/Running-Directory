import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolsCTA } from "@/components/tools-cta";
import { useQuery } from "@tanstack/react-query";
import { apiGetInfluencer, apiGetPodcasts, apiGetBooks } from "@/lib/api";
import { ExternalLink, Users } from "lucide-react";

export default function InfluencerDetail() {
  const { slug } = useParams();

  const { data: relatedPodcasts } = useQuery({
    queryKey: ["/api/podcasts", { limit: 3 }],
    queryFn: () => apiGetPodcasts({ limit: 3 }),
  });

  const { data: relatedBooks } = useQuery({
    queryKey: ["/api/books", { limit: 3 }],
    queryFn: () => apiGetBooks({ limit: 3 }),
  });

  const { data: influencer, isLoading } = useQuery({
    queryKey: ["/api/influencers", slug],
    queryFn: () => apiGetInfluencer(slug!),
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

  if (!influencer) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">Influencer Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find this influencer.</p>
          <Button asChild><Link href="/influencers" data-testid="link-browse-influencers">Browse Influencers</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <Breadcrumbs items={[
            { label: "Influencers", href: "/influencers" },
            { label: influencer.name }
          ]} />

          <div className="mt-8 flex flex-col md:flex-row items-start gap-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl flex-shrink-0">
              {influencer.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-2" data-testid="text-influencer-name">{influencer.name}</h1>
              <p className="text-lg text-primary font-medium" data-testid="text-influencer-handle">{influencer.handle}</p>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="secondary">{influencer.platform}</Badge>
                {influencer.followers && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-4 w-4" /> {influencer.followers} followers
                  </span>
                )}
                {influencer.specialty && (
                  <Badge variant="outline">{influencer.specialty}</Badge>
                )}
              </div>
            </div>
            {influencer.website && (
              <Button asChild data-testid="button-website">
                <a href={influencer.website} target="_blank" rel="noopener noreferrer">
                  Visit Profile <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {influencer.bio && (
          <section className="mb-12">
            <h2 className="font-heading font-bold text-2xl mb-4">About</h2>
            <p className="text-muted-foreground leading-relaxed" data-testid="text-influencer-bio">{influencer.bio}</p>
          </section>
        )}

        {relatedPodcasts && relatedPodcasts.length > 0 && (
          <section className="mb-12">
            <h2 className="font-heading font-bold text-2xl mb-4">Running Podcasts to Follow</h2>
            <div className="space-y-4">
              {relatedPodcasts.map(podcast => (
                <Link key={podcast.id} href={`/podcasts/${podcast.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-related-podcast-${podcast.id}`}>
                  <div className="font-semibold">{podcast.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{podcast.host}</span>
                    {podcast.category && (
                      <>
                        <span>·</span>
                        <span>{podcast.category}</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {relatedBooks && relatedBooks.length > 0 && (
          <section className="mb-12">
            <h2 className="font-heading font-bold text-2xl mb-4">Recommended Running Books</h2>
            <div className="space-y-4">
              {relatedBooks.map(book => (
                <Link key={book.id} href={`/books/${book.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-related-book-${book.id}`}>
                  <div className="font-semibold">{book.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{book.author}</span>
                    {book.category && (
                      <>
                        <span>·</span>
                        <span>{book.category}</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3 mb-12">
          <Button variant="outline" asChild>
            <Link href="/podcasts" data-testid="link-all-podcasts">All Podcasts</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/books" data-testid="link-all-books">All Books</Link>
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
