import { LucideIcon, Timer, Map, Activity, Zap, Trophy, Mountain, Calendar } from "lucide-react";

export interface Race {
  id: string;
  slug: string;
  name: string;
  date: string;
  city: string;
  state: string;
  distance: "5K" | "10K" | "Half Marathon" | "Marathon" | "Ultra" | "Other";
  surface: "Road" | "Trail" | "Track" | "Mixed";
  elevation: "Flat" | "Rolling" | "Hilly" | "Mountainous";
  image?: string;
}

export interface Route {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  distance: number; // miles
  elevationGain: number; // feet
  surface: "Road" | "Trail" | "Path";
  type: "Loop" | "Out-and-Back" | "Point-to-Point";
  difficulty: "Easy" | "Moderate" | "Hard";
}

export interface State {
  name: string;
  slug: string;
  abbreviation: string;
  raceCount: number;
  routeCount: number;
  popularCities: string[];
}

export const STATES: State[] = [
  { name: "California", slug: "california", abbreviation: "CA", raceCount: 450, routeCount: 1200, popularCities: ["San Francisco", "Los Angeles", "San Diego", "Sacramento"] },
  { name: "New York", slug: "new-york", abbreviation: "NY", raceCount: 320, routeCount: 800, popularCities: ["New York City", "Albany", "Buffalo"] },
  { name: "Texas", slug: "texas", abbreviation: "TX", raceCount: 280, routeCount: 600, popularCities: ["Austin", "Houston", "Dallas", "San Antonio"] },
  { name: "Colorado", slug: "colorado", abbreviation: "CO", raceCount: 190, routeCount: 950, popularCities: ["Denver", "Boulder", "Colorado Springs"] },
  { name: "Massachusetts", slug: "massachusetts", abbreviation: "MA", raceCount: 150, routeCount: 400, popularCities: ["Boston", "Cambridge", "Worcester"] },
  { name: "Illinois", slug: "illinois", abbreviation: "IL", raceCount: 180, routeCount: 350, popularCities: ["Chicago", "Naperville", "Springfield"] },
  { name: "Washington", slug: "washington", abbreviation: "WA", raceCount: 160, routeCount: 500, popularCities: ["Seattle", "Tacoma", "Spokane"] },
  { name: "Florida", slug: "florida", abbreviation: "FL", raceCount: 240, routeCount: 450, popularCities: ["Miami", "Orlando", "Tampa"] },
  { name: "Oregon", slug: "oregon", abbreviation: "OR", raceCount: 130, routeCount: 550, popularCities: ["Portland", "Eugene", "Bend"] },
];

export const RACES: Race[] = [
  { id: "1", slug: "sf-marathon", name: "The San Francisco Marathon", date: "2025-07-27", city: "San Francisco", state: "CA", distance: "Marathon", surface: "Road", elevation: "Hilly" },
  { id: "2", slug: "nyc-marathon", name: "TCS New York City Marathon", date: "2025-11-02", city: "New York City", state: "NY", distance: "Marathon", surface: "Road", elevation: "Rolling" },
  { id: "3", slug: "boston-marathon", name: "Boston Marathon", date: "2025-04-21", city: "Boston", state: "MA", distance: "Marathon", surface: "Road", elevation: "Rolling" },
  { id: "4", slug: "chicago-marathon", name: "Bank of America Chicago Marathon", date: "2025-10-12", city: "Chicago", state: "IL", distance: "Marathon", surface: "Road", elevation: "Flat" },
  { id: "5", slug: "austin-marathon", name: "Austin Marathon", date: "2025-02-16", city: "Austin", state: "TX", distance: "Marathon", surface: "Road", elevation: "Hilly" },
  { id: "6", slug: "dipsea", name: "Dipsea Race", date: "2025-06-08", city: "Mill Valley", state: "CA", distance: "Other", surface: "Trail", elevation: "Mountainous" },
  { id: "7", slug: "bolder-boulder", name: "BOLDERBoulder", date: "2025-05-26", city: "Boulder", state: "CO", distance: "10K", surface: "Road", elevation: "Rolling" },
  { id: "8", slug: "marine-corps-marathon", name: "Marine Corps Marathon", date: "2025-10-26", city: "Arlington", state: "VA", distance: "Marathon", surface: "Road", elevation: "Rolling" },
  { id: "9", slug: "western-states", name: "Western States 100", date: "2025-06-28", city: "Auburn", state: "CA", distance: "Ultra", surface: "Trail", elevation: "Mountainous" },
  { id: "10", slug: "brooklyn-half", name: "RBC Brooklyn Half", date: "2025-05-17", city: "New York City", state: "NY", distance: "Half Marathon", surface: "Road", elevation: "Flat" },
  { id: "11", slug: "rock-n-roll-las-vegas", name: "Rock 'n' Roll Las Vegas", date: "2025-02-23", city: "Las Vegas", state: "NV", distance: "Half Marathon", surface: "Road", elevation: "Flat" },
  { id: "12", slug: "miami-marathon", name: "Life Time Miami Marathon", date: "2025-02-02", city: "Miami", state: "FL", distance: "Marathon", surface: "Road", elevation: "Flat" },
];

