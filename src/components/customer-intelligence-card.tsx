import {
  AlertTriangle,
  ArrowRight,
  Crown,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtCLP } from "@/lib/biz-data";

type Customer = {
  id: string;
  name: string;
  status: string;
  pipeline_stage?: string | null;
  last_contacted_at?: string | null;
};
type CustomerSale = {
  customer_id?: string | null;
  total?: number | string | null;
  sale_date: string;
};
type CustomerQuote = {
  customer_id?: string | null;
  total?: number | string | null;
  status?: string | null;
  created_at: string;
};
type CustomerStats = { total: number; count: number; last: string | null };
type Priority = {
  customer: Customer;
  score: number;
  health: ReturnType<typeof healthBreakdown>;
  reason: string;
};

type Props = {
  customers: Customer[];
  sales: CustomerSale[];
  quotes: CustomerQuote[];
  onViewCustomers?: () => void;
  onAskAI?: () => void;
};

function healthBreakdown(stats: CustomerStats | undefined, maxTotal: number) {
  if (!stats?.count || !stats.last) return null;
  const days = Math.max(0, (Date.now() - new Date(stats.last).getTime()) / 86400000);
  const recency = Math.round(Math.max(0, 100 - days * 2.5));
  const frequency = Math.round(Math.min(100, stats.count * 12.5));
  const value = Math.round(maxTotal > 0 ? Math.min(100, (stats.total / maxTotal) * 100) : 0);
  const score = Math.round(recency * 0.45 + frequency * 0.25 + value * 0.3);
  return { score, recency, frequency, value, days: Math.round(days) };
}

