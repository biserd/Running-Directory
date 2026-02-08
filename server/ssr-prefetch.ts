import { QueryClient } from "@tanstack/react-query";
import { storage } from "./storage";
import type { PageMeta } from "../client/src/entry-server";

type PrefetchFn = (queryClient: QueryClient, params: Record<string, string>) => Promise<PageMeta>;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const defaultMeta: PageMeta = {
  title: "running.services | USA Race Calendar & Route Directory",
  description: "The comprehensive data-driven running hub for the USA. Find races, discover routes, and access essential training tools.",
  ogType: "website",
};

const prefetchHome: PrefetchFn = async (qc) => {
  const [races, routes, statesList] = await Promise.all([
    storage.getRaces({ limit: 4 }),
    storage.getRoutes({ limit: 4 }),
    storage.getStates(),
  ]);

  qc.setQueryData(["/api/races", { limit: 4 }], races);
  qc.setQueryData(["/api/routes", { limit: 4 }], routes);
  qc.setQueryData(["/api/states"], statesList);

  return {
    ...defaultMeta,
    canonicalUrl: "https://running.services/",
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
  const [races, statesList] = await Promise.all([
    storage.getRaces(),
    storage.getStates(),
  ]);

  qc.setQueryData(["/api/races", {}], races);
  qc.setQueryData(["/api/states"], statesList);

  return {
    title: "USA Race Calendar | running.services",
    description: "Discover thousands of races from 5Ks to Ultras across all 50 states. Find your next marathon, half marathon, or trail race.",
    ogType: "website",
    canonicalUrl: "https://running.services/races",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "USA Race Calendar",
      description: "Comprehensive race calendar with thousands of running events across the United States.",
      url: "https://running.services/races",
    },
  };
};

const prefetchRacesUSA: PrefetchFn = async (qc) => {
  const statesList = await storage.getStates();
  qc.setQueryData(["/api/states"], statesList);

  return {
    title: "USA Race Directory - All 50 States | running.services",
    description: "Browse running races across all 50 US states. Find marathons, half marathons, 5Ks, trail races, and ultras near you.",
    ogType: "website",
    canonicalUrl: "https://running.services/races/usa",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "USA Race Directory",
      description: "Complete directory of running races in all 50 US states.",
      url: "https://running.services/races/usa",
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
      canonicalUrl: `https://running.services/races/state/${stateSlug}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${stateData.name} Race Calendar`,
        description: `Running races and events in ${stateData.name}.`,
        url: `https://running.services/races/state/${stateSlug}`,
      },
    };
  }

  return { title: "State Not Found | running.services", description: "The requested state could not be found.", ogType: "website", is404: true, noindex: true };
};

const prefetchRacesCity: PrefetchFn = async (qc, params) => {
  const { state: stateSlug, city: citySlug } = params;
  const [stateData, cityData] = await Promise.all([
    storage.getStateBySlug(stateSlug),
    storage.getCityBySlug(stateSlug, citySlug),
  ]);

  qc.setQueryData(["/api/states", stateSlug], stateData);
  if (cityData) {
    qc.setQueryData(["/api/cities", stateSlug, citySlug], cityData);
    if (stateData) {
      const races = await storage.getRaces({ city: cityData.name, state: stateData.abbreviation });
      qc.setQueryData(["/api/races", { city: cityData.name, state: stateData.abbreviation }], races);
    }

    const stateName = stateData?.name || stateSlug;
    return {
      title: `${cityData.name} Races, ${stateName} | running.services`,
      description: `Find running races in ${cityData.name}, ${stateName}. Browse 5Ks, half marathons, and marathons.`,
      ogType: "website",
      canonicalUrl: `https://running.services/races/state/${stateSlug}/city/${citySlug}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${cityData.name} Races`,
        description: `Running races in ${cityData.name}, ${stateName}.`,
        url: `https://running.services/races/state/${stateSlug}/city/${citySlug}`,
      },
    };
  }

  return { title: "City Not Found | running.services", description: "The requested city could not be found.", ogType: "website", is404: true, noindex: true };
};

