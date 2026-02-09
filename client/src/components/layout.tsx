import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronRight, ArrowRight, MapPin, Heart, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { SmartSearch } from "@/components/smart-search";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isLoading: authLoading, openLogin, logout } = useAuth();

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
            <SmartSearch className="hidden md:block" variant="desktop" />

            {/* User Auth Controls - Desktop */}
            <div className="hidden md:flex items-center">
              {!authLoading && !user && (
                <Button variant="ghost" size="sm" onClick={openLogin} className="cursor-pointer" data-testid="button-sign-in">
                  Sign in
                </Button>
              )}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium" data-testid="text-user-name">{user.name || "Runner"}</p>
                      <p className="text-xs text-muted-foreground" data-testid="text-user-email">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/favorites" className="flex items-center gap-2 cursor-pointer" data-testid="link-favorites">
                        <Heart className="h-4 w-4" /> My Favorites
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="flex items-center gap-2 cursor-pointer text-red-600" data-testid="button-logout">
                      <LogOut className="h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
                  <SmartSearch variant="mobile" className="mb-2" />
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
                  {user && (
                    <Link href="/favorites" className="text-lg font-medium py-2 border-b flex items-center gap-2" data-testid="link-favorites-mobile">
                      <Heart className="h-4 w-4" /> My Favorites
                    </Link>
                  )}
                  <div className="pt-4 border-t">
                    {!authLoading && !user && (
                      <Button onClick={openLogin} className="w-full" data-testid="button-sign-in-mobile">
                        Sign in
                      </Button>
                    )}
                    {user && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2" data-testid="text-user-email-mobile">{user.email}</p>
                        <Button variant="outline" onClick={logout} className="w-full" data-testid="button-logout-mobile">
                          Sign out
                        </Button>
                      </div>
                    )}
                  </div>
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
                <li><Link href="/collections" className="hover:text-primary">Collections</Link></li>
                <li><Link href="/races/usa" className="hover:text-primary">All 50 States</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold mb-4">Top States</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/state/california" className="hover:text-primary">California</Link></li>
                <li><Link href="/state/texas" className="hover:text-primary">Texas</Link></li>
                <li><Link href="/state/florida" className="hover:text-primary">Florida</Link></li>
                <li><Link href="/state/new-york" className="hover:text-primary">New York</Link></li>
                <li><Link href="/races/usa" className="hover:text-primary">All 50 States</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold mb-4">Tools</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/tools/race-predictor" className="hover:text-primary flex items-center gap-1">Race Predictor <ArrowRight className="h-3 w-3" /></Link></li>
                <li><Link href="/tools/pace-calculator" className="hover:text-primary flex items-center gap-1">Pace Calculator <ArrowRight className="h-3 w-3" /></Link></li>
                <li><a href="https://aitracker.run" target="_blank" rel="noopener noreferrer nofollow" className="hover:text-primary flex items-center gap-1 text-primary/80">AITracker.run <ArrowRight className="h-3 w-3" /></a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>© 2025 running.services. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/about" className="hover:text-foreground" data-testid="link-about-footer">About</Link>
              <Link href="/blog" className="hover:text-foreground" data-testid="link-blog-footer">Blog</Link>
              <Link href="/contact" className="hover:text-foreground" data-testid="link-contact-footer">Contact</Link>
              <Link href="/privacy" className="hover:text-foreground" data-testid="link-privacy-footer">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground" data-testid="link-terms-footer">Terms</Link>
              <a href="/sitemap.xml" className="hover:text-foreground">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
