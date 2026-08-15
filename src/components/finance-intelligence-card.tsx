import { AlertTriangle, ArrowRight, CheckCircle2, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtCLP } from "@/lib/biz-data";

type FinanceIntelligenceCardProps = {
  income: number;
  expense: number;
  receivable?: number;
  overdueTotal?: number;
  onAnalyze?: () => void;
  onAskAI?: () => void;
};

export function FinanceIntelligenceCard({
  income,
  expense,
  receivable = 0,
  overdueTotal = 0,
  onAnalyze,
  onAskAI,
}: FinanceIntelligenceCardProps) {
  const net = income - expense;
  const margin = income > 0 ? (net / income) * 100 : null;
  const expenseRatio = income > 0 ? (expense / income) * 100 : null;
  const receivableRatio = income > 0 ? (receivable / income) * 100 : null;

  const hasData = income > 0 || expense > 0 || receivable > 0;
  const overdueAttention = overdueTotal > 0;
  const negative = net < 0;
  const highExpenseRatio = expenseRatio !== null && expenseRatio >= 70;
  const collectionRisk = overdueTotal > 0 && receivable > 0 && overdueTotal / receivable >= 0.35;

  const status = !hasData
    ? "observing"
    : negative || overdueAttention
      ? "attention"
      : highExpenseRatio || collectionRisk
        ? "watch"
        : "opportunity";

  const config = {
    observing: {
      label: "Observando",
      title: "Nüva todavía está aprendiendo de tus finanzas",
      icon: Sparkles,
      tone: "text-primary",
      message: "Registra movimientos para que Nüva pueda detectar señales financieras con mayor precisión.",
    },
    attention: {
      label: "Atención",
      title: negative
        ? "Tus gastos están superando tus ingresos"
        : collectionRisk
          ? "Una parte relevante de lo pendiente está vencida"
          : "Hay dinero pendiente que merece atención",
      icon: AlertTriangle,
      tone: "text-destructive",
      message: negative
        ? "Tu flujo neto está bajo presión. Revisa los gastos de mayor impacto antes de tomar nuevas decisiones."
        : collectionRisk
          ? "La cobranza vencida puede tensionar tu flujo de caja. Prioriza las cuentas con mayor impacto."
          : "Nüva detectó cuentas vencidas. Prioriza la cobranza para proteger tu flujo de caja.",
    },
    watch: {
      label: "Vigilancia",
      title: highExpenseRatio
        ? "Tus gastos están consumiendo una parte importante de tus ingresos"
        : "Tu dinero por cobrar merece seguimiento",
      icon: TrendingDown,
      tone: "text-warning",
      message: highExpenseRatio
        ? "Tu estructura de gastos merece revisión para proteger el margen del negocio."
        : "Mantén seguimiento de las cuentas por cobrar para evitar que se conviertan en presión de caja.",
    },
    opportunity: {
      label: "Oportunidad",
      title: "Tus finanzas muestran una posición positiva",
      icon: TrendingUp,
      tone: "text-success",
      message: "Tu flujo neto es positivo. Nüva recomienda identificar qué está impulsando el resultado y proteger ese desempeño.",
    },
  }[status];

  const Icon = config.icon;

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.04] via-background to-background">
      <div className="p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-4 w-4" />
              Nüva Intelligence · Finanzas
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Nüva encontró algo que deberías saber</h3>
            <p className={`mt-3 text-lg font-semibold ${config.tone}`}>{config.title}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium">
            <Icon className={`h-3.5 w-3.5 ${config.tone}`} />
            {config.label}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Ingresos" value={fmtCLP(income)} />
          <Metric label="Gastos" value={fmtCLP(expense)} />
          <Metric label="Flujo neto" value={fmtCLP(net)} emphasis={net < 0 ? "negative" : "positive"} />
          <Metric label="Margen" value={margin === null ? "—" : `${margin.toFixed(1)}%`} />
        </div>

        <div className="mt-5 rounded-xl border bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Por qué importa</p>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{config.message}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {expenseRatio !== null && (
              <span className="rounded-full bg-secondary px-2.5 py-1">Gastos: {expenseRatio.toFixed(1)}% de ingresos</span>
            )}
            {receivable > 0 && (
              <span className="rounded-full bg-secondary px-2.5 py-1">
                Por cobrar: {fmtCLP(receivable)}{receivableRatio !== null ? ` · ${receivableRatio.toFixed(1)}% de ingresos` : ""}
              </span>
            )}
            {overdueTotal > 0 && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">Vencido: {fmtCLP(overdueTotal)}</span>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Siguiente decisión</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {negative
                  ? "Prioriza controlar el gasto antes de asumir nuevos compromisos."
                  : overdueAttention
                    ? "Prioriza la cobranza vencida para proteger tu flujo de caja."
                    : highExpenseRatio
                      ? "Revisa los gastos de mayor impacto y protege tu margen."
                      : "Revisa el detalle financiero y conversa con Nüva para decidir el siguiente paso."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onAnalyze}>
              Analizar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={onAskAI}>
              Preguntar a Nüva IA
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full bg-secondary px-2.5 py-1">Datos reales del negocio</span>
          <span className="rounded-full bg-secondary px-2.5 py-1">Señal determinística</span>
          <span className="rounded-full bg-secondary px-2.5 py-1">Impacto financiero</span>
          <span className="rounded-full bg-secondary px-2.5 py-1">Siguiente decisión</span>
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value, emphasis }: { label: string; value: string; emphasis?: "negative" | "positive" }) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${emphasis === "negative" ? "text-destructive" : emphasis === "positive" ? "text-success" : ""}`}>
        {value}
      </p>
    </div>
  );
}