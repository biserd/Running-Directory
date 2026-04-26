import { useState } from "react";
import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiSubmitMonetizationRequest, type MonetizationRequestBody } from "@/lib/api";
import { Sparkles, BarChart3, FileText, Cpu, Megaphone, Check, ArrowRight } from "lucide-react";

type PlanKind = "pro" | "report" | "api" | "sponsorship";

const PLANS: Array<{
  kind: PlanKind;
  name: string;
  price: string;
  cadence: string;
  icon: typeof Sparkles;
  pitch: string;
  features: string[];
  cta: string;
}> = [
  {
    kind: "pro",
    name: "Race Pro",
    price: "$199",
    cadence: "/year per race",
    icon: Sparkles,
    pitch: "Take ownership of your race page and unlock the analytics organizers actually use.",
    features: [
      "Pro badge on your race page and organizer profile",
      "Window-selectable analytics (7/30/90 days)",
      "Competitor benchmark vs other races at your distance + state",
      "CSV export of views, saves, and outbound clicks",
      "Priority listing review when you ask for changes",
    ],
    cta: "Request Race Pro",
  },
  {
    kind: "report",
    name: "Local Market Report",
    price: "$49",
    cadence: "/report",
    icon: FileText,
    pitch: "Per-metro, per-distance reports of pricing, calendar density, and runner-fit signal.",
    features: [
      "Median entry price + range",
      "Top race months in the metro",
      "Top organizers by race count",
      "Highest quality races near you",
      "Score averages (beginner / PR / value / vibe / family)",
    ],
    cta: "Request a report",
  },
  {
    kind: "api",
    name: "API Access",
    price: "$0–$199",
    cadence: "/month",
    icon: Cpu,
    pitch: "Pull races, scores, and featured slots into your own app, newsletter, or club site.",
    features: [
      "X-API-Key auth, monthly metering",
      "GET /api/v1/races (filters + pagination)",
      "GET /api/v1/races/:slug (full detail)",
      "GET /api/v1/featured/races",
      "Free tier: 1,000 req/mo · Growth: 10k · Pro: 50k",
    ],
    cta: "Request an API key",
  },
  {
    kind: "sponsorship",
    name: "Brand Sponsorship",
    price: "$500+",
    cadence: "/placement",
    icon: Megaphone,
    pitch: "A clean, native sponsorship card on race search, category, and Turkey Trot pages.",
    features: [
      "Targeted by city, state, distance, or Turkey Trot",
      "Logged impressions and click-through",
      "No ad-tech tracking — direct 302 redirect to you",
      "Disclosed as Sponsored, no dark-pattern UI",
      "We review every brand before it ships",
    ],
    cta: "Talk to us",
  },
];

function RequestDialog({ kind, planName, open, onOpenChange }: { kind: PlanKind; planName: string; open: boolean; onOpenChange: (b: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [scope, setScope] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: (body: MonetizationRequestBody) => apiSubmitMonetizationRequest(body),
    onSuccess: () => {
      toast({ title: "Request received", description: "We'll get back to you within 2 business days." });
      onOpenChange(false);
      setMessage("");
      setScope("");
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Could not submit";
      toast({ title: "Couldn't submit", description: m, variant: "destructive" });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      kind,
      contactEmail: contactEmail.trim().toLowerCase(),
      contactName: contactName.trim() || undefined,
      scope: scope.trim() || undefined,
      message: message.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-request-plan">
        <DialogHeader>
          <DialogTitle>Request {planName}</DialogTitle>
          <DialogDescription>Tell us a bit and we'll get back to you. No card needed today.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} data-testid="input-request-email" />
          </div>
          <div>
            <Label htmlFor="name" className="text-xs">Name (optional)</Label>
            <Input id="name" value={contactName} onChange={(e) => setContactName(e.target.value)} data-testid="input-request-name" />
          </div>
          <div>
            <Label htmlFor="scope" className="text-xs">{kind === "report" ? "Metro + distance you want" : kind === "sponsorship" ? "Brand & target" : kind === "pro" ? "Race name + city" : "What you'll use the API for"}</Label>
            <Input id="scope" value={scope} onChange={(e) => setScope(e.target.value)} data-testid="input-request-scope" placeholder={kind === "report" ? "Brooklyn, NY 5K" : ""} />
          </div>
          <div>
            <Label htmlFor="msg" className="text-xs">Anything else? (optional)</Label>
            <Textarea id="msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} data-testid="textarea-request-message" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-request-cancel">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-request-submit">
              {mutation.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PricingPage() {
  const [openKind, setOpenKind] = useState<PlanKind | null>(null);
  const activePlan = PLANS.find((p) => p.kind === openKind);

  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Pricing" }]} />
      <section className="py-12 md:py-16 bg-gradient-to-b from-blue-50 to-background dark:from-blue-950/30">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <Badge variant="secondary" className="mb-4" data-testid="badge-pricing">Pricing</Badge>
          <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4 leading-tight" data-testid="text-pricing-title">
            Pay only for what moves your race.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-pricing-sub">
            The core race calendar, decision tools, and scores stay free for runners — forever. These are the four ways organizers, brands, and developers fund running.services.
          </p>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4 max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-5">
          {PLANS.map((p) => {
            const Icon = p.icon;
            return (
              <Card key={p.kind} data-testid={`card-plan-${p.kind}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-heading font-bold text-xl" data-testid={`text-plan-name-${p.kind}`}>{p.name}</h2>
                      <p className="text-sm text-muted-foreground">{p.pitch}</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold" data-testid={`text-plan-price-${p.kind}`}>{p.price}</span>
                    <span className="text-sm text-muted-foreground">{p.cadence}</span>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" onClick={() => setOpenKind(p.kind)} data-testid={`button-request-${p.kind}`}>
                    {p.cta} <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="container mx-auto px-4 max-w-3xl mt-10 text-center text-sm text-muted-foreground">
          <p data-testid="text-pricing-footnote">
            Payments are handled by hand right now — we'll email back, share an invoice, and turn things on within two business days. Self-serve checkout ships next.
          </p>
        </div>
      </section>

      {activePlan && (
        <RequestDialog
          kind={activePlan.kind}
          planName={activePlan.name}
          open={openKind !== null}
          onOpenChange={(b) => !b && setOpenKind(null)}
        />
      )}
    </Layout>
  );
}
