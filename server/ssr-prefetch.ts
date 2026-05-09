import { QueryClient } from "@tanstack/react-query";
import { storage } from "./storage";
import type { PageMeta } from "../client/src/entry-server";
import { getStateName } from "@shared/states";
import { DISTANCE_SLUG_TO_LABEL, isValidDistanceSlug, isValidMonthSlug, MONTH_NAMES as METRO_MONTH_NAMES, MONTH_SLUG_TO_NUM, buildMetroSlug } from "@shared/metro";
import { BEST_CONFIGS, buildBestSearchQs, resolveBestSearch, type BestSearchParams } from "@shared/best-configs";
import { parseBlogPostSlug, blogPostHref } from "@shared/blog-months";
import { computeRaceScore } from "@shared/race-score";

type PrefetchFn = (queryClient: QueryClient, params: Record<string, string>) => Promise<PageMeta>;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const defaultMeta: PageMeta = {
  title: "running.services | Find the right race, not just the next race",
  description: "A race decision engine for runners in the USA. Compare races by beginner, PR, value, vibe, and family scores so you can pick the right one for your goal.",
  ogType: "website",
};

const prefetchHome: PrefetchFn = async (qc) => {
  const [weekendRaces, bestValue5K, beginnerHalfs, turkeyTrots, statesList] = await Promise.all([
    storage.getRacesThisWeekend().catch(() => []),
    storage.getRacesAdvanced({ distance: "5K", sort: "value", limit: 4 }).catch(() => []),
    storage.getRacesAdvanced({ distance: "Half Marathon", sort: "beginner", limit: 4 }).catch(() => []),
    storage.getRacesAdvanced({ isTurkeyTrot: true, month: 11, limit: 3 }).catch(() => []),
    storage.getStates(),
  ]);

  qc.setQueryData(["/api/races/this-weekend"], weekendRaces);
  qc.setQueryData(["/api/races/search", { distance: "5K", sort: "value", limit: 4 }], bestValue5K);
  qc.setQueryData(["/api/races/search", { distance: "Half Marathon", sort: "beginner", limit: 4 }], beginnerHalfs);
  qc.setQueryData(["/api/races/search", { isTurkeyTrot: true, month: 11, limit: 3 }], turkeyTrots);
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
  // The race search page first renders with EMPTY_FILTERS, which produces this exact API qs.
  // Seed that key so SSR HTML matches the first client render.
  // Matches the client's PAGE_SIZE=24 + sentinel (limit=25, offset=0) on first render.
  const defaultApiQs = "sort=date&limit=25&offset=0";
  const [races, statesList] = await Promise.all([
    storage.getRacesAdvanced({ sort: "date", limit: 25, offset: 0 }),
    storage.getStates(),
  ]);

  qc.setQueryData(["/api/races/search", defaultApiQs], races);
  qc.setQueryData(["/api/states"], statesList);

  return {
    title: "Find the right race | running.services",
    description: "Search USA races and filter by distance, month, terrain, price, beginner-friendliness, PR potential, value, vibe, and more.",
    ogType: "website",
    canonicalUrl: "https://running.services/races",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "USA Race Search",
      description: "Search and compare running races across the United States with deterministic 0–100 scores.",
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
    // The /races/state/:state page reuses RacesSearchPage which queries ["/api/races/search", apiQs]
    // with apiQs derived from EMPTY_FILTERS + the state abbreviation. Seed that exact key so
    // SSR HTML matches the first client render and there's no hydration cache miss.
    const stateApiQs = `state=${encodeURIComponent(stateData.abbreviation)}&sort=date&limit=25&offset=0`;
    const races = await storage.getRacesAdvanced({ state: stateData.abbreviation, sort: "date", limit: 25, offset: 0 });
    qc.setQueryData(["/api/races/search", stateApiQs], races);

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

function buildRaceFaq(race: {
  name: string;
  distance: string;
  city: string;
  state: string;
  elevationGainM?: number | null;
  surface?: string | null;
  terrain?: string | null;
  registrationDeadline?: string | null;
  registrationOpen?: boolean | null;
  priceMin?: number | null;
  priceMax?: number | null;
  fieldSize?: number | null;
  startTime?: string | null;
}) {
  const stateName = getStateName(race.state);
  const dist = race.distance || "race";
  const elev = race.elevationGainM ?? null;

  const difficultyAnswer = (() => {
    const surface = race.surface ? race.surface.toLowerCase() : "road";
    if (elev != null && elev >= 300) {
      return `${race.name} is a hilly ${dist} with about ${elev} m (${Math.round(elev * 3.28)} ft) of elevation gain on a ${surface} course. Expect a tougher-than-average effort — pace conservatively on the climbs and save something for the back half.`;
    }
    if (elev != null && elev >= 100) {
      return `${race.name} has rolling terrain with around ${elev} m (${Math.round(elev * 3.28)} ft) of elevation gain on a ${surface} course. It's a moderate ${dist} — manageable for most runners but not flat.`;
    }
    if (elev != null) {
      return `${race.name} is a flat-to-gently-rolling ${dist} with about ${elev} m (${Math.round(elev * 3.28)} ft) of elevation gain on a ${surface} course. A friendly profile for chasing a personal best.`;
    }
    return `${race.name} is a ${dist} on a ${surface} course in ${race.city}, ${stateName}. We don't have a verified elevation profile yet — check the organizer's course map for the climb breakdown.`;
  })();

  const wearAnswer = (() => {
    const start = race.startTime ? ` The published start time is ${race.startTime}.` : "";
    return `Race-day weather in ${race.city} can swing year over year, so dress for the forecast on the day. As a rule of thumb, dress for ~10°F warmer than the standing temperature once you start running. Layer with a throwaway long-sleeve at the start, gloves and a hat for sub-50°F mornings, and a singlet plus a visor when it climbs above 60°F.${start} Check the race-day weather forecast on this page closer to the date for a specific recommendation.`;
  })();

  const sellOutAnswer = (() => {
    if (race.registrationOpen === false) {
      return `Registration for ${race.name} is currently closed. If you missed it, set an alert on this page and we'll let you know the moment the next year's registration opens.`;
    }
    if (race.registrationDeadline) {
      return `Registration closes on ${race.registrationDeadline}. ${race.fieldSize && race.fieldSize >= 5000 ? "This is a large-field event so it usually stays open until the deadline, but the entry fee typically goes up in tiers as the date approaches." : "Smaller events like this one can sell out before the posted deadline — sign up early to lock in the lower price."}`;
    }
    return `${race.name} hasn't published a hard registration deadline. Most races of this size raise the entry fee in tiers (early-bird, regular, late) and can sell out without warning — sign up early if you're committed.`;
  })();

  const faqs = [
    { q: `How hard is the ${race.name} ${dist}?`, a: difficultyAnswer },
    { q: `What should I wear for the ${race.name}?`, a: wearAnswer },
    { q: `When does the ${race.name} sell out?`, a: sellOutAnswer },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

const prefetchRaceDetail: PrefetchFn = async (qc, params) => {
  const slug = params.slug;
  const [race, nearbyRoutes] = await Promise.all([
    storage.getRaceBySlug(slug),
    storage.getRoutes({ limit: 3 }),
  ]);

  // Enrich race with citySlug to match the /api/races/:slug response shape,
  // so client components (e.g. "More like this" metro link) work on SSR loads.
  let citySlug: string | null = null;
  if (race?.cityId) {
    try {
      const cityRow = await storage.getCityById(race.cityId);
      citySlug = cityRow?.slug ?? null;
    } catch { /* non-critical */ }
  }
  const enrichedRace = race ? { ...race, citySlug } : race;

  qc.setQueryData(["/api/races", slug], enrichedRace);
  qc.setQueryData(["/api/routes", { limit: 3 }], nearbyRoutes);

  if (race) {
    let organizerInfo: { name: string; url?: string } | undefined;
    if (race.organizerId) {
      try {
        const orgs = await storage.getOrganizers({ limit: 500 });
        const org = orgs.find(o => o.id === race.organizerId);
        if (org) organizerInfo = { name: org.name, url: org.website ?? undefined };
      } catch { /* organizer lookup is non-critical */ }
    }

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: race.name,
      startDate: race.date,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: `${race.city}, ${getStateName(race.state)}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: race.city,
          addressRegion: race.state,
          addressCountry: "US",
        },
        ...(race.lat != null && race.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: race.lat, longitude: race.lng } } : {}),
      },
      description: race.description || `A ${race.distance} race in ${race.city}, ${getStateName(race.state)}.`,
      sport: "Running",
      url: `https://running.services/races/${slug}`,
      ...(race.website ? { sameAs: race.website } : {}),
      ...(race.priceMin != null || race.priceMax != null ? (() => {
        const isRange = race.priceMin != null && race.priceMax != null && race.priceMin !== race.priceMax;
        const baseAvailability = race.registrationOpen === false ? "https://schema.org/SoldOut" : "https://schema.org/InStock";
        return {
          offers: isRange
            ? {
                "@type": "AggregateOffer",
                lowPrice: race.priceMin,
                highPrice: race.priceMax,
                priceCurrency: race.priceCurrency || "USD",
                availability: baseAvailability,
                ...(race.registrationUrl ? { url: race.registrationUrl } : {}),
                ...(race.registrationDeadline ? { validThrough: race.registrationDeadline } : {}),
              }
            : {
                "@type": "Offer",
                price: race.priceMin ?? race.priceMax,
                priceCurrency: race.priceCurrency || "USD",
                availability: baseAvailability,
                ...(race.registrationUrl ? { url: race.registrationUrl } : {}),
                ...(race.registrationDeadline ? { validThrough: race.registrationDeadline } : {}),
              },
        };
      })() : {}),
      ...(organizerInfo ? {
        organizer: { "@type": "Organization", name: organizerInfo.name, ...(organizerInfo.url ? { url: organizerInfo.url } : {}) },
      } : {}),
    };
    const additionalProperty: Array<Record<string, string | number>> = [];
    if (race.terrain) additionalProperty.push({ "@type": "PropertyValue", name: "Terrain", value: race.terrain });
    if (race.elevationGainM != null) additionalProperty.push({ "@type": "PropertyValue", name: "Elevation gain (m)", value: race.elevationGainM });
    if (race.surface) additionalProperty.push({ "@type": "PropertyValue", name: "Surface", value: race.surface });
    if (race.distance) additionalProperty.push({ "@type": "PropertyValue", name: "Distance", value: race.distance });
    if (additionalProperty.length > 0) jsonLd.additionalProperty = additionalProperty;

    // Add aggregateRating from review summary when there is at least 1 review.
    try {
      const summary = await storage.getReviewSummary("race", race.id);
      if (summary && summary.count >= 1 && summary.avgRating > 0) {
        jsonLd.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: Number(summary.avgRating.toFixed(2)),
          reviewCount: summary.count,
          bestRating: 5,
          worstRating: 1,
        };
      }
    } catch { /* non-critical */ }

    const faqJsonLd = buildRaceFaq(race);

    // Thin-race noindex policy from the rebuild report: a race detail page
    // is only indexable when it has the four minimum fields a runner needs
    // to make a decision — date, city/state, distance, and either a
    // registration URL or an official website.
    const hasMinimumFields = Boolean(
      race.date &&
      race.city &&
      race.state &&
      race.distance &&
      (race.registrationUrl || race.website)
    );

    return {
      title: `${race.name} - ${race.city}, ${getStateName(race.state)} | running.services`,
      description: race.description || `${race.name} is a ${race.distance} race in ${race.city}, ${getStateName(race.state)}. ${race.surface} course with ${race.elevation.toLowerCase()} elevation.`,
      ogTitle: race.name,
      ogDescription: `${race.distance} race on ${race.date} in ${race.city}, ${getStateName(race.state)}`,
      ogType: "article",
      canonicalUrl: `https://running.services/races/${slug}`,
      noindex: !hasMinimumFields,
      jsonLd,
      extraJsonLd: [faqJsonLd],
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
    noindex: true,
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
      noindex: true,
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
      noindex: true,
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
      title: `${route.name} - ${route.city}, ${getStateName(route.state)} | running.services`,
      description: route.description || `${route.name} is a ${route.distance}-mile ${route.type.toLowerCase()} route in ${route.city}, ${getStateName(route.state)}. ${route.surface} surface, ${route.difficulty} difficulty.`,
      ogTitle: route.name,
      ogDescription: `${route.distance} mi ${route.type} route in ${route.city}, ${getStateName(route.state)}`,
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
    // Generic training tools are deprioritized in the rebuild report — keep
    // them reachable for direct visitors but do not invite indexing.
    noindex: true,
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
    noindex: true,
  };
};

const prefetchNearby: PrefetchFn = async () => {
  return {
    title: "Races Near Me | running.services",
    description: "Find running races near your location. Discover 5Ks, half marathons, marathons, and more happening nearby.",
    ogType: "website",
    canonicalUrl: "https://running.services/races/nearby",
    noindex: true,
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
    noindex: true,
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
      noindex: true,
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
    noindex: true,
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
      noindex: true,
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
    noindex: true,
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
      noindex: true,
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
    noindex: true,
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
      noindex: true,
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
      const [races, routes, siblingCities] = await Promise.all([
        storage.getRaces({ city: cityData.name, state: stateData.abbreviation }),
        storage.getRoutes({ city: cityData.name, state: stateData.abbreviation }),
        storage.getCitiesByState(stateData.id),
      ]);
      qc.setQueryData(["/api/races", { city: cityData.name, state: stateData.abbreviation }], races);
      qc.setQueryData(["/api/routes", { city: cityData.name, state: stateData.abbreviation }], routes);
      qc.setQueryData(["/api/states", stateSlug, "cities"], siblingCities);
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

const prefetchTerms: PrefetchFn = async () => ({
  title: "Terms of Service | running.services",
  description: "Terms of Service for running.services — the data-driven race calendar and route directory for runners across the USA.",
  ogTitle: "Terms of Service",
  ogDescription: "Terms of Service for running.services.",
  ogType: "website",
  canonicalUrl: "https://running.services/terms",
});

const prefetchPrivacy: PrefetchFn = async () => ({
  title: "Privacy Policy | running.services",
  description: "Privacy Policy for running.services — learn how we handle your data and protect your privacy.",
  ogTitle: "Privacy Policy",
  ogDescription: "Privacy Policy for running.services.",
  ogType: "website",
  canonicalUrl: "https://running.services/privacy",
});

const prefetchPricing: PrefetchFn = async () => ({
  title: "Pricing | running.services",
  description: "Race Pro, sponsorship slots, local market reports, and API access — pricing for race directors and partners.",
  ogTitle: "Pricing — running.services",
  ogDescription: "Plans for race organizers, sponsors, and developers building on top of running.services.",
  ogType: "website",
  canonicalUrl: "https://running.services/pricing",
});

const prefetchDevelopers: PrefetchFn = async () => ({
  title: "Developers & API | running.services",
  description: "Public race API for partners — filtered race search, race detail, and featured listings under a simple JSON API with monthly metering.",
  ogTitle: "running.services API",
  ogDescription: "Build with the running.services race data API.",
  ogType: "website",
  canonicalUrl: "https://running.services/developers",
});

const prefetchReports: PrefetchFn = async () => ({
  title: "Local Market Reports | running.services",
  description: "Per-metro, per-distance race market reports — pricing, sell-out trends, and competitive landscape for race directors.",
  ogTitle: "Race Market Reports",
  ogDescription: "Local race market reports for race directors and sponsors.",
  ogType: "website",
  canonicalUrl: "https://running.services/reports",
  noindex: true,
});

const prefetchMap: PrefetchFn = async () => ({
  title: "Race Map — Browse Every US Race | running.services",
  description: "Explore every race in the USA on an interactive map. Filter by state and distance to find races near you.",
  ogTitle: "USA Race Map",
  ogDescription: "Interactive map of every race in the USA — filter by state and distance.",
  ogType: "website",
  canonicalUrl: "https://running.services/map",
});

const prefetchAbout: PrefetchFn = async () => ({
  title: "About Us | running.services",
  description: "Learn about running.services — a data-driven running hub with 17,150+ races, routes, and community resources for runners across the USA.",
  ogTitle: "About running.services",
  ogDescription: "Data-driven race calendar and route directory for runners across the USA.",
  ogType: "website",
  canonicalUrl: "https://running.services/about",
});

const prefetchContact: PrefetchFn = async () => ({
  title: "Contact Us | running.services",
  description: "Get in touch with running.services — report data corrections, submit races, or ask questions about the USA's race calendar and route directory.",
  ogTitle: "Contact Us",
  ogDescription: "Get in touch with the running.services team.",
  ogType: "website",
  canonicalUrl: "https://running.services/contact",
});

const prefetchBlog: PrefetchFn = async () => {
  const url = "https://running.services/blog";
  return {
    title: "Race Guides Blog: Best Marathons, Half Marathons & 5Ks by Month | running.services",
    description: "Month-by-month guides to the best marathons, half marathons, 10Ks, 5Ks, and trail races in the USA. Updated continuously and ranked by RaceScore.",
    ogTitle: "Race Guides Blog — Best Races by Month",
    ogDescription: "Month-by-month USA race guides ranked by RaceScore.",
    ogType: "website",
    canonicalUrl: url,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "running.services Race Guides",
      url,
      description: "Month-by-month USA race guides ranked by RaceScore.",
      publisher: { "@type": "Organization", name: "running.services", url: "https://running.services" },
    },
  };
};

const prefetchBlogPost: PrefetchFn = async (qc, params) => {
  const parsed = params.slug ? parseBlogPostSlug(params.slug) : null;
  if (!parsed) {
    return {
      title: "Article not found | running.services",
      description: "That blog URL isn't recognized.",
      ogType: "website",
      is404: true,
      noindex: true,
    } as PageMeta;
  }
  const { distanceSlug, distanceCfg, monthNum, monthLabel, year } = parsed;

  const search = {
    distance: distanceCfg.distance || undefined,
    surface: distanceCfg.surface || undefined,
    month: monthNum,
    year,
    sort: "date" as const,
    limit: 60,
  };
  // Build the same QS the client uses so React Query hydrates from cache.
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    if (v == null || v === "" || v === false) continue;
    qs.set(k, String(v));
  }
  const apiQs = qs.toString();

  const races = await storage.getRacesAdvanced(search).catch(() => []);
  qc.setQueryData(["/api/races/search", apiQs], races);

  // Match the page's RaceScore-based ranking so JSON-LD ItemList and the
  // FAQ "best race" answer agree with what the user actually sees.
  const ranked = races.slice().sort(
    (a, b) => computeRaceScore(b as any).score - computeRaceScore(a as any).score,
  );

  const url = `${SITE_ORIGIN}${blogPostHref(distanceSlug, monthNum, year)}`;
  const distLower = distanceCfg.label.toLowerCase();
  const distPluralLower = distanceCfg.plural.toLowerCase();
  const top = ranked.slice(0, 10);
  const dateRangeLabel = `${monthLabel} ${year}`;

  const title = `Best ${distanceCfg.plural} in ${monthLabel} ${year} (USA) | running.services`;
  const description = `The top ${distPluralLower} happening across the USA in ${dateRangeLabel}, ranked by RaceScore. ${top.length > 0 ? `Featured: ${top.slice(0, 3).map(r => r.name).join(", ")}.` : ""}`;

  // Article + ItemList + FAQPage JSON-LD bundled in @graph.
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: `Best ${distanceCfg.plural} in ${monthLabel} ${year} (USA)`,
        description,
        url,
        datePublished: `${year}-${String(monthNum).padStart(2, "0")}-01`,
        author: { "@type": "Organization", name: "running.services" },
        publisher: {
          "@type": "Organization",
          name: "running.services",
          logo: { "@type": "ImageObject", url: "https://running.services/og-default.png" },
        },
        mainEntityOfPage: url,
      },
      {
        "@type": "ItemList",
        name: `Best ${distanceCfg.plural} in ${monthLabel} ${year}`,
        itemListElement: top.map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `https://running.services/races/${r.slug}`,
          name: r.name,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `What is the best ${distLower} in ${monthLabel} ${year}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: top[0]
                ? `Based on RaceScore, the highest-rated ${distLower} in ${dateRangeLabel} is ${top[0].name} in ${top[0].city}, ${top[0].state}.`
                : `We don't yet have enough confirmed ${distPluralLower} for ${dateRangeLabel} to recommend one.`,
            },
          },
          {
            "@type": "Question",
            name: `How many ${distPluralLower} are there in the USA in ${monthLabel} ${year}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `running.services tracks ${races.length} confirmed ${distPluralLower} on the ${dateRangeLabel} calendar.`,
            },
          },
          {
            "@type": "Question",
            name: `Is ${monthLabel} a good month to run a ${distLower}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: monthAdviceText(monthNum, distanceCfg.label),
            },
          },
        ],
      },
    ],
  };

  return {
    title,
    description,
    ogTitle: `Best ${distanceCfg.plural} in ${monthLabel} ${year} (USA)`,
    ogDescription: description,
    ogType: "article",
    canonicalUrl: url,
    noindex: races.length < 5,
    jsonLd,
    breadcrumbJsonLd: buildBreadcrumbJsonLd([
      { name: "Home", href: "/" },
      { name: "Blog", href: "/blog" },
      { name: `${distanceCfg.plural} in ${monthLabel} ${year}` },
    ]),
  } as PageMeta;
};

