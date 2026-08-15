import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Boxes, CircleAlert, Sparkles, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtCLP } from "@/lib/biz-data";

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

  let kind: "positive" | "warning" | "neutral" = "neutral";
  let title = "Nüva está listo para encontrar tu primera señal";
  let explanation = "Cuando conectes ventas, gastos o inventario, Nüva podrá transformar tus datos en señales y acciones concretas.";
  let actionLabel = "Registrar una venta";
  let actionHref = "/sales";
  let Icon = Sparkles;
  let eyebrow = "Observando tu negocio";
  let recommendation = "Registra algunos datos para activar Intelligence.";

  if (hasData && income > 0 && expense > income) {
    kind = "warning";
    title = "Tus gastos están bajo presión";
    explanation = `Nüva detectó que tus gastos (${fmtCLP(expense)}) superan tus ingresos (${fmtCLP(income)}). Tu flujo neto actual es ${fmtCLP(net)}.`;
    actionLabel = "Analizar finanzas";
    actionHref = "/finance";
    Icon = CircleAlert;
    eyebrow = "Nüva encontró algo que deberías saber";
    recommendation = "Revisa los principales gastos antes de tomar nuevas decisiones de compra.";
  } else if (hasData && productsCount > 0 && inventoryValue > 0 && income === 0) {
    kind = "warning";
    title = "Tienes inventario, pero todavía no estás viendo ventas";
    explanation = `Tu inventario representa aproximadamente ${fmtCLP(inventoryValue)}. Registrar tus primeras ventas permitirá a Nüva relacionar rotación, ingresos y stock.`;
    actionLabel = "Registrar venta";
    actionHref = "/pos";
    Icon = Boxes;
    eyebrow = "Nüva encontró una oportunidad";
    recommendation = "Registra tu primera venta para comenzar a medir qué productos están funcionando.";
  } else if (hasData && income > 0 && net >= 0) {
    kind = "positive";
    title = "Tu negocio mantiene un resultado positivo";
    explanation = `Tus ingresos alcanzan ${fmtCLP(income)} y tu flujo neto es ${fmtCLP(net)}, con un margen actual de ${margin.toFixed(1)}%.`;
    actionLabel = "Preguntar a Nüva IA";
    actionHref = "/ai";
    Icon = TrendingUp;
    eyebrow = "Nüva detecta una señal positiva";
    recommendation = "Profundiza en qué productos, ventas o clientes están impulsando este resultado.";
  }

  const tone = kind === "warning" ? "border-warning/30 bg-warning/[0.06]" : kind === "positive" ? "border-success/30 bg-success/[0.05]" : "border-primary/25 bg-primary/[0.05]";
  const iconTone = kind === "warning" ? "bg-warning/10 text-warning" : kind === "positive" ? "bg-success/10 text-success" : "bg-primary/10 text-primary";

  return (
    <Card className={`relative overflow-hidden p-6 ${tone}`}>
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            <span className={`grid h-8 w-8 place-items-center rounded-xl ${iconTone}`}><Icon className="h-4 w-4" /></span>
            <span>Nüva Intelligence</span>
            <span className="rounded-full border bg-background/70 px-2.5 py-1 tracking-normal text-muted-foreground">{eyebrow}</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{explanation}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="rounded-2xl border bg-background/75 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recomendación de Nüva</p>
              <p className="mt-1 text-sm font-medium">{recommendation}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border bg-background/60 px-2.5 py-1">Datos reales del negocio</span>
              <span className="rounded-full border bg-background/60 px-2.5 py-1">Señal explicable</span>
              <span className="rounded-full border bg-background/60 px-2.5 py-1">Acción sugerida</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Link to={actionHref} className="shrink-0"><Button size="lg">{actionLabel}<ArrowUpRight className="ml-1 h-4 w-4" /></Button></Link>
          <Link to="/ai" className="shrink-0"><Button variant="outline" size="lg">Preguntar a Nüva IA<ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
        </div>
      </div>
    </Card>
  );
}
