import { ArrowRight, CheckCircle2, Clock3, Package, ScanBarcode, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBizInsert, useBizList } from "@/lib/biz-data";
import { ProductCodeRegistry } from "@/components/product-code-registry";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

type Product = {
  id: string;
  name: string | null;
  sku: string | null;
  stock: number | null;
  low_stock_threshold: number | null;
  max_stock?: number | null;
  reorder_point?: number | null;
  reserved_stock?: number | null;
  blocked_stock?: number | null;
  in_transit_stock?: number | null;
  cost: number | null;
  price?: number | null;
};

type Activity = {
  id: string;
  product_id: string | null;
  type: string;
  content: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
};

type Props = { products: Product[]; canWrite?: boolean };

export type InventoryMetrics = {
  stock: number;
  reserved: number;
  blocked: number;
  inTransit: number;
  available: number;
  projected: number;
  minimum: number;
  reorderPoint: number;
  target: number;
  suggestedOrder: number;
  health: "out_of_stock" | "critical" | "reorder" | "healthy";
};

const nonNegative = (value: unknown) =>
  Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);

export function getInventoryMetrics(product: Product): InventoryMetrics {
  const stock = nonNegative(product.stock);
  const reserved = Math.min(stock, nonNegative(product.reserved_stock));
  const blocked = Math.min(Math.max(0, stock - reserved), nonNegative(product.blocked_stock));
  const inTransit = nonNegative(product.in_transit_stock);
  const minimum = nonNegative(product.low_stock_threshold);
  const reorderPoint = Math.max(minimum, nonNegative(product.reorder_point));
  const configuredMax = nonNegative(product.max_stock);
  const target = Math.max(reorderPoint, configuredMax);
  const available = Math.max(0, stock - reserved - blocked);
  const projected = available + inTransit;
  const suggestedOrder = target > projected ? Math.ceil(target - projected) : 0;

  let health: InventoryMetrics["health"] = "healthy";
  if (available <= 0) health = "out_of_stock";
  else if (available <= minimum) health = "critical";
  else if (available <= reorderPoint) health = "reorder";

  return {
    stock,
    reserved,
    blocked,
    inTransit,
    available,
    projected,
    minimum,
    reorderPoint,
    target,
    suggestedOrder,
    health,
  };
}

function priority(product: Product) {
  const m = getInventoryMetrics(product);
  const quantity = m.suggestedOrder;
  const suffix =
    quantity > 0 ? `${quantity} unidad${quantity === 1 ? "" : "es"}` : "configurar objetivo";
  if (m.health === "out_of_stock")
    return {
      label: "Crítica",
      className: "bg-destructive/10 text-destructive",
      action: `Reponer ${suffix}`,
    };
  if (m.health === "critical")
    return {
      label: "Alta",
      className: "bg-warning/15 text-warning",
      action: `Programar reposición de ${suffix}`,
    };
  if (m.health === "reorder")
    return {
      label: "Media",
      className: "bg-primary/10 text-primary",
      action: `Preparar reposición de ${suffix}`,
    };
  return { label: "Normal", className: "bg-muted text-muted-foreground", action: "Vigilar stock" };
}