const prefetchRacesYear: PrefetchFn = async (qc, params) => {
  const year = parseInt(params.year);
  const month = params.month ? parseInt(params.month) : undefined;
  const races = await storage.getRaces({ year, month });
  qc.setQueryData(["/api/races", { year, month }], races);

  const title = month && month >= 1 && month <= 12
    ? `${MONTH_NAMES[month - 1]} ${year} Races | running.services`
    : `${year} Race Calendar | running.services`;

  const desc = month && month >= 1 && month <= 12
    ? `Running races happening in ${MONTH_NAMES[month - 1]} ${year}. Browse marathons, 5Ks, and more.`
    : `Browse all running races scheduled for ${year}. Find marathons, half marathons, and trail races.`;

  return {
    title,
    description: desc,
    ogType: "website",
    canonicalUrl: month
      ? `https://running.services/races/year/${year}/month/${String(month).padStart(2, "0")}`
      : `https://running.services/races/year/${year}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title.replace(" | running.services", ""),
      url: month
        ? `https://running.services/races/year/${year}/month/${String(month).padStart(2, "0")}`
        : `https://running.services/races/year/${year}`,
    },
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
      canonicalUrl: `https://running.services/races/${slug}`,
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
      breadcrumbJsonLd: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://running.services/" },
          { "@type": "ListItem", position: 2, name: "Races", item: "https://running.services/races" },
          { "@type": "ListItem", position: 3, name: race.name, item: `https://running.services/races/${slug}` },
        ],
      },
    };
  }

  return { title: "Race Not Found | running.services", description: "The requested race could not be found.", ogType: "website", is404: true, noindex: true };
};

const prefetchRoutes: PrefetchFn = async (qc) => {
  const routesList = await storage.getRoutes();
  qc.setQueryData(["/api/routes"], routesList);

  return {
    title: "Running Routes Directory | running.services",
    description: "Explore the best running paths, trails, and track loops across the USA. Find routes near you with distance, elevation, and difficulty info.",
    ogType: "website",
    canonicalUrl: "https://running.services/routes",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Running Routes Directory",
      description: "Directory of running routes across the United States.",
      url: "https://running.services/routes",
    },
  };
};

const prefetchRoutesState: PrefetchFn = async (qc, params) => {
  const stateSlug = params.state;
  const stateData = await storage.getStateBySlug(stateSlug);
  qc.setQueryData(["/api/states", stateSlug], stateData);

  if (stateData) {
    const routesList = await storage.getRoutes({ state: stateData.abbreviation });
    qc.setQueryData(["/api/routes", { state: stateData.abbreviation }], routesList);

    return {
      title: `${stateData.name} Running Routes | running.services`,
      description: `Discover the best running paths, trails, and loops in ${stateData.name}. ${stateData.routeCount} routes available.`,
      ogType: "website",
      canonicalUrl: `https://running.services/routes/state/${stateSlug}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${stateData.name} Running Routes`,
        url: `https://running.services/routes/state/${stateSlug}`,
      },
    };
  }

  return { title: "State Not Found | running.services", description: "The requested state could not be found.", ogType: "website", is404: true, noindex: true };
};

const prefetchRoutesCity: PrefetchFn = async (qc, params) => {
  const { state: stateSlug, city: citySlug } = params;
  const [stateData, cityData] = await Promise.all([
    storage.getStateBySlug(stateSlug),
    storage.getCityBySlug(stateSlug, citySlug),
  ]);

  qc.setQueryData(["/api/states", stateSlug], stateData);
  if (cityData) {
    qc.setQueryData(["/api/cities", stateSlug, citySlug], cityData);
    if (stateData) {
      const routesList = await storage.getRoutes({ city: cityData.name, state: stateData.abbreviation });
      qc.setQueryData(["/api/routes", { city: cityData.name, state: stateData.abbreviation }], routesList);
    }

    const stateName = stateData?.name || stateSlug;
    return {
      title: `${cityData.name} Running Routes, ${stateName} | running.services`,
      description: `Explore running routes in ${cityData.name}, ${stateName}. Find paths, trails, and loops.`,
      ogType: "website",
      canonicalUrl: `https://running.services/routes/state/${stateSlug}/city/${citySlug}`,
    };
  }

  return { title: "City Not Found | running.services", description: "The requested city could not be found.", ogType: "website", is404: true, noindex: true };
};