function monthAdviceText(monthNum: number, distance: string): string {
  const cool = monthNum === 3 || monthNum === 4 || monthNum === 10 || monthNum === 11;
  const cold = monthNum === 12 || monthNum === 1 || monthNum === 2;
  const hot = monthNum >= 6 && monthNum <= 8;
  const name = MONTH_NAMES[monthNum - 1];
  if (cool) return `${name} is one of the best months in the USA for a ${distance.toLowerCase()} — cool, stable temperatures across most of the country make it prime PR season.`;
  if (cold) return `${name} runs cold in most of the country, which favors distance running but watch for icy starts; southern races tend to draw the biggest fields.`;
  if (hot) return `${name} can be hot and humid, especially in the Southeast and Midwest — look for early-morning starts and mountain or coastal courses.`;
  return `${name} sits in the shoulder season — expect mild weather and a mix of championship and casual events.`;
}

const prefetchAuthVerify: PrefetchFn = async () => ({
  title: "Sign In | running.services",
  description: "Verify your sign-in link and access your running.services account.",
  ogTitle: "Sign In to running.services",
  ogDescription: "Verify your sign-in link and access your running.services account.",
  ogType: "website",
  canonicalUrl: "https://running.services/auth/verify",
});

const prefetchFavorites: PrefetchFn = async () => ({
  title: "My Favorites | running.services",
  description: "Your saved races and routes on running.services. Sign in to save and manage your favorites.",
  ogTitle: "My Favorites | running.services",
  ogDescription: "Your saved races and routes on running.services.",
  ogType: "website",
  canonicalUrl: "https://running.services/favorites",
});

