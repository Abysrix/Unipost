"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Debounce a callback. Returns `{ run, flush, cancel }`.
 * `run` schedules the latest call; `flush` runs it immediately (e.g. Ctrl+S);
 * `cancel` drops a pending call. Always uses the freshest callback.
 */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay = 1200) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const api = useMemo(() => {
    const cancel = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
    return {
      run: (...args: A) => {
        cancel();
        timer.current = setTimeout(() => fnRef.current(...args), delay);
      },
      flush: (...args: A) => {
        cancel();
        fnRef.current(...args);
      },
      cancel,
    };
  }, [delay]);

  useEffect(() => api.cancel, [api]);
  return api;
}
