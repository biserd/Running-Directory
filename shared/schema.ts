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

export const organizers = pgTable("organizers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  website: text("website"),
  email: text("email"),
  contactName: text("contact_name"),
  phone: text("phone"),
  city: text("city"),
  state: text("state"),
  description: text("description"),
  logoUrl: text("logo_url"),
  isVerified: boolean("is_verified").notNull().default(false),
  raceCount: integer("race_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("organizers_state_idx").on(table.state),
]);

export const raceSeries = pgTable("race_series", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  website: text("website"),
  organizerId: integer("organizer_id").references(() => organizers.id),
  logoUrl: text("logo_url"),
  raceCount: integer("race_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
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

  organizerId: integer("organizer_id").references(() => organizers.id),
  seriesId: integer("series_id").references(() => raceSeries.id),

  priceMin: integer("price_min"),
  priceMax: integer("price_max"),
  priceCurrency: text("price_currency").default("USD"),
  registrationOpen: boolean("registration_open"),
  registrationDeadline: text("registration_deadline"),
  nextPriceIncreaseAt: text("next_price_increase_at"),
  nextPriceIncreaseAmount: integer("next_price_increase_amount"),

  terrain: text("terrain"),
  elevationGainM: integer("elevation_gain_m"),
  courseType: text("course_type"),
  courseMapUrl: text("course_map_url"),
  elevationProfileUrl: text("elevation_profile_url"),
  fieldSize: integer("field_size"),

  refundPolicy: text("refund_policy"),
  deferralPolicy: text("deferral_policy"),
  packetPickup: text("packet_pickup"),
  parkingNotes: text("parking_notes"),
  transitFriendly: boolean("transit_friendly"),

  walkerFriendly: boolean("walker_friendly"),
  strollerFriendly: boolean("stroller_friendly"),
  dogFriendly: boolean("dog_friendly"),
  kidsRace: boolean("kids_race"),
  charity: boolean("charity"),
  charityPartner: text("charity_partner"),

  vibeTags: text("vibe_tags").array().notNull().default(sql`'{}'`),
  isTurkeyTrot: boolean("is_turkey_trot").notNull().default(false),
  isHalloween: boolean("is_halloween").notNull().default(false),
  isJingleBell: boolean("is_jingle_bell").notNull().default(false),

  recurrencePattern: text("recurrence_pattern"),
  yearsRunning: integer("years_running"),

  isClaimed: boolean("is_claimed").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),

  sourceUrl: text("source_url"),
  lastVerifiedAt: timestamp("last_verified_at"),

  beginnerScore: integer("beginner_score"),
  prScore: integer("pr_score"),
  valueScore: integer("value_score"),
  vibeScore: integer("vibe_score"),
  familyScore: integer("family_score"),
  urgencyScore: integer("urgency_score"),
  scoreBreakdown: jsonb("score_breakdown"),
  scoresUpdatedAt: timestamp("scores_updated_at"),
}, (table) => [
  index("races_state_idx").on(table.state),
  index("races_date_idx").on(table.date),
  index("races_organizer_idx").on(table.organizerId),
  index("races_turkey_trot_idx").on(table.isTurkeyTrot),
]);

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

export const raceClaims = pgTable("race_claims", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().references(() => races.id),
  organizerId: integer("organizer_id").references(() => organizers.id),
  status: text("status").notNull().default("pending"),
  claimerEmail: text("claimer_email").notNull(),
  claimerName: text("claimer_name"),
  claimerRole: text("claimer_role"),
  message: text("message"),
  verificationToken: text("verification_token").notNull().unique(),
  verifiedAt: timestamp("verified_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewerNote: text("reviewer_note"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("race_claims_race_idx").on(table.raceId),
  index("race_claims_status_idx").on(table.status),
  index("race_claims_token_idx").on(table.verificationToken),
]);

export const savedSearches = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  queryJson: jsonb("query_json").notNull(),
  alertEnabled: boolean("alert_enabled").notNull().default(false),
  lastNotifiedAt: timestamp("last_notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("saved_searches_user_idx").on(table.userId),
]);

export const raceAlerts = pgTable("race_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  raceId: integer("race_id").notNull().references(() => races.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(),
  threshold: integer("threshold"),
  lastNotifiedAt: timestamp("last_notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("race_alerts_user_race_type_idx").on(table.userId, table.raceId, table.alertType),
  index("race_alerts_user_idx").on(table.userId),
]);

export const outboundClicks = pgTable("outbound_clicks", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").references(() => races.id, { onDelete: "cascade" }),
  organizerId: integer("organizer_id").references(() => organizers.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  destination: text("destination").notNull(),
  targetUrl: text("target_url").notNull(),
  referer: text("referer"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("outbound_clicks_race_idx").on(table.raceId),
  index("outbound_clicks_organizer_idx").on(table.organizerId),
  index("outbound_clicks_created_idx").on(table.createdAt),
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

export const influencers = pgTable("influencers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  platform: text("platform").notNull(),
  bio: text("bio"),
  followers: text("followers"),
  specialty: text("specialty"),
  website: text("website"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
});

export const podcasts = pgTable("podcasts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  description: text("description"),
  category: text("category"),
  episodeCount: text("episode_count"),
  website: text("website"),
  spotifyUrl: text("spotify_url"),
  appleUrl: text("apple_url"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
});

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  description: text("description"),
  category: text("category"),
  publishYear: integer("publish_year"),
  pages: integer("pages"),
  amazonUrl: text("amazon_url"),
  website: text("website"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
}, (table) => [
  index("users_email_idx").on(table.email),
]);

export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("magic_link_tokens_token_idx").on(table.token),
  index("magic_link_tokens_email_idx").on(table.email),
]);

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  itemId: integer("item_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("favorites_user_item_idx").on(table.userId, table.itemType, table.itemId),
  index("favorites_user_idx").on(table.userId),
]);

