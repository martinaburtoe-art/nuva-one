import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/page-utils";
import { useMyRole, canManageBusiness } from "@/lib/use-business";

/**
 * Complemento de UI para el endurecimiento de datos laborales sensibles de
 * Nüva People (RLS owner/admin aplicado en base de datos). La autorización
 * real la aplican las políticas RLS; este guard informa con claridad en
 * lugar de dejar pantallas vacías cuando un miembro staff/viewer abre una
 * sección restringida.
 */
export function PeopleSensitiveGate({ children }: { children: ReactNode }) {
  const { data: role, isLoading, isError, refetch } = useMyRole();

  if (isLoading) {
    return (
      <LoadingState
        title="Verificando permisos"
        description="Comprobando tu acceso a datos laborales sensibles…"
      />
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="No pudimos verificar tus permisos"
        description="Los datos sensibles permanecen bloqueados hasta confirmar tu acceso. Puedes reintentar sin salir de esta pantalla."
        onRetry={() => void refetch()}
      />
    );
  }

  if (!canManageBusiness(role)) {
    return (
      <div className="p-4 md:p-6">
        <Card className="rounded-2xl p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">Sección reservada a propietarios y administradores</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Remuneraciones, contratos completos, documentos e información laboral sensible están
            restringidos por seguridad. Tu acceso operativo al equipo sigue disponible en
            «Colaboradores» y la marcación de asistencia en «Asistencia y jornada».
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
