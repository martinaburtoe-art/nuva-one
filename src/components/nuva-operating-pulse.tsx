import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, Mail, PhoneCall, Users, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBizList } from "@/lib/biz-data";

type Customer = {
  id: string;
  name: string;
  status: "lead" | "active" | "inactive";
  pipeline_stage: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  last_contacted_at: string | null;
};

type Activity = {
  customer_id: string;
  type: string;
  due_date: string | null;
  completed: boolean;
};

type Signal = { title: string; detail: string; href: "/customers" | "/quotes"; tone: "critical" | "attention" | "positive" };
const OPEN_STAGES = ["new", "contacted", "qualified", "proposal"];

export function NuvaOperatingPulse() {
  const { data: customers } = useBizList<Customer>("customers", { order: "name" });
  const { data: activities } = useBizList<Activity>("customer_activities", { order: "created_at", ascending: false });
  const { data: quotes } = useBizList<any>("quotes", { order: "created_at", ascending: false });
  const { data: sales } = useBizList<any>("sales", { order: "sale_date", ascending: false });

  const crm = useMemo(() => {
    const list = customers ?? [];
    const now = Date.now();
    const openPipeline = list.filter((c) => OPEN_STAGES.includes(c.pipeline_stage)).length;
    const prospects = list.filter((c) => c.status === "lead").length;
    const active = list.filter((c) => c.status === "active").length;
    const stale = list.filter((c) => {
      if (c.status === "inactive") return false;
      if (!c.last_contacted_at) return true;
      return now - new Date(c.last_contacted_at).getTime() > 14 * 24 * 60 * 60 * 1000;
    }).length;
    const pendingTasks = (activities ?? []).filter((a) => !a.completed && a.due_date && new Date(a.due_date).getTime() <= now).length;
    const openQuotes = (quotes ?? []).filter((q: any) => ["draft", "sent", "pending", "open"].includes(String(q.status ?? "").toLowerCase())).length;
    const revenue = (sales ?? []).filter((s: any) => !!s.customer_id).reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);
    return { total: list.length, active, prospects, openPipeline, stale, pendingTasks, openQuotes, revenue };
  }, [activities, customers, quotes, sales]);

  const signals = useMemo<Signal[]>(() => {
    const result: Signal[] = [];
    if (crm.pendingTasks) result.push({ title: "Seguimientos vencidos", detail: `${crm.pendingTasks} tarea(s) de clientes requieren atención inmediata.`, href: "/customers", tone: "critical" });
    if (crm.stale) result.push({ title: "Clientes en riesgo de enfriarse", detail: `${crm.stale} cliente(s) llevan más de 14 días sin contacto registrado.`, href: "/customers", tone: "attention" });
    if (crm.openQuotes) result.push({ title: "Cotizaciones por convertir", detail: `${crm.openQuotes} cotización(es) permanecen abiertas y pueden requerir seguimiento comercial.`, href: "/quotes", tone: "attention" });
    if (!result.length) result.push({ title: "Relación comercial bajo control", detail: "No detectamos seguimientos vencidos ni señales críticas en tu cartera.", href: "/customers", tone: "positive" });
    return result.slice(0, 3);
  }, [crm]);

  return (
    <Card className="mb-6 overflow-hidden border-primary/15 bg-gradient-to-br from-background via-primary/[0.025] to-background">
      <div className="border-b p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><WalletCards className="h-4 w-4" /> Nüva Operating Pulse</div>
            <h2 className="mt-1 text-lg font-semibold">Inteligencia comercial de tus clientes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Detecta oportunidades, riesgos y seguimientos antes de que se conviertan en ventas perdidas.</p>
          </div>
          <Badge variant="secondary" className="gap-1"><Clock3 className="h-3 w-3" /> CRM en tiempo real</Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Users} label="Clientes" value={crm.total} />
          <Metric icon={Users} label="Prospectos" value={crm.prospects} />
          <Metric icon={ArrowUpRight} label="Pipeline abierto" value={crm.openPipeline} />
          <Metric icon={CheckCircle2} label="Seguimientos pendientes" value={crm.pendingTasks} critical={crm.pendingTasks > 0} />
        </div>
      </div>
      <div className="grid gap-3 p-5 md:grid-cols-3 md:p-6">
        {signals.map((signal) => (
          <div key={signal.title} className="rounded-xl border bg-background/75 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className={`rounded-lg p-2 ${signal.tone === "critical" ? "bg-destructive/10 text-destructive" : signal.tone === "attention" ? "bg-amber-500/10 text-amber-600" : "bg-success/10 text-success"}`}>{signal.tone === "positive" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}</div>
              <Badge variant={signal.tone === "critical" ? "destructive" : signal.tone === "attention" ? "secondary" : "outline"}>{signal.tone === "critical" ? "Crítico" : signal.tone === "attention" ? "Atención" : "OK"}</Badge>
            </div>
            <h3 className="mt-3 text-sm font-semibold">{signal.title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.detail}</p>
            <Link to={signal.href} className="mt-3 inline-flex items-center text-xs font-semibold text-primary">Resolver ahora <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><PhoneCall className="h-3.5 w-3.5" /> {crm.active} clientes activos</span><span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {crm.openQuotes} cotizaciones abiertas</span><span>Ventas asociadas: {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(crm.revenue)}</span></div>
        <Button asChild size="sm" variant="outline"><Link to="/customers">Gestionar CRM <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
      </div>
    </Card>
  );
}

function Metric({ icon: Icon, label, value, critical }: { icon: typeof Users; label: string; value: number; critical?: boolean }) {
  return <div className="rounded-xl border bg-background/70 p-3"><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${critical ? "text-destructive" : "text-primary"}`} /><span className="text-[11px] text-muted-foreground">{label}</span></div><p className="mt-1 text-xl font-bold">{value}</p></div>;
}
