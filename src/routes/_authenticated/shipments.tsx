import { createFileRoute } from "@tanstack/react-router";
import { ShipmentsWorkspaceV2 } from "@/components/shipments/ShipmentsWorkspaceV2";

export const Route = createFileRoute("/_authenticated/shipments")({
  head: () => ({ meta: [{ title: "Envíos & Entregas — Nüva One" }] }),
  component: ShipmentsRoute,
});

function ShipmentsRoute() {
  return <ShipmentsWorkspaceV2 />;
}
