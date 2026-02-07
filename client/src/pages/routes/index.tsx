import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { RouteCard } from "@/components/route-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ROUTES } from "@/lib/mock-data";
import heroImage from "@/assets/images/hero-routes.jpg";

export default function RoutesHub() {
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {ROUTES.map(route => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
