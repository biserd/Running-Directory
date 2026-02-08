import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiGetBooks } from "@/lib/api";
import { ArrowRight, BookOpen } from "lucide-react";

export default function BooksHub() {
  const { data: books, isLoading } = useQuery({
    queryKey: ["/api/books"],
    queryFn: () => apiGetBooks(),
  });

  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <Breadcrumbs items={[{ label: "Books" }]} />
          <div className="flex items-center gap-3 mt-6 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight" data-testid="text-books-title">Running Books</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl" data-testid="text-books-subtitle">
            Essential reading for runners — from training science to inspiring memoirs.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books?.map(book => (
              <Link key={book.id} href={`/books/${book.slug}`} className="group block border rounded-xl hover:border-primary/50 hover:shadow-md transition-all" data-testid={`card-book-${book.id}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-16 rounded bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="font-heading font-bold text-lg group-hover:text-primary transition-colors" data-testid={`text-book-title-${book.id}`}>{book.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">by {book.author}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {book.category && <Badge variant="secondary" className="text-xs">{book.category}</Badge>}
                    {book.publishYear && <span className="text-xs text-muted-foreground">{book.publishYear}</span>}
                    {book.pages && <span className="text-xs text-muted-foreground">{book.pages} pages</span>}
                  </div>
                  {book.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{book.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
