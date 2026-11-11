import type { Express } from "express";
import { storage } from "./storage";

const SITEMAP_MAX = 45000;
const BASE_URL = "https://running.services";

function toISODate(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString().split("T")[0];
  const date = typeof d === "string" ? new Date(d) : d;
  return isNaN(date.getTime()) ? new Date().toISOString().split("T")[0] : date.toISOString().split("T")[0];
}

function urlEntry(loc: string, opts: { changefreq: string; priority: string; lastmod?: string }): string {
  const lastmodTag = opts.lastmod ? `\n    <lastmod>${opts.lastmod}</lastmod>` : "";
  return `  <url>
    <loc>${BASE_URL}${loc}</loc>${lastmodTag}
    <changefreq>${opts.changefreq}</changefreq>
    <priority>${opts.priority}</priority>
  </url>`;
}

function wrapUrlset(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;
}

export function registerSEORoutes(app: Express) {
  app.get("/robots.txt", (_req, res) => {
    const robotsTxt = `User-agent: *
Content-Signal: ai-train=no, search=yes, ai-input=yes
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /admin/
Disallow: /organizers/dashboard
Disallow: /auth/
Disallow: /alerts
Disallow: /reports/
Disallow: /favorites
Disallow: /influencers
Disallow: /influencers/
Disallow: /podcasts
Disallow: /podcasts/
Disallow: /books
Disallow: /books/
Disallow: /collections
Disallow: /collections/
Disallow: /guides
Disallow: /guides/
Disallow: /routes
Disallow: /routes/

Sitemap: ${BASE_URL}/sitemap.xml
`;
    res.set("Content-Type", "text/plain").send(robotsTxt);
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const sitemaps = [
        "/sitemap-pages.xml",
        "/sitemap-races.xml",
        "/sitemap-states.xml",
        "/sitemap-cities.xml",
        "/sitemap-decision.xml",
        "/sitemap-seo.xml",
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(s => `  <sitemap><loc>${BASE_URL}${s}</loc></sitemap>`).join("\n")}
</sitemapindex>`;

      res.set("Content-Type", "application/xml").send(xml);
    } catch {
      res.status(500).send("Error generating sitemap index");
    }
  });

  app.get("/sitemap-pages.xml", (_req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const entries = [
      urlEntry("/", { changefreq: "daily", priority: "1.0", lastmod: today }),
      urlEntry("/races", { changefreq: "daily", priority: "0.9", lastmod: today }),
      urlEntry("/races/usa", { changefreq: "weekly", priority: "0.9", lastmod: today }),
      urlEntry("/races/year/2026", { changefreq: "daily", priority: "0.8", lastmod: today }),
      urlEntry("/races/year/2027", { changefreq: "daily", priority: "0.7", lastmod: today }),
      urlEntry("/for-organizers", { changefreq: "monthly", priority: "0.6", lastmod: today }),
      urlEntry("/pricing", { changefreq: "monthly", priority: "0.6", lastmod: today }),
      urlEntry("/developers", { changefreq: "monthly", priority: "0.6", lastmod: today }),
      urlEntry("/about", { changefreq: "monthly", priority: "0.6" }),
      urlEntry("/contact", { changefreq: "monthly", priority: "0.5" }),
      urlEntry("/terms", { changefreq: "yearly", priority: "0.3" }),
      urlEntry("/privacy", { changefreq: "yearly", priority: "0.3" }),
    ];
    // Note: /tools and /tools/[slug] are intentionally excluded from the
    // sitemap. They are deprioritized per the rebuild report (generic
    // training tools, not race-decision content), and their SSR meta is
    // marked noindex so direct visitors can still reach them.

    res.set("Content-Type", "application/xml").send(wrapUrlset(entries));
  });

  app.get("/sitemap-races.xml", async (_req, res) => {
    try {
      const allRaces = await storage.getRaces({ limit: SITEMAP_MAX });

      const entries = allRaces.filter(r =>
        r.date && r.city && r.state && r.distance && (r.registrationUrl || r.website)
      ).map(r =>
        urlEntry(`/races/${r.slug}`, {
          changefreq: "weekly",
          priority: "0.7",
          lastmod: toISODate(r.lastSeenAt || r.date),
        })
      );

      res.set("Content-Type", "application/xml").send(wrapUrlset(entries));
    } catch {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/sitemap-states.xml", async (_req, res) => {
    try {
      const statesList = await storage.getStates();
      const today = new Date().toISOString().split("T")[0];
      const entries: string[] = [];

      for (const s of statesList) {
        entries.push(urlEntry(`/state/${s.slug}`, { changefreq: "weekly", priority: "0.9", lastmod: today }));
        entries.push(urlEntry(`/races/state/${s.slug}`, { changefreq: "weekly", priority: "0.8", lastmod: today }));
      }

      res.set("Content-Type", "application/xml").send(wrapUrlset(entries));
    } catch {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/sitemap-cities.xml", async (_req, res) => {
    try {
      // Only publish cities with enough upcoming races to make a useful landing page.
      const metros = await storage.getMetrosWithRaceCount(5, 4000);
      const entries = metros.map(({ city, state }) =>
        urlEntry(`/state/${state.slug}/city/${city.slug}`, { changefreq: "weekly", priority: "0.7" })
      );

      res.set("Content-Type", "application/xml").send(wrapUrlset(entries));
    } catch {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/sitemap-decision.xml", async (_req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const entries: string[] = [
        urlEntry("/race-shopper", { changefreq: "weekly", priority: "0.9", lastmod: today }),
        urlEntry("/this-weekend", { changefreq: "daily", priority: "0.9", lastmod: today }),
        urlEntry("/price-watch", { changefreq: "daily", priority: "0.9", lastmod: today }),
      ];

      try {
        const orgs = await storage.getOrganizers({ limit: SITEMAP_MAX });
        for (const o of orgs) {
          // Gate organizer detail URLs to match the page-level noindex
          // policy: skip thin/noindex pages (fewer than 5 races).
          if ((o.raceCount ?? 0) < 5) continue;
          entries.push(urlEntry(`/organizers/${o.slug}`, {
            changefreq: "weekly",
            priority: "0.6",
            lastmod: today,
          }));
        }
      } catch (err) {
        console.warn("[sitemap-decision] organizer enumeration failed:", (err as Error).message);
      }

      res.set("Content-Type", "application/xml").send(wrapUrlset(entries));
    } catch {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/sitemap-seo.xml", async (_req, res) => {
    try {
      const now = new Date();
      const { BEST_CONFIGS, resolveBestSearch } = await import("@shared/best-configs");
      const { BLOG_DISTANCE_SLUGS, blogPostHref, monthNumToSlug, rollingMonths } = await import("@shared/blog-months");
      const { DISTANCE_SLUG_TO_LABEL } = await import("@shared/metro");
      const [upcoming, states, metros, series] = await Promise.all([
        storage.getRaces({ limit: SITEMAP_MAX }),
        storage.getStates(),
        storage.getMetrosWithRaceCount(5, 200),
        storage.getRaceSeries({ limit: 200 }),
      ]);

      // Reuse one upcoming inventory instead of making a D1 request for every
      // combination of distance, city, state and month.
      const entries = new Set<string>(["/blog"]);
      const curated = await Promise.all(Object.entries(BEST_CONFIGS).map(async ([slug, config]) => {
        const candidates = await storage.getRacesAdvanced({ ...resolveBestSearch(slug, config), limit: 1 });
        return candidates.length ? `/best/${slug}` : null;
      }));
      for (const path of curated) if (path) entries.add(path);

      function byMonth(races: typeof upcoming) {
        const counts = new Map<number, number>();
        for (const race of races) {
          const month = Number(race.date?.slice(5, 7));
          if (month >= 1 && month <= 12) counts.set(month, (counts.get(month) ?? 0) + 1);
        }
        return counts;
      }

      const novemberTrot = (race: (typeof upcoming)[number]) => race.isTurkeyTrot && race.date?.slice(5, 7) === "11";
      if (upcoming.filter(novemberTrot).length >= 5) entries.add("/turkey-trots");

      for (const distanceSlug of BLOG_DISTANCE_SLUGS) {
        const config = DISTANCE_SLUG_TO_LABEL[distanceSlug];
        const matching = upcoming.filter(race =>
          (!config.distance || race.distance === config.distance) &&
          (!config.surface || race.surface === config.surface));
        const countsByDate = new Map<string, number>();
        for (const race of matching) {
          if (!race.date) continue;
          const month = race.date.slice(0, 7);
          countsByDate.set(month, (countsByDate.get(month) ?? 0) + 1);
        }
        for (const { monthNum, year } of rollingMonths(now, 12)) {
          const key = `${year}-${String(monthNum).padStart(2, "0")}`;
          if ((countsByDate.get(key) ?? 0) >= 5) entries.add(blogPostHref(distanceSlug, monthNum, year));
        }
        for (const [month, count] of byMonth(matching)) {
          if (count >= 5) entries.add(`/best-races/${distanceSlug}/${monthNumToSlug(month)}`);
        }
        for (const state of states) {
          if (matching.filter(race => race.state === state.abbreviation).length >= 5) {
            entries.add(`/state/${state.slug}/${distanceSlug}`);
          }
        }
        for (const [index, metro] of metros.entries()) {
          const local = matching.filter(race => race.city === metro.city.name && race.state === metro.state.abbreviation);
          if (local.length < 5) continue;
          const path = `/${metro.city.slug}-${metro.state.abbreviation.toLowerCase()}/${distanceSlug}`;
          entries.add(path);
          if (index < 25) {
            for (const [month, count] of byMonth(local)) {
              if (count >= 5) entries.add(`${path}/${monthNumToSlug(month)}`);
            }
          }
        }
      }

      for (const metro of metros) {
        const local = upcoming.filter(race => race.city === metro.city.name && race.state === metro.state.abbreviation);
        const slug = `${metro.city.slug}-${metro.state.abbreviation.toLowerCase()}`;
        if (local.filter(novemberTrot).length >= 5) entries.add(`/turkey-trots/${slug}`);
        if (local.filter(race => race.distance === "5K" && race.walkerFriendly).length >= 5) {
          entries.add(`/walker-friendly-5k/${slug}`);
        }
        if (local.filter(race => race.distance === "5K" && race.strollerFriendly).length >= 5) {
          entries.add(`/stroller-friendly-5k/${slug}`);
        }
      }
      for (const raceSeries of series) {
        if (upcoming.filter(race => race.seriesId === raceSeries.id).length >= 5) {
          entries.add(`/series/${raceSeries.slug}`);
        }
      }

      res.set("Cache-Control", "public, max-age=900");
      res.set("Content-Type", "application/xml").send(wrapUrlset(
        [...entries].sort().map(path => urlEntry(path, { changefreq: "weekly", priority: "0.6" }))
      ));
    } catch (error) {
      console.error("[sitemap-seo] generation failed", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  for (const path of ["/sitemap-collections.xml", "/sitemap-influencers.xml", "/sitemap-podcasts.xml", "/sitemap-books.xml"]) {
    app.get(path, (_req, res) => {
      res.status(410).set("Content-Type", "application/xml").send(wrapUrlset([]));
    });
  }

  const DEPRECATED_PATTERNS: Array<{ regex: RegExp; label: string; suggestion: string; suggestionPath: string }> = [
    { regex: /^\/influencers(\/.*)?$/, label: "Running Influencers", suggestion: "Browse races", suggestionPath: "/races" },
    { regex: /^\/podcasts(\/.*)?$/, label: "Running Podcasts", suggestion: "Browse races", suggestionPath: "/races" },
    { regex: /^\/books(\/.*)?$/, label: "Running Books", suggestion: "Browse races", suggestionPath: "/races" },
    { regex: /^\/collections(\/.*)?$/, label: "Race Collections", suggestion: "Try the Race Shopper", suggestionPath: "/race-shopper" },
    { regex: /^\/guides(\/.*)?$/, label: "Running Guides", suggestion: "Browse races", suggestionPath: "/races" },
  ];

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api/")) return next();
    const match = DEPRECATED_PATTERNS.find(p => p.regex.test(req.path));
    if (!match) return next();
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>This section has moved | running.services</title>
<link rel="canonical" href="${BASE_URL}${match.suggestionPath}" />
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 4rem auto; padding: 0 1.5rem; color: #1f2937; line-height: 1.5; }
  h1 { font-size: 1.5rem; margin-bottom: 1rem; }
  p { margin: 0.75rem 0; }
  a.btn { display: inline-block; margin-top: 1rem; padding: 0.6rem 1rem; background: #111827; color: #fff; border-radius: 6px; text-decoration: none; font-weight: 600; }
  a.btn:hover { background: #374151; }
  a.alt { color: #2563eb; }
</style>
</head>
<body>
<h1>${match.label} has moved</h1>
<p>running.services is now a race decision engine focused on helping runners pick the right race. The ${match.label} section is no longer maintained.</p>
<p>${match.suggestion} instead, or jump straight to the homepage.</p>
<a class="btn" href="${match.suggestionPath}">${match.suggestion}</a>
<p style="margin-top:1.5rem"><a class="alt" href="/">Back to home</a></p>
</body>
</html>`;
    res.status(410).set("Content-Type", "text/html").send(html);
  });
}
