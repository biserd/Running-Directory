interface CacheEntry {
  html: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 500;

export function getCachedHTML(url: string, ttl: number = DEFAULT_TTL): string | null {
  const entry = cache.get(url);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > ttl) {
    cache.delete(url);
    return null;
  }

  return entry.html;
}

export function setCachedHTML(url: string, html: string): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(url, { html, timestamp: Date.now() });
}

export function getStaleHTML(url: string): string | null {
  const entry = cache.get(url);
  return entry ? entry.html : null;
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  const keys = Array.from(cache.keys());
  for (const key of keys) {
    if (key.includes(pattern)) cache.delete(key);
  }
}
