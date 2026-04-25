const STATE_MAP: Record<string, { name: string; slug: string }> = {
  AL: { name: "Alabama", slug: "alabama" },
  AK: { name: "Alaska", slug: "alaska" },
  AZ: { name: "Arizona", slug: "arizona" },
  AR: { name: "Arkansas", slug: "arkansas" },
  CA: { name: "California", slug: "california" },
  CO: { name: "Colorado", slug: "colorado" },
  CT: { name: "Connecticut", slug: "connecticut" },
  DE: { name: "Delaware", slug: "delaware" },
  DC: { name: "District of Columbia", slug: "district-of-columbia" },
  FL: { name: "Florida", slug: "florida" },
  GA: { name: "Georgia", slug: "georgia" },
  HI: { name: "Hawaii", slug: "hawaii" },
  ID: { name: "Idaho", slug: "idaho" },
  IL: { name: "Illinois", slug: "illinois" },
  IN: { name: "Indiana", slug: "indiana" },
  IA: { name: "Iowa", slug: "iowa" },
  KS: { name: "Kansas", slug: "kansas" },
  KY: { name: "Kentucky", slug: "kentucky" },
  LA: { name: "Louisiana", slug: "louisiana" },
  ME: { name: "Maine", slug: "maine" },
  MD: { name: "Maryland", slug: "maryland" },
  MA: { name: "Massachusetts", slug: "massachusetts" },
  MI: { name: "Michigan", slug: "michigan" },
  MN: { name: "Minnesota", slug: "minnesota" },
  MS: { name: "Mississippi", slug: "mississippi" },
  MO: { name: "Missouri", slug: "missouri" },
  MT: { name: "Montana", slug: "montana" },
  NE: { name: "Nebraska", slug: "nebraska" },
  NV: { name: "Nevada", slug: "nevada" },
  NH: { name: "New Hampshire", slug: "new-hampshire" },
  NJ: { name: "New Jersey", slug: "new-jersey" },
  NM: { name: "New Mexico", slug: "new-mexico" },
  NY: { name: "New York", slug: "new-york" },
  NC: { name: "North Carolina", slug: "north-carolina" },
  ND: { name: "North Dakota", slug: "north-dakota" },
  OH: { name: "Ohio", slug: "ohio" },
  OK: { name: "Oklahoma", slug: "oklahoma" },
  OR: { name: "Oregon", slug: "oregon" },
  PA: { name: "Pennsylvania", slug: "pennsylvania" },
  RI: { name: "Rhode Island", slug: "rhode-island" },
  SC: { name: "South Carolina", slug: "south-carolina" },
  SD: { name: "South Dakota", slug: "south-dakota" },
  TN: { name: "Tennessee", slug: "tennessee" },
  TX: { name: "Texas", slug: "texas" },
  UT: { name: "Utah", slug: "utah" },
  VT: { name: "Vermont", slug: "vermont" },
  VA: { name: "Virginia", slug: "virginia" },
  WA: { name: "Washington", slug: "washington" },
  WV: { name: "West Virginia", slug: "west-virginia" },
  WI: { name: "Wisconsin", slug: "wisconsin" },
  WY: { name: "Wyoming", slug: "wyoming" },
};

export function getStateSlug(stateAbbr: string): string {
  return STATE_MAP[stateAbbr.toUpperCase()]?.slug || stateAbbr.toLowerCase().replace(/\s+/g, "-");
}

export function getStateName(stateAbbr: string): string {
  return STATE_MAP[stateAbbr.toUpperCase()]?.name || stateAbbr;
}

// Approximate geographic centroids (lat, lng) for each US state.
// Used as a coarse anchor when a user picks a state + travel radius
// without a more precise location (e.g., Race Shopper).
const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  AL: { lat: 32.806, lng: -86.791 }, AK: { lat: 61.370, lng: -152.404 },
  AZ: { lat: 33.729, lng: -111.431 }, AR: { lat: 34.969, lng: -92.373 },
  CA: { lat: 36.778, lng: -119.418 }, CO: { lat: 39.059, lng: -105.311 },
  CT: { lat: 41.598, lng: -72.755 }, DE: { lat: 39.318, lng: -75.507 },
  DC: { lat: 38.897, lng: -77.026 }, FL: { lat: 27.766, lng: -81.687 },
  GA: { lat: 33.040, lng: -83.643 }, HI: { lat: 21.094, lng: -157.498 },
  ID: { lat: 44.240, lng: -114.479 }, IL: { lat: 40.349, lng: -88.986 },
  IN: { lat: 39.849, lng: -86.258 }, IA: { lat: 42.011, lng: -93.210 },
  KS: { lat: 38.526, lng: -96.726 }, KY: { lat: 37.668, lng: -84.670 },
  LA: { lat: 31.169, lng: -91.867 }, ME: { lat: 44.693, lng: -69.382 },
  MD: { lat: 39.064, lng: -76.802 }, MA: { lat: 42.231, lng: -71.530 },
  MI: { lat: 43.326, lng: -84.536 }, MN: { lat: 45.694, lng: -93.900 },
  MS: { lat: 32.741, lng: -89.678 }, MO: { lat: 38.456, lng: -92.288 },
  MT: { lat: 46.921, lng: -110.454 }, NE: { lat: 41.125, lng: -98.268 },
  NV: { lat: 38.313, lng: -117.055 }, NH: { lat: 43.452, lng: -71.563 },
  NJ: { lat: 40.298, lng: -74.521 }, NM: { lat: 34.840, lng: -106.248 },
  NY: { lat: 42.165, lng: -74.948 }, NC: { lat: 35.630, lng: -79.806 },
  ND: { lat: 47.529, lng: -99.784 }, OH: { lat: 40.388, lng: -82.764 },
  OK: { lat: 35.565, lng: -96.928 }, OR: { lat: 44.572, lng: -122.070 },
  PA: { lat: 40.590, lng: -77.209 }, RI: { lat: 41.680, lng: -71.511 },
  SC: { lat: 33.856, lng: -80.945 }, SD: { lat: 44.299, lng: -99.438 },
  TN: { lat: 35.747, lng: -86.692 }, TX: { lat: 31.054, lng: -97.563 },
  UT: { lat: 40.150, lng: -111.862 }, VT: { lat: 44.045, lng: -72.710 },
  VA: { lat: 37.769, lng: -78.169 }, WA: { lat: 47.401, lng: -121.490 },
  WV: { lat: 38.491, lng: -80.954 }, WI: { lat: 44.268, lng: -89.616 },
  WY: { lat: 42.756, lng: -107.302 },
};

export function getStateCentroid(stateAbbr: string): { lat: number; lng: number } | undefined {
  return STATE_CENTROIDS[stateAbbr.toUpperCase()];
}
