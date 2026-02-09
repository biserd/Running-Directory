import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, MapPin, Route, Trophy, Building2, Users, Mic, BookOpen, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResults {
  races: { id: number; name: string; slug: string; city: string | null; state: string | null; distance: string | null; date: string | null }[];
  routes: { id: number; name: string; slug: string; city: string | null; state: string | null; distance: string | null; surface: string | null }[];
  states: { id: number; name: string; slug: string; abbreviation: string | null; raceCount: number }[];
  cities: { id: number; name: string; slug: string; stateSlug: string; stateName: string }[];
  influencers: { id: number; name: string; slug: string; platform: string | null; handle: string | null }[];
  podcasts: { id: number; name: string; slug: string; host: string | null }[];
  books: { id: number; title: string; slug: string; author: string | null }[];
}

interface SearchItem {
  type: string;
  label: string;
  sublabel: string;
  href: string;
  icon: React.ReactNode;
}

function flattenResults(results: SearchResults): SearchItem[] {
  const items: SearchItem[] = [];

  for (const s of results.states) {
    items.push({
      type: "States",
      label: s.name,
      sublabel: `${s.abbreviation} · ${s.raceCount} races`,
      href: `/state/${s.slug}`,
      icon: <MapPin className="h-4 w-4 text-blue-500" />,
    });
  }

  for (const c of results.cities) {
    items.push({
      type: "Cities",
      label: c.name,
      sublabel: c.stateName,
      href: `/state/${c.stateSlug}/city/${c.slug}`,
      icon: <Building2 className="h-4 w-4 text-violet-500" />,
    });
  }

  for (const r of results.races) {
    items.push({
      type: "Races",
      label: r.name,
      sublabel: [r.city, r.state, r.distance].filter(Boolean).join(" · "),
      href: `/races/${r.slug}`,
      icon: <Trophy className="h-4 w-4 text-amber-500" />,
    });
  }

  for (const r of results.routes) {
    items.push({
      type: "Routes",
      label: r.name,
      sublabel: [r.city, r.state, r.surface].filter(Boolean).join(" · "),
      href: `/routes/${r.slug}`,
      icon: <Route className="h-4 w-4 text-green-500" />,
    });
  }

  for (const i of results.influencers) {
    items.push({
      type: "Influencers",
      label: i.name,
      sublabel: [i.handle, i.platform].filter(Boolean).join(" · "),
      href: `/influencers/${i.slug}`,
      icon: <Users className="h-4 w-4 text-pink-500" />,
    });
  }

  for (const p of results.podcasts) {
    items.push({
      type: "Podcasts",
      label: p.name,
      sublabel: p.host ? `by ${p.host}` : "",
      href: `/podcasts/${p.slug}`,
      icon: <Mic className="h-4 w-4 text-orange-500" />,
    });
  }

  for (const b of results.books) {
    items.push({
      type: "Books",
      label: b.title,
      sublabel: b.author ? `by ${b.author}` : "",
      href: `/books/${b.slug}`,
      icon: <BookOpen className="h-4 w-4 text-teal-500" />,
    });
  }

  return items;
}

function groupByType(items: SearchItem[]): Record<string, SearchItem[]> {
  const groups: Record<string, SearchItem[]> = {};
  for (const item of items) {
    if (!groups[item.type]) groups[item.type] = [];
    groups[item.type].push(item);
  }
  return groups;
}

export function SmartSearch({ className, variant = "desktop" }: { className?: string; variant?: "desktop" | "mobile" }) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flatItems = results ? flattenResults(results) : [];
  const grouped = groupByType(flatItems);
  const hasResults = flatItems.length > 0;

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setIsOpen(true);
        setSelectedIndex(-1);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(item: SearchItem) {
    setIsOpen(false);
    setQuery("");
    setResults(null);
    navigate(item.href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || !hasResults) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev <= 0 ? flatItems.length - 1 : prev - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(flatItems[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)} data-testid="smart-search">
      <div className="relative">
        <Search className={cn(
          "absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          variant === "mobile" ? "left-3 h-5 w-5" : "left-2.5 h-4 w-4"
        )} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (query.length >= 2 && results) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Search races, routes, states..."
          className={cn(
            "rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary",
            variant === "mobile"
              ? "h-11 w-full pl-10 pr-10"
              : "h-9 w-64 pl-9 pr-8"
          )}
          data-testid="input-search"
        />
        {query && !isLoading && (
          <button
            onClick={() => { setQuery(""); setResults(null); setIsOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-clear-search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className={cn(
          "absolute z-[100] mt-1 rounded-lg border shadow-lg overflow-hidden",
          variant === "mobile" ? "left-0 right-0" : "right-0 w-96"
        )} data-testid="search-results-dropdown" style={{ backgroundColor: 'white' }}>
          {!hasResults && !isLoading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground" data-testid="search-no-results">
              No results found for "{query}"
            </div>
          )}

          {hasResults && (
            <div className="max-h-[400px] overflow-y-auto py-1">
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                    {type}
                  </div>
                  {items.map((item) => {
                    const globalIdx = flatItems.indexOf(item);
                    return (
                      <button
                        key={`${item.type}-${item.href}`}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors",
                          globalIdx === selectedIndex && "bg-accent"
                        )}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        data-testid={`search-result-${item.type.toLowerCase()}-${globalIdx}`}
                      >
                        <span className="flex-shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.label}</div>
                          {item.sublabel && (
                            <div className="text-xs text-muted-foreground truncate">{item.sublabel}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
