import { type ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title, description, action, icon: Icon = Inbox,
}: { title: string; description?: string; action?: ReactNode; icon?: any }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="h-7 w-7" />
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
