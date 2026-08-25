import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/page-utils";
import { useMyMembership, hasModulePermission, type ModuleKey } from "@/lib/use-business";

/**
 * Protege cada módulo en UI y complementa el control de acceso del backend.
 * La autorización real sigue dependiendo de RLS/API; este guard evita que
 * usuarios sin permiso reciban una pantalla vacía o una ruta funcional.
 */
export function ModuleGuard({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { data: membership, isLoading, isError, refetch } = useMyMembership();

  if (isLoading) {
    return (
      <LoadingState
        title="Verificando permisos"
        description="Comprobando el acceso a este módulo…"
      />
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="No pudimos verificar tus permisos"
        description="El módulo permanece bloqueado hasta confirmar tu acceso. Puedes reintentar sin salir de esta pantalla."
        onRetry={() => void refetch()}
      />
    );
  }

  const allowed = hasModulePermission(membership?.role ?? null, membership?.permissions, module);
  if (!allowed) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-12 text-center"
        role="region"
        aria-labelledby={`module-access-${module}`}
      >
        <ShieldAlert className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <h2 id={`module-access-${module}`} className="font-medium text-foreground">
          No tienes acceso a esta sección
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          El dueño o un administrador del negocio puede habilitarte este módulo desde Configuración
          → Equipo.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
