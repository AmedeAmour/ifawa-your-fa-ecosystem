import { useEffect, useRef } from "react";

/** Refresh visible screens only; don't overlap slow requests. */
export function useRefresh(refresh: () => void | Promise<unknown>, interval = 20000) {
  const callback = useRef(refresh);
  useEffect(() => {
    callback.current = refresh;
  });
  useEffect(() => {
    let busy = false;
    let alive = true;
    const run = async () => {
      if (!alive || busy || document.visibilityState === "hidden" || !navigator.onLine) return;
      busy = true;
      try {
        await callback.current();
      } catch {
        /* Keep the last successful result. */
      } finally {
        busy = false;
      }
    };
    const timer = window.setInterval(run, interval);
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
    };
  }, [interval]);
}