const prefetchRouteDetail: PrefetchFn = async (qc, params) => {
  const slug = params.slug;
  const route = await storage.getRouteBySlug(slug);
  qc.setQueryData(["/api/routes", slug], route);

  if (route) {
    const nearbyRaces = await storage.getRaces({ state: route.state, limit: 3 });
    qc.setQueryData(["/api/races", { state: route.state, limit: 3 }], nearbyRaces);

    return {
      title: `${route.name} - ${route.city}, ${route.state} | running.services`,
      description: route.description || `${route.name} is a ${route.distance}-mile ${route.type.toLowerCase()} route in ${route.city}, ${route.state}. ${route.surface} surface, ${route.difficulty} difficulty.`,
      ogTitle: route.name,
      ogDescription: `${route.distance} mi ${route.type} route in ${route.city}, ${route.state}`,
      ogType: "article",
      canonicalUrl: `https://running.services/routes/${slug}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Place",
        name: route.name,
        description: route.description || `A ${route.distance}-mile ${route.type.toLowerCase()} running route.`,
        address: {
          "@type": "PostalAddress",
          addressLocality: route.city,
          addressRegion: route.state,
          addressCountry: "US",
        },
        url: `https://running.services/routes/${slug}`,
      },
      breadcrumbJsonLd: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://running.services/" },
          { "@type": "ListItem", position: 2, name: "Routes", item: "https://running.services/routes" },
          { "@type": "ListItem", position: 3, name: route.name, item: `https://running.services/routes/${slug}` },
        ],
      },
    };
  }

  return { title: "Route Not Found | running.services", description: "The requested route could not be found.", ogType: "website", is404: true, noindex: true };
};

const prefetchTools: PrefetchFn = async () => {
  return {
    title: "Running Tools | running.services",
    description: "Essential running tools powered by AI. Pace calculators, training plan generators, and race prediction tools.",
    ogType: "website",
    canonicalUrl: "https://running.services/tools",
  };
};

const prefetchToolDetail: PrefetchFn = async (_qc, params) => {
  const toolNames: Record<string, string> = {
    "race-predictor": "Race Predictor",
    "pace-calculator": "Pace Calculator",
    "training-plan": "Training Plans",
    "vo2-estimator": "VO2 Max Estimator",
  };
  const name = toolNames[params.slug] || "Running Tool";
  return {
    title: `${name} | running.services`,
    description: `Use the ${name} tool powered by AITracker.run. Data-driven insights for runners.`,
    ogType: "website",
    canonicalUrl: `https://running.services/tools/${params.slug}`,
  };
};

const prefetchGuides: PrefetchFn = async () => {
  return {
    title: "Running Guides | running.services",
    description: "Expert running guides for all levels. Training tips, gear reviews, nutrition strategies, and race-day advice.",
    ogType: "website",
    canonicalUrl: "https://running.services/guides",
    noindex: true,
  };
};

const prefetchCollections: PrefetchFn = async (qc) => {
  const collectionsList = await storage.getCollections();
  qc.setQueryData(["/api/collections"], collectionsList);

  return {
    title: "Collections | running.services",
    description: "Curated lists of the best races and routes across the USA. Expert picks and community favorites.",
    ogType: "website",
    canonicalUrl: "https://running.services/collections",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Running Collections",
      url: "https://running.services/collections",
    },
  };
};

