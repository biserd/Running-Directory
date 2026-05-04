/**
 * Curate a "Top US Races" list and refresh the marquee races already in the
 * database to their next edition's verified date.
 *
 * Why: the regular ingest is RunSignUp-driven, so World Marathon Majors and
 * other signature events never get refreshed (NYC, Boston, Chicago, etc.
 * register through their own platforms). The /best/top-us-races page reads
 * `is_featured = true`, so this script is the single source of truth for
 * which races appear there.
 *
 * Idempotent: every row is upserted by slug. Re-run any time the calendar
 * advances or the list changes.
 *
 * Usage: `tsx script/seed-top-races.ts`
 */
import { db } from "../server/db";
import { races } from "../shared/schema";
import { sql } from "drizzle-orm";

type Top = {
  slug: string;
  name: string;
  date: string;
  city: string;
  state: string;
  distance: string;
  surface?: string;
  elevation?: string;
  website?: string;
  fieldSize?: number;
  description?: string;
};

// Verified next-edition dates for marquee US races (2026 season unless noted).
// Source: each event's official site; stored as text dates in the existing
// schema. Update annually.
const TOP_RACES: Top[] = [
  // ---- World Marathon Majors (US) ----
  { slug: "boston-marathon", name: "Boston Marathon", date: "2026-04-20", city: "Boston", state: "MA", distance: "Marathon", website: "https://www.baa.org/races/boston-marathon", fieldSize: 30000, description: "The world's oldest annual marathon, run point-to-point from Hopkinton to Boylston Street on Patriots' Day. Entry by qualification or charity bib." },
  { slug: "chicago-marathon", name: "Bank of America Chicago Marathon", date: "2026-10-11", city: "Chicago", state: "IL", distance: "Marathon", website: "https://www.chicagomarathon.com/", fieldSize: 50000, description: "Flat, fast, and famously PR-friendly. One of the largest marathons in the world with a lottery-based entry." },
  { slug: "nyc-marathon", name: "TCS New York City Marathon", date: "2026-11-01", city: "New York", state: "NY", distance: "Marathon", website: "https://www.nyrr.org/tcsnycmarathon", fieldSize: 55000, description: "A tour through all five boroughs, finishing in Central Park. The largest marathon in the world." },

  // ---- Other top US marathons ----
  { slug: "marine-corps-marathon", name: "Marine Corps Marathon", date: "2026-10-25", city: "Arlington", state: "VA", distance: "Marathon", website: "https://www.marinemarathon.com/", fieldSize: 30000, description: "\"The People's Marathon\" through the monuments of D.C. — no prize money, organized by the U.S. Marine Corps." },
  { slug: "honolulu-marathon", name: "Honolulu Marathon", date: "2026-12-13", city: "Honolulu", state: "HI", distance: "Marathon", website: "https://www.honolulumarathon.org/", fieldSize: 25000, description: "No qualifying time, no field-size cap. Pre-dawn fireworks start with a Diamond Head finish." },
  { slug: "big-sur-marathon", name: "Big Sur International Marathon", date: "2026-04-26", city: "Big Sur", state: "CA", distance: "Marathon", website: "https://www.bigsurmarathon.org/", fieldSize: 4500, description: "Point-to-point along Highway 1 on the California coast — widely considered the most scenic marathon in the U.S." },
  { slug: "twin-cities-marathon", name: "Medtronic Twin Cities Marathon", date: "2026-10-04", city: "Minneapolis", state: "MN", distance: "Marathon", website: "https://www.tcmevents.org/", fieldSize: 11000, description: "Lakeside route from Minneapolis to St. Paul during peak fall color. Boston qualifier." },
  { slug: "los-angeles-marathon", name: "Los Angeles Marathon", date: "2026-03-15", city: "Los Angeles", state: "CA", distance: "Marathon", website: "https://www.lamarathon.com/", fieldSize: 25000, description: "\"Stadium to the Sea\" — Dodger Stadium to the Pacific, passing Hollywood, Beverly Hills, and Rodeo Drive." },
  { slug: "houston-marathon", name: "Chevron Houston Marathon", date: "2026-01-18", city: "Houston", state: "TX", distance: "Marathon", website: "https://www.chevronhoustonmarathon.com/", fieldSize: 27000, description: "Lottery-entry, USATF-certified flat course. Doubles as the U.S. Marathon Trials qualifying race." },
  { slug: "grandmas-marathon", name: "Grandma's Marathon", date: "2026-06-20", city: "Duluth", state: "MN", distance: "Marathon", website: "https://www.grandmasmarathon.com/", fieldSize: 9500, description: "Point-to-point along Lake Superior's North Shore. Cool June mornings, fast course." },
  { slug: "philadelphia-marathon", name: "Dietz & Watson Philadelphia Marathon", date: "2026-11-22", city: "Philadelphia", state: "PA", distance: "Marathon", website: "https://www.philadelphiamarathon.com/", fieldSize: 12000, description: "Flat tour of historic Philly — Independence Hall, the Art Museum, Boathouse Row." },
  { slug: "pittsburgh-marathon", name: "DICK'S Sporting Goods Pittsburgh Marathon", date: "2026-05-03", city: "Pittsburgh", state: "PA", distance: "Marathon", website: "https://www.thepittsburghmarathon.com/", fieldSize: 30000, description: "Through 6 of Pittsburgh's neighborhoods, crossing 5 of its bridges." },
  { slug: "st-george-marathon", name: "St. George Marathon", date: "2026-10-03", city: "St. George", state: "UT", distance: "Marathon", website: "https://www.stgeorgemarathon.com/", fieldSize: 7000, description: "Net-downhill through southern Utah's red-rock country — one of the fastest BQ courses in the country." },
  { slug: "cim-marathon", name: "California International Marathon", date: "2026-12-06", city: "Sacramento", state: "CA", distance: "Marathon", website: "https://runsra.org/cim/", fieldSize: 10000, description: "Net-downhill point-to-point ending at the State Capitol. Hosts the U.S. Olympic Marathon Trials." },
  { slug: "san-francisco-marathon", name: "San Francisco Marathon", date: "2026-07-26", city: "San Francisco", state: "CA", distance: "Marathon", website: "https://www.thesfmarathon.com/", fieldSize: 27500, description: "Crosses the Golden Gate Bridge in both directions. Hilly, scenic, and unforgettable." },
  { slug: "wdw-marathon", name: "Walt Disney World Marathon", date: "2027-01-10", city: "Orlando", state: "FL", distance: "Marathon", website: "https://www.rundisney.com/", fieldSize: 20000, description: "Tours all four Disney parks. Part of the Dopey Challenge weekend." },
  { slug: "rocknroll-las-vegas-marathon", name: "Rock 'n' Roll Las Vegas Marathon", date: "2026-02-22", city: "Las Vegas", state: "NV", distance: "Marathon", website: "https://www.runrocknroll.com/las-vegas", fieldSize: 35000, description: "The only night race down the Strip — Vegas closes the Boulevard end-to-end." },
  { slug: "richmond-marathon", name: "Allianz Partners Richmond Marathon", date: "2026-11-14", city: "Richmond", state: "VA", distance: "Marathon", website: "https://www.richmondmarathon.org/", fieldSize: 17000, description: "\"America's Friendliest Marathon\" — flat, scenic, and known for an oyster aid station." },
  { slug: "indianapolis-monumental-marathon", name: "CNO Financial Indianapolis Monumental Marathon", date: "2026-11-07", city: "Indianapolis", state: "IN", distance: "Marathon", website: "https://www.monumentalmarathon.com/", fieldSize: 20000, description: "One of the flattest, fastest BQ courses in the Midwest." },
  { slug: "jacksonville-marathon", name: "First Place Sports Jacksonville Marathon", date: "2026-12-13", city: "Jacksonville", state: "FL", distance: "Marathon", website: "https://1stplacesports.com/jacksonville-marathon/", fieldSize: 1500, description: "Cool December weather, fast loop course — popular for late-season BQ attempts." },

  // ---- Iconic half marathons ----
  { slug: "united-airlines-nyc-half", name: "United Airlines NYC Half", date: "2026-03-15", city: "New York", state: "NY", distance: "Half Marathon", website: "https://www.nyrr.org/uahalf", fieldSize: 25000, description: "From Brooklyn over the Manhattan Bridge to Times Square and Central Park. Lottery entry." },
  { slug: "rbc-brooklyn-half", name: "RBC Brooklyn Half", date: "2026-05-16", city: "Brooklyn", state: "NY", distance: "Half Marathon", website: "https://www.nyrr.org/brooklynhalf", fieldSize: 27000, description: "The largest half marathon in the U.S. — Prospect Park to the Coney Island boardwalk." },
  { slug: "philly-half-marathon", name: "Dietz & Watson Philadelphia Half Marathon", date: "2026-11-21", city: "Philadelphia", state: "PA", distance: "Half Marathon", website: "https://www.philadelphiamarathon.com/", fieldSize: 15000, description: "The Saturday companion to the Philly Marathon — same fast, flat scenery." },
  { slug: "rocknroll-san-diego-half", name: "Rock 'n' Roll San Diego Half Marathon", date: "2026-05-31", city: "San Diego", state: "CA", distance: "Half Marathon", website: "https://www.runrocknroll.com/san-diego", fieldSize: 22000, description: "The original Rock 'n' Roll race — 26 stages of live music along Mission Bay and downtown." },
  { slug: "napa-to-sonoma-half", name: "Napa-to-Sonoma Wine Country Half Marathon", date: "2026-07-19", city: "Napa", state: "CA", distance: "Half Marathon", website: "https://www.napatosonoma.com/", fieldSize: 5000, description: "Through the vineyards of California wine country, finishing with a wine festival in Sonoma Plaza." },
  { slug: "rocknroll-vegas-half", name: "Rock 'n' Roll Las Vegas Half Marathon", date: "2026-02-22", city: "Las Vegas", state: "NV", distance: "Half Marathon", website: "https://www.runrocknroll.com/las-vegas", fieldSize: 30000, description: "Strip at Night half — companion to the full marathon." },
  { slug: "miami-half-marathon", name: "Life Time Miami Half Marathon", date: "2027-01-31", city: "Miami", state: "FL", distance: "Half Marathon", website: "https://lifetimemiamimarathon.com/", fieldSize: 20000, description: "Sunrise start across the MacArthur Causeway with the Miami skyline lighting up behind you." },
  { slug: "rocknroll-savannah-half", name: "Rock 'n' Roll Savannah Half Marathon", date: "2026-11-07", city: "Savannah", state: "GA", distance: "Half Marathon", website: "https://www.runrocknroll.com/savannah", fieldSize: 18000, description: "Through Savannah's historic squares with live music and Spanish moss overhead." },
  { slug: "broad-street-run", name: "Independence Blue Cross Broad Street Run", date: "2026-05-03", city: "Philadelphia", state: "PA", distance: "Other", website: "https://www.broadstreetrun.com/", fieldSize: 40000, description: "10 miles, all downhill, straight down Broad Street. America's largest 10-miler — lottery entry." },
  { slug: "cherry-blossom-10-mile", name: "Credit Union Cherry Blossom 10 Mile", date: "2026-04-05", city: "Washington", state: "DC", distance: "Other", website: "https://www.cherryblossom.org/", fieldSize: 17500, description: "\"The Runner's Rite of Spring\" — past the Tidal Basin's blossoms when they peak." },

  // ---- Iconic 10Ks ----
  { slug: "peachtree-road-race", name: "AJC Peachtree Road Race", date: "2026-07-04", city: "Atlanta", state: "GA", distance: "10K", website: "https://www.atlantatrackclub.org/peachtree", fieldSize: 60000, description: "The world's largest 10K — 60,000 runners through Atlanta on the Fourth of July." },
  { slug: "bay-to-breakers", name: "Zappos Bay to Breakers 12K", date: "2026-05-17", city: "San Francisco", state: "CA", distance: "Other", website: "https://www.baytobreakers.com/", fieldSize: 50000, description: "12K from the Bay to the Pacific — costumes, floats, and the Hayes Street Hill. Running since 1912." },
  { slug: "bolder-boulder", name: "BOLDER BOULDER 10K", date: "2026-05-25", city: "Boulder", state: "CO", distance: "10K", website: "https://www.bolderboulder.com/", fieldSize: 45000, description: "Memorial Day citizens' 10K finishing on the field at CU's Folsom Field." },
  { slug: "bloomsday-12k", name: "Lilac Bloomsday Run", date: "2026-05-03", city: "Spokane", state: "WA", distance: "Other", website: "https://www.bloomsdayrun.org/", fieldSize: 40000, description: "12K through Spokane in early May — \"Doomsday Hill\" and a finisher's t-shirt every year since 1977." },
  { slug: "crescent-city-classic", name: "Allstate Sugar Bowl Crescent City Classic 10K", date: "2026-04-04", city: "New Orleans", state: "LA", distance: "10K", website: "https://www.ccc10k.com/", fieldSize: 20000, description: "From the French Quarter to City Park on the Saturday before Easter. Famously festive finish-line party." },
  { slug: "cooper-river-bridge-run", name: "Cooper River Bridge Run", date: "2026-04-04", city: "Charleston", state: "SC", distance: "10K", website: "https://www.bridgerun.com/", fieldSize: 35000, description: "Across the Arthur Ravenel Jr. Bridge from Mt. Pleasant into downtown Charleston." },
  { slug: "falmouth-road-race", name: "ASICS Falmouth Road Race", date: "2026-08-16", city: "Falmouth", state: "MA", distance: "Other", website: "https://falmouthroadrace.com/", fieldSize: 12000, description: "7-mile coastal course on Cape Cod with a global elite field. Lottery entry." },
  { slug: "manchester-road-race", name: "Manchester Road Race", date: "2026-11-26", city: "Manchester", state: "CT", distance: "Other", website: "https://manchesterroadrace.com/", fieldSize: 14000, description: "Thanksgiving morning 4.748-mile classic — running since 1927." },

  // ---- Iconic 5Ks ----
  { slug: "turkey-trot-dallas-ymca", name: "Dallas YMCA Turkey Trot", date: "2026-11-26", city: "Dallas", state: "TX", distance: "5K", website: "https://www.ymcadallas.org/turkey-trot", fieldSize: 35000, description: "One of the largest Turkey Trots in the country — 8-Mile and 5K options through downtown Dallas." },
  { slug: "san-jose-turkey-trot", name: "Applied Materials Silicon Valley Turkey Trot", date: "2026-11-26", city: "San Jose", state: "CA", distance: "5K", website: "https://svturkeytrot.com/", fieldSize: 25000, description: "America's largest Turkey Trot by attendance — 5K and 10K options downtown." },
  { slug: "shamrock-shuffle-chicago", name: "Bank of America Shamrock Shuffle 8K", date: "2026-03-22", city: "Chicago", state: "IL", distance: "Other", website: "https://www.shamrockshuffle.com/", fieldSize: 30000, description: "Chicago's spring kickoff race — 8K through the Loop with a post-race party in Grant Park." },
  { slug: "race-for-the-cure-dc", name: "Susan G. Komen Race for the Cure (DC)", date: "2026-09-13", city: "Washington", state: "DC", distance: "5K", website: "https://www.komen.org/race-for-the-cure/", fieldSize: 25000, description: "The flagship Race for the Cure — 5K and 1-mile through the National Mall." },

  // ---- Bucket-list trail / ultra ----
  { slug: "western-states-100", name: "Western States Endurance Run", date: "2026-06-27", city: "Olympic Valley", state: "CA", distance: "Ultra", surface: "Trail", website: "https://www.wser.org/", fieldSize: 369, description: "100 miles from Squaw Valley to Auburn — the world's oldest 100-mile trail race. Lottery entry, 30-hour cutoff." },
  { slug: "leadville-100", name: "Leadville Trail 100 Run", date: "2026-08-15", city: "Leadville", state: "CO", distance: "Ultra", surface: "Trail", website: "https://www.leadvilleraceseries.com/run/leadvilletrail100run/", fieldSize: 700, description: "\"The Race Across the Sky\" — 100 miles at 10,000+ feet through the Colorado Rockies." },
  { slug: "jfk-50-mile", name: "JFK 50 Mile", date: "2026-11-21", city: "Boonsboro", state: "MD", distance: "Ultra", surface: "Trail", website: "https://www.jfk50mile.org/", fieldSize: 1000, description: "America's oldest ultramarathon — 50 miles on the Appalachian Trail and C&O Canal towpath." },
];

