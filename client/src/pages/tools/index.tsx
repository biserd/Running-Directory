import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { ToolsCTA } from "@/components/tools-cta";
import { TOOLS } from "@/lib/mock-data";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";

export default function ToolsHub() {
  return (
    <Layout>
      <div className="bg-slate-900 text-white py-20 text-center">
        <div className="container mx-auto px-4">
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl mb-6">Runner's Toolkit</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            Advanced calculators and training utilities powered by AITracker.
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8 -mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TOOLS.map(tool => (
            <Card key={tool.slug} className="hover:border-primary/50 transition-all hover:-translate-y-1 shadow-lg">
              <CardContent className="p-6 flex flex-col h-full text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                  <tool.icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading font-bold text-xl mb-2">{tool.name}</h3>
                <p className="text-sm text-muted-foreground mb-6 flex-1">
                  {tool.description}
                </p>
                <Button className="w-full" asChild>
                  <a href={tool.href}>Open Tool <ArrowRight className="ml-2 h-4 w-4" /></a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading font-bold text-3xl mb-4">Why use AITracker tools?</h2>
            <p className="text-muted-foreground text-lg">Data-driven insights to help you hit your next PR.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-secondary/30 rounded-xl">
              <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="font-bold mb-2">Personalized</h3>
              <p className="text-sm text-muted-foreground">Adapts to your fitness level and recent race history.</p>
            </div>
            <div className="p-6 bg-secondary/30 rounded-xl">
              <div className="h-10 w-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="font-bold mb-2">Scientific</h3>
              <p className="text-sm text-muted-foreground">Based on proven physiological formulas (Daniels, Riegel).</p>
            </div>
            <div className="p-6 bg-secondary/30 rounded-xl">
              <div className="h-10 w-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="font-bold mb-2">Free to Start</h3>
              <p className="text-sm text-muted-foreground">Core tools are free for all runners.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