export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, (table) => [
  index("IDX_session_expire").on(table.expire),
]);

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  itemId: integer("item_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("reviews_user_item_idx").on(table.userId, table.itemType, table.itemId),
  index("reviews_item_idx").on(table.itemType, table.itemId),
  index("reviews_user_idx").on(table.userId),
]);

export const insertStateSchema = createInsertSchema(states).omit({ id: true });
export const insertCitySchema = createInsertSchema(cities).omit({ id: true });
export const insertRaceSchema = createInsertSchema(races).omit({ id: true });
export const insertRaceOccurrenceSchema = createInsertSchema(raceOccurrences).omit({ id: true });
export const insertRouteSchema = createInsertSchema(routes).omit({ id: true });
export const insertSourceSchema = createInsertSchema(sources).omit({ id: true });
export const insertSourceRecordSchema = createInsertSchema(sourceRecords).omit({ id: true });
export const insertCollectionSchema = createInsertSchema(collections).omit({ id: true });
export const insertInfluencerSchema = createInsertSchema(influencers).omit({ id: true });
export const insertPodcastSchema = createInsertSchema(podcasts).omit({ id: true });
export const insertBookSchema = createInsertSchema(books).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLoginAt: true });
export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrganizerSchema = createInsertSchema(organizers).omit({ id: true, createdAt: true });
export const insertRaceSeriesSchema = createInsertSchema(raceSeries).omit({ id: true, createdAt: true });
export const insertRaceClaimSchema = createInsertSchema(raceClaims).omit({ id: true, createdAt: true, verifiedAt: true, reviewedAt: true });
export const insertSavedSearchSchema = createInsertSchema(savedSearches).omit({ id: true, createdAt: true, lastNotifiedAt: true });
export const insertRaceAlertSchema = createInsertSchema(raceAlerts).omit({ id: true, createdAt: true, lastNotifiedAt: true });
export const insertOutboundClickSchema = createInsertSchema(outboundClicks).omit({ id: true, createdAt: true });

export type InsertState = z.infer<typeof insertStateSchema>;
export type InsertCity = z.infer<typeof insertCitySchema>;
export type InsertRace = z.infer<typeof insertRaceSchema>;
export type InsertRaceOccurrence = z.infer<typeof insertRaceOccurrenceSchema>;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type InsertSourceRecord = z.infer<typeof insertSourceRecordSchema>;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type InsertInfluencer = z.infer<typeof insertInfluencerSchema>;
export type InsertPodcast = z.infer<typeof insertPodcastSchema>;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertOrganizer = z.infer<typeof insertOrganizerSchema>;
export type InsertRaceSeries = z.infer<typeof insertRaceSeriesSchema>;
export type InsertRaceClaim = z.infer<typeof insertRaceClaimSchema>;
export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type InsertRaceAlert = z.infer<typeof insertRaceAlertSchema>;
export type InsertOutboundClick = z.infer<typeof insertOutboundClickSchema>;

export type State = typeof states.$inferSelect;
export type City = typeof cities.$inferSelect;
export type Race = typeof races.$inferSelect;
export type RaceOccurrence = typeof raceOccurrences.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type SourceRecord = typeof sourceRecords.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Influencer = typeof influencers.$inferSelect;
export type Podcast = typeof podcasts.$inferSelect;
export type Book = typeof books.$inferSelect;
export type User = typeof users.$inferSelect;
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Organizer = typeof organizers.$inferSelect;
export type RaceSeries = typeof raceSeries.$inferSelect;
export type RaceClaim = typeof raceClaims.$inferSelect;
export type SavedSearch = typeof savedSearches.$inferSelect;
export type RaceAlert = typeof raceAlerts.$inferSelect;
export type OutboundClick = typeof outboundClicks.$inferSelect;

export type ScoreFactor = { factor: string; points: number };
export type ScoreBreakdown = {
  beginner: ScoreFactor[];
  pr: ScoreFactor[];
  value: ScoreFactor[];
  vibe: ScoreFactor[];
  family: ScoreFactor[];
  urgency: ScoreFactor[];
};

export type RaceSearchFilters = {
  state?: string;
  city?: string;
  cityId?: number;
  distance?: string;
  distances?: string[];
  surface?: string;
  terrain?: string;
  year?: number;
  month?: number;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  minBeginnerScore?: number;
  minPrScore?: number;
  minValueScore?: number;
  minVibeScore?: number;
  minFamilyScore?: number;
  walkerFriendly?: boolean;
  strollerFriendly?: boolean;
  dogFriendly?: boolean;
  kidsRace?: boolean;
  charity?: boolean;
  bostonQualifier?: boolean;
  isTurkeyTrot?: boolean;
  vibeTag?: string;
  registrationOpen?: boolean;
  priceIncreaseSoon?: boolean;
  transitFriendly?: boolean;
  organizerId?: number;
  seriesId?: number;
  near?: { lat: number; lng: number; radiusMiles: number };
  sort?: "date" | "price" | "beginner" | "pr" | "value" | "vibe" | "family" | "urgency" | "quality";
  limit?: number;
  offset?: number;
};
