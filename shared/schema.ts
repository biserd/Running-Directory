import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, serial, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  abbreviation: text("abbreviation").notNull().unique(),
  fips: text("fips"),
  raceCount: integer("race_count").notNull().default(0),
  routeCount: integer("route_count").notNull().default(0),
  popularCities: text("popular_cities").array().notNull().default(sql`'{}'`),
});

export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  stateId: integer("state_id").notNull().references(() => states.id),
  lat: real("lat"),
  lng: real("lng"),
  population: integer("population"),
}, (table) => [
  uniqueIndex("cities_slug_state_idx").on(table.slug, table.stateId),
  index("cities_state_idx").on(table.stateId),
]);

export const races = pgTable("races", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  distance: text("distance").notNull(),
  surface: text("surface").notNull(),
  elevation: text("elevation").notNull(),
  description: text("description"),
  website: text("website"),
  registrationUrl: text("registration_url"),
  startTime: text("start_time"),
  timeLimit: text("time_limit"),
  bostonQualifier: boolean("boston_qualifier").default(false),
  cityId: integer("city_id").references(() => cities.id),
  stateId: integer("state_id").references(() => states.id),
  distanceMeters: integer("distance_meters"),
  distanceLabel: text("distance_label"),
  lat: real("lat"),
  lng: real("lng"),
  isActive: boolean("is_active").notNull().default(true),
  qualityScore: integer("quality_score").notNull().default(50),
  firstSeenAt: timestamp("first_seen_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
});

export const raceOccurrences = pgTable("race_occurrences", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().references(() => races.id),
  startDate: text("start_date").notNull(),
  startTime: text("start_time"),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  priceMin: integer("price_min"),
  priceMax: integer("price_max"),
  status: text("status").notNull().default("scheduled"),
  courseElevationGainM: integer("course_elevation_gain_m"),
  courseProfileUrl: text("course_profile_url"),
  lastModifiedAt: timestamp("last_modified_at").defaultNow(),
  sourceBestId: integer("source_best_id"),
}, (table) => [
  index("race_occurrences_race_idx").on(table.raceId),
  index("race_occurrences_year_idx").on(table.year),
  index("race_occurrences_year_month_idx").on(table.year, table.month),
  index("race_occurrences_date_idx").on(table.startDate),
]);

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  distance: real("distance").notNull(),
  elevationGain: integer("elevation_gain").notNull().default(0),
  surface: text("surface").notNull(),
  type: text("type").notNull(),
  difficulty: text("difficulty").notNull(),
  description: text("description"),
  cityId: integer("city_id").references(() => cities.id),
  stateId: integer("state_id").references(() => states.id),
  distanceMeters: real("distance_meters"),
  lat: real("lat"),
  lng: real("lng"),
  routeType: text("route_type"),
  polyline: text("polyline"),
  gpxUrl: text("gpx_url"),
  isActive: boolean("is_active").notNull().default(true),
  qualityScore: integer("quality_score").notNull().default(50),
  firstSeenAt: timestamp("first_seen_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
});

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull().default("manual"),
  baseUrl: text("base_url"),
  termsUrl: text("terms_url"),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sourceRecords = pgTable("source_records", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => sources.id),
  externalId: text("external_id"),
  externalUrl: text("external_url"),
  payloadJson: jsonb("payload_json"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  lastModifiedAt: timestamp("last_modified_at").defaultNow(),
  normalizedName: text("normalized_name"),
  normalizedLocationKey: text("normalized_location_key"),
  normalizedDate: text("normalized_date"),
  hashKey: text("hash_key"),
  canonicalRaceId: integer("canonical_race_id").references(() => races.id),
  canonicalRouteId: integer("canonical_route_id").references(() => routes.id),
}, (table) => [
  index("source_records_source_idx").on(table.sourceId),
  index("source_records_hash_idx").on(table.hashKey),
  index("source_records_race_idx").on(table.canonicalRaceId),
  index("source_records_route_idx").on(table.canonicalRouteId),
]);

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("races"),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  titleTemplate: text("title_template"),
  description: text("description"),
  queryJson: jsonb("query_json"),
  isProgrammatic: boolean("is_programmatic").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStateSchema = createInsertSchema(states).omit({ id: true });
export const insertCitySchema = createInsertSchema(cities).omit({ id: true });
export const insertRaceSchema = createInsertSchema(races).omit({ id: true });
export const insertRaceOccurrenceSchema = createInsertSchema(raceOccurrences).omit({ id: true });
export const insertRouteSchema = createInsertSchema(routes).omit({ id: true });
export const insertSourceSchema = createInsertSchema(sources).omit({ id: true });
export const insertSourceRecordSchema = createInsertSchema(sourceRecords).omit({ id: true });
export const insertCollectionSchema = createInsertSchema(collections).omit({ id: true });

export type InsertState = z.infer<typeof insertStateSchema>;
export type InsertCity = z.infer<typeof insertCitySchema>;
export type InsertRace = z.infer<typeof insertRaceSchema>;
export type InsertRaceOccurrence = z.infer<typeof insertRaceOccurrenceSchema>;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type InsertSourceRecord = z.infer<typeof insertSourceRecordSchema>;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;

export type State = typeof states.$inferSelect;
export type City = typeof cities.$inferSelect;
export type Race = typeof races.$inferSelect;
export type RaceOccurrence = typeof raceOccurrences.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type SourceRecord = typeof sourceRecords.$inferSelect;
export type Collection = typeof collections.$inferSelect;
