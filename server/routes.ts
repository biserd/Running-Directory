import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { refreshRaceData } from "./ingestion/pipeline";
import { fetchRacesByState } from "./ingestion/runsignup";
import { sendMagicLinkEmail, sendAdminNewUserNotification, sendClaimVerificationEmail, sendFeaturedRequestAdminNotification } from "./email";
import { computeRaceScores } from "./scoring";
import { backfillRaceScores, recomputeUrgencyScores } from "./scoring-backfill";
import { z } from "zod";
import { insertOrganizerSchema, insertRaceClaimSchema, insertSavedSearchSchema, insertRaceAlertSchema, insertOutboundClickSchema } from "@shared/schema";
import type { InsertRaceClaim, InsertOutboundClick, InsertFeaturedRequest, Race } from "@shared/schema";
import type { RaceSearchFilters } from "@shared/schema";
import { getStateCentroid } from "@shared/states";
import crypto from "crypto";
import { getDomain as tldtsGetDomain } from "tldts";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// Build a base URL for outbound auth/claim emails. We must NEVER trust the
// raw Host / X-Forwarded-* headers — they are attacker-controlled and would
// let someone embed a malicious origin in a verification email. Instead we
// resolve a trusted origin server-side, in priority order:
//   1. APP_BASE_URL env (canonical, set in production).
//   2. The exact REPLIT_DOMAINS value provided by the platform (dev/preview).
//   3. CANONICAL_BASE_URL fallback.
// Token links are always served over https.
const CANONICAL_BASE_URL = "https://running.services";
function resolveTrustedBaseUrl(): string {
  const env = process.env.APP_BASE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const replitDomains = process.env.REPLIT_DOMAINS?.trim();
  if (replitDomains) {
    // REPLIT_DOMAINS is a comma-separated list — pick the first.
    const host = replitDomains.split(",")[0].trim().toLowerCase();
    if (host) return `https://${host}`;
  }
  return CANONICAL_BASE_URL;
}
const TRUSTED_BASE_URL = resolveTrustedBaseUrl();
function getTrustedBaseUrl(_req: Request): string {
  return TRUSTED_BASE_URL;
}

