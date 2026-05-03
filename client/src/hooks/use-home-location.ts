import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rs.homeLocation";

export type HomeLocation = {
  zip: string;
  lat: number;
  lng: number;
  label: string;
};

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function readStore(): HomeLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.zip === "string" &&
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      typeof parsed.label === "string"
    ) {
      return parsed as HomeLocation;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeStore(value: HomeLocation | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useHomeLocation() {
  const [home, setHome] = useState<HomeLocation | null>(null);

  useEffect(() => {
    const sync = () => setHome(readStore());
    listeners.add(sync);
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const set = useCallback((value: HomeLocation) => writeStore(value), []);
  const clear = useCallback(() => writeStore(null), []);

  return { home, set, clear };
}

// Great-circle distance between two points in miles (Haversine).
export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.7613; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Rough cost / time estimates for travel from home -> race city.
// - Drive: $0.20/mile (gas + wear), 60 mph average.
// - Fly: $75 fixed + $0.10/mile over 300 miles, +3 hr terminal time, 500 mph.
// We choose the cheaper of the two, but flying is only considered above 300mi.
export type TravelEstimate = {
  miles: number;
  mode: "drive" | "fly";
  cost: number;
  hours: number;
};

export function estimateTravel(miles: number): TravelEstimate {
  const driveCost = miles * 0.2;
  const driveHours = miles / 60;
  if (miles < 300) {
    return { miles, mode: "drive", cost: driveCost, hours: driveHours };
  }
  const flyCost = 75 + Math.max(0, miles - 300) * 0.1;
  const flyHours = 3 + miles / 500;
  // For multi-day road-trippable distances (300-600mi), driving usually wins
  // on cost; flying wins above ~600mi.
  if (miles < 600 && driveCost < flyCost * 1.5) {
    return { miles, mode: "drive", cost: driveCost, hours: driveHours };
  }
  return { miles, mode: "fly", cost: flyCost, hours: flyHours };
}
