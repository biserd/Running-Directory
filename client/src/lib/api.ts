import type { Race, Route, State, City, Collection, RaceOccurrence, Influencer, Podcast, Book, Favorite, Review } from "@shared/schema";

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

export type RaceWithCitySlug = Race & { citySlug?: string | null };

export function apiGetRace(slug: string) {
  return fetchJSON<RaceWithCitySlug>(`/api/races/${slug}`);
}

export type RaceSearchParams = {
  state?: string;
  city?: string;
  distance?: string;
  surface?: string;
  terrain?: string;
  month?: number;
  isTurkeyTrot?: boolean;
  walkerFriendly?: boolean;
  strollerFriendly?: boolean;
  charity?: boolean;
  kidsRace?: boolean;
  bostonQualifier?: boolean;
  organizerId?: number;
  seriesId?: number;
  priceMax?: number;
  minBeginnerScore?: number;
  minPrScore?: number;
  minValueScore?: number;
  minVibeScore?: number;
  minFamilyScore?: number;
  sort?: "date" | "price" | "beginner" | "pr" | "value" | "vibe" | "family" | "urgency" | "quality";
  limit?: number;
  offset?: number;
};

export function buildRaceSearchQs(params: RaceSearchParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "" || v === false) continue;
    qs.set(k, String(v));
  }
  return qs.toString();
}

export function apiSearchRaces(params: RaceSearchParams) {
  const qs = buildRaceSearchQs(params);
  return fetchJSON<Race[]>(`/api/races/search${qs ? `?${qs}` : ""}`);
}

export function apiCompareRaces(ids: number[]) {
  const param = ids.filter(n => Number.isFinite(n)).join(",");
  return fetchJSON<Race[]>(`/api/races/compare?ids=${param}`);
}

export function apiSimilarRaces(slug: string, limit = 6) {
  return fetchJSON<Race[]>(`/api/races/${slug}/similar?limit=${limit}`);
}

export interface ShopperInput {
  goal: "beginner" | "pr" | "value" | "vibe" | "family" | "urgency";
  distance?: string;
  distances?: string[];
  state?: string;
  terrain?: string;
  surface?: string;
  difficulty?: "easy" | "moderate" | "hard";
  radiusMiles?: number;
  near?: { lat: number; lng: number; radiusMiles?: number };
  dateFrom?: string;
  dateTo?: string;
  budget?: number;
  walkerFriendly?: boolean;
  strollerFriendly?: boolean;
  dogFriendly?: boolean;
  kidsRace?: boolean;
  charity?: boolean;
  bostonQualifier?: boolean;
  limit?: number;
}

