import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  apiOrganizerMe,
  apiUpdateOrganizerRace,
  apiOrganizerRaceAnalytics,
  apiCreateFeaturedRequest,
  apiGetOrganizerApiKeys,
  apiRequestApiKey,
  apiRevokeApiKey,
  apiGetRaceBenchmark,
  apiAnalyticsCsvUrl,
  apiSubmitMonetizationRequest,
  type EditableRaceFields,
  type RaceAnalytics,
  type OrganizerLite,
  type OrganizerApiKey,
  type BenchmarkResponse,
} from "@/lib/api";
import type { Race } from "@shared/schema";
import { format, parseISO } from "date-fns";
import {
  Building2,
  ExternalLink,
  Pencil,
  BarChart3,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ArrowRight,
  Eye,
  Heart,
  MousePointerClick,
  ShieldCheck,
  Crown,
  Download,
  KeyRound,
  Plus,
  Trash2,
  Cpu,
  Lock,
} from "lucide-react";

// ───────────────── Edit dialog ─────────────────

const FIELD_GROUPS: Array<{ title: string; fields: Array<{ key: keyof EditableRaceFields; label: string; type: "text" | "textarea" | "url" | "number" | "boolean"; placeholder?: string; rows?: number }> }> = [
  {
    title: "Registration & pricing",
    fields: [
      { key: "registrationUrl", label: "Registration URL", type: "url", placeholder: "https://runsignup.com/…" },
      { key: "website", label: "Race website", type: "url", placeholder: "https://yourrace.com" },
      { key: "registrationOpen", label: "Registration is open", type: "boolean" },
      { key: "priceMin", label: "Lowest entry price ($)", type: "number" },
      { key: "priceMax", label: "Highest entry price ($)", type: "number" },
      { key: "registrationDeadline", label: "Registration closes (YYYY-MM-DD)", type: "text", placeholder: "2026-04-12" },
      { key: "nextPriceIncreaseAt", label: "Next price increase (YYYY-MM-DD)", type: "text", placeholder: "2026-03-01" },
      { key: "nextPriceIncreaseAmount", label: "Next price increase amount ($)", type: "number" },
    ],
  },
  {
    title: "Course & logistics",
    fields: [
      { key: "description", label: "Public description", type: "textarea", rows: 4 },
      { key: "startTime", label: "Start time", type: "text", placeholder: "7:30 AM" },
      { key: "timeLimit", label: "Course time limit", type: "text", placeholder: "6 hours" },
      { key: "courseType", label: "Course type", type: "text", placeholder: "Loop, out-and-back, point-to-point" },
      { key: "terrain", label: "Terrain", type: "text", placeholder: "Road, trail, mixed" },
      { key: "elevationGainM", label: "Total elevation gain (meters)", type: "number" },
      { key: "fieldSize", label: "Expected field size", type: "number" },
      { key: "courseMapUrl", label: "Course map URL", type: "url" },
      { key: "elevationProfileUrl", label: "Elevation profile URL", type: "url" },
    ],
  },
  {
    title: "Policies & on-site info",
    fields: [
      { key: "refundPolicy", label: "Refund policy", type: "textarea", rows: 3 },
      { key: "deferralPolicy", label: "Deferral policy", type: "textarea", rows: 3 },
      { key: "packetPickup", label: "Packet pickup info", type: "textarea", rows: 3 },
      { key: "parkingNotes", label: "Parking notes", type: "textarea", rows: 3 },
    ],
  },
  {
    title: "Audience flags (helps runners filter)",
    fields: [
      { key: "transitFriendly", label: "Transit-friendly", type: "boolean" },
      { key: "walkerFriendly", label: "Walker-friendly", type: "boolean" },
      { key: "strollerFriendly", label: "Stroller-friendly", type: "boolean" },
      { key: "dogFriendly", label: "Dog-friendly", type: "boolean" },
      { key: "kidsRace", label: "Has a kids race", type: "boolean" },
      { key: "charity", label: "Charity race", type: "boolean" },
      { key: "charityPartner", label: "Charity partner", type: "text", placeholder: "Charity name" },
    ],
  },
  {
    title: "Discount code (shown to runners on the race page)",
    fields: [
      { key: "couponCode", label: "Coupon code", type: "text", placeholder: "RUN10" },
      { key: "couponDiscount", label: "Discount (display copy)", type: "text", placeholder: "$10 off through Sept 30" },
      { key: "couponExpiresAt", label: "Coupon expires (YYYY-MM-DD)", type: "text", placeholder: "2026-09-30" },
    ],
  },
];

