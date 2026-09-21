import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileText,
  Gauge,
  History,
  Package,
  ShieldAlert,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import type { NuvaDecision } from "@/lib/nuva-decision-engine";

type Customer = { id?: string; name?: string; status?: string | null };
type Sale = { total?: number | string | null; status?: string | null };
type Activity = { type?: string | null; completed?: boolean | null; due_date?: string | null };
type Quote = { total?: number | string | null; status?: string | null };
type Product = { stock?: number | string | null; min_stock?: number | string | null; reorder_point?: number | string | null };
type Props = {
  customers?: Customer[];
  sales?: Sale[];
  activities?: Activity[];
  quotes?: Quote[];
  products?: Product[];
  executionScore?: number;
  decision: NuvaDecision;
  dataSources?: number;
  totalDataSources?: number;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);

const statusMeta = {
  critical: { label: "Atención crítica", icon: ShieldAlert },
  attention: { label: "Atención", icon: AlertTriangle },
  opportunity: { label: "Oportunidad", icon: Zap },
  stable: { label: "Estable", icon: CheckCircle2 },
} as const;

export function NuvaExecutiveCommandCenter({
  customers = [],
  sales = [],
  activities = [],
  quotes = [],
  products = [],
  executionScore = 0,
  decision,
  dataSources = 0,
  totalDataSources = 7,
}: Props) {
  const revenue = sales
    .filter((s) => !["cancelled", "canceled"].includes(String(s.status ?? "").toLowerCase()))
    .reduce((sum, s) => sum + Number(s.total ?? 0), 0);
  const activeCustomers = customers.filter((c) => c.status !== "inactive").length;
  const tasks = activities.filter((a) => a.type === "task");
  const overdue = tasks.filter(
    (a) => !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now(),
  ).length;
  const lowStock = products.filter(
    (p) => Number(p.stock ?? 0) <= Number(p.reorder_point ?? p.min_stock ?? 0) && Number(p.reorder_point ?? p.min_stock ?? 0) > 0,
  ).length;
  const pendingQuoteValue = quotes
    .filter((q) => !["won", "lost", "cancelled"].includes(String(q.status ?? "").toLowerCase()))
    .reduce((sum, q) => sum + Number(q.total ?? 0), 0);
  const meta = statusMeta[decision.status];
  const StatusIcon = meta.icon;
  const signal = decision.topSignal;
  const sourceCoverage = totalDataSources
    ? Math.round((dataSources / totalDataSources) * 100)
    : 0;

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-background">
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Zap className="h-4 w-4" /> Puesto de mando
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                Una prioridad, una acción, un resultado medible.
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                El Centro Ejecutivo usa el mismo Decision Engine que Nüva Intelligence. No crea
                una segunda lectura ni inventa un score paralelo.
              </p>
            </div>
            <div className="min-w-[180px] rounded-2xl border bg-background/80 px-5 py-4 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Gauge className="h-3.5 w-3.5" /> Prioridad Nüva
              </div>
              <div className="mt-1 text-3xl font-bold tabular-nums">{decision.score}</div>
              <div className="text-xs font-medium">/100 · {meta.label}</div>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={<Target className="h-4 w-4" />} label="Señales" value={String(decision.signals.length)} />
            <Metric icon={<CircleDollarSign className="h-4 w-4" />} label="Ventas registradas" value={money(revenue)} />
            <Metric icon={<Users className="h-4 w-4" />} label="Clientes activos" value={String(activeCustomers)} />
            <Metric icon={<History className="h-4 w-4" />} label="Tareas vencidas" value={String(overdue)} />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Signal icon={<Package className="h-4 w-4" />} label="Stock bajo mínimo" value={String(lowStock)} />
            <Signal icon={<FileText className="h-4 w-4" />} label="Pipeline abierto" value={money(pendingQuoteValue)} />
            <Signal
              icon={<Database className="h-4 w-4" />}
              label="Cobertura de datos"
              value={`${dataSources}/${totalDataSources} · ${sourceCoverage}%`}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Señal que gobierna la prioridad
                </p>
                <h3 className="mt-1 text-xl font-semibold">{signal.title}</h3>
              </div>
              <StatusIcon className="h-5 w-5" />
            </div>

            <div className="mt-5 rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold">{signal.explanation}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{signal.action}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border px-2.5 py-1 text-xs font-semibold">
                  {meta.label}
                </span>
                {signal.metric !== undefined && (
                  <span className="rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums">
                    {signal.metric.toLocaleString("es-CL")} {signal.unit ?? ""}
                  </span>
                )}
                <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                  Fuente: {signal.source.join(" · ")}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {decision.actions.slice(0, 2).map((action) => (
                <Link
                  key={action.id}
                  to={decisionDestinationRoute(action.destination)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  {action.cta} <ArrowUpRight className="h-4 w-4" />
                </Link>
              ))}
              <Link
                to="/nuva-intelligence"
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
              >
                Ver análisis <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Cadena de mando
            </p>
            <h3 className="mt-2 text-lg font-semibold">Del dato al aprendizaje</h3>
            <div className="mt-4 space-y-3 text-sm">
              <Step icon={<Target className="h-4 w-4" />} title="Detectar" detail="Nüva identifica la señal de mayor prioridad." />
              <Step icon={<Zap className="h-4 w-4" />} title="Decidir" detail="Eliges la acción sin salir del contexto." />
              <Step icon={<CheckCircle2 className="h-4 w-4" />} title="Ejecutar" detail="La acción se lleva al módulo operativo." />
              <Step icon={<History className="h-4 w-4" />} title="Aprender" detail="Resultados y decisiones quedan disponibles para seguimiento." />
            </div>
            <div className="mt-4 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
              Disciplina actual: <strong className="text-foreground">{executionScore}/100</strong>.
              Cobertura de datos: <strong className="text-foreground">{sourceCoverage}%</strong>.
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function decisionDestinationRoute(destination: string) {
  switch (destination) {
    case "inventory":
      return "/inventory";
    case "crm":
    case "customers":
      return "/customers";
    case "purchases":
      return "/purchases";
    case "finance":
      return "/finance";
    case "dashboard":
    default:
      return "/dashboard";
  }
}

function Step({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border p-3">
      <div className="mt-0.5 rounded-lg bg-accent p-2">{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Signal({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-background/60 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <span className="text-right font-semibold tabular-nums">{value}</span>
    </div>
  );
}
