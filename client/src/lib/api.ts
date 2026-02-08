import type { Race, Route, State, City, Collection, RaceOccurrence } from "@shared/schema";

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

export function apiGetCitiesByState(stateSlug: string) {
  return fetchJSON<City[]>(`/api/states/${stateSlug}/cities`);
}

export function apiGetCity(stateSlug: string, citySlug: string) {
  return fetchJSON<City & { state: State }>(`/api/cities/${stateSlug}/${citySlug}`);
}

export function apiGetRaces(params?: { state?: string; distance?: string; surface?: string; city?: string; year?: number; month?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.state) searchParams.set("state", params.state);
  if (params?.distance) searchParams.set("distance", params.distance);
  if (params?.surface) searchParams.set("surface", params.surface);
  if (params?.city) searchParams.set("city", params.city);
  if (params?.year) searchParams.set("year", params.year.toString());
  if (params?.month) searchParams.set("month", params.month.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  const qs = searchParams.toString();
  return fetchJSON<Race[]>(`/api/races${qs ? `?${qs}` : ""}`);
}

export function apiGetRace(slug: string) {
  return fetchJSON<Race>(`/api/races/${slug}`);
}

export function apiGetRaceOccurrences(params?: { raceId?: number; year?: number; month?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.raceId) searchParams.set("raceId", params.raceId.toString());
  if (params?.year) searchParams.set("year", params.year.toString());
  if (params?.month) searchParams.set("month", params.month.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  const qs = searchParams.toString();
  return fetchJSON<RaceOccurrence[]>(`/api/race-occurrences${qs ? `?${qs}` : ""}`);
}

export function apiGetRoutes(params?: { state?: string; surface?: string; type?: string; city?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.state) searchParams.set("state", params.state);
  if (params?.surface) searchParams.set("surface", params.surface);
  if (params?.type) searchParams.set("type", params.type);
  if (params?.city) searchParams.set("city", params.city);
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  const qs = searchParams.toString();
  return fetchJSON<Route[]>(`/api/routes${qs ? `?${qs}` : ""}`);
}

export function apiGetRoute(slug: string) {
  return fetchJSON<Route>(`/api/routes/${slug}`);
}

export function apiGetCollections(params?: { type?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  const qs = searchParams.toString();
  return fetchJSON<Collection[]>(`/api/collections${qs ? `?${qs}` : ""}`);
}

export function apiGetCollection(slug: string) {
  return fetchJSON<Collection>(`/api/collections/${slug}`);
}
