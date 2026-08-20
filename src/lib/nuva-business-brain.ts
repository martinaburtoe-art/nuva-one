export type BrainSignal = { id: string; severity: "critical" | "high" | "medium" | "low"; title: string; detail: string; action: string; score: number };

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
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function buildBusinessBrain(input: BusinessBrainInput): BusinessBrainResult {
  const signals: BrainSignal[] = [];
  if (input.projectedCash30d < 0) signals.push({ id: "cash-risk", severity: "critical", title: "Riesgo de liquidez", detail: `Caja proyectada negativa: ${input.projectedCash30d}.`, action: "Analizar cobranza y egresos antes de comprometer nueva caja.", score: 95 });
  else if (input.projectedCash30d < 500000) signals.push({ id: "cash-low", severity: "high", title: "Colchón de caja bajo", detail: `Caja proyectada: ${input.projectedCash30d}.`, action: "Revisar flujo de caja de 30 días.", score: 80 });
  if (input.overdueReceivables > 0) signals.push({ id: "collections", severity: input.overdueReceivables > 1000000 ? "high" : "medium", title: "Cobranza pendiente", detail: `Cuentas vencidas: ${input.overdueReceivables}.`, action: "Priorizar clientes vencidos y preparar cobranza.", score: input.overdueReceivables > 1000000 ? 82 : 62 });
  if (input.taxMismatchAmount > 0) signals.push({ id: "tax-mismatch", severity: input.taxMismatchAmount > 500000 ? "high" : "medium", title: "Diferencia tributaria", detail: `Diferencia detectada: ${input.taxMismatchAmount}.`, action: "Conciliar documentos antes de preparar la declaración.", score: input.taxMismatchAmount > 500000 ? 88 : 68 });
  if (input.lowStockSkus > 0) signals.push({ id: "stock", severity: input.lowStockSkus >= 5 ? "high" : "medium", title: "Riesgo de quiebre de stock", detail: `${input.lowStockSkus} SKU requieren atención.`, action: "Revisar demanda y preparar reposición.", score: input.lowStockSkus >= 5 ? 76 : 58 });
  if (input.complianceReadiness < 70) signals.push({ id: "compliance", severity: input.complianceReadiness < 40 ? "high" : "medium", title: "Brecha de cumplimiento", detail: `Readiness: ${input.complianceReadiness}/100.`, action: "Abrir Compliance Center y resolver las brechas prioritarias.", score: input.complianceReadiness < 40 ? 84 : 64 });

  signals.sort((a, b) => b.score - a.score);
  const riskPenalty = signals.reduce((sum, s) => sum + (s.severity === "critical" ? 18 : s.severity === "high" ? 10 : s.severity === "medium" ? 5 : 2), 0);
  const score = clamp(input.financialHealthScore - riskPenalty);
  const status = score < 35 ? "critical" : score < 55 ? "attention" : score < 80 ? "stable" : "excellent";
  return { score, status, signals, topPriorities: signals.slice(0, 3) };
}
