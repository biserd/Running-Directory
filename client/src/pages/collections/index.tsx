import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiGetCollections } from "@/lib/api";
import { ArrowRight } from "lucide-react";

export default function CollectionsHub() {
  const { data: collections, isLoading } = useQuery({
    queryKey: ["/api/collections"],
    queryFn: () => apiGetCollections(),
  });

  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <Breadcrumbs items={[{ label: "Collections" }]} />
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mt-6 mb-4" data-testid="text-collections-title">Collections</h1>
          <p className="text-lg text-muted-foreground max-w-3xl" data-testid="text-collections-subtitle">Curated lists of the best races and routes across the USA.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections?.map(collection => (
              <Link key={collection.id} href={`/collections/${collection.slug}`} className="group block p-6 border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all" data-testid={`link-collection-${collection.slug}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-primary" data-testid={`text-collection-type-${collection.slug}`}>{collection.type}</span>
                    <h3 className="font-heading font-bold text-xl mt-1 mb-2 group-hover:text-primary transition-colors" data-testid={`text-collection-title-${collection.slug}`}>{collection.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-collection-description-${collection.slug}`}>{collection.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 p-8 bg-muted/30 rounded-xl border">
          <h3 className="font-heading font-bold text-xl mb-4">Explore More</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/races" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center bg-background" data-testid="link-explore-races">
              <div className="font-semibold">Race Calendar</div>
              <div className="text-xs text-muted-foreground mt-1">17,000+ races across the USA</div>
            </Link>
            <Link href="/routes" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center bg-background" data-testid="link-explore-routes">
              <div className="font-semibold">Running Routes</div>
              <div className="text-xs text-muted-foreground mt-1">Paths, trails, and loops</div>
            </Link>
            <Link href="/podcasts" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center bg-background" data-testid="link-explore-podcasts">
              <div className="font-semibold">Running Podcasts</div>
              <div className="text-xs text-muted-foreground mt-1">Top shows for runners</div>
            </Link>
            <Link href="/books" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center bg-background" data-testid="link-explore-books">
              <div className="font-semibold">Running Books</div>
              <div className="text-xs text-muted-foreground mt-1">Essential reads for runners</div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
