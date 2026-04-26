import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiGetReport, apiSubmitMonetizationRequest, type ReportDetail } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { FileText, Lock, DollarSign, Calendar, Users, Trophy, BarChart3 } from "lucide-react";

function UnlockDialog({ scope, open, onOpenChange }: { scope: string; open: boolean; onOpenChange: (b: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiSubmitMonetizationRequest({
      kind: "report",
      contactEmail: contactEmail.trim().toLowerCase(),
      scope,
      message: message.trim() || undefined,
    }),
    onSuccess: () => {
      toast({ title: "Request received", description: "We'll email you to confirm and unlock access." });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Could not submit";
      toast({ title: "Couldn't submit", description: m, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-unlock-report">
        <DialogHeader>
          <DialogTitle>Unlock this report</DialogTitle>
          <DialogDescription>Reports are $49 each. We'll email an invoice and unlock access within a business day.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
          <div>
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} data-testid="input-unlock-email" />
          </div>
          <div>
            <Label htmlFor="msg" className="text-xs">Anything else? (optional)</Label>
            <Textarea id="msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} data-testid="textarea-unlock-message" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-unlock-cancel">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-unlock-submit">
              {mutation.isPending ? "Submitting…" : "Request access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ReportDetailPage() {
  const params = useParams<{ metro: string; distance: string }>();
  const metro = params.metro || "";
  const distance = decodeURIComponent(params.distance || "");
  const [unlockOpen, setUnlockOpen] = useState(false);

  const { data, isLoading, error } = useQuery<ReportDetail>({
    queryKey: ["/api/reports", metro, distance],
    queryFn: () => apiGetReport(metro, distance),
    enabled: Boolean(metro && distance),
    retry: false,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 max-w-4xl py-10">
          <p className="text-sm text-muted-foreground" data-testid="text-loading">Loading report…</p>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Not found" }]} />
        <div className="container mx-auto px-4 max-w-2xl py-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-2xl font-heading font-bold mb-2" data-testid="text-not-found">Report not generated yet</h1>
          <p className="text-sm text-muted-foreground mb-4">This metro + distance combo hasn't been published. Request it and we'll generate it for you.</p>
          <Button asChild data-testid="button-back-reports"><Link href="/reports">Back to reports</Link></Button>
        </div>
      </Layout>
    );
  }

  const isFull = data.access === "full";
  const d = data.data;
  const scope = `${metro}:${distance}`;

  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: data.report.title }]} />
      <section className="py-10 bg-gradient-to-b from-blue-50/50 to-background dark:from-blue-950/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <Badge variant="secondary" className="mb-2" data-testid="badge-report-tag">Market report</Badge>
              <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2" data-testid="text-report-title">{data.report.title}</h1>
              {data.report.summary && <p className="text-sm md:text-base text-muted-foreground max-w-2xl">{data.report.summary}</p>}
              <p className="text-xs text-muted-foreground mt-2">Updated {format(parseISO(data.report.generatedAt), "MMMM d, yyyy")}</p>
            </div>
            {!isFull && (
              <div className="text-right">
                <Badge variant="outline" className="mb-2" data-testid="badge-paywall"><Lock className="h-3 w-3 mr-1" /> Preview</Badge>
                <Button onClick={() => setUnlockOpen(true)} data-testid="button-unlock"><Lock className="h-4 w-4 mr-1" /> Unlock full report ($49)</Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4 max-w-4xl space-y-5">
          {/* Top metrics, always shown */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card data-testid="stat-races">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><BarChart3 className="h-3.5 w-3.5" /> Races tracked</div>
                <div className="text-2xl font-bold" data-testid="stat-race-count">{d.raceCount ?? "—"}</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-price">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><DollarSign className="h-3.5 w-3.5" /> Avg entry price</div>
                <div className="text-2xl font-bold" data-testid="stat-avg-price">
                  {d.avgPriceUsd != null ? `$${d.avgPriceUsd}` : "—"}
                </div>
              </CardContent>
            </Card>
            {isFull && d.priceRange && (
              <Card data-testid="stat-price-range">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><DollarSign className="h-3.5 w-3.5" /> Price range</div>
                  <div className="text-2xl font-bold">
                    {d.priceRange.min != null ? `$${d.priceRange.min}` : "—"} – {d.priceRange.max != null ? `$${d.priceRange.max}` : "—"}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top months */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="font-heading font-semibold">Top race months</h2>
              </div>
              {d.topMonths && d.topMonths.length > 0 ? (
                <ul className="space-y-1.5">
                  {d.topMonths.map((m) => (
                    <li key={m.month} className="flex items-center justify-between text-sm" data-testid={`row-month-${m.month}`}>
                      <span>{m.monthName}</span>
                      <span className="text-muted-foreground">{m.count} races</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No data.</p>
              )}
              {!isFull && (
                <p className="text-xs text-muted-foreground mt-3">Showing 2 of all months · <button onClick={() => setUnlockOpen(true)} className="text-primary hover:underline" data-testid="link-unlock-months">Unlock full</button></p>
              )}
            </CardContent>
          </Card>

          {/* Pro-only sections */}
          {isFull ? (
            <>
              {d.topOrganizers && d.topOrganizers.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-primary" />
                      <h2 className="font-heading font-semibold">Top organizers</h2>
                    </div>
                    <ul className="space-y-1.5">
                      {d.topOrganizers.map((o, i) => (
                        <li key={i} className="flex items-center justify-between text-sm" data-testid={`row-organizer-${i}`}>
                          <span>{o.name}</span>
                          <span className="text-muted-foreground">{o.count} races</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {d.topRaces && d.topRaces.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="h-4 w-4 text-primary" />
                      <h2 className="font-heading font-semibold">Highest quality races</h2>
                    </div>
                    <ul className="space-y-2">
                      {d.topRaces.map((r) => (
                        <li key={r.raceId} className="flex items-center justify-between text-sm" data-testid={`row-race-${r.raceId}`}>
                          <Link href={`/races/${r.slug}`} className="text-primary hover:underline">{r.name}</Link>
                          <span className="text-muted-foreground">Quality {r.qualityScore ?? "—"}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {d.scoreAverages && (
                <Card>
                  <CardContent className="p-5">
                    <h2 className="font-heading font-semibold mb-3">Score averages across the metro</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(d.scoreAverages).map(([k, v]) => (
                        <div key={k} className="border rounded-md p-3 text-center" data-testid={`score-${k}`}>
                          <div className="text-xs text-muted-foreground capitalize">{k}</div>
                          <div className="text-2xl font-bold">{v != null ? Math.round(Number(v)) : "—"}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="p-6 text-center">
                <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-heading font-semibold text-lg mb-1" data-testid="text-paywall-headline">Unlock the full report</h3>
                <p className="text-sm text-muted-foreground mb-3 max-w-xl mx-auto">
                  Top organizers, highest-quality races, full price range, and score averages are paywalled. One-time $49 unlock per metro + distance.
                </p>
                <Button onClick={() => setUnlockOpen(true)} data-testid="button-paywall-unlock"><Lock className="h-4 w-4 mr-1" /> Unlock for $49</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <UnlockDialog scope={scope} open={unlockOpen} onOpenChange={setUnlockOpen} />
    </Layout>
  );
}