const prefetchAlerts: PrefetchFn = async () => ({
  title: "Alerts & saved searches | running.services",
  description: "Manage your race alerts, saved searches, and email digest preferences on running.services.",
  ogTitle: "Alerts & saved searches | running.services",
  ogDescription: "Get notified before prices go up or registration closes — manage your alerts and saved searches.",
  ogType: "website",
  canonicalUrl: "https://running.services/alerts",
  noindex: true,
});

const prefetchRaceShopper: PrefetchFn = async (_qc, params) => {
  const goal = params.goal;
  const title = goal ? `Race Shopper: ${goal} | running.services` : "Race Shopper | running.services";
  return {
    title,
    description: "A goal-driven race picker. Tell us what you want — a PR, your first 5K, the best value, or a big-vibe event — and we'll rank every upcoming race for it.",
    ogType: "website",
    canonicalUrl: goal ? `https://running.services/race-shopper/${goal}` : "https://running.services/race-shopper",
    noindex: !!goal,
  };
};

const prefetchCompare: PrefetchFn = async () => ({
  title: "Compare Races | running.services",
  description: "Side-by-side race comparison on weather, difficulty, vibe, value, and PR potential.",
  ogType: "website",
  canonicalUrl: "https://running.services/compare",
  noindex: true,
});

