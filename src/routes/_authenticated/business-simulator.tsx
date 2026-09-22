import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBizList } from "@/lib/biz-data";
import { simulateBusiness } from "@/lib/nuva-business-simulator";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, WalletCards } from "lucide-react";

export const Route = createFileRoute("/_authenticated/business-simulator")({
  head: () => ({ meta: [{ title: "Simulador de Negocio — Nüva One" }] }),
  component: BusinessSimulator,
});

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;
const value = (n: number) => Number.isFinite(n) ? n : 0;

function BusinessSimulator() {
  const { data: sales = [], isLoading: salesLoading } = useBizList<any>("sales");
  const { data: purchases = [], isLoading: purchasesLoading } = useBizList<any>("purchases");
  const [fixedCost, setFixedCost] = useState(0);
  const [priceChange, setPriceChange] = useState(5);
  const [volumeChange, setVolumeChange] = useState(-3);

  const baseline = useMemo(() => ({
    revenue: sales.reduce((sum: number, row: any) => sum + value(row.total ?? row.amount), 0),
    variableCost: purchases.reduce((sum: number, row: any) => sum + value(row.total ?? row.amount), 0),
  }), [sales, purchases]);
  const result = simulateBusiness({ ...baseline, fixedCost, priceChangePct: priceChange, volumeChangePct: volumeChange });
  const loading = salesLoading || purchasesLoading;

  return <ModuleGuard module="dashboard"><div className="space-y-5 p-4 md:p-6">
    <PageHeader title="Nüva Business Simulator" description="Explora escenarios antes de tomar decisiones: precios, volumen y estructura de costos." />
    <Card className="rounded-2xl border-primary/20 bg-primary/[0.03] p-5">
      <div className="flex items-start gap-3"><Calculator className="mt-1 h-5 w-5 text-primary" /><div><h2 className="font-semibold">¿Qué pasa si...?</h2><p className="mt-1 text-sm text-muted-foreground">El escenario parte de ventas y compras reales del negocio. Los cambios son una simulación, no una predicción garantizada.</p></div></div>
    </Card>
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="space-y-5 rounded-2xl p-5">
        <div><Label>Costos fijos considerados</Label><Input className="mt-2" type="number" value={fixedCost} onChange={(e) => setFixedCost(value(Number(e.target.value)))} /></div>
        <div><Label>Cambio de precio (%)</Label><Input className="mt-2" type="number" value={priceChange} onChange={(e) => setPriceChange(value(Number(e.target.value)))} /></div>
        <div><Label>Cambio de volumen (%)</Label><Input className="mt-2" type="number" value={volumeChange} onChange={(e) => setVolumeChange(value(Number(e.target.value)))} /></div>
        <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">Base real: {sales.length} ventas y {purchases.length} compras registradas.</div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Metric title="Ingresos base" value={clp(result.baselineRevenue)} icon={<WalletCards className="h-4 w-4" />} />
        <Metric title="Ingresos simulados" value={clp(result.projectedRevenue)} icon={<TrendingUp className="h-4 w-4" />} badge={`${result.revenueDeltaPct >= 0 ? "+" : ""}${result.revenueDeltaPct.toFixed(1)}%`} />
        <Metric title="Resultado base" value={clp(result.baselineProfit)} />
        <Metric title="Resultado simulado" value={clp(result.projectedProfit)} badge={`${result.profitDeltaPct >= 0 ? "+" : ""}${result.profitDeltaPct.toFixed(1)}%`} />
        <Card className="rounded-2xl p-5 sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Margen simulado</p><p className="mt-2 text-3xl font-bold">{result.marginPct.toFixed(1)}%</p><p className="mt-2 text-sm text-muted-foreground">Escenario: precio {priceChange >= 0 ? "+" : ""}{priceChange}% · volumen {volumeChange >= 0 ? "+" : ""}{volumeChange}%.</p></Card>
      </div>
    </div>
    {loading && <p className="text-xs text-muted-foreground">Actualizando datos reales…</p>}
  </div></ModuleGuard>;
}

function Metric({ title, value, icon, badge }: { title: string; value: string; icon?: React.ReactNode; badge?: string }) {
  return <Card className="rounded-2xl p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>{icon}</div><p className="mt-2 text-2xl font-bold">{value}</p>{badge && <Badge variant={badge.startsWith("+") ? "default" : "secondary"} className="mt-2">{badge}</Badge>}</Card>;
}
