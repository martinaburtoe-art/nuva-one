import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Clock3, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { fmtCLP } from "@/lib/biz-data";

const statusLabel: Record<string, string> = {
  pending: "Pendientes",
  preparing: "Preparando",
  ready: "Listos",
  shipped: "Despachados",
  in_transit: "En tránsito",
  out_for_delivery: "En reparto",
  delivered: "Entregados",
  failed: "Fallidos",
  returned: "Devueltos",
  cancelled: "Cancelados",
};

export function ShipmentsAnalytics({ shipments }: { shipments: any[] }) {
  const stats = useMemo(() => {
    const total = shipments.length;
    const delivered = shipments.filter((s) => s.status === "delivered").length;
    const active = shipments.filter((s) =>
      ["pending", "preparing", "ready", "shipped", "in_transit", "out_for_delivery"].includes(
        s.status,
      ),
    ).length;
    const exceptions = shipments.filter((s) =>
      ["failed", "returned", "cancelled"].includes(s.status),
    ).length;
    const cost = shipments.reduce((n, s) => n + Number(s.shipping_cost || 0), 0);
    const overdue = shipments.filter(
      (s) =>
        s.estimated_delivery_date &&
        new Date(`${s.estimated_delivery_date}T23:59:59`) < new Date() &&
        s.status !== "delivered" &&
        s.status !== "cancelled" &&
        s.status !== "returned",
    ).length;
    const rate = total ? Math.round((delivered / total) * 100) : 0;
    return { total, delivered, active, exceptions, cost, overdue, rate };
  }, [shipments]);

  const byStatus = useMemo(
    () =>
      Object.entries(
        shipments.reduce<Record<string, number>>((a, s) => {
          a[s.status] = (a[s.status] || 0) + 1;
          return a;
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    [shipments],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Metric icon={Truck} label="Total envíos" value={String(stats.total)} />
        <Metric icon={Clock3} label="En curso" value={String(stats.active)} />
        <Metric
          icon={CheckCircle2}
          label="Entregados"
          value={`${stats.delivered} · ${stats.rate}%`}
        />
        <Metric
          icon={AlertTriangle}
          label="Atrasados"
          value={String(stats.overdue)}
          tone={stats.overdue ? "warning" : undefined}
        />
        <Metric
          icon={RotateCcw}
          label="Incidencias"
          value={String(stats.exceptions)}
          tone={stats.exceptions ? "danger" : undefined}
        />
        <Metric icon={Truck} label="Costo despacho" value={fmtCLP(stats.cost)} />
      </div>
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Estado de la operación</h3>
            <p className="text-xs text-muted-foreground">Visión consolidada de todos los envíos</p>
          </div>
          <Badge variant="outline">{stats.total} registros</Badge>
        </div>
        {byStatus.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay envíos para analizar.
          </p>
        ) : (
          <div className="space-y-3">
            {byStatus.map(([status, count]) => {
              const pct = stats.total ? (count / stats.total) * 100 : 0;
              return (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{statusLabel[status] ?? status}</span>
                    <span className="font-medium">
                      {count} · {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
  tone?: "warning" | "danger";
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-secondary p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p
            className={`truncate text-lg font-semibold ${tone === "warning" ? "text-warning" : tone === "danger" ? "text-destructive" : ""}`}
          >
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}