const prefetchCollectionDetail: PrefetchFn = async (qc, params) => {
  const slug = params.slug;
  const collection = await storage.getCollectionBySlug(slug);
  qc.setQueryData(["/api/collections", slug], collection);

  if (collection) {
    return {
      title: `${collection.title} | running.services`,
      description: collection.description || `A curated collection of ${collection.type}.`,
      ogType: "article",
      canonicalUrl: `https://running.services/collections/${slug}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: collection.title,
        description: collection.description,
        url: `https://running.services/collections/${slug}`,
      },
    };
  }

  return { title: "Collection Not Found | running.services", description: "The requested collection could not be found.", ogType: "website", is404: true, noindex: true };
};

const prefetchInfluencers: PrefetchFn = async (qc) => {
  const list = await storage.getInfluencers({});
  qc.setQueryData(["/api/influencers"], list);
  return {
    ...defaultMeta,
    title: "Running Influencers | running.services",
    description: "Follow the top runners, coaches, and content creators shaping the running community.",
    ogTitle: "Running Influencers",
    ogDescription: "Follow the top runners, coaches, and content creators shaping the running community.",
    canonicalUrl: "https://running.services/influencers",
  };
};

const prefetchInfluencerDetail: PrefetchFn = async (qc, params) => {
  const influencer = await storage.getInfluencerBySlug(params.slug);
  qc.setQueryData(["/api/influencers", params.slug], influencer);
  if (influencer) {
    return {
      title: `${influencer.name} - Running Influencer | running.services`,
      description: influencer.bio || `${influencer.name} is a running influencer on ${influencer.platform}.`,
      ogTitle: influencer.name,
      ogDescription: influencer.bio || `Follow ${influencer.name} on ${influencer.platform}`,
      ogType: "profile",
      canonicalUrl: `https://running.services/influencers/${params.slug}`,
    };
  }
  return { title: "Influencer Not Found | running.services", description: "The requested influencer could not be found.", ogType: "website", is404: true, noindex: true };
};

const prefetchPodcasts: PrefetchFn = async (qc) => {
  const list = await storage.getPodcasts({});
  qc.setQueryData(["/api/podcasts"], list);
  return {
    ...defaultMeta,
    title: "Running Podcasts | running.services",
    description: "The best podcasts for runners — from training tips to elite athlete interviews.",
    ogTitle: "Running Podcasts",
    ogDescription: "The best podcasts for runners — from training tips to elite athlete interviews.",
    canonicalUrl: "https://running.services/podcasts",
  };
};

const prefetchPodcastDetail: PrefetchFn = async (qc, params) => {
  const podcast = await storage.getPodcastBySlug(params.slug);
  qc.setQueryData(["/api/podcasts", params.slug], podcast);
  if (podcast) {
    return {
      title: `${podcast.name} - Running Podcast | running.services`,
      description: podcast.description || `${podcast.name} hosted by ${podcast.host}.`,
      ogTitle: podcast.name,
      ogDescription: podcast.description || `Listen to ${podcast.name} hosted by ${podcast.host}`,
      ogType: "article",
      canonicalUrl: `https://running.services/podcasts/${params.slug}`,
    };
  }
  return { title: "Podcast Not Found | running.services", description: "The requested podcast could not be found.", ogType: "website", is404: true, noindex: true };
};

const prefetchBooks: PrefetchFn = async (qc) => {
  const list = await storage.getBooks({});
  qc.setQueryData(["/api/books"], list);
  return {
    ...defaultMeta,
    title: "Running Books | running.services",
    description: "Essential reading for runners — from training science to inspiring memoirs.",
    ogTitle: "Running Books",
    ogDescription: "Essential reading for runners — from training science to inspiring memoirs.",
    canonicalUrl: "https://running.services/books",
  };
};

