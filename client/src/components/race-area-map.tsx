import { useEffect, useRef, useState } from "react";

export interface RaceAreaPoint {
  lat: number;
  lng: number;
  name: string;
  href: string;
}

export function RaceAreaMap({ points, label }: { points: RaceAreaPoint[]; label: string }) {
  const element = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let dispose: (() => void) | undefined;
    if (!element.current || !points.length) return;
    const container = element.current;
    setFailed(false);
    void Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([L]) => {
      if (!active) return;
      const map = L.map(container, { scrollWheelZoom: false, preferCanvas: true }).setView([39.5, -98.35], 4);
      dispose = () => map.remove();
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
      }).addTo(map);
      for (const point of points) {
        const link = document.createElement("a");
        link.href = point.href;
        link.textContent = point.name;
        L.circleMarker([point.lat, point.lng], { radius: 7, color: "#fff", weight: 2, fillColor: "#075985", fillOpacity: 1 })
          .addTo(map).bindPopup(link);
      }
      if (points.length < 1200) {
        map.fitBounds(points.map(point => [point.lat, point.lng]), { padding: [32, 32], maxZoom: 10 });
      }
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; dispose?.(); };
  }, [points]);

  return failed
    ? <p className="rounded-xl border p-5 text-sm text-muted-foreground">The interactive map is temporarily unavailable.</p>
    : <div ref={element} role="region" aria-label={label} data-testid="race-area-map" className="h-80 w-full rounded-xl border bg-muted" />;
}
