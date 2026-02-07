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

### Frontend
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router, not React Router)
- **State/Data Fetching**: TanStack React Query v5 with a custom `queryClient` setup. API calls go through helper functions in `client/src/lib/api.ts`
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin), CSS variables for theming, custom fonts (Outfit for headings, Inter for body)
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`, `@assets/` maps to `attached_assets/`
- **Key pages**: Home (`/`), Races hub (`/races`), Race detail (`/races/:slug`), Routes hub (`/routes`), Tools hub (`/tools`)
- **Component patterns**: Reusable layout component with sticky header, mobile hamburger menu (Sheet), breadcrumbs, hero sections, card components (RaceCard, RouteCard), and a Tools CTA that links to aitracker.run

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
- **Dev mode**: Vite dev server is integrated as middleware (via `server/vite.ts`) for HMR
- **Production**: Client is built to `dist/public/`, server is bundled to `dist/index.cjs` via esbuild

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
- **Dev**: `npm run dev` runs the Express server with tsx which integrates Vite middleware
- **Build**: `npm run build` runs `script/build.ts` which builds the Vite client and bundles the server with esbuild
- **Production**: `npm start` runs the bundled `dist/index.cjs`
- **DB Push**: `npm run db:push` syncs schema to database

### SEO & Programmatic Pages
- The URL structure is designed for programmatic SEO: `/races/state/:state`, `/races/:slug`, `/routes/:slug`
- Meta tags for OpenGraph and Twitter cards are set in `index.html`
- A custom Vite plugin (`vite-plugin-meta-images.ts`) handles dynamic og:image URLs for Replit deployments
- Breadcrumb navigation component supports structured data patterns

## External Dependencies

### Database
- **PostgreSQL** — Required. Connection via `DATABASE_URL` environment variable. Used through `node-postgres` pool + Drizzle ORM

### External Services
- **aitracker.run** — External tools site linked from the Tools section and CTA components. No API integration, just outbound links

### Key NPM Packages
- **Frontend**: React, Wouter, TanStack React Query, Radix UI (full suite), shadcn/ui, Tailwind CSS, date-fns, embla-carousel-react, recharts, react-day-picker, react-hook-form, vaul (drawer), cmdk (command palette)
- **Backend**: Express 5, Drizzle ORM, node-postgres (pg), connect-pg-simple (session store), Zod
- **Build tools**: Vite, esbuild, tsx, drizzle-kit
- **Fonts**: Google Fonts (Outfit, Inter) loaded via CDN in index.html