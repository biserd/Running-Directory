import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "./storage";
import {
  sendMonetizationRequestAdminNotification,
  sendApiKeyIssuedEmail,
} from "./email";
import {
  insertSponsorshipSchema,
  insertMonetizationRequestSchema,
  type Race,
} from "@shared/schema";

// -----------------------------------------------------------------
// Auth helpers
// -----------------------------------------------------------------

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function makeAdminAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) return res.status(503).json({ error: "Admin API not configured" });
    if (req.headers["x-admin-key"] !== adminKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };
}

// -----------------------------------------------------------------
// API key auth (for the public v1 read API)
// -----------------------------------------------------------------

async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const headerKey = (req.header("x-api-key") || req.header("X-API-Key") || "").trim();
  if (!headerKey) {
    return res.status(401).json({ error: "Missing X-API-Key header. Request a key at /developers." });
  }
  const apiKey = await storage.findApiKeyByPlaintext(headerKey);
  if (!apiKey) {
    return res.status(401).json({ error: "Invalid or revoked API key." });
  }
  const usage = await storage.recordApiKeyUsage(apiKey.id);
  res.setHeader("X-RateLimit-Limit", String(apiKey.monthlyLimit));
  res.setHeader("X-RateLimit-Remaining", String(usage.remaining));
  if (!usage.allowed) {
    return res.status(429).json({
      error: "Monthly request limit exceeded.",
      monthlyLimit: apiKey.monthlyLimit,
      tier: apiKey.tier,
    });
  }
  (req as Request & { apiKey?: typeof apiKey }).apiKey = apiKey;
  next();
}

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------

function pickRaceForApi(r: Race) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    date: r.date,
    city: r.city,
    state: r.state,
    distance: r.distance,
    distanceMeters: r.distanceMeters,
    surface: r.surface,
    elevation: r.elevation,
    website: r.website,
    registrationUrl: r.registrationUrl,
    priceMin: r.priceMin,
    priceMax: r.priceMax,
    priceCurrency: r.priceCurrency ?? "USD",
    registrationOpen: r.registrationOpen,
    registrationDeadline: r.registrationDeadline,
    isTurkeyTrot: r.isTurkeyTrot ?? false,
    bostonQualifier: r.bostonQualifier ?? false,
    walkerFriendly: r.walkerFriendly ?? false,
    strollerFriendly: r.strollerFriendly ?? false,
    scores: {
      beginner: r.beginnerScore,
      pr: r.prScore,
      value: r.valueScore,
      vibe: r.vibeScore,
      family: r.familyScore,
      quality: r.qualityScore,
    },
    organizerId: r.organizerId,
    seriesId: r.seriesId,
    url: `https://running.services/races/${r.slug}`,
  };
}

// -----------------------------------------------------------------
// Registration
// -----------------------------------------------------------------

