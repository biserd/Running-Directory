/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, MapPin } from "lucide-react";
import { apiGetRacePins, apiGetStates, type RacePin } from "@/lib/api";

const DISTANCE_OPTIONS = ["5K", "10K", "Half Marathon", "Marathon", "Ultra", "Trail"];

type DatePreset = "all" | "weekend" | "30d" | "90d" | "year";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Anytime" },
  { value: "weekend", label: "This weekend" },
  { value: "30d", label: "Next 30 days" },
  { value: "90d", label: "Next 90 days" },
  { value: "year", label: "Next 12 months" },
];

function dateRangeFor(preset: DatePreset): { from?: string; to?: string } {
  if (preset === "all") return {};
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (preset === "weekend") {
    // Friday → Sunday of the current week.
    const day = now.getDay(); // 0=Sun
    const friOffset = (5 - day + 7) % 7;
    const fri = new Date(now);
    fri.setDate(fri.getDate() + friOffset);
    const sun = new Date(fri);
    sun.setDate(sun.getDate() + 2);
    return { from: fri.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) };
  }
  const days = preset === "30d" ? 30 : preset === "90d" ? 90 : 365;
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  return { from: today, to: end.toISOString().slice(0, 10) };
}

function readUrlParam(name: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const v = new URL(window.location.href).searchParams.get(name);
  return v || undefined;
}

function writeUrlParams(params: Record<string, string | undefined>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  }
  window.history.replaceState({}, "", url.toString());
}

async function fetchPublicConfig(): Promise<{ googleMapsApiKey: string | null }> {
  const res = await fetch("/api/config/public");
  if (!res.ok) throw new Error("Failed to load public config");
  return res.json();
}

