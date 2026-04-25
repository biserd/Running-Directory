const STORAGE_KEY = "rs:pendingAction";

export type PendingAction =
  | { type: "save-search"; payload: { name: string; queryJson: Record<string, unknown>; alertEnabled: boolean } }
  | { type: "race-alert"; payload: { raceId: number; alertType: string } }
  | { type: "favorite-race"; payload: { raceId: number } };

export function setPendingAction(action: PendingAction): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(action));
  } catch {
    /* no-op */
  }
}

export function getPendingAction(): PendingAction | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingAction;
  } catch {
    return null;
  }
}

export function clearPendingAction(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}

export async function flushPendingAction(): Promise<{ ok: boolean; redirectTo?: string; message?: string } | null> {
  const action = getPendingAction();
  if (!action) return null;
  clearPendingAction();
  try {
    if (action.type === "save-search") {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) return { ok: false, message: "Couldn't save your search after sign-in." };
      return { ok: true, redirectTo: "/alerts", message: "Search saved. We'll email you matches." };
    }
    if (action.type === "race-alert") {
      const res = await fetch("/api/alerts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.payload),
      });
      if (!res.ok && res.status !== 409) return { ok: false, message: "Couldn't set your alert after sign-in." };
      return { ok: true, redirectTo: "/alerts", message: "Alert set. Manage it from /alerts." };
    }
    if (action.type === "favorite-race") {
      const res = await fetch("/api/favorites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "race", refId: action.payload.raceId }),
      });
      if (!res.ok) return { ok: false, message: "Couldn't save the race after sign-in." };
      return { ok: true, redirectTo: "/favorites", message: "Saved." };
    }
  } catch (err) {
    return { ok: false, message: "Couldn't finish your action after sign-in." };
  }
  return null;
}
