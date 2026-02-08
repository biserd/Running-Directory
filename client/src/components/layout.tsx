import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Search, Menu, X, ChevronRight, ArrowRight, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-heading font-bold text-xl tracking-tighter flex items-center gap-1">
              running<span className="text-primary">.services</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/races" className={cn("transition-colors hover:text-primary", location.startsWith("/races") && !location.startsWith("/races/nearby") ? "text-primary" : "text-foreground/80")}>
                Races
            </Link>
            <Link href="/races/nearby" className={cn("transition-colors hover:text-primary flex items-center gap-1", location.startsWith("/races/nearby") ? "text-primary" : "text-foreground/80")} data-testid="link-near-me">
                <MapPin className="h-3.5 w-3.5" /> Near Me
            </Link>
            <Link href="/routes" className={cn("transition-colors hover:text-primary", location.startsWith("/routes") ? "text-primary" : "text-foreground/80")}>
                Routes
            </Link>
            <Link href="/tools" className={cn("transition-colors hover:text-primary", location.startsWith("/tools") ? "text-primary" : "text-foreground/80")}>
                Tools
            </Link>
            <Link href="/influencers" className={cn("transition-colors hover:text-primary", location.startsWith("/influencers") ? "text-primary" : "text-foreground/80")} data-testid="link-influencers">
                Influencers
            </Link>
            <Link href="/podcasts" className={cn("transition-colors hover:text-primary", location.startsWith("/podcasts") ? "text-primary" : "text-foreground/80")} data-testid="link-podcasts">
                Podcasts
            </Link>
            <Link href="/books" className={cn("transition-colors hover:text-primary", location.startsWith("/books") ? "text-primary" : "text-foreground/80")} data-testid="link-books">
                Books
            </Link>
            <Link href="/guides" className={cn("transition-colors hover:text-primary", location.startsWith("/guides") ? "text-primary" : "text-foreground/80")}>
                Guides
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="search" 
                placeholder="Find a race or route..." 
                className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            
            {/* Mobile Nav */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex flex-col gap-4 mt-8">
                  <Link href="/races" className="text-lg font-medium py-2 border-b">Races</Link>
                  <Link href="/races/nearby" className="text-lg font-medium py-2 border-b flex items-center gap-2" data-testid="link-near-me-mobile">
                    <MapPin className="h-4 w-4" /> Races Near Me
                  </Link>
                  <Link href="/routes" className="text-lg font-medium py-2 border-b">Routes</Link>
                  <Link href="/tools" className="text-lg font-medium py-2 border-b">Tools</Link>
                  <Link href="/influencers" className="text-lg font-medium py-2 border-b" data-testid="link-influencers-mobile">Influencers</Link>
                  <Link href="/podcasts" className="text-lg font-medium py-2 border-b" data-testid="link-podcasts-mobile">Podcasts</Link>
                  <Link href="/books" className="text-lg font-medium py-2 border-b" data-testid="link-books-mobile">Books</Link>
                  <Link href="/guides" className="text-lg font-medium py-2 border-b">Guides</Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {children}
      </main>

      <footer className="border-t bg-muted/30 pt-16 pb-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="font-heading font-bold text-lg tracking-tighter">
                  running<span className="text-primary">.services</span>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">
                Data-driven race calendar and route directory for runners across the USA.
              </p>
            </div>
            <div>
              <h4 className="font-heading font-semibold mb-4">Discover</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/races" className="hover:text-primary">Race Calendar</Link></li>
                <li><Link href="/races/nearby" className="hover:text-primary">Races Near Me</Link></li>
                <li><Link href="/routes" className="hover:text-primary">Running Routes</Link></li>
                <li><Link href="/tools" className="hover:text-primary">Runner Tools</Link></li>
                <li><Link href="/influencers" className="hover:text-primary" data-testid="link-influencers-footer">Influencers</Link></li>
                <li><Link href="/podcasts" className="hover:text-primary" data-testid="link-podcasts-footer">Podcasts</Link></li>
                <li><Link href="/books" className="hover:text-primary" data-testid="link-books-footer">Books</Link></li>
                <li><Link href="/guides" className="hover:text-primary">Training Guides</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold mb-4">Top States</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/races/state/california" className="hover:text-primary">California Races</Link></li>
                <li><Link href="/races/state/texas" className="hover:text-primary">Texas Races</Link></li>
                <li><Link href="/races/state/florida" className="hover:text-primary">Florida Races</Link></li>
                <li><Link href="/races/state/new-york" className="hover:text-primary">New York Races</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold mb-4">Tools</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/tools/race-predictor" className="hover:text-primary flex items-center gap-1">Race Predictor <ArrowRight className="h-3 w-3" /></Link></li>
                <li><Link href="/tools/pace-calculator" className="hover:text-primary flex items-center gap-1">Pace Calculator <ArrowRight className="h-3 w-3" /></Link></li>
                <li><a href="https://aitracker.run" target="_blank" rel="noopener noreferrer" className="hover:text-primary flex items-center gap-1 text-primary/80">AITracker.run <ArrowRight className="h-3 w-3" /></a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>© 2025 running.services. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
