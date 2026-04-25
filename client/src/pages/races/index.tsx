import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { RaceCard } from "@/components/race-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { apiGetState } from "@/lib/api";
import { Search, SlidersHorizontal, X, MapPin, List, Map as MapIcon, Crosshair, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Race } from "@shared/schema";
import { CompareBar } from "@/components/compare-bar";

const DISTANCES = ["5K", "10K", "Half Marathon", "Marathon", "Ultra"];
const SURFACES = ["Road", "Trail", "Track"];
const TERRAINS = ["Flat", "Rolling", "Hilly", "Mountainous"];
const RACE_SIZE_BUCKETS: { label: string; min?: number; max?: number }[] = [
  { label: "Small (<500)", max: 499 },
  { label: "Mid (500–2,500)", min: 500, max: 2500 },
  { label: "Large (2,500–10K)", min: 2500, max: 10000 },
  { label: "Mega (10K+)", min: 10000 },
];
const ELEVATION_BUCKETS: { label: string; max?: number; min?: number }[] = [
  { label: "Flat (<50m)", max: 50 },
  { label: "Rolling (50–200m)", min: 50, max: 200 },
  { label: "Hilly (200–500m)", min: 200, max: 500 },
  { label: "Mountainous (500m+)", min: 500 },
];
const DIFFICULTY_BUCKETS: { label: string; value: string; minBeginnerScore: number }[] = [
  { label: "Easy (great for first timers)", value: "easy", minBeginnerScore: 80 },
  { label: "Moderate", value: "moderate", minBeginnerScore: 60 },
  { label: "Hard", value: "hard", minBeginnerScore: 40 },
  { label: "Very hard", value: "very-hard", minBeginnerScore: 0 },
];
const VIBE_TAGS: { value: string; label: string }[] = [
  { value: "festive", label: "Festive / Party" },
  { value: "beer", label: "Beer garden" },
  { value: "music", label: "Live music" },
  { value: "costume", label: "Costumed / Themed" },
  { value: "scenic", label: "Scenic / Destination" },
  { value: "fast", label: "Fast course" },
  { value: "charity", label: "Charity vibe" },
  { value: "trail", label: "Trail / Off-road" },
];
const RADIUS_OPTIONS = [10, 25, 50, 100, 250];
const SORTS: { value: string; label: string }[] = [
  { value: "date", label: "Sooner first" },
  { value: "price", label: "Cheapest" },
  { value: "beginner", label: "Beginner-friendly" },
  { value: "pr", label: "Best for PR" },
  { value: "value", label: "Best value" },
  { value: "vibe", label: "Best vibe" },
  { value: "family", label: "Family-friendly" },
  { value: "urgency", label: "Sign up soon" },
  { value: "quality", label: "Top quality" },
];
const MONTH_LABELS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type FilterState = {
  q: string;
  distance: string;
  surface: string;
  terrain: string;
  state: string;
  city: string;
  month: string;
  priceMax: string;
  elevationBucket: string;
  sizeBucket: string;
  walkerFriendly: boolean;
  strollerFriendly: boolean;
  dogFriendly: boolean;
  kidsRace: boolean;
  charity: boolean;
  bostonQualifier: boolean;
  turkeyTrot: boolean;
  registrationOpen: boolean;
  priceIncreaseSoon: boolean;
  transitFriendly: boolean;
  difficulty: string;
  vibeTag: string;
  radiusMiles: number;
  lat: number | null;
  lng: number | null;
  sort: string;
  near: boolean;
  page: number;
};

const PAGE_SIZE = 24;

const EMPTY_FILTERS: FilterState = {
  q: "",
  distance: "",
  surface: "",
  terrain: "",
  state: "",
  city: "",
  month: "",
  priceMax: "",
  elevationBucket: "",
  sizeBucket: "",
  walkerFriendly: false,
  strollerFriendly: false,
  dogFriendly: false,
  kidsRace: false,
  charity: false,
  bostonQualifier: false,
  turkeyTrot: false,
  registrationOpen: false,
  priceIncreaseSoon: false,
  transitFriendly: false,
  difficulty: "",
  vibeTag: "",
  radiusMiles: 50,
  lat: null,
  lng: null,
  sort: "date",
  near: false,
  page: 1,
};

