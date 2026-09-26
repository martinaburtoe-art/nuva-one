import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-utils";
import { NuvaConnectCenter } from "@/components/nuva-connect-center";

export const Route = createFileRoute("/_authenticated/conexiones")({
  head: () => ({ meta: [{ title: "Nüva Connect — Nüva One" }] }),
  component: Conexiones,
});

function Conexiones() {
  return (
    <div>
      <PageHeader title="Nüva Connect" description="Conecta las aplicaciones que ya usa tu negocio sin fragmentar la operación." />
      <NuvaConnectCenter />
    </div>
  );
}
