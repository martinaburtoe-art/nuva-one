import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock3, Target, Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";

type Activity = {
  completed?: boolean | null;
  created_at?: string | null;
  due_date?: string | null;
  type?: string | null;
};
type Props = { activities?: Activity[] };
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export function NuvaDecisionOutcomes({ activities = [] }: Props) {
  const tasks = activities.filter((a) => a.type === "task");
  const completed = tasks.filter((a) => a.completed).length;
  const overdue = tasks.filter(
    (a) => !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now(),
  ).length;
  const recent = tasks.filter(
    (a) => a.created_at && Date.now() - new Date(a.created_at).getTime() <= 30 * 86400000,
  );
  const recentCompleted = recent.filter((a) => a.completed).length;
  const recentOverdue = recent.filter(
    (a) => !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now(),
  ).length;
  const prior = tasks.filter((a) => {
    if (!a.created_at) return false;
    const age = (Date.now() - new Date(a.created_at).getTime()) / 86400000;
    return age > 30 && age <= 60;
  });
  const priorRate = pct(prior.filter((a) => a.completed).length, prior.length);
  const completionRate = pct(completed, tasks.length);
  const recentRate = pct(recentCompleted, recent.length);
  const velocityDelta = recentRate - priorRate;
  const velocityPositive = velocityDelta >= 0;
  const headline =
    overdue > 0
      ? `${overdue} acción${overdue === 1 ? "" : "es"} necesita${overdue === 1 ? "" : "n"} cierre.`
      : completionRate >= 75
        ? "La ejecución mantiene un nivel sólido."
        : "La ejecución todavía tiene margen de mejora.";

  return (
    <Card className="border-primary/15">
      <div className="p-6 md:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Nüva Decision Outcomes
            </p>
            <h3 className="mt-1 text-xl font-semibold">De la decisión a la ejecución</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Nüva mide la ejecución observada sin atribuir resultados económicos sin evidencia.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Metric
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Ejecución acumulada"
            value={`${completionRate}%`}
            detail={`${completed}/${tasks.length} tareas`}
          />
          <Metric
            icon={<Clock3 className="h-4 w-4" />}
            label="Vencidas"
            value={String(overdue)}
            detail="requieren atención"
          />
          <Metric
            icon={<Gauge className="h-4 w-4" />}
            label="Últimos 30 días"
            value={`${recentRate}%`}
            detail={`${recentCompleted}/${recent.length} completadas`}
          />
          <Metric
            icon={
              velocityPositive ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )
            }
            label="Momentum"
            value={`${velocityDelta > 0 ? "+" : ""}${velocityDelta} pp`}
            detail={`${recentOverdue} vencidas recientes`}
          />
        </div>
        <div className="mt-4 rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-semibold">Lectura Nüva</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {headline}{" "}
            {velocityDelta > 0
              ? `La tasa de ejecución mejoró ${velocityDelta} puntos porcentuales frente al período anterior.`
              : velocityDelta < 0
                ? `La tasa de ejecución cayó ${Math.abs(velocityDelta)} puntos porcentuales frente al período anterior.`
                : "La tasa de ejecución se mantiene estable frente al período anterior."}
          </p>
        </div>
      </div>
    </Card>
  );
}
function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
