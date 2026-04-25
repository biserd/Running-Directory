# running.services

## Overview

running.services is a **race decision engine** for runners in the USA. Tagline: **"Find the right race, not just the next race."** Rather than a generic race calendar, the platform helps runners pick the *right* race for their goal (PR, beginner, value, vibe, family) using deterministic 0-100 scores across difficulty, weather, vibe, value, beginner-friendliness, PR-potential, and overall quality. It still generates programmatic SEO pages at scale for races, routes, and state/city hubs, but the core product is comparison, filtering, and decision support — backed by structured race data ingested from external sources (RunSignUp).

### Decision Engine Surfaces
- **Race Shopper** (`/race-shopper`, `/race-shopper/:goal`): goal-driven race picker.
- **Compare** (`/compare`): side-by-side race comparison.
- **This Weekend** (`/this-weekend`): last-minute races in the next 72 hours.
- **Price Watch** (`/price-watch`): races whose entry fee is about to increase.
- **Race detail pages**: include score breakdowns, similar-race recommendations, and outbound-click tracking to organizer registration pages.

### Deprecated (kept alive but removed from nav, sitemap, and indexed for noindex)
Influencers, Podcasts, Books, Collections, Guides, and Blog routes still respond (so old links don't 404), but they are excluded from the sitemap, marked `noindex` via SSR meta, and `Disallow`ed in `robots.txt`.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
- **Monorepo**: Organized into `client/` (React frontend), `server/` (Express backend), and `shared/` (shared schema and types).

### Server-Side Rendering (SSR)
- **Full SSR**: All pages are server-rendered for optimal SEO, providing complete HTML content.
- **Data Prefetching**: Server prefetches data into React Query cache using `server/ssr-prefetch.ts`.
- **React Query Hydration**: Uses `dehydrate`/`HydrationBoundary` to pass server-fetched data to the client.
- **ISR-like Caching**: `server/ssr-cache.ts` implements in-memory TTL caching with stale-while-revalidate for SSR responses.
- **Graceful Fallback**: If SSR fails, the server falls back to client-side rendering while still injecting dynamic meta tags.

### SEO Infrastructure
- **Comprehensive SEO**: Includes canonical URLs, dynamic meta tags (title, description, Open Graph, Twitter), and JSON-LD structured data (WebSite, CollectionPage, SportsEvent, Place).
- **Sitemaps & Robots.txt**: Auto-generated split sitemaps and a properly configured `robots.txt` for crawler directives.
- **Programmatic URL Structure**: Defined routes for races, routes, state/city hubs, tools, collections, influencers, podcasts, and books, all designed for programmatic SEO.

### Frontend
- **Framework**: React 19 with TypeScript, bundled by Vite.
- **Routing**: Lightweight Wouter v3 with SSR support.
- **State/Data Fetching**: TanStack React Query v5 with SSR dehydration.
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives, styled with Tailwind CSS v4.
- **Styling**: Tailwind CSS with custom fonts (Outfit, Inter) and CSS variables for theming.

### Backend
- **Framework**: Express 5 on Node.js with TypeScript.
- **API**: RESTful JSON API under `/api/` prefix, providing endpoints for states, cities, races, routes, collections, influencers, podcasts, books, authentication, user favorites, and reviews.
- **Storage Layer**: `server/storage.ts` uses Drizzle ORM to interact with PostgreSQL.
- **Session Management**: `express-session` with `connect-pg-simple` for PostgreSQL-backed sessions.
- **Data Ingestion**: `server/ingestion/` handles race data ingestion from external APIs (e.g., RunSignUp), including normalization, deduplication, quality scoring, and periodic data refreshes.
- **Admin Endpoints**: Protected endpoints for managing data ingestion.

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect.
- **Schema**: Defines tables for `states`, `cities`, `races`, `race_occurrences`, `routes`, `sources`, `source_records`, `collections`, `influencers`, `podcasts`, `books`, `reviews`, `users`, `magic_link_tokens`, and `favorites`.
- **Migrations**: Managed via `drizzle-kit push` for schema synchronization.
- **Validation**: Zod schemas auto-generated from Drizzle schema.

### Build System
- **Development**: `npm run dev` starts the Express server with `tsx`, which in turn launches the Vite dev server for SSR.
- **Production Build**: `npm run build` compiles the client, SSR bundle, and server bundle using Vite and esbuild.
- **Deployment**: `npm start` executes the production server bundle.

## External Dependencies

### Database
- **PostgreSQL**: Essential database, connected via `DATABASE_URL` environment variable using `node-postgres` and Drizzle ORM.

### External Services
- **aitracker.run**: External tools website linked from the platform, without direct API integration.
- **Resend**: Used for sending magic link emails and new user notifications.
- **RunSignUp API**: Primary source for ingesting race data into the platform.

### Key NPM Packages
- **Frontend**: React 19, Wouter v3, TanStack React Query v5, Radix UI, shadcn/ui, Tailwind CSS v4, date-fns.
- **Backend**: Express 5, Drizzle ORM, node-postgres, connect-pg-simple, Zod.
- **Build Tools**: Vite, esbuild, tsx, drizzle-kit.