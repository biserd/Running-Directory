# running.services

## Overview

running.services is a race decision engine for runners in the USA. Its core purpose is to help runners find the *right* race for their specific goals (e.g., PR, beginner, value, vibe, family) by providing deterministic 0-100 scores across various criteria like difficulty, weather, vibe, value, beginner-friendliness, PR-potential, and overall quality. The platform also generates programmatic SEO pages at scale for races, routes, and state/city hubs, but its primary focus is on comparison, filtering, and decision support, backed by structured race data ingested from external sources.

Key capabilities include:
- **Programmatic SEO Pages**: Generating dynamic content for various categories like Turkey Trots, city/state specific distances, curated "Best of" lists, constraint-based pages (e.g., walker-friendly), and race series detail pages.
- **Decision Engine Surfaces**: Providing tools like a goal-driven Race Shopper, comprehensive race search with advanced filters, and a side-by-side race comparison feature.
- **Race Detail Pages**: In-depth information for individual races, including decision scores, course profiles, logistics, pricing, and reviews.
- **Alerts and Saved Searches**: Functionality for users to save races, create custom search alerts, and receive email digests for upcoming events and price changes.

The business vision is to move beyond generic race calendars to offer a sophisticated decision support system, empowering runners to make informed choices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The project is organized as a monorepo with `client/` for the React frontend, `server/` for the Express backend, and `shared/` for shared schema and types.

### Server-Side Rendering (SSR)
All pages are fully server-rendered for optimal SEO, with data prefetched into a React Query cache. The system uses React Query's `dehydrate`/`HydrationBoundary` for efficient data transfer to the client. An ISR-like caching mechanism (`server/ssr-cache.ts`) provides in-memory TTL caching with stale-while-revalidate for SSR responses, ensuring both performance and fresh content. If SSR fails, the system gracefully falls back to client-side rendering.

### SEO Infrastructure
Comprehensive SEO is a core design principle, implemented through canonical URLs, dynamic meta tags (title, description, Open Graph, Twitter), and JSON-LD structured data (WebSite, CollectionPage, SportsEvent, Place). Sitemaps are auto-generated and split, and `robots.txt` is configured for effective crawler directives. Programmatic URL structures support various content types for scalable SEO.

### Frontend
The frontend is built with **React 19** and **TypeScript**, bundled by **Vite**. It uses **Wouter v3** for routing with SSR support, and **TanStack React Query v5** for state management and data fetching with SSR dehydration. UI components are built using **shadcn/ui** (New York style) on top of **Radix UI** primitives, styled with **Tailwind CSS v4** and custom fonts.

### Backend
The backend utilizes **Express 5** on **Node.js** with **TypeScript**. It exposes a **RESTful JSON API** under the `/api/` prefix for various data entities and user interactions. The storage layer uses **Drizzle ORM** to interact with a **PostgreSQL** database. Session management is handled by `express-session` with `connect-pg-simple`. Data ingestion (`server/ingestion/`) is a critical component, handling normalization, deduplication, and quality scoring of race data from external APIs.

### Database
**PostgreSQL** is the chosen database, managed by **Drizzle ORM**. The schema defines tables for core entities like states, cities, races, users, and various content types. Migrations are handled via `drizzle-kit push`, and **Zod schemas** are auto-generated from the Drizzle schema for robust validation.

### Build System
Development uses `npm run dev` to start the Express server via `tsx` and the Vite dev server for SSR. Production builds (`npm run build`) compile client, SSR, and server bundles using Vite and esbuild.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.

### External Services
- **Resend**: Used for sending transactional emails (magic links, alerts, notifications).
- **RunSignUp API**: Primary external source for ingesting race event data.

### Key NPM Packages
- **Frontend**: React 19, Wouter v3, TanStack React Query v5, Radix UI, shadcn/ui, Tailwind CSS v4, date-fns.
- **Backend**: Express 5, Drizzle ORM, node-postgres, connect-pg-simple, Zod.
- **Build Tools**: Vite, esbuild, tsx, drizzle-kit.