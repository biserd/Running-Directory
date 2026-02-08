import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiGetInfluencers } from "@/lib/api";
import { ArrowRight, Users, ExternalLink } from "lucide-react";

export default function InfluencersHub() {
  const { data: influencers, isLoading } = useQuery({
    queryKey: ["/api/influencers"],
    queryFn: () => apiGetInfluencers(),
  });

  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <Breadcrumbs items={[{ label: "Influencers" }]} />
          <div className="flex items-center gap-3 mt-6 mb-4">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight" data-testid="text-influencers-title">Running Influencers</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl" data-testid="text-influencers-subtitle">
            Follow the top runners, coaches, and content creators shaping the running community.
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
            {influencers?.map(inf => (
              <Link key={inf.id} href={`/influencers/${inf.slug}`} className="group block border rounded-xl hover:border-primary/50 hover:shadow-md transition-all overflow-hidden" data-testid={`card-influencer-${inf.id}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {inf.name.charAt(0)}
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="font-heading font-bold text-lg group-hover:text-primary transition-colors" data-testid={`text-influencer-name-${inf.id}`}>{inf.name}</h3>
                  <p className="text-sm text-primary font-medium mt-0.5" data-testid={`text-influencer-handle-${inf.id}`}>{inf.handle}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">{inf.platform}</Badge>
                    {inf.followers && <span className="text-xs text-muted-foreground">{inf.followers} followers</span>}
                  </div>
                  {inf.specialty && <p className="text-xs text-muted-foreground mt-2">{inf.specialty}</p>}
                  {inf.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{inf.bio}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
