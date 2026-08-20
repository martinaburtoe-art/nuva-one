import { type ReactNode } from "react";
import { Inbox, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NuvaOperatingPulse } from "@/components/nuva-operating-pulse";

export function PageHeader({
  title,
  description,
  action,
  actions,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  actions?: ReactNode;
}) {
  const resolvedAction = actions ?? action;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {resolvedAction}
      </div>
      {title === "Clientes" && <NuvaOperatingPulse />}
    </>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center" role="status">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingState({
  title = "Cargando…",
  description = "Estamos preparando esta sección.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-10 text-center" role="status" aria-live="polite">
      <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function ErrorState({
  title = "No pudimos cargar esta sección",
  description = "Comprueba tu conexión y vuelve a intentarlo.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-card p-10 text-center" role="alert">
      <TriangleAlert className="h-7 w-7 text-destructive" aria-hidden="true" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </button>
      )}
    </div>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
      Próximamente
    </span>
  );
}