const prefetchThisWeekendPage: PrefetchFn = async (qc) => {
  try {
    const list = await storage.getRacesThisWeekend();
    qc.setQueryData(["/api/races/this-weekend"], list);
  } catch {}
  return {
    title: "Races This Weekend | running.services",
    description: "Every race happening in the USA in the next 72 hours. Last-minute signups, walk-up registrations, and last-call entries.",
    ogType: "website",
    canonicalUrl: "https://running.services/this-weekend",
  };
};

const prefetchPriceWatch: PrefetchFn = async (qc) => {
  try {
    const list = await storage.getPriceIncreasingSoon(21, 30);
    qc.setQueryData(["/api/races/price-increase-soon", { days: 21, limit: 30 }], list);
  } catch {}
  return {
    title: "Price Watch — Register Before Prices Rise | running.services",
    description: "Races whose registration fee is about to increase. Sign up early to lock in the lower price.",
    ogType: "website",
    canonicalUrl: "https://running.services/price-watch",
  };
};

const prefetchOrganizers: PrefetchFn = async (qc, params) => {
  const slug = params.slug;
  if (!slug) {
    try {
      const list = await storage.getOrganizers({ limit: 100 });
      qc.setQueryData(["/api/organizers"], list);
    } catch {}
    return {
      title: "Race Organizers | running.services",
      description: "Race directors and organizations behind the events. See every race a given organizer puts on.",
      ogType: "website",
      canonicalUrl: "https://running.services/organizers",
    };
  }
  return {
    title: `Race Organizer: ${slug} | running.services`,
    description: "Race organizer profile.",
    ogType: "website",
    canonicalUrl: `https://running.services/organizers/${slug}`,
  };
};

