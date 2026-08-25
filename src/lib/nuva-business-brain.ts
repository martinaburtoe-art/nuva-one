export type BrainSeverity = "critical" | "high" | "medium" | "low";

export type BrainSignal = {
  id: string;
  module: string;
  severity: BrainSeverity;
  title: string;
  detail: string;
  action: string;
  score: number;
  confidence: number;
  impact: number;
  requiresApproval: boolean;
};

export type BusinessBrainInput = {
  financialHealthScore: number;
  projectedCash30d: number;
  overdueReceivables: number;
  taxMismatchAmount: number;
  lowStockSkus: number;
  complianceReadiness: number;
};

export type BusinessBrainResult = {
  score: number;
  status: "critical" | "attention" | "stable" | "excellent";
  signals: BrainSignal[];
  topPriorities: BrainSignal[];
  requiresApprovalCount: number;
  headline: string;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function buildBusinessBrain(input: BusinessBrainInput): BusinessBrainResult {
  const signals: BrainSignal[] = [];
  const add = (signal: Omit<BrainSignal, "requiresApproval">) =>
    signals.push({
      ...signal,
      requiresApproval: signal.severity === "critical" || signal.impact >= 1000,
    });

  if (input.projectedCash30d < 0)
    add({
      id: "cash-risk",
      module: "cashflow",
      severity: "critical",
      title: "Riesgo de liquidez",
      detail: `Caja proyectada negativa: ${input.projectedCash30d}.`,
      action: "Analizar cobranza y egresos antes de comprometer nueva caja.",
      score: 95,
      confidence: 90,
      impact: Math.abs(input.projectedCash30d),
    });
  else if (input.projectedCash30d < 500000)
    add({
      id: "cash-low",
      module: "cashflow",
      severity: "high",
      title: "Colchón de caja bajo",
      detail: `Caja proyectada: ${input.projectedCash30d}.`,
      action: "Revisar flujo de caja de 30 días.",
      score: 80,
      confidence: 85,
      impact: 500000 - input.projectedCash30d,
    });
  if (input.overdueReceivables > 0)
    add({
      id: "collections",
      module: "crm",
      severity: input.overdueReceivables > 1000000 ? "high" : "medium",
      title: "Cobranza pendiente",
      detail: `Cuentas vencidas: ${input.overdueReceivables}.`,
      action: "Priorizar clientes vencidos y preparar cobranza.",
      score: input.overdueReceivables > 1000000 ? 82 : 62,
      confidence: 95,
      impact: input.overdueReceivables,
    });
  if (input.taxMismatchAmount > 0)
    add({
      id: "tax-mismatch",
      module: "tax",
      severity: input.taxMismatchAmount > 500000 ? "high" : "medium",
      title: "Diferencia tributaria",
      detail: `Diferencia detectada: ${input.taxMismatchAmount}.`,
      action: "Conciliar documentos antes de preparar la declaración.",
      score: input.taxMismatchAmount > 500000 ? 88 : 68,
      confidence: 95,
      impact: input.taxMismatchAmount,
    });
  if (input.lowStockSkus > 0)
    add({
      id: "stock",
      module: "inventory",
      severity: input.lowStockSkus >= 5 ? "high" : "medium",
      title: "Riesgo de quiebre de stock",
      detail: `${input.lowStockSkus} SKU requieren atención.`,
      action: "Revisar demanda y preparar reposición.",
      score: input.lowStockSkus >= 5 ? 76 : 58,
      confidence: 80,
      impact: input.lowStockSkus,
    });
  if (input.complianceReadiness < 70)
    add({
      id: "compliance",
      module: "compliance",
      severity: input.complianceReadiness < 40 ? "high" : "medium",
      title: "Brecha de cumplimiento",
      detail: `Readiness: ${input.complianceReadiness}/100.`,
      action: "Abrir Compliance Center y resolver las brechas prioritarias.",
      score: input.complianceReadiness < 40 ? 84 : 64,
      confidence: 90,
      impact: 100 - input.complianceReadiness,
    });

  signals.sort((a, b) => b.score - a.score || b.impact - a.impact);
  const riskPenalty = signals.reduce(
    (sum, s) =>
      sum +
      (s.severity === "critical"
        ? 18
        : s.severity === "high"
          ? 10
          : s.severity === "medium"
            ? 5
            : 2),
    0,
  );
  const score = clamp(input.financialHealthScore - riskPenalty);
  const status =
    score < 35 ? "critical" : score < 55 ? "attention" : score < 80 ? "stable" : "excellent";
  const topPriorities = signals.slice(0, 3);
  const requiresApprovalCount = signals.filter((signal) => signal.requiresApproval).length;
  const headline =
    signals[0]?.severity === "critical"
      ? `Atención inmediata: ${signals[0].title}.`
      : signals.length > 0
        ? `${signals.length} señales requieren gestión priorizada.`
        : "No se detectan riesgos prioritarios con los datos disponibles.";

  return { score, status, signals, topPriorities, requiresApprovalCount, headline };
}
