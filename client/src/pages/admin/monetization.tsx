import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ShieldCheck, Sparkles, Cpu, FileText, Megaphone, KeyRound, CheckCircle2, X } from "lucide-react";

interface MonetizationRequest {
  id: number;
  kind: string;
  status: string;
  contactEmail: string;
  contactName: string | null;
  organizerId: number | null;
  userId: number | null;
  scope: string | null;
  message: string | null;
  adminNote: string | null;
  createdAt: string;
}

const KIND_META: Record<string, { label: string; icon: typeof Sparkles; color: string }> = {
  pro: { label: "Race Pro", icon: Sparkles, color: "text-amber-600" },
  report: { label: "Market Report", icon: FileText, color: "text-blue-600" },
  api: { label: "API Access", icon: Cpu, color: "text-emerald-600" },
  sponsorship: { label: "Sponsorship", icon: Megaphone, color: "text-purple-600" },
};

function authHeader(adminKey: string): HeadersInit {
  return { "x-admin-key": adminKey, "Content-Type": "application/json" };
}

async function apiAdminGet<T>(adminKey: string, path: string): Promise<T> {
  const res = await fetch(path, { headers: authHeader(adminKey) });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function apiAdminPost<T>(adminKey: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: authHeader(adminKey), body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string }).message || `Request failed: ${res.status}`);
  return data as T;
}

