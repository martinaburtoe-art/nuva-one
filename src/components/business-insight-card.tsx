import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Boxes, CircleAlert, Sparkles, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtCLP } from "@/lib/biz-data";
import { NuvaOperatingPulse } from "@/components/nuva-operating-pulse";

type BusinessInsightCardProps = {
  income: number;
  expense: number;
  inventoryValue: number;
  productsCount: number;
  salesCount: number;
};

export function BusinessInsightCard({ income, expense, inventoryValue, productsCount, salesCount }: BusinessInsightCardProps) {
  const hasData = income > 0 || expense > 0 || inventoryValue > 0 || productsCount > 0 || salesCount > 0;
  const net = income - expense;
  const margin = income > 0 ? (net / income) * 100 : 0;
  const expenseRatio = income > 0 ? (expense / income) * 100 : 0;

  const state =
    hasData && income > 0 && expense > income
      ? { label: "Atención", title: "La operación financiera necesita atención", description: `Los gastos superan los ingresos en ${fmtCLP(expense - income)}.`, action: "Revisar finanzas", href: "/finance", Icon: CircleAlert, tone: "border-warning/30 bg-warning/[0.055]", iconTone: "bg-warning/10 text-warning" }
      : hasData && productsCount > 0 && income === 0
        ? { label: "Activar ventas", title: "Tienes operación preparada, pero aún no hay ventas", description: `${productsCount} productos y ${fmtCLP(inventoryValue)} en inventario están listos para operar.`, action: "Registrar venta", href: "/pos", Icon: Boxes, tone: "border-primary/25 bg-primary/[0.045]", iconTone: "bg-primary/10 text-primary" }
        : hasData && income > 0 && net >= 0
          ? { label: "Flujo positivo", title: "La operación mantiene un resultado positivo", description: `${fmtCLP(net)} de flujo neto con un margen de ${margin.toFixed(1)}%.`, action: "Profundizar en Intelligence", href: "/nuva-intelligence", Icon: TrendingUp, tone: "border-success/30 bg-success/[0.045]", iconTone: "bg-success/10 text-success" }
          : { label: "Construyendo contexto", title: "Nüva está preparando tu lectura operativa", description: "Registra operaciones para que el Resumen pueda detectar prioridades reales.", action: "Comenzar operación", href: "/sales", Icon: Sparkles, tone: "border-primary/25 bg-primary/[0.045]", iconTone: "bg-primary/10 text-primary" };

  const StateIcon = state.Icon;

  return (
    <div className="space-y-4">
      <Card className={`relative overflow-hidden p-5 md:p-6 ${state.tone}`}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${state.iconTone}`}><StateIcon className="h-4 w-4" /></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Pulso operativo</span>
                <span className="rounded-full border bg-background/70 px-2.5 py-1 text-[11px] font-semibold">{state.label}</span>
              </div>
              <h2 className="mt-4 max-w-3xl text-2xl font-bold tracking-tight md:text-3xl">{state.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{state.description}</p>
            </div>
            <Link to={state.href} className="shrink-0"><Button size="lg">{state.action}<ArrowUpRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <PulseMetric label="Ingresos" value={fmtCLP(income)} />
            <PulseMetric label="Gastos" value={fmtCLP(expense)} hint={income > 0 ? `${expenseRatio.toFixed(0)}% de ingresos` : "Sin base de comparación"} />
            <PulseMetric label="Flujo neto" value={fmtCLP(net)} hint={income > 0 ? `Margen ${margin.toFixed(1)}%` : "Esperando movimientos"} />
            <PulseMetric label="Operación" value={`${salesCount} ventas`} hint={`${productsCount} productos · ${fmtCLP(inventoryValue)} inventario`} />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="rounded-2xl border bg-background/70 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Rol del Resumen</p>
              <p className="mt-1 text-sm font-medium">Aquí ves qué está pasando. Cuando necesites entender por qué ocurre o qué oportunidad existe, pasa a Nüva Intelligence.</p>
            </div>
            <Link to="/executive-command-center" className="shrink-0"><Button variant="outline">Dirección ejecutiva<ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>
        </div>
      </Card>
      <NuvaOperatingPulse />
    </div>
  );
}

function PulseMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="rounded-2xl border bg-background/65 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold tabular-nums tracking-tight">{value}</p>{hint && <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{hint}</p>}</div>;
}