const SITE_ORIGIN = "https://running.services";

const prefetchBestDistanceMonth: PrefetchFn = async (qc, params) => {
  const distanceSlug = params.distance;
  const monthSlug = params.month?.toLowerCase();
  if (!isValidDistanceSlug(distanceSlug) || !monthSlug || !isValidMonthSlug(monthSlug)) {
    return {
      title: "Best-of list not found | running.services",
      description: "Unknown distance or month.",
      ogType: "website",
      is404: true,
      noindex: true,
    } as PageMeta;
  }
  const distanceCfg = DISTANCE_SLUG_TO_LABEL[distanceSlug];
  const monthNum = MONTH_SLUG_TO_NUM[monthSlug];
  const monthLabel = METRO_MONTH_NAMES[monthNum];

  const search: BestSearchParams = {
    distance: distanceCfg.distance || undefined,
    surface: distanceCfg.surface || undefined,
    month: monthNum,
    sort: "date",
    limit: 60,
  };
  const apiQs = buildBestSearchQs(search);
  const races = await storage.getRacesAdvanced({
    distance: distanceCfg.distance || undefined,
    surface: distanceCfg.surface || undefined,
    month: monthNum,
    sort: "date",
    limit: 60,
  }).catch(() => []);
  qc.setQueryData(["/api/races/search", apiQs], races);

  const url = `${SITE_ORIGIN}/best-races/${distanceSlug}/${monthSlug}`;
  const title = `Best ${distanceCfg.plural} in ${monthLabel} | running.services`;
  const description = `The top-rated ${distanceCfg.label.toLowerCase()}s across the USA in ${monthLabel}, ranked by RaceScore — our 0–100 composite of PR potential, value, vibe, beginner-friendliness, and data confidence.`;

  return {
    title,
    description,
    ogType: "website",
    canonicalUrl: url,
    noindex: races.length < 5,
    jsonLd: buildCollectionJsonLd(`Best ${distanceCfg.plural} in ${monthLabel}`, description, url, races),
    breadcrumbJsonLd: buildBreadcrumbJsonLd([
      { name: "Home", href: "/" },
      { name: "Races", href: "/races" },
      { name: "Best of" },
      { name: `${distanceCfg.plural} in ${monthLabel}` },
    ]),
  } as PageMeta;
};