const prefetchBookDetail: PrefetchFn = async (qc, params) => {
  const book = await storage.getBookBySlug(params.slug);
  qc.setQueryData(["/api/books", params.slug], book);
  if (book) {
    return {
      title: `${book.title} by ${book.author} - Running Book | running.services`,
      description: book.description || `${book.title} by ${book.author}.`,
      ogTitle: book.title,
      ogDescription: book.description || `${book.title} by ${book.author}`,
      ogType: "book",
      canonicalUrl: `https://running.services/books/${params.slug}`,
    };
  }
  return { title: "Book Not Found | running.services", description: "The requested book could not be found.", ogType: "website", is404: true, noindex: true };
};

const prefetchStateHub: PrefetchFn = async (qc, params) => {
  const stateSlug = params.state;
  const stateData = await storage.getStateBySlug(stateSlug);
  qc.setQueryData(["/api/states", stateSlug], stateData);

  if (stateData) {
    const [races, routes, cities] = await Promise.all([
      storage.getRaces({ state: stateData.abbreviation, limit: 6 }),
      storage.getRoutes({ state: stateData.abbreviation, limit: 6 }),
      storage.getCitiesByState(stateData.id),
    ]);
    qc.setQueryData(["/api/races", { state: stateData.abbreviation, limit: 6 }], races);
    qc.setQueryData(["/api/routes", { state: stateData.abbreviation, limit: 6 }], routes);
    qc.setQueryData(["/api/states", stateSlug, "cities"], cities);

    return {
      title: `${stateData.name} Running Hub - Races, Routes & More | running.services`,
      description: `Everything running in ${stateData.name}. Browse ${stateData.raceCount} races, ${stateData.routeCount} routes, and discover running resources.`,
      ogTitle: `${stateData.name} Running Hub`,
      ogDescription: `Races, routes, and running resources in ${stateData.name}.`,
      ogType: "website",
      canonicalUrl: `https://running.services/state/${stateSlug}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${stateData.name} Running Hub`,
        description: `Running races, routes, and resources in ${stateData.name}.`,
        url: `https://running.services/state/${stateSlug}`,
      },
      breadcrumbJsonLd: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://running.services/" },
          { "@type": "ListItem", position: 2, name: stateData.name, item: `https://running.services/state/${stateSlug}` },
        ],
      },
    };
  }

  return { title: "State Not Found | running.services", description: "The requested state could not be found.", ogType: "website", is404: true, noindex: true };
};

const prefetchCityHub: PrefetchFn = async (qc, params) => {
  const { state: stateSlug, city: citySlug } = params;
  const [stateData, cityData] = await Promise.all([
    storage.getStateBySlug(stateSlug),
    storage.getCityBySlug(stateSlug, citySlug),
  ]);

  qc.setQueryData(["/api/states", stateSlug], stateData);
  if (cityData) {
    qc.setQueryData(["/api/cities", stateSlug, citySlug], cityData);
    if (stateData) {
      const [races, routes] = await Promise.all([
        storage.getRaces({ city: cityData.name, state: stateData.abbreviation }),
        storage.getRoutes({ city: cityData.name, state: stateData.abbreviation }),
      ]);
      qc.setQueryData(["/api/races", { city: cityData.name, state: stateData.abbreviation }], races);
      qc.setQueryData(["/api/routes", { city: cityData.name, state: stateData.abbreviation }], routes);
    }

    const stateName = stateData?.name || stateSlug;
    return {
      title: `${cityData.name}, ${stateName} Running Hub | running.services`,
      description: `Races, routes, and running resources in ${cityData.name}, ${stateName}.`,
      ogTitle: `${cityData.name}, ${stateName} Running Hub`,
      ogDescription: `Discover races and routes in ${cityData.name}, ${stateName}.`,
      ogType: "website",
      canonicalUrl: `https://running.services/state/${stateSlug}/city/${citySlug}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${cityData.name}, ${stateName} Running Hub`,
        description: `Running races and routes in ${cityData.name}, ${stateName}.`,
        url: `https://running.services/state/${stateSlug}/city/${citySlug}`,
      },
      breadcrumbJsonLd: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://running.services/" },
          { "@type": "ListItem", position: 2, name: stateName, item: `https://running.services/state/${stateSlug}` },
          { "@type": "ListItem", position: 3, name: cityData.name, item: `https://running.services/state/${stateSlug}/city/${citySlug}` },
        ],
      },
    };
  }

  return { title: "City Not Found | running.services", description: "The requested city could not be found.", ogType: "website", is404: true, noindex: true };
};