export function InventoryActionCenter({ products, canWrite = true }: Props) {
  const navigate = useNavigate();
  const { data: activities = [] } = useBizList<Activity>("customer_activities", {
    order: "created_at",
  });
  const insertActivity = useBizInsert("customer_activities");

  const candidates = products
    .filter((p) => {
      const m = getInventoryMetrics(p);
      return m.available <= Math.max(m.minimum, m.reorderPoint);
    })
    .sort((a, b) => {
      const aMetrics = getInventoryMetrics(a);
      const bMetrics = getInventoryMetrics(b);
      return (
        aMetrics.available - bMetrics.available || bMetrics.suggestedOrder - aMetrics.suggestedOrder
      );
    });

  const openByProduct = new Map<string, Activity>();
  for (const activity of activities) {
    if (activity.type !== "task" || activity.completed || !activity.product_id) continue;
    if (!openByProduct.has(activity.product_id)) openByProduct.set(activity.product_id, activity);
  }

  async function createAction(product: Product) {
    if (!canWrite || insertActivity.isPending) return;
    if (openByProduct.has(product.id))
      return toast.info("Este producto ya tiene una acción abierta en Action Center.");

    const p = priority(product);
    const m = getInventoryMetrics(product);
    try {
      await insertActivity.mutateAsync({
        product_id: product.id,
        type: "task",
        content: `[Inventory Intelligence] ${p.action}: ${product.name || "Producto"}${product.sku ? ` · SKU ${product.sku}` : ""}. Físico ${m.stock}, disponible ${m.available}, reservado ${m.reserved}, bloqueado ${m.blocked}, tránsito ${m.inTransit}, proyectado ${m.projected}, mínimo ${m.minimum}, punto ${m.reorderPoint}, objetivo ${m.target}, sugerido ${m.suggestedOrder}.`,
        due_date: new Date(
          Date.now() + (m.available === 0 ? 86400000 : 2 * 86400000),
        ).toISOString(),
        completed: false,
      });
      toast.success(
        m.suggestedOrder > 0
          ? `Acción creada: reponer ${m.suggestedOrder} unidad${m.suggestedOrder === 1 ? "" : "es"}`
          : "Acción creada: configurar objetivo de reposición",
      );
    } catch {
      toast.error("No se pudo crear la acción de inventario.");
    }
  }

  const openCount = openByProduct.size;
  const criticalCount = candidates.filter((p) => getInventoryMetrics(p).available === 0).length;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.04] via-background to-background">
        <div className="p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Sparkles className="h-4 w-4" /> Nüva Action Center
              </div>
              <h2 className="mt-2 text-xl font-semibold">
                Convierte inventario crítico en trabajo operativo
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                La prioridad considera stock disponible real, reservado, bloqueado y unidades en
                tránsito. La reposición sugerida no es un pronóstico: se basa en parámetros
                configurados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Package className="h-3.5 w-3.5" /> {openCount} abiertas
              </Badge>
              {criticalCount > 0 && <Badge variant="destructive">{criticalCount} críticas</Badge>}
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ to: "/inventario-conteo" })}
              >
                <ScanBarcode className="mr-2 h-4 w-4" />
                Escanear / registrar
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <Metric
              icon={<Package className="h-4 w-4" />}
              label="Candidatos"
              value={String(candidates.length)}
            />
            <Metric
              icon={<Clock3 className="h-4 w-4" />}
              label="Acciones abiertas"
              value={String(openCount)}
            />
            <Metric
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Tareas completadas"
              value={String(
                activities.filter((a) => a.type === "task" && a.completed && a.product_id).length,
              )}
            />
            <Metric
              icon={<Package className="h-4 w-4" />}
              label="Sin disponible"
              value={String(criticalCount)}
            />
          </div>

          <div className="mt-5 space-y-3">
            {candidates.length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                No hay productos en zona de reposición.
              </div>
            ) : (
              candidates.slice(0, 8).map((product) => {
                const p = priority(product);
                const m = getInventoryMetrics(product);
                const existing = openByProduct.get(product.id);
                return (
                  <div key={product.id} className="rounded-xl border bg-background/75 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{product.name || "Producto"}</p>
                          <Badge className={p.className}>{p.label}</Badge>
                          {product.sku && <Badge variant="outline">SKU {product.sku}</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Físico {m.stock} · disponible {m.available} · reservado {m.reserved} ·
                          bloqueado {m.blocked} · tránsito {m.inTransit} · proyectado {m.projected}
                        </p>
                        <p className="mt-2 text-xs font-medium text-primary">
                          Recomendación: {p.action} · objetivo {m.target || "no definido"} ·
                          sugerido {m.suggestedOrder}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0"
                        disabled={!canWrite || !!existing || insertActivity.isPending}
                        onClick={() => createAction(product)}
                      >
                        {existing
                          ? "Acción abierta"
                          : insertActivity.isPending
                            ? "Guardando…"
                            : "Crear acción"}
                        {!existing && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Este panel no modifica stock. Los movimientos reales deben pasar por el flujo
            transaccional de inventario para conservar stock anterior/nuevo y auditoría.
          </p>
        </div>
      </Card>
      <ProductCodeRegistry products={products} />
    </div>
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
