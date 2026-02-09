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

Sitemap: ${BASE_URL}/sitemap.xml
`;
    res.set("Content-Type", "text/plain").send(robotsTxt);
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const sitemaps = [
        "/sitemap-pages.xml",
        "/sitemap-races.xml",
        "/sitemap-routes.xml",
        "/sitemap-states.xml",
        "/sitemap-cities.xml",
        "/sitemap-collections.xml",
        "/sitemap-influencers.xml",
        "/sitemap-podcasts.xml",
        "/sitemap-books.xml",
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
      urlEntry("/routes", { changefreq: "weekly", priority: "0.9", lastmod: today }),
      urlEntry("/tools", { changefreq: "monthly", priority: "0.8" }),
      urlEntry("/collections", { changefreq: "weekly", priority: "0.8", lastmod: today }),
      urlEntry("/influencers", { changefreq: "weekly", priority: "0.8" }),
      urlEntry("/podcasts", { changefreq: "weekly", priority: "0.8" }),
      urlEntry("/books", { changefreq: "weekly", priority: "0.8" }),
      urlEntry("/races/year/2025", { changefreq: "daily", priority: "0.8", lastmod: today }),
      urlEntry("/races/year/2026", { changefreq: "daily", priority: "0.8", lastmod: today }),
      urlEntry("/about", { changefreq: "monthly", priority: "0.6" }),
      urlEntry("/contact", { changefreq: "monthly", priority: "0.5" }),
      urlEntry("/blog", { changefreq: "weekly", priority: "0.7", lastmod: today }),
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

  app.get("/sitemap-routes.xml", async (_req, res) => {
    try {
      const routes = await storage.getRoutes({ limit: SITEMAP_MAX });
      const entries = routes.map(r =>
        urlEntry(`/routes/${r.slug}`, {
          changefreq: "monthly",
          priority: "0.6",
          lastmod: toISODate(r.lastSeenAt),
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
        entries.push(urlEntry(`/routes/state/${s.slug}`, { changefreq: "weekly", priority: "0.7", lastmod: today }));
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
          entries.push(urlEntry(`/routes/state/${s.slug}/city/${c.slug}`, { changefreq: "weekly", priority: "0.5" }));
        }
      }

      res.set("Content-Type", "application/xml").send(wrapUrlset(entries));
    } catch {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/sitemap-collections.xml", async (_req, res) => {
    try {
      const collectionsList = await storage.getCollections({ limit: 1000 });
      const entries = collectionsList.map(c =>
        urlEntry(`/collections/${c.slug}`, {
          changefreq: "weekly",
          priority: "0.7",
          lastmod: toISODate(c.updatedAt),
        })
      );
      res.set("Content-Type", "application/xml").send(wrapUrlset(entries));
    } catch {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/sitemap-influencers.xml", async (_req, res) => {
    try {
      const list = await storage.getInfluencers({ limit: 1000 });
      const entries = list.map(i =>
        urlEntry(`/influencers/${i.slug}`, { changefreq: "monthly", priority: "0.6" })
      );
      res.set("Content-Type", "application/xml").send(wrapUrlset(entries));
    } catch {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/sitemap-podcasts.xml", async (_req, res) => {
    try {
      const list = await storage.getPodcasts({ limit: 1000 });
      const entries = list.map(p =>
        urlEntry(`/podcasts/${p.slug}`, { changefreq: "monthly", priority: "0.6" })
      );
      res.set("Content-Type", "application/xml").send(wrapUrlset(entries));
    } catch {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/sitemap-books.xml", async (_req, res) => {
    try {
      const list = await storage.getBooks({ limit: 1000 });
      const entries = list.map(b =>
        urlEntry(`/books/${b.slug}`, { changefreq: "monthly", priority: "0.6" })
      );
      res.set("Content-Type", "application/xml").send(wrapUrlset(entries));
    } catch {
      res.status(500).send("Error generating sitemap");
    }
  });
}
