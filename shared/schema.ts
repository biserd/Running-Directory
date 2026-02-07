import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, date, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  abbreviation: text("abbreviation").notNull().unique(),
  raceCount: integer("race_count").notNull().default(0),
  routeCount: integer("route_count").notNull().default(0),
  popularCities: text("popular_cities").array().notNull().default(sql`'{}'`),
});

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
});

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
});

export const insertStateSchema = createInsertSchema(states).omit({ id: true });
export const insertRaceSchema = createInsertSchema(races).omit({ id: true });
export const insertRouteSchema = createInsertSchema(routes).omit({ id: true });

export type InsertState = z.infer<typeof insertStateSchema>;
export type InsertRace = z.infer<typeof insertRaceSchema>;
export type InsertRoute = z.infer<typeof insertRouteSchema>;

export type State = typeof states.$inferSelect;
export type Race = typeof races.$inferSelect;
export type Route = typeof routes.$inferSelect;
