# running.services

## Overview

running.services is a data-driven running hub for the USA that serves as a comprehensive race calendar and route directory. The site is designed for programmatic SEO at scale (USA → states → cities → time views → detail pages → collections) and includes three core sections: Races, Routes, and Tools (linking out to aitracker.run). The architecture supports generating thousands of pages from structured data. It is NOT a user-generated content platform — data is seeded/managed centrally.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
- **Monorepo layout** with three top-level directories:
  - `client/` — React frontend (Vite + TypeScript)
  - `server/` — Express backend (TypeScript, runs via tsx)
  - `shared/` — Shared schema and types used by both client and server

### Server-Side Rendering (SSR)
- **Full SSR**: Every page is server-rendered with complete HTML content for SEO crawlers
- **Entry Points**:
  - `client/src/entry-client.tsx` — Client-side hydration entry (uses `hydrateRoot`)
  - `client/src/entry-server.tsx` — Server-side rendering entry (uses `renderToString` + wouter `ssrPath`)
  - `client/src/main.tsx` — Fallback client-only entry (not used in SSR mode)
- **Data Prefetching**: `server/ssr-prefetch.ts` maps URL patterns to data prefetch functions, populating React Query cache server-side
- **React Query SSR**: Uses `dehydrate`/`HydrationBoundary` to pass server-fetched data to client without re-fetching
- **ISR-like Caching**: `server/ssr-cache.ts` provides in-memory TTL cache (5 min default, 500 entry max) with stale-while-revalidate semantics
- **Graceful Fallback**: If SSR fails, the server falls back to client-side rendering with dynamic meta tags still injected
- **SSR Handler**: `server/ssr-render.ts` handles both dev (via Vite ssrLoadModule) and production (via built SSR bundle) rendering

### SEO Infrastructure
- **Dynamic Meta Tags**: Per-page title, description, og:title, og:description, og:type, twitter:title, twitter:description injected server-side
- **JSON-LD Structured Data**: WebSite schema (home), CollectionPage (hubs/collections), SportsEvent (race details), Place (route details) injected into `<head>`
- **Sitemaps**: Auto-generated split sitemaps: `sitemap.xml` (index), `sitemap-pages.xml`, `sitemap-races.xml`, `sitemap-routes.xml`, `sitemap-states.xml`, `sitemap-cities.xml`, `sitemap-collections.xml`, `sitemap-influencers.xml`, `sitemap-podcasts.xml`, `sitemap-books.xml`
- **Robots.txt**: Proper crawler directives with sitemap references at `/robots.txt`
- **SEO Routes**: Defined in `server/seo.ts`, registered before API routes

### URL Structure (Programmatic SEO)
- **Races**:
  - `/races/` — Main race hub
  - `/races/usa/` — All 50 states directory
  - `/races/state/{state-slug}/` — State race calendar
  - `/races/state/{state-slug}/city/{city-slug}/` — City race listings
  - `/races/year/{yyyy}/` — Year race calendar with month navigation
  - `/races/year/{yyyy}/month/{mm}/` — Month race listings
  - `/races/{race-slug}/` — Race detail page
- **Routes**:
  - `/routes/` — Main routes hub
  - `/routes/state/{state-slug}/` — State routes directory
  - `/routes/state/{state-slug}/city/{city-slug}/` — City routes
  - `/routes/{route-slug}/` — Route detail page
- **Tools**: `/tools/`, `/tools/{tool-slug}/` — Each with AITracker CTA
- **Collections**: `/collections/`, `/collections/{collection-slug}/` — Curated "best of" pages
- **Influencers**: `/influencers/`, `/influencers/{influencer-slug}/` — Running influencer profiles
- **Podcasts**: `/podcasts/`, `/podcasts/{podcast-slug}/` — Running podcast directory
- **Books**: `/books/`, `/books/{book-slug}/` — Running book recommendations
- **Guides**: `/guides/` — Placeholder for future content

