import type { Express } from "express";
import { storage } from "./storage";

export function registerSEORoutes(app: Express) {
  app.get("/robots.txt", (_req, res) => {
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: /sitemap.xml
Sitemap: /sitemap-races.xml
Sitemap: /sitemap-routes.xml
Sitemap: /sitemap-states.xml
Sitemap: /sitemap-cities.xml
Sitemap: /sitemap-collections.xml
`;
    res.set("Content-Type", "text/plain").send(robotsTxt);
  });

  app.get("/sitemap.xml", async (_req, res) => {
    const sitemaps = [
      "/sitemap-pages.xml",
      "/sitemap-races.xml",
      "/sitemap-routes.xml",
      "/sitemap-states.xml",
      "/sitemap-cities.xml",
      "/sitemap-collections.xml",
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(s => `  <sitemap><loc>https://running.services${s}</loc></sitemap>`).join("\n")}
</sitemapindex>`;

    res.set("Content-Type", "application/xml").send(xml);
  });

  app.get("/sitemap-pages.xml", (_req, res) => {
    const pages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/races", priority: "0.9", changefreq: "daily" },
      { url: "/races/usa", priority: "0.9", changefreq: "weekly" },
      { url: "/routes", priority: "0.9", changefreq: "weekly" },
      { url: "/tools", priority: "0.8", changefreq: "monthly" },
      { url: "/guides", priority: "0.7", changefreq: "monthly" },
      { url: "/collections", priority: "0.8", changefreq: "weekly" },
      { url: "/races/year/2025", priority: "0.8", changefreq: "daily" },
      { url: "/races/year/2026", priority: "0.8", changefreq: "daily" },
    ];

    const toolSlugs = ["race-predictor", "pace-calculator", "training-plan", "vo2-estimator"];
    for (const slug of toolSlugs) {
      pages.push({ url: `/tools/${slug}`, priority: "0.7", changefreq: "monthly" });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>https://running.services${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

    res.set("Content-Type", "application/xml").send(xml);
  });

  app.get("/sitemap-races.xml", async (_req, res) => {
    try {
      const races = await storage.getRaces({ limit: 10000 });
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${races.map(r => `  <url>
    <loc>https://running.services/races/${r.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join("\n")}
</urlset>`;
      res.set("Content-Type", "application/xml").send(xml);
    } catch (e) {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/sitemap-routes.xml", async (_req, res) => {
    try {
      const routes = await storage.getRoutes({ limit: 10000 });
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(r => `  <url>
    <loc>https://running.services/routes/${r.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join("\n")}
</urlset>`;
      res.set("Content-Type", "application/xml").send(xml);
    } catch (e) {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/sitemap-states.xml", async (_req, res) => {
    try {
      const statesList = await storage.getStates();
      const urls: { url: string; priority: string; changefreq: string }[] = [];

      for (const s of statesList) {
        urls.push({ url: `/races/state/${s.slug}`, priority: "0.8", changefreq: "weekly" });
        urls.push({ url: `/routes/state/${s.slug}`, priority: "0.7", changefreq: "weekly" });
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>https://running.services${u.url}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
      res.set("Content-Type", "application/xml").send(xml);
    } catch (e) {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/sitemap-cities.xml", async (_req, res) => {
    try {
      const statesList = await storage.getStates();
      const urls: { url: string; priority: string; changefreq: string }[] = [];

      for (const s of statesList) {
        const citiesList = await storage.getCitiesByState(s.id);
        for (const c of citiesList) {
          urls.push({ url: `/races/state/${s.slug}/city/${c.slug}`, priority: "0.6", changefreq: "weekly" });
          urls.push({ url: `/routes/state/${s.slug}/city/${c.slug}`, priority: "0.5", changefreq: "weekly" });
        }
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>https://running.services${u.url}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
      res.set("Content-Type", "application/xml").send(xml);
    } catch (e) {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/sitemap-collections.xml", async (_req, res) => {
    try {
      const collectionsList = await storage.getCollections({ limit: 1000 });
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${collectionsList.map(c => `  <url>
    <loc>https://running.services/collections/${c.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join("\n")}
</urlset>`;
      res.set("Content-Type", "application/xml").send(xml);
    } catch (e) {
      res.status(500).send("Error generating sitemap");
    }
  });
}