async function upsert(t: Top) {
  const surface = t.surface ?? "Road";
  const elevation = t.elevation ?? "Rolling";
  await db.execute(sql`
    INSERT INTO races (
      slug, name, date, city, state, distance, surface, elevation,
      description, website, field_size, is_featured, is_active
    ) VALUES (
      ${t.slug}, ${t.name}, ${t.date}, ${t.city}, ${t.state}, ${t.distance},
      ${surface}, ${elevation},
      ${t.description ?? null}, ${t.website ?? null}, ${t.fieldSize ?? null},
      true, true
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      date = EXCLUDED.date,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      distance = EXCLUDED.distance,
      surface = EXCLUDED.surface,
      elevation = EXCLUDED.elevation,
      description = COALESCE(EXCLUDED.description, races.description),
      website = COALESCE(EXCLUDED.website, races.website),
      field_size = COALESCE(EXCLUDED.field_size, races.field_size),
      is_featured = true,
      is_active = true
  `);
}

async function main() {
  console.log(`[top-races] upserting ${TOP_RACES.length} curated races…`);
  let n = 0;
  for (const t of TOP_RACES) {
    await upsert(t);
    n++;
    if (n % 10 === 0) console.log(`  ${n}/${TOP_RACES.length}`);
  }
  console.log(`[top-races] done — ${n} races upserted, all marked is_featured=true.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[top-races] fatal:", err);
  process.exit(1);
});
