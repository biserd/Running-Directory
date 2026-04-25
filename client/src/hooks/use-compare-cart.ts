import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "rs.compareCart";
const MAX = 4;

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function readStore(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === "number").slice(0, MAX);
  } catch {
    return [];
  }
}

function writeStore(ids: number[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota / privacy errors */
  }
  listeners.forEach(l => l());
}

export function useCompareCart() {
  // Always start empty so SSR and first client render match. Load real state in effect.
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    const sync = () => setIds(readStore());
    listeners.add(sync);
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const has = useCallback((id: number) => ids.includes(id), [ids]);

  const toggle = useCallback((id: number) => {
    const current = readStore();
    const next = current.includes(id)
      ? current.filter(x => x !== id)
      : current.length >= MAX
        ? current
        : [...current, id];
    writeStore(next);
  }, []);

  const remove = useCallback((id: number) => {
    writeStore(readStore().filter(x => x !== id));
  }, []);

  const clear = useCallback(() => writeStore([]), []);

  return { ids, has, toggle, remove, clear, max: MAX, isFull: ids.length >= MAX };
}
