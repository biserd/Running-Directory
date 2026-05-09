import { db } from "./db";
import { states, cities, races, raceOccurrences, routes, sources, sourceRecords, collections, influencers, podcasts, books, users, magicLinkTokens, favorites, reviews, organizers, raceSeries, raceClaims, savedSearches, raceAlerts, outboundClicks, alertDispatches, featuredRequests, racePageViews, apiKeys, sponsorships, marketReports, marketReportAccess, monetizationRequests, raceFieldProvenance } from "@shared/schema";
import { TRACKED_FIELDS, isTrackedField, resolveFieldWinners, type TrackedField } from "@shared/provenance";
import type {
  State, City, Race, RaceOccurrence, Route, Source, SourceRecord, Collection, Influencer, Podcast, Book,
  InsertState, InsertCity, InsertRace, InsertRaceOccurrence, InsertRoute, InsertSource, InsertSourceRecord, InsertCollection, InsertInfluencer, InsertPodcast, InsertBook,
  User, MagicLinkToken, Favorite, Review,
  Organizer, RaceSeries, RaceClaim, SavedSearch, RaceAlert, OutboundClick, AlertDispatch, FeaturedRequest,
  InsertOrganizer, InsertRaceSeries, InsertRaceClaim, InsertSavedSearch, InsertRaceAlert, InsertOutboundClick, InsertAlertDispatch, InsertFeaturedRequest,
  ApiKey, InsertApiKey, Sponsorship, InsertSponsorship,
  MarketReport, InsertMarketReport, MarketReportAccess, InsertMarketReportAccess, MarketReportData,
  MonetizationRequest, InsertMonetizationRequest,
  RaceFieldProvenance,
  RaceSearchFilters,
} from "@shared/schema";
import { eq, and, sql, desc, asc, ilike, inArray, gte, lte, or, isNotNull } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

export interface IStorage {
  getStates(): Promise<State[]>;
  getStateBySlug(slug: string): Promise<State | undefined>;

  getCities(filters?: { stateId?: number; limit?: number }): Promise<City[]>;
  getCityBySlug(stateSlug: string, citySlug: string): Promise<(City & { state: State }) | undefined>;
  getCitiesByState(stateId: number): Promise<City[]>;

  getRaces(filters?: { state?: string; distance?: string; surface?: string; city?: string; cityId?: number; year?: number; month?: number; limit?: number }): Promise<Race[]>;
  getRaceBySlug(slug: string): Promise<Race | undefined>;
  getRacesByState(stateAbbr: string): Promise<Race[]>;

  getRaceOccurrences(filters?: { raceId?: number; year?: number; month?: number; limit?: number }): Promise<RaceOccurrence[]>;

  getRoutes(filters?: { state?: string; surface?: string; type?: string; city?: string; cityId?: number; limit?: number }): Promise<Route[]>;
  getRouteBySlug(slug: string): Promise<Route | undefined>;
  getRoutesByState(stateAbbr: string): Promise<Route[]>;

  getCollections(filters?: { type?: string; limit?: number }): Promise<Collection[]>;
  getCollectionBySlug(slug: string): Promise<Collection | undefined>;

  getSources(): Promise<Source[]>;

  seedStates(data: InsertState[]): Promise<void>;
  seedCities(data: InsertCity[]): Promise<void>;
  seedRaces(data: InsertRace[]): Promise<void>;
  seedRaceOccurrences(data: InsertRaceOccurrence[]): Promise<void>;
  seedRoutes(data: InsertRoute[]): Promise<void>;
  seedSources(data: InsertSource[]): Promise<void>;
  seedCollections(data: InsertCollection[]): Promise<void>;

  upsertRace(data: InsertRace): Promise<{ id: number; created: boolean }>;
  upsertSourceRecord(data: InsertSourceRecord): Promise<{ id: number }>;
  getSourceByName(name: string): Promise<Source | undefined>;
  findSourceRecord(sourceId: number, externalId: string): Promise<SourceRecord | undefined>;
  updateRaceLastSeen(raceId: number): Promise<void>;
  markRacesInactive(olderThan: Date): Promise<number>;
  getRaceCount(): Promise<number>;
  getRouteCount(): Promise<number>;
  getRacesNearby(lat: number, lng: number, limit?: number): Promise<(Race & { distanceMiles: number })[]>;
  getPopularRaces(limit?: number): Promise<Race[]>;
  getTrendingRaces(limit?: number): Promise<Race[]>;

  getInfluencers(filters?: { limit?: number }): Promise<Influencer[]>;
  getInfluencerBySlug(slug: string): Promise<Influencer | undefined>;
  seedInfluencers(data: InsertInfluencer[]): Promise<void>;
  getPodcasts(filters?: { category?: string; limit?: number }): Promise<Podcast[]>;
  getPodcastBySlug(slug: string): Promise<Podcast | undefined>;
  seedPodcasts(data: InsertPodcast[]): Promise<void>;
  getBooks(filters?: { category?: string; limit?: number }): Promise<Book[]>;
  getBookBySlug(slug: string): Promise<Book | undefined>;
  seedBooks(data: InsertBook[]): Promise<void>;

  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(email: string, name?: string): Promise<User>;
  updateUserLastLogin(id: number): Promise<void>;
  updateUserName(id: number, name: string): Promise<void>;

  createMagicLinkToken(email: string, token: string, expiresAt: Date): Promise<MagicLinkToken>;
  getMagicLinkToken(token: string): Promise<MagicLinkToken | undefined>;
  markTokenUsed(id: number): Promise<void>;
  cleanExpiredTokens(): Promise<void>;

  getRacesByIds(ids: number[]): Promise<Race[]>;
  getRoutesByIds(ids: number[]): Promise<Route[]>;

  getUserFavorites(userId: number): Promise<Favorite[]>;
  addFavorite(userId: number, itemType: string, itemId: number): Promise<Favorite>;
  removeFavorite(userId: number, itemType: string, itemId: number): Promise<void>;
  isFavorited(userId: number, itemType: string, itemId: number): Promise<boolean>;
  getUserFavoritesByType(userId: number, itemType: string): Promise<Favorite[]>;

  getReviews(itemType: string, itemId: number): Promise<(Review & { userName: string | null })[]>;
  getReviewSummary(itemType: string, itemId: number): Promise<{ avgRating: number; count: number }>;
  getUserReview(userId: number, itemType: string, itemId: number): Promise<Review | undefined>;
  createReview(userId: number, itemType: string, itemId: number, rating: number, comment?: string): Promise<Review>;
  updateReview(id: number, userId: number, rating: number, comment?: string): Promise<Review>;
  deleteReview(id: number, userId: number): Promise<void>;

  getRacesAdvanced(filters: RaceSearchFilters): Promise<Race[]>;
  getRaceWithScores(slug: string): Promise<Race | undefined>;
  getSimilarRaces(slug: string, limit?: number): Promise<Race[]>;
  getRacesThisWeekend(state?: string): Promise<Race[]>;
  getPriceIncreasingSoon(days?: number, limit?: number): Promise<Race[]>;
  updateRaceScores(raceId: number, scores: { beginnerScore: number; prScore: number; valueScore: number; vibeScore: number; familyScore: number; urgencyScore: number; scoreBreakdown: unknown }): Promise<void>;

  getOrganizers(filters?: { state?: string; isVerified?: boolean; limit?: number }): Promise<Organizer[]>;
  getOrganizerBySlug(slug: string): Promise<Organizer | undefined>;
  createOrganizer(data: InsertOrganizer): Promise<Organizer>;
  updateOrganizer(id: number, data: Partial<InsertOrganizer>): Promise<Organizer | undefined>;
  getRacesByOrganizer(organizerId: number): Promise<Race[]>;

  getRaceSeries(filters?: { limit?: number }): Promise<RaceSeries[]>;
  getRaceSeriesBySlug(slug: string): Promise<RaceSeries | undefined>;
  getRacesBySeries(seriesId: number): Promise<Race[]>;

  getCityByMetroSlug(metroSlug: string): Promise<(City & { state: State }) | undefined>;
  getMetrosWithRaceCount(minRaces?: number, limit?: number): Promise<{ city: City; state: State; raceCount: number }[]>;

  createRaceClaim(data: InsertRaceClaim): Promise<RaceClaim>;
  getRaceClaimByToken(token: string): Promise<RaceClaim | undefined>;
  getRaceClaimsByRace(raceId: number): Promise<RaceClaim[]>;
  getRaceClaimsByStatus(status: string, limit?: number): Promise<RaceClaim[]>;
  approveRaceClaim(id: number, organizerId: number, reviewerNote?: string): Promise<void>;
  rejectRaceClaim(id: number, reviewerNote?: string): Promise<void>;
  verifyRaceClaim(id: number): Promise<void>;

  getSavedSearches(userId: number): Promise<SavedSearch[]>;
  createSavedSearch(data: InsertSavedSearch): Promise<SavedSearch>;
  deleteSavedSearch(id: number, userId: number): Promise<void>;
  toggleSavedSearchAlert(id: number, userId: number, enabled: boolean): Promise<void>;

  getRaceAlerts(userId: number): Promise<RaceAlert[]>;
  getRaceAlertsWithRace(userId: number): Promise<(RaceAlert & { raceSlug: string | null; raceName: string | null })[]>;
  createRaceAlert(data: InsertRaceAlert): Promise<RaceAlert>;
  deleteRaceAlert(id: number, userId: number): Promise<void>;
  updateRaceAlertType(id: number, userId: number, alertType: string): Promise<RaceAlert | undefined>;

  recordOutboundClick(data: InsertOutboundClick): Promise<OutboundClick>;
  getOutboundClickStats(raceId: number, sinceDays?: number): Promise<{ total: number; byDestination: Record<string, number> }>;

  // Pro tier
  setOrganizerProUntil(organizerId: number, proUntil: Date | null): Promise<void>;
  isOrganizerPro(organizerId: number): Promise<boolean>;
  getRaceCompetitorBenchmark(race: Race, sinceDays: number): Promise<{
    sampleSize: number;
    yours: { views: number; saves: number; clicks: number };
    median: { views: number; saves: number; clicks: number };
    p75: { views: number; saves: number; clicks: number };
  }>;

  // API keys
  createApiKey(data: { userId: number; organizerId?: number | null; name: string; tier?: string; monthlyLimit?: number }): Promise<{ apiKey: ApiKey; plaintext: string }>;
  revokeApiKey(id: number, userId: number): Promise<void>;
  listApiKeysForUser(userId: number): Promise<ApiKey[]>;
  findApiKeyByPlaintext(plaintext: string): Promise<ApiKey | undefined>;
  recordApiKeyUsage(id: number): Promise<{ allowed: boolean; remaining: number }>;

  // Sponsorships
  createSponsorship(data: InsertSponsorship): Promise<Sponsorship>;
  updateSponsorship(id: number, data: Partial<InsertSponsorship>): Promise<Sponsorship | undefined>;
  deleteSponsorship(id: number): Promise<void>;
  listSponsorships(): Promise<Sponsorship[]>;
  listSponsorshipsForPlacement(filter: { placement: string; cityId?: number; stateId?: number; distance?: string; isTurkeyTrot?: boolean; limit?: number }): Promise<Sponsorship[]>;
  incrementSponsorshipImpressions(ids: number[]): Promise<void>;
  incrementSponsorshipClick(id: number): Promise<void>;

  // Market reports
  upsertMarketReport(data: InsertMarketReport): Promise<MarketReport>;
  getMarketReport(metroSlug: string, distance: string): Promise<MarketReport | undefined>;
  listGeneratedReports(limit?: number): Promise<MarketReport[]>;
  computeMarketReportData(metroSlug: string, distance: string): Promise<MarketReportData | undefined>;

  // Report access
  grantReportAccess(userId: number, scope: string, days: number): Promise<MarketReportAccess>;
  hasReportAccess(userId: number, scope: string): Promise<boolean>;

