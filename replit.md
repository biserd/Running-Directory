# running.services

## Overview
running.services is a race decision engine for runners in the USA, aiming to help them find the right race for their specific goals (e.g., PR, beginner, value, vibe, family). It provides deterministic 0-100 scores across various criteria like difficulty, weather, vibe, value, beginner-friendliness, PR-potential, and overall quality. The platform also generates programmatic SEO pages at scale for races, routes, and state/city hubs, focusing on comparison, filtering, and decision support using structured race data from external sources.

Key capabilities include:
- **RaceScore (the "Zestimate" for races)**: A single composite **0-100 RaceScore + A+/A/B/C/D grade** displayed prominently on every race card (small circular dial top-right) and as a large dial in the race-detail hero. Computed by a pure helper in `shared/race-score.ts` (`computeRaceScore(input)` — usable on both server and client) as a weighted blend of PR potential (20%), value (25%), vibe (15%), beginner-friendliness (10%), family-fit (5%), urgency (10%), and data completeness (15%). Missing sub-scores are dropped and their weight is **redistributed** to whatever IS present, so the score is always 0-100. Trust-signal **bonuses** (BQ-certified +3, course photos +2, verified elevation +1, large field +2, highly-rated by runners +3) cap at +8. Returns `{score, grade, components, bonuses, confidence, headline}` — the popover on the badge shows weights, sub-score bars, applied bonuses, and a one-line headline ("Top-tier race — strongest on value for money."). Compare page adds a RaceScore row at the top with best-in-row highlighting on the computed value.
- **Programmatic SEO Pages**: Dynamic content generation for categories such as Turkey Trots, city/state specific distances, curated "Best of" lists, and race series details.
- **Decision Engine Surfaces**: Tools like a goal-driven Race Shopper, advanced race search, and side-by-side race comparison.
- **Race Detail Pages**: In-depth information for individual races, including decision scores, course profiles, logistics, pricing, and reviews.
- **Organizer Surface**: A dashboard for race owners to claim and manage their races, update details, and access analytics.
- **Monetization (Phase 2)**: Implementation of paid features like Race Pro subscriptions, sponsorship slots, local market reports, and API access.
- **Map-First Browsing (`/map`)**: A nationwide race map with filtering capabilities (state, distance, date presets, pins/heatmap toggle) powered by the Google Maps JavaScript API.
- **Market Intelligence Cards**: Summary cards providing market insights scoped by state, city, and distance.
- **Travel-Cost Estimator**: Estimates travel costs from a user's home ZIP to races, displayed on race detail and comparison pages.
- **Race-Day Weather + PR Verdict**: Provides weather forecasts and a PR-window verdict based on race-day conditions.
- **Course Photo Carousel**: Displays organizer-uploaded race photos on detail pages.
- **Plan-Your-Trip Panel**: Integrates affiliate-tracked CTAs for hotels, flights, gear, and coaching.
- **Field-Level Provenance & Trust Resolver**: System for merging and resolving race data from multiple sources based on trust scores.
- **Alerts and Saved Searches**: Features for users to save races, searches, and subscribe to various race-related alerts.

The business vision is to evolve beyond generic race calendars to offer a sophisticated decision support system, empowering runners with informed choices.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The project is organized as a monorepo with `client/` for the React frontend, `server/` for the Express backend, and `shared/` for shared schema and types.

### Server-Side Rendering (SSR)
All pages are fully server-rendered for optimal SEO, with data prefetched into a React Query cache. An ISR-like caching mechanism (`server/ssr-cache.ts`) provides in-memory TTL caching with stale-while-revalidate for SSR responses.

### SEO Infrastructure
Comprehensive SEO is a core design principle, implemented through canonical URLs, dynamic meta tags (title, description, Open Graph, Twitter), and JSON-LD structured data. Sitemaps are auto-generated, and `robots.txt` is configured.

### Frontend
The frontend is built with **React 19** and **TypeScript**, bundled by **Vite**. It uses **Wouter v3** for routing, and **TanStack React Query v5** for state management and data fetching. UI components are built using **shadcn/ui** (New York style) on top of **Radix UI** primitives, styled with **Tailwind CSS v4** and custom fonts.

### Backend
The backend uses **Express 5** on **Node.js** with **TypeScript**. It exposes a **RESTful JSON API** under the `/api/` prefix. The storage layer uses **Drizzle ORM** with **PostgreSQL**. Session management is handled by `express-session` with `connect-pg-simple`. Data ingestion (`server/ingestion/`) handles normalization, deduplication, and quality scoring of race data.

### Database
**PostgreSQL** is the chosen database, managed by **Drizzle ORM**. Migrations are handled via `drizzle-kit push`, and **Zod schemas** are auto-generated from the Drizzle schema.

### Build System
Development uses `npm run dev` to start the Express server via `tsx` and the Vite dev server for SSR. Production builds (`npm run build`) compile client, SSR, and server bundles using Vite and esbuild.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.

### External Services
- **Resend**: Used for sending transactional emails (magic links, alerts, notifications).
- **RunSignUp API**: Primary external source for ingesting race event data.
- **Open-Meteo**: Used for geocoding and weather data.
- **Google Maps JavaScript API**: Powers map-based browsing features.
- **Booking.com, Google Flights, Running Warehouse, TrainingPeaks**: Affiliate partners for trip planning.

### Key NPM Packages
- **Frontend**: React 19, Wouter v3, TanStack React Query v5, Radix UI, shadcn/ui, Tailwind CSS v4, date-fns.
- **Backend**: Express 5, Drizzle ORM, node-postgres, connect-pg-simple, Zod.
- **Build Tools**: Vite, esbuild, tsx, drizzle-kit.