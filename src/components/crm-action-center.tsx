import { ArrowRight, CheckCircle2, Clock3, Sparkles, Target, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBizInsert } from "@/lib/biz-data";
import { toast } from "sonner";

type Customer = { id: string; name: string; status: string; };
type Sale = { customer_id?: string | null; total?: number | null; sale_date?: string | null };
type Quote = { customer_id?: string | null; status?: string | null };

type Props = { customers: Customer[]; sales: Sale[]; quotes: Quote[]; canWrite?: boolean };

type Priority = Customer & { score: number; reason: string; action: string; lastPurchase: string | null; value: number };

const money = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export function CrmActionCenter({ customers, sales, quotes, canWrite = true }: Props) {
  const insertActivity = useBizInsert("customer_activities");
  const priorities = buildPriorities(customers, sales, quotes).slice(0, 5);

  async function createTask(p: Priority) {
    if (!canWrite) return;
    await insertActivity.mutateAsync({
      customer_id: p.id,
      type: "task",
      content: p.action,
      due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
      completed: false,
    });
    toast.success(`Tarea creada para ${p.name}`);
  }

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.05] via-background to-background">
      <div className="p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Sparkles className="h-4 w-4" /> Nüva Action Center</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Convierte las señales en acciones</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Nüva ordena las prioridades comerciales por impacto y te permite convertir una recomendación en una tarea real.</p>
          </div>
          <Badge variant="secondary" className="gap-1"><Target className="h-3.5 w-3.5" /> {priorities.length} prioridades</Badge>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric icon={<Target className="h-4 w-4" />} label="Prioridades" value={String(priorities.length)} />
          <Metric icon={<Users className="h-4 w-4" />} label="Clientes con señal" value={String(priorities.length)} />
          <Metric icon={<Clock3 className="h-4 w-4" />} label="Acción sugerida" value="Hoy" />
        </div>

        <div className="mt-6 space-y-3">
          {priorities.length === 0 ? (
            <div className="rounded-xl border bg-background/70 p-5 text-sm text-muted-foreground">No hay prioridades comerciales suficientes todavía. A medida que registres ventas y cotizaciones, Nüva irá detectando señales.</div>
          ) : priorities.map((p, index) => (
            <div key={p.id} className="rounded-xl border bg-background/75 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{p.name}</p><Badge variant="outline">Impacto {p.score}/100</Badge></div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.reason}</p>
                    <p className="mt-2 text-xs font-medium text-primary">Siguiente acción: {p.action}</p>
                  </div>
                </div>
                <Button size="sm" className="shrink-0" disabled={!canWrite || insertActivity.isPending} onClick={() => createTask(p)}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Crear tarea <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border bg-background/70 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-1 text-lg font-bold tabular-nums">{value}</p></div>;
}

function buildPriorities(customers: Customer[], sales: Sale[], quotes: Quote[]): Priority[] {
  const now = Date.now();
  const byCustomer = new Map<string, { value: number; count: number; last: string | null }>();
  for (const s of sales) {
    if (!s.customer_id) continue;
    const current = byCustomer.get(s.customer_id) ?? { value: 0, count: 0, last: null };
    current.value += Number(s.total) || 0;
    current.count += 1;
    if (s.sale_date && (!current.last || new Date(s.sale_date) > new Date(current.last))) current.last = s.sale_date;
    byCustomer.set(s.customer_id, current);
  }
  const pendingQuotes = new Map<string, number>();
  for (const q of quotes) {
    if (!q.customer_id || ["accepted", "rejected", "cancelled"].includes(String(q.status))) continue;
    pendingQuotes.set(q.customer_id, (pendingQuotes.get(q.customer_id) ?? 0) + 1);
  }
  return customers.map((c) => {
    const s = byCustomer.get(c.id) ?? { value: 0, count: 0, last: null };
    const days = s.last ? Math.max(0, Math.floor((now - new Date(s.last).getTime()) / 86400000)) : 999;
    const quoteCount = pendingQuotes.get(c.id) ?? 0;
    const recencyRisk = Math.min(45, days === 999 ? 35 : Math.max(0, days - 20) * 1.5);
    const valueImpact = Math.min(35, s.value > 0 ? Math.log10(s.value + 1) * 6 : 0);
    const quoteImpact = Math.min(20, quoteCount * 8);
    const score = Math.round(Math.min(100, recencyRisk + valueImpact + quoteImpact));
    const reason = quoteCount > 0 ? `${quoteCount} cotización(es) pendiente(s)${days > 30 ? ` y ${days} días sin compra` : ""}.` : days > 30 ? `${days} días desde la última compra.` : s.value > 0 ? `${money(s.value)} acumulados y señales de seguimiento.` : "Cliente nuevo sin actividad suficiente.";
    const action = quoteCount > 0 ? "dar seguimiento a la cotización" : days > 30 ? "reactivar el contacto" : "revisar oportunidad de recompra";
    return { ...c, score, reason, action, lastPurchase: s.last, value: s.value };
  }).filter((p) => p.score > 0).sort((a, b) => b.score - a.score);
}