export async function apiShopperRaces(input: ShopperInput) {
  const res = await fetch("/api/races/shopper", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Shopper request failed");
  return res.json() as Promise<{ goal: string; count: number; races: Race[] }>;
}

export async function apiSubmitRaceClaim(slug: string, body: { claimerEmail: string; claimerName?: string; claimerRole?: string; message?: string }) {
  const res = await fetch(`/api/races/${slug}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Claim failed");
  return json as {
    message: string;
    claimId: number;
    verifiedVia?: "email-link" | "domain-match";
    autoSignedIn?: boolean;
    redirect?: string;
    organizer?: { id: number; slug: string; name: string };
  };
}

export interface OrganizerLite {
  id: number;
  slug: string;
  name: string;
  email?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  city?: string | null;
  state?: string | null;
  isVerified?: boolean | null;
}

export async function apiClaimVerify(token: string) {
  const res = await fetch(`/api/race-claims/verify?token=${encodeURIComponent(token)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Verification failed");
  return data as {
    ok: true;
    user: AuthUser;
    organizer: { id: number; slug: string; name: string };
    race: { id: number; slug: string; name: string };
  };
}

export async function apiOrganizerMe() {
  const res = await fetch("/api/organizers/me");
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load organizer");
  return data as { organizer: OrganizerLite; races: Race[]; isPro: boolean };
}

export type EditableRaceFields = Partial<{
  registrationUrl: string | null;
  website: string | null;
  description: string | null;
  startTime: string | null;
  timeLimit: string | null;
  priceMin: number | null;
  priceMax: number | null;
  registrationOpen: boolean | null;
  registrationDeadline: string | null;
  nextPriceIncreaseAt: string | null;
  nextPriceIncreaseAmount: number | null;
  courseMapUrl: string | null;
  elevationProfileUrl: string | null;
  courseType: string | null;
  terrain: string | null;
  elevationGainM: number | null;
  fieldSize: number | null;
  refundPolicy: string | null;
  deferralPolicy: string | null;
  packetPickup: string | null;
  parkingNotes: string | null;
  transitFriendly: boolean | null;
  walkerFriendly: boolean | null;
  strollerFriendly: boolean | null;
  dogFriendly: boolean | null;
  kidsRace: boolean | null;
  charity: boolean | null;
  charityPartner: string | null;
  vibeTags: string[];
  couponCode: string | null;
  couponDiscount: string | null;
  couponExpiresAt: string | null;
  photoUrls: string[];
  faq: { q: string; a: string }[] | null;
}>;

export function buildOutboundRedirectUrl(params: {
  url: string;
  destination: "registration" | "website" | "organizer" | "course-map" | "elevation" | "results" | "social";
  raceId?: number;
  organizerId?: number;
}): string {
  const qs = new URLSearchParams();
  qs.set("url", params.url);
  qs.set("destination", params.destination);
  if (params.raceId != null) qs.set("raceId", String(params.raceId));
  if (params.organizerId != null) qs.set("organizerId", String(params.organizerId));
  return `/api/outbound/redirect?${qs.toString()}`;
}

export async function apiUpdateOrganizerRace(raceId: number, partial: EditableRaceFields) {
  const res = await fetch(`/api/organizers/me/races/${raceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Update failed");
  return data as { ok: true; race: Race };
}

export interface RaceAnalytics {
  days: number;
  totals: { views: number; saves: number; clicks: number };
  timeline: { day: string; views: number; saves: number; clicks: number }[];
  byDestination: { destination: string; count: number }[];
}

export async function apiOrganizerRaceAnalytics(raceId: number, days = 30) {
  const res = await fetch(`/api/organizers/me/races/${raceId}/analytics?days=${days}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Analytics failed");
  return data as RaceAnalytics;
}

export async function apiCreateFeaturedRequest(raceId: number, body: { plan?: "featured" | "premium"; durationDays?: number; message?: string; contactEmail?: string }) {
  const res = await fetch(`/api/organizers/me/races/${raceId}/feature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data as { ok: true; message: string };
}

export async function apiGetFeaturedRaces(params: { cityId?: number; distance?: string; isTurkeyTrot?: boolean; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.cityId) qs.set("cityId", String(params.cityId));
  if (params.distance) qs.set("distance", params.distance);
  if (params.isTurkeyTrot) qs.set("isTurkeyTrot", "true");
  if (params.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return fetchJSON<Race[]>(`/api/featured/races${q ? `?${q}` : ""}`);
}

export function apiTrackRaceView(slug: string) {
  return fetch(`/api/races/${slug}/view`, { method: "POST", keepalive: true }).catch(() => undefined);
}

export async function apiTrackOutbound(input: { raceId?: number; organizerId?: number; destination: "registration" | "website" | "organizer" | "course-map" | "elevation" | "results" | "social"; targetUrl: string }) {
  return fetch("/api/outbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
  }).catch(() => undefined);
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

export type ReviewWithUser = Review & { userName: string | null };
export type ReviewSummary = { avgRating: number; count: number };

export function apiGetReviews(itemType: string, itemId: number) {
  return fetchJSON<ReviewWithUser[]>(`/api/reviews?itemType=${itemType}&itemId=${itemId}`);
}

export function apiGetReviewSummary(itemType: string, itemId: number) {
  return fetchJSON<ReviewSummary>(`/api/reviews/summary?itemType=${itemType}&itemId=${itemId}`);
}

export function apiGetMyReview(itemType: string, itemId: number) {
  return fetchJSON<Review | null>(`/api/reviews/mine?itemType=${itemType}&itemId=${itemId}`);
}

export async function apiSubmitReview(data: { itemType: string; itemId: number; rating: number; comment?: string }) {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to submit review");
  return json as Review;
}

export async function apiDeleteReview(id: number) {
  const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete review");
}

// ─────────────────────────────────────────────────────────────────
// Monetization: Pro, sponsorships, reports, API keys
// ─────────────────────────────────────────────────────────────────

export interface SponsorshipSlot {
  id: number;
  brand: string;
  headline: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string;
  clickUrl: string;
}

export async function apiGetSponsorships(params: {
  placement: string;
  cityId?: number;
  stateId?: number;
  distance?: string;
  isTurkeyTrot?: boolean;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  qs.set("placement", params.placement);
  if (params.cityId) qs.set("cityId", String(params.cityId));
  if (params.stateId) qs.set("stateId", String(params.stateId));
  if (params.distance) qs.set("distance", params.distance);
  if (params.isTurkeyTrot) qs.set("isTurkeyTrot", "true");
  if (params.limit) qs.set("limit", String(params.limit));
  return fetchJSON<SponsorshipSlot[]>(`/api/sponsorships?${qs.toString()}`);
}

export interface MonetizationRequestBody {
  kind: "pro" | "report" | "api" | "sponsorship";
  contactEmail: string;
  contactName?: string;
  organizerId?: number;
  scope?: string;
  message?: string;
}

export async function apiSubmitMonetizationRequest(body: MonetizationRequestBody) {
  const res = await fetch("/api/monetization/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not submit request");
  return data as { ok: true; requestId: number };
}

export interface ReportListItem {
  id: number;
  metroSlug: string;
  distance: string;
  title: string;
  summary: string | null;
  generatedAt: string;
}

export async function apiGetReports() {
  return fetchJSON<ReportListItem[]>(`/api/reports`);
}

export interface MarketReportFull {
  raceCount: number;
  avgPriceUsd: number | null;
  priceRange: { min: number | null; max: number | null };
  topMonths: { month: number; monthName: string; count: number }[];
  topOrganizers: { organizerId: number | null; name: string; count: number }[];
  topRaces: { raceId: number; slug: string; name: string; date: string; qualityScore: number | null }[];
  scoreAverages: { beginner: number | null; pr: number | null; value: number | null; vibe: number | null; family: number | null; quality: number | null };
}

export interface ReportDetail {
  report: ReportListItem;
  access: "preview" | "full";
  data: Partial<MarketReportFull>;
}

export async function apiGetReport(metroSlug: string, distance: string) {
  return fetchJSON<ReportDetail>(`/api/reports/${metroSlug}/${encodeURIComponent(distance)}`);
}

export interface OrganizerApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  tier: string;
  monthlyLimit: number;
  monthlyUsage: number;
  lastUsedAt: string | null;
  status: string;
  createdAt: string;
}

export async function apiGetOrganizerApiKeys() {
  return fetchJSON<OrganizerApiKey[]>(`/api/organizers/me/api-keys`);
}

export async function apiRequestApiKey(body: { tier?: string; message?: string }) {
  const res = await fetch("/api/organizers/me/api-keys/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not submit request");
  return data as { ok: true; requestId: number };
}

export async function apiRevokeApiKey(id: number) {
  const res = await fetch(`/api/organizers/me/api-keys/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || "Could not revoke key");
  }
  return { ok: true } as const;
}

export interface BenchmarkResponse {
  days: number;
  sampleSize: number;
  yours: { views: number; saves: number; clicks: number };
  median: { views: number; saves: number; clicks: number };
  p75: { views: number; saves: number; clicks: number };
}

export async function apiGetRaceBenchmark(raceId: number, days = 30) {
  const res = await fetch(`/api/organizers/me/races/${raceId}/benchmark?days=${days}`);
  if (res.status === 403) throw new Error("Race Pro required");
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string }).message || "Benchmark failed");
  return data as BenchmarkResponse;
}

export function apiAnalyticsCsvUrl(raceId: number, days = 30): string {
  return `/api/organizers/me/races/${raceId}/analytics.csv?days=${days}`;
}
