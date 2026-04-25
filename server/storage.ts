import { db } from "./db";
import { states, cities, races, raceOccurrences, routes, sources, sourceRecords, collections, influencers, podcasts, books, users, magicLinkTokens, favorites, reviews, organizers, raceSeries, raceClaims, savedSearches, raceAlerts, outboundClicks } from "@shared/schema";
import type {
  State, City, Race, RaceOccurrence, Route, Source, SourceRecord, Collection, Influencer, Podcast, Book,
  InsertState, InsertCity, InsertRace, InsertRaceOccurrence, InsertRoute, InsertSource, InsertSourceRecord, InsertCollection, InsertInfluencer, InsertPodcast, InsertBook,
  User, MagicLinkToken, Favorite, Review,
  Organizer, RaceSeries, RaceClaim, SavedSearch, RaceAlert, OutboundClick,
  InsertOrganizer, InsertRaceSeries, InsertRaceClaim, InsertSavedSearch, InsertRaceAlert, InsertOutboundClick,
  RaceSearchFilters,
} from "@shared/schema";
import { eq, and, sql, desc, asc, ilike, inArray, gte, lte, or, isNotNull } from "drizzle-orm";

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
  createRaceAlert(data: InsertRaceAlert): Promise<RaceAlert>;
  deleteRaceAlert(id: number, userId: number): Promise<void>;

  recordOutboundClick(data: InsertOutboundClick): Promise<OutboundClick>;
  getOutboundClickStats(raceId: number, sinceDays?: number): Promise<{ total: number; byDestination: Record<string, number> }>;

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
      conditions.push(sql`(
        (${races.lat} IS NOT NULL AND ${races.lng} IS NOT NULL AND
         SQRT(POWER((${races.lat} - ${lat}), 2) + POWER((${cosLat} * (${races.lng} - ${lng})), 2)) * 69.0 <= ${radiusMiles})
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
}

export const storage = new DatabaseStorage();