function parseFiltersFromUrl(search: string, stateAbbr?: string): FilterState {
  const params = new URLSearchParams(search.replace(/^\?/, ""));
  const lat = params.get("lat");
  const lng = params.get("lng");
  const radius = params.get("radiusMiles");
  return {
    q: params.get("q") || "",
    distance: params.get("distance") || "",
    surface: params.get("surface") || "",
    terrain: params.get("terrain") || "",
    state: stateAbbr || params.get("state") || "",
    city: params.get("city") || "",
    month: params.get("month") || "",
    priceMax: params.get("priceMax") || "",
    elevationBucket: params.get("elevation") || "",
    sizeBucket: params.get("size") || "",
    walkerFriendly: params.get("walkerFriendly") === "true",
    strollerFriendly: params.get("strollerFriendly") === "true",
    dogFriendly: params.get("dogFriendly") === "true",
    kidsRace: params.get("kidsRace") === "true",
    charity: params.get("charity") === "true",
    bostonQualifier: params.get("bostonQualifier") === "true",
    turkeyTrot: params.get("turkeyTrot") === "true",
    registrationOpen: params.get("registrationOpen") === "true",
    priceIncreaseSoon: params.get("priceIncreaseSoon") === "true",
    transitFriendly: params.get("transitFriendly") === "true",
    difficulty: params.get("difficulty") || "",
    vibeTag: params.get("vibeTag") || "",
    radiusMiles: radius ? Number(radius) : 50,
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null,
    sort: params.get("sort") || "date",
    near: params.get("near") === "1",
    page: Math.max(1, Number(params.get("page")) || 1),
  };
}

function filtersToApiQs(f: FilterState): string {
  const qs = new URLSearchParams();
  if (f.distance) qs.set("distance", f.distance);
  if (f.surface) qs.set("surface", f.surface);
  if (f.terrain) qs.set("terrain", f.terrain);
  if (f.state) qs.set("state", f.state);
  if (f.month) qs.set("month", f.month);
  if (f.priceMax) qs.set("priceMax", f.priceMax);
  if (f.walkerFriendly) qs.set("walkerFriendly", "true");
  if (f.strollerFriendly) qs.set("strollerFriendly", "true");
  if (f.dogFriendly) qs.set("dogFriendly", "true");
  if (f.kidsRace) qs.set("kidsRace", "true");
  if (f.charity) qs.set("charity", "true");
  if (f.bostonQualifier) qs.set("bostonQualifier", "true");
  if (f.turkeyTrot) qs.set("isTurkeyTrot", "true");
  if (f.registrationOpen) qs.set("registrationOpen", "true");
  if (f.priceIncreaseSoon) qs.set("priceIncreaseSoon", "true");
  if (f.transitFriendly) qs.set("transitFriendly", "true");
  if (f.vibeTag) qs.set("vibeTag", f.vibeTag);
  if (f.difficulty) {
    const bucket = DIFFICULTY_BUCKETS.find(b => b.value === f.difficulty);
    if (bucket && bucket.minBeginnerScore > 0) qs.set("minBeginnerScore", String(bucket.minBeginnerScore));
  }
  if (f.near && f.lat != null && f.lng != null) {
    qs.set("lat", String(f.lat));
    qs.set("lng", String(f.lng));
    qs.set("radiusMiles", String(f.radiusMiles));
  }
  if (f.sort) qs.set("sort", f.sort);
  // Request PAGE_SIZE+1 so we can detect a "next page" without a separate count query.
  qs.set("limit", String(PAGE_SIZE + 1));
  qs.set("offset", String((f.page - 1) * PAGE_SIZE));
  return qs.toString();
}

