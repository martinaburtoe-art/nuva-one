import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useActiveBusiness, useMyRole } from "@/lib/use-business";
import { ShiftsTable } from "@/components/shifts/shifts-table";

export const Route = createFileRoute("/_authenticated/shifts")({
  head: () => ({ meta: [{ title: "Turnos — Nüva One" }] }),
  component: ShiftsPage,
});

function ShiftsPage() {
  const { active } = useActiveBusiness();
  const { data: myRole } = useMyRole();
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turnos"
        description="Organiza y asigna los horarios de tu equipo, semana a semana."
      />

      {!canManage ? (
        <Card className="p-6 flex items-center gap-2 text-muted-foreground text-sm">
          <Lock className="h-4 w-4" />
          Solo el propietario o administradores pueden gestionar los turnos.
        </Card>
      ) : active ? (
        <ShiftsTable businessId={active.id} />
      ) : null}
    </div>
  );
}