function humanizeAlertType(t: string): string {
  switch (t) {
    case "price-increase": return "price increase";
    case "registration-close": return "registration closing";
    case "saved-race-reminder": return "saved race reminder";
    case "this-weekend": return "this weekend digest";
    case "saved-search-matches": return "saved search match";
    case "turkey-trot-watch": return "Turkey Trot watchlist";
    default: return t;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/magic-link", async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await storage.createMagicLinkToken(email.toLowerCase(), token, expiresAt);

    const baseUrl = getTrustedBaseUrl(req);

    const sent = await sendMagicLinkEmail(email.toLowerCase(), token, baseUrl);
    if (!sent) {
      return res.status(500).json({ message: "Failed to send email. Please try again." });
    }

    res.json({ message: "Magic link sent! Check your email." });
  });

  app.get("/api/auth/verify", async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Invalid token" });
    }

    const record = await storage.getMagicLinkToken(token);
    if (!record) {
      return res.status(400).json({ message: "Invalid or expired link" });
    }
    if (record.usedAt) {
      return res.status(400).json({ message: "This link has already been used" });
    }
    if (new Date(record.expiresAt) < new Date()) {
      return res.status(400).json({ message: "This link has expired" });
    }

    await storage.markTokenUsed(record.id);

    let user = await storage.getUserByEmail(record.email);
    const isNewUser = !user;
    if (!user) {
      user = await storage.createUser(record.email);
      sendAdminNewUserNotification(record.email).catch(() => {});
    }

    await storage.updateUserLastLogin(user.id);

    req.session.userId = user.id;

    res.json({ user: { id: user.id, email: user.email, name: user.name }, isNewUser });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.json({ user: null });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.json({ user: null });
    }
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    const { name } = req.body;
    if (name && typeof name === "string") {
      await storage.updateUserName(req.session.userId!, name.trim());
    }
    const user = await storage.getUserById(req.session.userId!);
    res.json({ user: { id: user!.id, email: user!.email, name: user!.name } });
  });

  app.get("/api/favorites", requireAuth, async (req, res) => {
    const { type } = req.query;
    let favs;
    if (type && typeof type === "string") {
      favs = await storage.getUserFavoritesByType(req.session.userId!, type);
    } else {
      favs = await storage.getUserFavorites(req.session.userId!);
    }
    res.json(favs);
  });

  app.get("/api/favorites/enriched", requireAuth, async (req, res) => {
    const favs = await storage.getUserFavorites(req.session.userId!);
    const raceFavIds = favs.filter(f => f.itemType === "race").map(f => f.itemId);
    const routeFavIds = favs.filter(f => f.itemType === "route").map(f => f.itemId);

    const [raceItems, routeItems] = await Promise.all([
      raceFavIds.length > 0 ? storage.getRacesByIds(raceFavIds) : Promise.resolve([]),
      routeFavIds.length > 0 ? storage.getRoutesByIds(routeFavIds) : Promise.resolve([]),
    ]);

    res.json({
      races: raceItems,
      routes: routeItems,
      favorites: favs,
    });
  });

  app.post("/api/favorites", requireAuth, async (req, res) => {
    const { itemType, itemId } = req.body;
    if (!itemType || !itemId || !["race", "route"].includes(itemType)) {
      return res.status(400).json({ message: "Valid itemType (race/route) and itemId required" });
    }
    const fav = await storage.addFavorite(req.session.userId!, itemType, parseInt(itemId));
    res.json(fav);
  });

  app.delete("/api/favorites", requireAuth, async (req, res) => {
    const { itemType, itemId } = req.body;
    if (!itemType || !itemId) {
      return res.status(400).json({ message: "itemType and itemId required" });
    }
    const parsedId = parseInt(String(itemId));
    if (isNaN(parsedId)) {
      return res.status(400).json({ message: "Invalid itemId" });
    }
    await storage.removeFavorite(req.session.userId!, itemType, parsedId);
    res.json({ message: "Removed from favorites" });
  });

  app.get("/api/favorites/check", requireAuth, async (req, res) => {
    const { itemType, itemId } = req.query;
    if (!itemType || !itemId) {
      return res.status(400).json({ message: "itemType and itemId required" });
    }
    const isFav = await storage.isFavorited(req.session.userId!, itemType as string, parseInt(itemId as string));
    res.json({ isFavorited: isFav });
  });

  app.get("/api/search", async (req, res) => {
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 2) {
      return res.json({ races: [], states: [], cities: [] });
    }
    try {
      const results = await storage.search(q, 5);
      res.json(results);
    } catch (err) {
      console.error("Search error:", err);
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get("/api/states", async (_req, res) => {
    const states = await storage.getStates();
    res.json(states);
  });

  app.get("/api/states/:slug", async (req, res) => {
    const state = await storage.getStateBySlug(req.params.slug);
    if (!state) return res.status(404).json({ message: "State not found" });
    res.json(state);
  });

  app.get("/api/states/:stateSlug/cities", async (req, res) => {
    const state = await storage.getStateBySlug(req.params.stateSlug);
    if (!state) return res.status(404).json({ message: "State not found" });
    const citiesList = await storage.getCitiesByState(state.id);
    res.json(citiesList);
  });

  app.get("/api/cities/:stateSlug/:citySlug", async (req, res) => {
    const result = await storage.getCityBySlug(req.params.stateSlug, req.params.citySlug);
    if (!result) return res.status(404).json({ message: "City not found" });
    res.json(result);
  });

  app.get("/api/races", async (req, res) => {
    const { state, distance, surface, city, year, month, limit } = req.query;
    const races = await storage.getRaces({
      state: state as string | undefined,
      distance: distance as string | undefined,
      surface: surface as string | undefined,
      city: city as string | undefined,
      year: year ? parseInt(year as string) : undefined,
      month: month ? parseInt(month as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(races);
  });

  app.get("/api/races/popular", async (_req, res) => {
    const popular = await storage.getPopularRaces(12);
    res.json(popular);
  });

  app.get("/api/races/trending", async (_req, res) => {
    const trending = await storage.getTrendingRaces(12);
    res.json(trending);
  });

  app.get("/api/races/nearby", async (req, res) => {
    const { lat, lng, limit } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "lat and lng are required" });
    const races = await storage.getRacesNearby(
      parseFloat(lat as string),
      parseFloat(lng as string),
      limit ? parseInt(limit as string) : 20
    );
    res.json(races);
  });

  const RESERVED_RACE_ROUTES = new Set([
    "search",
    "compare",
    "this-weekend",
    "price-increase-soon",
    "shopper",
    "popular",
    "trending",
    "nearby",
  ]);

  app.get("/api/races/:slug", async (req, res, next) => {
    if (RESERVED_RACE_ROUTES.has(req.params.slug)) return next();
    const race = await storage.getRaceBySlug(req.params.slug);
    if (!race) return res.status(404).json({ message: "Race not found" });
    let citySlug: string | null = null;
    if (race.cityId) {
      try {
        const cityRow = await storage.getCityById(race.cityId);
        citySlug = cityRow?.slug ?? null;
      } catch {}
    }
    res.json({ ...race, citySlug });
  });

  app.get("/api/race-occurrences", async (req, res) => {
    const { raceId, year, month, limit } = req.query;
    const occurrences = await storage.getRaceOccurrences({
      raceId: raceId ? parseInt(raceId as string) : undefined,
      year: year ? parseInt(year as string) : undefined,
      month: month ? parseInt(month as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(occurrences);
  });

  app.get("/api/routes", async (req, res) => {
    const { state, surface, type, city, limit } = req.query;
    const routes = await storage.getRoutes({
      state: state as string | undefined,
      surface: surface as string | undefined,
      type: type as string | undefined,
      city: city as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(routes);
  });

  app.get("/api/routes/:slug", async (req, res) => {
    const route = await storage.getRouteBySlug(req.params.slug);
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  });

  app.get("/api/collections", async (req, res) => {
    const { type, limit } = req.query;
    const collectionsList = await storage.getCollections({
      type: type as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(collectionsList);
  });

  app.get("/api/collections/:slug", async (req, res) => {
    const collection = await storage.getCollectionBySlug(req.params.slug);
    if (!collection) return res.status(404).json({ message: "Collection not found" });
    res.json(collection);
  });

  app.get("/api/influencers", async (req, res) => {
    const { limit } = req.query;
    const list = await storage.getInfluencers({ limit: limit ? parseInt(limit as string) : undefined });
    res.json(list);
  });

  app.get("/api/influencers/:slug", async (req, res) => {
    const influencer = await storage.getInfluencerBySlug(req.params.slug);
    if (!influencer) return res.status(404).json({ message: "Influencer not found" });
    res.json(influencer);
  });

  app.get("/api/podcasts", async (req, res) => {
    const { category, limit } = req.query;
    const list = await storage.getPodcasts({
      category: category as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(list);
  });

  app.get("/api/podcasts/:slug", async (req, res) => {
    const podcast = await storage.getPodcastBySlug(req.params.slug);
    if (!podcast) return res.status(404).json({ message: "Podcast not found" });
    res.json(podcast);
  });

  app.get("/api/books", async (req, res) => {
    const { category, limit } = req.query;
    const list = await storage.getBooks({
      category: category as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(list);
  });

  app.get("/api/books/:slug", async (req, res) => {
    const book = await storage.getBookBySlug(req.params.slug);
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  });

  const weatherCache = new Map<string, { data: any; expires: number }>();

  const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

  async function geocodeCity(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
    const key = `${city},${state}`;
    if (geocodeCache.has(key)) return geocodeCache.get(key) || null;

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`
      );
      const geo = await geoRes.json();
      if (geo.results?.length > 0) {
        const usResult = geo.results.find((r: any) => r.country_code === "US");
        const pick = usResult || geo.results[0];
        const result = { lat: pick.latitude, lng: pick.longitude };
        geocodeCache.set(key, result);
        return result;
      }
    } catch {}
    geocodeCache.set(key, null);
    return null;
  }

  app.get("/api/weather", async (req, res) => {
    const { lat, lng, date, city, state } = req.query;
    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    let latitude = lat ? parseFloat(lat as string) : undefined;
    let longitude = lng ? parseFloat(lng as string) : undefined;

    if ((!latitude || !longitude) && city && state) {
      const coords = await geocodeCity(city as string, state as string);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }

    if (!latitude || !longitude) {
      return res.json({ type: "unavailable" });
    }

    const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)},${date}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return res.json(cached.data);
    }

    try {
      const raceDate = new Date(date as string);
      const now = new Date();
      const daysUntil = Math.ceil((raceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let result: any;

      if (daysUntil >= 0 && daysUntil <= 15) {
        const forecastRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=16`
        );
        const forecast = await forecastRes.json();

        const dateStr = (date as string).substring(0, 10);
        const idx = forecast.daily?.time?.indexOf(dateStr);

        if (idx !== undefined && idx >= 0) {
          result = {
            type: "forecast",
            date: dateStr,
            tempHigh: Math.round(forecast.daily.temperature_2m_max[idx]),
            tempLow: Math.round(forecast.daily.temperature_2m_min[idx]),
            precipProbability: forecast.daily.precipitation_probability_max[idx],
            precipAmount: forecast.daily.precipitation_sum[idx],
            windSpeed: Math.round(forecast.daily.wind_speed_10m_max[idx]),
            weatherCode: forecast.daily.weather_code[idx],
          };
        }
      }

      if (!result) {
        const month = raceDate.getMonth() + 1;
        const day = raceDate.getDate();
        const startDate = `${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
        const endDay = new Date(raceDate);
        endDay.setDate(endDay.getDate() + 1);
        const endDate = `${(endDay.getMonth() + 1).toString().padStart(2, "0")}-${endDay.getDate().toString().padStart(2, "0")}`;

        const climateRes = await fetch(
          `https://climate-api.open-meteo.com/v1/climate?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&start_date=2020-01-01&end_date=2024-12-31&models=EC_Earth3P_HR`
        );
        const climate = await climateRes.json();

        if (climate.daily?.time) {
          const targetMonth = raceDate.getMonth();
          const targetDay = raceDate.getDate();
          let tempHighSum = 0, tempLowSum = 0, precipSum = 0, windSum = 0, count = 0;

          climate.daily.time.forEach((t: string, i: number) => {
            const d = new Date(t);
            if (d.getMonth() === targetMonth && Math.abs(d.getDate() - targetDay) <= 7) {
              tempHighSum += climate.daily.temperature_2m_max[i] || 0;
              tempLowSum += climate.daily.temperature_2m_min[i] || 0;
              precipSum += climate.daily.precipitation_sum[i] || 0;
              windSum += climate.daily.wind_speed_10m_max[i] || 0;
              count++;
            }
          });

          if (count > 0) {
            result = {
              type: "historical",
              date: (date as string).substring(0, 10),
              tempHigh: Math.round(tempHighSum / count),
              tempLow: Math.round(tempLowSum / count),
              precipAmount: Math.round((precipSum / count) * 100) / 100,
              windSpeed: Math.round(windSum / count),
            };
          }
        }
      }

      if (!result) {
        return res.json({ type: "unavailable" });
      }

      weatherCache.set(cacheKey, { data: result, expires: Date.now() + 1000 * 60 * 30 });
      if (weatherCache.size > 500) {
        const firstKey = weatherCache.keys().next().value;
        if (firstKey) weatherCache.delete(firstKey);
      }

      res.json(result);
    } catch (err) {
      console.error("Weather API error:", err);
      res.json({ type: "unavailable" });
    }
  });

  app.get("/api/elevation-profile", async (req, res) => {
    const { lat, lng, city, state } = req.query;
    if (!lat && !city) {
      return res.status(400).json({ error: "lat/lng or city/state required" });
    }

    let latitude = lat ? parseFloat(lat as string) : undefined;
    let longitude = lng ? parseFloat(lng as string) : undefined;

    if ((!latitude || !longitude) && city && state) {
      const coords = await geocodeCity(city as string, state as string);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }

    if (!latitude || !longitude) {
      return res.json({ type: "unavailable" });
    }

    const cacheKey = `elev_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return res.json(cached.data);
    }

    try {
      const points = 20;
      const spread = 0.05;
      const lats: number[] = [];
      const lngs: number[] = [];
      for (let i = 0; i < points; i++) {
        const t = i / (points - 1);
        const angle = t * Math.PI * 2;
        lats.push(latitude + Math.sin(angle) * spread * (0.5 + t * 0.5));
        lngs.push(longitude + Math.cos(angle) * spread * (0.5 + t * 0.5));
      }

      const elevRes = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(",")}&longitude=${lngs.join(",")}`
      );
      const elevData = await elevRes.json();

      if (elevData.elevation) {
        const profile = elevData.elevation.map((elev: number, i: number) => ({
          mile: Math.round((i / (points - 1)) * 100) / 10,
          elevation: Math.round(elev * 3.281),
        }));

        const result = { type: "available", profile };
        weatherCache.set(cacheKey, { data: result, expires: Date.now() + 1000 * 60 * 60 });
        res.json(result);
      } else {
        res.json({ type: "unavailable" });
      }
    } catch (err) {
      console.error("Elevation API error:", err);
      res.json({ type: "unavailable" });
    }
  });

  const adminAuth = (req: any, res: any, next: any) => {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) {
      return res.status(503).json({ error: "Admin API not configured" });
    }
    if (req.headers["x-admin-key"] !== adminKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  app.get("/api/admin/stats", adminAuth, async (_req, res) => {
    const raceCount = await storage.getRaceCount();
    const routeCount = await storage.getRouteCount();
    const sourcesList = await storage.getSources();
    res.json({ raceCount, routeCount, sources: sourcesList });
  });

  app.post("/api/admin/ingest/races", adminAuth, async (req, res) => {
    const { states: stateFilter, startDate, endDate } = req.body || {};

    res.json({ status: "started", message: "Race ingestion started in background" });

    setImmediate(async () => {
      try {
        const result = await refreshRaceData({
          states: stateFilter,
          startDate,
          endDate,
        });
        console.log("Ingestion complete:", JSON.stringify(result));
      } catch (err) {
        console.error("Ingestion failed:", err);
      }
    });
  });

  app.post("/api/admin/ingest/races/state/:state", adminAuth, async (req, res) => {
    const stateAbbr = req.params.state.toUpperCase();
    const { startDate, endDate } = req.body || {};

    try {
      const records = await fetchRacesByState(stateAbbr, {
        startDate,
        endDate,
      });

      const { processRaceImport } = await import("./ingestion/pipeline");
      const result = await processRaceImport(records);

      res.json({
        state: stateAbbr,
        totalFetched: records.length,
        ...result,
      });
    } catch (err) {
      console.error(`Ingestion error for ${stateAbbr}:`, err);
      res.status(500).json({ error: "Ingestion failed", details: String(err) });
    }
  });

  const validItemTypes = ["race", "route"];

  app.get("/api/reviews", async (req, res) => {
    const { itemType, itemId } = req.query;
    if (!itemType || !itemId || !validItemTypes.includes(itemType as string) || isNaN(parseInt(itemId as string))) {
      return res.status(400).json({ message: "Valid itemType (race/route) and numeric itemId are required" });
    }
    const reviewsList = await storage.getReviews(itemType as string, parseInt(itemId as string));
    res.json(reviewsList);
  });

  app.get("/api/reviews/summary", async (req, res) => {
    const { itemType, itemId } = req.query;
    if (!itemType || !itemId || !validItemTypes.includes(itemType as string) || isNaN(parseInt(itemId as string))) {
      return res.status(400).json({ message: "Valid itemType (race/route) and numeric itemId are required" });
    }
    const summary = await storage.getReviewSummary(itemType as string, parseInt(itemId as string));
    res.json(summary);
  });

  app.get("/api/reviews/mine", requireAuth, async (req, res) => {
    const { itemType, itemId } = req.query;
    if (!itemType || !itemId || !validItemTypes.includes(itemType as string) || isNaN(parseInt(itemId as string))) {
      return res.status(400).json({ message: "Valid itemType (race/route) and numeric itemId are required" });
    }
    const review = await storage.getUserReview(req.session.userId!, itemType as string, parseInt(itemId as string));
    res.json(review || null);
  });

  app.post("/api/reviews", requireAuth, async (req, res) => {
    const { itemType, itemId, rating, comment } = req.body;
    if (!itemType || !itemId || rating === undefined || rating === null) {
      return res.status(400).json({ message: "itemType, itemId, and rating are required" });
    }
    const parsedRating = parseInt(rating);
    const parsedItemId = parseInt(itemId);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }
    if (isNaN(parsedItemId)) {
      return res.status(400).json({ message: "itemId must be a valid number" });
    }
    if (!validItemTypes.includes(itemType)) {
      return res.status(400).json({ message: "itemType must be 'race' or 'route'" });
    }
    const existing = await storage.getUserReview(req.session.userId!, itemType, parsedItemId);
    if (existing) {
      const updated = await storage.updateReview(existing.id, req.session.userId!, parsedRating, comment);
      return res.json(updated);
    }
    const review = await storage.createReview(req.session.userId!, itemType, parsedItemId, parsedRating, comment);
    res.status(201).json(review);
  });

  app.delete("/api/reviews/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteReview(id, req.session.userId!);
    res.json({ success: true });
  });

  const optStr = z.string().optional();
  const optBool = z.preprocess(v => v === "true" || v === true ? true : v === "false" || v === false ? false : undefined, z.boolean().optional());
  const optInt = z.preprocess(v => v == null || v === "" ? undefined : Number(v), z.number().int().optional());

  const raceSearchSchema = z.object({
    state: optStr,
    city: optStr,
    cityId: optInt,
    distance: optStr,
    distances: z.union([z.string(), z.array(z.string())]).optional().transform(v => v == null ? undefined : Array.isArray(v) ? v : v.split(",").filter(Boolean)),
    surface: optStr,
    terrain: optStr,
    year: optInt,
    month: optInt,
    dateFrom: optStr,
    dateTo: optStr,
    priceMin: optInt,
    priceMax: optInt,
    minBeginnerScore: optInt,
    minPrScore: optInt,
    minValueScore: optInt,
    minVibeScore: optInt,
    minFamilyScore: optInt,
    walkerFriendly: optBool,
    strollerFriendly: optBool,
    dogFriendly: optBool,
    kidsRace: optBool,
    charity: optBool,
    bostonQualifier: optBool,
    isTurkeyTrot: optBool,
    vibeTag: optStr,
    registrationOpen: optBool,
    priceIncreaseSoon: optBool,
    transitFriendly: optBool,
    organizerId: optInt,
    seriesId: optInt,
    lat: z.preprocess(v => v == null || v === "" ? undefined : Number(v), z.number().optional()),
    lng: z.preprocess(v => v == null || v === "" ? undefined : Number(v), z.number().optional()),
    radiusMiles: z.preprocess(v => v == null || v === "" ? undefined : Number(v), z.number().optional()),
    sort: z.enum(["date", "price", "beginner", "pr", "value", "vibe", "family", "urgency", "quality"]).optional(),
    limit: optInt,
    offset: optInt,
  });

  function parseRaceFilters(req: Request): RaceSearchFilters {
    const parsed = raceSearchSchema.parse(req.query);
    const { lat, lng, radiusMiles, ...rest } = parsed;
    const filters: RaceSearchFilters = { ...rest };
    if (lat != null && lng != null) {
      filters.near = { lat, lng, radiusMiles: radiusMiles ?? 50 };
    }
    return filters;
  }

  app.get("/api/races/search", async (req, res) => {
    try {
      const filters = parseRaceFilters(req);
      const results = await storage.getRacesAdvanced(filters);
      res.json(results);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid filters", errors: err.errors });
      }
      console.error("Race search error:", err);
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get("/api/races/compare", async (req, res) => {
    const idsParam = (req.query.ids as string) || "";
    const ids = idsParam.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (ids.length < 2 || ids.length > 4) {
      return res.status(400).json({ message: "Provide 2 to 4 race ids in ids=1,2,3" });
    }
    const list = await storage.getRacesByIds(ids);
    const ordered = ids.map(id => list.find(r => r.id === id)).filter(Boolean);
    res.json(ordered);
  });

  app.get("/api/races/this-weekend", async (req, res) => {
    const state = (req.query.state as string) || undefined;
    const list = await storage.getRacesThisWeekend(state);
    res.json(list);
  });

  app.get("/api/races/price-increase-soon", async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 14;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
    const list = await storage.getPriceIncreasingSoon(days, limit);
    res.json(list);
  });

  const shopperSchema = z.object({
    goal: z.enum(["beginner", "pr", "value", "vibe", "family", "urgency"]).default("beginner"),
    distance: z.string().optional(),
    distances: z.array(z.string()).optional(),
    state: z.string().optional(),
    terrain: z.string().optional(),
    surface: z.string().optional(),
    difficulty: z.enum(["easy", "moderate", "hard"]).optional(),
    radiusMiles: z.number().int().positive().max(5000).optional(),
    near: z.object({ lat: z.number(), lng: z.number(), radiusMiles: z.number().optional() }).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    budget: z.number().int().optional(),
    walkerFriendly: z.boolean().optional(),
    strollerFriendly: z.boolean().optional(),
    dogFriendly: z.boolean().optional(),
    kidsRace: z.boolean().optional(),
    charity: z.boolean().optional(),
    bostonQualifier: z.boolean().optional(),
    limit: z.number().int().optional(),
  });

  app.post("/api/races/shopper", async (req, res) => {
    try {
      const input = shopperSchema.parse(req.body || {});
      const sortKey = input.goal as RaceSearchFilters["sort"];
      const filters: RaceSearchFilters = {
        sort: sortKey,
        distance: input.distance,
        distances: input.distances,
        state: input.state,
        terrain: input.terrain,
        surface: input.surface,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        priceMax: input.budget,
        walkerFriendly: input.walkerFriendly,
        strollerFriendly: input.strollerFriendly,
        dogFriendly: input.dogFriendly,
        kidsRace: input.kidsRace,
        charity: input.charity,
        bostonQualifier: input.bostonQualifier,
        limit: input.limit ?? 20,
      };
      if (input.near) {
        filters.near = { lat: input.near.lat, lng: input.near.lng, radiusMiles: input.near.radiusMiles ?? input.radiusMiles ?? 100 };
      } else if (input.radiusMiles && input.state) {
        // Derive a coarse centroid from the picked state so the radius actually filters.
        const centroid = getStateCentroid(input.state);
        if (centroid) {
          filters.near = { lat: centroid.lat, lng: centroid.lng, radiusMiles: input.radiusMiles };
        }
      }
      switch (input.goal) {
        case "beginner": filters.minBeginnerScore = 40; break;
        case "pr": filters.minPrScore = 40; break;
        case "value": filters.minValueScore = 40; break;
        case "vibe": filters.minVibeScore = 40; break;
        case "family": filters.minFamilyScore = 40; break;
      }
      // Difficulty heuristic: nudge score thresholds when user specifies effort level
      if (input.difficulty === "easy") {
        filters.minBeginnerScore = Math.max(filters.minBeginnerScore ?? 0, 55);
      } else if (input.difficulty === "hard") {
        filters.minPrScore = Math.max(filters.minPrScore ?? 0, 50);
      }
      const results = await storage.getRacesAdvanced(filters);
      res.json({ goal: input.goal, count: results.length, races: results });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      console.error("Shopper error:", err);
      res.status(500).json({ message: "Shopper failed" });
    }
  });

  app.get("/api/races/:slug/scores", async (req, res) => {
    const race = await storage.getRaceBySlug(req.params.slug);
    if (!race) return res.status(404).json({ message: "Race not found" });
    let scores;
    if (race.scoresUpdatedAt && race.beginnerScore != null) {
      scores = {
        beginnerScore: race.beginnerScore,
        prScore: race.prScore,
        valueScore: race.valueScore,
        vibeScore: race.vibeScore,
        familyScore: race.familyScore,
        urgencyScore: race.urgencyScore,
        scoreBreakdown: race.scoreBreakdown,
      };
    } else {
      const computed = computeRaceScores(race);
      scores = computed;
    }
    res.json({ raceId: race.id, slug: race.slug, ...scores });
  });

  app.get("/api/races/:slug/similar", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
    const list = await storage.getSimilarRaces(req.params.slug, limit);
    res.json(list);
  });

  app.get("/api/organizers", async (req, res) => {
    const { state, verified, limit } = req.query;
    const list = await storage.getOrganizers({
      state: state as string | undefined,
      isVerified: verified === "true" ? true : verified === "false" ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(list);
  });

  app.get("/api/organizers/:slug", async (req, res, next) => {
    // Reserve `me` for the authenticated dashboard endpoint registered later.
    if (req.params.slug === "me") return next();
    const org = await storage.getOrganizerBySlug(req.params.slug);
    if (!org) return res.status(404).json({ message: "Organizer not found" });
    const races = await storage.getRacesByOrganizer(org.id);
    res.json({ organizer: org, races });
  });

  app.get("/api/series", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const list = await storage.getRaceSeries({ limit });
    res.json(list);
  });

  app.get("/api/series/:slug", async (req, res) => {
    const series = await storage.getRaceSeriesBySlug(req.params.slug);
    if (!series) return res.status(404).json({ message: "Series not found" });
    const races = await storage.getRacesBySeries(series.id);
    res.json({ series, races });
  });

  app.get("/api/metros/:slug", async (req, res) => {
    const metro = await storage.getCityByMetroSlug(req.params.slug);
    if (!metro) return res.status(404).json({ message: "Metro not found" });
    res.json({ city: metro, state: metro.state });
  });

  app.post("/api/organizers", adminAuth, async (req, res) => {
    try {
      const data = insertOrganizerSchema.parse(req.body);
      const org = await storage.createOrganizer(data);
      res.status(201).json(org);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      console.error("Create organizer error:", err);
      res.status(500).json({ message: "Failed to create organizer" });
    }
  });

  app.patch("/api/organizers/:slug", adminAuth, async (req, res, next) => {
    if (req.params.slug === "me") return next();
    const org = await storage.getOrganizerBySlug(req.params.slug);
    if (!org) return res.status(404).json({ message: "Organizer not found" });
    const updated = await storage.updateOrganizer(org.id, req.body);
    res.json(updated);
  });

  const claimSchema = z.object({
    raceSlug: z.string(),
    claimerEmail: z.string().email(),
    claimerName: z.string().optional(),
    claimerRole: z.string().optional(),
    message: z.string().max(2000).optional(),
  });

  // Domain-match verification: an email like alice@brooklynmarathon.com that
  // claims a race whose website is https://www.brooklynmarathon.com is treated
  // as proof of ownership and skips the manual email round-trip. We rely on the
  // Public Suffix List (via tldts) to compute the eTLD+1 (registrable domain),
  // so multi-part suffixes like co.uk / com.au / github.io are handled
  // correctly — alice@evil.co.uk does NOT match victim.co.uk.
  function extractRegistrableHost(host: string | null | undefined): string | null {
    if (!host) return null;
    const h = host.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
    if (!h) return null;
    // tldts.getDomain returns the eTLD+1 (e.g. "example.co.uk") or null when
    // the input is an IP, an ICANN public suffix itself, or otherwise has no
    // registrable parent. Returning null here causes the domain-match check
    // below to fail-closed.
    const domain = tldtsGetDomain(h, { allowPrivateDomains: true });
    return domain || null;
  }
  function emailDomainMatchesRace(email: string, race: { website?: string | null; registrationUrl?: string | null }): boolean {
    const at = email.lastIndexOf("@");
    if (at < 0) return false;
    const emailHost = extractRegistrableHost(email.slice(at + 1));
    if (!emailHost) return false;
    const candidates: (string | null | undefined)[] = [race.website, race.registrationUrl];
    for (const c of candidates) {
      let host: string | null = null;
      try { if (c) host = new URL(c).hostname; } catch { host = null; }
      const reg = extractRegistrableHost(host);
      if (reg && reg === emailHost) return true;
    }
    return false;
  }

  async function handleClaimSubmission(raceSlug: string, body: unknown, req: Request, res?: Response): Promise<{ status: number; payload: object }> {
    try {
      const input = claimSchema.parse({ ...(body as object), raceSlug });
      const race = await storage.getRaceBySlug(input.raceSlug);
      if (!race) return { status: 404, payload: { message: "Race not found" } };

      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Domain-match auto-approval: ONLY trust this when the requester is
      // already signed into the site via the existing magic-link flow, AND we
      // compare the registrable domain of their *server-known* email (not the
      // form input). Otherwise an attacker could claim any race by typing
      // admin@therace.com into the form. Anonymous claimers always go through
      // the email-link path so we have proof they own the inbox.
      let verifiedSessionEmail: string | null = null;
      if (req.session?.userId) {
        try {
          const sessUser = await storage.getUserById(req.session.userId);
          if (sessUser?.email) verifiedSessionEmail = sessUser.email.toLowerCase();
        } catch (err) {
          console.error("[claim] session user lookup failed:", err);
        }
      }
      const domainMatched = !!verifiedSessionEmail && emailDomainMatchesRace(verifiedSessionEmail, race);

      const claimData: InsertRaceClaim = {
        raceId: race.id,
        organizerId: race.organizerId ?? null,
        // When the high-trust path is taken we record the verified session
        // email (which we know is real) instead of the form input, so the
        // organizer link is created against the right account.
        claimerEmail: (domainMatched && verifiedSessionEmail ? verifiedSessionEmail : input.claimerEmail).toLowerCase(),
        claimerName: input.claimerName,
        claimerRole: input.claimerRole,
        message: input.message,
        verificationToken,
        status: "pending",
      };
      const claim = await storage.createRaceClaim(claimData);

      if (domainMatched) {
        const result = await storage.completeClaimVerification(verificationToken);
        if (!("error" in result) && res) {
          req.session.userId = result.user.id;
          return {
            status: 200,
            payload: {
              message: "Verified instantly via your email domain. Welcome to the dashboard.",
              claimId: claim.id,
              verifiedVia: "domain-match",
              autoSignedIn: true,
              redirect: "/organizers/dashboard",
              organizer: { id: result.organizer.id, slug: result.organizer.slug, name: result.organizer.name },
            },
          };
        }
        // If completion failed (e.g., race already owned), fall through to email path.
      }

      // Always send the verification token to the email recorded on the claim
      // row. That way ownership proof is "received the token at this exact
      // address" — never to a different mailbox the requester didn't enter.
      const baseUrl = getTrustedBaseUrl(req);
      sendClaimVerificationEmail(claimData.claimerEmail, race.name, race.city, race.state, verificationToken, baseUrl).catch((err) => {
        console.error("[claim] verification email failed:", err);
      });

      return {
        status: 201,
        payload: {
          message: "Almost there — we sent a verification link to your email. Click it to unlock the organizer dashboard.",
          claimId: claim.id,
          verifiedVia: "email-link",
        },
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return { status: 400, payload: { message: "Invalid input", errors: err.errors } };
      }
      console.error("Claim error:", err);
      return { status: 500, payload: { message: "Claim failed" } };
    }
  }

  // Simple in-memory rate limiter for claim/verification endpoints to prevent
  // an attacker from spamming verification emails. Keys are bucketed by IP and
  // by claimer email; we keep a sliding 1-hour window per key.
  const claimRateLimit = new Map<string, number[]>();
  const CLAIM_WINDOW_MS = 60 * 60 * 1000;
  const CLAIM_MAX_PER_IP = 10;
  const CLAIM_MAX_PER_EMAIL = 3;
  function takeRateSlot(key: string, max: number): boolean {
    const now = Date.now();
    const arr = (claimRateLimit.get(key) || []).filter((t) => now - t < CLAIM_WINDOW_MS);
    if (arr.length >= max) {
      claimRateLimit.set(key, arr);
      return false;
    }
    arr.push(now);
    claimRateLimit.set(key, arr);
    return true;
  }

  app.post("/api/races/:slug/claim", async (req, res) => {
    const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()) || req.ip || "unknown";
    const emailFromBody = typeof req.body?.claimerEmail === "string" ? req.body.claimerEmail.trim().toLowerCase() : "";
    if (!takeRateSlot(`ip:${ip}`, CLAIM_MAX_PER_IP)) {
      return res.status(429).json({ message: "Too many claim attempts. Please try again later." });
    }
    if (emailFromBody && !takeRateSlot(`email:${emailFromBody}`, CLAIM_MAX_PER_EMAIL)) {
      return res.status(429).json({ message: "We've sent several verification links to this email recently. Please check your inbox or try again in an hour." });
    }
    const { status, payload } = await handleClaimSubmission(req.params.slug, req.body, req, res);
    res.status(status).json(payload);
  });

  app.get("/api/race-claims/verify", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) return res.status(400).json({ message: "Missing token" });
    const result = await storage.completeClaimVerification(token);
    if ("error" in result) return res.status(400).json({ message: result.error });

    req.session.userId = result.user.id;
    res.json({
      ok: true,
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      organizer: { id: result.organizer.id, slug: result.organizer.slug, name: result.organizer.name },
      race: { id: result.race.id, slug: result.race.slug, name: result.race.name },
    });
  });

  app.post("/api/organizers/:slug/claim", async (req, res) => {
    const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()) || req.ip || "unknown";
    const emailFromBody = typeof req.body?.claimerEmail === "string" ? req.body.claimerEmail.trim().toLowerCase() : "";
    if (!takeRateSlot(`ip:${ip}`, CLAIM_MAX_PER_IP)) {
      return res.status(429).json({ message: "Too many claim attempts. Please try again later." });
    }
    if (emailFromBody && !takeRateSlot(`email:${emailFromBody}`, CLAIM_MAX_PER_EMAIL)) {
      return res.status(429).json({ message: "We've sent several verification links to this email recently. Please check your inbox or try again in an hour." });
    }
    try {
      const organizer = await storage.getOrganizerBySlug(req.params.slug);
      if (!organizer) {
        res.status(404).json({ message: "Organizer not found" });
        return;
      }
      let raceSlug: string;
      const bodyRaceSlug = req.body && typeof req.body.raceSlug === "string" ? req.body.raceSlug.trim() : "";
      if (bodyRaceSlug) {
        const race = await storage.getRaceBySlug(bodyRaceSlug);
        if (!race || race.organizerId !== organizer.id) {
          res.status(400).json({ message: "raceSlug does not belong to this organizer" });
          return;
        }
        raceSlug = bodyRaceSlug;
      } else {
        const orgRaces = await storage.getRacesByOrganizer(organizer.id);
        if (orgRaces.length === 0) {
          res.status(400).json({ message: "Organizer has no races to claim. Provide raceSlug in body." });
          return;
        }
        raceSlug = orgRaces[0].slug;
      }
      const { status, payload } = await handleClaimSubmission(raceSlug, req.body, req, res);
      res.status(status).json(payload);
    } catch (err) {
      console.error("Organizer claim error:", err);
      res.status(500).json({ message: "Claim failed" });
    }
  });

  app.get("/api/admin/claims", adminAuth, async (req, res) => {
    const status = (req.query.status as string) || "pending";
    const list = await storage.getRaceClaimsByStatus(status, 100);
    res.json(list);
  });

  app.post("/api/admin/claims/:id/approve", adminAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const { organizerId, note } = req.body || {};
    if (!organizerId) return res.status(400).json({ message: "organizerId required" });
    await storage.approveRaceClaim(id, parseInt(organizerId), note);
    res.json({ ok: true });
  });

  app.post("/api/admin/claims/:id/reject", adminAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const { note } = req.body || {};
    await storage.rejectRaceClaim(id, note);
    res.json({ ok: true });
  });

  // ───────── Organizer self-serve dashboard ─────────

  async function requireOrganizer(req: Request, res: Response): Promise<{ userId: number; organizerId: number; organizer: import("@shared/schema").Organizer } | null> {
    if (!req.session?.userId) {
      res.status(401).json({ message: "Authentication required" });
      return null;
    }
    const organizer = await storage.getOrganizerForUser(req.session.userId);
    if (!organizer) {
      res.status(403).json({ message: "Organizer access required. Claim a race to get started." });
      return null;
    }
    return { userId: req.session.userId, organizerId: organizer.id, organizer };
  }

  app.get("/api/organizers/me", async (req, res) => {
    const ctx = await requireOrganizer(req, res);
    if (!ctx) return;
    const races = await storage.getRacesEditableByUser(ctx.userId);
    res.json({ organizer: ctx.organizer, races });
  });

  const faqEntrySchema = z.object({ q: z.string().min(1).max(200), a: z.string().min(1).max(2000) });
  const editableRaceSchema = z.object({
    registrationUrl: z.string().url().nullable().optional(),
    website: z.string().url().nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    startTime: z.string().max(40).nullable().optional(),
    timeLimit: z.string().max(40).nullable().optional(),
    priceMin: z.number().int().nonnegative().nullable().optional(),
    priceMax: z.number().int().nonnegative().nullable().optional(),
    registrationOpen: z.boolean().nullable().optional(),
    registrationDeadline: z.string().max(40).nullable().optional(),
    nextPriceIncreaseAt: z.string().max(40).nullable().optional(),
    nextPriceIncreaseAmount: z.number().int().nonnegative().nullable().optional(),
    courseMapUrl: z.string().url().nullable().optional(),
    elevationProfileUrl: z.string().url().nullable().optional(),
    courseType: z.string().max(40).nullable().optional(),
    terrain: z.string().max(40).nullable().optional(),
    elevationGainM: z.number().int().nonnegative().nullable().optional(),
    fieldSize: z.number().int().nonnegative().nullable().optional(),
    refundPolicy: z.string().max(2000).nullable().optional(),
    deferralPolicy: z.string().max(2000).nullable().optional(),
    packetPickup: z.string().max(2000).nullable().optional(),
    parkingNotes: z.string().max(2000).nullable().optional(),
    transitFriendly: z.boolean().nullable().optional(),
    walkerFriendly: z.boolean().nullable().optional(),
    strollerFriendly: z.boolean().nullable().optional(),
    dogFriendly: z.boolean().nullable().optional(),
    kidsRace: z.boolean().nullable().optional(),
    charity: z.boolean().nullable().optional(),
    charityPartner: z.string().max(160).nullable().optional(),
    vibeTags: z.array(z.string().max(40)).max(20).optional(),
    couponCode: z.string().max(40).nullable().optional(),
    couponDiscount: z.string().max(80).nullable().optional(),
    couponExpiresAt: z.string().max(40).nullable().optional(),
    photoUrls: z.array(z.string().url()).max(20).optional(),
    faq: z.array(faqEntrySchema).max(30).nullable().optional(),
  });

  app.patch("/api/organizers/me/races/:id", async (req, res) => {
    const ctx = await requireOrganizer(req, res);
    if (!ctx) return;
    const raceId = parseInt(req.params.id, 10);
    if (!Number.isFinite(raceId)) return res.status(400).json({ message: "Invalid race id" });
    const owned = await storage.getRaceForOrganizerUser(raceId, ctx.userId);
    if (!owned) return res.status(404).json({ message: "Race not found" });
    try {
      const partial = editableRaceSchema.parse(req.body ?? {});
      const updated = await storage.updateRaceContent(raceId, ctx.organizerId, partial as Partial<Race>);
      if (!updated) return res.status(400).json({ message: "Nothing to update" });
      res.json({ ok: true, race: updated });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: err.errors });
      console.error("[organizer] update race failed:", err);
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.get("/api/organizers/me/races/:id/analytics", async (req, res) => {
    const ctx = await requireOrganizer(req, res);
    if (!ctx) return;
    const raceId = parseInt(req.params.id, 10);
    if (!Number.isFinite(raceId)) return res.status(400).json({ message: "Invalid race id" });
    const owned = await storage.getRaceForOrganizerUser(raceId, ctx.userId);
    if (!owned) return res.status(404).json({ message: "Race not found" });
    const days = Math.max(1, Math.min(180, parseInt(String(req.query.days || "30"), 10) || 30));
    const data = await storage.getRaceAnalytics(raceId, days);
    res.json({ days, ...data });
  });

  const featuredRequestSchema = z.object({
    plan: z.enum(["featured", "premium"]).default("featured"),
    durationDays: z.number().int().min(7).max(365).default(30),
    message: z.string().max(2000).optional(),
    contactEmail: z.string().email().optional(),
  });

  app.post("/api/organizers/me/races/:id/feature", async (req, res) => {
    const ctx = await requireOrganizer(req, res);
    if (!ctx) return;
    const raceId = parseInt(req.params.id, 10);
    if (!Number.isFinite(raceId)) return res.status(400).json({ message: "Invalid race id" });
    const owned = await storage.getRaceForOrganizerUser(raceId, ctx.userId);
    if (!owned) return res.status(404).json({ message: "Race not found" });
    try {
      const input = featuredRequestSchema.parse(req.body ?? {});
      const me = await storage.getUserById(ctx.userId);
      const data: InsertFeaturedRequest = {
        raceId,
        organizerId: ctx.organizerId,
        userId: ctx.userId,
        contactEmail: (input.contactEmail || me?.email || ctx.organizer.email || "").toLowerCase(),
        message: input.message ?? null,
        plan: input.plan,
        durationDays: input.durationDays,
        status: "pending",
        adminNote: null,
      };
      if (!data.contactEmail) return res.status(400).json({ message: "contactEmail required" });
      const created = await storage.createFeaturedRequest(data);
      sendFeaturedRequestAdminNotification(
        owned.name, owned.slug, ctx.organizer.name, data.contactEmail,
        input.plan, input.durationDays, input.message ?? null, created.id,
      ).catch((err) => console.error("[featured] admin notify failed:", err));
      res.status(201).json({
        ok: true,
        request: created,
        message: "Thanks! Our team will review your featured listing request and email you within 2 business days.",
      });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: err.errors });
      console.error("[featured] request failed:", err);
      res.status(500).json({ message: "Request failed" });
    }
  });

  app.get("/api/admin/featured/requests", adminAuth, async (_req, res) => {
    const list = await storage.getPendingFeaturedRequests(100);
    res.json(list);
  });

  app.post("/api/admin/featured/:id/approve", adminAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const days = Math.max(1, Math.min(365, parseInt(String(req.body?.durationDays || "30"), 10) || 30));
    const result = await storage.approveFeaturedRequest(id, days, typeof req.body?.note === "string" ? req.body.note : undefined);
    if (!result) return res.status(404).json({ message: "Request not found" });
    res.json({ ok: true, ...result });
  });

  app.post("/api/admin/featured/:id/reject", adminAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const updated = await storage.rejectFeaturedRequest(id, typeof req.body?.note === "string" ? req.body.note : undefined);
    if (!updated) return res.status(404).json({ message: "Request not found" });
    res.json({ ok: true, request: updated });
  });

  app.get("/api/featured/races", async (req, res) => {
    const cityId = req.query.cityId ? parseInt(String(req.query.cityId), 10) : undefined;
    const distance = typeof req.query.distance === "string" ? req.query.distance : undefined;
    const isTurkeyTrot = req.query.isTurkeyTrot === "true";
    const limit = req.query.limit ? Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 12)) : 12;
    const races = await storage.getFeaturedRaces({
      cityId: Number.isFinite(cityId) ? cityId : undefined,
      distance,
      isTurkeyTrot: isTurkeyTrot || undefined,
      limit,
    });
    res.json(races);
  });

  app.post("/api/races/:slug/view", async (req, res) => {
    try {
      const race = await storage.getRaceBySlug(req.params.slug);
      if (!race) return res.status(404).json({ ok: false });
      await storage.incrementRacePageView(race.id);
      res.json({ ok: true });
    } catch (err) {
      console.error("[view] failed:", err);
      res.status(500).json({ ok: false });
    }
  });

  app.get("/api/saved-searches", requireAuth, async (req, res) => {
    const list = await storage.getSavedSearches(req.session.userId!);
    res.json(list);
  });

  app.post("/api/saved-searches", requireAuth, async (req, res) => {
    try {
      const data = insertSavedSearchSchema.omit({ userId: true }).parse(req.body);
      const created = await storage.createSavedSearch({ ...data, userId: req.session.userId! });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      throw err;
    }
  });

  app.patch("/api/saved-searches/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const { alertEnabled } = req.body || {};
    if (typeof alertEnabled !== "boolean") return res.status(400).json({ message: "alertEnabled boolean required" });
    await storage.toggleSavedSearchAlert(id, req.session.userId!, alertEnabled);
    res.json({ ok: true });
  });

  app.delete("/api/saved-searches/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteSavedSearch(id, req.session.userId!);
    res.json({ ok: true });
  });

  app.get("/api/alerts", requireAuth, async (req, res) => {
    const list = await storage.getRaceAlertsWithRace(req.session.userId!);
    res.json(list);
  });

  app.post("/api/alerts", requireAuth, async (req, res) => {
    try {
      const data = insertRaceAlertSchema.omit({ userId: true }).parse(req.body);
      // Allowlist matches dispatcher coverage. `registration-open` is intentionally
      // omitted until a dispatcher exists (no `registrationOpensAt` source field yet).
      const allowed = new Set(["price-drop", "price-increase", "registration-close", "reg-close"]);
      if (!allowed.has(data.alertType)) {
        return res.status(400).json({ message: "Invalid alertType" });
      }
      const created = await storage.createRaceAlert({ ...data, userId: req.session.userId! });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      throw err;
    }
  });

  app.delete("/api/alerts/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteRaceAlert(id, req.session.userId!);
    res.json({ ok: true });
  });

  app.patch("/api/alerts/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    // Keep in sync with POST /api/alerts allowlist and scheduler dispatchers.
    const allowed = new Set(["price-drop", "price-increase", "registration-close"]);
    const alertType = typeof req.body?.alertType === "string" ? req.body.alertType : "";
    if (!allowed.has(alertType)) return res.status(400).json({ message: "Invalid alertType" });
    const updated = await storage.updateRaceAlertType(id, req.session.userId!, alertType);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  // ───────── Alert preferences, tracking, unsubscribe ─────────
  app.get("/api/alerts/preferences", requireAuth, async (req, res) => {
    const prefs = await storage.getUserAlertPrefs(req.session.userId!);
    res.json({
      unsubscribedAll: prefs?.unsubscribedAll ?? false,
      unsubscribedAlertTypes: prefs?.unsubscribedAlertTypes ?? [],
    });
  });

  const updatePrefsSchema = z.object({
    unsubscribedAll: z.boolean().optional(),
    unsubscribedAlertTypes: z.array(z.string()).optional(),
  });

  app.patch("/api/alerts/preferences", requireAuth, async (req, res) => {
    try {
      const data = updatePrefsSchema.parse(req.body);
      await storage.updateUserAlertPrefs(req.session.userId!, data);
      const prefs = await storage.getUserAlertPrefs(req.session.userId!);
      res.json({
        unsubscribedAll: prefs?.unsubscribedAll ?? false,
        unsubscribedAlertTypes: prefs?.unsubscribedAlertTypes ?? [],
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      throw err;
    }
  });

  // 1x1 transparent GIF for tracking pixel.
  const TRACKING_PIXEL = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64",
  );

  app.get("/api/alerts/track/open", async (req, res) => {
    const token = String(req.query.t || "");
    if (token) {
      try {
        await storage.markAlertOpened(token);
      } catch (err) {
        console.error("[alerts] open track failure", err);
      }
    }
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Content-Type", "image/gif");
    res.send(TRACKING_PIXEL);
  });

  app.get("/api/alerts/track/click", async (req, res) => {
    const token = String(req.query.t || "");
    const url = String(req.query.u || "");
    if (token) {
      try {
        await storage.markAlertClicked(token);
      } catch (err) {
        console.error("[alerts] click track failure", err);
      }
    }
    let dest = "/";
    if (url) {
      try {
        const decoded = decodeURIComponent(url);
        // Allow only same-origin paths starting with a single "/" (no protocol-relative "//"),
        // or absolute https://running.services URLs. Anything else falls back to "/".
        const safePath = decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.startsWith("/\\");
        let safeAbs = false;
        if (/^https?:\/\//i.test(decoded)) {
          try {
            const parsed = new URL(decoded);
            safeAbs = parsed.hostname === "running.services" || parsed.hostname.endsWith(".running.services");
          } catch {
            safeAbs = false;
          }
        }
        if (safePath || safeAbs) dest = decoded;
      } catch {
        dest = "/";
      }
    }
    res.set("Referrer-Policy", "no-referrer");
    res.redirect(302, dest);
  });

  app.get("/api/alerts/unsubscribe", async (req, res) => {
    const token = String(req.query.t || "");
    let label = "this alert";
    if (token) {
      try {
        const result = await storage.unsubscribeUserFromTokenAlertType(token);
        if (result) label = humanizeAlertType(result.alertType);
      } catch (err) {
        console.error("[alerts] unsub failure", err);
      }
    }
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:8vh auto;padding:0 24px;color:#111;line-height:1.5}h1{font-size:24px}a{color:#dc2626}</style>
</head><body>
<h1>You're unsubscribed</h1>
<p>You won't get more <strong>${escapeHtml(label)}</strong> emails. You can still manage every alert from your account.</p>
<p><a href="/alerts">Manage all alerts</a> &nbsp;·&nbsp; <a href="/">Back to running.services</a></p>
</body></html>`);
  });

  app.post("/api/alerts/unsubscribe", async (req, res) => {
    const token = String(req.query.t || req.body?.t || "");
    if (token) {
      try {
        await storage.unsubscribeUserFromTokenAlertType(token);
      } catch (err) {
        console.error("[alerts] one-click unsub failure", err);
      }
    }
    res.status(200).send("ok");
  });

  app.post("/api/admin/alerts/dispatch", adminAuth, async (_req, res) => {
    const { runAlertDispatch } = await import("./alerts/scheduler");
    try {
      const result = await runAlertDispatch({ force: true });
      res.json({ ok: true, result });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get("/api/admin/alerts/stats", adminAuth, async (req, res) => {
    const days = Math.min(180, Math.max(1, parseInt(String(req.query.days || "30"), 10) || 30));
    const stats = await storage.getDispatchStats(days);
    res.json({ days, stats });
  });

  const outboundSchema = z.object({
    raceId: z.number().int().optional(),
    organizerId: z.number().int().optional(),
    destination: z.enum(["registration", "website", "organizer", "course-map", "elevation", "results", "social"]),
    targetUrl: z.string().url(),
  });

  app.post("/api/outbound", async (req, res) => {
    try {
      const input = outboundSchema.parse(req.body);
      const clickData: InsertOutboundClick = {
        raceId: input.raceId ?? null,
        organizerId: input.organizerId ?? null,
        destination: input.destination,
        targetUrl: input.targetUrl,
        userId: req.session?.userId ?? null,
        sessionId: req.sessionID ?? null,
        referer: req.get("referer") ?? null,
        userAgent: req.get("user-agent") ?? null,
      };
      const click = await storage.recordOutboundClick(clickData);
      res.json({ ok: true, id: click.id });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      throw err;
    }
  });

  // Logged 302 redirect for register/website CTAs. Lets us put the click logger
  // in the link href itself (no JS required) and still send the user straight
  // to the organizer's site. We only allow http/https targets and validate the
  // destination tag against our enum so the URL can't be abused as an open
  // redirect to javascript: or data: URIs.
  const outboundDestinations = ["registration", "website", "organizer", "course-map", "elevation", "results", "social"] as const;
  app.get("/api/outbound/redirect", async (req, res) => {
    const url = typeof req.query.url === "string" ? req.query.url : "";
    const destination = typeof req.query.destination === "string" ? req.query.destination : "";
    const raceId = req.query.raceId ? parseInt(String(req.query.raceId), 10) : NaN;
    const organizerId = req.query.organizerId ? parseInt(String(req.query.organizerId), 10) : NaN;
    if (!url || !(outboundDestinations as readonly string[]).includes(destination)) {
      return res.status(400).send("Invalid redirect");
    }
    let parsed: URL;
    try { parsed = new URL(url); } catch { return res.status(400).send("Invalid url"); }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return res.status(400).send("Invalid protocol");
    }
    try {
      await storage.recordOutboundClick({
        raceId: Number.isFinite(raceId) ? raceId : null,
        organizerId: Number.isFinite(organizerId) ? organizerId : null,
        destination,
        targetUrl: url,
        userId: req.session?.userId ?? null,
        sessionId: req.sessionID ?? null,
        referer: req.get("referer") ?? null,
        userAgent: req.get("user-agent") ?? null,
      });
    } catch (err) {
      console.error("[outbound] redirect log failed:", err);
      // Don't block the redirect on logging failure.
    }
    res.redirect(302, parsed.toString());
  });

  app.get("/api/admin/outbound/stats/:raceId", adminAuth, async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const stats = await storage.getOutboundClickStats(parseInt(req.params.raceId), days);
    res.json(stats);
  });

  app.post("/api/admin/scoring/backfill", adminAuth, async (req, res) => {
    const force = req.query.force === "true";
    res.json({ status: "started", force });
    setImmediate(async () => {
      try {
        const result = await backfillRaceScores({ force });
        console.log("[scoring-backfill] complete:", result);
      } catch (err) {
        console.error("[scoring-backfill] failed:", err);
      }
    });
  });

  app.post("/api/admin/scoring/recompute-urgency", adminAuth, async (_req, res) => {
    res.json({ status: "started" });
    setImmediate(async () => {
      try {
        const result = await recomputeUrgencyScores();
        console.log("[urgency-recompute] complete:", result);
      } catch (err) {
        console.error("[urgency-recompute] failed:", err);
      }
    });
  });

  return httpServer;
}
