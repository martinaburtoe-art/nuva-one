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
    <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
      <div className="px-4 py-4 md:px-5 md:py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <WalletCards className="h-3.5 w-3.5" />
              Nüva Operating Pulse
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-base font-semibold tracking-tight">Inteligencia comercial</h2>
              <span className="hidden text-xs text-muted-foreground sm:inline">Señales de tu cartera y pipeline en tiempo real</span>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 gap-1 text-[11px] font-medium">
            <Clock3 className="h-3 w-3" /> CRM en tiempo real
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 divide-x divide-y overflow-hidden rounded-lg border bg-muted/20 md:grid-cols-4 md:divide-y-0">
          <Metric icon={Users} label="Clientes" value={crm.total} />
          <Metric icon={Users} label="Prospectos" value={crm.prospects} />
          <Metric icon={ArrowUpRight} label="Pipeline abierto" value={crm.openPipeline} />
          <Metric icon={CheckCircle2} label="Seguimientos pendientes" value={crm.pendingTasks} critical={crm.pendingTasks > 0} />
        </div>
      </div>

      <div className="border-t bg-muted/[0.08] px-4 py-4 md:px-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-foreground">Señales para actuar</p>
          <span className="text-[11px] text-muted-foreground">Actualizado automáticamente</span>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {signals.map((signal) => (
            <div key={signal.title} className="flex min-h-[104px] flex-col rounded-lg border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div className={`rounded-md p-1.5 ${signal.tone === "critical" ? "bg-destructive/10 text-destructive" : signal.tone === "attention" ? "bg-amber-500/10 text-amber-600" : "bg-success/10 text-success"}`}>
                  {signal.tone === "positive" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                </div>
                <Badge variant={signal.tone === "critical" ? "destructive" : signal.tone === "attention" ? "secondary" : "outline"} className="text-[10px]">
                  {signal.tone === "critical" ? "Crítico" : signal.tone === "attention" ? "Atención" : "OK"}
                </Badge>
              </div>
              <h3 className="mt-2 text-xs font-semibold">{signal.title}</h3>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{signal.detail}</p>
              <Link to={signal.href} className="mt-auto pt-2 text-[11px] font-semibold text-primary">
                Resolver ahora <ArrowUpRight className="ml-0.5 inline h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 md:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><PhoneCall className="h-3 w-3" /> {crm.active} activos</span>
          <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {crm.openQuotes} cotizaciones abiertas</span>
          <span>Ventas asociadas: {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(crm.revenue)}</span>
        </div>
        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
          <Link to="/customers">Gestionar CRM <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      </div>
    </Card>
  );
}

function Metric({ icon: Icon, label, value, critical }: { icon: typeof Users; label: string; value: number; critical?: boolean }) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${critical ? "text-destructive" : "text-primary"}`} />
        <span className="truncate text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-0.5 text-lg font-bold leading-none tracking-tight">{value}</p>
    </div>
  );
}