  // Monetization requests
  createMonetizationRequest(data: InsertMonetizationRequest): Promise<MonetizationRequest>;
  listMonetizationRequests(filter?: { status?: string; kind?: string; limit?: number }): Promise<MonetizationRequest[]>;
  getMonetizationRequest(id: number): Promise<MonetizationRequest | undefined>;
  updateMonetizationRequest(id: number, data: { status: string; adminNote?: string }): Promise<MonetizationRequest | undefined>;

  search(query: string, limit?: number): Promise<SearchResult>;
}

export type SearchResult = {
  races: { id: number; name: string; slug: string; city: string | null; state: string | null; distance: string | null; date: string | null }[];
  cities: { id: number; name: string; slug: string; stateSlug: string; stateName: string }[];
  organizers: { id: number; name: string; slug: string; state: string | null; raceCount: number }[];
};

export class DatabaseStorage implements IStorage {
  async getStates(): Promise<State[]> {
    return db.select().from(states).orderBy(states.name);
  }

  async getStateBySlug(slug: string): Promise<State | undefined> {
    const [state] = await db.select().from(states).where(eq(states.slug, slug));
    return state;
  }

  async getCities(filters?: { stateId?: number; limit?: number }): Promise<City[]> {
    const conditions = [];
    if (filters?.stateId) conditions.push(eq(cities.stateId, filters.stateId));

    const query = db.select().from(cities);
    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(cities.name).limit(filters?.limit || 500);
    }
    return query.orderBy(cities.name).limit(filters?.limit || 500);
  }

  async getCityBySlug(stateSlug: string, citySlug: string): Promise<(City & { state: State }) | undefined> {
    const stateData = await this.getStateBySlug(stateSlug);
    if (!stateData) return undefined;

    const [city] = await db.select().from(cities)
      .where(and(eq(cities.slug, citySlug), eq(cities.stateId, stateData.id)));

    if (!city) return undefined;
    return { ...city, state: stateData };
  }

  async getCitiesByState(stateId: number): Promise<City[]> {
    return db.select().from(cities).where(eq(cities.stateId, stateId)).orderBy(cities.name);
  }

  async getCityById(id: number): Promise<(City & { state: State }) | undefined> {
    const [row] = await db
      .select({ city: cities, state: states })
      .from(cities)
      .innerJoin(states, eq(cities.stateId, states.id))
      .where(eq(cities.id, id))
      .limit(1);
    if (!row) return undefined;
    return { ...row.city, state: row.state };
  }

  async getRaces(filters?: { state?: string; distance?: string; surface?: string; city?: string; cityId?: number; year?: number; month?: number; limit?: number; includeAll?: boolean }): Promise<Race[]> {
    const conditions = [];
    conditions.push(eq(races.isActive, true));
    if (!filters?.includeAll && !filters?.year && !filters?.month) {
      conditions.push(sql`${races.date} >= '2025-01-01'`);
    }
    if (filters?.state) conditions.push(eq(races.state, filters.state));
    if (filters?.distance) conditions.push(eq(races.distance, filters.distance));
    if (filters?.surface) conditions.push(eq(races.surface, filters.surface));
    if (filters?.city) conditions.push(eq(races.city, filters.city));
    if (filters?.cityId) conditions.push(eq(races.cityId, filters.cityId));
    if (filters?.year) {
      conditions.push(sql`EXTRACT(YEAR FROM ${races.date}::date) = ${filters.year}`);
    }
    if (filters?.month) {
      conditions.push(sql`EXTRACT(MONTH FROM ${races.date}::date) = ${filters.month}`);
    }

    return db.select().from(races)
      .where(and(...conditions))
      .orderBy(races.date)
      .limit(filters?.limit || 100);
  }

  async getRaceBySlug(slug: string): Promise<Race | undefined> {
    const [race] = await db.select().from(races).where(eq(races.slug, slug));
    return race;
  }

  async getRacesByState(stateAbbr: string): Promise<Race[]> {
    return db.select().from(races)
      .where(and(
        eq(races.state, stateAbbr),
        eq(races.isActive, true),
        sql`${races.date} >= '2025-01-01'`
      ))
      .orderBy(races.date)
      .limit(500);
  }

  async getRaceOccurrences(filters?: { raceId?: number; year?: number; month?: number; limit?: number }): Promise<RaceOccurrence[]> {
    const conditions = [];
    if (filters?.raceId) conditions.push(eq(raceOccurrences.raceId, filters.raceId));
    if (filters?.year) conditions.push(eq(raceOccurrences.year, filters.year));
    if (filters?.month) conditions.push(eq(raceOccurrences.month, filters.month));

    const query = db.select().from(raceOccurrences);
    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(raceOccurrences.startDate).limit(filters?.limit || 100);
    }
    return query.orderBy(raceOccurrences.startDate).limit(filters?.limit || 100);
  }

  async getRoutes(filters?: { state?: string; surface?: string; type?: string; city?: string; cityId?: number; limit?: number }): Promise<Route[]> {
    const conditions = [];
    if (filters?.state) conditions.push(eq(routes.state, filters.state));
    if (filters?.surface) conditions.push(eq(routes.surface, filters.surface));
    if (filters?.type) conditions.push(eq(routes.type, filters.type));
    if (filters?.city) conditions.push(eq(routes.city, filters.city));
    if (filters?.cityId) conditions.push(eq(routes.cityId, filters.cityId));

    const query = db.select().from(routes);
    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(routes.name).limit(filters?.limit || 100);
    }
    return query.orderBy(routes.name).limit(filters?.limit || 100);
  }

  async getRouteBySlug(slug: string): Promise<Route | undefined> {
    const [route] = await db.select().from(routes).where(eq(routes.slug, slug));
    return route;
  }

  async getRoutesByState(stateAbbr: string): Promise<Route[]> {
    return db.select().from(routes).where(eq(routes.state, stateAbbr)).orderBy(routes.name);
  }

  async getCollections(filters?: { type?: string; limit?: number }): Promise<Collection[]> {
    const conditions = [];
    conditions.push(eq(collections.isActive, true));
    if (filters?.type) conditions.push(eq(collections.type, filters.type));

    return db.select().from(collections)
      .where(and(...conditions))
      .orderBy(collections.title)
      .limit(filters?.limit || 100);
  }

  async getCollectionBySlug(slug: string): Promise<Collection | undefined> {
    const [collection] = await db.select().from(collections).where(eq(collections.slug, slug));
    return collection;
  }

  async getSources(): Promise<Source[]> {
    return db.select().from(sources).orderBy(sources.priority);
  }

  async seedStates(data: InsertState[]): Promise<void> {
    for (const s of data) {
      await db.insert(states).values(s).onConflictDoNothing();
    }
  }

  async seedCities(data: InsertCity[]): Promise<void> {
    for (const c of data) {
      await db.insert(cities).values(c).onConflictDoNothing();
    }
  }

  async seedRaces(data: InsertRace[]): Promise<void> {
    for (const r of data) {
      await db.insert(races).values(r).onConflictDoNothing();
    }
  }

  async seedRaceOccurrences(data: InsertRaceOccurrence[]): Promise<void> {
    for (const r of data) {
      await db.insert(raceOccurrences).values(r).onConflictDoNothing();
    }
  }

  async seedRoutes(data: InsertRoute[]): Promise<void> {
    for (const r of data) {
      await db.insert(routes).values(r)
        .onConflictDoUpdate({
          target: routes.slug,
          set: { polyline: r.polyline ?? null },
        });
    }
  }

  async seedSources(data: InsertSource[]): Promise<void> {
    for (const s of data) {
      await db.insert(sources).values(s).onConflictDoNothing();
    }
  }

  async seedCollections(data: InsertCollection[]): Promise<void> {
    for (const c of data) {
      await db.insert(collections).values(c).onConflictDoNothing();
    }
  }

  async upsertRace(data: InsertRace): Promise<{ id: number; created: boolean }> {
    const existing = await db.select().from(races).where(eq(races.slug, data.slug));
    if (existing.length > 0) {
      await db.update(races)
        .set({
          ...data,
          lastSeenAt: new Date(),
        })
        .where(eq(races.slug, data.slug));
      return { id: existing[0].id, created: false };
    }

    const [inserted] = await db.insert(races).values({
      ...data,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    }).returning({ id: races.id });
    return { id: inserted.id, created: true };
  }

  async upsertSourceRecord(data: InsertSourceRecord): Promise<{ id: number }> {
    const conditions = [eq(sourceRecords.sourceId, data.sourceId)];
    if (data.externalId) {
      conditions.push(sql`${sourceRecords.externalId} = ${data.externalId}`);
    } else if (data.hashKey) {
      conditions.push(sql`${sourceRecords.hashKey} = ${data.hashKey}`);
    }
    const existing = await db.select().from(sourceRecords)
      .where(and(...conditions));

    if (existing.length > 0) {
      await db.update(sourceRecords)
        .set({
          ...data,
          lastModifiedAt: new Date(),
        })
        .where(eq(sourceRecords.id, existing[0].id));
      return { id: existing[0].id };
    }

    const [inserted] = await db.insert(sourceRecords).values({
      ...data,
      fetchedAt: new Date(),
      lastModifiedAt: new Date(),
    }).returning({ id: sourceRecords.id });
    return { id: inserted.id };
  }

  async getSourceByName(name: string): Promise<Source | undefined> {
    const [source] = await db.select().from(sources).where(eq(sources.name, name));
    return source;
  }

  async findSourceRecord(sourceId: number, externalId: string): Promise<SourceRecord | undefined> {
    const [record] = await db.select().from(sourceRecords)
      .where(and(
        eq(sourceRecords.sourceId, sourceId),
        sql`${sourceRecords.externalId} = ${externalId}`
      ));
    return record;
  }

  async updateRaceLastSeen(raceId: number): Promise<void> {
    await db.update(races)
      .set({ lastSeenAt: new Date() })
      .where(eq(races.id, raceId));
  }

  async markRacesInactive(olderThan: Date): Promise<number> {
    const result = await db.update(races)
      .set({ isActive: false })
      .where(and(
        eq(races.isActive, true),
        sql`${races.lastSeenAt} < ${olderThan}`
      ))
      .returning({ id: races.id });
    return result.length;
  }

  async getRaceCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(races);
    return Number(result.count);
  }

  async getRouteCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(routes);
    return Number(result.count);
  }

  async getRacesNearby(lat: number, lng: number, limit: number = 20): Promise<(Race & { distanceMiles: number })[]> {
    const cosLat = Math.cos(lat * Math.PI / 180);
    const results = await db.execute(sql`
      SELECT r.*,
        CASE
          WHEN r.lat IS NOT NULL AND r.lng IS NOT NULL THEN
            SQRT(POWER((r.lat - ${lat}), 2) + POWER((${cosLat} * (r.lng - ${lng})), 2)) * 69.0
          WHEN c.lat IS NOT NULL AND c.lng IS NOT NULL THEN
            SQRT(POWER((c.lat - ${lat}), 2) + POWER((${cosLat} * (c.lng - ${lng})), 2)) * 69.0
          ELSE NULL
        END AS distance_miles
      FROM races r
      LEFT JOIN cities c ON r.city_id = c.id
      WHERE r.is_active = true
        AND r.date >= CURRENT_DATE::text
        AND (
          (r.lat IS NOT NULL AND r.lng IS NOT NULL)
          OR (c.lat IS NOT NULL AND c.lng IS NOT NULL)
        )
      ORDER BY distance_miles ASC NULLS LAST
      LIMIT ${limit}
    `);

    return (results.rows as Record<string, unknown>[]).map(row => {
      const camel: Record<string, unknown> = {};
      for (const k of Object.keys(row)) {
        const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        camel[ck] = row[k];
      }
      const distRaw = row.distance_miles;
      const distNum = typeof distRaw === "string" ? parseFloat(distRaw) : (typeof distRaw === "number" ? distRaw : 0);
      return {
        ...(camel as unknown as Race),
        distanceMiles: distNum ? Math.round(distNum * 10) / 10 : 0,
      };
    });
  }

  async getPopularRaces(limit: number = 12): Promise<Race[]> {
    const today = new Date().toISOString().split("T")[0];
    return db.select().from(races)
      .where(and(
        eq(races.isActive, true),
        sql`${races.date} >= ${today}`
      ))
      .orderBy(desc(races.qualityScore), asc(races.date))
      .limit(limit);
  }

  async getTrendingRaces(limit: number = 12): Promise<Race[]> {
    const today = new Date().toISOString().split("T")[0];
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 30);
    const futureDate = twoWeeks.toISOString().split("T")[0];
    return db.select().from(races)
      .where(and(
        eq(races.isActive, true),
        sql`${races.date} >= ${today}`,
        sql`${races.date} <= ${futureDate}`
      ))
      .orderBy(desc(races.qualityScore), asc(races.date))
      .limit(limit);
  }
  async getInfluencers(filters?: { limit?: number }): Promise<Influencer[]> {
    return db.select().from(influencers)
      .where(eq(influencers.isActive, true))
      .orderBy(influencers.name)
      .limit(filters?.limit || 100);
  }

  async getInfluencerBySlug(slug: string): Promise<Influencer | undefined> {
    const [influencer] = await db.select().from(influencers)
      .where(and(eq(influencers.slug, slug), eq(influencers.isActive, true)));
    return influencer;
  }

  async seedInfluencers(data: InsertInfluencer[]): Promise<void> {
    for (const i of data) {
      await db.insert(influencers).values(i).onConflictDoNothing();
    }
  }

  async getPodcasts(filters?: { category?: string; limit?: number }): Promise<Podcast[]> {
    const conditions = [];
    conditions.push(eq(podcasts.isActive, true));
    if (filters?.category) conditions.push(eq(podcasts.category, filters.category));

    return db.select().from(podcasts)
      .where(and(...conditions))
      .orderBy(podcasts.name)
      .limit(filters?.limit || 100);
  }

  async getPodcastBySlug(slug: string): Promise<Podcast | undefined> {
    const [podcast] = await db.select().from(podcasts)
      .where(and(eq(podcasts.slug, slug), eq(podcasts.isActive, true)));
    return podcast;
  }

  async seedPodcasts(data: InsertPodcast[]): Promise<void> {
    for (const p of data) {
      await db.insert(podcasts).values(p).onConflictDoNothing();
    }
  }

  async getBooks(filters?: { category?: string; limit?: number }): Promise<Book[]> {
    const conditions = [];
    conditions.push(eq(books.isActive, true));
    if (filters?.category) conditions.push(eq(books.category, filters.category));

    return db.select().from(books)
      .where(and(...conditions))
      .orderBy(books.title)
      .limit(filters?.limit || 100);
  }

  async getBookBySlug(slug: string): Promise<Book | undefined> {
    const [book] = await db.select().from(books)
      .where(and(eq(books.slug, slug), eq(books.isActive, true)));
    return book;
  }

  async seedBooks(data: InsertBook[]): Promise<void> {
    for (const b of data) {
      await db.insert(books).values(b).onConflictDoNothing();
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(email: string, name?: string): Promise<User> {
    const [user] = await db.insert(users).values({
      email: email.toLowerCase(),
      name: name || null,
    }).returning();
    return user;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  async updateUserName(id: number, name: string): Promise<void> {
    await db.update(users).set({ name }).where(eq(users.id, id));
  }

  async createMagicLinkToken(email: string, token: string, expiresAt: Date): Promise<MagicLinkToken> {
    const [record] = await db.insert(magicLinkTokens).values({
      email: email.toLowerCase(),
      token,
      expiresAt,
    }).returning();
    return record;
  }

  async getMagicLinkToken(token: string): Promise<MagicLinkToken | undefined> {
    const [record] = await db.select().from(magicLinkTokens).where(eq(magicLinkTokens.token, token));
    return record;
  }

  async markTokenUsed(id: number): Promise<void> {
    await db.update(magicLinkTokens).set({ usedAt: new Date() }).where(eq(magicLinkTokens.id, id));
  }

  async cleanExpiredTokens(): Promise<void> {
    await db.delete(magicLinkTokens).where(sql`${magicLinkTokens.expiresAt} < NOW()`);
  }

  async getRacesByIds(ids: number[]): Promise<Race[]> {
    if (ids.length === 0) return [];
    return db.select().from(races).where(inArray(races.id, ids));
  }

  async getRoutesByIds(ids: number[]): Promise<Route[]> {
    if (ids.length === 0) return [];
    return db.select().from(routes).where(inArray(routes.id, ids));
  }

  async getUserFavorites(userId: number): Promise<Favorite[]> {
    return db.select().from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  }

  async addFavorite(userId: number, itemType: string, itemId: number): Promise<Favorite> {
    const [fav] = await db.insert(favorites).values({ userId, itemType, itemId })
      .onConflictDoNothing()
      .returning();
    if (!fav) {
      const [existing] = await db.select().from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.itemType, itemType), eq(favorites.itemId, itemId)));
      return existing;
    }
    return fav;
  }

  async removeFavorite(userId: number, itemType: string, itemId: number): Promise<void> {
    await db.delete(favorites).where(
      and(eq(favorites.userId, userId), eq(favorites.itemType, itemType), eq(favorites.itemId, itemId))
    );
  }

  async isFavorited(userId: number, itemType: string, itemId: number): Promise<boolean> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.itemType, itemType), eq(favorites.itemId, itemId)));
    return Number(result.count) > 0;
  }

  async getUserFavoritesByType(userId: number, itemType: string): Promise<Favorite[]> {
    return db.select().from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.itemType, itemType)))
      .orderBy(desc(favorites.createdAt));
  }

  async search(query: string, limit: number = 5): Promise<SearchResult> {
    const pattern = `%${query}%`;

    const [raceResults, cityResults, organizerResults] = await Promise.all([
      db.select({
        id: races.id, name: races.name, slug: races.slug, city: races.city, state: races.state, distance: races.distance, date: races.date
      }).from(races)
        .where(and(eq(races.isActive, true), sql`(${races.name} ILIKE ${pattern} OR ${races.city} ILIKE ${pattern})`))
        .orderBy(desc(races.qualityScore))
        .limit(limit),

      db.select({
        id: cities.id, name: cities.name, slug: cities.slug,
        stateSlug: states.slug, stateName: states.name
      }).from(cities)
        .innerJoin(states, eq(cities.stateId, states.id))
        .where(sql`${cities.name} ILIKE ${pattern}`)
        .orderBy(desc(cities.population))
        .limit(limit),

      db.select({
        id: organizers.id, name: organizers.name, slug: organizers.slug, state: organizers.state, raceCount: organizers.raceCount
      }).from(organizers)
        .where(sql`${organizers.name} ILIKE ${pattern}`)
        .orderBy(desc(organizers.raceCount))
        .limit(limit),
    ]);

    return {
      races: raceResults,
      cities: cityResults,
      organizers: organizerResults.map(o => ({ ...o, raceCount: o.raceCount ?? 0 })),
    };
  }

  async getReviews(itemType: string, itemId: number): Promise<(Review & { userName: string | null })[]> {
    const results = await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        itemType: reviews.itemType,
        itemId: reviews.itemId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        userName: users.name,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.itemType, itemType), eq(reviews.itemId, itemId)))
      .orderBy(desc(reviews.createdAt));
    return results;
  }

  async getReviewSummary(itemType: string, itemId: number): Promise<{ avgRating: number; count: number }> {
    const result = await db
      .select({
        avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(reviews)
      .where(and(eq(reviews.itemType, itemType), eq(reviews.itemId, itemId)));
    return { avgRating: Number(result[0]?.avgRating || 0), count: result[0]?.count || 0 };
  }

  async getUserReview(userId: number, itemType: string, itemId: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.itemType, itemType), eq(reviews.itemId, itemId)));
    return review;
  }

  async createReview(userId: number, itemType: string, itemId: number, rating: number, comment?: string): Promise<Review> {
    const [review] = await db.insert(reviews).values({ userId, itemType, itemId, rating, comment: comment || null }).returning();
    return review;
  }

  async updateReview(id: number, userId: number, rating: number, comment?: string): Promise<Review> {
    const [review] = await db.update(reviews)
      .set({ rating, comment: comment || null, updatedAt: new Date() })
      .where(and(eq(reviews.id, id), eq(reviews.userId, userId)))
      .returning();
    return review;
  }

  async deleteReview(id: number, userId: number): Promise<void> {
    await db.delete(reviews).where(and(eq(reviews.id, id), eq(reviews.userId, userId)));
  }

  async getRacesAdvanced(filters: RaceSearchFilters): Promise<Race[]> {
    const conditions = [eq(races.isActive, true)];

    if (filters.q && filters.q.trim()) {
      // Free-text search across race name, city, and state. Matches the
      // client-facing search box on /races. Server-side so paginated results
      // don't get filtered down to whatever happened to be in the first page.
      const pattern = `%${filters.q.trim()}%`;
      conditions.push(sql`(
        ${races.name} ILIKE ${pattern}
        OR ${races.city} ILIKE ${pattern}
        OR ${races.state} ILIKE ${pattern}
      )`);
    }
    if (filters.state) conditions.push(eq(races.state, filters.state));
    if (filters.city) conditions.push(eq(races.city, filters.city));
    if (filters.cityId) conditions.push(eq(races.cityId, filters.cityId));
    if (filters.distance) conditions.push(eq(races.distance, filters.distance));
    if (filters.distances && filters.distances.length > 0) conditions.push(inArray(races.distance, filters.distances));
    if (filters.surface) conditions.push(eq(races.surface, filters.surface));
    if (filters.terrain) conditions.push(eq(races.terrain, filters.terrain));

    if (filters.year) conditions.push(sql`EXTRACT(YEAR FROM ${races.date}::date) = ${filters.year}`);
    if (filters.month) conditions.push(sql`EXTRACT(MONTH FROM ${races.date}::date) = ${filters.month}`);
    if (filters.dateFrom) conditions.push(sql`${races.date} >= ${filters.dateFrom}`);
    if (filters.dateTo) conditions.push(sql`${races.date} <= ${filters.dateTo}`);
    if (!filters.year && !filters.month && !filters.dateFrom) {
      conditions.push(sql`${races.date} >= CURRENT_DATE::text`);
    }

    if (filters.priceMin != null) conditions.push(sql`COALESCE(${races.priceMin}, ${races.priceMax}, 0) >= ${filters.priceMin}`);
    if (filters.priceMax != null) conditions.push(sql`COALESCE(${races.priceMax}, ${races.priceMin}, 0) <= ${filters.priceMax}`);

    if (filters.minBeginnerScore != null) conditions.push(sql`COALESCE(${races.beginnerScore}, 0) >= ${filters.minBeginnerScore}`);
    if (filters.minPrScore != null) conditions.push(sql`COALESCE(${races.prScore}, 0) >= ${filters.minPrScore}`);
    if (filters.minValueScore != null) conditions.push(sql`COALESCE(${races.valueScore}, 0) >= ${filters.minValueScore}`);
    if (filters.minVibeScore != null) conditions.push(sql`COALESCE(${races.vibeScore}, 0) >= ${filters.minVibeScore}`);
    if (filters.minFamilyScore != null) conditions.push(sql`COALESCE(${races.familyScore}, 0) >= ${filters.minFamilyScore}`);

    if (filters.walkerFriendly) conditions.push(eq(races.walkerFriendly, true));
    if (filters.strollerFriendly) conditions.push(eq(races.strollerFriendly, true));
    if (filters.dogFriendly) conditions.push(eq(races.dogFriendly, true));
    if (filters.kidsRace) conditions.push(eq(races.kidsRace, true));
    if (filters.charity) conditions.push(eq(races.charity, true));
    if (filters.bostonQualifier) conditions.push(eq(races.bostonQualifier, true));
    if (filters.isTurkeyTrot) conditions.push(eq(races.isTurkeyTrot, true));
    if (filters.isFeatured) conditions.push(eq(races.isFeatured, true));
    if (filters.transitFriendly) conditions.push(eq(races.transitFriendly, true));
    if (filters.vibeTag) conditions.push(sql`${filters.vibeTag} = ANY(${races.vibeTags})`);
    if (filters.registrationOpen) conditions.push(or(eq(races.registrationOpen, true), sql`${races.registrationOpen} IS NULL`)!);
    if (filters.priceIncreaseSoon) {
      conditions.push(sql`${races.nextPriceIncreaseAt} IS NOT NULL AND ${races.nextPriceIncreaseAt}::date <= (CURRENT_DATE + INTERVAL '14 days')::date`);
    }
    if (filters.organizerId) conditions.push(eq(races.organizerId, filters.organizerId));
    if (filters.seriesId) conditions.push(eq(races.seriesId, filters.seriesId));

    if (filters.near) {
      const { lat, lng, radiusMiles } = filters.near;
      const cosLat = Math.cos(lat * Math.PI / 180);
      // Most rows in the current dataset have NULL lat/lng (the seed never
      // geocoded them). If we required coords, the radius filter would wipe
      // out every result whenever it's combined with state — a common case in
      // Race Shopper. Treat missing coords as "unknown but plausible" instead
      // of "excluded": the caller's other filters (state, distance, etc.)
      // already scope the set, and radius becomes a best-effort narrow on the
      // rows that *do* have coords.
      conditions.push(sql`(
        (${races.lat} IS NULL OR ${races.lng} IS NULL)
        OR
        (SQRT(POWER((${races.lat} - ${lat}), 2) + POWER((${cosLat} * (${races.lng} - ${lng})), 2)) * 69.0 <= ${radiusMiles})
      )`);
    }

    let orderBy;
    switch (filters.sort) {
      case "price": orderBy = [asc(sql`COALESCE(${races.priceMin}, ${races.priceMax}, 999999)`), asc(races.date)]; break;
      case "beginner": orderBy = [desc(sql`COALESCE(${races.beginnerScore}, 0)`), asc(races.date)]; break;
      case "pr": orderBy = [desc(sql`COALESCE(${races.prScore}, 0)`), asc(races.date)]; break;
      case "value": orderBy = [desc(sql`COALESCE(${races.valueScore}, 0)`), asc(races.date)]; break;
      case "vibe": orderBy = [desc(sql`COALESCE(${races.vibeScore}, 0)`), asc(races.date)]; break;
      case "family": orderBy = [desc(sql`COALESCE(${races.familyScore}, 0)`), asc(races.date)]; break;
      case "urgency": orderBy = [desc(sql`COALESCE(${races.urgencyScore}, 0)`), asc(races.date)]; break;
      case "quality": orderBy = [desc(races.qualityScore), asc(races.date)]; break;
      default: orderBy = [asc(races.date)];
    }

    return db.select().from(races)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(filters.limit ?? 100)
      .offset(filters.offset ?? 0);
  }

  async getRaceWithScores(slug: string): Promise<Race | undefined> {
    const [race] = await db.select().from(races).where(eq(races.slug, slug));
    return race;
  }

  async getSimilarRaces(slug: string, limit: number = 6): Promise<Race[]> {
    const [race] = await db.select().from(races).where(eq(races.slug, slug));
    if (!race) return [];

    const today = new Date().toISOString().split("T")[0];
    return db.select().from(races)
      .where(and(
        eq(races.isActive, true),
        sql`${races.id} != ${race.id}`,
        sql`${races.date} >= ${today}`,
        or(
          eq(races.distance, race.distance),
          eq(races.state, race.state),
        )!,
      ))
      .orderBy(desc(races.qualityScore), asc(races.date))
      .limit(limit);
  }

  async getRacesThisWeekend(state?: string): Promise<Race[]> {
    const now = new Date();
    const day = now.getDay();
    let start = new Date(now);
    let end: Date;
    if (day === 5 || day === 6 || day === 0) {
      end = new Date(now);
      end.setDate(now.getDate() + (day === 5 ? 2 : day === 6 ? 1 : 0));
    } else {
      start = new Date(now);
      start.setDate(now.getDate() + ((5 - day + 7) % 7));
      end = new Date(start);
      end.setDate(start.getDate() + 2);
    }
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    const conditions = [
      eq(races.isActive, true),
      sql`${races.date} >= ${startStr}`,
      sql`${races.date} <= ${endStr}`,
    ];
    if (state) conditions.push(eq(races.state, state));

    return db.select().from(races)
      .where(and(...conditions))
      .orderBy(asc(races.date), desc(races.qualityScore))
      .limit(60);
  }

  async getPriceIncreasingSoon(days: number = 14, limit: number = 30): Promise<Race[]> {
    const safeDays = Number.isFinite(days) && days > 0 ? Math.min(Math.floor(days), 365) : 14;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 200) : 30;
    return db.select().from(races)
      .where(and(
        eq(races.isActive, true),
        isNotNull(races.nextPriceIncreaseAt),
        sql`${races.nextPriceIncreaseAt}::date <= (CURRENT_DATE + INTERVAL '1 day' * ${safeDays})::date`,
        sql`${races.nextPriceIncreaseAt}::date >= CURRENT_DATE`,
      ))
      .orderBy(asc(races.nextPriceIncreaseAt))
      .limit(safeLimit);
  }

  async updateRaceScores(raceId: number, scores: { beginnerScore: number; prScore: number; valueScore: number; vibeScore: number; familyScore: number; urgencyScore: number; scoreBreakdown: Record<string, unknown> }): Promise<void> {
    await db.update(races).set({
      beginnerScore: scores.beginnerScore,
      prScore: scores.prScore,
      valueScore: scores.valueScore,
      vibeScore: scores.vibeScore,
      familyScore: scores.familyScore,
      urgencyScore: scores.urgencyScore,
      scoreBreakdown: scores.scoreBreakdown,
      scoresUpdatedAt: new Date(),
    }).where(eq(races.id, raceId));
  }

  async getOrganizers(filters?: { state?: string; isVerified?: boolean; limit?: number }): Promise<Organizer[]> {
    const conditions = [];
    if (filters?.state) conditions.push(eq(organizers.state, filters.state));
    if (filters?.isVerified != null) conditions.push(eq(organizers.isVerified, filters.isVerified));

    const q = db.select().from(organizers);
    if (conditions.length > 0) {
      return q.where(and(...conditions)).orderBy(desc(organizers.raceCount), organizers.name).limit(filters?.limit || 100);
    }
    return q.orderBy(desc(organizers.raceCount), organizers.name).limit(filters?.limit || 100);
  }

  async getOrganizerBySlug(slug: string): Promise<Organizer | undefined> {
    const [org] = await db.select().from(organizers).where(eq(organizers.slug, slug));
    return org;
  }

  async getOrganizerByEmail(email: string): Promise<Organizer | undefined> {
    const [org] = await db.select().from(organizers).where(eq(organizers.email, email.toLowerCase()));
    return org;
  }

  async createOrganizer(data: InsertOrganizer): Promise<Organizer> {
    const [org] = await db.insert(organizers).values(data).returning();
    return org;
  }

  async updateOrganizer(id: number, data: Partial<InsertOrganizer>): Promise<Organizer | undefined> {
    const [org] = await db.update(organizers).set(data).where(eq(organizers.id, id)).returning();
    return org;
  }

  async getRacesByOrganizer(organizerId: number): Promise<Race[]> {
    return db.select().from(races)
      .where(and(eq(races.organizerId, organizerId), eq(races.isActive, true)))
      .orderBy(asc(races.date));
  }

  async getRaceSeries(filters?: { limit?: number }): Promise<RaceSeries[]> {
    return db.select().from(raceSeries)
      .orderBy(desc(raceSeries.raceCount), raceSeries.name)
      .limit(filters?.limit ?? 100);
  }

  async getRaceSeriesBySlug(slug: string): Promise<RaceSeries | undefined> {
    const [s] = await db.select().from(raceSeries).where(eq(raceSeries.slug, slug));
    return s;
  }

  async getRacesBySeries(seriesId: number): Promise<Race[]> {
    return db.select().from(races)
      .where(and(eq(races.seriesId, seriesId), eq(races.isActive, true)))
      .orderBy(asc(races.date));
  }

  async getCityByMetroSlug(metroSlug: string): Promise<(City & { state: State }) | undefined> {
    const trimmed = metroSlug.trim().toLowerCase();
    if (!trimmed.includes("-")) return undefined;
    const idx = trimmed.lastIndexOf("-");
    const citySlug = trimmed.slice(0, idx);
    const stateAbbr = trimmed.slice(idx + 1);
    if (!citySlug || stateAbbr.length !== 2) return undefined;
    const [row] = await db
      .select({ city: cities, state: states })
      .from(cities)
      .innerJoin(states, eq(cities.stateId, states.id))
      .where(and(eq(cities.slug, citySlug), sql`LOWER(${states.abbreviation}) = ${stateAbbr}`))
      .limit(1);
    if (!row) return undefined;
    return { ...row.city, state: row.state };
  }

  async getMetrosWithRaceCount(minRaces: number = 5, limit: number = 200): Promise<{ city: City; state: State; raceCount: number }[]> {
    const rows = await db
      .select({
        city: cities,
        state: states,
        raceCount: sql<number>`COUNT(${races.id})::int`.as("race_count"),
      })
      .from(races)
      .innerJoin(cities, eq(races.cityId, cities.id))
      .innerJoin(states, eq(cities.stateId, states.id))
      .where(and(eq(races.isActive, true), sql`${races.date} >= CURRENT_DATE::text`))
      .groupBy(cities.id, states.id)
      .having(sql`COUNT(${races.id}) >= ${minRaces}`)
      .orderBy(sql`COUNT(${races.id}) DESC`, cities.name)
      .limit(limit);
    return rows.map(r => ({ city: r.city, state: r.state, raceCount: Number(r.raceCount) }));
  }

  async createRaceClaim(data: InsertRaceClaim): Promise<RaceClaim> {
    const [claim] = await db.insert(raceClaims).values(data).returning();
    return claim;
  }

  async getRaceClaimByToken(token: string): Promise<RaceClaim | undefined> {
    const [claim] = await db.select().from(raceClaims).where(eq(raceClaims.verificationToken, token));
    return claim;
  }

  async getRaceClaimsByRace(raceId: number): Promise<RaceClaim[]> {
    return db.select().from(raceClaims).where(eq(raceClaims.raceId, raceId)).orderBy(desc(raceClaims.createdAt));
  }

  async getRaceClaimsByStatus(status: string, limit: number = 100): Promise<RaceClaim[]> {
    return db.select().from(raceClaims).where(eq(raceClaims.status, status)).orderBy(desc(raceClaims.createdAt)).limit(limit);
  }

  async approveRaceClaim(id: number, organizerId: number, reviewerNote?: string): Promise<void> {
    const [claim] = await db.select().from(raceClaims).where(eq(raceClaims.id, id));
    if (!claim) return;
    await db.update(raceClaims).set({
      status: "approved",
      organizerId,
      reviewerNote: reviewerNote ?? null,
      reviewedAt: new Date(),
    }).where(eq(raceClaims.id, id));
    await db.update(races).set({ organizerId, isClaimed: true }).where(eq(races.id, claim.raceId));
  }

  async rejectRaceClaim(id: number, reviewerNote?: string): Promise<void> {
    await db.update(raceClaims).set({
      status: "rejected",
      reviewerNote: reviewerNote ?? null,
      reviewedAt: new Date(),
    }).where(eq(raceClaims.id, id));
  }

  async verifyRaceClaim(id: number): Promise<void> {
    await db.update(raceClaims).set({ verifiedAt: new Date() }).where(eq(raceClaims.id, id));
  }

  async getSavedSearches(userId: number): Promise<SavedSearch[]> {
    return db.select().from(savedSearches).where(eq(savedSearches.userId, userId)).orderBy(desc(savedSearches.createdAt));
  }

  async createSavedSearch(data: InsertSavedSearch): Promise<SavedSearch> {
    const [s] = await db.insert(savedSearches).values(data).returning();
    return s;
  }

  async deleteSavedSearch(id: number, userId: number): Promise<void> {
    await db.delete(savedSearches).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)));
  }

  async toggleSavedSearchAlert(id: number, userId: number, enabled: boolean): Promise<void> {
    await db.update(savedSearches).set({ alertEnabled: enabled }).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)));
  }

  async getRaceAlerts(userId: number): Promise<RaceAlert[]> {
    return db.select().from(raceAlerts).where(eq(raceAlerts.userId, userId)).orderBy(desc(raceAlerts.createdAt));
  }

  async getRaceAlertsWithRace(userId: number): Promise<(RaceAlert & { raceSlug: string | null; raceName: string | null })[]> {
    const rows = await db.select({
      id: raceAlerts.id,
      userId: raceAlerts.userId,
      raceId: raceAlerts.raceId,
      alertType: raceAlerts.alertType,
      lastNotifiedAt: raceAlerts.lastNotifiedAt,
      createdAt: raceAlerts.createdAt,
      raceSlug: races.slug,
      raceName: races.name,
    })
      .from(raceAlerts)
      .leftJoin(races, eq(races.id, raceAlerts.raceId))
      .where(eq(raceAlerts.userId, userId))
      .orderBy(desc(raceAlerts.createdAt));
    return rows as (RaceAlert & { raceSlug: string | null; raceName: string | null })[];
  }

  async createRaceAlert(data: InsertRaceAlert): Promise<RaceAlert> {
    const [a] = await db.insert(raceAlerts).values(data).onConflictDoNothing().returning();
    if (!a) {
      const [existing] = await db.select().from(raceAlerts).where(and(
        eq(raceAlerts.userId, data.userId),
        eq(raceAlerts.raceId, data.raceId),
        eq(raceAlerts.alertType, data.alertType),
      ));
      return existing;
    }
    return a;
  }

  async deleteRaceAlert(id: number, userId: number): Promise<void> {
    await db.delete(raceAlerts).where(and(eq(raceAlerts.id, id), eq(raceAlerts.userId, userId)));
  }

  async updateRaceAlertType(id: number, userId: number, alertType: string): Promise<RaceAlert | undefined> {
    const [a] = await db.update(raceAlerts)
      .set({ alertType })
      .where(and(eq(raceAlerts.id, id), eq(raceAlerts.userId, userId)))
      .returning();
    return a;
  }

  async recordOutboundClick(data: InsertOutboundClick): Promise<OutboundClick> {
    const [c] = await db.insert(outboundClicks).values(data).returning();
    return c;
  }

  async getOutboundClickStats(raceId: number, sinceDays: number = 30): Promise<{ total: number; byDestination: Record<string, number> }> {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);
    const rows = await db.select({
      destination: outboundClicks.destination,
      count: sql<number>`COUNT(*)::int`,
    }).from(outboundClicks)
      .where(and(eq(outboundClicks.raceId, raceId), sql`${outboundClicks.createdAt} >= ${since}`))
      .groupBy(outboundClicks.destination);

    const byDestination: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      byDestination[r.destination] = Number(r.count);
      total += Number(r.count);
    }
    return { total, byDestination };
  }

  // ───────── Alert dispatch + preferences ─────────
  async getUserAlertPrefs(userId: number): Promise<{ unsubscribedAll: boolean; unsubscribedAlertTypes: string[] } | undefined> {
    const [u] = await db.select({
      unsubscribedAll: users.unsubscribedAll,
      unsubscribedAlertTypes: users.unsubscribedAlertTypes,
    }).from(users).where(eq(users.id, userId));
    return u;
  }

  async updateUserAlertPrefs(userId: number, prefs: { unsubscribedAll?: boolean; unsubscribedAlertTypes?: string[] }): Promise<void> {
    const update: Record<string, unknown> = {};
    if (typeof prefs.unsubscribedAll === "boolean") update.unsubscribedAll = prefs.unsubscribedAll;
    if (Array.isArray(prefs.unsubscribedAlertTypes)) update.unsubscribedAlertTypes = prefs.unsubscribedAlertTypes;
    if (Object.keys(update).length === 0) return;
    await db.update(users).set(update).where(eq(users.id, userId));
  }

  async findDispatchByKey(key: string): Promise<AlertDispatch | undefined> {
    const [d] = await db.select().from(alertDispatches).where(eq(alertDispatches.dispatchKey, key));
    return d;
  }

  async findDispatchByToken(token: string): Promise<AlertDispatch | undefined> {
    const [d] = await db.select().from(alertDispatches).where(eq(alertDispatches.unsubToken, token));
    return d;
  }

  async findDispatchByTrackToken(token: string): Promise<AlertDispatch | undefined> {
    const [d] = await db.select().from(alertDispatches).where(eq(alertDispatches.trackToken, token));
    return d;
  }

  async recordAlertDispatch(data: InsertAlertDispatch): Promise<AlertDispatch | undefined> {
    const [d] = await db.insert(alertDispatches).values(data).onConflictDoNothing({ target: alertDispatches.dispatchKey }).returning();
    return d;
  }

  async deleteAlertDispatch(id: number): Promise<void> {
    await db.delete(alertDispatches).where(eq(alertDispatches.id, id));
  }

  async markAlertOpened(trackToken: string): Promise<void> {
    await db.update(alertDispatches)
      .set({ openedAt: new Date() })
      .where(and(eq(alertDispatches.trackToken, trackToken), sql`${alertDispatches.openedAt} IS NULL`));
  }

  async markAlertClicked(trackToken: string): Promise<void> {
    await db.update(alertDispatches)
      .set({ clickedAt: new Date() })
      .where(and(eq(alertDispatches.trackToken, trackToken), sql`${alertDispatches.clickedAt} IS NULL`));
  }

  async unsubscribeUserFromTokenAlertType(token: string): Promise<{ userId: number; alertType: string } | undefined> {
    const dispatch = await this.findDispatchByToken(token);
    if (!dispatch) return undefined;
    const prefs = await this.getUserAlertPrefs(dispatch.userId);
    const current = prefs?.unsubscribedAlertTypes ?? [];
    if (!current.includes(dispatch.alertType)) {
      await this.updateUserAlertPrefs(dispatch.userId, {
        unsubscribedAlertTypes: [...current, dispatch.alertType],
      });
    }
    return { userId: dispatch.userId, alertType: dispatch.alertType };
  }

  async getActiveSavedSearches(): Promise<(SavedSearch & { userEmail: string; userId: number; unsubscribedAll: boolean; unsubscribedAlertTypes: string[] })[]> {
    const rows = await db.select({
      id: savedSearches.id,
      userId: savedSearches.userId,
      name: savedSearches.name,
      queryJson: savedSearches.queryJson,
      alertEnabled: savedSearches.alertEnabled,
      lastNotifiedAt: savedSearches.lastNotifiedAt,
      createdAt: savedSearches.createdAt,
      userEmail: users.email,
      unsubscribedAll: users.unsubscribedAll,
      unsubscribedAlertTypes: users.unsubscribedAlertTypes,
    }).from(savedSearches)
      .innerJoin(users, eq(users.id, savedSearches.userId))
      .where(eq(savedSearches.alertEnabled, true));
    return rows as (SavedSearch & { userEmail: string; userId: number; unsubscribedAll: boolean; unsubscribedAlertTypes: string[] })[];
  }

  async getActiveRaceAlertsWithRace(): Promise<{ alert: RaceAlert; race: Race; userEmail: string; unsubscribedAll: boolean; unsubscribedAlertTypes: string[] }[]> {
    const rows = await db.select({
      alert: raceAlerts,
      race: races,
      userEmail: users.email,
      unsubscribedAll: users.unsubscribedAll,
      unsubscribedAlertTypes: users.unsubscribedAlertTypes,
    }).from(raceAlerts)
      .innerJoin(users, eq(users.id, raceAlerts.userId))
      .innerJoin(races, eq(races.id, raceAlerts.raceId))
      .where(eq(races.isActive, true));
    return rows;
  }

  async getFavoritedRacesForReminders(daysOut: number): Promise<{ userId: number; userEmail: string; race: Race; favoriteId: number; unsubscribedAll: boolean; unsubscribedAlertTypes: string[] }[]> {
    const rows = await db.select({
      favoriteId: favorites.id,
      userId: favorites.userId,
      userEmail: users.email,
      race: races,
      unsubscribedAll: users.unsubscribedAll,
      unsubscribedAlertTypes: users.unsubscribedAlertTypes,
    }).from(favorites)
      .innerJoin(users, eq(users.id, favorites.userId))
      .innerJoin(races, eq(races.id, favorites.itemId))
      .where(and(
        eq(favorites.itemType, "race"),
        eq(races.isActive, true),
        sql`${races.date}::date >= CURRENT_DATE`,
        sql`${races.date}::date <= (CURRENT_DATE + INTERVAL '1 day' * ${daysOut})::date`,
      ));
    return rows;
  }

  async updateRaceAlertNotified(id: number): Promise<void> {
    await db.update(raceAlerts).set({ lastNotifiedAt: new Date() }).where(eq(raceAlerts.id, id));
  }

  async updateSavedSearchNotified(id: number): Promise<void> {
    await db.update(savedSearches).set({ lastNotifiedAt: new Date() }).where(eq(savedSearches.id, id));
  }

  async getDispatchStats(sinceDays: number = 30): Promise<{ alertType: string; sent: number; opened: number; clicked: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);
    const rows = await db.select({
      alertType: alertDispatches.alertType,
      sent: sql<number>`COUNT(*)::int`,
      opened: sql<number>`COUNT(${alertDispatches.openedAt})::int`,
      clicked: sql<number>`COUNT(${alertDispatches.clickedAt})::int`,
    }).from(alertDispatches)
      .where(sql`${alertDispatches.dispatchedAt} >= ${since}`)
      .groupBy(alertDispatches.alertType);
    return rows;
  }

  // ───────── Organizer linkage + claim verify ─────────

  async setUserOrganizer(userId: number, organizerId: number): Promise<void> {
    await db.update(users).set({ isOrganizer: true, organizerId }).where(eq(users.id, userId));
  }

  async getOrganizerForUser(userId: number): Promise<Organizer | undefined> {
    const [row] = await db.select({ org: organizers })
      .from(users)
      .innerJoin(organizers, eq(organizers.id, users.organizerId))
      .where(eq(users.id, userId));
    return row?.org;
  }

  async getRaceClaimWithRace(token: string): Promise<{ claim: RaceClaim; race: Race } | undefined> {
    const [row] = await db.select({ claim: raceClaims, race: races })
      .from(raceClaims)
      .innerJoin(races, eq(races.id, raceClaims.raceId))
      .where(eq(raceClaims.verificationToken, token));
    return row;
  }

  async completeClaimVerification(token: string): Promise<{ user: User; organizer: Organizer; race: Race } | { error: string; pendingReview?: boolean }> {
    const found = await this.getRaceClaimWithRace(token);
    // Tokens are one-time: rejected if not found OR already consumed (token cleared).
    if (!found || !found.claim.verificationToken) return { error: "This verification link is no longer valid. Please request a new one." };
    const { claim, race } = found;
    if (claim.status === "rejected") return { error: "This claim was rejected" };

    // 7-day expiry on the verification token (hard stop regardless of prior verification).
    const ageMs = Date.now() - new Date(claim.createdAt ?? Date.now()).getTime();
    if (ageMs > 7 * 24 * 60 * 60 * 1000) {
      return { error: "This verification link has expired" };
    }

    // SECURITY: if a race is already linked to a different organizer, do NOT auto-attach.
    // Mark the claim as pending admin review and notify a human; never silently grant access
    // to someone else's organizer account or someone else's race.
    if (race.organizerId) {
      const existingByEmail = await this.getOrganizerByEmail(claim.claimerEmail);
      const sameOrganizer = existingByEmail && existingByEmail.id === race.organizerId;
      if (!sameOrganizer) {
        await db.update(raceClaims).set({
          status: "pending",
          reviewerNote: "Race already claimed by another organizer — admin review required",
          // do NOT consume token here; admin can still see the claim
        }).where(eq(raceClaims.id, claim.id));
        return { error: "This race is already claimed. Our team will review your request and contact you within 2 business days.", pendingReview: true };
      }
    }

    let user = await this.getUserByEmail(claim.claimerEmail);
    if (!user) {
      user = await this.createUser(claim.claimerEmail, claim.claimerName ?? undefined);
    }

    let organizer: Organizer | undefined;
    if (claim.organizerId) {
      const [o] = await db.select().from(organizers).where(eq(organizers.id, claim.organizerId));
      organizer = o;
    }
    if (!organizer && race.organizerId) {
      const [o] = await db.select().from(organizers).where(eq(organizers.id, race.organizerId));
      organizer = o;
    }
    if (!organizer) {
      // Reuse an organizer this email already owns rather than creating duplicates.
      const existingByEmail = await this.getOrganizerByEmail(claim.claimerEmail);
      if (existingByEmail) organizer = existingByEmail;
    }
    if (!organizer) {
      const baseSlug = (claim.claimerName || race.name)
        .toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || `organizer-${Date.now()}`;
      let slug = baseSlug;
      let suffix = 1;
      while (true) {
        const existing = await this.getOrganizerBySlug(slug);
        if (!existing) break;
        slug = `${baseSlug}-${++suffix}`;
        if (suffix > 50) { slug = `${baseSlug}-${Date.now()}`; break; }
      }
      organizer = await this.createOrganizer({
        slug,
        name: claim.claimerName || race.name,
        email: claim.claimerEmail,
        contactName: claim.claimerName ?? null,
        city: race.city,
        state: race.state,
        isVerified: true,
        raceCount: 0,
      });
    } else if (!organizer.isVerified) {
      const [updated] = await db.update(organizers).set({ isVerified: true }).where(eq(organizers.id, organizer.id)).returning();
      if (updated) organizer = updated;
    }

    // Consume the token so it cannot be replayed.
    await db.update(raceClaims).set({
      status: "approved",
      organizerId: organizer.id,
      verifiedAt: claim.verifiedAt ?? new Date(),
      reviewedAt: new Date(),
      reviewerNote: claim.reviewerNote ?? "Self-verified via email",
      verificationToken: null,
    }).where(eq(raceClaims.id, claim.id));

    await db.update(races).set({
      organizerId: organizer.id,
      isClaimed: true,
    }).where(eq(races.id, race.id));

    await this.setUserOrganizer(user.id, organizer.id);
    await this.updateUserLastLogin(user.id);

    return { user, organizer, race };
  }

  // ───────── Organizer-side race editing + dashboard ─────────

  async getRacesEditableByUser(userId: number): Promise<Race[]> {
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    if (!u || !u.isOrganizer || !u.organizerId) return [];
    return db.select().from(races)
      .where(and(eq(races.organizerId, u.organizerId), eq(races.isActive, true)))
      .orderBy(asc(races.date));
  }

  async getRaceForOrganizerUser(raceId: number, userId: number): Promise<Race | undefined> {
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    if (!u || !u.isOrganizer || !u.organizerId) return undefined;
    const [r] = await db.select().from(races).where(and(eq(races.id, raceId), eq(races.organizerId, u.organizerId)));
    return r;
  }

  async updateRaceContent(raceId: number, organizerId: number, partial: Partial<Race>): Promise<Race | undefined> {
    const allowedKeys: (keyof Race)[] = [
      "registrationUrl", "website", "description", "startTime", "timeLimit",
      "priceMin", "priceMax", "registrationOpen", "registrationDeadline",
      "nextPriceIncreaseAt", "nextPriceIncreaseAmount",
      "courseMapUrl", "elevationProfileUrl", "courseType", "terrain", "elevationGainM", "fieldSize",
      "refundPolicy", "deferralPolicy", "packetPickup", "parkingNotes", "transitFriendly",
      "walkerFriendly", "strollerFriendly", "dogFriendly", "kidsRace",
      "charity", "charityPartner", "vibeTags",
      "couponCode", "couponDiscount", "couponExpiresAt", "photoUrls", "faq",
    ];
    const update: Record<string, unknown> = { lastVerifiedAt: new Date() };
    for (const k of allowedKeys) {
      if (k in partial) update[k as string] = (partial as Record<string, unknown>)[k as string];
    }
    if (Object.keys(update).length <= 1) return undefined;
    const [updated] = await db.update(races)
      .set(update)
      .where(and(eq(races.id, raceId), eq(races.organizerId, organizerId)))
      .returning();
    return updated;
  }

  // ───────── Race page-view tracking + analytics ─────────

  async incrementRacePageView(raceId: number): Promise<void> {
    const day = new Date().toISOString().slice(0, 10);
    await db.insert(racePageViews)
      .values({ raceId, day, count: 1 })
      .onConflictDoUpdate({
        target: [racePageViews.raceId, racePageViews.day],
        set: { count: sql`${racePageViews.count} + 1` },
      });
  }

  async getRaceAnalytics(raceId: number, sinceDays: number = 30): Promise<{
    totals: { views: number; saves: number; clicks: number };
    timeline: { day: string; views: number; clicks: number; saves: number }[];
    byDestination: { destination: string; count: number }[];
  }> {
    const safeDays = Math.max(1, Math.min(180, Math.floor(sinceDays)));
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - safeDays);
    const sinceDay = sinceDate.toISOString().slice(0, 10);

    const [viewsTotal, viewsRows, savesTotal, clicksTotal, clicksRows, destRows] = await Promise.all([
      db.select({ total: sql<number>`COALESCE(SUM(${racePageViews.count}), 0)::int` })
        .from(racePageViews)
        .where(and(eq(racePageViews.raceId, raceId), sql`${racePageViews.day} >= ${sinceDay}`)),
      db.select({ day: racePageViews.day, count: racePageViews.count })
        .from(racePageViews)
        .where(and(eq(racePageViews.raceId, raceId), sql`${racePageViews.day} >= ${sinceDay}`)),
      db.select({ total: sql<number>`COUNT(*)::int` })
        .from(favorites)
        .where(and(eq(favorites.itemType, "race"), eq(favorites.itemId, raceId), sql`${favorites.createdAt} >= ${sinceDate}`)),
      db.select({ total: sql<number>`COUNT(*)::int` })
        .from(outboundClicks)
        .where(and(eq(outboundClicks.raceId, raceId), sql`${outboundClicks.createdAt} >= ${sinceDate}`)),
      db.select({
        day: sql<string>`to_char(${outboundClicks.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`COUNT(*)::int`,
      }).from(outboundClicks)
        .where(and(eq(outboundClicks.raceId, raceId), sql`${outboundClicks.createdAt} >= ${sinceDate}`))
        .groupBy(sql`to_char(${outboundClicks.createdAt}, 'YYYY-MM-DD')`),
      db.select({ destination: outboundClicks.destination, count: sql<number>`COUNT(*)::int` })
        .from(outboundClicks)
        .where(and(eq(outboundClicks.raceId, raceId), sql`${outboundClicks.createdAt} >= ${sinceDate}`))
        .groupBy(outboundClicks.destination),
    ]);

    const savesRows = await db.select({
      day: sql<string>`to_char(${favorites.createdAt}, 'YYYY-MM-DD')`,
      count: sql<number>`COUNT(*)::int`,
    }).from(favorites)
      .where(and(eq(favorites.itemType, "race"), eq(favorites.itemId, raceId), sql`${favorites.createdAt} >= ${sinceDate}`))
      .groupBy(sql`to_char(${favorites.createdAt}, 'YYYY-MM-DD')`);

    const map = new Map<string, { day: string; views: number; clicks: number; saves: number }>();
    for (let i = 0; i < safeDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (safeDays - 1 - i));
      const key = d.toISOString().slice(0, 10);
      map.set(key, { day: key, views: 0, clicks: 0, saves: 0 });
    }
    for (const r of viewsRows) {
      const k = r.day;
      if (!map.has(k)) map.set(k, { day: k, views: 0, clicks: 0, saves: 0 });
      map.get(k)!.views = Number(r.count);
    }
    for (const r of clicksRows) {
      const k = r.day;
      if (!map.has(k)) map.set(k, { day: k, views: 0, clicks: 0, saves: 0 });
      map.get(k)!.clicks = Number(r.count);
    }
    for (const r of savesRows) {
      const k = r.day;
      if (!map.has(k)) map.set(k, { day: k, views: 0, clicks: 0, saves: 0 });
      map.get(k)!.saves = Number(r.count);
    }

    const byDestination = destRows
      .map((r) => ({ destination: r.destination, count: Number(r.count) }))
      .sort((a, b) => b.count - a.count);

    return {
      totals: {
        views: Number(viewsTotal[0]?.total ?? 0),
        saves: Number(savesTotal[0]?.total ?? 0),
        clicks: Number(clicksTotal[0]?.total ?? 0),
      },
      timeline: Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day)),
      byDestination,
    };
  }

  // ───────── Featured listing requests ─────────

  async createFeaturedRequest(data: InsertFeaturedRequest): Promise<FeaturedRequest> {
    const [row] = await db.insert(featuredRequests).values(data).returning();
    return row;
  }

  async getPendingFeaturedRequests(limit: number = 100): Promise<FeaturedRequest[]> {
    return db.select().from(featuredRequests)
      .where(eq(featuredRequests.status, "pending"))
      .orderBy(desc(featuredRequests.createdAt))
      .limit(limit);
  }

  async getFeaturedRequest(id: number): Promise<FeaturedRequest | undefined> {
    const [row] = await db.select().from(featuredRequests).where(eq(featuredRequests.id, id));
    return row;
  }

  async approveFeaturedRequest(id: number, durationDays: number, adminNote?: string): Promise<{ request: FeaturedRequest; race: Race } | undefined> {
    const req = await this.getFeaturedRequest(id);
    if (!req) return undefined;
    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + Math.max(1, Math.min(365, Math.floor(durationDays))));
    await db.update(featuredRequests).set({
      status: "approved",
      adminNote: adminNote ?? null,
      reviewedAt: new Date(),
    }).where(eq(featuredRequests.id, id));
    const [race] = await db.update(races).set({
      isFeatured: true,
      featuredUntil,
    }).where(eq(races.id, req.raceId)).returning();
    const [updated] = await db.select().from(featuredRequests).where(eq(featuredRequests.id, id));
    return updated && race ? { request: updated, race } : undefined;
  }

  async rejectFeaturedRequest(id: number, adminNote?: string): Promise<FeaturedRequest | undefined> {
    const [row] = await db.update(featuredRequests).set({
      status: "rejected",
      adminNote: adminNote ?? null,
      reviewedAt: new Date(),
    }).where(eq(featuredRequests.id, id)).returning();
    return row;
  }

  async getFeaturedRaces(filter?: { cityId?: number; distance?: string; isTurkeyTrot?: boolean; limit?: number }): Promise<Race[]> {
    const conditions = [
      eq(races.isActive, true),
      isNotNull(races.featuredUntil),
      sql`${races.featuredUntil} > NOW()`,
      sql`${races.date} >= CURRENT_DATE::text`,
    ];
    if (filter?.cityId) conditions.push(eq(races.cityId, filter.cityId));
    if (filter?.distance) conditions.push(eq(races.distance, filter.distance));
    if (filter?.isTurkeyTrot) conditions.push(eq(races.isTurkeyTrot, true));
    return db.select().from(races)
      .where(and(...conditions))
      .orderBy(asc(races.date))
      .limit(filter?.limit ?? 12);
  }

  // -----------------------------------------------------------------
  // Monetization: Pro tier
  // -----------------------------------------------------------------
  async setOrganizerProUntil(organizerId: number, proUntil: Date | null): Promise<void> {
    await db.update(organizers).set({ proUntil }).where(eq(organizers.id, organizerId));
  }

  async isOrganizerPro(organizerId: number): Promise<boolean> {
    const [row] = await db.select({ proUntil: organizers.proUntil }).from(organizers).where(eq(organizers.id, organizerId));
    return Boolean(row?.proUntil && row.proUntil.getTime() > Date.now());
  }

  async getRaceCompetitorBenchmark(race: Race, sinceDays: number): Promise<{
    sampleSize: number;
    yours: { views: number; saves: number; clicks: number };
    median: { views: number; saves: number; clicks: number };
    p75: { views: number; saves: number; clicks: number };
  }> {
    const safeDays = Math.max(1, Math.min(180, Math.floor(sinceDays)));
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - safeDays);
    const sinceDay = sinceDate.toISOString().slice(0, 10);

    // Same distance + state + active. Cap at 60 races for sane perf.
    const conditions = [eq(races.isActive, true), eq(races.distance, race.distance)];
    if (race.stateId) conditions.push(eq(races.stateId, race.stateId));
    const peers = await db.select({ id: races.id })
      .from(races)
      .where(and(...conditions))
      .limit(60);
    const allIds = Array.from(new Set([race.id, ...peers.map(p => p.id)]));
    if (allIds.length === 0) {
      return {
        sampleSize: 0,
        yours: { views: 0, saves: 0, clicks: 0 },
        median: { views: 0, saves: 0, clicks: 0 },
        p75: { views: 0, saves: 0, clicks: 0 },
      };
    }

    // Three aggregate queries grouped by raceId, instead of N×3.
    const [viewRows, saveRows, clickRows] = await Promise.all([
      db.select({
        raceId: racePageViews.raceId,
        total: sql<number>`COALESCE(SUM(${racePageViews.count}), 0)::int`,
      })
        .from(racePageViews)
        .where(and(inArray(racePageViews.raceId, allIds), sql`${racePageViews.day} >= ${sinceDay}`))
        .groupBy(racePageViews.raceId),
      db.select({
        raceId: favorites.itemId,
        total: sql<number>`COUNT(*)::int`,
      })
        .from(favorites)
        .where(and(
          eq(favorites.itemType, "race"),
          inArray(favorites.itemId, allIds),
          sql`${favorites.createdAt} >= ${sinceDate}`,
        ))
        .groupBy(favorites.itemId),
      db.select({
        raceId: outboundClicks.raceId,
        total: sql<number>`COUNT(*)::int`,
      })
        .from(outboundClicks)
        .where(and(
          inArray(outboundClicks.raceId, allIds),
          sql`${outboundClicks.createdAt} >= ${sinceDate}`,
        ))
        .groupBy(outboundClicks.raceId),
    ]);

    const viewsBy = new Map<number, number>();
    viewRows.forEach(r => viewsBy.set(Number(r.raceId), Number(r.total ?? 0)));
    const savesBy = new Map<number, number>();
    saveRows.forEach(r => savesBy.set(Number(r.raceId), Number(r.total ?? 0)));
    const clicksBy = new Map<number, number>();
    clickRows.forEach(r => {
      if (r.raceId == null) return;
      clicksBy.set(Number(r.raceId), Number(r.total ?? 0));
    });

    const statsForId = (id: number) => ({
      views: viewsBy.get(id) ?? 0,
      saves: savesBy.get(id) ?? 0,
      clicks: clicksBy.get(id) ?? 0,
    });

    const yours = statsForId(race.id);
    const peerStats = peers.map(p => p.id).filter(id => id !== race.id).map(statsForId);

    const pickPercentile = (arr: number[], pct: number): number => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(pct * (sorted.length - 1))));
      return sorted[idx];
    };

    const views = peerStats.map(p => p.views);
    const saves = peerStats.map(p => p.saves);
    const clicks = peerStats.map(p => p.clicks);

    return {
      sampleSize: peerStats.length,
      yours,
      median: { views: pickPercentile(views, 0.5), saves: pickPercentile(saves, 0.5), clicks: pickPercentile(clicks, 0.5) },
      p75: { views: pickPercentile(views, 0.75), saves: pickPercentile(saves, 0.75), clicks: pickPercentile(clicks, 0.75) },
    };
  }

  // -----------------------------------------------------------------
  // Monetization: API keys
  // -----------------------------------------------------------------
  private hashApiKey(plaintext: string): string {
    return createHash("sha256").update(plaintext).digest("hex");
  }

  async createApiKey(data: { userId: number; organizerId?: number | null; name: string; tier?: string; monthlyLimit?: number }): Promise<{ apiKey: ApiKey; plaintext: string }> {
    const tier = data.tier ?? "free";
    const monthlyLimit = data.monthlyLimit ?? (tier === "pro" ? 50000 : tier === "growth" ? 10000 : 1000);
    const plaintext = `rs_${randomBytes(24).toString("hex")}`;
    const keyHash = this.hashApiKey(plaintext);
    const keyPrefix = plaintext.slice(0, 7);
    const [apiKey] = await db.insert(apiKeys).values({
      userId: data.userId,
      organizerId: data.organizerId ?? null,
      name: data.name,
      keyHash,
      keyPrefix,
      tier,
      monthlyLimit,
      status: "active",
    } as InsertApiKey).returning();
    return { apiKey, plaintext };
  }

  async revokeApiKey(id: number, userId: number): Promise<void> {
    await db.update(apiKeys).set({ status: "revoked" }).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
  }

  async listApiKeysForUser(userId: number): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
  }

  async findApiKeyByPlaintext(plaintext: string): Promise<ApiKey | undefined> {
    if (!plaintext || !plaintext.startsWith("rs_")) return undefined;
    const keyHash = this.hashApiKey(plaintext);
    const [row] = await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.status, "active")));
    return row;
  }

  async recordApiKeyUsage(id: number): Promise<{ allowed: boolean; remaining: number }> {
    // Atomic monthly reset + increment via SQL CASE. Increment only happens when
    // the call is allowed (under limit, or window just rolled over). This keeps
    // monthly_usage from growing unbounded for clients that keep retrying past
    // the cap.
    const result = await db.execute(sql`
      UPDATE api_keys
      SET
        monthly_usage = CASE
          WHEN monthly_reset_at < NOW() - INTERVAL '30 days' THEN 1
          ELSE monthly_usage + 1
        END,
        monthly_reset_at = CASE
          WHEN monthly_reset_at < NOW() - INTERVAL '30 days' THEN NOW()
          ELSE monthly_reset_at
        END,
        last_used_at = NOW()
      WHERE id = ${id}
        AND (monthly_reset_at < NOW() - INTERVAL '30 days' OR monthly_usage < monthly_limit)
      RETURNING monthly_usage, monthly_limit
    `);
    const row = (result.rows as Array<{ monthly_usage: number | string; monthly_limit: number | string }>)[0];
    if (!row) {
      // Either the key was missing or the cap was already reached.
      const [keyRow] = await db.select({ monthlyLimit: apiKeys.monthlyLimit, monthlyUsage: apiKeys.monthlyUsage })
        .from(apiKeys).where(eq(apiKeys.id, id));
      if (!keyRow) return { allowed: false, remaining: 0 };
      return { allowed: false, remaining: Math.max(0, Number(keyRow.monthlyLimit) - Number(keyRow.monthlyUsage)) };
    }
    const usage = Number(row.monthly_usage);
    const limit = Number(row.monthly_limit);
    return { allowed: true, remaining: Math.max(0, limit - usage) };
  }

  // -----------------------------------------------------------------
  // Monetization: Sponsorships
  // -----------------------------------------------------------------
  async createSponsorship(data: InsertSponsorship): Promise<Sponsorship> {
    const [row] = await db.insert(sponsorships).values(data).returning();
    return row;
  }

  async updateSponsorship(id: number, data: Partial<InsertSponsorship>): Promise<Sponsorship | undefined> {
    const [row] = await db.update(sponsorships).set(data).where(eq(sponsorships.id, id)).returning();
    return row;
  }

  async deleteSponsorship(id: number): Promise<void> {
    await db.delete(sponsorships).where(eq(sponsorships.id, id));
  }

  async listSponsorships(): Promise<Sponsorship[]> {
    return db.select().from(sponsorships).orderBy(desc(sponsorships.createdAt));
  }

  async listSponsorshipsForPlacement(filter: { placement: string; cityId?: number; stateId?: number; distance?: string; isTurkeyTrot?: boolean; limit?: number }): Promise<Sponsorship[]> {
    const conditions = [
      eq(sponsorships.placement, filter.placement),
      eq(sponsorships.status, "active"),
      sql`${sponsorships.startDate} <= NOW()`,
      or(sql`${sponsorships.endDate} IS NULL`, sql`${sponsorships.endDate} >= NOW()`)!,
    ];
    if (filter.cityId !== undefined) {
      conditions.push(or(eq(sponsorships.cityId, filter.cityId), sql`${sponsorships.cityId} IS NULL`)!);
    }
    if (filter.stateId !== undefined) {
      conditions.push(or(eq(sponsorships.stateId, filter.stateId), sql`${sponsorships.stateId} IS NULL`)!);
    }
    if (filter.distance) {
      conditions.push(or(eq(sponsorships.distance, filter.distance), sql`${sponsorships.distance} IS NULL`)!);
    }
    if (filter.isTurkeyTrot !== undefined) {
      conditions.push(or(eq(sponsorships.isTurkeyTrot, filter.isTurkeyTrot), sql`${sponsorships.isTurkeyTrot} IS NULL`)!);
    }
    return db.select().from(sponsorships).where(and(...conditions)).orderBy(desc(sponsorships.createdAt)).limit(filter.limit ?? 3);
  }

  async incrementSponsorshipImpressions(ids: number[]): Promise<void> {
    if (!ids.length) return;
    await db.update(sponsorships).set({ impressions: sql`${sponsorships.impressions} + 1` }).where(inArray(sponsorships.id, ids));
  }

  async incrementSponsorshipClick(id: number): Promise<void> {
    await db.update(sponsorships).set({ clicks: sql`${sponsorships.clicks} + 1` }).where(eq(sponsorships.id, id));
  }

  // -----------------------------------------------------------------
  // Monetization: Market reports
  // -----------------------------------------------------------------
  async upsertMarketReport(data: InsertMarketReport): Promise<MarketReport> {
    const [row] = await db.insert(marketReports).values({ ...data, generatedAt: new Date() } as InsertMarketReport)
      .onConflictDoUpdate({
        target: [marketReports.metroSlug, marketReports.distance],
        set: {
          title: data.title,
          summary: data.summary ?? null,
          data: data.data,
          generatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async getMarketReport(metroSlug: string, distance: string): Promise<MarketReport | undefined> {
    const [row] = await db.select().from(marketReports).where(and(eq(marketReports.metroSlug, metroSlug), eq(marketReports.distance, distance)));
    return row;
  }

  async listGeneratedReports(limit: number = 100): Promise<MarketReport[]> {
    return db.select().from(marketReports).orderBy(desc(marketReports.generatedAt)).limit(limit);
  }

  async computeMarketReportData(metroSlug: string, distance: string): Promise<MarketReportData | undefined> {
    const metro = await this.getCityByMetroSlug(metroSlug);
    if (!metro) return undefined;
    const racesList = await this.getRacesAdvanced({
      state: metro.state.abbreviation,
      city: metro.name,
      distance,
      limit: 500,
    });
    if (!racesList.length) {
      return {
        raceCount: 0,
        avgPriceUsd: null,
        priceP25Usd: null,
        priceP50Usd: null,
        priceP75Usd: null,
        topMonths: [],
        topOrganizers: [],
        registrationOpenCount: 0,
        beginnerFriendlyCount: 0,
        prFriendlyCount: 0,
        avgBeginnerScore: null,
        avgPrScore: null,
        avgValueScore: null,
        trend: { yearOverYearPct: null, lastSeen: new Date().toISOString() },
      };
    }
    const prices = racesList.map(r => r.priceMin ?? r.priceMax).filter((p): p is number => p != null).sort((a, b) => a - b);
    const pct = (arr: number[], p: number): number | null => arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] : null;
    const monthCounts = new Map<number, number>();
    for (const r of racesList) {
      if (!r.date) continue;
      const m = new Date(r.date).getUTCMonth() + 1;
      monthCounts.set(m, (monthCounts.get(m) || 0) + 1);
    }
    const topMonths = Array.from(monthCounts.entries()).map(([month, count]) => ({ month, count })).sort((a, b) => b.count - a.count).slice(0, 6);
    const orgIds = Array.from(new Set(racesList.map(r => r.organizerId).filter((x): x is number => x != null)));
    const orgNames = new Map<number, string>();
    if (orgIds.length) {
      const orgsList = await db.select().from(organizers).where(inArray(organizers.id, orgIds));
      for (const o of orgsList) orgNames.set(o.id, o.name);
    }
    const orgCounts = new Map<number, number>();
    for (const r of racesList) {
      if (r.organizerId == null) continue;
      orgCounts.set(r.organizerId, (orgCounts.get(r.organizerId) || 0) + 1);
    }
    const topOrganizers = Array.from(orgCounts.entries())
      .map(([id, count]) => ({ name: orgNames.get(id) || `Organizer #${id}`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const avg = (arr: (number | null | undefined)[]) => {
      const xs = arr.filter((n): n is number => n != null);
      return xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null;
    };
    return {
      raceCount: racesList.length,
      avgPriceUsd: avg(racesList.map(r => r.priceMin ?? r.priceMax ?? null)),
      priceP25Usd: pct(prices, 0.25),
      priceP50Usd: pct(prices, 0.5),
      priceP75Usd: pct(prices, 0.75),
      topMonths,
      topOrganizers,
      registrationOpenCount: racesList.filter(r => r.registrationOpen !== false).length,
      beginnerFriendlyCount: racesList.filter(r => (r.beginnerScore ?? 0) >= 70).length,
      prFriendlyCount: racesList.filter(r => (r.prScore ?? 0) >= 70).length,
      avgBeginnerScore: avg(racesList.map(r => r.beginnerScore)),
      avgPrScore: avg(racesList.map(r => r.prScore)),
      avgValueScore: avg(racesList.map(r => r.valueScore)),
      trend: { yearOverYearPct: null, lastSeen: new Date().toISOString() },
    };
  }

  // -----------------------------------------------------------------
  // Monetization: Report access
  // -----------------------------------------------------------------
  async grantReportAccess(userId: number, scope: string, days: number): Promise<MarketReportAccess> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.max(1, Math.min(365, Math.floor(days))));
    const [row] = await db.insert(marketReportAccess).values({ userId, scope, expiresAt }).returning();
    return row;
  }

  async hasReportAccess(userId: number, scope: string): Promise<boolean> {
    const [row] = await db.select().from(marketReportAccess)
      .where(and(
        eq(marketReportAccess.userId, userId),
        or(eq(marketReportAccess.scope, scope), eq(marketReportAccess.scope, "all"))!,
        sql`${marketReportAccess.expiresAt} > NOW()`,
      ))
      .limit(1);
    return Boolean(row);
  }

  // -----------------------------------------------------------------
  // Monetization: Requests
  // -----------------------------------------------------------------
  async createMonetizationRequest(data: InsertMonetizationRequest): Promise<MonetizationRequest> {
    const [row] = await db.insert(monetizationRequests).values(data).returning();
    return row;
  }

  async listMonetizationRequests(filter?: { status?: string; kind?: string; limit?: number }): Promise<MonetizationRequest[]> {
    const conditions: ReturnType<typeof eq>[] = [];
    if (filter?.status) conditions.push(eq(monetizationRequests.status, filter.status));
    if (filter?.kind) conditions.push(eq(monetizationRequests.kind, filter.kind));
    const q = db.select().from(monetizationRequests).orderBy(desc(monetizationRequests.createdAt)).limit(filter?.limit ?? 200);
    return conditions.length ? q.where(and(...conditions)) : q;
  }

  async getMonetizationRequest(id: number): Promise<MonetizationRequest | undefined> {
    const [row] = await db.select().from(monetizationRequests).where(eq(monetizationRequests.id, id));
    return row;
  }

  async updateMonetizationRequest(id: number, data: { status: string; adminNote?: string }): Promise<MonetizationRequest | undefined> {
    const [row] = await db.update(monetizationRequests).set({
      status: data.status,
      adminNote: data.adminNote ?? null,
      reviewedAt: new Date(),
    }).where(eq(monetizationRequests.id, id)).returning();
    return row;
  }

  // -----------------------------------------------------------------
  // Map view: lightweight pins (id, slug, name, lat/lng, key facts)
  // -----------------------------------------------------------------
  async getRacePins(filters?: {
    state?: string;
    distance?: string;
    dateFrom?: string;
    dateTo?: string;
    bbox?: { minLat: number; minLng: number; maxLat: number; maxLng: number };
    limit?: number;
  }): Promise<Array<{
    id: number; slug: string; name: string; city: string; state: string;
    distance: string; date: string; lat: number; lng: number;
    priceMin: number | null; qualityScore: number;
  }>> {
    const conds: any[] = [
      isNotNull(races.lat),
      isNotNull(races.lng),
      eq(races.isActive, true),
    ];
    if (filters?.state) conds.push(eq(races.state, filters.state));
    if (filters?.distance) conds.push(eq(races.distance, filters.distance));
    if (filters?.dateFrom) conds.push(gte(races.date, filters.dateFrom));
    if (filters?.dateTo) conds.push(lte(races.date, filters.dateTo));
    if (filters?.bbox) {
      conds.push(gte(races.lat, filters.bbox.minLat));
      conds.push(lte(races.lat, filters.bbox.maxLat));
      conds.push(gte(races.lng, filters.bbox.minLng));
      conds.push(lte(races.lng, filters.bbox.maxLng));
    }
    const limit = Math.min(Math.max(filters?.limit ?? 5000, 1), 25000);
    const rows = await db.select({
      id: races.id, slug: races.slug, name: races.name,
      city: races.city, state: races.state, distance: races.distance,
      date: races.date, lat: races.lat, lng: races.lng,
      priceMin: races.priceMin, qualityScore: races.qualityScore,
    }).from(races).where(and(...conds)).limit(limit);
    return rows.filter((r): r is typeof r & { lat: number; lng: number } =>
      r.lat != null && r.lng != null);
  }

  // -----------------------------------------------------------------
  // Market intelligence: aggregated stats per state/city/distance
  // -----------------------------------------------------------------
  async getMarketStats(filters: {
    state?: string;
    city?: string;
    distance?: string;
  }): Promise<{
    raceCount: number;
    avgPriceMin: number | null;
    avgPriceMax: number | null;
    medianQualityScore: number | null;
    distanceMix: { distance: string; count: number }[];
    next30Days: number;
    registrationClosingSoon: number;
    avgPriceByDistance: { distance: string; avgPriceMin: number | null }[];
  }> {
    const conds: any[] = [eq(races.isActive, true)];
    if (filters.state) conds.push(eq(races.state, filters.state));
    if (filters.city) conds.push(eq(races.city, filters.city));
    if (filters.distance) conds.push(eq(races.distance, filters.distance));

    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

    const [agg] = await db.select({
      raceCount: sql<number>`COUNT(*)::int`,
      avgPriceMin: sql<number | null>`AVG(${races.priceMin})::float`,
      avgPriceMax: sql<number | null>`AVG(${races.priceMax})::float`,
      medianQualityScore: sql<number | null>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${races.qualityScore})::float`,
      next30Days: sql<number>`COUNT(*) FILTER (WHERE ${races.date} >= ${today} AND ${races.date} <= ${in30})::int`,
      registrationClosingSoon: sql<number>`COUNT(*) FILTER (WHERE ${races.registrationDeadline} IS NOT NULL AND ${races.registrationDeadline} >= ${today} AND ${races.registrationDeadline} <= ${in30})::int`,
    }).from(races).where(and(...conds));

    const mix = await db.select({
      distance: races.distance,
      count: sql<number>`COUNT(*)::int`,
    }).from(races).where(and(...conds)).groupBy(races.distance).orderBy(desc(sql`COUNT(*)`)).limit(8);

    const byDist = await db.select({
      distance: races.distance,
      avgPriceMin: sql<number | null>`AVG(${races.priceMin})::float`,
    }).from(races).where(and(...conds, isNotNull(races.priceMin)))
      .groupBy(races.distance).orderBy(desc(sql`COUNT(*)`)).limit(6);

    return {
      raceCount: agg?.raceCount ?? 0,
      avgPriceMin: agg?.avgPriceMin != null ? Math.round(agg.avgPriceMin) : null,
      avgPriceMax: agg?.avgPriceMax != null ? Math.round(agg.avgPriceMax) : null,
      medianQualityScore: agg?.medianQualityScore != null ? Math.round(agg.medianQualityScore) : null,
      distanceMix: mix,
      next30Days: agg?.next30Days ?? 0,
      registrationClosingSoon: agg?.registrationClosingSoon ?? 0,
      avgPriceByDistance: byDist.map((r) => ({
        distance: r.distance,
        avgPriceMin: r.avgPriceMin != null ? Math.round(r.avgPriceMin) : null,
      })),
    };
  }

  // -----------------------------------------------------------------
  // Field-level provenance (multi-source merge foundation)
  // -----------------------------------------------------------------
  /**
   * Record one observation per (raceId, fieldName, sourceKey). Re-observing the
   * same triple from the same source upserts (newest value + observedAt wins
   * within that source). Untracked field names and undefined values are skipped.
   */
  async recordRaceProvenance(
    raceId: number,
    sourceKey: string,
    fields: Record<string, unknown>,
    opts?: { confidence?: number; observedAt?: Date },
  ): Promise<number> {
    const confidence = Math.max(0, Math.min(100, opts?.confidence ?? 100));
    const observedAt = opts?.observedAt ?? new Date();
    const rows = Object.entries(fields)
      .filter(([k, v]) => isTrackedField(k) && v !== undefined)
      .map(([fieldName, value]) => ({
        raceId,
        fieldName,
        sourceKey,
        value: value as unknown,
        confidence,
        observedAt,
      }));
    if (rows.length === 0) return 0;
    await db.insert(raceFieldProvenance)
      .values(rows)
      .onConflictDoUpdate({
        target: [raceFieldProvenance.raceId, raceFieldProvenance.fieldName, raceFieldProvenance.sourceKey],
        set: {
          value: sql`excluded.value`,
          confidence: sql`excluded.confidence`,
          observedAt: sql`excluded.observed_at`,
        },
      });
    return rows.length;
  }

  async getRaceProvenance(raceId: number): Promise<RaceFieldProvenance[]> {
    return db.select().from(raceFieldProvenance)
      .where(eq(raceFieldProvenance.raceId, raceId))
      .orderBy(asc(raceFieldProvenance.fieldName), desc(raceFieldProvenance.observedAt));
  }

  /**
   * Resolve the winning value for each tracked field on a race using the
   * trust-hierarchy resolver. Returns a partial map of field → value
   * (only fields that have at least one non-null observation).
   */
  async resolveRaceFields(raceId: number): Promise<Record<string, unknown>> {
    const rows = await db.select({
      fieldName: raceFieldProvenance.fieldName,
      sourceKey: raceFieldProvenance.sourceKey,
      value: raceFieldProvenance.value,
      confidence: raceFieldProvenance.confidence,
      observedAt: raceFieldProvenance.observedAt,
    }).from(raceFieldProvenance).where(eq(raceFieldProvenance.raceId, raceId));
    return resolveFieldWinners(rows.map((r) => ({
      fieldName: r.fieldName,
      sourceKey: r.sourceKey,
      value: r.value,
      confidence: r.confidence,
      observedAt: r.observedAt ?? new Date(0),
    })));
  }
}

export const storage = new DatabaseStorage();
