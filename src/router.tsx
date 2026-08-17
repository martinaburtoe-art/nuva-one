import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { trackPageView, trackPlatformEvent } from "./lib/platform-telemetry";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // First-party navigation telemetry. It is deliberately fire-and-forget so
  // observability can never block or break the application.
  router.subscribe("onResolved", ({ toLocation }) => {
    const route = toLocation.pathname;
    trackPageView(route);
    trackPlatformEvent({
      event_name: "route_resolved",
      event_type: "performance",
      route,
      metadata: { source: "tanstack-router" },
    });
  });

  return router;
};