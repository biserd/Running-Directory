# running.services

## Overview

running.services is a **race decision engine** for runners in the USA. Tagline: **"Find the right race, not just the next race."** Rather than a generic race calendar, the platform helps runners pick the *right* race for their goal (PR, beginner, value, vibe, family) using deterministic 0-100 scores across difficulty, weather, vibe, value, beginner-friendliness, PR-potential, and overall quality. It still generates programmatic SEO pages at scale for races, routes, and state/city hubs, but the core product is comparison, filtering, and decision support — backed by structured race data ingested from external sources (RunSignUp).

### Decision Engine Surfaces
- **Homepage** (`/`): "Find the right race." hero with location/distance/month/goal search form, 8 goal chips (first race, PR, fun, family, trail, cheap, charity, Turkey Trot), this-weekend digest, best-value 5Ks, beginner-friendly halfs, popular metros, Turkey Trot teaser, Race Shopper invite, organizers callout, browse-by-state.
- **Race search** (`/races`): comprehensive filter rail (distance, month, surface, terrain, elevation bucket, race-size bucket, max price, beginner/accessibility flags, vibe, logistics), sort by date/price/beginner/PR/value/vibe/family/urgency/quality, mobile-first chip filters with bottom-sheet, list/map view toggle (map placeholder), client-side compare cart with floating CompareBar.
- **Race Shopper** (`/race-shopper`, `/race-shopper/:goal`, plus aliases `/shopper` and `/shopper/:goal`): goal-driven race picker. Six goal chips (first race / PR / value / vibe / family / urgency), guided form (distance, state, month or explicit date range, budget, terrain, surface, effort/difficulty, travel radius, walker/stroller/BQ flags), POSTs to `/api/races/shopper`, then renders categorized recommendations (top picks for goal, best value, beginner-friendly, PR potential, big vibe, hidden gems, sign-up urgency) with plain-English rationale per pick.
- **Compare** (`/compare`): side-by-side race comparison (reads `?ids=` from URL, max 4 races). Rows include date, start time, travel/location, surface, race-day weather link, elevation, entry fee, field size, registration deadline, next price hike, BQ status, walker/stroller flags, refund policy, deferral policy, runner reviews link, plus a "Decision scores (0–100)" block (beginner / PR / value / vibe / family) and a "Best fit" badge row. Highlights the best value in each comparable row. Register CTAs wired to outbound tracking. Removing a race uses wouter's in-app navigation (no full page reload).
- **Race detail** (`/races/:slug`): full decision page with 18+ sections — hero with Register/Compare/Notify/Website CTAs, decision score strip (six 0–100 scores via `ScoreBlock`), best-for badges, about, course profile (elevation chart from Open-Meteo), course features grid, accessibility & inclusion (always rendered with placeholders for missing data), vibe & charity (always rendered with placeholders), history & past results (years running, recurrence pattern), reviews (`#reviews` anchor), similar races (`/api/races/:slug/similar`), tools CTA, and sidebar (logistics, pricing & registration with next-price-hike warning, difficulty card, weather card with `#weather` anchor and unavailable fallback, organizer/claim card that redirects to `/organizers` after submission, data source, explore-the-area links, nearby routes/books/podcasts). All outbound clicks tracked via `/api/outbound`. SSR JSON-LD includes Offer or AggregateOffer (price/lowPrice/highPrice, currency, availability, validThrough), Organization, GeoCoordinates, and additionalProperty (terrain, elevation gain, surface).
- **This Weekend** (`/this-weekend`): last-minute races in the next 72 hours.
- **Price Watch** (`/price-watch`): races whose entry fee is about to increase.

### Race Card
The shared `RaceCard` component (`client/src/components/race-card.tsx`) shows distance, name, date, city/state, price range, field size, terrain, elevation, registration deadline, next-price-increase warning, beginner/PR/value scores, vibe tags, and Save / Compare / Alert / Register actions. The Register button POSTs to `/api/outbound` for click tracking before opening the organizer URL.

### Compare Cart
A localStorage-backed `useCompareCart` hook (`client/src/hooks/use-compare-cart.ts`) stages up to 4 race IDs. The `CompareBar` component renders a floating bottom bar on the search page when 1+ races are staged and links to `/compare?ids=...`.

### Shared decision components
- `client/src/components/score-block.tsx` — renders the six 0–100 decision scores with tooltips reading rationale from `scoreBreakdown` jsonb. Used by race detail and (in compact form) by other surfaces.
- `client/src/components/best-for-badges.tsx` — derives up to 9 "best for" badges (beginners, PR-friendly, walkers, families, value, vibe, destination, charity, trail/hill challenge) from race fields. Used by race detail, compare table, and Race Shopper picks.

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