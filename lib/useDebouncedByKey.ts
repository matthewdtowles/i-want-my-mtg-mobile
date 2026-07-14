import { useEffect, useMemo, useRef } from "react";

/**
 * Returns a debounced dispatcher keyed by a caller-supplied string: rapid calls
 * for the same key coalesce into a single trailing call with the latest
 * arguments, delayMs after the last call.
 *
 * Used for the absolute-quantity stepper writes. Tapping "+ + +" quickly used to
 * fire three independent `quantity: N` requests that could land out of order and
 * leave the server behind the UI; debouncing sends one request with the final
 * value, so the ordering problem disappears.
 */
export function useDebouncedByKey<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs = 300,
): (key: string, ...args: A) => void {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const fnRef = useRef(fn);
  // Keep the latest callback without touching the ref during render.
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) clearTimeout(t);
      map.clear();
    };
  }, []);

  return useMemo(
    () =>
      (key: string, ...args: A) => {
        const existing = timers.current.get(key);
        if (existing) clearTimeout(existing);
        timers.current.set(
          key,
          setTimeout(() => {
            timers.current.delete(key);
            fnRef.current(...args);
          }, delayMs),
        );
      },
    [delayMs],
  );
}
