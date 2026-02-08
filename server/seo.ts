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
`;
    res.set("Content-Type", "text/plain").send(robotsTxt);
  });

  app.get("/sitemap.xml", async (_req, res) => {
    const sitemaps = [
      "/sitemap-pages.xml",
      "/sitemap-races.xml",
      "/sitemap-routes.xml",
      "/sitemap-states.xml",
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
      { url: "/routes", priority: "0.9", changefreq: "weekly" },
      { url: "/tools", priority: "0.8", changefreq: "monthly" },
    ];

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
      const states = await storage.getStates();
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${states.map(s => `  <url>
    <loc>https://running.services/races/state/${s.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("\n")}
</urlset>`;
      res.set("Content-Type", "application/xml").send(xml);
    } catch (e) {
      res.status(500).send("Error generating sitemap");
    }
  });
}
