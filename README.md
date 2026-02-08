# running.services

A data-driven running hub for the USA — a comprehensive race calendar, route directory, and running community platform built for programmatic SEO at scale.

**Live:** [running.services](https://running.services)

---

## What It Does

running.services aggregates running data across all 50 US states into a single platform with thousands of SEO-optimized pages:

- **Race Calendar** — 17,150+ real races ingested from the RunSignUp API, filterable by state, city, distance, surface, and date
- **Route Directory** — 50 curated running routes with interactive maps, difficulty ratings, elevation data, and plotted route paths
- **Unified State & City Hubs** — Location-specific pages consolidating all races, routes, stats, and explore links for every state and city
- **Running Community** — Curated directories of running influencers, podcasts, and books
- **Collections** — "Best of" pages like Best Marathons, Boston Qualifying Races, and Best Trail Routes
- **Tools Integration** — Links to AITracker.run for AI-powered race prediction, pace calculation, and training plans

## Architecture

### Monorepo Structure

```
client/          React frontend (Vite + TypeScript)
server/          Express backend (TypeScript)
shared/          Shared schema and types
script/          Build scripts
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Routing | Wouter v3 (SSR-compatible) |
| State Management | TanStack React Query v5 |
| UI Components | shadcn/ui + Radix UI + Tailwind CSS v4 |
| Backend | Express 5, Node.js, TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Maps | Leaflet + OpenStreetMap (route detail pages), SVG + OSM tiles (route cards) |
| Build | Vite (client + SSR), esbuild (server) |

### Server-Side Rendering (SSR)

Every page is fully server-rendered for SEO crawlers:

- **Data Prefetching** — `server/ssr-prefetch.ts` maps ~25 URL patterns to data prefetch functions, populating the React Query cache server-side
- **Hydration** — Uses `dehydrate`/`HydrationBoundary` so the client doesn't re-fetch data already rendered on the server
- **ISR-like Caching** — In-memory TTL cache (5-min default, 500-entry max) with stale-while-revalidate semantics
- **Graceful Fallback** — If SSR fails, falls back to client-side rendering with dynamic meta tags still injected

### SEO Infrastructure

- **Canonical URLs** — Every page has a `<link rel="canonical">` tag with absolute URLs
- **Dynamic Meta Tags** — Per-page title, description, Open Graph, and Twitter Card tags
- **JSON-LD Structured Data** — WebSite, CollectionPage, SportsEvent, and Place schemas
- **Sitemaps** — Auto-generated split sitemaps for races, routes, states, cities, collections, influencers, podcasts, and books
- **robots.txt** — Proper crawler directives with sitemap references

## URL Structure

The site is designed for programmatic SEO, generating thousands of pages from structured data:

### Races
| URL | Description |
|-----|-------------|
| `/races/` | Main race hub with filters and discovery |
| `/races/usa/` | All 50 states directory |
| `/races/state/{state}/` | State-specific race calendar |
| `/races/state/{state}/city/{city}/` | City race listings |
| `/races/year/{yyyy}/` | Year view with month navigation |
| `/races/year/{yyyy}/month/{mm}/` | Month race listings |
| `/races/{slug}/` | Individual race detail page |
| `/races/nearby/` | Geolocation-based race discovery |

### Routes
| URL | Description |
|-----|-------------|
| `/routes/` | Main routes hub |
| `/routes/state/{state}/` | State routes directory |
| `/routes/state/{state}/city/{city}/` | City routes |
| `/routes/{slug}/` | Route detail page with interactive map |

### Unified Location Hubs
| URL | Description |
|-----|-------------|
| `/state/{state}/` | Unified state hub (races + routes + cities + stats) |
| `/state/{state}/city/{city}/` | Unified city hub (races + routes + cross-links) |

### Content
| URL | Description |
|-----|-------------|
| `/collections/` | Curated "best of" lists |
| `/influencers/` | Running influencer directory |
| `/podcasts/` | Running podcast directory |
| `/books/` | Running book recommendations |
| `/tools/` | AI-powered running tools |
| `/guides/` | Running guides |

## API

RESTful JSON API under the `/api/` prefix:

```
GET /api/states                          List all states
GET /api/states/:slug                    Get a single state
GET /api/states/:stateSlug/cities        List cities for a state
GET /api/cities/:stateSlug/:citySlug     Get a city with state data
GET /api/races                           List races (filterable by state, distance, surface, city, year, month)
GET /api/races/:slug                     Get a single race
GET /api/races/popular                   Popular races
GET /api/races/trending                  Trending races
GET /api/races/nearby                    Races near coordinates
GET /api/race-occurrences                List race occurrences
GET /api/routes                          List routes (filterable by state, surface, type, city)
GET /api/routes/:slug                    Get a single route
GET /api/collections                     List collections
GET /api/collections/:slug               Get a single collection
GET /api/influencers                     List influencers
GET /api/influencers/:slug               Get a single influencer
GET /api/podcasts                        List podcasts
GET /api/podcasts/:slug                  Get a single podcast
GET /api/books                           List books
GET /api/books/:slug                     Get a single book
```

### Admin Endpoints (protected by `X-ADMIN-KEY` header)

```
POST /api/admin/ingest/races             Full race ingestion from RunSignUp
POST /api/admin/ingest/races/state/:st   Single-state race ingestion
GET  /api/admin/stats                    Database statistics
```

## Database Schema

PostgreSQL with Drizzle ORM. Key tables:

| Table | Purpose |
|-------|---------|
| `states` | 50 US states with race/route counts and popular cities |
| `cities` | Cities with lat/lng, linked to states |
| `races` | 17,150+ races with distance, surface, elevation, coordinates, quality scores |
| `race_occurrences` | Individual race event instances with dates, pricing, status |
| `routes` | Running routes with polyline paths, difficulty, surface, elevation data |
| `sources` | Data source registry (RunSignUp, manual, etc.) |
| `source_records` | Raw ingested records for deduplication |
| `collections` | Curated "best of" groupings |
| `influencers` | Running influencer profiles |
| `podcasts` | Running podcast directory |
| `books` | Running book recommendations |

## Data Ingestion

The `server/ingestion/` pipeline handles importing races from the RunSignUp API:

1. **Fetching** — Paginated API calls per state with date range and modified-since support
2. **Normalization** — Name cleaning, location key generation, URL normalization
3. **Deduplication** — Exact match (name + location + date) and fuzzy match (trigram similarity > 0.6)
4. **Quality Scoring** — 0-100 score based on field completeness (description, website, registration URL, etc.)
5. **Upsert** — Creates or updates races, marks stale races inactive after 45 days

## Route Maps

Route detail pages feature interactive Leaflet maps with OpenStreetMap tiles showing the plotted route path. Route cards across the site display static map previews using OSM tile images with SVG-rendered route overlays.

Route paths are generated based on:
- **Loop** routes — Circular paths with natural-looking variation
- **Out-and-Back** routes — Linear paths with a parallel return
- **Point-to-Point** routes — Winding paths from start to finish

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server with HMR and SSR
npm run db:push      # Sync database schema
npm run build        # Production build (client + SSR + server)
npm start            # Run production server
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_API_KEY` | API key for admin endpoints |
| `PORT` | Server port (default: 5000) |

## License

All rights reserved.
