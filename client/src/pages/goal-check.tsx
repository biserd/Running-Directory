import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Gauge, Target, TrendingUp } from "lucide-react";

type Distance = "5K" | "10K" | "Half Marathon" | "Marathon";

const DISTANCE_KM: Record<Distance, number> = {
  "5K": 5,
  "10K": 10,
  "Half Marathon": 21.0975,
  Marathon: 42.195,
};

function parseTime(value: string): number | null {
  const parts = value.trim().split(":").map(Number);
  if (parts.some(Number.isNaN) || parts.length < 2 || parts.length > 3) return null;
  const [a, b, c] = parts.length === 2 ? [0, parts[0], parts[1]] : parts;
  if (b > 59 || c > 59) return null;
  return a * 3600 + b * 60 + c;
}

function formatTime(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export default function GoalCheckPage() {
  const [recentDistance, setRecentDistance] = useState<Distance>("10K");
  const [recentTime, setRecentTime] = useState("50:00");
  const [goalDistance, setGoalDistance] = useState<Distance>("Half Marathon");
  const [goalTime, setGoalTime] = useState("1:50:00");
  const [weeklyMiles, setWeeklyMiles] = useState("25");
  const [longestRun, setLongestRun] = useState("10");
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    const recentSeconds = parseTime(recentTime);
    const goalSeconds = parseTime(goalTime);
    const weekly = Number(weeklyMiles);
    const longest = Number(longestRun);
    if (!recentSeconds || !goalSeconds || !Number.isFinite(weekly) || !Number.isFinite(longest)) return null;

    const recentKm = DISTANCE_KM[recentDistance];
    const goalKm = DISTANCE_KM[goalDistance];
    const riegelPrediction = recentSeconds * Math.pow(goalKm / recentKm, 1.06);
    const volumeFactor = goalDistance === "Marathon" ? Math.min(1.12, Math.max(0.96, 1.08 - weekly / 300)) : 1;
    const durabilityFactor = goalDistance === "Marathon"
      ? Math.min(1.12, Math.max(0.98, 1.08 - longest / 100))
      : goalDistance === "Half Marathon"
        ? Math.min(1.08, Math.max(0.98, 1.05 - longest / 100))
        : 1;
    const predicted = riegelPrediction * volumeFactor * durabilityFactor;
    const delta = goalSeconds - predicted;
    const tolerance = predicted * 0.035;
    const probability = Math.max(8, Math.min(92, Math.round(50 + (delta / tolerance) * 22)));

    let limiter = "race-specific endurance";
    if (weekly < 15) limiter = "weekly training consistency";
    else if (goalDistance === "Marathon" && longest < 16) limiter = "late-race durability";
    else if (goalSeconds < riegelPrediction * 0.98) limiter = "speed relative to your target";

    return {
      predicted,
      low: predicted * 0.97,
      high: predicted * 1.04,
      probability,
      limiter,
      goalSeconds,
    };
  }, [recentDistance, recentTime, goalDistance, goalTime, weeklyMiles, longestRun]);

  const aitrackerUrl = `https://aitracker.run/?utm_source=running.services&utm_medium=goal-check&utm_campaign=funnel-v1`;

  return (
    <Layout>
      <section className="bg-slate-950 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm mb-5">
              <Target className="h-4 w-4" /> Free race goal check
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-extrabold tracking-tight mb-5">
              Is your race goal realistic?
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl">
              Get an instant target-time range, probability estimate, and the training factor most likely to hold you back.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-secondary/20">
        <div className="container mx-auto px-4 max-w-5xl grid lg:grid-cols-[1.05fr_.95fr] gap-8 items-start">
          <Card>
            <CardContent className="p-6 md:p-8">
              <form
                className="space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSubmitted(true);
                }}
              >
                <div>
                  <h2 className="text-2xl font-bold mb-1">Your current benchmark</h2>
                  <p className="text-muted-foreground text-sm">Use a recent hard effort or race result.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="space-y-2 text-sm font-medium">
                    Recent distance
                    <select className="w-full h-11 rounded-md border bg-background px-3" value={recentDistance} onChange={(e) => setRecentDistance(e.target.value as Distance)}>
                      {Object.keys(DISTANCE_KM).map((distance) => <option key={distance}>{distance}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    Recent time
                    <input className="w-full h-11 rounded-md border bg-background px-3" value={recentTime} onChange={(e) => setRecentTime(e.target.value)} placeholder="50:00" />
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="space-y-2 text-sm font-medium">
                    Goal distance
                    <select className="w-full h-11 rounded-md border bg-background px-3" value={goalDistance} onChange={(e) => setGoalDistance(e.target.value as Distance)}>
                      {Object.keys(DISTANCE_KM).map((distance) => <option key={distance}>{distance}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    Goal time
                    <input className="w-full h-11 rounded-md border bg-background px-3" value={goalTime} onChange={(e) => setGoalTime(e.target.value)} placeholder="1:50:00" />
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="space-y-2 text-sm font-medium">
                    Weekly mileage
                    <input type="number" min="0" className="w-full h-11 rounded-md border bg-background px-3" value={weeklyMiles} onChange={(e) => setWeeklyMiles(e.target.value)} />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    Longest recent run (miles)
                    <input type="number" min="0" className="w-full h-11 rounded-md border bg-background px-3" value={longestRun} onChange={(e) => setLongestRun(e.target.value)} />
                  </label>
                </div>

                <Button type="submit" size="lg" className="w-full">Check my goal <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <p className="text-xs text-muted-foreground text-center">This is an informational estimate, not medical or professional coaching advice.</p>
              </form>
            </CardContent>
          </Card>

          <div className="lg:sticky lg:top-24">
            {!submitted || !result ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center min-h-[420px] flex flex-col items-center justify-center">
                  <Gauge className="h-12 w-12 text-primary mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Your result will appear here</h2>
                  <p className="text-muted-foreground max-w-sm">We will compare your recent performance, training volume, and target to estimate how realistic your goal is.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden border-primary/30">
                <div className="bg-primary text-primary-foreground p-6">
                  <p className="text-sm opacity-85 mb-1">Estimated probability</p>
                  <div className="text-5xl font-extrabold">{result.probability}%</div>
                  <p className="mt-2 text-sm opacity-90">chance of reaching {formatTime(result.goalSeconds)} based on the information provided</p>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Current predicted range</p>
                    <p className="text-2xl font-bold">{formatTime(result.low)}–{formatTime(result.high)}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/60 p-4">
                    <p className="text-sm text-muted-foreground mb-1">Most likely limiter</p>
                    <p className="font-semibold capitalize">{result.limiter}</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-primary shrink-0" /><span>See which historical workouts support or weaken this forecast.</span></div>
                    <div className="flex gap-2"><TrendingUp className="h-5 w-5 text-primary shrink-0" /><span>Track how your probability changes after each important run.</span></div>
                    <div className="flex gap-2"><Target className="h-5 w-5 text-primary shrink-0" /><span>Get personalized race predictions and performance analytics.</span></div>
                  </div>
                  <Button asChild size="lg" className="w-full">
                    <a href={aitrackerUrl}>Personalize this in AITracker <ArrowRight className="ml-2 h-4 w-4" /></a>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">AITracker uses your connected running history to produce a deeper, continuously updated analysis.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      <section className="py-14 bg-background">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-3">Free answer here. Ongoing intelligence in AITracker.</h2>
          <p className="text-muted-foreground mb-6">Running.services helps runners answer high-intent questions. AITracker turns their complete training history into personalized predictions and next-step decisions.</p>
          <Button asChild variant="outline"><Link href="/tools">Explore more running tools</Link></Button>
        </div>
      </section>
    </Layout>
  );
}
