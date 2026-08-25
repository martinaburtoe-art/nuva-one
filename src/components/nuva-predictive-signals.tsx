import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";

type Sale = { total?: number | string | null; sale_date?: string | null };
type Quote = { total?: number | string | null; created_at?: string | null; status?: string | null };
type Activity = {
  completed?: boolean | null;
  due_date?: string | null;
  created_at?: string | null;
  type?: string | null;
};
type Props = { sales?: Sale[]; quotes?: Quote[]; activities?: Activity[] };
type Tone = "danger" | "warning" | "positive";
type SignalData = { tone: Tone; title: string; text: string; score: number; label: string };

const money = (n: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
const inDays = (value: string | null | undefined, days: number) =>
  !!value && Date.now() - new Date(value).getTime() <= days * 86400000;
const priorityLabel = (score: number) =>
  score >= 80 ? "Crítica" : score >= 60 ? "Alta" : score >= 35 ? "Moderada" : "Baja";

export function NuvaPredictiveSignals({ sales = [], quotes = [], activities = [] }: Props) {
  const recentSales = sales.filter((s) => inDays(s.sale_date, 30));
  const previousSales = sales.filter((s) => {
    if (!s.sale_date) return false;
    const age = (Date.now() - new Date(s.sale_date).getTime()) / 86400000;
    return age > 30 && age <= 60;
  });
  const recentRevenue = recentSales.reduce((sum, s) => sum + Number(s.total ?? 0), 0);
  const previousRevenue = previousSales.reduce((sum, s) => sum + Number(s.total ?? 0), 0);
  const salesDelta = previousRevenue
    ? ((recentRevenue - previousRevenue) / previousRevenue) * 100
    : 0;
  const pendingQuotes = quotes.filter(
    (q) => !["won", "lost", "cancelled"].includes(String(q.status ?? "").toLowerCase()),
  );
  const recentQuoteValue = pendingQuotes
    .filter((q) => inDays(q.created_at, 30))
    .reduce((sum, q) => sum + Number(q.total ?? 0), 0);
  const tasks = activities.filter((a) => a.type === "task");
  const overdue = tasks.filter(
    (a) => !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now(),
  ).length;
  const signals: SignalData[] = [];

  if (salesDelta <= -15 && recentQuoteValue <= previousRevenue)
    signals.push({
      tone: "danger",
      title: "Riesgo de desaceleración",
      text: `Las ventas de 30 días están ${Math.abs(Math.round(salesDelta))}% por debajo del período anterior y el pipeline reciente no compensa la caída.`,
      score: Math.min(100, 65 + Math.abs(salesDelta)),
      label: "Intervenir",
    });
  if (overdue >= 2)
    signals.push({
      tone: "warning",
      title: "Presión de ejecución",
      text: `${overdue} seguimientos están vencidos. Resolverlos puede ser más prioritario que abrir nuevas iniciativas.`,
      score: Math.min(100, 45 + overdue * 12),
      label: "Resolver",
    });
  if (salesDelta >= 15)
    signals.push({
      tone: "positive",
      title: "Aceleración comercial",
      text: `Las ventas recientes están ${Math.round(salesDelta)}% por encima del período anterior.`,
      score: Math.min(100, 40 + salesDelta),
      label: "Capitalizar",
    });
  if (pendingQuotes.length >= 3 && recentQuoteValue > 0)
    signals.push({
      tone: "positive",
      title: "Pipeline con oportunidad",
      text: `${pendingQuotes.length} cotizaciones siguen abiertas; el valor creado en los últimos 30 días es ${money(recentQuoteValue)}.`,
      score: Math.min(100, 45 + pendingQuotes.length * 8),
      label: "Priorizar",
    });

  const ordered = signals.sort((a, b) => b.score - a.score);
  const top = ordered[0];

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.04] via-background to-background">
      <div className="p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Nüva Predictive Signals
              </p>
              <h3 className="mt-1 text-xl font-semibold">
                Señales emergentes antes de que se conviertan en problemas
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Reglas transparentes sobre tendencias observables; no son predicciones de caja
                negra.
              </p>
            </div>
          </div>
          {top && (
            <div className="rounded-full border bg-background/80 px-3 py-1.5 text-xs font-semibold">
              Señal principal · {top.score}/100
            </div>
          )}
        </div>
        {top && (
          <div className="mt-5 rounded-xl border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{top.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border px-2 py-1 text-[11px] font-semibold">
                  {priorityLabel(top.score)}
                </span>
                <span className="text-xs font-semibold text-primary">{top.label}</span>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{top.text}</p>
          </div>
        )}
        <div className="mt-4 space-y-3">
          {ordered.slice(0, 3).map((s) => (
            <Signal key={s.title} {...s} />
          ))}
          {!ordered.length && (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Sin señales emergentes suficientes con la evidencia disponible.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function Signal({ tone, title, text, score, label }: SignalData) {
  const Icon =
    tone === "danger"
      ? ShieldAlert
      : tone === "warning"
        ? AlertTriangle
        : title.includes("Aceleración")
          ? ArrowUpRight
          : ArrowDownRight;
  return (
    <div className="flex gap-3 rounded-xl border bg-muted/20 p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">{title}</p>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {score}/100 · {label}
          </span>
        </div>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
