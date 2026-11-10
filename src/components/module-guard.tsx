import type { ReactNode } from "react";
import { Building2, Plus, ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ErrorState, LoadingState } from "@/components/page-utils";
import { Button } from "@/components/ui/button";
import { useActiveBusiness, useMyMembership, hasModulePermission, type ModuleKey } from "@/lib/use-business";

/**
 * Protege cada módulo y resuelve explícitamente el contexto de negocio antes
 * de evaluar permisos. Un ID guardado obsoleto no debe parecer una denegación.
 * La autorización real sigue dependiendo de RLS/API.
 */
export function ModuleGuard({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const {
    active,
    businesses,
    setActiveId,
    isLoading: businessesLoading,
    isError: businessesError,
    refetch: refetchBusinesses,
  } = useActiveBusiness();
  const { data: membership, isLoading, isError, refetch } = useMyMembership();

  if (businessesLoading) {
    return (
      <LoadingState
        title="Preparando tu espacio de trabajo"
        description="Estamos recuperando tus negocios disponibles…"
      />
    );
  }

  if (businessesError) {
    return (
      <ErrorState
        title="No pudimos cargar tus negocios"
        description="No podemos determinar el espacio de trabajo disponible. Reintenta la consulta."
        onRetry={() => void refetchBusinesses()}
      />
    );
  }

  if (!active) {
    return (
      <section
        className="mx-auto flex min-h-[min(68vh,620px)] w-full max-w-3xl flex-col justify-center px-3 py-8 sm:px-6"
        aria-labelledby="nuva-workspace-required-title"
      >
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
          <div className="border-b border-border/60 bg-muted/25 px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/5 text-primary">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              NÜVA ONE · ESPACIO DE TRABAJO
            </p>
            <h1 id="nuva-workspace-required-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {businesses.length > 0 ? "Elige con qué negocio trabajar" : "Tu espacio está listo para comenzar"}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {businesses.length > 0
                ? "No hay un negocio activo seleccionado. Elige uno para cargar tu Resumen, operaciones e indicadores."
                : "Crea tu negocio para activar el Resumen y conectar ventas, inventario, caja y finanzas."}
            </p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
            {businesses.map((business) => (
              <button
                key={business.id}
                type="button"
                onClick={() => setActiveId(business.id)}
                className="group flex min-h-20 min-w-0 items-center gap-3 rounded-2xl border border-border/70 bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{business.name}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">{business.industry || "Negocio"}</span>
                </span>
                <span className="text-xs font-semibold text-primary">Abrir</span>
              </button>
            ))}
            {businesses.length === 0 && (
              <div className="sm:col-span-2">
                <Link to="/onboarding">
                  <Button className="min-h-11 w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear mi negocio
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

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
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center sm:p-12"
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
