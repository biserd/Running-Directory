import type { Race, Route, State } from "@shared/schema";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export function apiGetStates() {
  return fetchJSON<State[]>("/api/states");
}

export function apiGetState(slug: string) {
  return fetchJSON<State>(`/api/states/${slug}`);
}

export function apiGetRaces(params?: { state?: string; distance?: string; surface?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.state) searchParams.set("state", params.state);
  if (params?.distance) searchParams.set("distance", params.distance);
  if (params?.surface) searchParams.set("surface", params.surface);
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  const qs = searchParams.toString();
  return fetchJSON<Race[]>(`/api/races${qs ? `?${qs}` : ""}`);
}

export function apiGetRace(slug: string) {
  return fetchJSON<Race>(`/api/races/${slug}`);
}

export function apiGetRoutes(params?: { state?: string; surface?: string; type?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.state) searchParams.set("state", params.state);
  if (params?.surface) searchParams.set("surface", params.surface);
  if (params?.type) searchParams.set("type", params.type);
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  const qs = searchParams.toString();
  return fetchJSON<Route[]>(`/api/routes${qs ? `?${qs}` : ""}`);
}

export function apiGetRoute(slug: string) {
  return fetchJSON<Route>(`/api/routes/${slug}`);
}
