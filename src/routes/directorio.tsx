import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/directorio")({
  beforeLoad: () => {
    throw redirect({ to: "/negocios" });
  },
});
