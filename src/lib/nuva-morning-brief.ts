export type MorningBriefSignal = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  summary: string;
  action: string;
};

export type MorningBriefInput = {
  businessScore: number;
  priorities: MorningBriefSignal[];
  cashDays?: number;
  overdueReceivables?: number;
  lowStockSkus?: number;
  complianceReadiness?: number;
};

export type MorningBrief = {
  score: number;
  headline: string;
  status: "critical" | "attention" | "stable" | "excellent";
  priorities: MorningBriefSignal[];
  metrics: Array<{ id: string; label: string; value: string }>;
  nextBestAction?: MorningBriefSignal;
  summary: string;
};

const statusFor = (score: number): MorningBrief["status"] =>
  score < 35 ? "critical" : score < 55 ? "attention" : score < 80 ? "stable" : "excellent";

const severityWeight: Record<MorningBriefSignal["severity"], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function buildMorningBrief(input: MorningBriefInput): MorningBrief {
  const priorities = [...input.priorities]
    .sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity])
    .slice(0, 3);
  const status = statusFor(input.businessScore);
  const headline = status === "critical"
    ? "Tu empresa requiere atención inmediata."
    : status === "attention"
      ? "Hay prioridades que conviene resolver hoy."
      : status === "stable"
        ? "Tu operación está estable; revisa tus prioridades."
        : "Tu empresa presenta una posición saludable.";

  const metrics = [
    { id: "score", label: "Salud empresarial", value: `${input.businessScore}/100` },
    ...(input.cashDays !== undefined ? [{ id: "cash-days", label: "Cobertura de caja", value: `${input.cashDays} días` }] : []),
    ...(input.overdueReceivables !== undefined ? [{ id: "overdue", label: "Cobranza vencida", value: `$${input.overdueReceivables.toLocaleString("es-CL")}` }] : []),
    ...(input.lowStockSkus !== undefined ? [{ id: "stock", label: "SKU bajo reposición", value: `${input.lowStockSkus}` }] : []),
    ...(input.complianceReadiness !== undefined ? [{ id: "compliance", label: "Compliance", value: `${input.complianceReadiness}/100` }] : []),
  ];

  const nextBestAction = priorities[0];
  const summary = nextBestAction
    ? `Prioridad principal: ${nextBestAction.title}. ${nextBestAction.action}`
    : "No se detectaron prioridades con los datos disponibles.";

  return { score: input.businessScore, headline, status, priorities, metrics, nextBestAction, summary };
}
