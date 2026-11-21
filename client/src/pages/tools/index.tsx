import { ArrowRight, ArrowUpRight, CalendarDays, ChevronDown, MapPin, Video } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/mock-data";
import { RACE_GUIDES_HREF, RACE_GUIDE_YEAR } from "@shared/race-guides";
import { PaceCalculator } from "./pace-calculator";

const companionTools = TOOLS.filter(tool => tool.slug !== "pace-calculator");
const toolDetails: Record<string, string> = {
  "race-predictor": "Start with a recent race result to estimate what you might run at another distance. Use the estimate as a starting point for setting a goal.",
  "training-plan": "Choose a plan that fits your race date, running experience, and the number of days you can train each week.",
  "vo2-estimator": "Use a recent race result to estimate aerobic fitness. Compare results from similar efforts and conditions to see how your fitness changes.",
};

const questions = [
  {
    question: "How do I calculate running pace?",
    answer: "Divide total time by distance. A 5K in 25 minutes is 5:00 per kilometer, or about 8:03 per mile. To estimate a finish time, multiply your pace by the race distance in the same units.",
  },
  {
    question: "What pace do I need for a two-hour half marathon?",
    answer: "A two-hour half marathon takes an average of about 9:09 per mile or 5:41 per kilometer. Use the official race distance and round the displayed pace to the nearest second.",
  },
  {
    question: "How is a race predictor different from a pace calculator?",
    answer: "A pace calculator converts between distance, time, and pace. A race predictor starts from a recent performance and estimates a possible result at another distance. Check that estimate against your training, the course, and race-day conditions.",
  },
  {
    question: "How do I film my run for StrideReplay?",
    answer: "Set your phone on a stable surface and film from the side, with your whole body and both feet in frame for several strides. For a later comparison, use a similar pace, camera angle, and running surface.",
  },
];

export default function ToolsHub() {
  return (
    <Layout>
      <div className="bg-slate-950 text-white">
        <div className="container mx-auto grid items-center gap-8 px-4 py-10 sm:py-14 lg:grid-cols-2 lg:gap-14 lg:py-16">
          <div>
            <h1 className="max-w-xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl" data-testid="text-tools-title">Running tools for race day and training</h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg" data-testid="text-tools-subtitle">
              Calculate your race pace, estimate your finish time, or use StrideReplay to analyze your running form from a video.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" asChild><a href="#pace-calculator">Calculate your pace <ArrowRight aria-hidden="true" /></a></Button>
              <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild>
                <a href="#running-form">Analyze your form <Video aria-hidden="true" /></a>
              </Button>
            </div>
          </div>
          <img src="/running-tools-track.webp" width={1200} height={800} fetchPriority="high" decoding="async"
            alt="Side view of a runner in mid-stride on an outdoor track"
            className="aspect-[3/2] w-full rounded-2xl object-cover" />
        </div>
      </div>

      <div className="container mx-auto space-y-16 px-4 py-12 sm:space-y-20 sm:py-16">
        <PaceCalculator />

        <section id="running-form" aria-labelledby="form-heading" className="grid scroll-mt-24 overflow-hidden rounded-2xl border bg-card lg:grid-cols-[1fr_0.85fr]" data-testid="card-tool-stridereplay">
          <div className="flex flex-col justify-center p-6 sm:p-10">
            <h2 id="form-heading" className="text-3xl font-bold sm:text-4xl">Running form analysis with StrideReplay</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
              Film yourself running and open the clip in StrideReplay for iPhone or iPad. Review the video on your device, replay the frames behind an observation, and compare clips filmed under similar conditions.
            </p>
            <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
              Start with a short side view that shows your whole body and both feet for several strides.
            </p>
            <Button className="mt-6 self-start" asChild data-testid="link-open-tool-stridereplay">
              <a href="https://stridereplay.com/">Explore StrideReplay <ArrowUpRight aria-hidden="true" /></a>
            </Button>
          </div>
          <figure className="flex flex-col items-center justify-center gap-3 bg-slate-100 px-6 py-7 dark:bg-slate-900">
            <img src="/stridereplay-running-form-result.webp" width={322} height={700} loading="lazy" decoding="async"
              alt="StrideReplay results showing a treadmill running clip and a link to its evidence frame"
              className="h-auto w-44 rounded-2xl border border-slate-700/20 shadow-xl" />
            <figcaption className="max-w-72 text-center text-sm text-muted-foreground">A StrideReplay result links back to the frame it analyzed.</figcaption>
          </figure>
        </section>

        <section aria-labelledby="more-tools-heading">
          <h2 id="more-tools-heading" className="text-3xl font-bold sm:text-4xl">More tools for race training</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {companionTools.map(tool => (
              <article key={tool.slug} className="flex flex-col items-start rounded-xl border bg-card p-5 sm:p-6" data-testid={`card-tool-${tool.slug}`}>
                <tool.icon className="mb-4 h-6 w-6 text-primary" aria-hidden="true" />
                <h3 className="text-xl font-semibold">{tool.name}</h3>
                <p className="mb-5 mt-2 flex-1 leading-relaxed text-muted-foreground">{toolDetails[tool.slug]}</p>
                <a href={tool.href} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                  Explore {tool.name.toLowerCase()} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="tools-faq-heading" className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <h2 id="tools-faq-heading" className="text-3xl font-bold sm:text-4xl">Running tools FAQ</h2>
          <div className="divide-y rounded-xl border bg-card">
            {questions.map(({ question, answer }) => (
              <details key={question} className="group px-5 py-4 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                  {question} <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 max-w-prose leading-relaxed text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="next-race-heading" className="rounded-2xl border bg-accent p-6 sm:p-8">
          <h2 id="next-race-heading" className="text-2xl font-bold sm:text-3xl">Find a race for your goal pace</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">Compare race dates, distances, and locations before you choose an event and start training.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild><a href="/races"><MapPin aria-hidden="true" /> Browse U.S. races</a></Button>
            <Button variant="outline" asChild><a href={RACE_GUIDES_HREF}><CalendarDays aria-hidden="true" /> {RACE_GUIDE_YEAR} state race guides</a></Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
