import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RaceScoreBadge } from "@/components/race-score-badge";
import { computeRaceScore } from "@shared/race-score";
import { apiGetRace } from "@/lib/api";
import { ArrowRight, Trophy } from "lucide-react";
import type { Race } from "@shared/schema";

function parseSlugs(combined: string | undefined): { a: string; b: string } | null {
  if (!combined) return null;
  const idx = combined.indexOf("-vs-");
  if (idx <= 0) return null;
  const a = combined.slice(0, idx);
  const b = combined.slice(idx + 4);
  if (!a || !b) return null;
  return { a, b };
}

function Row({ label, a, b }: { label: string; a: React.ReactNode; b: React.ReactNode }) {
  return (
    <tr className="border-b last:border-0">
      <td className="text-sm text-muted-foreground py-3 pr-4">{label}</td>
      <td className="py-3 pr-4 text-sm font-medium" data-testid={`vs-cell-a-${label.toLowerCase().replace(/\s+/g, "-")}`}>{a}</td>
      <td className="py-3 text-sm font-medium" data-testid={`vs-cell-b-${label.toLowerCase().replace(/\s+/g, "-")}`}>{b}</td>
    </tr>
  );
}

export default function RaceVsRacePage() {
  const params = useParams<{ slugs: string }>();
  const [, navigate] = useLocation();
  const parsed = parseSlugs(params.slugs);

  // Canonicalize: alphabetical order, single canonical URL.
  useEffect(() => {
    if (!parsed) return;
    const sorted = [parsed.a, parsed.b].slice().sort();
    if (sorted[0] !== parsed.a || sorted[1] !== parsed.b) {
      navigate(`/vs/${sorted[0]}-vs-${sorted[1]}`, { replace: true });
    }
  }, [parsed, navigate]);

  const { data: raceA, isLoading: loadingA } = useQuery<Race | null>({
    queryKey: ["/api/races", parsed?.a],
    queryFn: () => apiGetRace(parsed!.a),
    enabled: !!parsed,
  });
  const { data: raceB, isLoading: loadingB } = useQuery<Race | null>({
    queryKey: ["/api/races", parsed?.b],
    queryFn: () => apiGetRace(parsed!.b),
    enabled: !!parsed,
  });

  if (!parsed) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-heading font-bold mb-2">Pick two races to compare</h1>
          <p className="text-muted-foreground mb-6">URLs look like <code>/vs/race-a-slug-vs-race-b-slug</code>.</p>
          <Button asChild><Link href="/races">Browse races</Link></Button>
        </div>
      </Layout>
    );
  }

  if (loadingA || loadingB) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!raceA || !raceB) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-heading font-bold mb-2">One of those races wasn't found</h1>
          <p className="text-muted-foreground mb-6">Double-check the slugs in the URL.</p>
          <Button asChild><Link href="/races">Browse races</Link></Button>
        </div>
      </Layout>
    );
  }

  const scoreA = computeRaceScore(raceA as any);
  const scoreB = computeRaceScore(raceB as any);
  const winnerLabel = scoreA.score === scoreB.score
    ? "It's a tie on RaceScore — pick the one that matches your goal."
    : `${scoreA.score > scoreB.score ? raceA.name : raceB.name} edges it on overall RaceScore.`;

  const fmt = (v: unknown) => (v == null || v === "" ? <span className="text-muted-foreground italic">—</span> : String(v));
  const price = (r: Race) => {
    if (r.priceMin == null && r.priceMax == null) return "—";
    if (r.priceMin != null && r.priceMax != null && r.priceMin !== r.priceMax) return `$${r.priceMin}–$${r.priceMax}`;
    return `$${r.priceMin ?? r.priceMax}`;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 pt-6 pb-2">
        <Breadcrumbs items={[
          { label: "Races", href: "/races" },
          { label: "Compare" },
          { label: `${raceA.name} vs ${raceB.name}` },
        ]} />
      </div>
      <div className="container mx-auto px-4 pb-8 pt-2">
        <Badge variant="secondary" className="mb-3" data-testid="vs-eyebrow">
          <Trophy className="h-3.5 w-3.5 mr-1" /> Head-to-head
        </Badge>
        <h1 className="text-3xl md:text-5xl font-heading font-bold leading-tight mb-3" data-testid="vs-title">
          {raceA.name} <span className="text-muted-foreground font-normal">vs</span> {raceB.name}
        </h1>
        <p className="text-muted-foreground text-lg max-w-3xl" data-testid="vs-verdict">{winnerLabel}</p>
      </div>

      <div className="container mx-auto px-4 pb-12">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {[raceA, raceB].map((r, idx) => {
            const s = idx === 0 ? scoreA : scoreB;
            return (
              <Card key={r.slug} data-testid={`vs-card-${idx === 0 ? "a" : "b"}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/races/${r.slug}`} className="text-xl font-heading font-semibold hover:underline">
                        {r.name}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">{r.distance} • {r.city}, {r.state} • {r.date}</p>
                    </div>
                    <RaceScoreBadge size="md" race={r as any} testIdSuffix={r.slug} />
                  </div>
                  <p className="text-sm mt-3 text-muted-foreground">{s.headline}</p>
                  <div className="mt-4">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/races/${r.slug}`}>Open race page <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground py-3 px-4 w-1/4">Spec</th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground py-3 px-4">{raceA.name}</th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground py-3 px-4">{raceB.name}</th>
                </tr>
              </thead>
              <tbody className="px-4">
                <Row label="Distance" a={fmt(raceA.distance)} b={fmt(raceB.distance)} />
                <Row label="Date" a={fmt(raceA.date)} b={fmt(raceB.date)} />
                <Row label="Location" a={`${raceA.city}, ${raceA.state}`} b={`${raceB.city}, ${raceB.state}`} />
                <Row label="Surface" a={fmt(raceA.surface)} b={fmt(raceB.surface)} />
                <Row label="Terrain" a={fmt(raceA.terrain)} b={fmt(raceB.terrain)} />
                <Row label="Elevation gain" a={raceA.elevationGainM != null ? `${raceA.elevationGainM} m` : "—"} b={raceB.elevationGainM != null ? `${raceB.elevationGainM} m` : "—"} />
                <Row label="Field size" a={fmt(raceA.fieldSize)} b={fmt(raceB.fieldSize)} />
                <Row label="Entry fee" a={price(raceA)} b={price(raceB)} />
                <Row label="Boston qualifier" a={raceA.bostonQualifier ? "Yes" : "No"} b={raceB.bostonQualifier ? "Yes" : "No"} />
                <Row label="RaceScore" a={`${scoreA.score} (${scoreA.grade})`} b={`${scoreB.score} (${scoreB.grade})`} />
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="mt-8 p-6 bg-muted/40 rounded-lg">
          <h2 className="font-heading font-semibold text-lg mb-2">How we pick a winner</h2>
          <p className="text-sm text-muted-foreground">
            RaceScore blends PR potential, value, vibe, beginner-friendliness, family-fit, urgency, and data completeness into a single 0–100 number. Use the per-race pages for the full breakdown — the right answer depends on your goal.
          </p>
        </div>
      </div>
    </Layout>
  );
}
