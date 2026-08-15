import { ArrowRight, Sparkles, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtCLP } from "@/lib/biz-data";

type SalesIntelligenceCardProps = {
  sales: any[];
  onAnalyze?: () => void;
  onAskAI?: () => void;
};

export function SalesIntelligenceCard({ sales, onAnalyze, onAskAI }: SalesIntelligenceCardProps) {
  const active = (sales ?? []).filter((s) => s.status !== "cancelled");
  const total = active.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const count = active.length;
  const averageTicket = count ? total / count : 0;
  const credit = active.filter((s) => s.is_credit);
  const creditAmount = credit.reduce((sum, s) => sum + Number(s.total || 0) - Number(s.paid_amount || 0), 0);
  const hasData = count > 0;
  const attention = creditAmount > 0;

  const config = !hasData
    ? { label: "Observando", title: "Nüva todavía está aprendiendo de tus ventas", message: "Registra ventas para comenzar a detectar patrones comerciales.", icon: Sparkles, tone: "text-primary" }
    : attention
      ? { label: "Atención", title: "Tienes ventas a crédito que requieren seguimiento", message: "Nüva detectó saldo pendiente asociado a ventas a crédito. Prioriza el seguimiento para proteger tu flujo.", icon: AlertTriangle, tone: "text-warning" }
      : { label: "Oportunidad", title: "Tu actividad comercial está generando señales útiles", message: "Nüva recomienda observar el ticket promedio y los productos que más contribuyen al resultado.", icon: TrendingUp, tone: "text-success" };

  const Icon = config.icon;

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.04] via-background to-background">
      <div className="p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-4 w-4" /> Nüva Intelligence · Ventas
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Nüva encontró algo que deberías saber</h3>
            <p className={`mt-3 text-lg font-semibold ${config.tone}`}>{config.title}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium">
            <Icon className={`h-3.5 w-3.5 ${config.tone}`} /> {config.label}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Ventas" value={String(count)} />
          <Metric label="Ingresos por ventas" value={fmtCLP(total)} />
          <Metric label="Ticket promedio" value={fmtCLP(averageTicket)} />
        </div>

        <div className="mt-5 rounded-xl border bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Por qué importa</p>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{config.message}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {creditAmount > 0 && <span className="rounded-full bg-warning/10 px-2.5 py-1 text-warning">Saldo a crédito: {fmtCLP(creditAmount)}</span>}
            <span className="rounded-full bg-secondary px-2.5 py-1">Datos reales del negocio</span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Siguiente decisión</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {attention ? "Prioriza el seguimiento de ventas a crédito pendientes." : "Revisa el rendimiento comercial y detecta qué está impulsando tus ventas."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onAnalyze}>Analizar <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" onClick={onAskAI}>Preguntar a Nüva IA</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-background/70 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold tabular-nums">{value}</p></div>;
}
