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
  loading?: boolean;
};

export function NuvaFinancialControl({ income, expense, inventoryValue, loading = false }: Props) {
  const control = useMemo(() => {
    const net = income - expense;
    const expenseRatio = income > 0 ? (expense / income) * 100 : 0;
    const margin = income > 0 ? (net / income) * 100 : 0;
    const signal = income <= 0 ? "setup" : margin >= 25 ? "good" : margin >= 10 ? "watch" : "alert";
    const scale = Math.max(income, expense, 1);
    return {
      net,
      expenseRatio,
      margin,
      signal,
      incomeWidth: Math.max(0, Math.min(100, (income / scale) * 100)),
      expenseWidth: Math.max(0, Math.min(100, (expense / scale) * 100)),
    };
  }, [income, expense]);

  const signalCopy = {
    setup: "Necesitamos más movimientos para generar una lectura financiera confiable.",
    good: "La relación entre ingresos y gastos muestra una posición saludable.",
    watch: "Tus gastos están consumiendo una parte relevante de los ingresos. Conviene revisar categorías.",
    alert: "Los gastos están presionando el resultado. Revisa egresos y flujo antes de asumir nuevos compromisos.",
  }[control.signal];

  const signalTone = control.signal === "good"
    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
    : control.signal === "setup"
      ? "border-white/15 bg-white/5 text-slate-200"
      : control.signal === "watch"
        ? "border-amber-300/20 bg-amber-400/10 text-amber-100"
        : "border-rose-300/20 bg-rose-400/10 text-rose-100";

  return (
    <Card className="relative mb-6 overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-0 text-white shadow-xl shadow-indigo-950/15">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="relative p-5 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-cyan-200 shadow-inner">
                <Sparkles className="h-5 w-5" />
              </span>
              <Badge className="border border-white/15 bg-white/10 text-cyan-100 hover:bg-white/10">NÜVA · FINANCIAL INTELLIGENCE</Badge>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100">Control ejecutivo</span>
            </div>
            <h2 className="mt-4 max-w-2xl text-xl font-semibold tracking-tight sm:text-2xl">El estado financiero de tu negocio, en una sola lectura.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {loading ? "Estamos consolidando tus movimientos para mostrar una lectura financiera fiable." : signalCopy}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/finance" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-black/10 transition hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-950">
                Abrir centro financiero <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="inline-flex min-h-10 items-center rounded-xl border border-white/15 bg-white/5 px-3 text-xs text-slate-300">Montos en pesos chilenos · CLP</span>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-white/15 bg-white/[0.07] p-4 shadow-2xl shadow-black/10 backdrop-blur-sm xl:max-w-[320px] xl:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-300">Resultado acumulado</span>
              <span className={control.net >= 0 ? "text-emerald-300" : "text-rose-300"}>
                {control.net >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </span>
            </div>
            <p className="mt-3 break-words text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">{loading ? "—" : fmtCLP(control.net)}</p>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
              <span className="text-xs text-slate-300">Margen estimado</span>
              <span className="text-sm font-semibold tabular-nums">{loading || income <= 0 ? "—" : `${control.margin.toFixed(1)}%`}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Margen estimado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loading || income <= 0 ? 0 : Math.max(0, Math.min(100, control.margin))}>
              <div className={`h-full rounded-full transition-all duration-500 ${control.margin >= 0 ? "bg-gradient-to-r from-cyan-300 to-emerald-300" : "bg-rose-400"}`} style={{ width: `${loading || income <= 0 ? 0 : Math.max(0, Math.min(100, control.margin))}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ControlMetric icon={<TrendingUp />} label="Ingresos acumulados" value={loading ? "—" : fmtCLP(income)} tone="cyan" />
          <ControlMetric icon={<TrendingDown />} label="Gastos acumulados" value={loading ? "—" : fmtCLP(expense)} tone="rose" />
          <ControlMetric icon={<Wallet />} label="Gasto / ingreso" value={loading || income <= 0 ? "—" : `${control.expenseRatio.toFixed(1)}%`} tone="amber" />
          <ControlMetric icon={<Wallet />} label="Capital en inventario" value={loading ? "—" : fmtCLP(inventoryValue)} tone="violet" />
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">Ingresos frente a gastos</p>
              <p className="mt-0.5 text-xs text-slate-400">Comparación relativa de los montos consolidados</p>
            </div>
            <Badge className="border border-white/15 bg-white/10 text-slate-200 hover:bg-white/10">{loading || income <= 0 ? "Sin base de comparación" : `${control.expenseRatio.toFixed(1)}% de ingresos`}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            <ComparisonBar label="Ingresos" value={loading ? "—" : fmtCLP(income)} width={loading ? 0 : control.incomeWidth} fill="bg-gradient-to-r from-cyan-300 to-sky-400" />
            <ComparisonBar label="Gastos" value={loading ? "—" : fmtCLP(expense)} width={loading ? 0 : control.expenseWidth} fill="bg-gradient-to-r from-rose-400 to-orange-300" />
          </div>
        </div>

        <div className={`mt-4 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${signalTone}`}>
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 shrink-0">
              {control.signal === "alert" || control.signal === "watch" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{loading ? "Preparando lectura" : control.signal === "good" ? "Señal financiera saludable" : control.signal === "setup" ? "Faltan movimientos para el análisis" : control.signal === "watch" ? "Conviene revisar la estructura de gastos" : "Resultado bajo presión"}</p>
              <p className="mt-0.5 text-xs leading-5 opacity-85">{loading ? "Los indicadores se actualizarán cuando termine la carga." : signalCopy}</p>
            </div>
          </div>
          <Link to="/finance" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold underline-offset-4 hover:underline">Ver análisis detallado <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
    </Card>
  );
}

function ControlMetric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "cyan" | "rose" | "amber" | "violet" }) {
  const tones = {
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    rose: "border-rose-300/20 bg-rose-300/10 text-rose-100",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    violet: "border-violet-300/20 bg-violet-300/10 text-violet-100",
  };
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs text-slate-300">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${tones[tone]}`}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-3 break-words text-lg font-semibold tracking-tight text-white tabular-nums">{value}</div>
    </div>
  );
}

function ComparisonBar({ label, value, width, fill }: { label: string; value: string; width: number; fill: string }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[100px_minmax(0,1fr)_auto]">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10" role="presentation">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${width}%` }} />
      </div>
      <span className="col-span-2 text-right text-xs font-semibold tabular-nums text-slate-200 sm:col-span-1">{value}</span>
    </div>
  );
}
