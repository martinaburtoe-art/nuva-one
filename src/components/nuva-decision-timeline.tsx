import { ArrowRight, BrainCircuit, CheckCircle2, CircleDot, Flag, History } from "lucide-react";
import { Card } from "@/components/ui/card";

type Activity = { id?: string; type?: string | null; title?: string | null; description?: string | null; completed?: boolean | null; created_at?: string | null; due_date?: string | null };
type Props = { activities?: Activity[] };
const age = (v?: string | null) => v ? (Date.now() - new Date(v).getTime()) / 86400000 : Infinity;

export function NuvaDecisionTimeline({ activities = [] }: Props) {
  const items = activities.filter(a => a.type === "task" && a.created_at && age(a.created_at) <= 30).sort((a,b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()).slice(0, 5);
  const completed = items.filter(a => a.completed).length;
  const overdue = items.filter(a => !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now()).length;
  const stages = [
    { label: "Señal", detail: overdue ? `${overdue} acción${overdue === 1 ? "" : "es"} requiere${overdue === 1 ? "" : "n"} atención` : "Sin alerta crítica", icon: <Flag className="h-4 w-4" /> },
    { label: "Decisión", detail: items.length ? "Prioridad operativa registrada" : "Esperando actividad", icon: <BrainCircuit className="h-4 w-4" /> },
    { label: "Ejecución", detail: `${completed}/${items.length} acciones completadas`, icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Resultado", detail: "Se observa, no se atribuye sin evidencia", icon: <History className="h-4 w-4" /> },
  ];
  return <Card className="border-primary/15"><div className="p-6 md:p-7"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><CircleDot className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Nüva Decision Flow</p><h3 className="mt-1 text-xl font-semibold">Del diagnóstico al resultado</h3><p className="mt-1 text-sm text-muted-foreground">Una línea temporal ejecutiva para conectar señal, decisión, ejecución y evidencia.</p></div></div><div className="mt-6 grid gap-3 md:grid-cols-4">{stages.map((stage, i) => <div key={stage.label} className="relative rounded-xl border bg-muted/20 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage.icon}{stage.label}</div><p className="mt-2 text-sm font-semibold leading-5">{stage.detail}</p>{i < stages.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 bg-background md:block" />}</div>)}</div><div className="mt-4 rounded-xl border bg-muted/30 p-4"><p className="text-sm font-semibold">Lectura Nüva</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{items.length ? `Durante los últimos 30 días se observan ${items.length} acciones operativas. ${completed} están completadas${overdue ? ` y ${overdue} vencidas` : ""}. El resultado económico se mantiene separado hasta contar con trazabilidad suficiente.` : "La línea temporal se activará a medida que existan acciones operativas reales."}</p></div></div></Card>;
}
