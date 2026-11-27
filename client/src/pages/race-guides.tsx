import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Mail, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { RaceAreaMap } from "@/components/race-area-map";
import { useAuth } from "@/hooks/use-auth";
import { setPendingAction } from "@/lib/pending-action";
import { apiSubscribeToRaceGuide } from "@/lib/api";
import { trackLead } from "@/lib/analytics";
import { getRaceGuide, RACE_GUIDES, RACE_GUIDES_HREF, RACE_GUIDE_YEAR, raceGuideHeadline, raceGuideHref, raceGuideMapHref, relatedRaceGuides, type GuideRace, type RaceGuide } from "@shared/race-guides";
import { raceDateLabel, stateRaceCalendarHref } from "@shared/race-program";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2, minimumFractionDigits: 0 });

function GuideLinks({ guides = RACE_GUIDES }: { guides?: readonly RaceGuide[] }) {
  return <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
    {guides.map(guide => (
      <li key={guide.slug}><Link href={raceGuideHref(guide.slug)} className="flex items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 font-medium hover:border-primary">
        {guide.name} race guide <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link></li>
    ))}
  </ul>;
}

function RaceGuideSignup({ guide }: { guide: RaceGuide }) {
  const { user, openLogin } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");

  async function subscribe() {
    if (!user) {
      setPendingAction({ type: "race-guide-alert", slug: guide.slug });
      openLogin();
      return;
    }
    setStatus("loading");
    try {
      const { subscribed } = await apiSubscribeToRaceGuide(guide.slug);
      if (subscribed) trackLead("race_guide_alert");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  if (new Date().getUTCFullYear() > RACE_GUIDE_YEAR) return null;
  return (
    <section id="race-updates" className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <h2 className="font-heading text-xl font-bold">Get {guide.name} race updates</h2>
        <p className="mt-1 text-sm text-muted-foreground">Get a weekly email with upcoming {RACE_GUIDE_YEAR} races in {guide.name}. Manage your subscription in Alerts.</p>
        {status === "error" && <p className="mt-2 text-sm text-destructive" role="alert">Couldn’t save your alerts. Please try again.</p>}
        {status === "saved" && <p className="mt-2 text-sm font-medium" role="status">You’re subscribed. <Link href="/alerts" className="underline">Manage alerts</Link></p>}
      </div>
      <Button onClick={subscribe} disabled={status === "saved" || status === "loading"} data-testid="guide-email-cta">
        <Mail className="mr-2 h-4 w-4" />{status === "loading" ? "Saving…" : status === "saved" ? "Subscribed" : "Email me race updates"}
      </Button>
    </section>
  );
}

export function RaceGuidesIndex() {
  return <Layout>
    <article className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <Breadcrumbs items={[{ label: `${RACE_GUIDE_YEAR} race guides` }]} />
      <header className="max-w-3xl">
        <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">{RACE_GUIDE_YEAR} running race guides by state</h1>
        <p className="mt-4 text-lg text-muted-foreground">Choose from all 50 U.S. states. Compare upcoming races, distance options and published fees, and use the maps to plan where to run.</p>
      </header>
      <GuideLinks />
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Link href={raceGuideMapHref()} className="inline-flex items-center gap-2 font-medium text-primary underline"><MapPin className="h-4 w-4" aria-hidden="true" /> Explore the {RACE_GUIDE_YEAR} U.S. race map</Link>
        <a href="/tools#pace-calculator" className="inline-flex items-center gap-2 font-medium text-primary underline">Calculate your race pace <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
      </div>
    </article>
  </Layout>;
}

export function RaceGuidePage() {
  const { state } = useParams<{ state: string }>();
  const guide = getRaceGuide(state);
  const { data, isLoading, isError } = useQuery<GuideRace[]>({
    queryKey: ["/api/race-guides", state],
    queryFn: async () => {
      const response = await fetch(`/api/race-guides/${encodeURIComponent(state)}`);
      if (!response.ok) throw new Error("Couldn’t load the race guide");
      return response.json();
    },
    enabled: Boolean(guide),
  });
  const picks = useMemo(() => guide?.picks.flatMap(pick => {
    const race = data?.find(entry => entry.slug === pick.slug);
    return race ? [{ ...pick, race }] : [];
  }) ?? [], [data, guide]);
  const points = useMemo(() => data?.flatMap(race => {
    const pick = picks.find(entry => entry.slug === race.slug);
    const center = race.coordinates ?? pick?.center;
    return center ? [{ name: `${race.city} · ${race.name}`, lat: center[0], lng: center[1], href: `/races/${race.slug}` }] : [];
  }) ?? [], [data, picks]);
  if (!guide) return <Layout><div className="container mx-auto px-4 py-12"><h1 className="text-3xl font-bold">Race guide not found</h1><Link href={RACE_GUIDES_HREF} className="mt-4 inline-block underline">Browse {RACE_GUIDE_YEAR} race guides</Link></div></Layout>;

  const races = data ?? [];
  const furtherRaces = races.filter(race => !picks.some(pick => pick.slug === race.slug));
  const cityNames = [...new Set(races.map(race => race.city))];
  const months = [...new Set(races.map(race => race.date.slice(0, 7)))];
  const monthLabel = (month: string) => new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));
  const feeRaces = picks.length ? picks.map(pick => pick.race) : races;
  const prices = feeRaces.flatMap(race => race.entries.flatMap(entry => entry.fee == null ? [] : [{ race, entry, fee: entry.fee }]))
    .sort((a, b) => a.fee - b.fee);
  const lowest = prices[0];
  return <Layout>
    <article className="container mx-auto max-w-5xl space-y-9 px-4 py-8 sm:py-12">
      <Breadcrumbs items={[{ label: `${RACE_GUIDE_YEAR} race guides`, href: RACE_GUIDES_HREF }, { label: guide.name }]} />
      <header className="max-w-3xl">
        <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">{raceGuideHeadline(guide)}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{guide.intro}</p>
        {races.length > 0 && <p className="mt-4 text-sm font-medium">{races.length} race listings across {cityNames.length} {cityNames.length === 1 ? "city" : "cities"}.</p>}
        <nav aria-label="On this page" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-primary">
          <a href="#race-picks">Race picks</a>{prices.length > 0 && <a href="#entry-fees">Entry fees</a>}<a href="#race-map">Map</a><a href="#race-faq">FAQs</a>
        </nav>
      </header>

      <RaceGuideSignup key={guide.slug} guide={guide} />

      <section id="race-picks" className="scroll-mt-24 space-y-4">
        <h2 className="font-heading text-2xl font-bold">{picks.length ? "Which race fits your plans?" : `Upcoming ${guide.name} races in ${RACE_GUIDE_YEAR}`}</h2>
        {isLoading && <p className="text-muted-foreground">Loading the race shortlist…</p>}
        {isError && <p className="text-muted-foreground" role="status">The race details are temporarily unavailable. <Link className="underline" href={stateRaceCalendarHref(guide.state)}>Browse the state calendar</Link>.</p>}
        {picks.length > 0 && <div className="grid gap-4 sm:grid-cols-2">
          {picks.map(pick => <section key={pick.slug} className="rounded-xl border bg-card p-5">
            <p className="text-sm font-medium text-primary">{pick.label}</p>
            <h3 className="mt-2 font-heading text-xl font-bold"><Link href={`/races/${pick.slug}`} className="hover:underline">{pick.title}</Link></h3>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" aria-hidden="true" />{raceDateLabel(pick.race.date)} · {pick.city}</p>
            <p className="mt-3 leading-relaxed text-muted-foreground">{pick.reason}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium text-primary">
              <Link className="underline" href={`/races/${pick.slug}`}>Race schedule</Link>
              <a className="underline" href={pick.race.source} rel="noopener noreferrer">Official registration</a>
            </div>
          </section>)}
        </div>}
        {!isLoading && !isError && !races.length && <p className="text-muted-foreground">No races match this guide’s date and listing criteria yet. <Link className="font-medium text-primary underline" href={stateRaceCalendarHref(guide.state)}>Check the {guide.name} calendar</Link> or sign up for a race alert.</p>}
        {furtherRaces.length > 0 && <>
          {picks.length > 0 && <h3 className="font-heading text-xl font-bold">More {guide.name} races by month</h3>}
          {months.map(month => {
            const monthRaces = furtherRaces.filter(race => race.date.startsWith(month));
            if (!monthRaces.length) return null;
            return <section key={month} className="rounded-xl border p-4">
              <h4 className="font-heading text-lg font-bold">{monthLabel(month)}</h4>
              <ul className="mt-2 divide-y">
                {monthRaces.map(race => <li key={race.slug} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <div>
                    <Link href={`/races/${race.slug}`} className="font-semibold text-primary hover:underline">{race.name}</Link>
                    <p className="text-sm text-muted-foreground">{raceDateLabel(race.date)} · {race.city} · {race.distance}{race.surface && race.surface !== "Unknown" && ` · ${race.surface}`}{race.startTime && ` · ${race.startTime} local`}</p>
                  </div>
                  <a href={race.source} rel="noopener noreferrer" className="text-sm font-medium text-primary underline" aria-label={`Official registration for ${race.name}`}>Official registration</a>
                </li>)}
              </ul>
            </section>;
          })}
          <Link className="font-medium text-primary underline" href={stateRaceCalendarHref(guide.state)}>See the full {guide.name} race calendar</Link>
        </>}
      </section>

      {prices.length > 0 && <section id="entry-fees" className="scroll-mt-24 space-y-4">
        <h2 className="font-heading text-2xl font-bold">Compare {RACE_GUIDE_YEAR} entry fees</h2>
        <p className="max-w-3xl text-muted-foreground">These are organizer-listed base fees for selected adult entries. The table excludes kids’ races, relays, and upgrade packages. Processing, travel, and lodging can change the total. Check the organizer’s current price before registering.</p>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm" data-testid="guide-fee-table">
            <caption className="sr-only">{guide.name} race entry fee comparison</caption>
            <thead className="border-b bg-muted"><tr><th scope="col" className="p-3">Race</th><th scope="col" className="p-3">Distance</th><th scope="col" className="p-3">Race date</th><th scope="col" className="p-3">Base fee</th><th scope="col" className="p-3">Checked</th></tr></thead>
            <tbody>{prices.map(({ race, entry, fee }, index) => <tr key={`${race.slug}-${index}`} className="border-b last:border-b-0">
              <th scope="row" className="p-3 font-medium"><Link href={`/races/${race.slug}`} className="hover:underline">{race.name}</Link></th>
              <td className="p-3">{entry.distance || entry.name}</td><td className="p-3 whitespace-nowrap">{raceDateLabel(entry.date)}</td>
              <td className="p-3 font-semibold tabular-nums">{usd.format(fee)}</td><td className="p-3 whitespace-nowrap text-muted-foreground">{race.checkedDate ? raceDateLabel(race.checkedDate) : "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {picks.length === guide.picks.length && guide.advice && <p className="max-w-3xl leading-relaxed">{guide.advice}</p>}
      </section>}

      <section id="race-map" className="scroll-mt-24 space-y-4">
        <h2 className="font-heading text-2xl font-bold">Map of {guide.name} running races</h2>
        {cityNames.length > 0 && <p className="text-sm text-muted-foreground">Plan travel around {new Intl.ListFormat("en").format(cityNames.slice(0, 5))}{cityNames.length > 5 && " and other race cities"}. Check the race listing for its start and packet pickup locations.</p>}
        {points.length > 0 && <RaceAreaMap points={points} label={`${guide.name} race city map`} />}
        {picks.length > 0 && <ul className="grid gap-2 sm:grid-cols-2">{picks.map(pick => <li key={pick.slug} className="rounded-lg border p-3 text-sm">
          <Link href={`/races/${pick.slug}`} className="font-semibold text-primary hover:underline">{pick.city} · {pick.title}</Link>
          {pick.race.venue && <a className="mt-1 block text-muted-foreground underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pick.race.venue}, ${pick.race.city}, ${guide.state}`)}`}>
            {pick.race.venue}
          </a>}
        </li>)}</ul>}
        <Link href={raceGuideMapHref(guide.state)} className="inline-flex items-center gap-2 font-medium text-primary underline"><MapPin className="h-4 w-4" /> Open the {RACE_GUIDE_YEAR} {guide.name} race map</Link>
      </section>

      <section id="race-faq" className="scroll-mt-24 space-y-3">
        <h2 className="font-heading text-2xl font-bold">{guide.name} race FAQs</h2>
        {lowest && <details open className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">What is the lowest listed entry fee in this guide?</summary>
          <p className="mt-3 text-muted-foreground">{lowest.race.name} lists {lowest.entry.name} at {usd.format(lowest.fee)} before fees. Compare the same distance in the <a className="underline" href="#entry-fees">entry fee table</a> before choosing.</p>
        </details>}
        {races[0] && <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">What’s the next dated race in this {guide.name} guide?</summary>
          <p className="mt-3 text-muted-foreground"><Link className="underline" href={`/races/${races[0].slug}`}>{races[0].name}</Link> is listed for {raceDateLabel(races[0].date)} in {races[0].city}. Check its organizer page for registration availability.</p>
        </details>}
        {months.length > 1 && <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Which months have races in this guide?</summary>
          <p className="mt-3 text-muted-foreground">This guide currently lists races in {new Intl.ListFormat("en").format(months.map(monthLabel))}. The <Link className="underline" href={stateRaceCalendarHref(guide.state)}>state calendar</Link> has more listings and date filters.</p>
        </details>}
        {!races.length && <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Where can I find races in {guide.name} while the guide fills in?</summary>
          <p className="mt-3 text-muted-foreground">Use the <Link className="underline" href={stateRaceCalendarHref(guide.state)}>{guide.name} race calendar</Link> to browse dates and distances outside this shortlist. The state race map shows events with a published location.</p>
        </details>}
        {picks.length === guide.picks.length && guide.faqs.map(faq => <details key={faq.question} className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">{faq.question}</summary><p className="mt-3 text-muted-foreground">{faq.answer}</p></details>)}
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-bold">Race guides in nearby states</h2>
        <GuideLinks guides={relatedRaceGuides(guide)} />
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Link href={RACE_GUIDES_HREF} className="font-medium text-primary underline">Browse guides for all 50 states</Link>
          <Link href="/tools#pace-calculator" className="font-medium text-primary underline">Calculate your race pace</Link>
        </div>
      </section>
    </article>
  </Layout>;
}