### Frontend
- **Framework**: React 19 with TypeScript, bundled by Vite
- **Routing**: Wouter v3 (lightweight router with SSR support via `ssrPath`)
- **State/Data Fetching**: TanStack React Query v5 with SSR dehydration/hydration. API calls go through helper functions in `client/src/lib/api.ts`
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin), CSS variables for theming, custom fonts (Outfit for headings, Inter for body)
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`, `@assets/` maps to `attached_assets/`
- **Component patterns**: Reusable layout component with sticky header, mobile hamburger menu (Sheet), breadcrumbs, hero sections, card components (RaceCard, RouteCard), and a Tools CTA that links to aitracker.run
- **Date handling**: `client/src/lib/dates.ts` provides timezone-safe date parsing to avoid SSR/client hydration mismatches

### Backend
- **Framework**: Express 5 on Node.js with TypeScript (executed via `tsx`)
- **API pattern**: RESTful JSON API under `/api/` prefix. Routes defined in `server/routes.ts`
- **Key endpoints**:
  - `GET /api/states` — List all states
  - `GET /api/states/:slug` — Get a single state
  - `GET /api/states/:stateSlug/cities` — List cities for a state
  - `GET /api/cities/:stateSlug/:citySlug` — Get a city with state data
  - `GET /api/races` — List races with filters (state, distance, surface, city, year, month, limit)
  - `GET /api/races/:slug` — Get a single race
  - `GET /api/race-occurrences` — List race occurrences with filters (raceId, year, month)
  - `GET /api/routes` — List routes with filters (state, surface, type, city, limit)
  - `GET /api/routes/:slug` — Get a single route
  - `GET /api/collections` — List collections with filters (type, limit)
  - `GET /api/collections/:slug` — Get a single collection
  - `GET /api/influencers` — List running influencers
  - `GET /api/influencers/:slug` — Get a single influencer
  - `GET /api/podcasts` — List running podcasts with optional category filter
  - `GET /api/podcasts/:slug` — Get a single podcast
  - `GET /api/books` — List running books with optional category filter
  - `GET /api/books/:slug` — Get a single book
- **Storage layer**: `server/storage.ts` implements `IStorage` interface using `DatabaseStorage` class that wraps Drizzle ORM queries
- **Seeding**: `server/seed.ts` seeds 50 states, 18 races, 12 routes, auto-generates cities, race occurrences, sources, 6 collections, 12 influencers, 10 podcasts, and 12 books
- **Ingestion pipeline**: `server/ingestion/` contains RunSignUp API client, normalization utils, dedupe matching via source_records lookup, quality scoring, and full race import pipeline
- **Admin endpoints**: Protected by ADMIN_API_KEY env var via X-ADMIN-KEY header middleware. POST /api/admin/ingest/races (full), POST /api/admin/ingest/races/state/:state (single), GET /api/admin/stats
- **Data**: 17,150+ real races ingested from RunSignUp API across all 50 states + DC
- **Dev mode**: Vite dev server created inline in `server/index.ts` with SSR rendering via `ssrLoadModule`
- **Production**: Client built to `dist/public/`, SSR bundle to `dist/server/`, server bundled to `dist/index.cjs` via esbuild

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: `node-postgres` (pg) pool, connection string from `DATABASE_URL` environment variable
- **Schema** (in `shared/schema.ts`):
  - `states` — id, name, slug (unique), abbreviation (unique), fips, raceCount, routeCount, popularCities (text array)
  - `cities` — id, name, slug, stateId (FK), lat, lng, population. Unique index on (slug, stateId)
  - `races` — id, slug (unique), name, date, city, state, distance, surface, elevation, description, website, registrationUrl, startTime, timeLimit, bostonQualifier, cityId (FK), stateId (FK), distanceMeters, distanceLabel, lat, lng, isActive, qualityScore, firstSeenAt, lastSeenAt
  - `race_occurrences` — id, raceId (FK), startDate, startTime, year, month, priceMin, priceMax, status, courseElevationGainM, coursProfileUrl, lastModifiedAt, sourceBestId
  - `routes` — id, slug (unique), name, city, state, distance, elevationGain, surface, type, difficulty, description, cityId (FK), stateId (FK), distanceMeters, lat, lng, routeType, polyline, gpxUrl, isActive, qualityScore, firstSeenAt, lastSeenAt
  - `sources` — id, name (unique), type, baseUrl, termsUrl, priority, createdAt
  - `source_records` — id, sourceId (FK), externalId, externalUrl, payloadJson, fetchedAt, lastModifiedAt, normalizedName, normalizedLocationKey, normalizedDate, hashKey, canonicalRaceId (FK), canonicalRouteId (FK)
  - `collections` — id, type, slug (unique), title, titleTemplate, description, queryJson, isProgrammatic, isActive, updatedAt
  - `influencers` — id, slug (unique), name, handle, platform, bio, followers, specialty, website, imageUrl, isActive
  - `podcasts` — id, slug (unique), name, host, description, category, episodeCount, website, spotifyUrl, appleUrl, imageUrl, isActive
  - `books` — id, slug (unique), title, author, description, category, publishYear, pages, amazonUrl, website, imageUrl, isActive
- **Migrations**: Managed via `drizzle-kit push` (schema push approach, not migration files). Config in `drizzle.config.ts`
- **Validation**: Zod schemas auto-generated from Drizzle schema via `drizzle-zod`

### Build System
- **Dev**: `npm run dev` runs the Express server with tsx which creates Vite dev server inline with SSR
- **Build**: `npm run build` runs `script/build.ts` which builds: 1) Vite client, 2) SSR bundle, 3) esbuild server bundle
- **Production**: `npm start` runs the bundled `dist/index.cjs` with SSR rendering
- **DB Push**: `npm run db:push` syncs schema to database

### Ingestion Pipeline (server/ingestion/)
- **Normalization** (`normalize.ts`):
  - `normalizeName()` — lowercase, strip punctuation, remove common tokens (the, annual, etc.)
  - `normalizeLocationKey()` — city+state + rounded lat/lng (3 decimals)
  - `normalizeUrl()` — strip protocol, www, trailing slash
  - `generateHashKey()` — deterministic key from name+location+date
  - `computeQualityScore()` — 0-100 based on field completeness (description, website, registration, etc.)
- **Dedupe matching** (`normalize.ts`):
  - `findExactMatch()` — same name + location + date (±1 day tolerance)
  - `findFuzzyMatch()` — trigram similarity > 0.6 + same location + date ±1 day
  - `trigramSimilarity()` — Jaccard similarity on character trigrams
- **RunSignUp client** (`runsignup.ts`):
  - `fetchRacesByState()` — fetches races from RunSignUp API with pagination, date range, and modified_since support
  - `fetchAllStates()` — iterates all 50 states + DC with configurable concurrency
  - Filters virtual/draft/private races, classifies distances, strips HTML descriptions
- **Pipeline** (`pipeline.ts`):
  - `processRaceImport()` — checks source_records by (sourceId, externalId) for dedupe before upsert; updates lastSeenAt on known races
  - `markInactiveRaces()` — marks races not seen in 45 days as inactive
  - `refreshRaceData()` — full state-by-state refresh from RunSignUp API

## External Dependencies

### Database
- **PostgreSQL** — Required. Connection via `DATABASE_URL` environment variable. Used through `node-postgres` pool + Drizzle ORM

### External Services
- **aitracker.run** — External tools site linked from the Tools section and CTA components. No API integration, just outbound links

### Key NPM Packages
- **Frontend**: React 19, Wouter v3, TanStack React Query v5, Radix UI (full suite), shadcn/ui, Tailwind CSS v4, date-fns, embla-carousel-react, recharts, react-day-picker, react-hook-form, vaul (drawer), cmdk (command palette)
- **Backend**: Express 5, Drizzle ORM, node-postgres (pg), connect-pg-simple (session store), Zod
- **Build tools**: Vite, esbuild, tsx, drizzle-kit
- **Fonts**: Google Fonts (Outfit, Inter) loaded via CDN in index.html
