import { CheckCircle2, Clock3, Target, TrendingUp, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

type Activity = { type?: string | null; completed?: boolean | null; due_date?: string | null };
type Props = { activities?: Activity[]; priorities?: number };

export function NuvaExecutionScore({ activities = [], priorities = 0 }: Props) {
  const tasks = activities.filter((a) => a.type === "task");
  const completed = tasks.filter((a) => a.completed).length;
  const open = tasks.filter((a) => !a.completed).length;
  const overdue = tasks.filter((a) => !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now()).length;
  const execution = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const discipline = tasks.length ? Math.max(0, Math.round(((completed - overdue) / tasks.length) * 100)) : 0;
  const score = tasks.length ? Math.max(0, Math.min(100, Math.round(execution * 0.7 + discipline * 0.3))) : 0;
  const label = score >= 80 ? "Excelente ejecución" : score >= 60 ? "Buena ejecución" : score > 0 ? "Necesita atención" : "Sin historial suficiente";

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.04] via-background to-background">
      <div className="p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Target className="h-4 w-4" /> Nüva Execution Score</div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">Convierte recomendaciones en resultados</h3>
            <p className="mt-1 text-sm text-muted-foreground">Mide qué tan bien se están ejecutando las acciones comerciales.</p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-background/80 text-2xl font-bold tabular-nums">{score}</div>
        </div>
        <p className="mt-4 text-sm font-semibold">{label}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric icon={<Target className="h-4 w-4" />} label="Prioridades" value={String(priorities)} />
          <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Completadas" value={String(completed)} />
          <Metric icon={<Clock3 className="h-4 w-4" />} label="Abiertas" value={String(open)} />
          <Metric icon={<AlertTriangle className="h-4 w-4" />} label="Vencidas" value={String(overdue)} />
        </div>
        <div className="mt-5 rounded-xl border bg-background/70 p-4">
          <div className="flex items-center justify-between text-xs"><span className="font-medium">Ejecución</span><span className="font-bold">{execution}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${execution}%` }} /></div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">El score combina cumplimiento de tareas y penaliza seguimientos vencidos. A medida que ejecutes acciones, Nüva podrá medir mejor tu disciplina comercial.</p>
        </div>
      </div>
    </Card>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border bg-background/70 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-1 text-lg font-bold tabular-nums">{value}</p></div>; }
