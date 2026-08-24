import { useMemo, useState } from "react";
import { BarChart3, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCLP } from "@/lib/biz-data";

type Props = { purchases: any[]; products: any[] };
type Metric = "units" | "spend" | "orders";
type Period = "all" | "today" | "7d" | "30d" | "month" | "year" | "custom";

const PERIOD_LABELS: Record<Period, string> = {
  all: "Todo el historial", today: "Hoy", "7d": "Últimos 7 días", "30d": "Últimos 30 días",
  month: "Este mes", year: "Este año", custom: "Personalizado",
};

function startForPeriod(period: Period, now: Date) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  if (period === "today") return start;
  if (period === "7d") { start.setDate(start.getDate() - 6); return start; }
  if (period === "30d") { start.setDate(start.getDate() - 29); return start; }
  if (period === "month") { start.setDate(1); return start; }
  if (period === "year") { start.setMonth(0, 1); return start; }
  return null;
}

function endForPeriod(period: Period, now: Date) {
  if (period === "custom" || period === "all") return null;
  const end = new Date(now); end.setHours(23, 59, 59, 999); return end;
}

export function PurchasesProductAnalytics({ purchases, products }: Props) {
  const [period, setPeriod] = useState<Period>("30d");
  const [metric, setMetric] = useState<Metric>("units");
  const [topN, setTopN] = useState("10");
  const [supplier, setSupplier] = useState("all");
  const [status, setStatus] = useState("received");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const productMap = useMemo(() => {
    const map = new Map<string, any>();
    (products ?? []).forEach((p: any) => map.set(p.id, p));
    return map;
  }, [products]);
  const categories = useMemo(() => Array.from(new Set((products ?? []).map((p: any) => p.category).filter(Boolean))).sort(), [products]);
  const suppliers = useMemo(() => Array.from(new Set((purchases ?? []).map((p: any) => p.supplier_name).filter(Boolean))).sort(), [purchases]);

  const rows = useMemo(() => {
    const now = new Date();
    const start = period === "custom" && customFrom ? new Date(`${customFrom}T00:00:00`) : startForPeriod(period, now);
    const end = period === "custom" && customTo ? new Date(`${customTo}T23:59:59`) : endForPeriod(period, now);
    const grouped = new Map<string, { name: string; sku: string; category: string; units: number; spend: number; orders: number }>();

    for (const purchase of purchases ?? []) {
      if (status !== "all" && purchase.status !== status) continue;
      if (supplier !== "all" && purchase.supplier_name !== supplier) continue;
      const date = new Date(purchase.purchase_date);
      if (start && date < start) continue;
      if (end && date > end) continue;
      const items = Array.isArray(purchase.items) ? purchase.items : [];

      for (const item of items) {
        const product = item.product_id ? productMap.get(item.product_id) : undefined;
        const name = String(item.name || product?.name || "Producto sin nombre");
        const productCategory = String(item.category || product?.category || purchase.category || "Sin categoría");
        const sku = String(product?.sku || item.sku || "—");
        if (category !== "all" && productCategory !== category) continue;
        if (search && !`${name} ${sku}`.toLowerCase().includes(search.toLowerCase())) continue;
        const key = String(item.product_id || `free:${name.toLowerCase()}`);
        const current = grouped.get(key) ?? { name, sku, category: productCategory, units: 0, spend: 0, orders: 0 };
        const qty = Number(item.qty || 0);
        const cost = Number(item.price ?? item.cost ?? item.unit_cost ?? product?.cost ?? 0);
        current.units += qty;
        current.spend += qty * cost;
        current.orders += 1;
        grouped.set(key, current);
      }
    }

    return Array.from(grouped.values())
      .sort((a, b) => metric === "spend" ? b.spend - a.spend : metric === "orders" ? b.orders - a.orders : b.units - a.units)
      .slice(0, Number(topN));
  }, [purchases, products, productMap, period, metric, topN, supplier, status, category, search, customFrom, customTo]);

  const chartData = rows.map((row) => ({
    ...row,
    label: row.name.length > 26 ? `${row.name.slice(0, 26)}…` : row.name,
    value: metric === "spend" ? row.spend : metric === "orders" ? row.orders : row.units,
  }));
  const metricLabel = metric === "spend" ? "Gasto" : metric === "orders" ? "Órdenes" : "Unidades compradas";
  const hasActiveFilters = period !== "30d" || metric !== "units" || topN !== "10" || supplier !== "all" || status !== "received" || category !== "all" || Boolean(search) || Boolean(customFrom) || Boolean(customTo);
  function resetFilters() { setPeriod("30d"); setMetric("units"); setTopN("10"); setSupplier("all"); setStatus("received"); setCategory("all"); setSearch(""); setCustomFrom(""); setCustomTo(""); }

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="border-b p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><BarChart3 className="h-4 w-4" /> Análisis de compras</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Productos más comprados</h2>
            <p className="mt-1 text-sm text-muted-foreground">Identifica qué productos estás reponiendo, cuánto gastas y qué proveedores concentran tus compras.</p>
          </div>
          {hasActiveFilters && <Button variant="ghost" size="sm" onClick={resetFilters}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restablecer</Button>}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label className="text-xs">Periodo</Label><Select value={period} onValueChange={(v) => setPeriod(v as Period)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PERIOD_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Métrica</Label><Select value={metric} onValueChange={(v) => setMetric(v as Metric)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="units">Unidades compradas</SelectItem><SelectItem value="spend">Gasto generado</SelectItem><SelectItem value="orders">Número de órdenes</SelectItem></SelectContent></Select></div>
          <div><Label className="text-xs">Ranking</Label><Select value={topN} onValueChange={setTopN}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{[5, 10, 20, 50].map((n) => <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Buscar producto / SKU</Label><Input className="mt-1" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." /></div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" /> Filtros avanzados</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label className="text-xs">Proveedor</Label><Select value={supplier} onValueChange={setSupplier}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los proveedores</SelectItem>{suppliers.map((value: any) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Estado</Label><Select value={status} onValueChange={setStatus}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="received">Recibidas</SelectItem><SelectItem value="paid">Pagadas</SelectItem><SelectItem value="pending">Pendientes</SelectItem><SelectItem value="cancelled">Canceladas</SelectItem></SelectContent></Select></div>
          <div><Label className="text-xs">Categoría</Label><Select value={category} onValueChange={setCategory}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas las categorías</SelectItem>{categories.map((value: any) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Vista</Label><div className="mt-1 flex h-10 items-center rounded-md border px-3 text-xs text-muted-foreground">Comparación por producto</div></div>
        </div>
        {period === "custom" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Label className="text-xs">Desde</Label><Input className="mt-1" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></div><div><Label className="text-xs">Hasta</Label><Input className="mt-1" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></div></div>}
      </div>
      <div className="p-5 md:p-6">
        {chartData.length === 0 ? <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">No hay productos que coincidan con los filtros seleccionados.</div> : <div className="h-[360px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 18, left: 12, bottom: 4 }}><CartesianGrid horizontal={false} strokeDasharray="3 3" /><XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} /><YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} /><Tooltip cursor={{ opacity: 0.08 }} formatter={(value: number) => [metric === "units" || metric === "orders" ? value.toLocaleString("es-CL") : fmtCLP(value), metricLabel]} labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? "Producto"} /><Bar dataKey="value" name={metricLabel} radius={[0, 6, 6, 0]} maxBarSize={28} /></BarChart></ResponsiveContainer></div>}
        {chartData.length > 0 && <div className="mt-4 overflow-x-auto rounded-xl border"><table className="w-full min-w-[620px] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3 text-right">Unidades</th><th className="px-4 py-3 text-right">Gasto</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.name}-${index}`} className="border-t"><td className="px-4 py-3 font-semibold">{index + 1}</td><td className="px-4 py-3 font-medium">{row.name}</td><td className="px-4 py-3 text-muted-foreground">{row.sku}</td><td className="px-4 py-3 text-right tabular-nums">{row.units.toLocaleString("es-CL")}</td><td className="px-4 py-3 text-right tabular-nums">{fmtCLP(row.spend)}</td></tr>)}</tbody></table></div>}
      </div>
    </Card>
  );
}
