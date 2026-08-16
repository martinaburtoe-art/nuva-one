import { ArrowUpRight, CheckCircle2, Clock3, Target } from "lucide-react";
import { Card } from "@/components/ui/card";

type Activity = { completed?: boolean | null; created_at?: string | null; due_date?: string | null; type?: string | null };
type Props = { activities?: Activity[] };

const pct = (n: number, d: number) => d ? Math.round((n / d) * 100) : 0;

export function NuvaDecisionOutcomes({ activities = [] }: Props) {
  const tasks = activities.filter((a) => a.type === "task");
  const completed = tasks.filter((a) => a.completed).length;
  const overdue = tasks.filter((a) => !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now()).length;
  const recent = tasks.filter((a) => a.created_at && Date.now() - new Date(a.created_at).getTime() <= 30 * 86400000);
  const recentCompleted = recent.filter((a) => a.completed).length;
  const completionRate = pct(completed, tasks.length);
  const recentRate = pct(recentCompleted, recent.length);

  return <Card className="border-primary/15"><div className="p-6 md:p-7"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><Target className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Nüva Decision Outcomes</p><h3 className="mt-1 text-xl font-semibold">De la decisión a la ejecución</h3><p className="mt-1 text-sm text-muted-foreground">Mide qué parte de las acciones registradas realmente llega a ejecución. No atribuye ventas a una acción sin evidencia.</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-3"><Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Ejecución acumulada" value={`${completionRate}%`} detail={`${completed}/${tasks.length} tareas`} /><Metric icon={<Clock3 className="h-4 w-4" />} label="Vencidas" value={String(overdue)} detail="requieren atención" /><Metric icon={<ArrowUpRight className="h-4 w-4" />} label="Últimos 30 días" value={`${recentRate}%`} detail={`${recentCompleted}/${recent.length} completadas`} /></div><div className="mt-4 rounded-xl border bg-muted/30 p-4"><p className="text-sm font-semibold">Lectura Nüva</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{overdue > 0 ? `La ejecución tiene ${overdue} acción${overdue === 1 ? "" : "es"} vencida${overdue === 1 ? "" : "s"}. Antes de medir impacto económico, conviene cerrar el ciclo operativo.` : completionRate >= 75 ? "La ejecución registrada es sólida. Nüva puede utilizar este historial como señal de disciplina operativa, sin confundirlo con causalidad financiera." : "La ejecución todavía tiene espacio de mejora. Completar acciones prioritarias permitirá obtener mejores señales para futuras decisiones."}</p></div></div></Card>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <div className="rounded-xl border bg-background/70 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-1 text-xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{detail}</p></div>; }
