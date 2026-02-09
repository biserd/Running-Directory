import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolsCTA } from "@/components/tools-cta";
import { useQuery } from "@tanstack/react-query";
import { apiGetBook, apiGetBooks, apiGetPodcasts } from "@/lib/api";
import { ExternalLink, BookOpen, Headphones } from "lucide-react";

export default function BookDetail() {
  const { slug } = useParams();

  const { data: book, isLoading } = useQuery({
    queryKey: ["/api/books", slug],
    queryFn: () => apiGetBook(slug!),
    enabled: !!slug,
  });

  const { data: podcasts } = useQuery({
    queryKey: ["/api/podcasts", { limit: 3 }],
    queryFn: () => apiGetPodcasts({ limit: 3 }),
  });

  const { data: allBooks } = useQuery({
    queryKey: ["/api/books", { limit: 4 }],
    queryFn: () => apiGetBooks({ limit: 4 }),
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

  if (!book) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">Book Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find this book.</p>
          <Button asChild><Link href="/books" data-testid="link-browse-books">Browse Books</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <Breadcrumbs items={[
            { label: "Books", href: "/books" },
            { label: book.title }
          ]} />

          <div className="mt-8 flex flex-col md:flex-row items-start gap-8">
            <div className="w-20 h-28 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <BookOpen className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-2" data-testid="text-book-title">{book.title}</h1>
              <p className="text-lg text-muted-foreground">by <span className="font-medium text-foreground">{book.author}</span></p>
              <div className="flex items-center gap-3 mt-3">
                {book.category && <Badge variant="secondary">{book.category}</Badge>}
                {book.publishYear && (
                  <span className="text-sm text-muted-foreground">Published {book.publishYear}</span>
                )}
                {book.pages && (
                  <span className="text-sm text-muted-foreground">{book.pages} pages</span>
                )}
              </div>
            </div>
            {book.amazonUrl && (
              <Button asChild data-testid="button-amazon">
                <a href={book.amazonUrl} target="_blank" rel="noopener noreferrer nofollow">
                  View on Amazon <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {book.description && (
          <section className="mb-12">
            <h2 className="font-heading font-bold text-2xl mb-4">About This Book</h2>
            <p className="text-muted-foreground leading-relaxed" data-testid="text-book-description">{book.description}</p>
          </section>
        )}

        <section className="mb-12">
          <h2 className="font-heading font-bold text-2xl mb-4">Details</h2>
          <div className="bg-card border rounded-xl p-6">
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Author</span>
                <span className="font-medium" data-testid="text-book-author">{book.author}</span>
              </li>
              {book.category && (
                <li className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{book.category}</span>
                </li>
              )}
              {book.publishYear && (
                <li className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Published</span>
                  <span className="font-medium">{book.publishYear}</span>
                </li>
              )}
              {book.pages && (
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Pages</span>
                  <span className="font-medium">{book.pages}</span>
                </li>
              )}
            </ul>
          </div>
        </section>

        {podcasts && podcasts.length > 0 && (
          <section className="mb-12">
            <h2 className="font-heading font-bold text-2xl mb-4">Running Podcasts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {podcasts.map(podcast => (
                <Link key={podcast.id} href={`/podcasts/${podcast.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-book-podcast-${podcast.id}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Headphones className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{podcast.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{podcast.host}</p>
                  {podcast.category && <Badge variant="secondary" className="mt-2 text-xs">{podcast.category}</Badge>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {allBooks && allBooks.filter(b => b.id !== book.id).length > 0 && (
          <section className="mb-12">
            <h2 className="font-heading font-bold text-2xl mb-4">More Running Books</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allBooks.filter(b => b.id !== book.id).slice(0, 3).map(b => (
                <Link key={b.id} href={`/books/${b.slug}`} className="block p-4 border rounded-lg hover:border-primary/50 transition-colors" data-testid={`link-more-book-${b.id}`}>
                  <span className="font-semibold text-sm">{b.title}</span>
                  <p className="text-xs text-muted-foreground">by {b.author}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mb-12">
          <h2 className="font-heading font-bold text-2xl mb-4">Explore More</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild><Link href="/influencers" data-testid="link-explore-influencers">Running Influencers</Link></Button>
            <Button variant="outline" asChild><Link href="/podcasts" data-testid="link-explore-podcasts">Running Podcasts</Link></Button>
            <Button variant="outline" asChild><Link href="/races" data-testid="link-explore-races">Find Races</Link></Button>
          </div>
        </section>

        {book.website && (
          <section className="mb-12">
            <Button variant="outline" asChild data-testid="button-website">
              <a href={book.website} target="_blank" rel="noopener noreferrer nofollow">
                Visit Official Website <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </section>
        )}

        <div className="mt-12">
          <ToolsCTA />
        </div>
      </div>
    </Layout>
  );
}
