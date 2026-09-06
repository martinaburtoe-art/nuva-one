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

export function BusinessInsightCard({
  income,
  expense,
  inventoryValue,
  productsCount,
  salesCount,
}: BusinessInsightCardProps) {
  const hasData =
    income > 0 || expense > 0 || inventoryValue > 0 || productsCount > 0 || salesCount > 0;
  const net = income - expense;
  const margin = income > 0 ? (net / income) * 100 : 0;
  const expenseRatio = income > 0 ? (expense / income) * 100 : 0;

  let kind: "positive" | "warning" | "neutral" = "neutral";
  let title = "Tu resumen está listo para empezar a aprender";
  let explanation =
    "Registra ventas, gastos, inventario y clientes para que Nüva pueda construir una lectura cada vez más precisa.";
  let actionLabel = "Registrar una venta";
  let actionHref = "/sales";
  let Icon = Sparkles;
  let recommendation =
    "Completa una primera operación para desbloquear señales, comparaciones y recomendaciones más útiles.";
  let signalLabel = "Construyendo contexto";

  if (hasData && income > 0 && expense > income) {
    kind = "warning";
    signalLabel = "Revisar";
    title = "El flujo requiere atención";
    explanation = `Los gastos (${fmtCLP(expense)}) superan los ingresos (${fmtCLP(income)}), dejando un flujo neto de ${fmtCLP(net)}.`;
    actionLabel = "Analizar finanzas";
    actionHref = "/finance";
    Icon = CircleAlert;
    recommendation = "Revisa los gastos de mayor impacto antes de asumir nuevos compromisos de caja.";
  } else if (hasData && productsCount > 0 && inventoryValue > 0 && income === 0) {
    kind = "warning";
    signalLabel = "Activar ventas";
    title = "Tienes operación preparada, pero aún no hay ventas";
    explanation = `Hay ${productsCount} productos y un inventario aproximado de ${fmtCLP(inventoryValue)}, pero no aparecen ingresos registrados.`;
    actionLabel = "Registrar venta";
    actionHref = "/pos";
    Icon = Boxes;
    recommendation = "Registra una venta para comenzar a relacionar rotación, ingresos y stock.";
  } else if (hasData && income > 0 && net >= 0) {
    kind = "positive";
    signalLabel = "Tendencia positiva";
    title = "El negocio mantiene flujo positivo";
    explanation = `Ingresos por ${fmtCLP(income)}, flujo neto de ${fmtCLP(net)} y margen de ${margin.toFixed(1)}%.`;
    actionLabel = "Ver Nüva Intelligence";
    actionHref = "/nuva-intelligence";
    Icon = TrendingUp;
    recommendation = "Profundiza en qué ventas, productos y clientes están impulsando el resultado.";
  }

  const tone =
    kind === "warning"
      ? "border-warning/30 bg-warning/[0.06]"
      : kind === "positive"
        ? "border-success/30 bg-success/[0.05]"
        : "border-primary/25 bg-primary/[0.05]";
  const iconTone =
    kind === "warning"
      ? "bg-warning/10 text-warning"
      : kind === "positive"
        ? "bg-success/10 text-success"
        : "bg-primary/10 text-primary";

  return (
    <div className="space-y-6">
      <Card className={`relative overflow-hidden p-6 ${tone}`}>
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                <span className={`grid h-8 w-8 place-items-center rounded-xl ${iconTone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span>Pulso de Nüva</span>
                <span className="rounded-full border bg-background/70 px-2.5 py-1 tracking-normal text-muted-foreground">
                  {signalLabel}
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{explanation}</p>
            </div>
            <Link to={actionHref} className="shrink-0">
              <Button size="lg">
                {actionLabel}
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {hasData && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryMetric label="Ingresos" value={fmtCLP(income)} />
              <SummaryMetric label="Gastos" value={fmtCLP(expense)} hint={income > 0 ? `${expenseRatio.toFixed(0)}% de ingresos` : undefined} />
              <SummaryMetric label="Flujo neto" value={fmtCLP(net)} hint={income > 0 ? `Margen ${margin.toFixed(1)}%` : undefined} />
              <SummaryMetric label="Operación" value={`${salesCount} ventas`} hint={`${productsCount} productos · ${fmtCLP(inventoryValue)} inventario`} />
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="rounded-2xl border bg-background/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recomendación de Nüva</p>
              <p className="mt-1 text-sm font-medium">{recommendation}</p>
            </div>
            <Link to="/nuva-intelligence" className="shrink-0">
              <Button variant="outline">
                Abrir Intelligence
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
      <NuvaOperatingPulse />
    </div>
  );
}

function SummaryMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-background/65 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
