import type { Race, Route, State, City, Collection, RaceOccurrence, Influencer, Podcast, Book, Favorite } from "@shared/schema";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
}

export async function apiSendMagicLink(email: string) {
  const res = await fetch("/api/auth/magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to send magic link");
  return data;
}

export async function apiVerifyToken(token: string) {
  return fetchJSON<{ user: AuthUser; isNewUser: boolean }>(`/api/auth/verify?token=${token}`);
}

export async function apiGetCurrentUser() {
  return fetchJSON<{ user: AuthUser | null }>("/api/auth/me");
}

export async function apiLogout() {
  const res = await fetch("/api/auth/logout", { method: "POST" });
  return res.json();
}

export async function apiUpdateProfile(name: string) {
  const res = await fetch("/api/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function apiGetFavorites(type?: string) {
  const params = type ? `?type=${type}` : "";
  return fetchJSON<Favorite[]>(`/api/favorites${params}`);
}

export async function apiGetFavoritesEnriched() {
  return fetchJSON<{ races: Race[]; routes: Route[]; favorites: Favorite[] }>("/api/favorites/enriched");
}

export async function apiAddFavorite(itemType: string, itemId: number) {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemType, itemId }),
  });
  return res.json();
}

export async function apiRemoveFavorite(itemType: string, itemId: number) {
  const res = await fetch("/api/favorites", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemType, itemId }),
  });
  return res.json();
}

export async function apiCheckFavorite(itemType: string, itemId: number) {
  return fetchJSON<{ isFavorited: boolean }>(`/api/favorites/check?itemType=${itemType}&itemId=${itemId}`);
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

export interface WeatherData {
  type: "forecast" | "historical" | "unavailable";
  date?: string;
  tempHigh?: number;
  tempLow?: number;
  precipProbability?: number;
  precipAmount?: number;
  windSpeed?: number;
  weatherCode?: number;
}

export function apiGetPopularRaces() {
  return fetchJSON<Race[]>("/api/races/popular");
}

export function apiGetTrendingRaces() {
  return fetchJSON<Race[]>("/api/races/trending");
}

export function apiGetRacesNearby(lat: number, lng: number, limit?: number) {
  const params = new URLSearchParams();
  params.set("lat", lat.toString());
  params.set("lng", lng.toString());
  if (limit) params.set("limit", limit.toString());
  return fetchJSON<(Race & { distanceMiles: number })[]>(`/api/races/nearby?${params.toString()}`);
}

export interface ElevationProfile {
  type: "available" | "unavailable";
  profile?: { mile: number; elevation: number }[];
}

export function apiGetElevationProfile(params: { lat?: number | null; lng?: number | null; city?: string; state?: string }) {
  const searchParams = new URLSearchParams();
  if (params.lat) searchParams.set("lat", params.lat.toString());
  if (params.lng) searchParams.set("lng", params.lng.toString());
  if (params.city) searchParams.set("city", params.city);
  if (params.state) searchParams.set("state", params.state);
  return fetchJSON<ElevationProfile>(`/api/elevation-profile?${searchParams.toString()}`);
}

export function apiGetWeather(params: { lat?: number | null; lng?: number | null; date: string; city?: string; state?: string }) {
  const searchParams = new URLSearchParams();
  if (params.lat) searchParams.set("lat", params.lat.toString());
  if (params.lng) searchParams.set("lng", params.lng.toString());
  searchParams.set("date", params.date);
  if (params.city) searchParams.set("city", params.city);
  if (params.state) searchParams.set("state", params.state);
  return fetchJSON<WeatherData>(`/api/weather?${searchParams.toString()}`);
}

export function apiGetInfluencers(limit?: number) {
  const params = limit ? `?limit=${limit}` : "";
  return fetchJSON<Influencer[]>(`/api/influencers${params}`);
}

export function apiGetInfluencer(slug: string) {
  return fetchJSON<Influencer>(`/api/influencers/${slug}`);
}

export function apiGetPodcasts(params?: { category?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  const qs = searchParams.toString();
  return fetchJSON<Podcast[]>(`/api/podcasts${qs ? `?${qs}` : ""}`);
}

export function apiGetPodcast(slug: string) {
  return fetchJSON<Podcast>(`/api/podcasts/${slug}`);
}

export function apiGetBooks(params?: { category?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  const qs = searchParams.toString();
  return fetchJSON<Book[]>(`/api/books${qs ? `?${qs}` : ""}`);
}

export function apiGetBook(slug: string) {
  return fetchJSON<Book>(`/api/books/${slug}`);
}
