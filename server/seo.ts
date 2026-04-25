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
Allow: /
Disallow: /influencers
Disallow: /influencers/
Disallow: /podcasts
Disallow: /podcasts/
Disallow: /books
Disallow: /books/
Disallow: /collections
Disallow: /collections/
Disallow: /blog
Disallow: /blog/
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
      urlEntry("/tools", { changefreq: "monthly", priority: "0.8" }),
      urlEntry("/races/year/2026", { changefreq: "daily", priority: "0.8", lastmod: today }),
      urlEntry("/races/year/2027", { changefreq: "daily", priority: "0.7", lastmod: today }),
      urlEntry("/about", { changefreq: "monthly", priority: "0.6" }),
      urlEntry("/contact", { changefreq: "monthly", priority: "0.5" }),
      urlEntry("/terms", { changefreq: "yearly", priority: "0.3" }),
      urlEntry("/privacy", { changefreq: "yearly", priority: "0.3" }),
    ];

    const toolSlugs = ["race-predictor", "pace-calculator", "training-plan", "vo2-estimator"];
    for (const slug of toolSlugs) {
      entries.push(urlEntry(`/tools/${slug}`, { changefreq: "monthly", priority: "0.7" }));
    }

    res.set("Content-Type", "application/xml").send(wrapUrlset(entries));
  });

  app.get("/sitemap-races.xml", async (_req, res) => {
    try {
      const allRaces = await storage.getRaces({ limit: SITEMAP_MAX });

      const entries = allRaces.map(r =>
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
      const statesList = await storage.getStates();
      const entries: string[] = [];

      for (const s of statesList) {
        const citiesList = await storage.getCitiesByState(s.id);
        for (const c of citiesList) {
          entries.push(urlEntry(`/state/${s.slug}/city/${c.slug}`, { changefreq: "weekly", priority: "0.7" }));
          entries.push(urlEntry(`/races/state/${s.slug}/city/${c.slug}`, { changefreq: "weekly", priority: "0.6" }));
        }
      }

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
        urlEntry("/compare", { changefreq: "monthly", priority: "0.8", lastmod: today }),
        urlEntry("/this-weekend", { changefreq: "daily", priority: "0.9", lastmod: today }),
        urlEntry("/price-watch", { changefreq: "daily", priority: "0.9", lastmod: today }),
        urlEntry("/organizers", { changefreq: "weekly", priority: "0.7", lastmod: today }),
      ];

      try {
        const orgs = await storage.getOrganizers({ limit: SITEMAP_MAX });
        for (const o of orgs) {
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
      const today = new Date().toISOString().split("T")[0];
      const entries: string[] = [];

      // Curated "best of" pages
      const { BEST_SLUGS } = await import("@shared/best-configs");
      for (const slug of BEST_SLUGS) {
        entries.push(urlEntry(`/best/${slug}`, { changefreq: "weekly", priority: "0.7", lastmod: today }));
      }

      // Series public pages
      try {
        const series = await storage.getRaceSeries({ limit: 200 });
        for (const s of series) {
          const seriesRaces = await storage.getRacesBySeries(s.id);
          if (seriesRaces.length >= 5) {
            entries.push(urlEntry(`/series/${s.slug}`, { changefreq: "weekly", priority: "0.6", lastmod: today }));
          }
        }
      } catch (err) {
        console.warn("[sitemap-seo] series enumeration failed:", (err as Error).message);
      }

      // National turkey-trots if there are enough (Thanksgiving 5K = November-only)
      try {
        const turkeyNational = await storage.getRacesAdvanced({ isTurkeyTrot: true, month: 11, limit: 60 });
        if (turkeyNational.length >= 5) {
          entries.push(urlEntry("/turkey-trots", { changefreq: "weekly", priority: "0.8", lastmod: today }));
        }
      } catch {}

      // Per-metro programmatic pages (only metros with ≥5 future active races)
      try {
        const metros = await storage.getMetrosWithRaceCount(5, 200);
        const distanceSlugMap: Array<{ slug: string; distance?: string; surface?: string }> = [
          { slug: "5k-races", distance: "5K" },
          { slug: "10k-races", distance: "10K" },
          { slug: "half-marathons", distance: "Half Marathon" },
          { slug: "marathons", distance: "Marathon" },
          { slug: "trail-races", surface: "Trail" },
        ];
        const monthSlugList = [
          "january", "february", "march", "april", "may", "june",
          "july", "august", "september", "october", "november", "december",
        ];
        // Cap month-page enumeration to top metros to keep sitemap-build cost bounded.
        const topMetrosForMonths = metros.slice(0, 25);
        for (const m of metros) {
          const metroSlug = `${m.city.slug}-${m.state.abbreviation.toLowerCase()}`;
          const isTopMetro = topMetrosForMonths.includes(m);

          // city + distance — gated per-distance with ≥5 races
          for (const d of distanceSlugMap) {
            try {
              const r = await storage.getRacesAdvanced({
                state: m.state.abbreviation,
                city: m.city.name,
                distance: d.distance,
                surface: d.surface,
                limit: 60,
              });
              if (r.length >= 5) {
                entries.push(urlEntry(`/${metroSlug}/${d.slug}`, { changefreq: "weekly", priority: "0.6", lastmod: today }));

                // city + distance + month — only for top metros, only months with ≥5 races.
                if (isTopMetro) {
                  const byMonth = new Map<number, number>();
                  for (const race of r) {
                    if (!race.date) continue;
                    const monthIdx = new Date(race.date).getUTCMonth() + 1;
                    byMonth.set(monthIdx, (byMonth.get(monthIdx) || 0) + 1);
                  }
                  byMonth.forEach((count, monthIdx) => {
                    if (count >= 5) {
                      const monthSlug = monthSlugList[monthIdx - 1];
                      entries.push(urlEntry(`/${metroSlug}/${d.slug}/${monthSlug}`, { changefreq: "monthly", priority: "0.45", lastmod: today }));
                    }
                  });
                }
              }
            } catch {}
          }

          // turkey-trots per metro (gated on actual count, November-only)
          try {
            const tt = await storage.getRacesAdvanced({
              isTurkeyTrot: true,
              month: 11,
              state: m.state.abbreviation,
              city: m.city.name,
              limit: 5,
            });
            if (tt.length >= 5) {
              entries.push(urlEntry(`/turkey-trots/${metroSlug}`, { changefreq: "weekly", priority: "0.6", lastmod: today }));
            }
          } catch {}

          // walker / stroller (gated)
          try {
            const walker = await storage.getRacesAdvanced({
              walkerFriendly: true,
              distance: "5K",
              state: m.state.abbreviation,
              city: m.city.name,
              limit: 5,
            });
            if (walker.length >= 5) {
              entries.push(urlEntry(`/walker-friendly-5k/${metroSlug}`, { changefreq: "weekly", priority: "0.55", lastmod: today }));
            }
          } catch {}
          try {
            const stroller = await storage.getRacesAdvanced({
              strollerFriendly: true,
              distance: "5K",
              state: m.state.abbreviation,
              city: m.city.name,
              limit: 5,
            });
            if (stroller.length >= 5) {
              entries.push(urlEntry(`/stroller-friendly-5k/${metroSlug}`, { changefreq: "weekly", priority: "0.55", lastmod: today }));
            }
          } catch {}
        }
      } catch (err) {
        console.warn("[sitemap-seo] metro enumeration failed:", (err as Error).message);
      }

      // State + distance (only states with ≥5 races for that distance)
      try {
        const statesList = await storage.getStates();
        const distanceSlugMap: Array<{ slug: string; distance?: string; surface?: string }> = [
          { slug: "5k-races", distance: "5K" },
          { slug: "10k-races", distance: "10K" },
          { slug: "half-marathons", distance: "Half Marathon" },
          { slug: "marathons", distance: "Marathon" },
          { slug: "trail-races", surface: "Trail" },
        ];
        for (const s of statesList) {
          for (const d of distanceSlugMap) {
            try {
              const r = await storage.getRacesAdvanced({
                state: s.abbreviation,
                distance: d.distance,
                surface: d.surface,
                limit: 5,
              });
              if (r.length >= 5) {
                entries.push(urlEntry(`/state/${s.slug}/${d.slug}`, { changefreq: "weekly", priority: "0.65", lastmod: today }));
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn("[sitemap-seo] state-distance enumeration failed:", (err as Error).message);
      }

      res.set("Content-Type", "application/xml").send(wrapUrlset(entries));
    } catch {
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
    { regex: /^\/blog(\/.*)?$/, label: "Blog", suggestion: "Browse races", suggestionPath: "/races" },
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