export function registerMonetizationRoutes(app: Express) {
  const adminAuth = makeAdminAuth();

  // ---------------------------------------------------------------
  // 1. Public: monetization request intake (Pro / report / api / sponsorship)
  // ---------------------------------------------------------------
  const requestSchema = insertMonetizationRequestSchema.extend({
    kind: z.enum(["pro", "report", "api", "sponsorship"]),
    contactEmail: z.string().email(),
  });

  app.post("/api/monetization/request", async (req, res) => {
    try {
      const userId = req.session?.userId ?? null;
      const body = requestSchema.parse({
        ...req.body,
        userId: req.body?.userId ?? userId ?? undefined,
      });
      const created = await storage.createMonetizationRequest({
        ...body,
        status: "pending",
      });
      let organizerName: string | null = null;
      if (created.organizerId) {
        try {
          const orgs = await storage.getOrganizers({ limit: 1000 });
          organizerName = orgs.find(o => o.id === created.organizerId)?.name ?? null;
        } catch {}
      }
      // Fire-and-forget admin email
      sendMonetizationRequestAdminNotification({
        requestId: created.id,
        kind: created.kind as "pro" | "report" | "api" | "sponsorship",
        contactEmail: created.contactEmail,
        contactName: created.contactName,
        organizerName,
        scope: created.scope,
        message: created.message,
      }).catch(err => console.error("[monetization] admin email failed:", err));
      res.json({ ok: true, requestId: created.id });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      console.error("[monetization] request failed:", err);
      res.status(500).json({ message: "Could not submit request" });
    }
  });

  // ---------------------------------------------------------------
  // 2. Public: sponsorship slot lookup (records impressions)
  // ---------------------------------------------------------------
  app.get("/api/sponsorships", async (req, res) => {
    try {
      const placement = String(req.query.placement || "search");
      const cityId = req.query.cityId ? parseInt(String(req.query.cityId), 10) : undefined;
      const stateId = req.query.stateId ? parseInt(String(req.query.stateId), 10) : undefined;
      const distance = typeof req.query.distance === "string" ? req.query.distance : undefined;
      const isTurkeyTrot = req.query.isTurkeyTrot === "true" ? true : undefined;
      const limit = req.query.limit ? Math.max(1, Math.min(6, parseInt(String(req.query.limit), 10) || 3)) : 3;
      const list = await storage.listSponsorshipsForPlacement({
        placement, cityId, stateId, distance, isTurkeyTrot, limit,
      });
      // Track impressions in the background (don't block response)
      if (list.length) {
        storage.incrementSponsorshipImpressions(list.map(s => s.id))
          .catch(err => console.error("[sponsorships] impression log failed:", err));
      }
      res.json(list.map(s => ({
        id: s.id,
        brand: s.brand,
        headline: s.headline,
        body: s.body,
        imageUrl: s.imageUrl,
        ctaLabel: s.ctaLabel,
        clickUrl: `/api/sponsorships/${s.id}/click`,
      })));
    } catch (err) {
      console.error("[sponsorships] list failed:", err);
      res.status(500).json({ message: "Could not load sponsorships" });
    }
  });

  // Sponsorship click (logged 302 redirect)
  app.get("/api/sponsorships/:id/click", async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).send("Invalid id");
    const list = await storage.listSponsorships();
    const sp = list.find(s => s.id === id);
    if (!sp) return res.status(404).send("Sponsorship not found");
    let parsed: URL;
    try { parsed = new URL(sp.ctaUrl); } catch { return res.status(400).send("Invalid sponsorship target"); }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return res.status(400).send("Invalid protocol");
    }
    storage.incrementSponsorshipClick(id).catch(err => console.error("[sponsorships] click log failed:", err));
    res.redirect(302, parsed.toString());
  });

  // ---------------------------------------------------------------
  // 3. Public: market report read (with paywall preview)
  // ---------------------------------------------------------------
  app.get("/api/reports", async (_req, res) => {
    try {
      const list = await storage.listGeneratedReports(200);
      res.json(list.map(r => ({
        id: r.id,
        metroSlug: r.metroSlug,
        distance: r.distance,
        title: r.title,
        summary: r.summary,
        generatedAt: r.generatedAt,
      })));
    } catch (err) {
      console.error("[reports] list failed:", err);
      res.status(500).json({ message: "Could not load reports" });
    }
  });

  app.get("/api/reports/:metro/:distance", async (req, res) => {
    try {
      const metroSlug = req.params.metro;
      const distance = decodeURIComponent(req.params.distance);
      const report = await storage.getMarketReport(metroSlug, distance);
      if (!report) return res.status(404).json({ message: "Report not generated yet" });
      const userId = req.session?.userId ?? null;
      let hasAccess = false;
      if (userId) {
        hasAccess = await storage.hasReportAccess(userId, `${metroSlug}:${distance}`)
          || await storage.hasReportAccess(userId, "all");
      }
      const data = report.data as Record<string, unknown>;
      const preview = {
        raceCount: data.raceCount,
        avgPriceUsd: data.avgPriceUsd,
        topMonths: Array.isArray(data.topMonths) ? (data.topMonths as Array<unknown>).slice(0, 2) : [],
      };
      res.json({
        report: {
          id: report.id,
          metroSlug: report.metroSlug,
          distance: report.distance,
          title: report.title,
          summary: report.summary,
          generatedAt: report.generatedAt,
        },
        access: hasAccess ? "full" : "preview",
        data: hasAccess ? data : preview,
      });
    } catch (err) {
      console.error("[reports] get failed:", err);
      res.status(500).json({ message: "Could not load report" });
    }
  });

  // ---------------------------------------------------------------
  // 4. Organizer dashboard: API keys
  // ---------------------------------------------------------------
  app.get("/api/organizers/me/api-keys", requireAuth, async (req, res) => {
    const userId = req.session!.userId!;
    const keys = await storage.listApiKeysForUser(userId);
    res.json(keys.map(k => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      tier: k.tier,
      monthlyLimit: k.monthlyLimit,
      monthlyUsage: k.monthlyUsage,
      lastUsedAt: k.lastUsedAt,
      status: k.status,
      createdAt: k.createdAt,
    })));
  });

  app.post("/api/organizers/me/api-keys/request", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(401).json({ message: "Authentication required" });
      const message = typeof req.body?.message === "string" ? req.body.message : null;
      const created = await storage.createMonetizationRequest({
        kind: "api",
        userId,
        organizerId: user.organizerId ?? null,
        contactEmail: user.email,
        contactName: user.name ?? null,
        message,
        scope: typeof req.body?.tier === "string" ? `tier:${req.body.tier}` : null,
        status: "pending",
      });
      let organizerName: string | null = null;
      if (user.organizerId) {
        try {
          const orgs = await storage.getOrganizers({ limit: 1000 });
          organizerName = orgs.find(o => o.id === user.organizerId)?.name ?? null;
        } catch {}
      }
      sendMonetizationRequestAdminNotification({
        requestId: created.id,
        kind: "api",
        contactEmail: user.email,
        contactName: user.name,
        organizerName,
        scope: created.scope,
        message,
      }).catch(err => console.error("[monetization] admin email failed:", err));
      res.json({ ok: true, requestId: created.id });
    } catch (err) {
      console.error("[api-keys] request failed:", err);
      res.status(500).json({ message: "Could not submit request" });
    }
  });

  app.delete("/api/organizers/me/api-keys/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    await storage.revokeApiKey(id, req.session!.userId!);
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------
  // 5. Admin: monetization queue + grants
  // ---------------------------------------------------------------
  app.get("/api/admin/monetization", adminAuth, async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const list = await storage.listMonetizationRequests({ status, kind, limit: 200 });
    res.json(list);
  });

  app.post("/api/admin/monetization/:id/resolve", adminAuth, async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const status = typeof req.body?.status === "string" ? req.body.status : "resolved";
    const adminNote = typeof req.body?.adminNote === "string" ? req.body.adminNote : undefined;
    const updated = await storage.updateMonetizationRequest(id, { status, adminNote });
    if (!updated) return res.status(404).json({ message: "Request not found" });
    res.json({ ok: true, request: updated });
  });

  app.post("/api/admin/pro/:organizerId/grant", adminAuth, async (req, res) => {
    const organizerId = parseInt(String(req.params.organizerId), 10);
    if (!Number.isFinite(organizerId)) return res.status(400).json({ message: "Invalid organizer id" });
    const days = Math.max(1, Math.min(3650, parseInt(String(req.body?.days || "365"), 10) || 365));
    const proUntil = new Date();
    proUntil.setDate(proUntil.getDate() + days);
    await storage.setOrganizerProUntil(organizerId, proUntil);
    res.json({ ok: true, proUntil: proUntil.toISOString() });
  });

  app.post("/api/admin/pro/:organizerId/revoke", adminAuth, async (req, res) => {
    const organizerId = parseInt(String(req.params.organizerId), 10);
    if (!Number.isFinite(organizerId)) return res.status(400).json({ message: "Invalid organizer id" });
    await storage.setOrganizerProUntil(organizerId, null);
    res.json({ ok: true });
  });

  const issueApiKeySchema = z.object({
    userId: z.number().int(),
    organizerId: z.number().int().optional(),
    name: z.string().min(1).max(120),
    tier: z.enum(["free", "growth", "pro"]).optional(),
    monthlyLimit: z.number().int().positive().optional(),
    notify: z.boolean().optional(),
  });

  app.post("/api/admin/api-keys/issue", adminAuth, async (req, res) => {
    try {
      const input = issueApiKeySchema.parse(req.body);
      const user = await storage.getUserById(input.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { apiKey, plaintext } = await storage.createApiKey({
        userId: input.userId,
        organizerId: input.organizerId ?? null,
        name: input.name,
        tier: input.tier,
        monthlyLimit: input.monthlyLimit,
      });
      if (input.notify !== false) {
        sendApiKeyIssuedEmail(user.email, apiKey.name, plaintext, apiKey.monthlyLimit)
          .catch(err => console.error("[api-keys] issued email failed:", err));
      }
      res.json({
        ok: true,
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          tier: apiKey.tier,
          monthlyLimit: apiKey.monthlyLimit,
        },
        plaintext, // returned ONCE so admin can deliver if email fails
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      console.error("[api-keys] issue failed:", err);
      res.status(500).json({ message: "Could not issue API key" });
    }
  });

  app.post("/api/admin/sponsorships", adminAuth, async (req, res) => {
    try {
      const input = insertSponsorshipSchema.parse(req.body);
      const created = await storage.createSponsorship(input);
      res.json({ ok: true, sponsorship: created });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      console.error("[sponsorships] create failed:", err);
      res.status(500).json({ message: "Could not create sponsorship" });
    }
  });

  app.get("/api/admin/sponsorships", adminAuth, async (_req, res) => {
    const list = await storage.listSponsorships();
    res.json(list);
  });

  app.patch("/api/admin/sponsorships/:id", adminAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
      const partial = insertSponsorshipSchema.partial().parse(req.body);
      const updated = await storage.updateSponsorship(id, partial);
      if (!updated) return res.status(404).json({ message: "Sponsorship not found" });
      res.json({ ok: true, sponsorship: updated });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      throw err;
    }
  });

  app.delete("/api/admin/sponsorships/:id", adminAuth, async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    await storage.deleteSponsorship(id);
    res.json({ ok: true });
  });

  app.post("/api/admin/market-reports/generate", adminAuth, async (req, res) => {
    try {
      const metroSlug = String(req.body?.metroSlug || "").trim();
      const distance = String(req.body?.distance || "").trim();
      if (!metroSlug || !distance) return res.status(400).json({ message: "metroSlug and distance required" });
      const data = await storage.computeMarketReportData(metroSlug, distance);
      if (!data) return res.status(404).json({ message: "Metro not found" });
      const metro = await storage.getCityByMetroSlug(metroSlug);
      if (!metro) return res.status(404).json({ message: "Metro not found" });
      const title = `${metro.name}, ${metro.state.abbreviation} ${distance} race market report`;
      const summary = `Snapshot of ${data.raceCount} ${distance} races in ${metro.name}, ${metro.state.abbreviation}: pricing, calendar, organizers, and runner-fit signal.`;
      const report = await storage.upsertMarketReport({
        metroSlug,
        distance,
        title,
        summary,
        data,
      });
      res.json({ ok: true, report });
    } catch (err) {
      console.error("[reports] generate failed:", err);
      res.status(500).json({ message: "Could not generate report" });
    }
  });

  app.post("/api/admin/market-reports/grant-access", adminAuth, async (req, res) => {
    try {
      const userId = parseInt(String(req.body?.userId || ""), 10);
      const scope = String(req.body?.scope || "").trim();
      const days = Math.max(1, Math.min(365, parseInt(String(req.body?.days || "30"), 10) || 30));
      if (!Number.isFinite(userId) || !scope) {
        return res.status(400).json({ message: "userId and scope required" });
      }
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const access = await storage.grantReportAccess(userId, scope, days);
      res.json({ ok: true, access });
    } catch (err) {
      console.error("[reports] grant-access failed:", err);
      res.status(500).json({ message: "Could not grant access" });
    }
  });

  // ---------------------------------------------------------------
  // 6. Public API v1 (X-API-Key auth, monthly metering)
  // ---------------------------------------------------------------
  app.get("/api/v1/races", apiKeyAuth, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const perPage = Math.max(1, Math.min(100, parseInt(String(req.query.perPage || "25"), 10) || 25));
      const filters: Record<string, unknown> = {};
      if (typeof req.query.city === "string") filters.city = req.query.city;
      if (typeof req.query.state === "string") filters.state = req.query.state;
      if (typeof req.query.distance === "string") filters.distance = req.query.distance;
      if (typeof req.query.surface === "string") filters.surface = req.query.surface;
      if (req.query.isTurkeyTrot === "true") filters.isTurkeyTrot = true;
      if (req.query.bostonQualifier === "true") filters.bostonQualifier = true;
      if (req.query.walkerFriendly === "true") filters.walkerFriendly = true;
      if (req.query.strollerFriendly === "true") filters.strollerFriendly = true;
      filters.limit = perPage;
      filters.offset = (page - 1) * perPage;
      const list = await storage.getRacesAdvanced(filters as Parameters<typeof storage.getRacesAdvanced>[0]);
      res.json({
        page,
        perPage,
        results: list.map(pickRaceForApi),
      });
    } catch (err) {
      console.error("[api/v1/races] failed:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.get("/api/v1/races/:slug", apiKeyAuth, async (req, res) => {
    try {
      const race = await storage.getRaceBySlug(String(req.params.slug));
      if (!race) return res.status(404).json({ error: "Race not found" });
      res.json(pickRaceForApi(race));
    } catch (err) {
      console.error("[api/v1/race] failed:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.get("/api/v1/featured/races", apiKeyAuth, async (req, res) => {
    try {
      const cityId = req.query.cityId ? parseInt(String(req.query.cityId), 10) : undefined;
      const distance = typeof req.query.distance === "string" ? req.query.distance : undefined;
      const isTurkeyTrot = req.query.isTurkeyTrot === "true" ? true : undefined;
      const list = await storage.getFeaturedRaces({ cityId, distance, isTurkeyTrot, limit: 24 });
      res.json({ results: list.map(pickRaceForApi) });
    } catch (err) {
      console.error("[api/v1/featured] failed:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });
}
