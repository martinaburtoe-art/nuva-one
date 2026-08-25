import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

type Sale = { total?: number | string | null; sale_date?: string | null };
type Activity = {
  completed?: boolean | null;
  due_date?: string | null;
  created_at?: string | null;
};
type Quote = { total?: number | string | null; status?: string | null; created_at?: string | null };

type Props = { sales?: Sale[]; activities?: Activity[]; quotes?: Quote[] };

function periodStats<T>(
  items: T[],
  dateOf: (item: T) => string | null | undefined,
  valueOf: (item: T) => number,
) {
  const now = Date.now();
  const day = 86400000;
  const currentStart = now - 30 * day;
  const previousStart = now - 60 * day;
  const current = items.filter((x) => {
    const d = new Date(dateOf(x) ?? 0).getTime();
    return d >= currentStart && d <= now;
  });
  const previous = items.filter((x) => {
    const d = new Date(dateOf(x) ?? 0).getTime();
    return d >= previousStart && d < currentStart;
  });
  const currentValue = current.reduce((s, x) => s + valueOf(x), 0);
  const previousValue = previous.reduce((s, x) => s + valueOf(x), 0);
  const change =
    previousValue === 0
      ? currentValue > 0
        ? 100
        : 0
      : Math.round(((currentValue - previousValue) / previousValue) * 100);
  return { currentValue, previousValue, change };
}

function Trend({
  label,
  change,
  positiveWhen = "up",
}: {
  label: string;
  change: number;
  positiveWhen?: "up" | "down";
}) {
  const neutral = change === 0;
  const positive = positiveWhen === "up" ? change > 0 : change < 0;
  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-lg font-bold tabular-nums">
          {change > 0 ? "+" : ""}
          {change}%
        </span>
        <span className="text-xs text-muted-foreground">vs. período anterior</span>
      </div>
    </div>
  );
}

export function NuvaTrendIntelligence({ sales = [], activities = [], quotes = [] }: Props) {
  const salesTrend = periodStats(
    sales,
    (s) => s.sale_date,
    (s) => Number(s.total ?? 0),
  );
  const activityTrend = periodStats(
    activities,
    (a) => a.created_at ?? a.due_date,
    () => 1,
  );
  const quoteTrend = periodStats(
    quotes,
    (q) => q.created_at,
    (q) => Number(q.total ?? 0),
  );
  const diagnosis =
    salesTrend.change > 0 && activityTrend.change < 0
      ? "Las ventas están creciendo mientras la actividad operativa cae. Nüva recomienda proteger la ejecución antes de acelerar nuevas iniciativas."
      : salesTrend.change > 0
        ? "La actividad comercial muestra una señal positiva: las ventas del período superan al período anterior."
        : salesTrend.change < 0
          ? "Las ventas registradas están por debajo del período anterior. Conviene revisar pipeline y prioridades comerciales."
          : "La señal comercial está estable. Revisa prioridades y oportunidades abiertas para encontrar el siguiente movimiento.";
  return (
    <Card className="border-primary/15">
      <div className="p-6 md:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Nüva Trend Intelligence
            </div>
            <h3 className="mt-1 text-xl font-semibold">¿Estamos mejorando o empeorando?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Compara los últimos 30 días con los 30 días anteriores usando datos disponibles.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Trend label="Ventas" change={salesTrend.change} />
          <Trend label="Actividad" change={activityTrend.change} />
          <Trend label="Valor cotizado" change={quoteTrend.change} />
        </div>
        <div className="mt-4 rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-semibold">Lectura Nüva</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{diagnosis}</p>
        </div>
      </div>
    </Card>
  );
}
