import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Race, RaceAlert, SavedSearch } from "@shared/schema";
import { Bell, Trash2, ExternalLink, Heart, Search, Mail } from "lucide-react";

interface AlertPreferences {
  unsubscribedAll: boolean;
  unsubscribedAlertTypes: string[];
}

const ALERT_TYPES: { key: string; label: string; description: string }[] = [
  { key: "price-increase", label: "Price increase warning", description: "Heads-up when a race you're tracking is about to raise its entry fee." },
  { key: "registration-close", label: "Registration closing", description: "Last-call email when sign-ups are about to close." },
  { key: "saved-race-reminder", label: "Race-week reminder", description: "Friendly nudge one week before a race you've saved." },
  { key: "this-weekend", label: "This-weekend digest", description: "Friday roundup of races matching your saved searches happening in the next 72 hours." },
  { key: "saved-search-matches", label: "Saved-search matches", description: "Weekly roundup of new races matching your saved filters." },
  { key: "turkey-trot-watch", label: "Turkey Trot watchlist", description: "In-season nudges when new Thanksgiving 5Ks open up." },
];

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export default function AlertsPage() {
  const { user, openLogin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = "Alerts & saved searches · running.services";
  }, []);

  const isAuthed = !!user;

  const savedRacesQ = useQuery<Race[]>({
    queryKey: ["/api/favorites/enriched", "races"],
    queryFn: () => jsonFetch<{ races: Race[] }>("/api/favorites/enriched").then(r => r.races || []),
    enabled: isAuthed,
  });

  const savedSearchesQ = useQuery<SavedSearch[]>({
    queryKey: ["/api/saved-searches"],
    queryFn: () => jsonFetch<SavedSearch[]>("/api/saved-searches"),
    enabled: isAuthed,
  });

  const raceAlertsQ = useQuery<(RaceAlert & { raceSlug: string | null; raceName: string | null })[]>({
    queryKey: ["/api/alerts"],
    queryFn: () => jsonFetch<(RaceAlert & { raceSlug: string | null; raceName: string | null })[]>("/api/alerts"),
    enabled: isAuthed,
  });

  const prefsQ = useQuery<AlertPreferences>({
    queryKey: ["/api/alerts/preferences"],
    queryFn: () => jsonFetch<AlertPreferences>("/api/alerts/preferences"),
    enabled: isAuthed,
  });

  const toggleSearchM = useMutation({
    mutationFn: async ({ id, alertEnabled }: { id: number; alertEnabled: boolean }) =>
      jsonFetch(`/api/saved-searches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertEnabled }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/saved-searches"] }),
  });

  const deleteSearchM = useMutation({
    mutationFn: async (id: number) => jsonFetch(`/api/saved-searches/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/saved-searches"] });
      toast({ title: "Saved search removed" });
    },
  });

  const deleteAlertM = useMutation({
    mutationFn: async (id: number) => jsonFetch(`/api/alerts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alert removed" });
    },
  });

  const updateAlertTypeM = useMutation({
    mutationFn: async ({ id, alertType }: { id: number; alertType: string }) =>
      jsonFetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertType }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alert updated" });
    },
  });

  const updatePrefsM = useMutation({
    mutationFn: async (next: Partial<AlertPreferences>) =>
      jsonFetch<AlertPreferences>("/api/alerts/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["/api/alerts/preferences"], data);
      toast({ title: "Email preferences saved" });
    },
  });

  const prefs = prefsQ.data;

  if (!isAuthed) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <h1 className="font-heading text-3xl font-bold mb-2" data-testid="text-alerts-title">Alerts & saved searches</h1>
          <p className="text-muted-foreground mb-8">Sign in to save races, save searches, and get notified before prices go up or registration closes.</p>
          <Card>
            <CardContent className="py-10 text-center">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="mb-4">Magic-link sign-in — no password.</p>
              <Button onClick={openLogin} data-testid="button-alerts-sign-in">Sign in</Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  function isSubscribed(key: string): boolean {
    if (!prefs) return true;
    if (prefs.unsubscribedAll) return false;
    return !prefs.unsubscribedAlertTypes.includes(key);
  }

  function toggleAlertType(key: string, on: boolean) {
    if (!prefs) return;
    const current = new Set(prefs.unsubscribedAlertTypes);
    if (on) current.delete(key);
    else current.add(key);
    updatePrefsM.mutate({ unsubscribedAlertTypes: Array.from(current) });
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold mb-2" data-testid="text-alerts-title">Alerts & saved searches</h1>
          <p className="text-muted-foreground">Everything you've saved, plus the emails we'll send you. You can unsubscribe from any single email type without losing your data.</p>
        </div>

        {/* Email preferences */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email preferences</CardTitle>
            <CardDescription>Which alert emails do you want from running.services?</CardDescription>
          </CardHeader>
          <CardContent>
            {prefsQ.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-md border" data-testid="row-pref-all">
                  <div>
                    <div className="font-medium">All emails</div>
                    <div className="text-sm text-muted-foreground">Master switch — turning this off pauses every alert email.</div>
                  </div>
                  <Switch
                    checked={!prefs?.unsubscribedAll}
                    onCheckedChange={(on) => updatePrefsM.mutate({ unsubscribedAll: !on })}
                    data-testid="switch-pref-all"
                  />
                </div>
                {ALERT_TYPES.map((t) => (
                  <div
                    key={t.key}
                    className="flex items-center justify-between p-3 rounded-md border"
                    data-testid={`row-pref-${t.key}`}
                  >
                    <div className="pr-4">
                      <div className="font-medium">{t.label}</div>
                      <div className="text-sm text-muted-foreground">{t.description}</div>
                    </div>
                    <Switch
                      checked={isSubscribed(t.key)}
                      disabled={prefs?.unsubscribedAll}
                      onCheckedChange={(on) => toggleAlertType(t.key, on)}
                      data-testid={`switch-pref-${t.key}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved races */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" /> Saved races</CardTitle>
            <CardDescription>Races you've favorited. We'll send a race-week reminder for each.</CardDescription>
          </CardHeader>
          <CardContent>
            {savedRacesQ.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !savedRacesQ.data || savedRacesQ.data.length === 0 ? (
              <div className="text-center py-8" data-testid="empty-saved-races">
                <p className="text-muted-foreground mb-3">No saved races yet.</p>
                <Button variant="outline" onClick={() => navigate("/races")} data-testid="button-browse-saved-races">Browse races</Button>
              </div>
            ) : (
              <ul className="divide-y">
                {savedRacesQ.data.map((race) => (
                  <li key={race.id} className="py-3 flex items-center justify-between gap-4" data-testid={`row-saved-race-${race.id}`}>
                    <div className="min-w-0">
                      <Link href={`/races/${race.slug}`} className="font-medium hover:underline truncate block" data-testid={`link-saved-race-${race.id}`}>{race.name}</Link>
                      <div className="text-sm text-muted-foreground truncate">
                        {race.distance} · {race.city}, {race.state} · {race.date}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Saved searches */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Saved searches</CardTitle>
            <CardDescription>Filter sets you've saved. Toggle alerts to get a weekly digest of new matches.</CardDescription>
          </CardHeader>
          <CardContent>
            {savedSearchesQ.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !savedSearchesQ.data || savedSearchesQ.data.length === 0 ? (
              <div className="text-center py-8" data-testid="empty-saved-searches">
                <p className="text-muted-foreground mb-3">No saved searches yet. Go to the race search and click "Save this search".</p>
                <Button variant="outline" onClick={() => navigate("/races")} data-testid="button-go-search">Open race search</Button>
              </div>
            ) : (
              <ul className="divide-y">
                {savedSearchesQ.data.map((s) => (
                  <li key={s.id} className="py-3 flex items-center justify-between gap-4" data-testid={`row-saved-search-${s.id}`}>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate" data-testid={`text-search-name-${s.id}`}>{s.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {summarizeQuery(s.queryJson)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={s.alertEnabled}
                          onCheckedChange={(on) => toggleSearchM.mutate({ id: s.id, alertEnabled: on })}
                          data-testid={`switch-search-alert-${s.id}`}
                        />
                        <span className="text-xs text-muted-foreground">{s.alertEnabled ? "Alerts on" : "Off"}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSearchM.mutate(s.id)}
                        data-testid={`button-delete-search-${s.id}`}
                        aria-label="Delete saved search"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Race alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Race alerts</CardTitle>
            <CardDescription>Per-race subscriptions for price hikes and registration deadlines.</CardDescription>
          </CardHeader>
          <CardContent>
            {raceAlertsQ.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !raceAlertsQ.data || raceAlertsQ.data.length === 0 ? (
              <div className="text-center py-8" data-testid="empty-race-alerts">
                <p className="text-muted-foreground mb-3">No per-race alerts. Tap the bell icon on any race card to subscribe.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {raceAlertsQ.data.map((a) => (
                  <li key={a.id} className="py-3 flex items-center justify-between gap-4" data-testid={`row-race-alert-${a.id}`}>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.raceName || `Race #${a.raceId}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.lastNotifiedAt ? `Last sent ${new Date(a.lastNotifiedAt).toLocaleDateString()}` : "No emails sent yet"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={a.alertType}
                        onChange={(e) => updateAlertTypeM.mutate({ id: a.id, alertType: e.target.value })}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        data-testid={`select-alert-type-${a.id}`}
                        aria-label="Alert type"
                      >
                        <option value="price-drop">Price changes</option>
                        <option value="price-increase">Price increase</option>
                        <option value="registration-close">Registration closing</option>
                        <option value="registration-open">Registration opens</option>
                      </select>
                      <Link href={a.raceSlug ? `/races/${a.raceSlug}` : `/races`}>
                        <Button variant="ghost" size="icon" aria-label="Open race" data-testid={`link-race-alert-${a.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAlertM.mutate(a.id)}
                        data-testid={`button-delete-alert-${a.id}`}
                        aria-label="Delete alert"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function summarizeQuery(q: unknown): string {
  if (!q || typeof q !== "object") return "All races";
  const obj = q as Record<string, unknown>;
  const parts: string[] = [];
  if (obj.distance) parts.push(String(obj.distance));
  if (obj.state) parts.push(String(obj.state).toUpperCase());
  if (obj.month) parts.push(`Month ${obj.month}`);
  if (obj.priceMax) parts.push(`≤$${obj.priceMax}`);
  if (obj.surface) parts.push(String(obj.surface));
  if (obj.terrain) parts.push(String(obj.terrain));
  if (obj.walkerFriendly) parts.push("walker-friendly");
  if (obj.strollerFriendly) parts.push("stroller-friendly");
  if (obj.bostonQualifier) parts.push("BQ");
  if (obj.charity) parts.push("charity");
  if (obj.turkeyTrot) parts.push("Turkey Trot");
  return parts.length ? parts.join(" · ") : "All races";
}
