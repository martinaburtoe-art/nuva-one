import { type ReactNode } from "react";
import { Inbox } from "lucide-react";
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

export function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
      Próximamente
    </span>
  );
}