function emptyToNull(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}
function strToNumOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function EditRaceDialog({ race, open, onOpenChange }: { race: Race; open: boolean; onOpenChange: (b: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const initialState = useMemo(() => {
    const obj: Record<string, string | boolean | null> = {};
    for (const grp of FIELD_GROUPS) {
      for (const f of grp.fields) {
        const raw = (race as unknown as Record<string, unknown>)[f.key as string];
        if (f.type === "boolean") obj[f.key as string] = (raw as boolean | null) ?? false;
        else if (f.type === "number") obj[f.key as string] = raw == null ? "" : String(raw);
        else obj[f.key as string] = (raw as string | null) ?? "";
      }
    }
    return obj;
  }, [race]);

  const initialPhotos = useMemo(() => ((race as unknown as { photoUrls?: string[] }).photoUrls ?? []).join("\n"), [race]);
  const initialFaq = useMemo<{ q: string; a: string }[]>(() => {
    const raw = (race as unknown as { faq?: { q: string; a: string }[] | null }).faq;
    return Array.isArray(raw) ? raw : [];
  }, [race]);

  const [form, setForm] = useState(initialState);
  const [photosText, setPhotosText] = useState(initialPhotos);
  const [faqEntries, setFaqEntries] = useState(initialFaq);
  useEffect(() => { setForm(initialState); setPhotosText(initialPhotos); setFaqEntries(initialFaq); }, [initialState, initialPhotos, initialFaq, open]);

  const mutation = useMutation({
    mutationFn: (partial: EditableRaceFields) => apiUpdateOrganizerRace(race.id, partial),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizers/me"] });
      toast({ title: "Saved", description: "Your race details are updated." });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast({ title: "Couldn't save", description: msg, variant: "destructive" });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const partial: EditableRaceFields = {};
    for (const grp of FIELD_GROUPS) {
      for (const f of grp.fields) {
        const v = form[f.key as string];
        if (f.type === "boolean") {
          (partial as Record<string, unknown>)[f.key as string] = v as boolean;
        } else if (f.type === "number") {
          (partial as Record<string, unknown>)[f.key as string] = strToNumOrNull(String(v ?? ""));
        } else {
          (partial as Record<string, unknown>)[f.key as string] = emptyToNull(String(v ?? ""));
        }
      }
    }
    // Photos: split on newlines, trim, drop empties / non-http urls.
    const photoUrls = photosText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s));
    partial.photoUrls = photoUrls.slice(0, 20);
    // FAQ: drop blank rows, cap at 30.
    const cleanFaq = faqEntries
      .map((f) => ({ q: f.q.trim(), a: f.a.trim() }))
      .filter((f) => f.q && f.a)
      .slice(0, 30);
    partial.faq = cleanFaq.length > 0 ? cleanFaq : null;
    mutation.mutate(partial);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-race">
        <DialogHeader>
          <DialogTitle>Edit {race.name}</DialogTitle>
          <DialogDescription>Updates publish immediately on the public race page.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6">
          {FIELD_GROUPS.map((grp) => (
            <div key={grp.title}>
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">{grp.title}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {grp.fields.map((f) => {
                  const id = `field-${f.key as string}`;
                  if (f.type === "boolean") {
                    return (
                      <div key={f.key as string} className="flex items-center justify-between border rounded-lg px-3 py-2">
                        <Label htmlFor={id} className="text-sm cursor-pointer">{f.label}</Label>
                        <Switch
                          id={id}
                          checked={!!form[f.key as string]}
                          onCheckedChange={(c) => setForm({ ...form, [f.key as string]: c })}
                          data-testid={`switch-${String(f.key)}`}
                        />
                      </div>
                    );
                  }
                  if (f.type === "textarea") {
                    return (
                      <div key={f.key as string} className="sm:col-span-2">
                        <Label htmlFor={id} className="text-xs">{f.label}</Label>
                        <Textarea
                          id={id}
                          rows={f.rows ?? 3}
                          value={String(form[f.key as string] ?? "")}
                          onChange={(e) => setForm({ ...form, [f.key as string]: e.target.value })}
                          placeholder={f.placeholder}
                          data-testid={`input-${String(f.key)}`}
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={f.key as string}>
                      <Label htmlFor={id} className="text-xs">{f.label}</Label>
                      <Input
                        id={id}
                        type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                        value={String(form[f.key as string] ?? "")}
                        onChange={(e) => setForm({ ...form, [f.key as string]: e.target.value })}
                        placeholder={f.placeholder}
                        data-testid={`input-${String(f.key)}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Photos</h3>
            <Label htmlFor="field-photoUrls" className="text-xs">Photo URLs (one per line, https only — up to 20)</Label>
            <Textarea
              id="field-photoUrls"
              rows={4}
              value={photosText}
              onChange={(e) => setPhotosText(e.target.value)}
              placeholder="https://cdn.example.com/start-line.jpg"
              data-testid="input-photoUrls"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Frequently asked questions</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFaqEntries([...faqEntries, { q: "", a: "" }])}
                data-testid="button-faq-add"
              >
                Add FAQ
              </Button>
            </div>
            {faqEntries.length === 0 && (
              <p className="text-xs text-muted-foreground" data-testid="text-faq-empty">No FAQs yet. Add one to answer the questions runners always ask.</p>
            )}
            <div className="space-y-3">
              {faqEntries.map((entry, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2" data-testid={`faq-row-${idx}`}>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`faq-q-${idx}`} className="text-xs">Question {idx + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFaqEntries(faqEntries.filter((_, i) => i !== idx))}
                      data-testid={`button-faq-remove-${idx}`}
                    >
                      Remove
                    </Button>
                  </div>
                  <Input
                    id={`faq-q-${idx}`}
                    value={entry.q}
                    placeholder="Is there parking at the start?"
                    onChange={(e) => setFaqEntries(faqEntries.map((f, i) => i === idx ? { ...f, q: e.target.value } : f))}
                    data-testid={`input-faq-q-${idx}`}
                  />
                  <Textarea
                    rows={2}
                    value={entry.a}
                    placeholder="Yes — free at the high school lot until 7:30am."
                    onChange={(e) => setFaqEntries(faqEntries.map((f, i) => i === idx ? { ...f, a: e.target.value } : f))}
                    data-testid={`input-faq-a-${idx}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-edit-cancel">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-edit-save">
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────── Analytics ─────────────────

function AnalyticsCard({ raceId, isPro }: { raceId: number; isPro: boolean }) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const effectiveDays = isPro ? days : 30;
  const { data, isLoading } = useQuery<RaceAnalytics>({
    queryKey: [`/api/organizers/me/races/${raceId}/analytics`, effectiveDays],
    queryFn: () => apiOrganizerRaceAnalytics(raceId, effectiveDays),
  });
  const { data: bench } = useQuery<BenchmarkResponse>({
    queryKey: [`/api/organizers/me/races/${raceId}/benchmark`, effectiveDays],
    queryFn: () => apiGetRaceBenchmark(raceId, effectiveDays),
    enabled: isPro,
    retry: false,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground" data-testid={`text-analytics-loading-${raceId}`}>Loading analytics…</p>;
  }
  if (!data) return null;

  const max = Math.max(1, ...data.timeline.map((d) => d.views));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1" data-testid={`window-selector-${raceId}`}>
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => isPro && setDays(d)}
              disabled={!isPro && d !== 30}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${effectiveDays === d ? "border-primary bg-primary/5 text-primary" : "border-transparent text-muted-foreground hover:bg-muted"} ${!isPro && d !== 30 ? "opacity-40 cursor-not-allowed" : ""}`}
              data-testid={`button-window-${d}-${raceId}`}
            >
              {d}d {!isPro && d !== 30 && <Lock className="h-2.5 w-2.5 inline ml-0.5" />}
            </button>
          ))}
        </div>
        {isPro ? (
          <Button asChild size="sm" variant="outline" data-testid={`button-csv-${raceId}`}>
            <a href={apiAnalyticsCsvUrl(raceId, effectiveDays)} download>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </a>
          </Button>
        ) : (
          <Badge variant="outline" className="text-[10px]" data-testid={`badge-pro-locked-${raceId}`}>
            <Crown className="h-3 w-3 mr-1" /> Race Pro unlocks 7d/90d + CSV
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded-lg p-3">
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Eye className="h-3 w-3" /> Page views</div>
          <div className="text-2xl font-bold tabular-nums" data-testid={`stat-views-${raceId}`}>{data.totals.views}</div>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Heart className="h-3 w-3" /> Saves</div>
          <div className="text-2xl font-bold tabular-nums" data-testid={`stat-saves-${raceId}`}>{data.totals.saves}</div>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> Outbound clicks</div>
          <div className="text-2xl font-bold tabular-nums" data-testid={`stat-clicks-${raceId}`}>{data.totals.clicks}</div>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Last 30 days · daily page views</p>
        <div className="flex items-end gap-0.5 h-20" data-testid={`chart-timeline-${raceId}`}>
          {data.timeline.map((d) => (
            <div
              key={d.day}
              className="flex-1 bg-primary/70 rounded-sm hover:bg-primary"
              style={{ height: `${Math.max(2, (d.views / max) * 100)}%` }}
              title={`${d.day}: ${d.views} views, ${d.saves} saves, ${d.clicks} clicks`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>{data.timeline[0]?.day || ""}</span>
          <span>{data.timeline[data.timeline.length - 1]?.day || ""}</span>
        </div>
      </div>

      {data.byDestination.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Where runners clicked</p>
          <div className="space-y-1.5">
            {data.byDestination.map((d) => (
              <div key={d.destination} className="flex items-center justify-between text-xs">
                <span className="capitalize">{d.destination.replace(/-/g, " ")}</span>
                <Badge variant="outline">{d.count}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {isPro && bench && bench.sampleSize > 0 && (
        <div className="border rounded-lg p-3 bg-amber-50/40 dark:bg-amber-950/10" data-testid={`benchmark-${raceId}`}>
          <p className="text-xs font-semibold mb-2 inline-flex items-center gap-1"><Crown className="h-3 w-3 text-amber-600" /> Competitor benchmark <span className="text-muted-foreground font-normal">vs {bench.sampleSize} peers at your distance + state</span></p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {(["views", "saves", "clicks"] as const).map((m) => {
              const yours = bench.yours[m];
              const median = bench.median[m];
              const p75 = bench.p75[m];
              const beatsP75 = yours >= p75 && p75 > 0;
              const beatsMedian = yours >= median && median > 0;
              return (
                <div key={m} className="border rounded p-2" data-testid={`bench-${m}-${raceId}`}>
                  <div className="text-[10px] text-muted-foreground capitalize mb-0.5">{m}</div>
                  <div className="text-base font-bold tabular-nums">{yours}</div>
                  <div className="text-[10px] text-muted-foreground">vs median {median} · p75 {p75}</div>
                  {beatsP75 ? (
                    <div className="text-[10px] text-emerald-700 mt-0.5">Top 25%</div>
                  ) : beatsMedian ? (
                    <div className="text-[10px] text-blue-700 mt-0.5">Above median</div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground mt-0.5">Below median</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────── API keys ─────────────────

function ApiKeysTab({ organizerId }: { organizerId: number | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);
  const [tier, setTier] = useState<"free" | "growth" | "pro">("free");
  const [message, setMessage] = useState("");

  const { data: keys, isLoading } = useQuery<OrganizerApiKey[]>({
    queryKey: ["/api/organizers/me/api-keys"],
    queryFn: apiGetOrganizerApiKeys,
  });

  const requestMut = useMutation({
    mutationFn: () => apiRequestApiKey({ tier, message: message || undefined }),
    onSuccess: () => {
      toast({ title: "Request submitted", description: "We'll email your key within 2 business days." });
      setRequestOpen(false);
      setMessage("");
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Request failed";
      toast({ title: "Couldn't submit", description: m, variant: "destructive" });
    },
  });

  const revokeMut = useMutation({
    mutationFn: (id: number) => apiRevokeApiKey(id),
    onSuccess: () => {
      toast({ title: "Key revoked" });
      qc.invalidateQueries({ queryKey: ["/api/organizers/me/api-keys"] });
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Could not revoke";
      toast({ title: "Failed", description: m, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-heading text-xl font-semibold flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" /> API keys</h2>
          <p className="text-sm text-muted-foreground">Pull races, scores, and featured slots into your own app or newsletter.</p>
        </div>
        <Button onClick={() => setRequestOpen(true)} data-testid="button-request-key-tab"><Plus className="h-4 w-4 mr-1" /> Request a key</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="text-keys-loading">Loading…</p>
      ) : !keys || keys.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <KeyRound className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1" data-testid="text-no-keys">No keys yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">Request your first key — we'll email it back. Free tier includes 1,000 requests / month.</p>
            <Button onClick={() => setRequestOpen(true)} data-testid="button-request-first-key">Request a key</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" data-testid="list-api-keys">
          {keys.map((k) => (
            <Card key={k.id} data-testid={`row-key-${k.id}`}>
              <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" data-testid={`text-key-name-${k.id}`}>{k.name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{k.tier}</Badge>
                    {k.status !== "active" && <Badge variant="secondary" className="text-[10px]">{k.status}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5" data-testid={`text-key-prefix-${k.id}`}>{k.keyPrefix}…</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {k.monthlyUsage.toLocaleString()} / {k.monthlyLimit.toLocaleString()} req this month
                    {k.lastUsedAt && ` · last used ${format(parseISO(k.lastUsedAt), "MMM d")}`}
                  </div>
                </div>
                {k.status === "active" && (
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Revoke this key? This cannot be undone.")) revokeMut.mutate(k.id); }} disabled={revokeMut.isPending} data-testid={`button-revoke-${k.id}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/30">
        <CardContent className="p-4 text-sm">
          <p className="mb-1 font-semibold">Quick start</p>
          <pre className="bg-foreground text-background rounded p-2 text-xs overflow-x-auto">{`curl -H "X-API-Key: rs_…" \\
  "https://running.services/api/v1/races?state=NY&distance=5K"`}</pre>
          <p className="mt-2 text-xs text-muted-foreground">Full docs at <Link href="/developers" className="text-primary hover:underline">/developers</Link>.</p>
        </CardContent>
      </Card>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent data-testid="dialog-request-api-key-tab">
          <DialogHeader>
            <DialogTitle>Request an API key</DialogTitle>
            <DialogDescription>Tell us what tier you want and what you're building.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); requestMut.mutate(); }} className="space-y-3">
            <div>
              <Label className="text-xs mb-2 block">Tier</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["free", "growth", "pro"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTier(t)} className={`border rounded-md px-3 py-2 text-xs capitalize ${tier === t ? "border-primary bg-primary/5" : ""}`} data-testid={`button-key-tier-${t}`}>
                    <div>{t}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{t === "free" ? "1k/mo" : t === "growth" ? "10k/mo" : "50k/mo"}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="key-msg" className="text-xs">What you'll build (optional)</Label>
              <Textarea id="key-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} data-testid="textarea-key-message" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRequestOpen(false)} data-testid="button-key-cancel">Cancel</Button>
              <Button type="submit" disabled={requestMut.isPending} data-testid="button-key-submit">
                {requestMut.isPending ? "Submitting…" : "Request key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ───────────────── Featured request ─────────────────

function FeatureRaceDialog({ race, open, onOpenChange }: { race: Race; open: boolean; onOpenChange: (b: boolean) => void }) {
  const { toast } = useToast();
  const [plan, setPlan] = useState<"featured" | "premium">("featured");
  const [durationDays, setDurationDays] = useState(30);
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiCreateFeaturedRequest(race.id, { plan, durationDays, message: message || undefined }),
    onSuccess: (res) => {
      toast({ title: "Request submitted", description: res.message });
      onOpenChange(false);
      setMessage("");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Request failed";
      toast({ title: "Couldn't submit", description: msg, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-feature-race">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" /> Promote {race.name}</DialogTitle>
          <DialogDescription>
            Request a featured listing on local race pages and Turkey Trot hubs. Our team reviews requests within 2 business days.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="space-y-4"
        >
          <div>
            <Label className="text-xs mb-2 block">Plan</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPlan("featured")} className={`flex-1 border rounded-lg p-3 text-left ${plan === "featured" ? "border-primary bg-primary/5" : ""}`} data-testid="button-plan-featured">
                <div className="font-semibold text-sm">Featured</div>
                <div className="text-xs text-muted-foreground">Highlighted slot on city pages</div>
              </button>
              <button type="button" onClick={() => setPlan("premium")} className={`flex-1 border rounded-lg p-3 text-left ${plan === "premium" ? "border-primary bg-primary/5" : ""}`} data-testid="button-plan-premium">
                <div className="font-semibold text-sm">Premium</div>
                <div className="text-xs text-muted-foreground">Featured + Turkey Trot watch alerts</div>
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="duration" className="text-xs">Duration</Label>
            <select id="duration" className="w-full border rounded-md h-10 px-3 bg-background" value={durationDays} onChange={(e) => setDurationDays(parseInt(e.target.value, 10))} data-testid="select-duration">
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <div>
            <Label htmlFor="msg" className="text-xs">Anything we should know? (optional)</Label>
            <Textarea id="msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Goals, target audience, target date range…" data-testid="textarea-feature-message" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-feature-cancel">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-feature-submit">
              {mutation.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────── Race row ─────────────────

function isFeatured(race: Race): boolean {
  if (!race.featuredUntil) return false;
  return new Date(race.featuredUntil).getTime() > Date.now();
}

function RaceRow({ race, isPro }: { race: Race; isPro: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  return (
    <Card data-testid={`card-organizer-race-${race.id}`}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Link href={`/races/${race.slug}`} className="font-heading font-semibold text-lg hover:text-primary" data-testid={`link-race-${race.slug}`}>{race.name}</Link>
              {isPro && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" data-testid={`badge-pro-${race.id}`}>
                  <Crown className="h-3 w-3 mr-1" /> Race Pro
                </Badge>
              )}
              {isFeatured(race) && (
                <Badge className="bg-amber-500 text-white border-0" data-testid={`badge-featured-${race.id}`}>
                  <Sparkles className="h-3 w-3 mr-1" /> Featured
                </Badge>
              )}
              {race.isClaimed && (
                <Badge variant="outline" className="text-emerald-700 border-emerald-300" data-testid={`badge-claimed-${race.id}`}>
                  <ShieldCheck className="h-3 w-3 mr-1" /> Claimed
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {race.city}, {race.state} · {race.distance} · {race.date ? format(parseISO(race.date), "MMM d, yyyy") : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild data-testid={`button-view-public-${race.id}`}>
              <Link href={`/races/${race.slug}`}><ExternalLink className="h-4 w-4 mr-1" /> View public page</Link>
            </Button>
            <Button size="sm" onClick={() => setEditOpen(true)} data-testid={`button-edit-${race.id}`}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFeatureOpen(true)} data-testid={`button-feature-${race.id}`}>
              <Sparkles className="h-4 w-4 mr-1 text-amber-500" /> Promote
            </Button>
          </div>
        </div>

        <Tabs defaultValue="analytics" onValueChange={(v) => setAnalyticsOpen(v === "analytics")}>
          <TabsList className="h-8">
            <TabsTrigger value="analytics" className="text-xs h-6" data-testid={`tab-analytics-${race.id}`}>
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="health" className="text-xs h-6" data-testid={`tab-health-${race.id}`}>Listing health</TabsTrigger>
          </TabsList>
          <TabsContent value="analytics" className="pt-3">
            <AnalyticsCard raceId={race.id} isPro={isPro} />
          </TabsContent>
          <TabsContent value="health" className="pt-3">
            <ListingHealth race={race} onEdit={() => setEditOpen(true)} />
          </TabsContent>
        </Tabs>
      </CardContent>
      <EditRaceDialog race={race} open={editOpen} onOpenChange={setEditOpen} />
      <FeatureRaceDialog race={race} open={featureOpen} onOpenChange={setFeatureOpen} />
    </Card>
  );
}

function ListingHealth({ race, onEdit }: { race: Race; onEdit: () => void }) {
  const checks: Array<{ ok: boolean; label: string }> = [
    { ok: !!race.registrationUrl, label: "Registration URL" },
    { ok: race.priceMin != null || race.priceMax != null, label: "Pricing set" },
    { ok: !!race.description && race.description.length > 60, label: "Description (60+ chars)" },
    { ok: !!race.refundPolicy, label: "Refund policy" },
    { ok: !!race.parkingNotes || !!race.packetPickup, label: "On-site logistics (parking or packet pickup)" },
    { ok: !!race.courseMapUrl || !!race.elevationProfileUrl, label: "Course map or elevation profile" },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`text-2xl font-bold ${score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600"}`} data-testid={`stat-health-${race.id}`}>
          {score}%
        </div>
        <div className="text-xs text-muted-foreground">Listing completeness</div>
        {score < 100 && (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={onEdit} data-testid={`button-fix-listing-${race.id}`}>Fix it →</Button>
        )}
      </div>
      <ul className="text-sm space-y-1">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2">
            {c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
            <span className={c.ok ? "" : "text-muted-foreground"}>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────── Page ─────────────────

export default function OrganizerDashboardPage() {
  const { user, isLoading: authLoading, openLogin } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/organizers/me"],
    queryFn: apiOrganizerMe,
    enabled: !!user,
    retry: false,
  });

  if (authLoading) {
    return (
      <Layout>
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <p className="text-muted-foreground" data-testid="text-dashboard-loading">Loading…</p>
          </div>
        </section>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <Building2 className="h-10 w-10 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold mb-2" data-testid="text-dashboard-signin-title">Sign in to your organizer dashboard</h1>
            <p className="text-muted-foreground mb-6">Use the same email you used to claim your race.</p>
            <Button onClick={openLogin} data-testid="button-dashboard-sign-in">Sign in</Button>
          </div>
        </section>
      </Layout>
    );
  }

  if (error) {
    const msg = error instanceof Error ? error.message : "Could not load dashboard";
    const isNoOrg = msg.toLowerCase().includes("organizer access");
    return (
      <Layout>
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold mb-2" data-testid="text-dashboard-empty-title">
              {isNoOrg ? "You haven't claimed a race yet" : "Couldn't load dashboard"}
            </h1>
            <p className="text-muted-foreground mb-6">{isNoOrg ? "Find your race and claim it. We'll email you a verification link, then bring you back here." : msg}</p>
            <div className="flex justify-center gap-2">
              <Button asChild data-testid="button-dashboard-claim"><Link href="/for-organizers">Claim a race</Link></Button>
              <Button variant="outline" asChild data-testid="button-dashboard-browse"><Link href="/races">Browse races</Link></Button>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (isLoading || !data) {
    return (
      <Layout>
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <p className="text-muted-foreground" data-testid="text-dashboard-loading">Loading your races…</p>
          </div>
        </section>
      </Layout>
    );
  }

  const { organizer, races, isPro } = data;

  return (
    <Layout>
      <section className="py-10 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Organizer dashboard</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-heading font-bold" data-testid="text-organizer-name">{organizer.name}</h1>
                  {isPro && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" data-testid="badge-organizer-pro">
                      <Crown className="h-3 w-3 mr-1" /> Pro
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">Signed in as {user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isPro && (
                <Button asChild variant="outline" data-testid="button-upgrade-pro">
                  <Link href="/pricing"><Crown className="h-4 w-4 mr-1 text-amber-500" /> Upgrade to Pro</Link>
                </Button>
              )}
              <Button asChild variant="outline" data-testid="button-public-profile">
                <Link href={`/organizers/${organizer.slug}`}><ExternalLink className="h-4 w-4 mr-1" /> Public profile</Link>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="races">
            <TabsList>
              <TabsTrigger value="races" data-testid="tab-dashboard-races">Your races</TabsTrigger>
              <TabsTrigger value="api-keys" data-testid="tab-dashboard-api-keys"><Cpu className="h-3.5 w-3.5 mr-1" /> API keys</TabsTrigger>
            </TabsList>

            <TabsContent value="races" className="pt-6">
              {races.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h2 className="font-semibold mb-1" data-testid="text-no-races">No races yet</h2>
                    <p className="text-sm text-muted-foreground mb-4">Claim another race or contact us if a race is missing from our database.</p>
                    <Button asChild data-testid="button-claim-more"><Link href="/for-organizers">Claim a race</Link></Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4" data-testid="list-organizer-races">
                  <div className="flex items-baseline justify-between mb-2">
                    <h2 className="font-heading text-xl font-semibold">Your races ({races.length})</h2>
                    <Link href="/for-organizers" className="text-sm text-primary hover:underline inline-flex items-center" data-testid="link-claim-another">
                      Claim another <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </div>
                  {races.map((r) => <RaceRow key={r.id} race={r} isPro={isPro} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="api-keys" className="pt-6">
              <ApiKeysTab organizerId={organizer.id} />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
}
