const cachePrefix = "ifawa.cache.v3";

function cacheKey(userId: string | undefined, name: string) {
  return `${cachePrefix}.${userId || "anonymous"}.${name}`;
}

export function readCache<T>(userId: string | undefined, name: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(cacheKey(userId, name));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeCache<T>(userId: string | undefined, name: string, value: T) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(cacheKey(userId, name), JSON.stringify(value));
  } catch {
    /* Storage may be full or disabled. Remote data remains authoritative. */
  }
}

export function clearPrivateCaches() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(window.localStorage)
      .filter(
        (key) =>
          key.startsWith("ifawa.") &&
          !key.includes(".global.") &&
          !key.startsWith("ifawa.read-receipts."),
      )
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* A disabled browser store must not prevent signing out. */
  }
}