function filtersToUrlQs(f: FilterState): string {
  const qs = new URLSearchParams();
  if (f.q) qs.set("q", f.q);
  if (f.distance) qs.set("distance", f.distance);
  if (f.surface) qs.set("surface", f.surface);
  if (f.terrain) qs.set("terrain", f.terrain);
  if (f.month) qs.set("month", f.month);
  if (f.priceMax) qs.set("priceMax", f.priceMax);
  if (f.elevationBucket) qs.set("elevation", f.elevationBucket);
  if (f.sizeBucket) qs.set("size", f.sizeBucket);
  if (f.walkerFriendly) qs.set("walkerFriendly", "true");
  if (f.strollerFriendly) qs.set("strollerFriendly", "true");
  if (f.dogFriendly) qs.set("dogFriendly", "true");
  if (f.kidsRace) qs.set("kidsRace", "true");
  if (f.charity) qs.set("charity", "true");
  if (f.bostonQualifier) qs.set("bostonQualifier", "true");
  if (f.turkeyTrot) qs.set("turkeyTrot", "true");
  if (f.registrationOpen) qs.set("registrationOpen", "true");
  if (f.priceIncreaseSoon) qs.set("priceIncreaseSoon", "true");
  if (f.transitFriendly) qs.set("transitFriendly", "true");
  if (f.difficulty) qs.set("difficulty", f.difficulty);
  if (f.vibeTag) qs.set("vibeTag", f.vibeTag);
  if (f.near) {
    qs.set("near", "1");
    if (f.lat != null) qs.set("lat", String(f.lat));
    if (f.lng != null) qs.set("lng", String(f.lng));
    if (f.radiusMiles && f.radiusMiles !== 50) qs.set("radiusMiles", String(f.radiusMiles));
  }
  if (f.sort && f.sort !== "date") qs.set("sort", f.sort);
  if (f.page && f.page > 1) qs.set("page", String(f.page));
  return qs.toString();
}

function activeChipCount(f: FilterState, ignoreSort = true): number {
  let n = 0;
  for (const [k, v] of Object.entries(f)) {
    if (ignoreSort && k === "sort") continue;
    if (k === "state" || k === "lat" || k === "lng" || k === "radiusMiles") continue;
    if (typeof v === "boolean" && v) n += 1;
    if (typeof v === "string" && v) n += 1;
  }
  if (f.near) n += 1;
  return n;
}

function clientSideFilter(races: Race[], f: FilterState): Race[] {
  let out = races;
  if (f.q) {
    const needle = f.q.toLowerCase();
    out = out.filter(r =>
      r.name.toLowerCase().includes(needle) ||
      r.city.toLowerCase().includes(needle) ||
      r.state.toLowerCase().includes(needle)
    );
  }
  if (f.elevationBucket) {
    const bucket = ELEVATION_BUCKETS.find(b => b.label === f.elevationBucket);
    if (bucket) {
      out = out.filter(r => {
        const e = r.elevationGainM;
        if (e == null) return false;
        if (bucket.min != null && e < bucket.min) return false;
        if (bucket.max != null && e > bucket.max) return false;
        return true;
      });
    }
  }
  if (f.sizeBucket) {
    const bucket = RACE_SIZE_BUCKETS.find(b => b.label === f.sizeBucket);
    if (bucket) {
      out = out.filter(r => {
        const s = r.fieldSize;
        if (s == null) return false;
        if (bucket.min != null && s < bucket.min) return false;
        if (bucket.max != null && s > bucket.max) return false;
        return true;
      });
    }
  }
  if (f.transitFriendly) out = out.filter(r => r.transitFriendly === true);
  return out;
}

