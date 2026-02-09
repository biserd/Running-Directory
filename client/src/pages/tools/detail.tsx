import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import { TOOLS } from "@/lib/mock-data";

export default function ToolDetail() {
  const { slug } = useParams();
  const tool = TOOLS.find(t => t.slug === slug);

  if (!tool) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">Tool Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find that tool.</p>
          <Button asChild><Link href="/tools" data-testid="link-browse-tools">Browse All Tools</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-slate-900 text-white py-16">
        <div className="container mx-auto px-4">
          <Breadcrumbs items={[
            { label: "Tools", href: "/tools" },
            { label: tool.name }
          ]} />

          <div className="mt-8 max-w-3xl">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-6">
              <tool.icon className="h-8 w-8" />
            </div>
            <h1 className="font-heading font-extrabold text-4xl md:text-5xl tracking-tight mb-4" data-testid="text-tool-name">{tool.name}</h1>
            <p className="text-xl text-slate-300 mb-8" data-testid="text-tool-description">{tool.description}</p>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-semibold" asChild data-testid="button-open-aitracker">
              <a href={`https://aitracker.run`} target="_blank" rel="noopener noreferrer nofollow">
                Open in AITracker <ArrowUpRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <section className="space-y-8">
          <div>
            <h2 className="font-heading font-bold text-2xl mb-4">How it works</h2>
            <p className="text-muted-foreground leading-relaxed">
              This tool is powered by AITracker.run, our companion platform built specifically for runners. 
              It uses proven physiological formulas and AI to deliver personalized training insights 
              based on your fitness level and recent performance data.
            </p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
            <h3 className="font-heading font-bold text-xl mb-3">Ready to get started?</h3>
            <p className="text-muted-foreground mb-6">Open {tool.name} in AITracker to access the full tool.</p>
            <Button size="lg" asChild data-testid="button-open-aitracker-cta">
              <a href="https://aitracker.run" target="_blank" rel="noopener noreferrer nofollow">
                Open in AITracker <ArrowUpRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>

          <div className="text-center pt-4">
            <Button variant="ghost" asChild data-testid="link-back-tools">
              <Link href="/tools">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Tools
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
