import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function ToolsCTA() {
  return (
    <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary tracking-wide uppercase">Powered by AITracker</span>
        </div>
        <h3 className="font-heading font-bold text-2xl mb-2">Train smarter, not harder.</h3>
        <p className="text-muted-foreground max-w-lg">
          Use our advanced training tools to predict your race time, build a custom plan, and analyze your performance data.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
          <a href="https://aitracker.run" target="_blank" rel="noopener noreferrer">
            Launch Tools <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href="/tools">View All Tools</a>
        </Button>
      </div>
    </div>
  );
}
