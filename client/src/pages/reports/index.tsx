import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGetReports, type ReportListItem } from "@/lib/api";
import { FileText, ArrowRight, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiSubmitMonetizationRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from "date-fns";

function RequestReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [scope, setScope] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiSubmitMonetizationRequest({
      kind: "report",
      contactEmail: contactEmail.trim().toLowerCase(),
      scope: scope.trim() || undefined,
      message: message.trim() || undefined,
    }),
    onSuccess: () => {
      toast({ title: "Request received", description: "We'll email you when the report is ready." });
      onOpenChange(false);
      setScope("");
      setMessage("");
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Could not submit";
      toast({ title: "Couldn't submit", description: m, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-request-report">
        <DialogHeader>
          <DialogTitle>Request a market report</DialogTitle>
          <DialogDescription>Tell us which metro and distance you want covered.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
          <div>
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} data-testid="input-report-email" />
          </div>
          <div>
            <Label htmlFor="scope" className="text-xs">Metro and distance</Label>
            <Input id="scope" placeholder="e.g. Brooklyn, NY 5K" required value={scope} onChange={(e) => setScope(e.target.value)} data-testid="input-report-scope" />
          </div>
          <div>
            <Label htmlFor="msg" className="text-xs">Anything else? (optional)</Label>
            <Textarea id="msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} data-testid="textarea-report-message" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-report-cancel">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-report-submit">
              {mutation.isPending ? "Submitting…" : "Request report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ReportsHubPage() {
  const [open, setOpen] = useState(false);
  const { data: reports, isLoading } = useQuery<ReportListItem[]>({
    queryKey: ["/api/reports"],
    queryFn: apiGetReports,
  });

  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Market Reports" }]} />
      <section className="py-12 md:py-14 bg-gradient-to-b from-blue-50 to-background dark:from-blue-950/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <Badge variant="secondary" className="mb-4" data-testid="badge-reports">Local market reports</Badge>
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3 leading-tight" data-testid="text-reports-title">
            Per-metro race market data
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mb-5" data-testid="text-reports-sub">
            Pricing, calendar density, top organizers, and runner-fit signal for the distance you care about. Built for race directors planning next year and brands deciding where to put their dollars.
          </p>
          <Button onClick={() => setOpen(true)} data-testid="button-request-report"><FileText className="h-4 w-4 mr-2" /> Request a report</Button>
        </div>
      </section>

      <section className="py-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="font-heading text-2xl font-bold mb-4" data-testid="text-available-reports">Available reports</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground" data-testid="text-loading">Loading…</p>
          ) : !reports || reports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1" data-testid="text-no-reports">No reports yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Be the first to request one — we'll generate it for your metro + distance.</p>
                <Button onClick={() => setOpen(true)} data-testid="button-request-first">Request a report</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="list-reports">
              {reports.map((r) => (
                <Card key={r.id} data-testid={`card-report-${r.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px]"><Lock className="h-3 w-3 mr-1" /> Paywalled</Badge>
                    </div>
                    <h3 className="font-heading font-semibold text-lg mb-1" data-testid={`text-report-title-${r.id}`}>{r.title}</h3>
                    {r.summary && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{r.summary}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Updated {format(parseISO(r.generatedAt), "MMM d, yyyy")}</span>
                      <Button size="sm" variant="outline" asChild data-testid={`link-report-${r.id}`}>
                        <Link href={`/reports/${r.metroSlug}/${encodeURIComponent(r.distance)}`}>
                          Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <RequestReportDialog open={open} onOpenChange={setOpen} />
    </Layout>
  );
}
