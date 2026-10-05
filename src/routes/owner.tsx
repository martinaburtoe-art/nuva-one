import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/owner")({
  ssr: false,
  beforeLoad: async () => {
    throw redirect({ to: "/owner/control-tower" });
  },
});
