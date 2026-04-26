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
import { apiSubmitMonetizationRequest } from "@/lib/api";
import { Cpu, Code, KeyRound, Gauge } from "lucide-react";

const ENDPOINTS: Array<{ method: string; path: string; description: string }> = [
  { method: "GET", path: "/api/v1/races", description: "Paginated race search. Filters: city, state, distance, surface, isTurkeyTrot, bostonQualifier, walkerFriendly, strollerFriendly. Pagination: page (default 1), perPage (max 100, default 25)." },
  { method: "GET", path: "/api/v1/races/:slug", description: "Full detail for a single race by URL slug." },
  { method: "GET", path: "/api/v1/featured/races", description: "Featured slots — useful for partner sites that want to surface promoted races." },
];

const SAMPLE_CURL = `curl -H "X-API-Key: rs_…" \\
  "https://running.services/api/v1/races?state=NY&distance=5K&page=1&perPage=10"`;

const SAMPLE_RESPONSE = `{
  "page": 1,
  "perPage": 10,
  "results": [
    {
      "id": 1042,
      "slug": "brooklyn-thanksgiving-5k-2026",
      "name": "Brooklyn Thanksgiving 5K",
      "date": "2026-11-26",
      "city": "Brooklyn",
      "state": "NY",
      "distance": "5K",
      "isTurkeyTrot": true,
      "scores": { "beginner": 88, "pr": 64, "value": 72, "vibe": 90, "family": 95, "quality": 86 },
      "url": "https://running.services/races/brooklyn-thanksgiving-5k-2026"
    }
  ]
}`;

function RequestKeyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [tier, setTier] = useState<"free" | "growth" | "pro">("free");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiSubmitMonetizationRequest({
      kind: "api",
      contactEmail: contactEmail.trim().toLowerCase(),
      contactName: contactName.trim() || undefined,
      scope: `tier:${tier}`,
      message: message.trim() || undefined,
    }),
    onSuccess: () => {
      toast({ title: "Request received", description: "We'll email your API key within 2 business days." });
      onOpenChange(false);
      setMessage("");
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Could not submit";
      toast({ title: "Couldn't submit", description: m, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-request-api-key">
        <DialogHeader>
          <DialogTitle>Request an API key</DialogTitle>
          <DialogDescription>Free tier is 1,000 requests / month. Higher tiers unlock more.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="space-y-3"
        >
          <div>
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} data-testid="input-api-email" />
          </div>
          <div>
            <Label htmlFor="name" className="text-xs">Name (optional)</Label>
            <Input id="name" value={contactName} onChange={(e) => setContactName(e.target.value)} data-testid="input-api-name" />
          </div>
          <div>
            <Label className="text-xs mb-2 block">Tier</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["free", "growth", "pro"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`border rounded-md px-3 py-2 text-xs capitalize ${tier === t ? "border-primary bg-primary/5" : ""}`}
                  data-testid={`button-tier-${t}`}
                >
                  {t}
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {t === "free" ? "1k/mo" : t === "growth" ? "10k/mo" : "50k/mo"}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="msg" className="text-xs">What you'll build (optional)</Label>
            <Textarea id="msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} data-testid="textarea-api-message" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-api-cancel">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-api-submit">
              {mutation.isPending ? "Submitting…" : "Request key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DevelopersPage() {
  const [reqOpen, setReqOpen] = useState(false);

  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Developers" }]} />
      <section className="py-12 md:py-16 bg-gradient-to-b from-blue-50 to-background dark:from-blue-950/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <Badge variant="secondary" className="mb-4" data-testid="badge-developers">Developer API</Badge>
          <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4 leading-tight" data-testid="text-developers-title">
            Race data your app can trust.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl" data-testid="text-developers-sub">
            Pull our normalized race calendar, deterministic scores, and featured slots into your newsletter, club site, training app, or analysis tool.
          </p>
          <Button size="lg" className="mt-6" onClick={() => setReqOpen(true)} data-testid="button-request-key">
            <KeyRound className="h-4 w-4 mr-2" /> Request an API key
          </Button>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4 max-w-4xl space-y-8">
          <div>
            <h2 className="text-2xl font-heading font-bold mb-3" data-testid="text-auth-heading">Auth & rate limits</h2>
            <Card>
              <CardContent className="p-5 text-sm space-y-3">
                <p>Send your key in the <code className="px-1.5 py-0.5 bg-muted rounded">X-API-Key</code> header on every request:</p>
                <pre className="bg-foreground text-background rounded-md p-3 text-xs overflow-x-auto" data-testid="code-curl">{SAMPLE_CURL}</pre>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="border rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1"><Gauge className="h-4 w-4 text-primary" /><span className="text-xs font-semibold">Free</span></div>
                    <div className="text-sm">1,000 req / month</div>
                  </div>
                  <div className="border rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1"><Gauge className="h-4 w-4 text-primary" /><span className="text-xs font-semibold">Growth</span></div>
                    <div className="text-sm">10,000 req / month</div>
                  </div>
                  <div className="border rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1"><Gauge className="h-4 w-4 text-primary" /><span className="text-xs font-semibold">Pro</span></div>
                    <div className="text-sm">50,000 req / month</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-1">Each response includes <code>X-RateLimit-Limit</code> and <code>X-RateLimit-Remaining</code> headers. Hitting your cap returns HTTP 429 until the next monthly window.</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-bold mb-3" data-testid="text-endpoints-heading">Endpoints</h2>
            <div className="space-y-3">
              {ENDPOINTS.map((ep) => (
                <Card key={ep.path} data-testid={`endpoint-${ep.path}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <Badge variant="outline" className="font-mono text-[10px]">{ep.method}</Badge>
                      <code className="text-sm font-mono" data-testid={`text-endpoint-path-${ep.path}`}>{ep.path}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">{ep.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-bold mb-3" data-testid="text-response-heading">Sample response</h2>
            <Card>
              <CardContent className="p-0">
                <pre className="bg-foreground text-background p-4 text-xs overflow-x-auto rounded-md" data-testid="code-response">{SAMPLE_RESPONSE}</pre>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 flex flex-wrap items-center gap-4 justify-between">
              <div className="flex items-start gap-3">
                <Code className="h-6 w-6 text-primary mt-0.5" />
                <div>
                  <h3 className="font-heading font-semibold">Already have a key?</h3>
                  <p className="text-sm text-muted-foreground">Manage usage from the API keys tab on your organizer dashboard.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" data-testid="link-dashboard"><a href="/organizers/dashboard">Open dashboard</a></Button>
                <Button onClick={() => setReqOpen(true)} data-testid="button-request-key-bottom"><Cpu className="h-4 w-4 mr-1" /> Request a key</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <RequestKeyDialog open={reqOpen} onOpenChange={setReqOpen} />
    </Layout>
  );
}
