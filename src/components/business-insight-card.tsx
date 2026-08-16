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

  let kind: "positive" | "warning" | "neutral" = "neutral";
  let title = "Nüva está listo para encontrar tu primera señal";
  let explanation = "Cuando conectes ventas, gastos o inventario, Nüva podrá transformar tus datos en señales y acciones concretas.";
  let actionLabel = "Registrar una venta";
  let actionHref = "/sales";
  let Icon = Sparkles;
  let recommendation = "Registra algunos datos para que Nüva pueda empezar a detectar patrones relevantes.";
  let signalLabel = "Observando";

  if (hasData && income > 0 && expense > income) {
    kind = "warning";
    signalLabel = "Atención";
    title = "Nüva encontró algo que deberías saber";
    explanation = `Tus gastos (${fmtCLP(expense)}) superan tus ingresos (${fmtCLP(income)}). Tu flujo neto actual es ${fmtCLP(net)}.`;
    actionLabel = "Analizar finanzas";
    actionHref = "/finance";
    Icon = CircleAlert;
    recommendation = "Revisa los principales gastos antes de tomar nuevas decisiones de compra.";
  } else if (hasData && productsCount > 0 && inventoryValue > 0 && income === 0) {
    kind = "warning";
    signalLabel = "Atención";
    title = "Nüva encontró una oportunidad";
    explanation = `Tienes ${productsCount} productos y un inventario aproximado de ${fmtCLP(inventoryValue)}, pero todavía no aparecen ventas.`;
    actionLabel = "Registrar venta";
    actionHref = "/pos";
    Icon = Boxes;
    recommendation = "Registra tu primera venta para empezar a relacionar rotación, ingresos y stock.";
  } else if (hasData && income > 0 && net >= 0) {
    kind = "positive";
    signalLabel = "Oportunidad";
    title = "Nüva detecta una señal positiva";
    explanation = `Tus ingresos alcanzan ${fmtCLP(income)} y tu flujo neto es ${fmtCLP(net)}. Tu margen actual es ${margin.toFixed(1)}%.`;
    actionLabel = "Preguntar a Nüva IA";
    actionHref = "/ai";
    Icon = TrendingUp;
    recommendation = "Profundiza en qué ventas, productos o clientes están impulsando este resultado.";
  }

  const tone = kind === "warning" ? "border-warning/30 bg-warning/[0.06]" : kind === "positive" ? "border-success/30 bg-success/[0.05]" : "border-primary/25 bg-primary/[0.05]";
  const iconTone = kind === "warning" ? "bg-warning/10 text-warning" : kind === "positive" ? "bg-success/10 text-success" : "bg-primary/10 text-primary";
  const nextStep = kind === "warning" ? "Atiende esta señal antes de tomar una nueva decisión." : kind === "positive" ? "Convierte esta señal en una oportunidad de crecimiento." : "Registra una primera operación para desbloquear análisis más precisos.";

  return (
    <div className="space-y-6">
      <Card className={`relative overflow-hidden p-6 ${tone}`}>
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                <span className={`grid h-8 w-8 place-items-center rounded-xl ${iconTone}`}><Icon className="h-4 w-4" /></span>
                <span>Nüva Intelligence</span>
                <span className="rounded-full border bg-background/70 px-2.5 py-1 tracking-normal text-muted-foreground">{signalLabel}</span>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{explanation}</p>
            </div>
            <Link to={actionHref} className="shrink-0"><Button size="lg">{actionLabel}<ArrowUpRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>

          {hasData && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border bg-background/65 p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ingresos</p><p className="mt-1 text-lg font-bold">{fmtCLP(income)}</p></div>
              <div className="rounded-2xl border bg-background/65 p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gastos</p><p className="mt-1 text-lg font-bold">{fmtCLP(expense)}</p>{income > 0 && <p className="mt-1 text-[11px] text-muted-foreground">{expenseRatio.toFixed(0)}% de ingresos</p>}</div>
              <div className="rounded-2xl border bg-background/65 p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Flujo neto</p><p className="mt-1 text-lg font-bold">{fmtCLP(net)}</p>{income > 0 && <p className="mt-1 text-[11px] text-muted-foreground">Margen {margin.toFixed(1)}%</p>}</div>
              <div className="rounded-2xl border bg-background/65 p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Operación</p><p className="mt-1 text-lg font-bold">{salesCount} ventas</p><p className="mt-1 text-[11px] text-muted-foreground">{productsCount} productos · {fmtCLP(inventoryValue)} inventario</p></div>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="rounded-2xl border bg-background/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recomendación de Nüva</p>
              <p className="mt-1 text-sm font-medium">{recommendation}</p>
            </div>
            <Link to="/ai" className="shrink-0"><Button variant="outline">Preguntar a Nüva IA<ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Siguiente decisión</p>
                <p className="mt-1 text-sm font-medium">{nextStep}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border bg-background/60 px-2.5 py-1">Datos del negocio</span>
            <span className="rounded-full border bg-background/60 px-2.5 py-1">Señal determinística</span>
            <span className="rounded-full border bg-background/60 px-2.5 py-1">Acción sugerida</span>
            <span className="rounded-full border bg-background/60 px-2.5 py-1">Siguiente decisión</span>
          </div>
        </div>
      </Card>

      <NuvaOperatingPulse />
    </div>
  );
}
