import type { InsertState, InsertRace, InsertRoute } from "@shared/schema";
import { storage } from "./storage";

const SEED_STATES: InsertState[] = [
  { name: "Alabama", slug: "alabama", abbreviation: "AL", raceCount: 65, routeCount: 120, popularCities: ["Birmingham", "Huntsville", "Mobile"] },
  { name: "Alaska", slug: "alaska", abbreviation: "AK", raceCount: 25, routeCount: 80, popularCities: ["Anchorage", "Fairbanks", "Juneau"] },
  { name: "Arizona", slug: "arizona", abbreviation: "AZ", raceCount: 110, routeCount: 200, popularCities: ["Phoenix", "Tucson", "Scottsdale", "Sedona"] },
  { name: "Arkansas", slug: "arkansas", abbreviation: "AR", raceCount: 45, routeCount: 90, popularCities: ["Little Rock", "Fayetteville", "Hot Springs"] },
  { name: "California", slug: "california", abbreviation: "CA", raceCount: 450, routeCount: 1200, popularCities: ["San Francisco", "Los Angeles", "San Diego", "Sacramento"] },
  { name: "Colorado", slug: "colorado", abbreviation: "CO", raceCount: 190, routeCount: 950, popularCities: ["Denver", "Boulder", "Colorado Springs", "Fort Collins"] },
  { name: "Connecticut", slug: "connecticut", abbreviation: "CT", raceCount: 80, routeCount: 150, popularCities: ["Hartford", "New Haven", "Stamford"] },
  { name: "Delaware", slug: "delaware", abbreviation: "DE", raceCount: 30, routeCount: 60, popularCities: ["Wilmington", "Dover", "Newark"] },
  { name: "Florida", slug: "florida", abbreviation: "FL", raceCount: 240, routeCount: 450, popularCities: ["Miami", "Orlando", "Tampa", "Jacksonville"] },
  { name: "Georgia", slug: "georgia", abbreviation: "GA", raceCount: 140, routeCount: 280, popularCities: ["Atlanta", "Savannah", "Augusta"] },
  { name: "Hawaii", slug: "hawaii", abbreviation: "HI", raceCount: 50, routeCount: 120, popularCities: ["Honolulu", "Maui", "Kona"] },
  { name: "Idaho", slug: "idaho", abbreviation: "ID", raceCount: 40, routeCount: 180, popularCities: ["Boise", "Sun Valley", "Coeur d'Alene"] },
  { name: "Illinois", slug: "illinois", abbreviation: "IL", raceCount: 180, routeCount: 350, popularCities: ["Chicago", "Naperville", "Springfield"] },
  { name: "Indiana", slug: "indiana", abbreviation: "IN", raceCount: 90, routeCount: 160, popularCities: ["Indianapolis", "Fort Wayne", "Bloomington"] },
  { name: "Iowa", slug: "iowa", abbreviation: "IA", raceCount: 55, routeCount: 100, popularCities: ["Des Moines", "Iowa City", "Cedar Rapids"] },
  { name: "Kansas", slug: "kansas", abbreviation: "KS", raceCount: 50, routeCount: 80, popularCities: ["Kansas City", "Wichita", "Lawrence"] },
  { name: "Kentucky", slug: "kentucky", abbreviation: "KY", raceCount: 60, routeCount: 140, popularCities: ["Louisville", "Lexington", "Bowling Green"] },
  { name: "Louisiana", slug: "louisiana", abbreviation: "LA", raceCount: 55, routeCount: 90, popularCities: ["New Orleans", "Baton Rouge", "Lafayette"] },
  { name: "Maine", slug: "maine", abbreviation: "ME", raceCount: 65, routeCount: 180, popularCities: ["Portland", "Bar Harbor", "Bangor"] },
  { name: "Maryland", slug: "maryland", abbreviation: "MD", raceCount: 110, routeCount: 200, popularCities: ["Baltimore", "Annapolis", "Bethesda"] },
  { name: "Massachusetts", slug: "massachusetts", abbreviation: "MA", raceCount: 150, routeCount: 400, popularCities: ["Boston", "Cambridge", "Worcester"] },
  { name: "Michigan", slug: "michigan", abbreviation: "MI", raceCount: 120, routeCount: 280, popularCities: ["Detroit", "Ann Arbor", "Grand Rapids", "Traverse City"] },
  { name: "Minnesota", slug: "minnesota", abbreviation: "MN", raceCount: 110, routeCount: 250, popularCities: ["Minneapolis", "St. Paul", "Duluth"] },
  { name: "Mississippi", slug: "mississippi", abbreviation: "MS", raceCount: 35, routeCount: 60, popularCities: ["Jackson", "Hattiesburg", "Oxford"] },
  { name: "Missouri", slug: "missouri", abbreviation: "MO", raceCount: 85, routeCount: 160, popularCities: ["St. Louis", "Kansas City", "Columbia"] },
  { name: "Montana", slug: "montana", abbreviation: "MT", raceCount: 45, routeCount: 200, popularCities: ["Missoula", "Bozeman", "Billings"] },
  { name: "Nebraska", slug: "nebraska", abbreviation: "NE", raceCount: 45, routeCount: 80, popularCities: ["Omaha", "Lincoln"] },
  { name: "Nevada", slug: "nevada", abbreviation: "NV", raceCount: 55, routeCount: 120, popularCities: ["Las Vegas", "Reno", "Henderson"] },
  { name: "New Hampshire", slug: "new-hampshire", abbreviation: "NH", raceCount: 60, routeCount: 200, popularCities: ["Manchester", "Concord", "Portsmouth"] },
  { name: "New Jersey", slug: "new-jersey", abbreviation: "NJ", raceCount: 130, routeCount: 220, popularCities: ["Newark", "Jersey City", "Princeton"] },
  { name: "New Mexico", slug: "new-mexico", abbreviation: "NM", raceCount: 50, routeCount: 150, popularCities: ["Albuquerque", "Santa Fe", "Las Cruces"] },
  { name: "New York", slug: "new-york", abbreviation: "NY", raceCount: 320, routeCount: 800, popularCities: ["New York City", "Albany", "Buffalo", "Syracuse"] },
  { name: "North Carolina", slug: "north-carolina", abbreviation: "NC", raceCount: 140, routeCount: 350, popularCities: ["Charlotte", "Raleigh", "Asheville"] },
  { name: "North Dakota", slug: "north-dakota", abbreviation: "ND", raceCount: 20, routeCount: 40, popularCities: ["Fargo", "Bismarck"] },
  { name: "Ohio", slug: "ohio", abbreviation: "OH", raceCount: 130, routeCount: 250, popularCities: ["Columbus", "Cleveland", "Cincinnati"] },
  { name: "Oklahoma", slug: "oklahoma", abbreviation: "OK", raceCount: 55, routeCount: 100, popularCities: ["Oklahoma City", "Tulsa", "Norman"] },
  { name: "Oregon", slug: "oregon", abbreviation: "OR", raceCount: 130, routeCount: 550, popularCities: ["Portland", "Eugene", "Bend"] },
  { name: "Pennsylvania", slug: "pennsylvania", abbreviation: "PA", raceCount: 160, routeCount: 300, popularCities: ["Philadelphia", "Pittsburgh", "Lancaster"] },
  { name: "Rhode Island", slug: "rhode-island", abbreviation: "RI", raceCount: 35, routeCount: 70, popularCities: ["Providence", "Newport"] },
  { name: "South Carolina", slug: "south-carolina", abbreviation: "SC", raceCount: 75, routeCount: 140, popularCities: ["Charleston", "Columbia", "Greenville"] },
  { name: "South Dakota", slug: "south-dakota", abbreviation: "SD", raceCount: 25, routeCount: 60, popularCities: ["Sioux Falls", "Rapid City"] },
  { name: "Tennessee", slug: "tennessee", abbreviation: "TN", raceCount: 110, routeCount: 250, popularCities: ["Nashville", "Memphis", "Knoxville", "Chattanooga"] },
  { name: "Texas", slug: "texas", abbreviation: "TX", raceCount: 280, routeCount: 600, popularCities: ["Austin", "Houston", "Dallas", "San Antonio"] },
  { name: "Utah", slug: "utah", abbreviation: "UT", raceCount: 100, routeCount: 400, popularCities: ["Salt Lake City", "Park City", "St. George", "Moab"] },
  { name: "Vermont", slug: "vermont", abbreviation: "VT", raceCount: 45, routeCount: 160, popularCities: ["Burlington", "Montpelier", "Stowe"] },
  { name: "Virginia", slug: "virginia", abbreviation: "VA", raceCount: 150, routeCount: 320, popularCities: ["Arlington", "Richmond", "Virginia Beach", "Charlottesville"] },
  { name: "Washington", slug: "washington", abbreviation: "WA", raceCount: 160, routeCount: 500, popularCities: ["Seattle", "Tacoma", "Spokane", "Bellingham"] },
  { name: "West Virginia", slug: "west-virginia", abbreviation: "WV", raceCount: 30, routeCount: 120, popularCities: ["Charleston", "Morgantown"] },
  { name: "Wisconsin", slug: "wisconsin", abbreviation: "WI", raceCount: 100, routeCount: 200, popularCities: ["Milwaukee", "Madison", "Green Bay"] },
  { name: "Wyoming", slug: "wyoming", abbreviation: "WY", raceCount: 20, routeCount: 100, popularCities: ["Jackson", "Cheyenne", "Cody"] },
];

