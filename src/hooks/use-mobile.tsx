import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// Suscripción al media query del breakpoint móvil: hydration-safe con
// useSyncExternalStore (false en servidor, valor real en cliente tras hidratar).
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  );
}
