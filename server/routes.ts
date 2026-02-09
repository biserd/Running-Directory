import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { refreshRaceData } from "./ingestion/pipeline";
import { fetchRacesByState } from "./ingestion/runsignup";
import { sendMagicLinkEmail, sendAdminNewUserNotification } from "./email";
import crypto from "crypto";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
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

    const sent = await sendMagicLinkEmail(email.toLowerCase(), token);
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

  app.get("/api/races/:slug", async (req, res) => {
    const race = await storage.getRaceBySlug(req.params.slug);
    if (!race) return res.status(404).json({ message: "Race not found" });
    res.json(race);
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
    if (adminKey && req.headers["x-admin-key"] !== adminKey) {
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

  return httpServer;
}
