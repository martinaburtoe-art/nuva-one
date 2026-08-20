import type { ReactNode } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useMyMembership, hasModulePermission, type ModuleKey } from "@/lib/use-business";

/**
 * Protege cada módulo en UI y complementa el control de acceso del backend.
 * La autorización real sigue dependiendo de RLS/API; este guard evita que
 * usuarios sin permiso reciban una pantalla vacía o una ruta funcional.
 */
export function ModuleGuard({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { data: membership, isLoading, isError } = useMyMembership();

  if (isLoading) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border bg-card p-12 text-center" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Verificando permisos del módulo…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-card p-12 text-center" role="alert">
        <ShieldAlert className="h-10 w-10 text-destructive" aria-hidden="true" />
        <p className="font-medium text-foreground">No se pudieron verificar tus permisos</p>
        <p className="max-w-sm text-sm text-muted-foreground">Actualiza la página o vuelve a intentarlo. El módulo permanecerá bloqueado hasta confirmar tu acceso.</p>
      </div>
    );
  }

  const allowed = hasModulePermission(membership?.role ?? null, membership?.permissions, module);
  if (!allowed) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center" role="region" aria-labelledby={`module-access-${module}`}>
        <ShieldAlert className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <h2 id={`module-access-${module}`} className="font-medium text-foreground">No tienes acceso a esta sección</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          El dueño o un administrador del negocio puede habilitarte este módulo desde Configuración → Equipo.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