const prefetchRaceVsRace: PrefetchFn = async (qc, params) => {
  const combined = params.slugs;
  const idx = combined?.indexOf("-vs-") ?? -1;
  if (!combined || idx <= 0) {
    return {
      title: "Compare two races | running.services",
      description: "Pick two races to compare side by side.",
      ogType: "website",
      canonicalUrl: `${SITE_ORIGIN}/vs`,
      noindex: true,
    } as PageMeta;
  }
  const slugA = combined.slice(0, idx);
  const slugB = combined.slice(idx + 4);
  const [a, b] = await Promise.all([
    storage.getRaceBySlug(slugA).catch(() => undefined),
    storage.getRaceBySlug(slugB).catch(() => undefined),
  ]);

  if (!a || !b) {
    return {
      title: "Race comparison not found | running.services",
      description: "One of the races in this comparison wasn't found.",
      ogType: "website",
      canonicalUrl: `${SITE_ORIGIN}/vs/${combined}`,
      is404: true,
      noindex: true,
    } as PageMeta;
  }

  qc.setQueryData(["/api/races", slugA], a);
  qc.setQueryData(["/api/races", slugB], b);

  // Canonical URL = alphabetical slug order so duplicate URL pairs collapse.
  const sorted = [slugA, slugB].slice().sort();
  const canonical = `${SITE_ORIGIN}/vs/${sorted[0]}-vs-${sorted[1]}`;
  const title = `${a.name} vs ${b.name} — Side-by-side race comparison | running.services`;
  const description = `Compare ${a.name} (${a.distance}, ${a.city}, ${a.state}) and ${b.name} (${b.distance}, ${b.city}, ${b.state}) on RaceScore, course profile, weather, value, and PR potential.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${a.name} vs ${b.name}`,
    description,
    url: canonical,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: 2,
      itemListElement: [a, b].map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_ORIGIN}/races/${r.slug}`,
        name: r.name,
      })),
    },
  };

  return {
    title,
    description,
    ogType: "article",
    canonicalUrl: canonical,
    noindex: false,
    jsonLd,
    breadcrumbJsonLd: buildBreadcrumbJsonLd([
      { name: "Home", href: "/" },
      { name: "Races", href: "/races" },
      { name: "Compare" },
      { name: `${a.name} vs ${b.name}` },
    ]),
  } as PageMeta;
};

function buildBreadcrumbJsonLd(items: Array<{ name: string; href?: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.href ? { item: `${SITE_ORIGIN}${it.href}` } : {}),
    })),
  };
}

function buildCollectionJsonLd(name: string, description: string, url: string, races: Array<{ name: string; slug: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: races.length,
      itemListElement: races.slice(0, 25).map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: r.name,
        url: `${SITE_ORIGIN}/races/${r.slug}`,
      })),
    },
  };
}

const prefetchTurkeyTrots: PrefetchFn = async (qc, params) => {
  const metroSlug = params.metro;
  if (metroSlug) {
    const metro = await storage.getCityByMetroSlug(metroSlug).catch(() => undefined);
    if (!metro) {
      return {
        title: "Turkey Trot metro not found | running.services",
        description: "We don't recognize that metro.",
        ogType: "website",
        canonicalUrl: `${SITE_ORIGIN}/turkey-trots/${metroSlug}`,
        is404: true,
        noindex: true,
      } as PageMeta;
    }
    qc.setQueryData([`/api/metros/${metroSlug}`], { city: metro, state: metro.state });
    const search: BestSearchParams = { isTurkeyTrot: true, month: 11, state: metro.state.abbreviation, city: metro.name, sort: "date", limit: 60 };
    const apiQs = buildBestSearchQs(search);
    const races = await storage.getRacesAdvanced({
      isTurkeyTrot: true,
      month: 11,
      state: metro.state.abbreviation,
      city: metro.name,
      sort: "date",
      limit: 60,
    }).catch(() => []);
    qc.setQueryData(["/api/races/search", apiQs], races);
    const url = `${SITE_ORIGIN}/turkey-trots/${metroSlug}`;
    const title = `Turkey Trots near ${metro.name}, ${metro.state.abbreviation} | running.services`;
    const description = `Thanksgiving Turkey Trots in or near ${metro.name}, ${metro.state.name}. Sort by date and pick a 5K that fits your morning.`;
    return {
      title,
      description,
      ogType: "website",
      canonicalUrl: url,
      noindex: races.length < 5,
      jsonLd: buildCollectionJsonLd(`Turkey Trots in ${metro.name}`, description, url, races),
      breadcrumbJsonLd: buildBreadcrumbJsonLd([
        { name: "Home", href: "/" },
        { name: "Turkey Trots", href: "/turkey-trots" },
        { name: `${metro.name}, ${metro.state.abbreviation}` },
      ]),
    } as PageMeta;
  }
  const search: BestSearchParams = { isTurkeyTrot: true, month: 11, sort: "date", limit: 60 };
  const apiQs = buildBestSearchQs(search);
  const races = await storage.getRacesAdvanced({ isTurkeyTrot: true, month: 11, sort: "date", limit: 60 }).catch(() => []);
  qc.setQueryData(["/api/races/search", apiQs], races);
  const url = `${SITE_ORIGIN}/turkey-trots`;
  const title = "Turkey Trots in the USA — Thanksgiving 5K Calendar | running.services";
  const description = "Every Turkey Trot we know about across the USA. Lock in your Thanksgiving 5K before it sells out.";
  return {
    title,
    description,
    ogType: "website",
    canonicalUrl: url,
    noindex: races.length < 5,
    jsonLd: buildCollectionJsonLd("Turkey Trots in the USA", description, url, races),
    breadcrumbJsonLd: buildBreadcrumbJsonLd([
      { name: "Home", href: "/" },
      { name: "Turkey Trots" },
    ]),
  } as PageMeta;
};

const prefetchCityDistance: PrefetchFn = async (qc, params) => {
  const { metro: metroSlug, distance: distanceSlug, month: monthSlug } = params;
  if (!isValidDistanceSlug(distanceSlug)) {
    return {
      title: "Distance not found | running.services",
      description: "Unknown distance shortcut.",
      ogType: "website",
      is404: true,
      noindex: true,
    } as PageMeta;
  }
  const distanceCfg = DISTANCE_SLUG_TO_LABEL[distanceSlug];
  const metro = await storage.getCityByMetroSlug(metroSlug).catch(() => undefined);
  if (!metro) {
    return {
      title: "Metro not found | running.services",
      description: "We don't recognize that metro.",
      ogType: "website",
      is404: true,
      noindex: true,
    } as PageMeta;
  }
  qc.setQueryData([`/api/metros/${metroSlug}`], { city: metro, state: metro.state });

  const monthNum = monthSlug && isValidMonthSlug(monthSlug.toLowerCase())
    ? MONTH_SLUG_TO_NUM[monthSlug.toLowerCase()]
    : undefined;
  if (monthSlug && monthNum === undefined) {
    return {
      title: "Month not recognized | running.services",
      description: "Try a month name.",
      ogType: "website",
      is404: true,
      noindex: true,
    } as PageMeta;
  }

  const search: BestSearchParams = {
    state: metro.state.abbreviation,
    city: metro.name,
    distance: distanceCfg.distance || undefined,
    surface: distanceCfg.surface || undefined,
    month: monthNum,
    sort: "date",
    limit: 60,
  };
  const apiQs = buildBestSearchQs(search);
  const races = await storage.getRacesAdvanced({
    state: metro.state.abbreviation,
    city: metro.name,
    distance: distanceCfg.distance || undefined,
    surface: distanceCfg.surface || undefined,
    month: monthNum,
    sort: "date",
    limit: 60,
  }).catch(() => []);
  qc.setQueryData(["/api/races/search", apiQs], races);

  const monthLabel = monthNum ? METRO_MONTH_NAMES[monthNum] : null;
  const titleSuffix = monthLabel ? ` in ${monthLabel}` : "";
  const url = monthSlug
    ? `${SITE_ORIGIN}/${metroSlug}/${distanceSlug}/${monthSlug.toLowerCase()}`
    : `${SITE_ORIGIN}/${metroSlug}/${distanceSlug}`;
  const title = `${distanceCfg.plural} in ${metro.name}, ${metro.state.abbreviation}${titleSuffix} | running.services`;
  const description = monthLabel
    ? `${distanceCfg.plural} in ${metro.name} during ${monthLabel}. Sorted by date with deterministic 0–100 scores.`
    : `Every ${distanceCfg.label.toLowerCase()} happening in or near ${metro.name}, ${metro.state.name}. Sorted by date with deterministic 0–100 scores.`;

  return {
    title,
    description,
    ogType: "website",
    canonicalUrl: url,
    noindex: races.length < 5,
    jsonLd: buildCollectionJsonLd(title.replace(" | running.services", ""), description, url, races),
    breadcrumbJsonLd: buildBreadcrumbJsonLd([
      { name: "Home", href: "/" },
      { name: "Races", href: "/races" },
      { name: metro.state.name, href: `/races/state/${metro.state.slug}` },
      { name: metro.name, href: `/races/state/${metro.state.slug}/city/${metro.slug}` },
      { name: monthLabel ? `${distanceCfg.plural} (${monthLabel})` : distanceCfg.plural },
    ]),
  } as PageMeta;
};

const prefetchStateDistance: PrefetchFn = async (qc, params) => {
  const { state: stateSlug, distance: distanceSlug } = params;
  if (!isValidDistanceSlug(distanceSlug)) {
    return {
      title: "Distance not found | running.services",
      description: "Unknown distance shortcut.",
      ogType: "website",
      is404: true,
      noindex: true,
    } as PageMeta;
  }
  const distanceCfg = DISTANCE_SLUG_TO_LABEL[distanceSlug];
  const state = await storage.getStateBySlug(stateSlug).catch(() => undefined);
  if (!state) {
    return {
      title: "State not found | running.services",
      description: "Unknown state.",
      ogType: "website",
      is404: true,
      noindex: true,
    } as PageMeta;
  }
  qc.setQueryData(["/api/states", stateSlug], state);

  const search: BestSearchParams = {
    state: state.abbreviation,
    distance: distanceCfg.distance || undefined,
    surface: distanceCfg.surface || undefined,
    sort: "date",
    limit: 60,
  };
  const apiQs = buildBestSearchQs(search);
  const races = await storage.getRacesAdvanced({
    state: state.abbreviation,
    distance: distanceCfg.distance || undefined,
    surface: distanceCfg.surface || undefined,
    sort: "date",
    limit: 60,
  }).catch(() => []);
  qc.setQueryData(["/api/races/search", apiQs], races);

  const url = `${SITE_ORIGIN}/state/${stateSlug}/${distanceSlug}`;
  const title = `${distanceCfg.plural} in ${state.name} | running.services`;
  const description = `Every ${distanceCfg.label.toLowerCase()} we track across ${state.name}, sorted by date.`;

  return {
    title,
    description,
    ogType: "website",
    canonicalUrl: url,
    noindex: races.length < 5,
    jsonLd: buildCollectionJsonLd(title.replace(" | running.services", ""), description, url, races),
    breadcrumbJsonLd: buildBreadcrumbJsonLd([
      { name: "Home", href: "/" },
      { name: "Races", href: "/races" },
      { name: state.name, href: `/races/state/${stateSlug}` },
      { name: distanceCfg.plural },
    ]),
  } as PageMeta;
};

const prefetchBest: PrefetchFn = async (qc, params) => {
  const slug = params.slug;
  const cfg = BEST_CONFIGS[slug];
  if (!cfg) {
    return {
      title: "Best-of list not found | running.services",
      description: "Unknown curated list.",
      ogType: "website",
      is404: true,
      noindex: true,
    } as PageMeta;
  }
  const search = resolveBestSearch(slug, cfg);
  const apiQs = buildBestSearchQs(search);
  const races = await storage.getRacesAdvanced(search as Parameters<typeof storage.getRacesAdvanced>[0]).catch(() => []);
  qc.setQueryData(["/api/races/search", apiQs], races);

  const url = `${SITE_ORIGIN}/best/${slug}`;
  const title = `${cfg.title} | running.services`;
  return {
    title,
    description: cfg.intro,
    ogType: "website",
    canonicalUrl: url,
    noindex: races.length === 0,
    jsonLd: buildCollectionJsonLd(cfg.title, cfg.intro, url, races),
    breadcrumbJsonLd: buildBreadcrumbJsonLd([
      { name: "Home", href: "/" },
      { name: "Best of" },
      { name: cfg.title },
    ]),
  } as PageMeta;
};

const prefetchConstraint: PrefetchFn = async (qc, params) => {
  const metroSlug = params.metro;
  const constraint = params.kind === "walker" ? "walker" : "stroller";
  const metro = await storage.getCityByMetroSlug(metroSlug).catch(() => undefined);
  if (!metro) {
    return {
      title: "Metro not found | running.services",
      description: "Unknown metro.",
      ogType: "website",
      is404: true,
      noindex: true,
    } as PageMeta;
  }
  qc.setQueryData([`/api/metros/${metroSlug}`], { city: metro, state: metro.state });

  const search: BestSearchParams = {
    state: metro.state.abbreviation,
    city: metro.name,
    distance: "5K",
    walkerFriendly: constraint === "walker" ? true : undefined,
    strollerFriendly: constraint === "stroller" ? true : undefined,
    sort: "date",
    limit: 60,
  };
  const apiQs = buildBestSearchQs(search);
  const races = await storage.getRacesAdvanced({
    state: metro.state.abbreviation,
    city: metro.name,
    distance: "5K",
    walkerFriendly: constraint === "walker" ? true : undefined,
    strollerFriendly: constraint === "stroller" ? true : undefined,
    sort: "date",
    limit: 60,
  }).catch(() => []);
  qc.setQueryData(["/api/races/search", apiQs], races);

  const constraintLabel = constraint === "walker" ? "Walker-friendly" : "Stroller-friendly";
  const url = `${SITE_ORIGIN}/${constraint}-friendly-5k/${metroSlug}`;
  const title = `${constraintLabel} 5Ks in ${metro.name}, ${metro.state.abbreviation} | running.services`;
  const description = `${constraintLabel} 5Ks in or near ${metro.name}, ${metro.state.name}. Each event is flagged for its accessibility, time limit, and family options.`;

  return {
    title,
    description,
    ogType: "website",
    canonicalUrl: url,
    noindex: races.length < 5,
    jsonLd: buildCollectionJsonLd(title.replace(" | running.services", ""), description, url, races),
    breadcrumbJsonLd: buildBreadcrumbJsonLd([
      { name: "Home", href: "/" },
      { name: "Races", href: "/races" },
      { name: metro.state.name, href: `/races/state/${metro.state.slug}` },
      { name: metro.name, href: `/races/state/${metro.state.slug}/city/${metro.slug}` },
      { name: `${constraintLabel} 5Ks` },
    ]),
  } as PageMeta;
};

const prefetchSeries: PrefetchFn = async (qc, params) => {
  const slug = params.slug;
  const series = await storage.getRaceSeriesBySlug(slug).catch(() => undefined);
  if (!series) {
    return {
      title: "Series not found | running.services",
      description: "Unknown race series.",
      ogType: "website",
      is404: true,
      noindex: true,
    } as PageMeta;
  }
  const races = await storage.getRacesBySeries(series.id).catch(() => []);
  qc.setQueryData([`/api/series/${slug}`], { series, races });

  const url = `${SITE_ORIGIN}/series/${slug}`;
  const title = `${series.name} — Race Series | running.services`;
  const description = series.description || `All upcoming races in the ${series.name} race series.`;
  return {
    title,
    description,
    ogType: "website",
    canonicalUrl: url,
    noindex: races.length < 5,
    jsonLd: buildCollectionJsonLd(series.name, description, url, races),
    breadcrumbJsonLd: buildBreadcrumbJsonLd([
      { name: "Home", href: "/" },
      { name: "Races", href: "/races" },
      { name: "Series" },
      { name: series.name },
    ]),
  } as PageMeta;
};

const prefetchOrganizerDetail: PrefetchFn = async (qc, params) => {
  const slug = params.slug;
  const org = await storage.getOrganizerBySlug(slug).catch(() => undefined);
  if (!org) {
    return {
      title: "Organizer not found | running.services",
      description: "Unknown organizer.",
      ogType: "website",
      is404: true,
      noindex: true,
    } as PageMeta;
  }
  const races = await storage.getRacesByOrganizer(org.id).catch(() => []);
  qc.setQueryData([`/api/organizers/${slug}`], { organizer: org, races });

  const url = `${SITE_ORIGIN}/organizers/${slug}`;
  const title = `${org.name} — Race Organizer | running.services`;
  const description = org.description || `Every race put on by ${org.name}.`;
  return {
    title,
    description,
    ogType: "website",
    canonicalUrl: url,
    noindex: races.length < 5,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${org.name} — Races`,
      url,
      ...(org.description ? { description: org.description } : {}),
      about: {
        "@type": "Organization",
        name: org.name,
        ...(org.website ? { sameAs: [org.website] } : {}),
        ...(org.description ? { description: org.description } : {}),
      },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: races.length,
        itemListElement: races.slice(0, 25).map((r, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: `${SITE_ORIGIN}/races/${r.slug}`,
          name: r.name,
        })),
      },
    },
    breadcrumbJsonLd: buildBreadcrumbJsonLd([
      { name: "Home", href: "/" },
      { name: "Organizers", href: "/organizers" },
      { name: org.name },
    ]),
  } as PageMeta;
};