function ResolveDialog({ adminKey, request, open, onOpenChange }: { adminKey: string; request: MonetizationRequest | null; open: boolean; onOpenChange: (b: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [adminNote, setAdminNote] = useState("");
  const [organizerId, setOrganizerId] = useState("");
  const [days, setDays] = useState(365);
  const [keyName, setKeyName] = useState("");
  const [tier, setTier] = useState<"free" | "growth" | "pro">("free");
  const [reportScope, setReportScope] = useState("");

  const resolveMut = useMutation({
    mutationFn: async (status: "approved" | "rejected" | "resolved") => {
      const updates: Promise<unknown>[] = [];
      if (request && status === "approved") {
        if (request.kind === "pro") {
          const oid = parseInt(organizerId, 10);
          if (!Number.isFinite(oid)) throw new Error("Organizer ID required");
          updates.push(apiAdminPost(adminKey, `/api/admin/pro/${oid}/grant`, { days }));
        } else if (request.kind === "api") {
          if (!request.userId) throw new Error("Request has no userId — ask user to sign in & retry.");
          updates.push(apiAdminPost(adminKey, `/api/admin/api-keys/issue`, {
            userId: request.userId,
            organizerId: request.organizerId ?? undefined,
            name: keyName || `${request.contactEmail} key`,
            tier,
            notify: true,
          }));
        } else if (request.kind === "report") {
          if (!request.userId) throw new Error("Request has no userId — ask user to sign in & retry.");
          if (!reportScope) throw new Error("scope required (e.g. brooklyn-ny:5K or 'all')");
          updates.push(apiAdminPost(adminKey, `/api/admin/market-reports/grant-access`, {
            userId: request.userId,
            scope: reportScope,
            days: 365,
          }));
        }
      }
      await Promise.all(updates);
      await apiAdminPost(adminKey, `/api/admin/monetization/${request!.id}/resolve`, { status, adminNote });
    },
    onSuccess: () => {
      toast({ title: "Resolved" });
      qc.invalidateQueries({ queryKey: ["admin-monetization"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Action failed";
      toast({ title: "Failed", description: m, variant: "destructive" });
    },
  });

  if (!request) return null;
  const meta = KIND_META[request.kind] ?? { label: request.kind, icon: ShieldCheck, color: "text-muted-foreground" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-resolve-request">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <meta.icon className={`h-4 w-4 ${meta.color}`} /> Resolve {meta.label} request #{request.id}
          </DialogTitle>
          <DialogDescription>{request.contactEmail}{request.contactName ? ` (${request.contactName})` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {request.scope && <p><span className="text-muted-foreground">Scope:</span> {request.scope}</p>}
          {request.message && <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Message:</span> {request.message}</p>}

          {request.kind === "pro" && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div>
                <Label htmlFor="organizerId" className="text-xs">Organizer ID</Label>
                <Input id="organizerId" value={organizerId} onChange={(e) => setOrganizerId(e.target.value)} placeholder={request.organizerId ? String(request.organizerId) : "e.g. 42"} data-testid="input-organizer-id" />
              </div>
              <div>
                <Label htmlFor="days" className="text-xs">Days</Label>
                <Input id="days" type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value, 10) || 365)} data-testid="input-pro-days" />
              </div>
            </div>
          )}
          {request.kind === "api" && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div className="col-span-2">
                <Label htmlFor="keyName" className="text-xs">Key name</Label>
                <Input id="keyName" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="user@example.com — production" data-testid="input-key-name" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs mb-1 block">Tier</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["free", "growth", "pro"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setTier(t)} className={`border rounded-md px-2 py-1.5 text-xs capitalize ${tier === t ? "border-primary bg-primary/5" : ""}`} data-testid={`button-admin-tier-${t}`}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {request.kind === "report" && (
            <div className="pt-2 border-t">
              <Label htmlFor="reportScope" className="text-xs">Access scope</Label>
              <Input id="reportScope" value={reportScope} onChange={(e) => setReportScope(e.target.value)} placeholder="brooklyn-ny:5K or all" data-testid="input-report-scope-admin" />
            </div>
          )}

          <div className="pt-2 border-t">
            <Label htmlFor="note" className="text-xs">Admin note (optional)</Label>
            <Textarea id="note" rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} data-testid="textarea-admin-note" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => resolveMut.mutate("rejected")} disabled={resolveMut.isPending} data-testid="button-reject"><X className="h-4 w-4 mr-1" /> Reject</Button>
          <Button onClick={() => resolveMut.mutate("approved")} disabled={resolveMut.isPending} data-testid="button-approve"><CheckCircle2 className="h-4 w-4 mr-1" /> {resolveMut.isPending ? "Working…" : "Approve & resolve"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SponsorshipBuilder({ adminKey }: { adminKey: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    brand: "",
    placement: "search",
    headline: "",
    body: "",
    imageUrl: "",
    ctaLabel: "Learn more",
    ctaUrl: "",
    distance: "",
    isTurkeyTrot: false,
  });

  const { data: list } = useQuery<Array<{ id: number; brand: string; placement: string; headline: string; ctaUrl: string; impressions: number | null; clicks: number | null; isActive: boolean }>>({
    queryKey: ["admin-sponsorships"],
    queryFn: () => apiAdminGet(adminKey, "/api/admin/sponsorships"),
    enabled: Boolean(adminKey),
  });

  const create = useMutation({
    mutationFn: () => apiAdminPost(adminKey, "/api/admin/sponsorships", {
      brand: form.brand,
      placement: form.placement,
      headline: form.headline,
      body: form.body || null,
      imageUrl: form.imageUrl || null,
      ctaLabel: form.ctaLabel,
      ctaUrl: form.ctaUrl,
      distance: form.distance || null,
      isTurkeyTrot: form.isTurkeyTrot,
      isActive: true,
    }),
    onSuccess: () => {
      toast({ title: "Sponsorship created" });
      qc.invalidateQueries({ queryKey: ["admin-sponsorships"] });
      setForm({ ...form, brand: "", headline: "", body: "", imageUrl: "", ctaUrl: "" });
    },
    onError: (err: unknown) => toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" }),
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-heading font-semibold">New sponsorship</h3>
          <Input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} data-testid="input-sp-brand" />
          <Input placeholder="Headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} data-testid="input-sp-headline" />
          <Textarea placeholder="Body (optional)" rows={2} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} data-testid="textarea-sp-body" />
          <Input placeholder="Image URL (optional)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} data-testid="input-sp-image" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="CTA label" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} data-testid="input-sp-cta-label" />
            <Input placeholder="https://…" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} data-testid="input-sp-cta-url" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className="border rounded-md h-10 px-3 bg-background" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} data-testid="select-sp-placement">
              <option value="search">Search</option>
              <option value="category">Category</option>
              <option value="turkey-trots">Turkey Trots</option>
            </select>
            <Input placeholder="Distance (optional)" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} data-testid="input-sp-distance" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isTurkeyTrot} onChange={(e) => setForm({ ...form, isTurkeyTrot: e.target.checked })} data-testid="checkbox-sp-turkey-trot" />
            Turkey-trot only
          </label>
          <Button onClick={() => create.mutate()} disabled={!form.brand || !form.headline || !form.ctaUrl || create.isPending} data-testid="button-create-sponsorship">
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <h3 className="font-heading font-semibold mb-3">Live sponsorships</h3>
          {!list || list.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <ul className="divide-y" data-testid="list-sponsorships">
              {list.map((s) => (
                <li key={s.id} className="py-2 text-sm" data-testid={`row-sponsorship-${s.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.brand} · {s.headline}</div>
                      <div className="text-xs text-muted-foreground">{s.placement} · {s.impressions ?? 0} imp · {s.clicks ?? 0} clicks</div>
                    </div>
                    <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "active" : "off"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportGenerator({ adminKey }: { adminKey: string }) {
  const { toast } = useToast();
  const [metroSlug, setMetroSlug] = useState("");
  const [distance, setDistance] = useState("5K");

  const gen = useMutation({
    mutationFn: () => apiAdminPost(adminKey, "/api/admin/market-reports/generate", { metroSlug, distance }),
    onSuccess: () => toast({ title: "Report generated" }),
    onError: (err: unknown) => toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" }),
  });

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h3 className="font-heading font-semibold">Generate market report</h3>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="metroSlug (e.g. brooklyn-ny)" value={metroSlug} onChange={(e) => setMetroSlug(e.target.value)} data-testid="input-mr-slug" />
          <Input placeholder="Distance (e.g. 5K)" value={distance} onChange={(e) => setDistance(e.target.value)} data-testid="input-mr-distance" />
        </div>
        <Button onClick={() => gen.mutate()} disabled={!metroSlug || !distance || gen.isPending} data-testid="button-generate-report">
          {gen.isPending ? "Generating…" : "Generate / refresh"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminMonetizationPage() {
  const [adminKey, setAdminKey] = useState(() => (typeof window !== "undefined" ? sessionStorage.getItem("admin-key") || "" : ""));
  const [active, setActive] = useState<MonetizationRequest | null>(null);
  const [filterKind, setFilterKind] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("pending");

  const { data: requests, isLoading } = useQuery<MonetizationRequest[]>({
    queryKey: ["admin-monetization", filterKind, filterStatus],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (filterKind) qs.set("kind", filterKind);
      if (filterStatus) qs.set("status", filterStatus);
      return apiAdminGet(adminKey, `/api/admin/monetization?${qs.toString()}`);
    },
    enabled: Boolean(adminKey),
    retry: false,
  });

  if (!adminKey) {
    return (
      <Layout>
        <div className="container mx-auto px-4 max-w-md py-16">
          <Card>
            <CardContent className="p-6 space-y-3">
              <h1 className="font-heading text-xl font-bold flex items-center gap-2"><KeyRound className="h-5 w-5" /> Admin sign-in</h1>
              <p className="text-sm text-muted-foreground">Paste your X-Admin-Key to access the monetization queue.</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                const v = (new FormData(e.target as HTMLFormElement).get("k") as string) || "";
                if (v) {
                  sessionStorage.setItem("admin-key", v);
                  setAdminKey(v);
                }
              }}>
                <Input name="k" type="password" placeholder="ADMIN_API_KEY" data-testid="input-admin-key" />
                <Button type="submit" className="mt-3 w-full" data-testid="button-admin-signin">Sign in</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
            <h1 className="text-2xl font-heading font-bold" data-testid="text-admin-monetization-title">Monetization queue</h1>
            <Button variant="ghost" size="sm" onClick={() => { sessionStorage.removeItem("admin-key"); setAdminKey(""); }} data-testid="button-admin-signout">Sign out</Button>
          </div>

          <Tabs defaultValue="queue">
            <TabsList>
              <TabsTrigger value="queue" data-testid="tab-queue">Queue</TabsTrigger>
              <TabsTrigger value="sponsorships" data-testid="tab-sponsorships">Sponsorships</TabsTrigger>
              <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="queue" className="space-y-4 pt-4">
              <div className="flex gap-2 flex-wrap">
                <select className="border rounded-md h-9 px-3 bg-background text-sm" value={filterKind} onChange={(e) => setFilterKind(e.target.value)} data-testid="select-filter-kind">
                  <option value="">All kinds</option>
                  <option value="pro">Race Pro</option>
                  <option value="report">Reports</option>
                  <option value="api">API</option>
                  <option value="sponsorship">Sponsorship</option>
                </select>
                <select className="border rounded-md h-9 px-3 bg-background text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} data-testid="select-filter-status">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="resolved">Resolved</option>
                  <option value="">All statuses</option>
                </select>
              </div>
              {isLoading ? (
                <p className="text-sm text-muted-foreground" data-testid="text-admin-loading">Loading…</p>
              ) : !requests || requests.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-sm text-muted-foreground" data-testid="text-empty-queue">No requests.</CardContent></Card>
              ) : (
                <div className="space-y-2" data-testid="list-monetization-requests">
                  {requests.map((r) => {
                    const meta = KIND_META[r.kind] ?? { label: r.kind, icon: ShieldCheck, color: "text-muted-foreground" };
                    return (
                      <Card key={r.id} data-testid={`row-request-${r.id}`}>
                        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                          <meta.icon className={`h-5 w-5 flex-shrink-0 ${meta.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm" data-testid={`text-request-kind-${r.id}`}>{meta.label}</span>
                              <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                              <span className="text-xs text-muted-foreground">{format(parseISO(r.createdAt), "MMM d HH:mm")}</span>
                            </div>
                            <div className="text-sm text-muted-foreground truncate">{r.contactEmail}{r.contactName ? ` · ${r.contactName}` : ""}{r.scope ? ` · ${r.scope}` : ""}</div>
                          </div>
                          <Button size="sm" onClick={() => setActive(r)} data-testid={`button-resolve-${r.id}`}>Open</Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sponsorships" className="pt-4">
              <SponsorshipBuilder adminKey={adminKey} />
            </TabsContent>

            <TabsContent value="reports" className="pt-4">
              <ReportGenerator adminKey={adminKey} />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <ResolveDialog adminKey={adminKey} request={active} open={Boolean(active)} onOpenChange={(b) => !b && setActive(null)} />
    </Layout>
  );
}
