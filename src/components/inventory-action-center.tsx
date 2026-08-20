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

function priority(product: Product) {
  const stock = Math.max(0, Number(product.stock ?? 0));
  const minimum = Math.max(0, Number(product.low_stock_threshold ?? 0));
  const gap = Math.max(0, minimum - stock);
  if (stock === 0) return { label: "Crítica", className: "bg-destructive/10 text-destructive", action: "Reponer ahora" };
  if (stock <= minimum) return { label: "Alta", className: "bg-warning/15 text-warning", action: `Programar reposición de ${gap} unidad${gap === 1 ? "" : "es"}` };
  return { label: "Normal", className: "bg-muted text-muted-foreground", action: "Vigilar stock" };
}

export function InventoryActionCenter({ products, canWrite = true }: Props) {
  const navigate = useNavigate();
  const { data: activities = [] } = useBizList<Activity>("customer_activities", { order: "created_at" });
  const insertActivity = useBizInsert("customer_activities");

  const candidates = products
    .filter((p) => Number(p.stock ?? 0) <= Number(p.low_stock_threshold ?? 0))
    .sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0));

  const openByProduct = new Map<string, Activity>();
  for (const activity of activities) {
    if (activity.type !== "task" || activity.completed || !activity.product_id) continue;
    if (!openByProduct.has(activity.product_id)) openByProduct.set(activity.product_id, activity);
  }

  async function createAction(product: Product) {
    if (!canWrite || insertActivity.isPending) return;
    if (openByProduct.has(product.id)) {
      toast.info("Este producto ya tiene una acción abierta en Action Center.");
      return;
    }
    const p = priority(product);
    const stock = Math.max(0, Number(product.stock ?? 0));
    const minimum = Math.max(0, Number(product.low_stock_threshold ?? 0));
    const gap = Math.max(0, minimum - stock);
    try {
      await insertActivity.mutateAsync({
        product_id: product.id,
        type: "task",
        content: `[Inventory Intelligence] ${p.action}: ${product.name || "Producto"}${product.sku ? ` · SKU ${product.sku}` : ""}. Stock ${stock}, mínimo ${minimum}, brecha ${gap}.`,
        due_date: new Date(Date.now() + (stock === 0 ? 86400000 : 2 * 86400000)).toISOString(),
        completed: false,
      });
      toast.success(`Acción creada para ${product.name || "producto"}`);
    } catch {
      toast.error("No se pudo crear la acción de inventario.");
    }
  }

  const openCount = openByProduct.size;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.04] via-background to-background">
        <div className="p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Sparkles className="h-4 w-4" /> Nüva Action Center</div>
              <h2 className="mt-2 text-xl font-semibold">Convierte inventario crítico en trabajo operativo</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Las señales de Inventory Intelligence pueden convertirse en tareas trazables usando el modelo de actividades existente.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1"><Package className="h-3.5 w-3.5" /> {openCount} abiertas</Badge>
              <Button size="sm" variant="outline" onClick={() => navigate({ to: "/inventario-conteo" })}>
                <ScanBarcode className="mr-2 h-4 w-4" />
                Escanear / registrar
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric icon={<Package className="h-4 w-4" />} label="Candidatos" value={String(candidates.length)} />
            <Metric icon={<Clock3 className="h-4 w-4" />} label="Acciones abiertas" value={String(openCount)} />
            <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Tareas completadas" value={String(activities.filter((a) => a.type === "task" && a.completed && a.product_id).length)} />
          </div>

          <div className="mt-5 space-y-3">
            {candidates.length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No hay productos bajo mínimo. Inventory Intelligence no genera acciones artificiales.</div>
            ) : candidates.slice(0, 6).map((product) => {
              const p = priority(product);
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
                      <p className="mt-1 text-sm text-muted-foreground">Stock {Number(product.stock ?? 0)} · mínimo {Number(product.low_stock_threshold ?? 0)} · brecha {Math.max(0, Number(product.low_stock_threshold ?? 0) - Number(product.stock ?? 0))}</p>
                      <p className="mt-2 text-xs font-medium text-primary">Origen: Inventory Intelligence · acción: {p.action}</p>
                    </div>
                    <Button size="sm" className="shrink-0" disabled={!canWrite || !!existing || insertActivity.isPending} onClick={() => createAction(product)}>
                      {existing ? "Acción abierta" : insertActivity.isPending ? "Guardando…" : "Crear acción"}
                      {!existing && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">Las acciones usan stock y umbral configurados. No representan predicción de demanda ni asignan responsable cuando el modelo actual no dispone de uno.</p>
        </div>
      </Card>

      <ProductCodeRegistry products={products} />
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border bg-background/70 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-1 text-lg font-bold tabular-nums">{value}</p></div>;
}
