const cachePrefix = "ifawa.cache.v1";

function cacheKey(userId: string | undefined, name: string) {
  return `${cachePrefix}.${userId || "anonymous"}.${name}`;
}

export function readCache<T>(userId: string | undefined, name: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(cacheKey(userId, name));
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(cacheKey(userId, name));
    return fallback;
  }
}

export function writeCache<T>(userId: string | undefined, name: string, value: T) {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.setItem(cacheKey(userId, name), JSON.stringify(value));
}
