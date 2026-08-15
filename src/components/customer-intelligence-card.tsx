import { AlertTriangle, ArrowRight, Crown, Sparkles, Target, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtCLP } from "@/lib/biz-data";

type Customer = { id: string; name: string; status: string; pipeline_stage?: string | null; last_contacted_at?: string | null };
type CustomerSale = { customer_id?: string | null; total?: number | string | null; sale_date: string };
type CustomerQuote = { customer_id?: string | null; total?: number | string | null; status?: string | null; created_at: string };

type Props = {
  customers: Customer[];
  sales: CustomerSale[];
  quotes: CustomerQuote[];
  onViewCustomers?: () => void;
  onAskAI?: () => void;
};

function healthScore(stats: { total: number; count: number; last: string | null } | undefined, maxTotal: number) {
  if (!stats?.count || !stats.last) return null;
  const days = Math.max(0, (Date.now() - new Date(stats.last).getTime()) / 86400000);
  const recency = Math.max(0, 100 - days * 2.5);
  const frequency = Math.min(100, stats.count * 12.5);
  const value = maxTotal > 0 ? Math.min(100, (stats.total / maxTotal) * 100) : 0;
  return Math.round(recency * 0.45 + frequency * 0.25 + value * 0.3);
}

export function CustomerIntelligenceCard({ customers, sales, quotes, onViewCustomers, onAskAI }: Props) {
  const now = Date.now();
  const stats = new Map<string, { total: number; count: number; last: string | null }>();
  for (const sale of sales ?? []) {
    if (!sale.customer_id) continue;
    const current = stats.get(sale.customer_id) ?? { total: 0, count: 0, last: null };
    current.total += Number(sale.total) || 0;
    current.count += 1;
    if (!current.last || new Date(sale.sale_date).getTime() > new Date(current.last).getTime()) current.last = sale.sale_date;
    stats.set(sale.customer_id, current);
  }

  const active = customers.filter((c) => c.status === "active");
  const maxTotal = Math.max(0, ...active.map((c) => stats.get(c.id)?.total ?? 0));
  const highValue = active.filter((c) => (stats.get(c.id)?.total ?? 0) > 0).sort((a, b) => (stats.get(b.id)?.total ?? 0) - (stats.get(a.id)?.total ?? 0)).slice(0, 3);
  const atRisk = active.filter((c) => {
    const last = stats.get(c.id)?.last;
    if (!last) return false;
    return (now - new Date(last).getTime()) / 86400000 >= 30;
  }).sort((a, b) => new Date(stats.get(a.id)?.last ?? 0).getTime() - new Date(stats.get(b.id)?.last ?? 0).getTime());
  const proposalCustomers = new Set((quotes ?? []).filter((q) => ["draft", "sent", "pending"].includes(String(q.status))).map((q) => q.customer_id).filter(Boolean));
  const priorities = atRisk.length + proposalCustomers.size;
  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  const title = !customers.length
    ? "Nüva todavía está aprendiendo de tus clientes"
    : priorities > 0
      ? `${priorities} prioridad${priorities === 1 ? "" : "es"} requieren atención`
      : "Tu cartera está generando señales comerciales útiles";

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.045] via-background to-background">
      <div className="p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-4 w-4" /> Nüva Intelligence · CRM
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Nüva encontró algo que deberías saber</h3>
            <p className="mt-3 text-lg font-semibold">{title}</p>
          </div>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
            {priorities > 0 ? <AlertTriangle className="h-3.5 w-3.5 text-warning" /> : <TrendingUp className="h-3.5 w-3.5 text-success" />}
            {priorities > 0 ? "Atención" : "Oportunidad"}
          </Badge>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Metric icon={Users} label="Clientes activos" value={String(active.length)} />
          <Metric icon={Crown} label="Clientes de alto valor" value={String(highValue.length)} />
          <Metric icon={AlertTriangle} label="En riesgo" value={String(atRisk.length)} />
          <Metric icon={Target} label="Ventas registradas" value={fmtCLP(totalRevenue)} />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prioridades</p>
            <div className="mt-3 space-y-2">
              {atRisk.slice(0, 3).map((customer) => {
                const score = healthScore(stats.get(customer.id), maxTotal);
                return (
                  <div key={customer.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div><p className="font-medium">{customer.name}</p><p className="text-xs text-muted-foreground">Sin compra reciente{score !== null ? ` · Health ${score}` : ""}</p></div>
                    <Badge variant="outline" className="text-warning">Revisar</Badge>
                  </div>
                );
              })}
              {proposalCustomers.size > 0 && <div className="rounded-lg border p-3 text-sm"><span className="font-medium">{proposalCustomers.size}</span> cliente{proposalCustomers.size === 1 ? "" : "s"} con cotizaciones que requieren seguimiento.</div>}
              {!atRisk.length && !proposalCustomers.size && <p className="text-sm text-muted-foreground">No se detectan prioridades críticas con los datos disponibles.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Siguiente decisión</p>
            <p className="mt-2 text-sm leading-6">
              {atRisk.length > 0
                ? "Prioriza el contacto con clientes que llevan más tiempo sin comprar y recupera actividad antes de perder la relación."
                : proposalCustomers.size > 0
                  ? "Haz seguimiento de las cotizaciones pendientes para convertir oportunidades en ventas."
                  : "Revisa tus clientes de mayor valor y busca oportunidades de recompra o expansión."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={onViewCustomers}>Ver prioridades <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={onAskAI}>Preguntar a Nüva IA</Button>
            </div>
          </div>
        </div>

        {highValue.length > 0 && (
          <div className="mt-5 rounded-xl border bg-background/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clientes de mayor valor</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {highValue.map((customer) => {
                const score = healthScore(stats.get(customer.id), maxTotal);
                return (
                  <div key={customer.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-medium">{customer.name}</p>{score !== null && <span className="text-xs font-semibold text-primary">{score}/100</span>}</div>
                    <p className="mt-1 text-sm font-bold tabular-nums">{fmtCLP(stats.get(customer.id)?.total ?? 0)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Customer Health Score · recencia + frecuencia + valor</p>
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

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return <div className="rounded-xl border bg-background/70 p-4"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold tabular-nums">{value}</p></div>;
}
