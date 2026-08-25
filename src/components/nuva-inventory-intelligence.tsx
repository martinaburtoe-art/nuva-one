import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Gauge,
  PackageCheck,
  ShoppingCart,
  TrendingDown,
  Zap,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtCLP } from "@/lib/biz-data";

type Product = {
  id?: string;
  name?: string | null;
  sku?: string | null;
  stock?: number | string | null;
  low_stock_threshold?: number | string | null;
  cost?: number | string | null;
  price?: number | string | null;
};
type Props = { products?: Product[] };
const healthLabel = (score: number) =>
  score >= 70 ? "Crítico" : score >= 45 ? "Atención" : score >= 20 ? "Estable" : "Saludable";
const priorityAction = (stock: number, gap: number) =>
  stock === 0 ? "Reponer ahora" : gap > 0 ? "Programar reposición" : "Vigilar";

export function NuvaInventoryIntelligence({ products = [] }: Props) {
  const rows = products.map((p) => {
    const stock = Math.max(0, Number(p.stock ?? 0));
    const threshold = Math.max(0, Number(p.low_stock_threshold ?? 0));
    const gap = Math.max(0, threshold - stock);
    const coverage =
      threshold > 0 ? Math.min(100, Math.round((stock / threshold) * 100)) : stock > 0 ? 100 : 0;
    const risk =
      stock === 0 ? 100 : gap > 0 ? Math.min(95, 60 + gap * 8) : coverage < 150 ? 35 : 10;
    return { ...p, stock, threshold, gap, coverage, risk };
  });
  const totalUnits = rows.reduce((s, p) => s + p.stock, 0);
  const catalogCost = rows.reduce((s, p) => s + p.stock * Number(p.cost ?? 0), 0);
  const low = rows.filter((p) => p.stock <= p.threshold);
  const critical = rows.filter((p) => p.stock === 0);
  const overstock = rows.filter((p) => p.threshold > 0 && p.stock >= p.threshold * 3);
  const riskScore = rows.length
    ? Math.round(rows.reduce((s, p) => s + p.risk, 0) / rows.length)
    : 0;
  const priority = [...rows].sort((a, b) => b.risk - a.risk || b.gap - a.gap).slice(0, 4);
  const replenishment = low.reduce((s, p) => s + p.gap * Number(p.cost ?? 0), 0);
  const potentialSalesValue = critical.reduce((s, p) => s + Math.max(0, Number(p.price ?? 0)), 0);
  const actionCount = priority.filter((p) => p.risk >= 60).length;

  return (
    <section className="space-y-4">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.06] via-background to-background">
        <div className="p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Nüva Inventory Intelligence
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  Inventario bajo control, no solo registrado
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Nüva convierte stock, umbrales y valor inmovilizado en señales operativas para
                  decidir qué reponer, qué vigilar y dónde existe exceso.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border bg-background/80 px-5 py-3 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Gauge className="h-3.5 w-3.5" /> Riesgo inventario
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums">{riskScore}/100</p>
              <p className="text-xs font-medium">{healthLabel(riskScore)}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={<Boxes className="h-4 w-4" />} label="SKUs" value={String(rows.length)} />
            <Metric
              icon={<PackageCheck className="h-4 w-4" />}
              label="Unidades"
              value={String(totalUnits)}
            />
            <Metric
              icon={<CircleDollarSign className="h-4 w-4" />}
              label="Valor a costo"
              value={fmtCLP(catalogCost)}
            />
            <Metric
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Bajo mínimo"
              value={String(low.length)}
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Signal
              icon={<Zap className="h-4 w-4" />}
              label="Sin stock"
              value={String(critical.length)}
              tone={critical.length ? "danger" : "neutral"}
            />
            <Signal
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Reposición estimada"
              value={fmtCLP(replenishment)}
              tone={low.length ? "warning" : "neutral"}
            />
            <Signal
              icon={<TrendingDown className="h-4 w-4" />}
              label="Posible sobrestock"
              value={String(overstock.length)}
              tone={overstock.length ? "warning" : "neutral"}
            />
            <Signal
              icon={<CircleDollarSign className="h-4 w-4" />}
              label="Venta bloqueada"
              value={fmtCLP(potentialSalesValue)}
              tone={critical.length ? "danger" : "neutral"}
            />
          </div>
        </div>
      </Card>
      <Card>
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Nüva Replenishment Radar
              </p>
              <h3 className="mt-1 text-lg font-semibold">Qué debería revisar primero</h3>
            </div>
            {actionCount > 0 && (
              <Badge className="bg-warning/15 text-warning">
                {actionCount} acción{actionCount === 1 ? "" : "es"} prioritaria
                {actionCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          {priority.length > 0 ? (
            <div className="mt-4 space-y-3">
              {priority.map((p) => (
                <div key={p.id} className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-lg p-2 ${p.risk >= 70 ? "bg-destructive/10 text-destructive" : p.risk >= 45 ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"}`}
                      >
                        {p.risk >= 70 ? (
                          <ShieldAlert className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{p.name || "Producto"}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {p.sku || "Sin SKU"} · {p.stock} unidades · mínimo {p.threshold}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          p.stock === 0
                            ? "bg-destructive/10 text-destructive"
                            : p.stock <= p.threshold
                              ? "bg-warning/15 text-warning"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {p.stock === 0
                          ? "Crítico"
                          : p.stock <= p.threshold
                            ? `Faltan ${p.gap}`
                            : "Vigilar"}
                      </Badge>
                      <span className="text-xs font-bold tabular-nums">{p.risk}/100</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Cobertura vs. mínimo</span>
                      <span className="font-semibold tabular-nums">{p.coverage}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, p.coverage)}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold">{priorityAction(p.stock, p.gap)}</span>
                    <span className="text-muted-foreground">
                      Reposición: {fmtCLP(p.gap * Number(p.cost ?? 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              No hay productos suficientes para generar prioridades de reposición.
            </div>
          )}
          <div className="mt-4 rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-semibold">Lectura Nüva</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {rows.length
                ? `El riesgo observable del inventario es ${riskScore}/100 (${healthLabel(riskScore)}). ${low.length} productos están bajo mínimo y la reposición calculada asciende a ${fmtCLP(replenishment)}.`
                : "Agrega productos para activar la inteligencia de inventario."}
            </p>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Las prioridades utilizan stock, umbral, brecha y costo configurados. No representan una
            predicción de demanda.
          </p>
        </div>
      </Card>
    </section>
  );
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
function Signal({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "danger" | "warning" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-background/60 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <span
        className={`font-semibold tabular-nums ${tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