const routeMatches: RouteMatch[] = [
  { pattern: /^\/$/, prefetch: prefetchHome, paramNames: [] },
  { pattern: /^\/races$/, prefetch: prefetchRaces, paramNames: [] },
  { pattern: /^\/races\/usa$/, prefetch: prefetchRacesUSA, paramNames: [] },
  { pattern: /^\/races\/nearby$/, prefetch: prefetchNearby, paramNames: [] },
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
  { pattern: /^\/terms$/, prefetch: prefetchTerms, paramNames: [] },
  { pattern: /^\/privacy$/, prefetch: prefetchPrivacy, paramNames: [] },
  { pattern: /^\/about$/, prefetch: prefetchAbout, paramNames: [] },
  { pattern: /^\/map$/, prefetch: prefetchMap, paramNames: [] },
  { pattern: /^\/pricing$/, prefetch: prefetchPricing, paramNames: [] },
  { pattern: /^\/developers$/, prefetch: prefetchDevelopers, paramNames: [] },
  { pattern: /^\/reports$/, prefetch: prefetchReports, paramNames: [] },
  { pattern: /^\/reports\/([^/]+)\/([^/]+)$/, prefetch: prefetchReports, paramNames: ["metro", "distance"] },
  { pattern: /^\/contact$/, prefetch: prefetchContact, paramNames: [] },
  { pattern: /^\/blog$/, prefetch: prefetchBlog, paramNames: [] },
  { pattern: /^\/blog\/([^/]+)$/, prefetch: prefetchBlogPost, paramNames: ["slug"] },
  { pattern: /^\/auth\/verify$/, prefetch: prefetchAuthVerify, paramNames: [] },
  { pattern: /^\/favorites$/, prefetch: prefetchFavorites, paramNames: [] },
  { pattern: /^\/alerts$/, prefetch: prefetchAlerts, paramNames: [] },
  { pattern: /^\/race-shopper\/([^/]+)$/, prefetch: prefetchRaceShopper, paramNames: ["goal"] },
  { pattern: /^\/race-shopper$/, prefetch: prefetchRaceShopper, paramNames: [] },
  { pattern: /^\/shopper\/([^/]+)$/, prefetch: prefetchRaceShopper, paramNames: ["goal"] },
  { pattern: /^\/shopper$/, prefetch: prefetchRaceShopper, paramNames: [] },
  { pattern: /^\/compare$/, prefetch: prefetchCompare, paramNames: [] },
  { pattern: /^\/this-weekend$/, prefetch: prefetchThisWeekendPage, paramNames: [] },
  { pattern: /^\/price-watch$/, prefetch: prefetchPriceWatch, paramNames: [] },
  { pattern: /^\/organizers\/dashboard$/, prefetch: prefetchOrganizers, paramNames: [] },
  { pattern: /^\/organizers\/([^/]+)$/, prefetch: prefetchOrganizerDetail, paramNames: ["slug"] },
  { pattern: /^\/organizers$/, prefetch: prefetchOrganizers, paramNames: [] },
  { pattern: /^\/for-organizers$/, prefetch: prefetchOrganizers, paramNames: [] },
  { pattern: /^\/auth\/verify-claim$/, prefetch: prefetchAuthVerify, paramNames: [] },
  { pattern: /^\/series\/([^/]+)$/, prefetch: prefetchSeries, paramNames: ["slug"] },
  { pattern: /^\/turkey-trots\/([^/]+)$/, prefetch: prefetchTurkeyTrots, paramNames: ["metro"] },
  { pattern: /^\/turkey-trots$/, prefetch: prefetchTurkeyTrots, paramNames: [] },
  { pattern: /^\/best\/([^/]+)$/, prefetch: prefetchBest, paramNames: ["slug"] },
  { pattern: /^\/best-races\/([^/]+)\/([^/]+)$/, prefetch: prefetchBestDistanceMonth, paramNames: ["distance", "month"] },
  { pattern: /^\/vs\/([^/]+)$/, prefetch: prefetchRaceVsRace, paramNames: ["slugs"] },
  {
    pattern: /^\/walker-friendly-5k\/([^/]+)$/,
    prefetch: (qc, p) => prefetchConstraint(qc, { ...p, kind: "walker" }),
    paramNames: ["metro"],
  },
  {
    pattern: /^\/stroller-friendly-5k\/([^/]+)$/,
    prefetch: (qc, p) => prefetchConstraint(qc, { ...p, kind: "stroller" }),
    paramNames: ["metro"],
  },
  { pattern: /^\/state\/([^/]+)\/(5k-races|10k-races|half-marathons|marathons|trail-races)$/, prefetch: prefetchStateDistance, paramNames: ["state", "distance"] },
  { pattern: /^\/([^/]+)\/([^/]+)\/([^/]+)$/, prefetch: prefetchCityDistance, paramNames: ["metro", "distance", "month"] },
  { pattern: /^\/([^/]+)\/([^/]+)$/, prefetch: prefetchCityDistance, paramNames: ["metro", "distance"] },
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