export default function MapPage() {
  const [stateFilter, setStateFilter] = useState<string | undefined>(readUrlParam("state"));
  const [distanceFilter, setDistanceFilter] = useState<string | undefined>(readUrlParam("distance"));
  const [datePreset, setDatePreset] = useState<DatePreset>(
    (readUrlParam("when") as DatePreset) || "all",
  );
  const [heatmap, setHeatmap] = useState<boolean>(readUrlParam("view") === "heatmap");

  useEffect(() => {
    writeUrlParams({
      state: stateFilter,
      distance: distanceFilter,
      when: datePreset === "all" ? undefined : datePreset,
      view: heatmap ? "heatmap" : undefined,
    });
  }, [stateFilter, distanceFilter, datePreset, heatmap]);

  const { data: states } = useQuery({
    queryKey: ["/api/states"],
    queryFn: () => apiGetStates(),
    staleTime: 1000 * 60 * 60,
  });

  // The map is "click to activate". We don't request the API key (and therefore
  // don't pay for a Google Maps Dynamic Map Load) until the user explicitly
  // asks to see the interactive map. This dramatically reduces billable map
  // loads from bots, link-preview crawlers, and accidental visits.
  const [mapActivated, setMapActivated] = useState(false);

  const { data: config } = useQuery({
    queryKey: ["/api/config/public"],
    queryFn: fetchPublicConfig,
    staleTime: 1000 * 60 * 60,
    enabled: mapActivated,
  });

  const { from, to } = dateRangeFor(datePreset);

  const { data: pinsResp, isLoading } = useQuery({
    queryKey: ["/api/races/map", { state: stateFilter, distance: distanceFilter, from, to }],
    queryFn: () => apiGetRacePins({ state: stateFilter, distance: distanceFilter, from, to, limit: 20000 }),
    staleTime: 1000 * 60 * 2,
  });

  const pins = pinsResp?.pins ?? [];

  return (
    <Layout>
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading font-extrabold text-3xl tracking-tight" data-testid="text-map-title">
              Race map
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Browse every race in the country, geographically. Click a pin for the race detail.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={stateFilter ?? "_all"} onValueChange={(v) => setStateFilter(v === "_all" ? undefined : v)}>
              <SelectTrigger className="w-[160px]" data-testid="select-state-filter">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All states</SelectItem>
                {states?.map((s) => (
                  <SelectItem key={s.abbreviation} value={s.abbreviation} data-testid={`option-state-${s.abbreviation}`}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={distanceFilter ?? "_all"} onValueChange={(v) => setDistanceFilter(v === "_all" ? undefined : v)}>
              <SelectTrigger className="w-[160px]" data-testid="select-distance-filter">
                <SelectValue placeholder="All distances" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All distances</SelectItem>
                {DISTANCE_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d} data-testid={`option-distance-${d}`}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger className="w-[160px]" data-testid="select-date-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value} data-testid={`option-when-${p.value}`}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={heatmap ? "default" : "outline"}
              size="sm"
              onClick={() => setHeatmap((v) => !v)}
              data-testid="button-toggle-heatmap"
            >
              {heatmap ? <Flame className="mr-1.5 h-4 w-4" /> : <MapPin className="mr-1.5 h-4 w-4" />}
              {heatmap ? "Heatmap" : "Pins"}
            </Button>
            <Badge variant="secondary" data-testid="badge-pin-count">
              {isLoading ? "Loading…" : `${pins.length.toLocaleString()} races`}
            </Badge>
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: "calc(100vh - 240px)", minHeight: "500px" }}>
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-background/60 flex items-center justify-center pointer-events-none">
            <Skeleton className="h-12 w-48" />
          </div>
        )}
        {!mapActivated ? (
          <div
            className="h-full flex items-center justify-center text-center px-6 bg-[radial-gradient(circle_at_30%_30%,hsl(var(--muted))_0%,hsl(var(--background))_60%)]"
            data-testid="map-placeholder"
          >
            <div className="max-w-md">
              <MapPin className="h-10 w-10 mx-auto text-primary mb-3" />
              <h2 className="font-heading font-bold text-2xl mb-2">
                {pins.length.toLocaleString()} races nationwide
              </h2>
              <p className="text-muted-foreground text-sm mb-5">
                The interactive map uses the Google Maps API. Click below to load it — your filter selections are already applied.
              </p>
              <Button
                type="button"
                size="lg"
                onClick={() => setMapActivated(true)}
                data-testid="button-activate-map"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Show interactive map
              </Button>
            </div>
          </div>
        ) : config?.googleMapsApiKey ? (
          <RaceMap apiKey={config.googleMapsApiKey} pins={pins} heatmap={heatmap} />
        ) : config && !config.googleMapsApiKey ? (
          <div className="h-full flex items-center justify-center text-center px-6" data-testid="map-no-key">
            <div>
              <h2 className="font-heading font-bold text-xl mb-2">Google Maps key not configured</h2>
              <p className="text-muted-foreground text-sm">
                Set the <code>GOOGLE_MAPS_API_KEY</code> secret to enable the map.
              </p>
            </div>
          </div>
        ) : (
          <Skeleton className="h-full w-full" />
        )}
      </div>
    </Layout>
  );
}

// Google Maps JS API + MarkerClusterer + HeatmapLayer. Loaded dynamically so SSR
// doesn't try to evaluate `window`-dependent code on the server.
type MapHandle = {
  map: google.maps.Map;
  clusterer: import("@googlemaps/markerclusterer").MarkerClusterer;
  infoWindow: google.maps.InfoWindow;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HeatmapLayer: any;
};

