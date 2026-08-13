import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNuvaScore, type ScoreComponent } from "@/lib/use-nuva-score";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const statusIcon: Record<ScoreComponent["status"], typeof CheckCircle2> = {
  good: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
  "no-data": AlertTriangle,
};

const statusColor: Record<ScoreComponent["status"], string> = {
  good: "text-success",
  warning: "text-amber-500",
  critical: "text-destructive",
  "no-data": "text-muted-foreground",
};

function ringColor(total: number): string {
  if (total >= 70) return "oklch(0.65 0.18 150)"; // verde
  if (total >= 40) return "oklch(0.75 0.15 80)"; // ámbar
  return "oklch(0.6 0.22 25)"; // rojo
}

export function NuvaScoreCard() {
  const { data: score, isLoading } = useNuvaScore();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </Card>
    );
  }

  if (!score || score.total === null) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold">Nüva Score</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Registra ventas, productos y movimientos de caja para que Nüva empiece a calcular la salud
          de tu negocio.
        </p>
      </Card>
    );
  }

  const { total, components } = score;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (total / 100) * circumference;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Nüva Score</h3>
          <p className="text-xs text-muted-foreground">Salud general de tu negocio</p>
        </div>
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="oklch(0.92 0.008 270)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={ringColor(total)}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold tracking-tight">{total}</span>
            <span className="text-[10px] text-muted-foreground">/100</span>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {components.map((c) => {
          const Icon = statusIcon[c.status];
          return (
            <div key={c.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("h-3.5 w-3.5", statusColor[c.status])} />
                  <span className="font-medium">{c.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{c.detail}</span>
              </div>
              <Progress value={(c.points / 20) * 100} className="h-1.5" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
