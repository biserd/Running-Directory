import { db } from "./db";
import { states, cities, races, raceOccurrences, routes, sources, sourceRecords, collections } from "@shared/schema";
import type {
  State, City, Race, RaceOccurrence, Route, Source, SourceRecord, Collection,
  InsertState, InsertCity, InsertRace, InsertRaceOccurrence, InsertRoute, InsertSource, InsertSourceRecord, InsertCollection
} from "@shared/schema";
import { eq, and, sql, desc, asc, ilike, inArray } from "drizzle-orm";

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
}

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
      await db.insert(routes).values(r).onConflictDoNothing();
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
}

export const storage = new DatabaseStorage();
