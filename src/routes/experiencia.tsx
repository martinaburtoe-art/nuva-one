import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The public product experience was consolidated into the main landing page.
 * Keep this legacy route as a compatibility redirect so old links/bookmarks
 * do not create a second, competing landing page.
 */
export const Route = createFileRoute("/experiencia")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