export const ROUTES: Route[] = [
  { id: "1", slug: "central-park-loop", name: "Central Park Full Loop", city: "New York City", state: "NY", distance: 6.1, elevationGain: 280, surface: "Road", type: "Loop", difficulty: "Moderate" },
  { id: "2", slug: "crissy-field", name: "Crissy Field to Golden Gate Bridge", city: "San Francisco", state: "CA", distance: 4.5, elevationGain: 120, surface: "Path", type: "Out-and-Back", difficulty: "Easy" },
  { id: "3", slug: "lakefront-trail", name: "Chicago Lakefront Trail", city: "Chicago", state: "IL", distance: 18.0, elevationGain: 50, surface: "Path", type: "Point-to-Point", difficulty: "Easy" },
  { id: "4", slug: "lady-bird-lake", name: "Lady Bird Lake Loop", city: "Austin", state: "TX", distance: 10.1, elevationGain: 100, surface: "Path", type: "Loop", difficulty: "Easy" },
  { id: "5", slug: "boulder-creek-path", name: "Boulder Creek Path", city: "Boulder", state: "CO", distance: 5.5, elevationGain: 200, surface: "Path", type: "Out-and-Back", difficulty: "Moderate" },
  { id: "6", slug: "charles-river-esplanade", name: "Charles River Esplanade", city: "Boston", state: "MA", distance: 3.0, elevationGain: 20, surface: "Path", type: "Loop", difficulty: "Easy" },
  { id: "7", slug: "forest-park-wildwood", name: "Wildwood Trail (End-to-End)", city: "Portland", state: "OR", distance: 30.2, elevationGain: 2500, surface: "Trail", type: "Point-to-Point", difficulty: "Hard" },
  { id: "8", slug: "runyon-canyon", name: "Runyon Canyon Loop", city: "Los Angeles", state: "CA", distance: 3.5, elevationGain: 800, surface: "Trail", type: "Loop", difficulty: "Hard" },
];

export const TOOLS = [
  {
    name: "Race Predictor",
    slug: "race-predictor",
    description: "Predict your finish time for any distance based on your recent training.",
    icon: Timer,
    href: "/tools/race-predictor" // Internal landing page that links out
  },
  {
    name: "Pace Calculator",
    slug: "pace-calculator",
    description: "Calculate splits and required pace to hit your race goals.",
    icon: Activity,
    href: "/tools/pace-calculator"
  },
  {
    name: "Training Plans",
    slug: "training-plan",
    description: "AI-generated training plans customized to your fitness level.",
    icon: Calendar,
    href: "/tools/training-plan"
  },
  {
    name: "VO2 Max Estimator",
    slug: "vo2-estimator",
    description: "Estimate your VO2 Max based on recent race performances.",
    icon: Zap,
    href: "/tools/vo2-estimator"
  }
];
