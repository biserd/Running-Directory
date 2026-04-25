import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, Sparkles, ChevronDown, Heart, Trophy, Smile, DollarSign, TreePine, Gift, Users, Bell, Send, Plus, ListChecks } from "lucide-react";
import heroImage from "@/assets/images/hero-races.jpg";

const DISTANCES = ["", "5K", "10K", "Half Marathon", "Marathon", "Trail", "Ultra"];

const MONTHS = [
  { value: "", label: "Any month" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const GOAL_CHIPS: { label: string; href: string; icon: React.ComponentType<{ className?: string }>; testId: string }[] = [
  { label: "First race", href: "/race-shopper/beginner", icon: Smile, testId: "chip-goal-first" },
  { label: "PR", href: "/race-shopper/pr", icon: Trophy, testId: "chip-goal-pr" },
  { label: "Fun with friends", href: "/race-shopper/vibe", icon: Users, testId: "chip-goal-vibe" },
  { label: "Family-friendly", href: "/race-shopper/family", icon: Heart, testId: "chip-goal-family" },
  { label: "Trail", href: "/races?surface=Trail", icon: TreePine, testId: "chip-goal-trail" },
  { label: "Cheap", href: "/race-shopper/value", icon: DollarSign, testId: "chip-goal-cheap" },
  { label: "Charity", href: "/races?charity=true", icon: Gift, testId: "chip-goal-charity" },
  { label: "Turkey Trot", href: "/races?turkeyTrot=true", icon: Sparkles, testId: "chip-goal-turkey" },
];

export function HomeHero() {
  const [, navigate] = useLocation();
  const [location, setLocationInput] = useState("");
  const [distance, setDistance] = useState("");
  const [month, setMonth] = useState("");
  const [goal, setGoal] = useState("");

  function buildSearchUrl(extras?: { useGeo?: boolean }): string {
    const qs = new URLSearchParams();
    if (location) qs.set("q", location);
    if (distance) qs.set("distance", distance);
    if (month) qs.set("month", month);
    if (goal) qs.set("sort", goal);
    if (extras?.useGeo) qs.set("near", "1");
    const s = qs.toString();
    return s ? `/races?${s}` : "/races";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(buildSearchUrl());
  }

  function handleNearMe() {
    if (!navigator.geolocation) {
      navigate("/races/nearby");
      return;
    }
    navigate("/races/nearby");
  }

  return (
    <div className="relative overflow-hidden bg-slate-900 text-white">
      <div className="absolute inset-0 z-0">
        <img src={heroImage} alt="Runners at a race" className="w-full h-full object-cover opacity-40 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/70 to-slate-900/90" />
      </div>

      <div className="container relative z-10 px-4 mx-auto py-14 md:py-20">
        <div className="text-center max-w-4xl mx-auto mb-8">
          <h1 className="font-heading font-extrabold text-4xl md:text-6xl tracking-tight mb-4" data-testid="text-hero-headline">
            Find the right race.
          </h1>
          <p className="text-lg md:text-xl text-slate-200 leading-relaxed" data-testid="text-hero-subheadline">
            Not just the next race. Compare every USA race by goal, weather, vibe, price, and difficulty — backed by real data, not hype.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-3 md:p-4 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3"
          data-testid="form-hero-search"
        >
          <div className="relative md:col-span-4">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <input
              type="text"
              value={location}
              onChange={e => setLocationInput(e.target.value)}
              placeholder="City, state, or ZIP"
              aria-label="Location"
              className="w-full h-11 pl-9 pr-3 bg-white/10 text-white placeholder:text-slate-300 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="input-hero-location"
            />
          </div>
          <div className="relative md:col-span-3">
            <select
              value={distance}
              onChange={e => setDistance(e.target.value)}
              aria-label="Distance"
              className="w-full h-11 pl-3 pr-8 bg-white/10 text-white border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              data-testid="select-hero-distance"
            >
              <option value="" className="text-foreground">Any distance</option>
              {DISTANCES.filter(Boolean).map(d => (
                <option key={d} value={d} className="text-foreground">{d}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
          </div>
          <div className="relative md:col-span-3">
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              aria-label="Month"
              className="w-full h-11 pl-3 pr-8 bg-white/10 text-white border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              data-testid="select-hero-month"
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value} className="text-foreground">{m.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
          </div>
          <div className="relative md:col-span-2">
            <select
              value={goal}
              onChange={e => setGoal(e.target.value)}
              aria-label="Goal"
              className="w-full h-11 pl-3 pr-8 bg-white/10 text-white border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              data-testid="select-hero-goal"
            >
              <option value="" className="text-foreground">Any goal</option>
              <option value="beginner" className="text-foreground">Beginner</option>
              <option value="pr" className="text-foreground">PR</option>
              <option value="value" className="text-foreground">Value</option>
              <option value="vibe" className="text-foreground">Vibe</option>
              <option value="family" className="text-foreground">Family</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
          </div>
          <div className="md:col-span-12 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleNearMe}
              className="h-11 bg-white/5 border-white/20 hover:bg-white/15 text-white"
              data-testid="button-cta-near-me"
            >
              <MapPin className="mr-2 h-4 w-4" /> Find races near me
            </Button>
            <Button type="submit" size="lg" className="h-11 flex-1 bg-primary hover:bg-primary/90 text-white font-semibold" data-testid="button-cta-search">
              Search races
            </Button>
          </div>
        </form>

        <div className="max-w-4xl mx-auto mt-6">
          <div className="text-xs uppercase tracking-wider text-slate-300 mb-3 text-center">Popular goals</div>
          <div className="flex flex-wrap justify-center gap-2" data-testid="goal-chips">
            {GOAL_CHIPS.map(chip => {
              const Icon = chip.icon;
              return (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm hover:bg-white/20 transition-colors"
                  data-testid={chip.testId}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {chip.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-8 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button asChild variant="ghost" className="h-auto py-3 bg-white/5 border border-white/10 hover:bg-white/15 text-white justify-start" data-testid="button-secondary-track">
            <Link href="/favorites">
              <Bell className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="text-left text-xs">Track a race</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-auto py-3 bg-white/5 border border-white/10 hover:bg-white/15 text-white justify-start" data-testid="button-secondary-list">
            <Link href="/organizers">
              <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="text-left text-xs">List your race</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-auto py-3 bg-white/5 border border-white/10 hover:bg-white/15 text-white justify-start" data-testid="button-secondary-turkey">
            <Link href="/races?turkeyTrot=true">
              <Send className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="text-left text-xs">Browse Turkey Trots</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-auto py-3 bg-white/5 border border-white/10 hover:bg-white/15 text-white justify-start" data-testid="button-hero-shopper">
            <Link href="/race-shopper/beginner">
              <ListChecks className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="text-left text-xs">Beginner-friendly races</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
