import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RouteCard } from "@/components/route-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiGetRoutes } from "@/lib/api";
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
      </div>
    </Layout>
  );
}