interface RouteMatch {
  pattern: RegExp;
  prefetch: PrefetchFn;
  paramNames: string[];
}

const routeMatches: RouteMatch[] = [
  { pattern: /^\/$/, prefetch: prefetchHome, paramNames: [] },
  { pattern: /^\/races$/, prefetch: prefetchRaces, paramNames: [] },
  { pattern: /^\/races\/usa$/, prefetch: prefetchRacesUSA, paramNames: [] },
  { pattern: /^\/races\/state\/([^/]+)\/city\/([^/]+)$/, prefetch: prefetchRacesCity, paramNames: ["state", "city"] },
  { pattern: /^\/races\/state\/([^/]+)$/, prefetch: prefetchRacesState, paramNames: ["state"] },
  { pattern: /^\/races\/year\/(\d{4})\/month\/(\d{2})$/, prefetch: prefetchRacesYear, paramNames: ["year", "month"] },
  { pattern: /^\/races\/year\/(\d{4})$/, prefetch: prefetchRacesYear, paramNames: ["year"] },
  { pattern: /^\/races\/([^/]+)$/, prefetch: prefetchRaceDetail, paramNames: ["slug"] },
  { pattern: /^\/routes$/, prefetch: prefetchRoutes, paramNames: [] },
  { pattern: /^\/routes\/state\/([^/]+)\/city\/([^/]+)$/, prefetch: prefetchRoutesCity, paramNames: ["state", "city"] },
  { pattern: /^\/routes\/state\/([^/]+)$/, prefetch: prefetchRoutesState, paramNames: ["state"] },
  { pattern: /^\/routes\/([^/]+)$/, prefetch: prefetchRouteDetail, paramNames: ["slug"] },
  { pattern: /^\/tools$/, prefetch: prefetchTools, paramNames: [] },
  { pattern: /^\/tools\/([^/]+)$/, prefetch: prefetchToolDetail, paramNames: ["slug"] },
  { pattern: /^\/guides/, prefetch: prefetchGuides, paramNames: [] },
  { pattern: /^\/collections$/, prefetch: prefetchCollections, paramNames: [] },
  { pattern: /^\/collections\/([^/]+)$/, prefetch: prefetchCollectionDetail, paramNames: ["slug"] },
  { pattern: /^\/influencers$/, prefetch: prefetchInfluencers, paramNames: [] },
  { pattern: /^\/influencers\/([^/]+)$/, prefetch: prefetchInfluencerDetail, paramNames: ["slug"] },
  { pattern: /^\/podcasts$/, prefetch: prefetchPodcasts, paramNames: [] },
  { pattern: /^\/podcasts\/([^/]+)$/, prefetch: prefetchPodcastDetail, paramNames: ["slug"] },
  { pattern: /^\/books$/, prefetch: prefetchBooks, paramNames: [] },
  { pattern: /^\/books\/([^/]+)$/, prefetch: prefetchBookDetail, paramNames: ["slug"] },
  { pattern: /^\/state\/([^/]+)\/city\/([^/]+)$/, prefetch: prefetchCityHub, paramNames: ["state", "city"] },
  { pattern: /^\/state\/([^/]+)$/, prefetch: prefetchStateHub, paramNames: ["state"] },
];

export function getSSRPrefetch(url: string): ((qc: QueryClient) => Promise<PageMeta>) | undefined {
  let pathname = url.split("?")[0];
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

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
