import { db } from "./db";
import { states, races, routes } from "@shared/schema";
import type { State, Race, Route, InsertState, InsertRace, InsertRoute } from "@shared/schema";
import { eq, ilike, and, sql } from "drizzle-orm";

export interface IStorage {
  getStates(): Promise<State[]>;
  getStateBySlug(slug: string): Promise<State | undefined>;

  getRaces(filters?: { state?: string; distance?: string; surface?: string; limit?: number }): Promise<Race[]>;
  getRaceBySlug(slug: string): Promise<Race | undefined>;
  getRacesByState(stateAbbr: string): Promise<Race[]>;

  getRoutes(filters?: { state?: string; surface?: string; type?: string; limit?: number }): Promise<Route[]>;
  getRouteBySlug(slug: string): Promise<Route | undefined>;
  getRoutesByState(stateAbbr: string): Promise<Route[]>;

  seedStates(data: InsertState[]): Promise<void>;
  seedRaces(data: InsertRace[]): Promise<void>;
  seedRoutes(data: InsertRoute[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getStates(): Promise<State[]> {
    return db.select().from(states).orderBy(states.name);
  }

  async getStateBySlug(slug: string): Promise<State | undefined> {
    const [state] = await db.select().from(states).where(eq(states.slug, slug));
    return state;
  }

  async getRaces(filters?: { state?: string; distance?: string; surface?: string; limit?: number }): Promise<Race[]> {
    const conditions = [];
    if (filters?.state) conditions.push(eq(races.state, filters.state));
    if (filters?.distance) conditions.push(eq(races.distance, filters.distance));
    if (filters?.surface) conditions.push(eq(races.surface, filters.surface));

    const query = db.select().from(races);
    if (conditions.length > 0) {
      const result = await query.where(and(...conditions)).orderBy(races.date).limit(filters?.limit || 100);
      return result;
    }
    return query.orderBy(races.date).limit(filters?.limit || 100);
  }

  async getRaceBySlug(slug: string): Promise<Race | undefined> {
    const [race] = await db.select().from(races).where(eq(races.slug, slug));
    return race;
  }

  async getRacesByState(stateAbbr: string): Promise<Race[]> {
    return db.select().from(races).where(eq(races.state, stateAbbr)).orderBy(races.date);
  }

  async getRoutes(filters?: { state?: string; surface?: string; type?: string; limit?: number }): Promise<Route[]> {
    const conditions = [];
    if (filters?.state) conditions.push(eq(routes.state, filters.state));
    if (filters?.surface) conditions.push(eq(routes.surface, filters.surface));
    if (filters?.type) conditions.push(eq(routes.type, filters.type));

    const query = db.select().from(routes);
    if (conditions.length > 0) {
      const result = await query.where(and(...conditions)).orderBy(routes.name).limit(filters?.limit || 100);
      return result;
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

  async seedStates(data: InsertState[]): Promise<void> {
    for (const s of data) {
      await db.insert(states).values(s).onConflictDoNothing();
    }
  }

  async seedRaces(data: InsertRace[]): Promise<void> {
    for (const r of data) {
      await db.insert(races).values(r).onConflictDoNothing();
    }
  }

  async seedRoutes(data: InsertRoute[]): Promise<void> {
    for (const r of data) {
      await db.insert(routes).values(r).onConflictDoNothing();
    }
  }
}

export const storage = new DatabaseStorage();
