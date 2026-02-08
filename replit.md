# running.services

## Overview

running.services is a data-driven running hub for the USA that serves as a comprehensive race calendar and route directory. The site is designed for programmatic SEO at scale (USA → states → cities → detail pages) and includes three core sections: Races, Routes, and Tools (linking out to aitracker.run). The architecture supports generating thousands of pages from structured data. It is NOT a user-generated content platform — data is seeded/managed centrally.

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
- **JSON-LD Structured Data**: WebSite schema (home), CollectionPage (hubs), SportsEvent (race details) injected into `<head>`
- **Sitemaps**: Auto-generated split sitemaps: `sitemap.xml` (index), `sitemap-pages.xml`, `sitemap-races.xml`, `sitemap-routes.xml`, `sitemap-states.xml`
- **Robots.txt**: Proper crawler directives with sitemap references at `/robots.txt`
- **SEO Routes**: Defined in `server/seo.ts`, registered before API routes

### Frontend
- **Framework**: React 19 with TypeScript, bundled by Vite
- **Routing**: Wouter v3 (lightweight router with SSR support via `ssrPath`)
- **State/Data Fetching**: TanStack React Query v5 with SSR dehydration/hydration. API calls go through helper functions in `client/src/lib/api.ts`
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin), CSS variables for theming, custom fonts (Outfit for headings, Inter for body)
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`, `@assets/` maps to `attached_assets/`
- **Key pages**: Home (`/`), Races hub (`/races`), Race detail (`/races/:slug`), State races (`/races/state/:state`), Routes hub (`/routes`), Tools hub (`/tools`)
- **Component patterns**: Reusable layout component with sticky header, mobile hamburger menu (Sheet), breadcrumbs, hero sections, card components (RaceCard, RouteCard), and a Tools CTA that links to aitracker.run
- **Date handling**: `client/src/lib/dates.ts` provides timezone-safe date parsing to avoid SSR/client hydration mismatches

### Backend
- **Framework**: Express 5 on Node.js with TypeScript (executed via `tsx`)
- **API pattern**: RESTful JSON API under `/api/` prefix. Routes defined in `server/routes.ts`
- **Key endpoints**:
  - `GET /api/states` — List all states
  - `GET /api/states/:slug` — Get a single state
  - `GET /api/races` — List races with optional filters (state, distance, surface, limit)
  - `GET /api/races/:slug` — Get a single race
  - `GET /api/routes` — List routes with optional filters (state, surface, type, limit)
  - `GET /api/routes/:slug` — Get a single route
- **Storage layer**: `server/storage.ts` implements `IStorage` interface using `DatabaseStorage` class that wraps Drizzle ORM queries. This abstraction makes it easy to swap storage backends
- **Seeding**: `server/seed.ts` contains seed data for all 50 US states plus sample races and routes
- **Dev mode**: Vite dev server created inline in `server/index.ts` with SSR rendering via `ssrLoadModule`
- **Production**: Client built to `dist/public/`, SSR bundle to `dist/server/`, server bundled to `dist/index.cjs` via esbuild

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: `node-postgres` (pg) pool, connection string from `DATABASE_URL` environment variable
- **Schema** (in `shared/schema.ts`):
  - `states` — id, name, slug (unique), abbreviation (unique), raceCount, routeCount, popularCities (text array)
  - `races` — id, slug (unique), name, date, city, state, distance, surface, elevation, description, website, registrationUrl, startTime, timeLimit, bostonQualifier
  - `routes` — id, slug (unique), name, city, state, distance (real), elevationGain, surface, type, difficulty, description
- **Migrations**: Managed via `drizzle-kit push` (schema push approach, not migration files). Config in `drizzle.config.ts`
- **Validation**: Zod schemas auto-generated from Drizzle schema via `drizzle-zod`

### Build System
- **Dev**: `npm run dev` runs the Express server with tsx which creates Vite dev server inline with SSR
- **Build**: `npm run build` runs `script/build.ts` which builds: 1) Vite client, 2) SSR bundle, 3) esbuild server bundle
- **Production**: `npm start` runs the bundled `dist/index.cjs` with SSR rendering
- **DB Push**: `npm run db:push` syncs schema to database

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