const SEED_RACES: InsertRace[] = [
  { slug: "sf-marathon", name: "The San Francisco Marathon", date: "2025-07-27", city: "San Francisco", state: "CA", distance: "Marathon", surface: "Road", elevation: "Hilly", description: "Run through the iconic streets of San Francisco, crossing the Golden Gate Bridge and winding through diverse neighborhoods.", startTime: "5:30 AM", timeLimit: "6 hours", bostonQualifier: true },
  { slug: "nyc-marathon", name: "TCS New York City Marathon", date: "2025-11-02", city: "New York City", state: "NY", distance: "Marathon", surface: "Road", elevation: "Rolling", description: "The world's largest marathon, traversing all five boroughs of New York City with an electric finish in Central Park.", startTime: "9:10 AM", timeLimit: "8.5 hours", bostonQualifier: true },
  { slug: "boston-marathon", name: "Boston Marathon", date: "2025-04-21", city: "Boston", state: "MA", distance: "Marathon", surface: "Road", elevation: "Rolling", description: "The world's oldest annual marathon. From Hopkinton to Boylston Street, this iconic point-to-point course tests the best.", startTime: "10:00 AM", timeLimit: "6 hours", bostonQualifier: false },
  { slug: "chicago-marathon", name: "Bank of America Chicago Marathon", date: "2025-10-12", city: "Chicago", state: "IL", distance: "Marathon", surface: "Road", elevation: "Flat", description: "One of the World Marathon Majors, this flat and fast course winds through 29 Chicago neighborhoods.", startTime: "7:30 AM", timeLimit: "6.5 hours", bostonQualifier: true },
  { slug: "austin-marathon", name: "Austin Marathon", date: "2025-02-16", city: "Austin", state: "TX", distance: "Marathon", surface: "Road", elevation: "Hilly", description: "Experience Austin's vibrant culture and live music along this challenging course through the Texas capital.", startTime: "7:00 AM", timeLimit: "6 hours", bostonQualifier: true },
  { slug: "dipsea", name: "Dipsea Race", date: "2025-06-08", city: "Mill Valley", state: "CA", distance: "Other", surface: "Trail", elevation: "Mountainous", description: "The oldest trail race in America. A 7.4-mile single-track adventure from Mill Valley to Stinson Beach through Muir Woods.", startTime: "8:30 AM", timeLimit: "3 hours", bostonQualifier: false },
  { slug: "bolder-boulder", name: "BOLDERBoulder", date: "2025-05-26", city: "Boulder", state: "CO", distance: "10K", surface: "Road", elevation: "Rolling", description: "One of the largest 10K races in the US, featuring live music, entertainment, and a finish inside Folsom Field.", startTime: "7:00 AM", timeLimit: "None", bostonQualifier: false },
  { slug: "marine-corps-marathon", name: "Marine Corps Marathon", date: "2025-10-26", city: "Arlington", state: "VA", distance: "Marathon", surface: "Road", elevation: "Rolling", description: "Known as 'The People's Marathon,' this race passes DC's most iconic monuments and memorials.", startTime: "7:55 AM", timeLimit: "6 hours", bostonQualifier: true },
  { slug: "western-states", name: "Western States 100", date: "2025-06-28", city: "Auburn", state: "CA", distance: "Ultra", surface: "Trail", elevation: "Mountainous", description: "The world's oldest 100-mile trail race, from Squaw Valley to Auburn through the Sierra Nevada mountains.", startTime: "5:00 AM", timeLimit: "30 hours", bostonQualifier: false },
  { slug: "brooklyn-half", name: "RBC Brooklyn Half", date: "2025-05-17", city: "New York City", state: "NY", distance: "Half Marathon", surface: "Road", elevation: "Flat", description: "America's largest half marathon, running from Prospect Park through the streets of Brooklyn to the Coney Island boardwalk.", startTime: "7:00 AM", timeLimit: "4 hours", bostonQualifier: false },
  { slug: "rock-n-roll-las-vegas", name: "Rock 'n' Roll Las Vegas", date: "2025-02-23", city: "Las Vegas", state: "NV", distance: "Half Marathon", surface: "Road", elevation: "Flat", description: "The only race on the Las Vegas Strip at night. Run under the neon lights with live entertainment at every mile.", startTime: "4:30 PM", timeLimit: "4 hours", bostonQualifier: false },
  { slug: "miami-marathon", name: "Life Time Miami Marathon", date: "2025-02-02", city: "Miami", state: "FL", distance: "Marathon", surface: "Road", elevation: "Flat", description: "A flat, fast course through Miami's most scenic neighborhoods with ocean views along the Venetian Causeway.", startTime: "6:00 AM", timeLimit: "6.5 hours", bostonQualifier: true },
  { slug: "big-sur-marathon", name: "Big Sur International Marathon", date: "2025-04-27", city: "Big Sur", state: "CA", distance: "Marathon", surface: "Road", elevation: "Hilly", description: "Consistently rated the most scenic marathon in the world, running along Highway 1 with stunning Pacific Ocean views.", startTime: "6:45 AM", timeLimit: "6 hours", bostonQualifier: false },
  { slug: "peachtree-road-race", name: "AJC Peachtree Road Race", date: "2025-07-04", city: "Atlanta", state: "GA", distance: "10K", surface: "Road", elevation: "Rolling", description: "The world's largest 10K, held every Fourth of July. A beloved Atlanta tradition since 1970.", startTime: "6:25 AM", timeLimit: "None", bostonQualifier: false },
  { slug: "honolulu-marathon", name: "Honolulu Marathon", date: "2025-12-14", city: "Honolulu", state: "HI", distance: "Marathon", surface: "Road", elevation: "Flat", description: "One of the largest marathons in the world with no time limit. Run from Ala Moana to Hawaii Kai and back with Diamond Head views.", startTime: "5:00 AM", timeLimit: "None", bostonQualifier: true },
  { slug: "houston-marathon", name: "Chevron Houston Marathon", date: "2025-01-19", city: "Houston", state: "TX", distance: "Marathon", surface: "Road", elevation: "Flat", description: "A fast, flat course through Houston that regularly produces qualifying times and personal records.", startTime: "7:00 AM", timeLimit: "6 hours", bostonQualifier: true },
  { slug: "twin-cities-marathon", name: "Medtronic Twin Cities Marathon", date: "2025-10-05", city: "Minneapolis", state: "MN", distance: "Marathon", surface: "Road", elevation: "Rolling", description: "Known as 'The Most Beautiful Urban Marathon in America,' connecting Minneapolis and St. Paul along tree-lined lakes.", startTime: "8:00 AM", timeLimit: "6 hours", bostonQualifier: true },
  { slug: "cherry-blossom-10-miler", name: "Credit Union Cherry Blossom", date: "2025-04-06", city: "Washington", state: "DC", distance: "10K", surface: "Road", elevation: "Flat", description: "Run alongside the Tidal Basin's iconic cherry blossoms during peak bloom in the nation's capital.", startTime: "7:30 AM", timeLimit: "None", bostonQualifier: false },
];