export function CustomerIntelligenceCard({
  customers,
  sales,
  quotes,
  onViewCustomers,
  onAskAI,
}: Props) {
  const stats = new Map<string, CustomerStats>();
  for (const sale of sales ?? []) {
    if (!sale.customer_id) continue;
    const current = stats.get(sale.customer_id) ?? { total: 0, count: 0, last: null };
    current.total += Number(sale.total) || 0;
    current.count += 1;
    if (!current.last || new Date(sale.sale_date).getTime() > new Date(current.last).getTime())
      current.last = sale.sale_date;
    stats.set(sale.customer_id, current);
  }

  const active = customers.filter((c) => c.status === "active");
  const maxTotal = Math.max(0, ...active.map((c) => stats.get(c.id)?.total ?? 0));
  const highValue = active
    .filter((c) => (stats.get(c.id)?.total ?? 0) > 0)
    .sort((a, b) => (stats.get(b.id)?.total ?? 0) - (stats.get(a.id)?.total ?? 0))
    .slice(0, 3);
  const pendingQuotes = new Map<string, number>();
  for (const q of quotes ?? []) {
    if (!q.customer_id || !["draft", "sent", "pending"].includes(String(q.status))) continue;
    pendingQuotes.set(q.customer_id, (pendingQuotes.get(q.customer_id) ?? 0) + 1);
  }

  const priorities: Priority[] = [];
  for (const customer of active) {
    const s = stats.get(customer.id);
    const health = healthBreakdown(s, maxTotal);
    if (!health) continue;
    const quoteCount = pendingQuotes.get(customer.id) ?? 0;
    const risk = Math.max(0, 100 - health.score);
    const quoteSignal = Math.min(25, quoteCount * 10);
    const valueSignal = maxTotal > 0 ? Math.min(20, ((s?.total ?? 0) / maxTotal) * 20) : 0;
    const priorityScore = Math.round(risk * 0.55 + quoteSignal + valueSignal);
    if (health.days >= 30 || quoteCount > 0) {
      const reason =
        quoteCount > 0 && health.days >= 30
          ? `${quoteCount} cotización${quoteCount === 1 ? "" : "es"} pendiente${quoteCount === 1 ? "" : "s"} · ${health.days} días sin compra`
          : quoteCount > 0
            ? `${quoteCount} cotización${quoteCount === 1 ? "" : "es"} requiere${quoteCount === 1 ? "" : "n"} seguimiento`
            : `${health.days} días desde la última compra`;
      priorities.push({ customer, score: priorityScore, health, reason });
    }
  }
  priorities.sort((a, b) => b.score - a.score);

  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const priorityCustomer = priorities[0];
  const atRiskCount = active.filter((c) => {
    const health = healthBreakdown(stats.get(c.id), maxTotal);
    return !!health && health.score < 60;
  }).length;
  const proposalCustomers = pendingQuotes.size;

  const title = !customers.length
    ? "Nüva todavía está aprendiendo de tus clientes"
    : priorities.length > 0
      ? `${priorities.length} prioridad${priorities.length === 1 ? "" : "es"} comerciales requieren atención`
      : "Tu cartera está generando señales comerciales útiles";

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.045] via-background to-background">
      <div className="p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-4 w-4" /> Nüva Intelligence · CRM
            </div>
            <h3 className="text-xl font-semibold tracking-tight">
              Nüva encontró algo que deberías saber
            </h3>
            <p className="mt-3 text-lg font-semibold">{title}</p>
          </div>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
            {priorities.length > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5 text-success" />
            )}
            {priorities.length > 0 ? "Atención" : "Oportunidad"}
          </Badge>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Metric icon={Users} label="Clientes activos" value={String(active.length)} />
          <Metric icon={Crown} label="Clientes de alto valor" value={String(highValue.length)} />
          <Metric icon={AlertTriangle} label="Health en riesgo" value={String(atRiskCount)} />
          <Metric icon={Target} label="Ventas registradas" value={fmtCLP(totalRevenue)} />
        </div>

        {priorityCustomer && (
          <div className="mt-5 rounded-xl border border-warning/20 bg-warning/[0.035] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-warning">
                  Prioridad #1 · Impacto {priorityCustomer.score}/100
                </p>
                <p className="mt-1 text-base font-semibold">{priorityCustomer.customer.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {priorityCustomer.reason} · Health {priorityCustomer.health?.score}/100
                </p>
              </div>
              <Badge variant="outline" className="border-warning/30 text-warning">
                Acción recomendada
              </Badge>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <MiniScore label="Recencia" value={priorityCustomer.health?.recency ?? 0} />
              <MiniScore label="Frecuencia" value={priorityCustomer.health?.frequency ?? 0} />
              <MiniScore label="Valor" value={priorityCustomer.health?.value ?? 0} />
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Prioridades ordenadas por impacto
            </p>
            <div className="mt-3 space-y-2">
              {priorities.slice(0, 3).map((item, index) => (
                <div
                  key={item.customer.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      #{index + 1} · {item.customer.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {item.score}
                  </Badge>
                </div>
              ))}
              {!priorities.length && (
                <p className="text-sm text-muted-foreground">
                  No se detectan prioridades críticas con los datos disponibles.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Siguiente decisión
            </p>
            <p className="mt-2 text-sm leading-6">
              {priorityCustomer
                ? `Prioriza a ${priorityCustomer.customer.name}: ${priorityCustomer.reason.toLowerCase()}. El objetivo es proteger el valor de la relación y convertir la señal en una acción comercial.`
                : proposalCustomers > 0
                  ? "Haz seguimiento de las cotizaciones pendientes para convertir oportunidades en ventas."
                  : "Revisa tus clientes de mayor valor y busca oportunidades de recompra o expansión."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={onViewCustomers}>
                Ver prioridades <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={onAskAI}>
                Preguntar a Nüva IA
              </Button>
            </div>
          </div>
        </div>

        {highValue.length > 0 && (
          <div className="mt-5 rounded-xl border bg-background/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Clientes de mayor valor
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {highValue.map((customer) => {
                const health = healthBreakdown(stats.get(customer.id), maxTotal);
                return (
                  <div key={customer.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium">{customer.name}</p>
                      {health && (
                        <span className="text-xs font-semibold text-primary">
                          {health.score}/100
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-bold tabular-nums">
                      {fmtCLP(stats.get(customer.id)?.total ?? 0)}
                    </p>
                    {health && (
                      <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                        <span>R {health.recency}</span>
                        <span>F {health.frequency}</span>
                        <span>V {health.value}</span>
                      </div>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">Customer Health Score</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background/60 p-2.5">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
