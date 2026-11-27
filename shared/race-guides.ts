import { getStateCentroid, US_STATES } from "./states";

export const RACE_GUIDE_YEAR = 2027;
export const RACE_GUIDES_HREF = `/race-guides/${RACE_GUIDE_YEAR}`;

interface GuidePick {
  slug: string;
  title: string;
  label: string;
  reason: string;
  city: string;
  center: [number, number];
  entries: readonly string[];
}

export interface RaceGuide {
  slug: string;
  state: string;
  name: string;
  description: string;
  intro: string;
  advice: string;
  faqs: readonly { question: string; answer: string }[];
  picks: readonly GuidePick[];
}

export interface GuideRace {
  slug: string;
  name: string;
  city: string;
  distance: string;
  surface: string;
  coordinates?: [number, number];
  date: string;
  source: string;
  checkedDate?: string;
  venue?: string;
  startTime?: string;
  entries: { name: string; distance?: string; date: string; fee?: number; startTime?: string }[];
}

// City and borough reference points are from the 2025 U.S. Census Gazetteer.
export const FEATURED_RACE_GUIDES: readonly RaceGuide[] = [
  {
    slug: "new-york", state: "NY", name: "New York",
    description: "Compare 2027 New York race entry fees, dates and distances in Brooklyn, Rochester, Lake Placid and Syracuse. Browse the map and organizer links.",
    intro: "Start with the distance you want, then decide how far you want to travel. These four picks cover a Brooklyn winter ultra, a Rochester spring weekend, a June trip to the Adirondacks and a fall marathon weekend in Syracuse.",
    advice: "For an upstate race, price the whole weekend before registering. Lake Placid and Syracuse both offer a full marathon, with shorter options for friends or family. If you want a lower entry fee without committing to a long training block, compare Rochester’s 5K with Syracuse’s 5K. Brooklyn’s basic 50K entry is a separate choice for runners already prepared for the distance.",
    faqs: [
      { question: "Which New York races offer a 5K and a half marathon on the same weekend?", answer: "Flower City in Rochester and Loop the Lake in Syracuse both list a 5K and a half marathon. Check both days of the schedule before booking. Syracuse lists its 5K and 10K on Saturday and the half and full marathon on Sunday." },
      { question: "Which New York race should I choose for an Adirondack weekend?", answer: "Lake Placid offers a marathon, half marathon and 10K. Choose the distance before comparing registration costs and check the organizer’s course and race-morning logistics separately." },
    ],
    picks: [
      { slug: "the-ted-corbitt-50k-brooklyn-ny", title: "Ted Corbitt 50K", label: "Budget ultra", city: "Brooklyn", center: [40.635, -73.9506], entries: ["Ted Corbitt 50K - In Person Basic Registration (No Shirt & No Medal)"], reason: "Compare the basic in-person entry with the shirt and medal packages. It’s the most relevant option here for an experienced ultra runner watching the entry fee." },
      { slug: "rochester-regional-health-flower-city-challenge-rochester-ny", title: "Flower City Challenge", label: "Spring weekend", city: "Rochester", center: [43.1699, -77.6169], entries: ["Flower City Family 5K", "Rochester Regional Health Flower City Half Marathon"], reason: "The separate 5K and half marathon entries make this a good spring option for a group with different training goals. When comparing the 5K with the half, check the start times as well as the fees so the group can plan where to meet." },
      { slug: "lake-placid-marathon-and-half-and-10k-lake-placid-ny", title: "Lake Placid Marathon, Half & 10K", label: "Adirondack trip", city: "Lake Placid", center: [44.2842, -73.9864], entries: ["10K:", "1/2 Marathon:", "Marathon:"], reason: "Three distances make it easy to plan one weekend together. Compare the 10K and half before paying for a full marathon entry if the trip is the main draw." },
      { slug: "loop-the-lake-the-great-new-york-state-marathon-weekend-syracuse-ny", title: "Loop the Lake", label: "Fall goal race", city: "Syracuse", center: [43.041, -76.1436], entries: ["5K Race", "10K Race", "Half Marathon", "Great New York State Marathon"], reason: "Plan around the two-day schedule. The 5K and 10K are Saturday and the half and full marathon are Sunday. Compare the standalone entry for your distance before looking at the challenge packages." },
    ],
  },
  {
    slug: "florida", state: "FL", name: "Florida",
    description: "Compare 2027 Florida race fees and dates from Pensacola Beach and Celebration to Marco Island and Clewiston, with a map and official registration links.",
    intro: "A Florida race weekend can mean the Panhandle, an Orlando-area marathon or a South Florida 5K. These picks cover four different places to stay and let you compare the price of a short race with a half or full marathon.",
    advice: "Choose the part of Florida you actually want to visit before comparing fees. Pensacola Beach and Marco Island are separate trips. Celebration is the full-marathon option in this shortlist, while Clewiston is worth comparing with Marco Island if you want a lower-cost South Florida entry. Check venue and parking instructions before choosing accommodation.",
    faqs: [
      { question: "Which Florida races should I compare for a 10K?", answer: "Start with Pensacola Beach and the Country Music race in Clewiston. Both list a standalone 10K alongside a half marathon, so you can compare the same distance and account for where you’ll stay." },
      { question: "Which of these Florida races offers a full marathon?", answer: "The Town of Celebration race lists both a full and half marathon. Pensacola Beach, Marco Island and Clewiston offer shorter choices in this guide." },
    ],
    picks: [
      { slug: "pensacola-beach-run-half-marathon-gulf-breeze-fl", title: "Pensacola Beach Run", label: "Panhandle race", city: "Gulf Breeze / Pensacola Beach", center: [30.3683, -87.1734], entries: ["5k", "10K", "1/2 Marathon"], reason: "Three distances share a beach race weekend. Use Casino Beach for race-morning directions. The organizer lists race-day packet pickup there and says there is no late registration on race day." },
      { slug: "town-of-celebration-marathon-half-marathon-celebration-fl", title: "Town of Celebration Marathon", label: "Central Florida marathon", city: "Celebration", center: [28.3103, -81.5511], entries: ["1/2 Marathon", "Marathon"], reason: "The full-distance option in this guide, with a separate half marathon entry for runners who want the same destination and a shorter race." },
      { slug: "marco-island-half-marathon-and-5k-marco-island-fl", title: "Marco Island Half Marathon & 5K", label: "Gulf Coast half", city: "Marco Island", center: [25.932, -81.7048], entries: ["5K", "Half Marathon"], reason: "The half crosses Goodland Bridge and has a published three-hour time limit. The organizer lists separate 5K and half starts and marks the permit as pending. Check that status before booking nonrefundable travel." },
      { slug: "country-music-half-marathon-5k-10k-clewiston-fl", title: "Country Music Half Marathon, 10K & 5K", label: "South Florida value", city: "Clewiston", center: [26.7528, -80.9392], entries: ["5K RUN", "10K RUN", "Half Marathon"], reason: "The races are part of the Clewiston Sugar Festival. Compare the standalone 5K, 10K, and half entries, then check the festival schedule if the trip includes spectators." },
    ],
  },
  {
    slug: "texas", state: "TX", name: "Texas",
    description: "Compare 2027 Texas running race prices from Dallas and Houston 5Ks and 10Ks to Big Bend trail races and the El Paso Marathon.",
    intro: "Texas has enough distance between race cities to make location part of the budget. Choose between a Dallas club race, a Houston 10K, a West Texas trail trip and a dedicated marathon weekend in El Paso.",
    advice: "For a short race, compare Dallas and Houston before making a cross-state drive. For West Texas, decide whether you want trail mileage in Terlingua or a road marathon in El Paso. The same advertised distance can be a very different commitment once you include the surface, travel and time on your feet.",
    faqs: [
      { question: "Which Texas races have both a 5K and a 10K?", answer: "Dallas Running Club’s Frigid and Houston’s Bayou City Classic both list those two distances. Compare the entry fee rows for the distance you plan to run." },
      { question: "Where can I find a West Texas trail race or marathon?", answer: "Big Bend Ultra in Terlingua is the trail pick. El Paso offers a road marathon, a half marathon and a 5K. Compare the organizer’s course details before treating the two weekends as interchangeable." },
    ],
    picks: [
      { slug: "drcs-frigid-5k-10k-dallas-tx", title: "Dallas Running Club’s Frigid 5K & 10K", label: "North Texas value", city: "Dallas", center: [32.7933, -96.7665], entries: ["DRC's Frigid 5K", "DRC's Frigid 10K"], reason: "Compare the club’s two standard entries directly. It’s a practical short-distance start to the year if you’re based in North Texas." },
      { slug: "bayou-city-classic-10k-5k-fun-run-houston-tx", title: "Bayou City Classic", label: "Houston 10K", city: "Houston", center: [29.7857, -95.3888], entries: ["5K", "10K"], reason: "A Houston option with separate 5K and 10K entries. Keep it on the shortlist if you want a short spring race without a long trip from the Gulf Coast." },
      { slug: "big-bend-ultra-terlingua-tx", title: "Big Bend Ultra", label: "West Texas trails", city: "Terlingua", center: [29.2871, -103.5834], entries: ["10k", "20k", "35k"], reason: "The organizer lists multiple trail distances. Start with the course and support information, then compare those tiers with the road entries elsewhere in this guide." },
      { slug: "michelob-ultra-el-paso-marathon-raiz-federal-credit-union-half-marathon-and-spin", title: "El Paso Marathon", label: "Road marathon", city: "El Paso", center: [31.8478, -106.4311], entries: ["Spine & Rehab Specialists 5K Run/Walk", "Raiz Federal Credit Union Half Marathon", "Michelob Ultra El Paso Marathon"], reason: "The full marathon, half and 5K have separate adult fees. The organizer also offers a separately priced kids’ dash for families planning the weekend." },
    ],
  },
  {
    slug: "mississippi", state: "MS", name: "Mississippi",
    description: "Compare 2027 Mississippi race dates and adult fees in Jackson, Biloxi, Hattiesburg and Lucedale. Find 5Ks, half marathons and the Mississippi Blues Marathon.",
    intro: "Compare a Jackson marathon weekend, a Gulf Coast race, a Hattiesburg half and a local-cost 5K in Lucedale. Mississippi’s shortlist is small enough to price a few realistic weekends side by side.",
    advice: "If you’re building a spring calendar, check the dates in Biloxi and Hattiesburg before entering both. The bridge 5K or 10K and the Hattiesburg half can serve very different goals. Compare Lucedale with the Jackson 5K if the fee matters more than the festival distance options.",
    faqs: [
      { question: "Which Mississippi race offers a marathon and shorter distances?", answer: "Mississippi Blues in Jackson lists a marathon, half marathon, 10K and 5K. The separate kids’ event and relay have their own prices. Use the adult fee table for a comparable baseline." },
      { question: "Should I choose Biloxi or Hattiesburg for a spring race?", answer: "Choose the Casino Bridge Run for a coastal 5K or 10K. Hattiesburg is the shortlist option if you want a spring half marathon with shorter distances available on the same weekend." },
    ],
    picks: [
      { slug: "mississippi-blues-marathon-half-10k-5k-jackson-ms", title: "Mississippi Blues Marathon", label: "Capital-city weekend", city: "Jackson", center: [32.3158, -90.2129], entries: ["5K", "Quarter Note Marathon (10K)", "MS Blues Half Marathon", "MS Blues Marathon"], reason: "Four adult distances make this the most flexible event in the shortlist for a group. Use the named distance price to compare the marathon with the half or 10K." },
      { slug: "casino-bridge-run-10k-5k-run-competitive-walk-biloxi-ms", title: "Casino Bridge Run", label: "Gulf Coast short race", city: "Biloxi", center: [30.4267, -88.9358], entries: ["5k Run", "10K Run"], reason: "Separate running entries make the 5K and 10K straightforward to compare. Check organizer information for the start and bridge crossing before planning race-day travel." },
      { slug: "hattiesburg-half-marathon-10k-and-5k-hattiesburg-ms", title: "Hattiesburg Half Marathon, 10K & 5K", label: "Spring half", city: "Hattiesburg", center: [31.3073, -89.3174], entries: ["Hattiesburg 5K", "Hattiesburg 10K", "Hattiesburg Half Marathon"], reason: "A spring option with three standard adult entries. Compare the 10K with Biloxi’s 10K if you’re choosing a distance before choosing the city." },
      { slug: "pamela-mcdonald-balanced-life-memorial-5k-1-mile-fun-r-lucedale-ms", title: "Pamela McDonald Balanced Life Memorial 5K", label: "Local 5K value", city: "Lucedale", center: [30.9312, -88.5959], entries: ["Pamela McDonald Balanced Life Memorial 5K (Run/Walk)"], reason: "A standalone 5K entry with a separate one-mile fun run. The 5K fee is the useful figure to compare with Jackson, Biloxi and Hattiesburg." },
    ],
  },
];

