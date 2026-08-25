import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  CircleAlert,
  DatabaseZap,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

type Intelligence = {
  health: number;
  momentum: number;
  liquidity: number;
  dataReadiness: number;
  execution: number;
  controls: number;
  current30: number;
  previous30: number;
  recentCash: number;
  reconciliationOpen: number;
};

type Props = {
  sales: number;
  customers: number;
  products: number;
  openTasks: number;
  overdueTasks: number;
  intelligence?: Intelligence;
};

export function BusinessHealthCard({
  sales,
  customers,
  products,
  openTasks,
  overdueTasks,
  intelligence,
}: Props) {
  const health = intelligence?.health ?? 0;
  const tone = health >= 80 ? "text-success" : health >= 60 ? "text-warning" : "text-destructive";
  const label = health >= 80 ? "Saludable" : health >= 60 ? "Requiere atención" : "Prioridad alta";
  const domains = intelligence
    ? [
        { label: "Momentum comercial", value: intelligence.momentum, icon: TrendingUp },
        { label: "Liquidez", value: intelligence.liquidity, icon: Wallet },
        { label: "Calidad de datos", value: intelligence.dataReadiness, icon: DatabaseZap },
        { label: "Ejecución", value: intelligence.execution, icon: Zap },
        { label: "Controles", value: intelligence.controls, icon: ShieldCheck },
      ]
    : [
        { label: "Ventas", value: Math.min(100, sales * 10), icon: BarChart3 },
        { label: "Clientes", value: Math.min(100, customers * 10), icon: Users },
        { label: "Inventario", value: Math.min(100, products * 5), icon: Boxes },
        {
          label: "Ejecución",
          value:
            openTasks === 0
              ? 100
              : Math.max(0, Math.round(100 - (overdueTasks / Math.max(openTasks, 1)) * 100)),
          icon: Zap,
        },
      ];
  return (
    <Card className="relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Nüva Intelligence
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Salud inteligente del negocio
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Señales cruzadas de operación, finanzas, datos y ejecución.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-4xl font-bold tabular-nums ${tone}`}>{health}</div>
            <div>
              <div className={`text-sm font-semibold ${tone}`}>{label}</div>
              <div className="text-xs text-muted-foreground">sobre 100</div>
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {domains.map(({ label: domainLabel, value, icon: Icon }) => (
            <div key={domainLabel} className="rounded-2xl border bg-background/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  {domainLabel}
                </div>
                <span className="text-sm font-bold tabular-nums">{value}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {overdueTasks > 0 ? (
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            )}
            <div>
              <p className="text-sm font-semibold">
                {overdueTasks > 0
                  ? `Tienes ${overdueTasks} tarea${overdueTasks === 1 ? "" : "s"} vencida${overdueTasks === 1 ? "" : "s"}.`
                  : "La ejecución comercial no muestra tareas vencidas."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {intelligence?.reconciliationOpen
                  ? `${intelligence.reconciliationOpen} fuente${intelligence.reconciliationOpen === 1 ? "" : "s"} financiera${intelligence.reconciliationOpen === 1 ? "" : "s"} requieren revisión.`
                  : "Las señales financieras no muestran conciliaciones abiertas."}
              </p>
            </div>
          </div>
          <Link to="/customer-action-center" className="shrink-0">
            <span className="inline-flex items-center text-sm font-semibold text-primary">
              Ver prioridades <ArrowRight className="ml-1 h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    </Card>
  );
}