const SEED_ROUTES: InsertRoute[] = [
  { slug: "central-park-loop", name: "Central Park Full Loop", city: "New York City", state: "NY", distance: 6.1, elevationGain: 280, surface: "Road", type: "Loop", difficulty: "Moderate", description: "The classic NYC running loop through Central Park. Paved paths with rolling hills, water fountains, and restrooms." },
  { slug: "crissy-field", name: "Crissy Field to Golden Gate Bridge", city: "San Francisco", state: "CA", distance: 4.5, elevationGain: 120, surface: "Path", type: "Out-and-Back", difficulty: "Easy", description: "A flat waterfront path with stunning views of the Golden Gate Bridge. Popular with joggers and walkers alike." },
  { slug: "lakefront-trail", name: "Chicago Lakefront Trail", city: "Chicago", state: "IL", distance: 18.0, elevationGain: 50, surface: "Path", type: "Point-to-Point", difficulty: "Easy", description: "An 18-mile paved trail along Lake Michigan, one of the most popular running paths in the Midwest." },
  { slug: "lady-bird-lake", name: "Lady Bird Lake Loop", city: "Austin", state: "TX", distance: 10.1, elevationGain: 100, surface: "Path", type: "Loop", difficulty: "Easy", description: "A scenic loop around Lady Bird Lake in downtown Austin. Crushed granite trail with shade and water views." },
  { slug: "boulder-creek-path", name: "Boulder Creek Path", city: "Boulder", state: "CO", distance: 5.5, elevationGain: 200, surface: "Path", type: "Out-and-Back", difficulty: "Moderate", description: "A popular multi-use path following Boulder Creek from Eben G. Fine Park to the eastern plains." },
  { slug: "charles-river-esplanade", name: "Charles River Esplanade", city: "Boston", state: "MA", distance: 3.0, elevationGain: 20, surface: "Path", type: "Loop", difficulty: "Easy", description: "A flat, scenic loop along the Charles River with views of the Boston skyline and MIT campus." },
  { slug: "forest-park-wildwood", name: "Wildwood Trail (End-to-End)", city: "Portland", state: "OR", distance: 30.2, elevationGain: 2500, surface: "Trail", type: "Point-to-Point", difficulty: "Hard", description: "The longest continuous trail in Portland's Forest Park. A challenging end-to-end run through old-growth forest." },
  { slug: "runyon-canyon", name: "Runyon Canyon Loop", city: "Los Angeles", state: "CA", distance: 3.5, elevationGain: 800, surface: "Trail", type: "Loop", difficulty: "Hard", description: "A popular LA trail with steep climbs and panoramic views of the Hollywood Sign and downtown skyline." },
  { slug: "town-lake-boardwalk", name: "Town Lake Boardwalk", city: "Austin", state: "TX", distance: 1.3, elevationGain: 10, surface: "Path", type: "Out-and-Back", difficulty: "Easy", description: "A flat, accessible boardwalk section along Lady Bird Lake. Perfect for easy recovery runs." },
  { slug: "schuylkill-river-trail", name: "Schuylkill River Trail", city: "Philadelphia", state: "PA", distance: 8.5, elevationGain: 80, surface: "Path", type: "Out-and-Back", difficulty: "Easy", description: "A scenic paved trail along the Schuylkill River passing Boathouse Row and the Philadelphia Museum of Art." },
  { slug: "burke-gilman-trail", name: "Burke-Gilman Trail", city: "Seattle", state: "WA", distance: 27.0, elevationGain: 300, surface: "Path", type: "Point-to-Point", difficulty: "Moderate", description: "A paved multi-use trail running from the Ballard Locks to the Sammamish River Trail near Bothell." },
  { slug: "mission-bay-loop", name: "Mission Bay Loop", city: "San Diego", state: "CA", distance: 12.0, elevationGain: 30, surface: "Path", type: "Loop", difficulty: "Easy", description: "A flat waterfront loop around Mission Bay with stunning Pacific views and consistent sea breezes." },
];

export async function seedDatabase() {
  console.log("Seeding database...");

  await storage.seedStates(SEED_STATES);
  console.log(`Seeded ${SEED_STATES.length} states`);

  await storage.seedRaces(SEED_RACES);
  console.log(`Seeded ${SEED_RACES.length} races`);

  await storage.seedRoutes(SEED_ROUTES);
  console.log(`Seeded ${SEED_ROUTES.length} routes`);

  console.log("Database seeding complete.");
}
