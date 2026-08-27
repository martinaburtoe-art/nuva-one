import { useMemo, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtCLP } from "@/lib/biz-data";

type Props = {
  income: number;
  expense: number;
  inventoryValue: number;
};

export function NuvaFinancialControl({ income, expense, inventoryValue }: Props) {
  const control = useMemo(() => {
    const net = income - expense;
    const expenseRatio = income > 0 ? (expense / income) * 100 : 0;
    const margin = income > 0 ? (net / income) * 100 : 0;
    const signal = income <= 0 ? "setup" : margin >= 25 ? "good" : margin >= 10 ? "watch" : "alert";
    return { net, expenseRatio, margin, signal };
  }, [income, expense]);

  const signalCopy = {
    setup: "Necesitamos más movimientos para generar una lectura financiera confiable.",
    good: "La relación entre ingresos y gastos muestra una posición saludable.",
    watch: "Tus gastos están consumiendo una parte relevante de los ingresos. Conviene revisar categorías.",
    alert: "Los gastos están presionando el resultado. Revisa egresos y flujo antes de asumir nuevos compromisos.",
  }[control.signal];

  return (
    <Card className="mb-6 overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.05] p-5 shadow-soft">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <Badge className="bg-primary text-primary-foreground">Control financiero inteligente</Badge>
          </div>
          <h2 className="mt-3 text-lg font-bold">Nüva interpreta tus números, no solo los muestra.</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{signalCopy}</p>
        </div>
        <Link
          to="/finance"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-accent"
        >
          Abrir finanzas <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ControlMetric icon={<Wallet />} label="Resultado acumulado" value={fmtCLP(control.net)} />
        <ControlMetric
          icon={control.net >= 0 ? <TrendingUp /> : <TrendingDown />}
          label="Margen estimado"
          value={`${control.margin.toFixed(1)}%`}
        />
        <ControlMetric icon={<TrendingDown />} label="Gasto / ingreso" value={`${control.expenseRatio.toFixed(1)}%`} />
        <ControlMetric icon={<Wallet />} label="Capital en inventario" value={fmtCLP(inventoryValue)} />
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          {control.signal === "alert" || control.signal === "watch" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          )}
          <div>
            <p className="text-sm font-medium">Lectura inteligente</p>
            <p className="text-xs text-muted-foreground">
              {control.signal === "good"
                ? "Sin alerta financiera prioritaria."
                : control.signal === "setup"
                  ? "Registra ingresos y egresos para activar más señales."
                  : "Hay una señal que conviene revisar."}
            </p>
          </div>
        </div>
        <Link to="/finance" className="text-xs font-semibold text-primary hover:underline">
          Ver análisis financiero
        </Link>
      </div>
    </Card>
  );
}

function ControlMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tracking-tight">{value}</div>
    </div>
  );
}
