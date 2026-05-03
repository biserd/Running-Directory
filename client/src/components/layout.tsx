import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Menu, ArrowRight, Heart, User, LogOut, ChevronDown, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { SmartSearch } from "@/components/smart-search";

const PRIMARY_NAV: { label: string; href: string; testId: string }[] = [
  { label: "Find races", href: "/races", testId: "link-races" },
  { label: "Map", href: "/map", testId: "link-map" },
  { label: "Turkey Trots", href: "/races?turkeyTrot=true", testId: "link-turkey-trots" },
  { label: "5K", href: "/races?distance=5K", testId: "link-distance-5k" },
  { label: "10K", href: "/races?distance=10K", testId: "link-distance-10k" },
  { label: "Half", href: "/races?distance=Half+Marathon", testId: "link-distance-half" },
  { label: "Marathon", href: "/races?distance=Marathon", testId: "link-distance-marathon" },
  { label: "Trail", href: "/races?surface=Trail", testId: "link-surface-trail" },
  { label: "For organizers", href: "/for-organizers", testId: "link-for-organizers" },
  { label: "Pricing", href: "/pricing", testId: "link-pricing" },
];

function isActive(location: string, href: string): boolean {
  const path = href.split("?")[0];
  if (path === "/races") return location === "/races" || location.startsWith("/races?");
  if (path === "/organizers") return location.startsWith("/organizers");
  if (path === "/for-organizers") return location === "/for-organizers" || location.startsWith("/organizers/dashboard");
  if (path === "/pricing") return location === "/pricing";
  return location === path;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isLoading: authLoading, openLogin, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="font-heading font-bold text-xl tracking-tighter flex items-center gap-1 flex-shrink-0" data-testid="link-home-brand">
            running<span className="text-primary">.services</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium">
            {PRIMARY_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-primary",
                  isActive(location, item.href) ? "text-primary" : "text-foreground/80"
                )}
                data-testid={item.testId}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Condensed nav for medium screens */}
          <nav className="hidden md:flex lg:hidden items-center gap-4 text-sm font-medium">
            <Link href="/races" className={cn("hover:text-primary", isActive(location, "/races") ? "text-primary" : "text-foreground/80")} data-testid="link-find-races-md">Find races</Link>
            <Link href="/map" className={cn("hover:text-primary", isActive(location, "/map") ? "text-primary" : "text-foreground/80")} data-testid="link-map-md">Map</Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary outline-none" data-testid="button-distances-menu">
                Distances <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link href="/races?distance=5K" data-testid="link-distance-5k-md">5K</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/races?distance=10K" data-testid="link-distance-10k-md">10K</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/races?distance=Half+Marathon" data-testid="link-distance-half-md">Half Marathon</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/races?distance=Marathon" data-testid="link-distance-marathon-md">Marathon</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/races?surface=Trail" data-testid="link-surface-trail-md">Trail races</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/races?turkeyTrot=true" data-testid="link-turkey-trots-md">Turkey Trots</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/for-organizers" className={cn("hover:text-primary", isActive(location, "/for-organizers") ? "text-primary" : "text-foreground/80")} data-testid="link-for-organizers-md">For organizers</Link>
            <Link href="/pricing" className={cn("hover:text-primary", isActive(location, "/pricing") ? "text-primary" : "text-foreground/80")} data-testid="link-pricing-md">Pricing</Link>
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
                        <Heart className="h-4 w-4" /> Saved races
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/alerts" className="flex items-center gap-2 cursor-pointer" data-testid="link-alerts">
                        <Bell className="h-4 w-4" /> Alerts & saved searches
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
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex flex-col gap-1 mt-8">
                  <SmartSearch variant="mobile" className="mb-4" />
                  {PRIMARY_NAV.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-base font-medium py-3 border-b"
                      data-testid={`${item.testId}-mobile`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  {user && (
                    <Link href="/favorites" className="text-base font-medium py-3 border-b flex items-center gap-2" data-testid="link-favorites-mobile">
                      <Heart className="h-4 w-4" /> Saved races
                    </Link>
                  )}
                  {user && (
                    <Link href="/alerts" className="text-base font-medium py-3 border-b flex items-center gap-2" data-testid="link-alerts-mobile">
                      <Bell className="h-4 w-4" /> Alerts & saved searches
                    </Link>
                  )}
                  <div className="pt-6 border-t mt-4">
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="font-heading font-bold text-lg tracking-tighter">
                running<span className="text-primary">.services</span>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">
                Find the right race, not just the next race. A decision engine for runners across the USA.
              </p>
            </div>
            <div>
              <h4 className="font-heading font-semibold mb-4">Find a race</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/races" className="hover:text-primary" data-testid="link-find-races-footer">Find races</Link></li>
                <li><Link href="/map" className="hover:text-primary" data-testid="link-map-footer">Race map</Link></li>
                <li><Link href="/races?turkeyTrot=true" className="hover:text-primary" data-testid="link-turkey-trots-footer">Turkey Trots</Link></li>
                <li><Link href="/races?distance=5K" className="hover:text-primary" data-testid="link-5k-footer">5Ks</Link></li>
                <li><Link href="/races?distance=10K" className="hover:text-primary" data-testid="link-10k-footer">10Ks</Link></li>
                <li><Link href="/races?distance=Half+Marathon" className="hover:text-primary" data-testid="link-half-footer">Half marathons</Link></li>
                <li><Link href="/races?distance=Marathon" className="hover:text-primary" data-testid="link-marathon-footer">Marathons</Link></li>
                <li><Link href="/races?surface=Trail" className="hover:text-primary" data-testid="link-trail-footer">Trail races</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold mb-4">For organizers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/organizers" className="hover:text-primary" data-testid="link-organizers-footer">Race organizers</Link></li>
                <li><Link href="/for-organizers" className="hover:text-primary" data-testid="link-claim-footer">Claim your race</Link></li>
                <li><Link href="/pricing" className="hover:text-primary" data-testid="link-pricing-footer">Pricing</Link></li>
                <li><Link href="/reports" className="hover:text-primary" data-testid="link-reports-footer">Market reports</Link></li>
                <li><Link href="/developers" className="hover:text-primary" data-testid="link-developers-footer">API & developers</Link></li>
                <li><Link href="/organizers/dashboard" className="hover:text-primary" data-testid="link-organizer-dashboard-footer">Organizer dashboard</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>© 2025 running.services. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/about" className="hover:text-foreground" data-testid="link-about-footer">About</Link>
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