export const RACE_GUIDES: readonly RaceGuide[] = US_STATES.map(({ code, name, slug }) =>
  FEATURED_RACE_GUIDES.find(guide => guide.state === code) ?? {
    state: code, name, slug,
    description: `Plan a ${RACE_GUIDE_YEAR} race in ${name}. Compare upcoming running events by city, date, distance and published entry fee, and explore the state race map.`,
    intro: `Compare upcoming ${name} races by city, distance and date. Use the map to see which starts are close together and check the organizer’s entry terms before booking your trip.`,
    advice: "",
    faqs: [],
    picks: [],
  },
);

export function raceGuideHeadline(guide: RaceGuide) {
  return guide.picks.length
    ? `Best ${guide.name} running races in ${RACE_GUIDE_YEAR}`
    : `${RACE_GUIDE_YEAR} ${guide.name} running race guide`;
}

export function relatedRaceGuides(guide: RaceGuide) {
  const origin = getStateCentroid(guide.state)!;
  const longitudeScale = Math.cos(origin.lat * Math.PI / 180);
  return RACE_GUIDES.filter(candidate => candidate.state !== guide.state)
    .map(candidate => {
      const center = getStateCentroid(candidate.state)!;
      const distance = Math.hypot(center.lat - origin.lat, (center.lng - origin.lng) * longitudeScale);
      return { candidate, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4)
    .map(({ candidate }) => candidate);
}

export function getRaceGuide(slug?: string) {
  return RACE_GUIDES.find(guide => guide.slug === slug);
}

export function raceGuideHref(slug: string) {
  return `${RACE_GUIDES_HREF}/${slug}`;
}

export function raceGuideMapHref(state?: string) {
  return `/map?${state ? `state=${encodeURIComponent(state)}&` : ""}year=${RACE_GUIDE_YEAR}`;
}

export function canIndexRaceGuide(guide: RaceGuide, races: GuideRace[]) {
  const cities = new Set(races.map(race => race.city.trim().toLowerCase()));
  const priced = races.filter(race => race.entries.some(entry => entry.fee != null));
  const picks = new Set(guide.picks.map(pick => pick.slug));
  if (priced.filter(race => picks.has(race.slug)).length >= 3 && cities.size >= 3) return true;
  const months = new Set(races.map(race => race.date.slice(0, 7)));
  const documented = races.filter(race => race.venue || race.startTime || race.entries.some(entry => entry.fee != null));
  return races.length >= 5 && cities.size >= 3 && months.size >= 2 && documented.length >= 3;
}
