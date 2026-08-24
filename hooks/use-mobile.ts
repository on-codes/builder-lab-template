"use client";

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

function getSnapshot(): boolean {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
}

// Server (and the client's very first, pre-hydration render) has no `window` to read a media
// query from — `false` matches the common desktop case, and matters because it has to be
// exactly what the server rendered or React flags a hydration mismatch.
function getServerSnapshot(): boolean {
  return false;
}

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * True below the sidebar's desktop breakpoint (768px, matching Tailwind's `md`), false at or
 * above it — see components/ui/sidebar.tsx, the only consumer. `useSyncExternalStore` (rather
 * than a `useState` + `useEffect` pair) is what makes this correct without an extra
 * synchronize-on-mount render: React calls `getSnapshot` during render itself once hydrated,
 * and re-renders only when `subscribe`'s callback actually fires.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
