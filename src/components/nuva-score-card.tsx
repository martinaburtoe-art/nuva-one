import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNuvaScore, type ScoreComponent } from "@/lib/use-nuva-score";
import { AlertTriangle, ArrowUpRight, CheckCircle2, XCircle } from "lucide-react";
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
  if (total >= 70) return "oklch(0.65 0.18 150)";
  if (total >= 40) return "oklch(0.75 0.15 80)";
  return "oklch(0.6 0.22 25)";
}

function scoreLabel(total: number): string {
  if (total >= 85) return "Excelente";
  if (total >= 70) return "Saludable";
  if (total >= 40) return "Atención";
  return "Crítico";
}

function actionFor(key: string): { href: string; label: string } {
  if (key === "inventario") return { href: "/inventory", label: "Ver inventario" };
  if (key === "margen" || key === "liquidez") return { href: "/finance", label: "Analizar finanzas" };
  if (key === "cobranza") return { href: "/crm", label: "Revisar cobranza" };
  if (key === "crecimiento") return { href: "/sales", label: "Ver ventas" };
  return { href: "/dashboard", label: "Ver dashboard" };
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
  const weakest = [...components].sort((a, b) => a.points - b.points)[0];
  const action = weakest ? actionFor(weakest.key) : null;

  return (
    <Card className="overflow-hidden p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Nüva Score</h3>
            <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {scoreLabel(total)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Salud general de tu negocio</p>
        </div>
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="oklch(0.92 0.008 270)" strokeWidth="8" />
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

      {weakest && action && (
        <div className="mt-5 rounded-2xl border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Principal oportunidad</p>
              <p className="mt-1 text-sm font-semibold">{weakest.label} está en {weakest.points}/20</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{weakest.detail}</p>
            </div>
            <Link to={action.href}>
              <span className="inline-flex items-center whitespace-nowrap rounded-lg border bg-background px-3 py-2 text-xs font-semibold transition-colors hover:border-primary hover:bg-accent">
                {action.label}
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