function FilterRail({
  filters,
  setFilter,
  updateFilters,
  reset,
  showHeader = true,
}: {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  updateFilters: (updater: (prev: FilterState) => FilterState) => void;
  reset: () => void;
  showHeader?: boolean;
}) {
  const [geoLoading, setGeoLoading] = useState(false);
  const { toast } = useToast();

  const handleUseLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast({ title: "Location not available", description: "Your browser doesn't support geolocation.", variant: "destructive" });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateFilters(prev => ({
          ...prev,
          near: true,
          lat: Number(pos.coords.latitude.toFixed(4)),
          lng: Number(pos.coords.longitude.toFixed(4)),
        }));
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        toast({ title: "Couldn't get your location", description: err.message || "Permission denied or unavailable.", variant: "destructive" });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  };

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold">Filters</h3>
          {activeChipCount(filters) > 0 && (
            <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs" data-testid="button-reset-filters">
              Reset
            </Button>
          )}
        </div>
      )}

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Near me</div>
        {filters.near && filters.lat != null && filters.lng != null ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Within</span>
              <button
                type="button"
                onClick={() => updateFilters(prev => ({ ...prev, near: false, lat: null, lng: null }))}
                className="text-primary hover:underline"
                data-testid="button-clear-location"
              >
                Clear location
              </button>
            </div>
            <select
              value={String(filters.radiusMiles)}
              onChange={e => setFilter("radiusMiles", Number(e.target.value))}
              className="w-full text-sm border rounded px-2 py-2 bg-background"
              data-testid="filter-radius"
            >
              {RADIUS_OPTIONS.map(r => <option key={r} value={r}>{r} miles</option>)}
            </select>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start h-9 text-sm"
            onClick={handleUseLocation}
            disabled={geoLoading}
            data-testid="button-use-location"
          >
            {geoLoading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Crosshair className="h-3.5 w-3.5 mr-2" />}
            Use my location
          </Button>
        )}
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Distance</div>
        <div className="grid grid-cols-2 gap-1.5">
          {DISTANCES.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setFilter("distance", filters.distance === d ? "" : d)}
              className={`text-xs px-2 py-1.5 rounded border text-left ${filters.distance === d ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary/50"}`}
              data-testid={`filter-distance-${d.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">When</div>
        <select
          value={filters.month}
          onChange={e => setFilter("month", e.target.value)}
          className="w-full text-sm border rounded px-2 py-2 bg-background"
          data-testid="filter-month"
        >
          <option value="">Any month</option>
          {MONTH_LABELS.slice(1).map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
        </select>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Difficulty</div>
        <select
          value={filters.difficulty}
          onChange={e => setFilter("difficulty", e.target.value)}
          className="w-full text-sm border rounded px-2 py-2 bg-background"
          data-testid="filter-difficulty"
        >
          <option value="">Any difficulty</option>
          {DIFFICULTY_BUCKETS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Vibe</div>
        <select
          value={filters.vibeTag}
          onChange={e => setFilter("vibeTag", e.target.value)}
          className="w-full text-sm border rounded px-2 py-2 bg-background"
          data-testid="filter-vibe"
        >
          <option value="">Any vibe</option>
          {VIBE_TAGS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Surface & terrain</div>
        <div className="space-y-2">
          <select value={filters.surface} onChange={e => setFilter("surface", e.target.value)} className="w-full text-sm border rounded px-2 py-2 bg-background" data-testid="filter-surface">
            <option value="">Any surface</option>
            {SURFACES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.terrain} onChange={e => setFilter("terrain", e.target.value)} className="w-full text-sm border rounded px-2 py-2 bg-background" data-testid="filter-terrain">
            <option value="">Any terrain</option>
            {TERRAINS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Elevation gain</div>
        <select value={filters.elevationBucket} onChange={e => setFilter("elevationBucket", e.target.value)} className="w-full text-sm border rounded px-2 py-2 bg-background" data-testid="filter-elevation">
          <option value="">Any elevation</option>
          {ELEVATION_BUCKETS.map(b => <option key={b.label} value={b.label}>{b.label}</option>)}
        </select>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Race size</div>
        <select value={filters.sizeBucket} onChange={e => setFilter("sizeBucket", e.target.value)} className="w-full text-sm border rounded px-2 py-2 bg-background" data-testid="filter-size">
          <option value="">Any size</option>
          {RACE_SIZE_BUCKETS.map(b => <option key={b.label} value={b.label}>{b.label}</option>)}
        </select>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Max price ($)</div>
        <input
          type="number"
          value={filters.priceMax}
          onChange={e => setFilter("priceMax", e.target.value)}
          placeholder="Any price"
          min={0}
          className="w-full text-sm border rounded px-2 py-2 bg-background"
          data-testid="filter-price-max"
        />
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Beginner & accessibility</div>
        <div className="space-y-1.5 text-sm">
          <CheckboxRow checked={filters.walkerFriendly} onChange={v => setFilter("walkerFriendly", v)} label="Walker friendly" testId="filter-walker" />
          <CheckboxRow checked={filters.strollerFriendly} onChange={v => setFilter("strollerFriendly", v)} label="Stroller friendly" testId="filter-stroller" />
          <CheckboxRow checked={filters.dogFriendly} onChange={v => setFilter("dogFriendly", v)} label="Dog friendly" testId="filter-dog" />
          <CheckboxRow checked={filters.kidsRace} onChange={v => setFilter("kidsRace", v)} label="Kids race included" testId="filter-kids" />
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Vibe & cause</div>
        <div className="space-y-1.5 text-sm">
          <CheckboxRow checked={filters.charity} onChange={v => setFilter("charity", v)} label="Charity / fundraiser" testId="filter-charity" />
          <CheckboxRow checked={filters.bostonQualifier} onChange={v => setFilter("bostonQualifier", v)} label="Boston Qualifier" testId="filter-bq" />
          <CheckboxRow checked={filters.turkeyTrot} onChange={v => setFilter("turkeyTrot", v)} label="Turkey Trot" testId="filter-turkey" />
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Logistics</div>
        <div className="space-y-1.5 text-sm">
          <CheckboxRow checked={filters.registrationOpen} onChange={v => setFilter("registrationOpen", v)} label="Registration open" testId="filter-reg-open" />
          <CheckboxRow checked={filters.priceIncreaseSoon} onChange={v => setFilter("priceIncreaseSoon", v)} label="Price goes up soon" testId="filter-price-up" />
          <CheckboxRow checked={filters.transitFriendly} onChange={v => setFilter("transitFriendly", v)} label="Public transit friendly" testId="filter-transit" />
        </div>
      </div>
    </div>
  );
}

function CheckboxRow({ checked, onChange, label, testId }: { checked: boolean; onChange: (v: boolean) => void; label: string; testId: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="rounded border-gray-300 text-primary focus:ring-primary"
        data-testid={testId}
      />
      <span className="text-muted-foreground">{label}</span>
    </label>
  );
}

export default function RacesSearchPage() {
  const params = useParams();
  const stateSlug = params.state;
  const [location, navigate] = useLocation();

  const { data: stateData } = useQuery({
    queryKey: ["/api/states", stateSlug],
    queryFn: () => apiGetState(stateSlug!),
    enabled: !!stateSlug,
  });

  // Initialize empty so SSR and first client render match. Parse URL in effect after hydration.
  const [filters, setFilters] = useState<FilterState>(() => ({ ...EMPTY_FILTERS, state: stateData?.abbreviation || "" }));
  const [view, setView] = useState<"list" | "map">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Re-sync from URL on navigation (and after hydration)
  useEffect(() => {
    setFilters(parseFiltersFromUrl(window.location.search, stateData?.abbreviation));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, stateData?.abbreviation]);

  const updateFilters = (updater: (prev: FilterState) => FilterState) => {
    setFilters(prev => {
      const next = updater(prev);
      const qs = filtersToUrlQs(next);
      const target = stateSlug ? `/races/state/${stateSlug}` : "/races";
      navigate(qs ? `${target}?${qs}` : target, { replace: true });
      return next;
    });
  };

  const setFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    // Reset back to page 1 whenever any non-pagination filter changes so users don't
    // end up stranded on a deep page that no longer has results.
    updateFilters(prev => ({ ...prev, [key]: value, page: key === "page" ? (value as number) : 1 }));
  };

  const reset = () => {
    setFilters({ ...EMPTY_FILTERS, state: stateData?.abbreviation || "" });
    navigate(stateSlug ? `/races/state/${stateSlug}` : "/races", { replace: true });
  };

  const apiQs = filtersToApiQs(filters);
  const { data: races, isLoading } = useQuery<Race[]>({
    queryKey: ["/api/races/search", apiQs],
    queryFn: async () => {
      const r = await fetch(`/api/races/search?${apiQs}`);
      if (!r.ok) throw new Error("Search failed");
      return r.json() as Promise<Race[]>;
    },
  });

  // Server returns up to PAGE_SIZE+1 rows so we can detect if there's a next page
  // without a separate count query. The +1 sentinel never renders.
  const pageRaces = useMemo(() => (races ?? []).slice(0, PAGE_SIZE), [races]);
  const hasNextPage = (races?.length ?? 0) > PAGE_SIZE;
  const hasPrevPage = filters.page > 1;
  const filtered = useMemo(() => clientSideFilter(pageRaces, filters), [pageRaces, filters]);

  const goToPage = (nextPage: number) => {
    if (nextPage < 1) return;
    updateFilters(prev => ({ ...prev, page: nextPage }));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const activeCount = activeChipCount(filters);

  const heading = stateData ? `${stateData.name} race calendar` : "All USA races";
  const breadcrumbs: { label: string; href?: string }[] = [{ label: "Races", href: "/races" }];
  if (stateData) breadcrumbs.push({ label: stateData.name });

  return (
    <Layout>
      {/* Mobile sticky search/sort/filter bar */}
      <div className="md:hidden sticky top-16 z-40 bg-background border-b">
        <div className="px-4 py-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={filters.q}
              onChange={e => setFilter("q", e.target.value)}
              placeholder="Search races…"
              className="w-full h-9 pl-8 pr-3 text-sm border rounded bg-background"
              data-testid="input-mobile-search"
            />
          </div>
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 relative" data-testid="button-mobile-filters">
                <SlidersHorizontal className="h-4 w-4" />
                {activeCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">{activeCount}</span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription className="sr-only">Filter the race results</SheetDescription>
              <div className="mt-4">
                <FilterRail filters={filters} setFilter={setFilter} updateFilters={updateFilters} reset={reset} showHeader={false} />
              </div>
              <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-background border-t mt-6 flex gap-2">
                <Button variant="outline" onClick={reset} className="flex-1" data-testid="button-mobile-reset">Reset</Button>
                <Button onClick={() => setFilterSheetOpen(false)} className="flex-1" data-testid="button-mobile-apply">Show {filtered.length} races</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {/* Quick chip filters on mobile */}
        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
          {DISTANCES.slice(0, 4).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setFilter("distance", filters.distance === d ? "" : d)}
              className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${filters.distance === d ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
              data-testid={`chip-mobile-distance-${d.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilter("turkeyTrot", !filters.turkeyTrot)}
            className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${filters.turkeyTrot ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
            data-testid="chip-mobile-turkey"
          >
            Turkey Trot
          </button>
          <button
            type="button"
            onClick={() => setFilter("registrationOpen", !filters.registrationOpen)}
            className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${filters.registrationOpen ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
            data-testid="chip-mobile-reg-open"
          >
            Reg open
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-4 mb-6">
          <h1 className="font-heading font-bold text-2xl md:text-3xl mb-1" data-testid="text-search-heading">{heading}</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-search-result-count">
            {isLoading ? "Loading races…" : `${filtered.length} ${filtered.length === 1 ? "race" : "races"} match`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Desktop filter rail */}
          <aside className="hidden lg:block lg:col-span-3" data-testid="filter-rail">
            <div className="sticky top-20">
              <FilterRail filters={filters} setFilter={setFilter} updateFilters={updateFilters} reset={reset} />
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-4">
            {/* Desktop search + sort + view toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px] hidden md:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={filters.q}
                  onChange={e => setFilter("q", e.target.value)}
                  placeholder="Search by name, city, or state"
                  className="w-full h-9 pl-8 pr-3 text-sm border rounded bg-background"
                  data-testid="input-desktop-search"
                />
              </div>
              <select
                value={filters.sort}
                onChange={e => setFilter("sort", e.target.value)}
                className="h-9 text-sm border rounded px-2 bg-background"
                data-testid="select-sort"
              >
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <div className="flex border rounded overflow-hidden ml-auto" role="tablist">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={`h-9 px-3 text-sm flex items-center gap-1 ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  data-testid="button-view-list"
                >
                  <List className="h-3.5 w-3.5" /> List
                </button>
                <button
                  type="button"
                  onClick={() => setView("map")}
                  className={`h-9 px-3 text-sm flex items-center gap-1 ${view === "map" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  data-testid="button-view-map"
                >
                  <MapIcon className="h-3.5 w-3.5" /> Map
                </button>
              </div>
            </div>

            {/* Active filter chips */}
            {activeCount > 0 && (
              <div className="flex flex-wrap gap-1.5" data-testid="active-filter-chips">
                {activeFilterChips(filters, setFilter).map(chip => (
                  <Badge key={chip.key} variant="secondary" className="gap-1">
                    {chip.label}
                    <button onClick={chip.clear} className="ml-1 hover:text-foreground" data-testid={`chip-clear-${chip.key}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" onClick={reset} className="h-6 text-xs" data-testid="button-reset-chips">Clear all</Button>
              </div>
            )}

            {view === "map" ? (
              <Card data-testid="placeholder-map">
                <CardContent className="p-12 text-center text-muted-foreground">
                  <MapIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-1">Map view is on the way</p>
                  <p className="text-sm">We're plotting every race with coordinates on an interactive map. For now, results show as a list.</p>
                  <Button variant="link" onClick={() => setView("list")} className="mt-2" data-testid="button-back-to-list">Back to list</Button>
                </CardContent>
              </Card>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-80 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center" data-testid="text-no-results">
                  <p className="text-muted-foreground mb-3">No races match these filters yet.</p>
                  <Button variant="outline" onClick={reset} data-testid="button-clear-no-results">Clear filters</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map(race => <RaceCard key={race.id} race={race} />)}
                </div>

                {(hasPrevPage || hasNextPage) && (
                  <nav
                    className="mt-8 flex items-center justify-between gap-4"
                    aria-label="Race results pagination"
                    data-testid="pagination-controls"
                  >
                    <Button
                      variant="outline"
                      onClick={() => goToPage(filters.page - 1)}
                      disabled={!hasPrevPage}
                      data-testid="button-pagination-prev"
                    >
                      ← Previous
                    </Button>
                    <span
                      className="text-sm text-muted-foreground"
                      data-testid="text-pagination-page"
                    >
                      Page {filters.page}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => goToPage(filters.page + 1)}
                      disabled={!hasNextPage}
                      data-testid="button-pagination-next"
                    >
                      Next →
                    </Button>
                  </nav>
                )}
              </>
            )}

            <div className="mt-8 p-6 border rounded-lg bg-muted/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Want races within 30 miles of you?</span>
              </div>
              <Button asChild variant="outline" data-testid="link-near-me-cta">
                <Link href="/races/nearby">Use my location <MapPin className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CompareBar />
    </Layout>
  );
}

function activeFilterChips(
  f: FilterState,
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void,
): { key: string; label: string; clear: () => void }[] {
  const chips: { key: string; label: string; clear: () => void }[] = [];
  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => () => setFilter(key, value);
  if (f.distance) chips.push({ key: "distance", label: f.distance, clear: update("distance", "") });
  if (f.surface) chips.push({ key: "surface", label: f.surface, clear: update("surface", "") });
  if (f.terrain) chips.push({ key: "terrain", label: f.terrain, clear: update("terrain", "") });
  if (f.month) chips.push({ key: "month", label: MONTH_LABELS[Number(f.month)] || f.month, clear: update("month", "") });
  if (f.priceMax) chips.push({ key: "priceMax", label: `≤ $${f.priceMax}`, clear: update("priceMax", "") });
  if (f.elevationBucket) chips.push({ key: "elevation", label: f.elevationBucket, clear: update("elevationBucket", "") });
  if (f.sizeBucket) chips.push({ key: "size", label: f.sizeBucket, clear: update("sizeBucket", "") });
  if (f.walkerFriendly) chips.push({ key: "walker", label: "Walker", clear: update("walkerFriendly", false) });
  if (f.strollerFriendly) chips.push({ key: "stroller", label: "Stroller", clear: update("strollerFriendly", false) });
  if (f.dogFriendly) chips.push({ key: "dog", label: "Dog", clear: update("dogFriendly", false) });
  if (f.kidsRace) chips.push({ key: "kids", label: "Kids race", clear: update("kidsRace", false) });
  if (f.charity) chips.push({ key: "charity", label: "Charity", clear: update("charity", false) });
  if (f.bostonQualifier) chips.push({ key: "bq", label: "BQ", clear: update("bostonQualifier", false) });
  if (f.turkeyTrot) chips.push({ key: "turkey", label: "Turkey Trot", clear: update("turkeyTrot", false) });
  if (f.registrationOpen) chips.push({ key: "regopen", label: "Reg open", clear: update("registrationOpen", false) });
  if (f.priceIncreaseSoon) chips.push({ key: "priceup", label: "Price up soon", clear: update("priceIncreaseSoon", false) });
  if (f.transitFriendly) chips.push({ key: "transit", label: "Transit friendly", clear: update("transitFriendly", false) });
  if (f.q) chips.push({ key: "q", label: `"${f.q}"`, clear: update("q", "") });
  return chips;
}
