import { QueryClient } from "@tanstack/react-query";
import { storage } from "./storage";
import type { PageMeta } from "../client/src/entry-server";

type PrefetchFn = (queryClient: QueryClient, params: Record<string, string>) => Promise<PageMeta>;

const defaultMeta: PageMeta = {
  title: "running.services | USA Race Calendar & Route Directory",
  description: "The comprehensive data-driven running hub for the USA. Find races, discover routes, and access essential training tools.",
  ogType: "website",
};

const prefetchHome: PrefetchFn = async (qc) => {
  const [races, routes, states] = await Promise.all([
    storage.getRaces({ limit: 4 }),
    storage.getRoutes({ limit: 4 }),
    storage.getStates(),
  ]);

  qc.setQueryData(["/api/races", { limit: 4 }], races);
  qc.setQueryData(["/api/routes", { limit: 4 }], routes);
  qc.setQueryData(["/api/states"], states);

  return {
    ...defaultMeta,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "running.services",
      url: "https://running.services",
      description: defaultMeta.description,
      potentialAction: {
        "@type": "SearchAction",
        target: "https://running.services/races?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  };
};

const prefetchRaces: PrefetchFn = async (qc) => {
  const [races, states] = await Promise.all([
    storage.getRaces(),
    storage.getStates(),
  ]);

  qc.setQueryData(["/api/races", {}], races);
  qc.setQueryData(["/api/states"], states);

  return {
    title: "USA Race Calendar | running.services",
    description: "Discover thousands of races from 5Ks to Ultras across all 50 states. Find your next marathon, half marathon, or trail race.",
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "USA Race Calendar",
      description: "Comprehensive race calendar with thousands of running events across the United States.",
      url: "https://running.services/races",
    },
  };
};

const prefetchRacesState: PrefetchFn = async (qc, params) => {
  const stateSlug = params.state;
  const [stateData, allStates] = await Promise.all([
    storage.getStateBySlug(stateSlug),
    storage.getStates(),
  ]);

  qc.setQueryData(["/api/states", stateSlug], stateData);
  qc.setQueryData(["/api/states"], allStates);

  if (stateData) {
    const races = await storage.getRaces({ state: stateData.abbreviation });
    qc.setQueryData(["/api/races", { state: stateData.abbreviation }], races);

    return {
      title: `${stateData.name} Race Calendar | running.services`,
      description: `Find the best 5Ks, Half Marathons, and Marathons in ${stateData.name}. Browse ${stateData.raceCount} running events.`,
      ogType: "website",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${stateData.name} Race Calendar`,
        description: `Running races and events in ${stateData.name}.`,
        url: `https://running.services/races/state/${stateSlug}`,
      },
    };
  }

  return {
    title: "State Races | running.services",
    description: "Browse races by state.",
    ogType: "website",
  };
};

const prefetchRaceDetail: PrefetchFn = async (qc, params) => {
  const slug = params.slug;
  const [race, nearbyRoutes] = await Promise.all([
    storage.getRaceBySlug(slug),
    storage.getRoutes({ limit: 3 }),
  ]);

  qc.setQueryData(["/api/races", slug], race);
  qc.setQueryData(["/api/routes", { limit: 3 }], nearbyRoutes);

  if (race) {
    return {
      title: `${race.name} - ${race.city}, ${race.state} | running.services`,
      description: race.description || `${race.name} is a ${race.distance} race in ${race.city}, ${race.state}. ${race.surface} course with ${race.elevation.toLowerCase()} elevation.`,
      ogTitle: race.name,
      ogDescription: `${race.distance} race on ${race.date} in ${race.city}, ${race.state}`,
      ogType: "article",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: race.name,
        startDate: race.date,
        location: {
          "@type": "Place",
          name: `${race.city}, ${race.state}`,
          address: {
            "@type": "PostalAddress",
            addressLocality: race.city,
            addressRegion: race.state,
            addressCountry: "US",
          },
        },
        description: race.description || `A ${race.distance} race in ${race.city}, ${race.state}.`,
        sport: "Running",
        url: `https://running.services/races/${slug}`,
        ...(race.website ? { sameAs: race.website } : {}),
      },
    };
  }

  return {
    title: "Race Not Found | running.services",
    description: "The requested race could not be found.",
    ogType: "website",
  };
};

const prefetchRoutes: PrefetchFn = async (qc) => {
  const routes = await storage.getRoutes();
  qc.setQueryData(["/api/routes"], routes);

  return {
    title: "Running Routes Directory | running.services",
    description: "Explore the best running paths, trails, and track loops across the USA. Find routes near you with distance, elevation, and difficulty info.",
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Running Routes Directory",
      description: "Directory of running routes across the United States.",
      url: "https://running.services/routes",
    },
  };
};

const prefetchTools: PrefetchFn = async () => {
  return {
    title: "Running Tools | running.services",
    description: "Essential running tools powered by AI. Pace calculators, training plan generators, and race prediction tools.",
    ogType: "website",
  };
};

interface RouteMatch {
  pattern: RegExp;
  prefetch: PrefetchFn;
  paramNames: string[];
}

const routeMatches: RouteMatch[] = [
  { pattern: /^\/$/, prefetch: prefetchHome, paramNames: [] },
  { pattern: /^\/races$/, prefetch: prefetchRaces, paramNames: [] },
  { pattern: /^\/races\/state\/([^/]+)$/, prefetch: prefetchRacesState, paramNames: ["state"] },
  { pattern: /^\/races\/([^/]+)$/, prefetch: prefetchRaceDetail, paramNames: ["slug"] },
  { pattern: /^\/routes$/, prefetch: prefetchRoutes, paramNames: [] },
  { pattern: /^\/tools/, prefetch: prefetchTools, paramNames: [] },
];

export function getSSRPrefetch(url: string): ((qc: QueryClient) => Promise<PageMeta>) | undefined {
  const pathname = url.split("?")[0];

  for (const route of routeMatches) {
    const match = pathname.match(route.pattern);
    if (match) {
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return (qc: QueryClient) => route.prefetch(qc, params);
    }
  }

  return undefined;
}
