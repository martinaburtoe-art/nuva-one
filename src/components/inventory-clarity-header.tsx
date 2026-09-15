import { AlertTriangle, ArrowRight, Boxes, CheckCircle2, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";

type InventoryClarityHeaderProps = {
  productCount: number;
  availableUnits: number;
  criticalCount: number;
  replenishmentCount: number;
};

export function InventoryClarityHeader({
  productCount,
  availableUnits,
  criticalCount,
  replenishmentCount,
}: InventoryClarityHeaderProps) {
  const attentionLabel = criticalCount > 0 ? `${criticalCount} requieren atención` : "Sin alertas críticas";

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-background via-background to-primary/[0.045]">
      <div className="border-b border-border/60 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Boxes className="h-3.5 w-3.5" />
              De desorden a control
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Que el inventario deje de ser una búsqueda.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Nüva convierte productos dispersos, stock incierto y reposiciones pendientes en una sola lectura: qué tienes, qué está comprometido, qué falta y qué debes hacer ahora.
            </p>
          </div>
          <div className="rounded-xl border bg-background/80 px-4 py-3 text-sm shadow-sm">
            <p className="text-xs text-muted-foreground">Situación actual</p>
            <p className="mt-1 font-semibold">{attentionLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid divide-y border-b sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Signal icon={ListChecks} label="1 · Detectar" value={`${criticalCount} críticos`} detail="Lo urgente queda arriba." danger={criticalCount > 0} />
        <Signal icon={ArrowRight} label="2 · Ordenar" value={`${productCount} productos`} detail={`${availableUnits} unidades disponibles.`} />
        <Signal icon={CheckCircle2} label="3 · Actuar" value={`${replenishmentCount} reposiciones`} detail="De la alerta a una acción." />
      </div>

      <div className="flex flex-col gap-2 px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>La lógica es simple: <strong className="text-foreground">ver → entender → actuar → verificar.</strong></span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Un solo contexto de inventario</span>
      </div>
    </Card>
  );
}

function Signal({
  icon: Icon,
  label,
  value,
  detail,
  danger = false,
}: {
  icon: typeof ListChecks;
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${danger ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-primary/15 bg-primary/10 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {danger && <AlertTriangle className="ml-auto h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />}
    </div>
  );
}
