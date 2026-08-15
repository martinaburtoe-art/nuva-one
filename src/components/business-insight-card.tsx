import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Boxes, CircleAlert, Sparkles, TrendingUp } from "lucide-react";
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

  if (hasData && income > 0 && expense > income) {
    kind = "warning";
    title = "Nüva encontró algo que deberías saber";
    explanation = `Tus gastos (${fmtCLP(expense)}) superan tus ingresos (${fmtCLP(income)}). Tu flujo neto actual es ${fmtCLP(net)}. Revisar los principales gastos es la prioridad.`;
    actionLabel = "Analizar finanzas";
    actionHref = "/finance";
    Icon = CircleAlert;
  } else if (hasData && productsCount > 0 && inventoryValue > 0 && income === 0) {
    kind = "warning";
    title = "Tienes inventario, pero todavía no estás viendo ventas";
    explanation = `Tu inventario representa aproximadamente ${fmtCLP(inventoryValue)}. Registrar tus primeras ventas permitirá a Nüva empezar a relacionar rotación, ingresos y stock.`;
    actionLabel = "Registrar venta";
    actionHref = "/pos";
    Icon = Boxes;
  } else if (hasData && income > 0 && net >= 0) {
    kind = "positive";
    title = "Nüva detecta una señal positiva";
    explanation = `Tus ingresos alcanzan ${fmtCLP(income)} y tu flujo neto es ${fmtCLP(net)}. Tu margen actual es ${margin.toFixed(1)}%. Ahora podemos profundizar en qué está impulsando el resultado.`;
    actionLabel = "Preguntar a Nüva IA";
    actionHref = "/ai";
    Icon = TrendingUp;
  }

  const tone = kind === "warning" ? "border-warning/30 bg-warning/[0.06]" : kind === "positive" ? "border-success/30 bg-success/[0.05]" : "border-primary/25 bg-primary/[0.05]";

  return (
    <Card className={`overflow-hidden p-6 ${tone}`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Icon className="h-4 w-4" /> Nüva Intelligence</div>
          <h2 className="mt-2 text-xl font-bold">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{explanation}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded-full border bg-background/70 px-2.5 py-1">Datos del negocio</span><span className="rounded-full border bg-background/70 px-2.5 py-1">Señal determinística</span><span className="rounded-full border bg-background/70 px-2.5 py-1">Acción sugerida</span></div>
        </div>
        <Link to={actionHref} className="shrink-0"><Button variant="outline">{actionLabel}<ArrowUpRight className="ml-1 h-4 w-4" /></Button></Link>
      </div>
    </Card>
  );
}
