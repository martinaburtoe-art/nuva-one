import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { useActiveBusiness } from "@/lib/use-business";
import { ModuleGuard } from "@/components/module-guard";
import { N8nConnectionCard } from "@/components/n8n-connection-card";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({ meta: [{ title: "Automatizaciones — Nüva One" }] }),
  component: AutomationsPage,
});

function AutomationsPage() {
  const { active } = useActiveBusiness();

  return (
    <ModuleGuard module="automations">
      <div className="space-y-5">
        <PageHeader
          title="Automatizaciones"
          description="Conecta eventos de Nüva One con flujos externos para reducir tareas repetitivas y mantener la operación trazable."
        />

        <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-background p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-semibold">Automatización operativa</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Nüva One mantiene los datos y permisos dentro de la plataforma. Las automatizaciones externas se conectan mediante una pasarela server-side y deben conservar el negocio activo, el actor y la trazabilidad del evento.
              </p>
            </div>
          </div>
        </Card>

        <N8nConnectionCard business={active} />
      </div>
    </ModuleGuard>
  );
}
