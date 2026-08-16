import { ArrowRight, BrainCircuit, CheckCircle2, CircleDot, Flag, History, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

type Activity = { id?: string; type?: string | null; title?: string | null; description?: string | null; completed?: boolean | null; created_at?: string | null; due_date?: string | null };
type Props = { activities?: Activity[] };

const age = (value?: string | null) => value ? (Date.now() - new Date(value).getTime()) / 86400000 : Infinity;

export function NuvaDecisionTimeline({ activities = [] }: Props) {
  const items = activities
    .filter((a) => a.type === "task" && a.created_at && age(a.created_at) <= 30)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
    .slice(0, 5);
  const completed = items.filter((a) => a.completed).length;
  const overdue = items.filter((a) => !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now()).length;
  const pending = Math.max(0, items.length - completed - overdue);
  const executionRate = items.length ? Math.round((completed / items.length) * 100) : 0;
  const latest = items[0];
  const flowState = overdue > 0 ? "Requiere intervención" : pending > 0 ? "En ejecución" : items.length ? "Ciclo completado" : "Esperando actividad";
  const stages = [
    { label: "Señal", detail: overdue ? `${overdue} acción${overdue === 1 ? "" : "es"} vencida${overdue === 1 ? "" : "s"}` : items.length ? "Actividad observada" : "Sin señales", icon: <Flag className="h-4 w-4" />, active: overdue > 0 || items.length > 0 },
    { label: "Decisión", detail: items.length ? "Prioridad operativa registrada" : "Esperando contexto", icon: <BrainCircuit className="h-4 w-4" />, active: items.length > 0 },
    { label: "Ejecución", detail: items.length ? `${completed}/${items.length} completadas` : "Sin acciones", icon: <CheckCircle2 className="h-4 w-4" />, active: completed > 0 },
    { label: "Resultado", detail: items.length ? "Evidencia en observación" : "Sin evidencia todavía", icon: <History className="h-4 w-4" />, active: completed > 0 },
  ];

  return <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.05] via-background to-background"><div className="p-6 md:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><CircleDot className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Nüva Decision Flow</p><h3 className="mt-1 text-xl font-semibold">Del diagnóstico al resultado</h3><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Una línea temporal ejecutiva que conecta señal, decisión, ejecución y evidencia sin fabricar causalidad.</p></div></div><div className="rounded-full border bg-background/80 px-3 py-1.5 text-xs font-semibold">{flowState}</div></div>
    <div className="mt-6 grid gap-3 md:grid-cols-4">{stages.map((stage, i) => <div key={stage.label} className={`relative rounded-xl border p-4 transition-colors ${stage.active ? "bg-background shadow-sm" : "bg-muted/20"}`}><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage.icon}{stage.label}</div><p className="mt-2 text-sm font-semibold leading-5">{stage.detail}</p>{i < stages.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 bg-background md:block" />}</div>)}</div>
    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"><div className="rounded-xl border bg-muted/30 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Lectura Nüva</div><p className="mt-1 text-sm leading-6 text-muted-foreground">{items.length ? `En los últimos 30 días se observan ${items.length} acciones: ${completed} completadas, ${pending} pendientes y ${overdue} vencidas. La ejecución observable es ${executionRate}%.` : "La memoria de decisiones se activará a medida que existan acciones operativas reales."}</p></div><div className="rounded-xl border bg-background/80 p-4 md:min-w-40"><p className="text-xs text-muted-foreground">Ejecución reciente</p><p className="mt-1 text-2xl font-bold tabular-nums">{executionRate}%</p></div></div>
    {latest && <div className="mt-4 rounded-xl border bg-background/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Última acción registrada</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{latest.title || latest.description || "Acción operativa"}</p><p className="mt-0.5 text-xs text-muted-foreground">{latest.completed ? "Ejecutada" : latest.due_date && new Date(latest.due_date).getTime() < Date.now() ? "Vencida" : "Pendiente"}</p></div><span className="text-xs text-muted-foreground">{new Date(latest.created_at!).toLocaleDateString("es-CL")}</span></div></div>}
    <p className="mt-4 text-xs leading-5 text-muted-foreground">Los resultados económicos permanecen separados hasta contar con trazabilidad suficiente para atribuirlos a una decisión concreta.</p>
  </div></Card>;
}