function RaceMap({ apiKey, pins, heatmap }: { apiKey: string; pins: RacePin[]; heatmap: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [handle, setHandle] = useState<MapHandle | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatmapLayerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      // Don't request the visualization library up front — it's only needed
      // when the user toggles heatmap mode. Loading it lazily keeps the
      // initial Maps payload smaller for the common pin-view case.
      const [{ setOptions, importLibrary }, { MarkerClusterer }] = await Promise.all([
        import("@googlemaps/js-api-loader"),
        import("@googlemaps/markerclusterer"),
      ]);
      setOptions({ key: apiKey, v: "weekly" });
      const { Map, InfoWindow } = await importLibrary("maps");
      await importLibrary("marker");
      if (cancelled || !containerRef.current) return;

      const map = new Map(containerRef.current, {
        center: { lat: 39.5, lng: -98.35 },
        zoom: 4,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: "greedy",
        clickableIcons: false,
      });
      const infoWindow = new InfoWindow();
      const clusterer = new MarkerClusterer({ map, markers: [] });

      setHandle({ map, clusterer, infoWindow, HeatmapLayer: null });

      cleanup = () => {
        clusterer.clearMarkers();
        infoWindow.close();
        if (heatmapLayerRef.current) heatmapLayerRef.current.setMap(null);
      };
    })().catch((err) => {
      console.error("[map] failed to load Google Maps:", err);
    });

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [apiKey]);

  // Re-render markers (or heatmap) when pins or mode change.
  useEffect(() => {
    if (!handle) return;
    const { map, clusterer, infoWindow } = handle;
    let cancelled = false;

    // Tear down whichever overlay was last rendered.
    clusterer.clearMarkers();
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setMap(null);
      heatmapLayerRef.current = null;
    }
    if (pins.length === 0) return;

    if (heatmap) {
      // Lazy-load the visualization library the first time heatmap is toggled.
      (async () => {
        let HeatmapLayer = handle.HeatmapLayer;
        if (!HeatmapLayer) {
          const { importLibrary } = await import("@googlemaps/js-api-loader");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const viz = (await importLibrary("visualization" as any)) as any;
          HeatmapLayer = viz.HeatmapLayer;
          setHandle((h) => (h ? { ...h, HeatmapLayer } : h));
        }
        if (cancelled) return;
        const data = pins.map((p) => new google.maps.LatLng(p.lat, p.lng));
        heatmapLayerRef.current = new HeatmapLayer({
          data,
          map,
          radius: 24,
          opacity: 0.7,
        });
      })().catch((err) => console.error("[map] heatmap load failed:", err));
      return () => {
        cancelled = true;
      };
    }

    const markers = pins.map((p) => {
      const marker = new google.maps.Marker({ position: { lat: p.lat, lng: p.lng } });
      const dateStr = (() => {
        try {
          return new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        } catch {
          return p.date;
        }
      })();
      const price = p.priceMin != null ? `$${p.priceMin}+` : "Price TBA";
      const html = `
        <div style="min-width:200px;font-family:Inter,sans-serif">
          <a href="/races/${p.slug}" data-testid="popup-link-${p.slug}" style="font-weight:600;color:hsl(217,91%,40%);text-decoration:none;font-size:14px">
            ${escapeHtml(p.name)}
          </a>
          <div style="font-size:12px;color:#666;margin-top:4px">
            ${escapeHtml(p.city)}, ${escapeHtml(p.state)} • ${escapeHtml(p.distance)}
          </div>
          <div style="font-size:12px;color:#666">${escapeHtml(dateStr)} • ${price}</div>
          <div style="font-size:11px;color:#888;margin-top:4px">Quality ${p.qualityScore}/100</div>
        </div>
      `;
      marker.addListener("click", () => {
        infoWindow.setContent(html);
        infoWindow.open({ map, anchor: marker });
      });
      return marker;
    });
    clusterer.addMarkers(markers);

    if (pins.length <= 500) {
      const bounds = new google.maps.LatLngBounds();
      pins.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, 60);
      const listener = google.maps.event.addListenerOnce(map, "bounds_changed", () => {
        if ((map.getZoom() ?? 0) > 10) map.setZoom(10);
      });
      return () => google.maps.event.removeListener(listener);
    }
  }, [handle, pins, heatmap]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} data-testid="map-container" />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
