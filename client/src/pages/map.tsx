import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiGetRacePins, apiGetStates, type RacePin } from "@/lib/api";

const DISTANCE_OPTIONS = ["5K", "10K", "Half Marathon", "Marathon", "Ultra", "Trail"];

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

export default function MapPage() {
  const [stateFilter, setStateFilter] = useState<string | undefined>(readUrlParam("state"));
  const [distanceFilter, setDistanceFilter] = useState<string | undefined>(readUrlParam("distance"));

  useEffect(() => {
    writeUrlParams({ state: stateFilter, distance: distanceFilter });
  }, [stateFilter, distanceFilter]);

  const { data: states } = useQuery({
    queryKey: ["/api/states"],
    queryFn: () => apiGetStates(),
    staleTime: 1000 * 60 * 60,
  });

  const { data: pinsResp, isLoading } = useQuery({
    queryKey: ["/api/races/map", { state: stateFilter, distance: distanceFilter }],
    queryFn: () => apiGetRacePins({ state: stateFilter, distance: distanceFilter, limit: 5000 }),
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
              <SelectTrigger className="w-[180px]" data-testid="select-state-filter">
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
              <SelectTrigger className="w-[180px]" data-testid="select-distance-filter">
                <SelectValue placeholder="All distances" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All distances</SelectItem>
                {DISTANCE_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d} data-testid={`option-distance-${d}`}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <RaceMap pins={pins} />
      </div>
    </Layout>
  );
}

// Leaflet references `window` at module-eval time, so we dynamically import it
// (and the markercluster plugin + their CSS) inside useEffect. This keeps the
// page SSR-safe — the server renders the chrome and the map mounts client-side.
type LeafletNS = typeof import("leaflet");
type MapHandle = {
  L: LeafletNS;
  map: import("leaflet").Map;
  cluster: import("leaflet").MarkerClusterGroup;
  defaultIcon: import("leaflet").Icon;
};

function RaceMap({ pins }: { pins: RacePin[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [handle, setHandle] = useState<MapHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    (async () => {
      const Lmod = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      await import("leaflet.markercluster");
      await import("leaflet.markercluster/dist/MarkerCluster.css");
      await import("leaflet.markercluster/dist/MarkerCluster.Default.css");
      if (cancelled || !containerRef.current) return;
      const L = Lmod.default ?? (Lmod as unknown as LeafletNS);
      const defaultIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      const map = L.map(containerRef.current, { center: [39.5, -98.35], zoom: 4 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" rel="nofollow noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);
      const cluster = (L as any).markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        maxClusterRadius: 60,
      });
      map.addLayer(cluster);
      setHandle({ L, map, cluster, defaultIcon });
      cleanup = () => {
        map.remove();
      };
    })();
    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, []);

  // Re-render markers when pins change.
  useEffect(() => {
    if (!handle) return;
    const { L, map, cluster, defaultIcon } = handle;
    cluster.clearLayers();
    if (pins.length === 0) return;
    const markers = pins.map((p) => {
      const m = L.marker([p.lat, p.lng], { icon: defaultIcon });
      const dateStr = (() => {
        try {
          return new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        } catch {
          return p.date;
        }
      })();
      const price = p.priceMin != null ? `$${p.priceMin}+` : "Price TBA";
      m.bindPopup(`
        <div style="min-width:200px">
          <a href="/races/${p.slug}" data-testid="popup-link-${p.slug}" style="font-weight:600;color:hsl(217,91%,40%);text-decoration:none">
            ${escapeHtml(p.name)}
          </a>
          <div style="font-size:12px;color:#666;margin-top:4px">
            ${escapeHtml(p.city)}, ${escapeHtml(p.state)} • ${escapeHtml(p.distance)}
          </div>
          <div style="font-size:12px;color:#666">${escapeHtml(dateStr)} • ${price}</div>
          <div style="font-size:11px;color:#888;margin-top:4px">Quality ${p.qualityScore}/100</div>
        </div>
      `);
      return m;
    });
    cluster.addLayers(markers);
    if (pins.length <= 500) {
      const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [handle, pins]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} data-testid="map-container" />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
