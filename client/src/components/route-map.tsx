import { useEffect, useRef, useState } from "react";

interface RouteMapProps {
  lat: number;
  lng: number;
  name: string;
  polyline?: string | null;
  className?: string;
}

export function RouteMap({ lat, lng, name, polyline, className = "" }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !mapRef.current || mapInstance.current) return;

      setLoaded(true);

      const map = L.map(mapRef.current, {
        scrollWheelZoom: false,
      }).setView([lat, lng], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (polyline) {
        try {
          const coords: [number, number][] = JSON.parse(polyline);
          if (coords.length > 1) {
            const routeLine = L.polyline(coords as L.LatLngExpression[], {
              color: "hsl(221.2, 83.2%, 53.3%)",
              weight: 4,
              opacity: 0.85,
              smoothFactor: 1,
            }).addTo(map);

            const startIcon = L.divIcon({
              html: `<div style="width:14px;height:14px;background:hsl(142,76%,36%);border:3px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
              className: "bg-transparent border-none",
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            });

            const endIcon = L.divIcon({
              html: `<div style="width:14px;height:14px;background:hsl(0,84%,60%);border:3px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
              className: "bg-transparent border-none",
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            });

            L.marker(coords[0] as L.LatLngExpression, { icon: startIcon }).addTo(map).bindPopup("Start");
            L.marker(coords[coords.length - 1] as L.LatLngExpression, { icon: endIcon }).addTo(map).bindPopup("Finish");

            map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
          }
        } catch {
          // fallback: just show the center marker
          const icon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="hsl(221.2, 83.2%, 53.3%)" width="36" height="36"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`,
            className: "bg-transparent border-none",
            iconSize: [36, 36],
            iconAnchor: [18, 36],
          });
          L.marker([lat, lng], { icon }).addTo(map).bindPopup(name);
        }
      } else {
        const icon = L.divIcon({
          html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="hsl(221.2, 83.2%, 53.3%)" width="36" height="36"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`,
          className: "bg-transparent border-none",
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        });
        L.marker([lat, lng], { icon }).addTo(map).bindPopup(name);
      }

      mapInstance.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [lat, lng, name, polyline]);

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`} data-testid="map-route">
      {!loaded && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground text-sm">Loading map...</div>
        </div>
      )}
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
