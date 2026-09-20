import { type ReactNode } from "react";
import { Inbox, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NuvaOperatingPulse } from "@/components/nuva-operating-pulse";

export function PageHeader({
  title,
  description,
  action,
  actions,
  showOperatingPulse = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  actions?: ReactNode;
}) {
  const resolvedAction = actions ?? action;

  return (
    <>
      <header className="mb-7 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[clamp(1.65rem,2.4vw,2.15rem)] font-semibold tracking-[-0.025em] text-foreground">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          )}
        </div>
        {resolvedAction && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:transition-all [&>*]:duration-200">
            {resolvedAction}
          </div>
        )}
      </header>
      {showOperatingPulse && <NuvaOperatingPulse />}
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
    <div
      className="flex min-h-64 flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-border/70 bg-card/50 px-6 py-14 text-center shadow-sm"
      role="status"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background text-muted-foreground shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-base font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
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
    <div
      className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-border/70 bg-card/60 p-10 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
      </div>
      <div>
        <p className="font-medium tracking-tight">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
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
    <div
      className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-destructive/20 bg-card/60 p-10 text-center shadow-sm"
      role="alert"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5">
        <TriangleAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
      </div>
      <div>
        <p className="font-medium tracking-tight">{title}</p>
        <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </button>
      )}
    </div>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-warning/20 bg-warning/8 px-2.5 py-1 text-xs font-medium text-warning">
      Próximamente
    </span>
  );
}
