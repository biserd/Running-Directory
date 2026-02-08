import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RouteCard } from "@/components/route-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiGetRoutes } from "@/lib/api";
import { Link } from "wouter";
import heroImage from "@/assets/images/hero-routes.jpg";

export default function RoutesHub() {
  const { data: routes, isLoading } = useQuery({
    queryKey: ["/api/routes"],
    queryFn: () => apiGetRoutes(),
  });

  return (
    <Layout>
       <Hero 
        title="Running Routes Directory" 
        subtitle="Explore the best paths, trails, and track loops near you."
        image={heroImage}
        showSearch={true}
        size="sm"
      />
      
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: "Routes" }]} />
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {routes?.map(route => (
              <RouteCard key={route.id} route={route} />
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
            <Link href="/books" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center bg-background" data-testid="link-explore-books">
              <div className="font-semibold">Running Books</div>
              <div className="text-xs text-muted-foreground mt-1">Essential reads for runners</div>
            </Link>
            <Link href="/podcasts" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center bg-background" data-testid="link-explore-podcasts">
              <div className="font-semibold">Running Podcasts</div>
              <div className="text-xs text-muted-foreground mt-1">Top shows for runners</div>
            </Link>
            <Link href="/influencers" className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-center bg-background" data-testid="link-explore-influencers">
              <div className="font-semibold">Influencers</div>
              <div className="text-xs text-muted-foreground mt-1">Runners to follow</div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
