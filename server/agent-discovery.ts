import type { Express } from "express";

const BASE_URL = "https://running.services";
const CONTENT_SIGNAL = "ai-train=no, search=yes, ai-input=yes";
const DISCOVERY_LINKS = [
  `<${BASE_URL}/.well-known/api-catalog>; rel="api-catalog"`,
  `<${BASE_URL}/openapi.json>; rel="service-desc"; type="application/json"`,
  `<${BASE_URL}/developers>; rel="service-doc"; type="text/html"`,
].join(", ");

// These short representations are maintained alongside the public landing pages.
// A page without an entry continues through the normal HTML renderer.
const markdownPages: Record<string, string> = {
  "/": `# running.services

Find running races in the United States by location, distance, and goal. Compare race details and runner-fit scores before choosing an event.

- [Browse races](${BASE_URL}/races)
- [Race organizers: claim and update a listing](${BASE_URL}/for-organizers)
- [Developer API](${BASE_URL}/developers)
- [Pricing and sponsorship requests](${BASE_URL}/pricing)

Race dates and details can change. Confirm registration terms with the organizer before entering.
`,
  "/for-organizers": `# For race organizers

Claim a race listing for free, correct its date, registration link, pricing, policies, and course information, and view engagement in the organizer dashboard.

1. [Find your race](${BASE_URL}/for-organizers) using the search box.
2. Open the race page and submit a claim.
3. Follow the email verification link to manage the listing.

[See pricing for optional products](${BASE_URL}/pricing) or [contact the team](${BASE_URL}/contact).
`,
  "/developers": `# Developer API

running.services offers a read-only race API. Request an API key on the [developer page](${BASE_URL}/developers), then send it in the X-API-Key header. Requests are metered monthly.

- GET /api/v1/races — paginated race search
- GET /api/v1/races/{slug} — race detail
- GET /api/v1/featured/races — featured race listings

[OpenAPI description](${BASE_URL}/openapi.json) · [API catalog](${BASE_URL}/.well-known/api-catalog)
`,
  "/pricing": `# Pricing

running.services offers optional Race Pro, local market reports, API access, and brand sponsorships. Pricing and availability are listed on the [pricing page](${BASE_URL}/pricing). Submit a request there to discuss an option with the team. No purchase or automated checkout is available on this site.
`,
};

function explicitlyAcceptsMarkdown(accept: string | undefined): boolean {
  return (accept ?? "").split(",").some((part) => {
    const [mediaType, ...parameters] = part.trim().split(";");
    if (mediaType.toLowerCase() !== "text/markdown") return false;
    return !parameters.some((parameter) => /^q\s*=\s*0(?:\.0*)?$/i.test(parameter.trim()));
  });
}

export function registerAgentDiscoveryRoutes(app: Express): void {
  app.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD") {
      if (!req.path.includes(".") && !req.path.startsWith("/api/") && !req.path.startsWith("/auth/") && !req.path.startsWith("/admin")) {
        res.setHeader("Content-Signal", CONTENT_SIGNAL);
      }
      if (Object.hasOwn(markdownPages, req.path)) {
        res.vary("Accept");
        res.setHeader("Link", `${DISCOVERY_LINKS}, <${BASE_URL}${req.path}>; rel="alternate"; type="text/markdown"`);
      }
    }
    next();
  });

  app.get("/.well-known/api-catalog", (_req, res) => {
    const catalog = {
      linkset: [{
        anchor: `${BASE_URL}/api/v1`,
        item: [
          { href: `${BASE_URL}/api/v1/races` },
          { href: `${BASE_URL}/api/v1/featured/races` },
        ],
        "service-desc": [{ href: `${BASE_URL}/openapi.json`, type: "application/json" }],
        "service-doc": [{ href: `${BASE_URL}/developers`, type: "text/html" }],
      }],
    };
    res.setHeader("Content-Type", 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"; charset=utf-8');
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Link", `<${BASE_URL}/.well-known/api-catalog>; rel="api-catalog"`);
    res.send(JSON.stringify(catalog));
  });

  app.get("/llms.txt", (_req, res) => {
    res.type("text/plain; charset=utf-8").send(`# running.services

US running race directory and comparison tools.

## Main pages

- [Browse races](${BASE_URL}/races)
- [For race organizers](${BASE_URL}/for-organizers): claim and update a race listing
- [Developer API](${BASE_URL}/developers): request an API key
- [Pricing](${BASE_URL}/pricing): optional organizer, data, and sponsorship products

## Machine-readable resources

- [Sitemap](${BASE_URL}/sitemap.xml)
- [API catalog](${BASE_URL}/.well-known/api-catalog)
- [OpenAPI](${BASE_URL}/openapi.json)

Race data may change. Check the linked organizer registration page before entering a race.
`);
  });

  app.get(Object.keys(markdownPages), (req, res, next) => {
    if (!explicitlyAcceptsMarkdown(req.get("Accept"))) return next();
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Location", `${BASE_URL}${req.path}`);
    res.send(markdownPages[req.path]);
  });
}
