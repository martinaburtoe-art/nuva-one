export type NuvaAgentId =
  | "orchestrator"
  | "finance"
  | "sales"
  | "inventory"
  | "people"
  | "compliance"
  | "growth";

export type NuvaActionProposal = {
  actionType:
    | "low-stock"
    | "purchase-pressure"
    | "receivables-overdue"
    | "growth-opportunity"
    | "cash-burn"
    | "compliance";
  destination: "inventory" | "purchases" | "crm" | "customers" | "finance";
  mode: "review" | "prepare";
};

export type NuvaAgentFinding = {
  agentId: NuvaAgentId;
  signalKey: string;
  title: string;
  explanation: string;
  action: string;
  severity: "critical" | "high" | "medium" | "low" | "opportunity";
  confidence: number;
  impact: number;
  requiresApproval: boolean;
  evidenceQuality: "high" | "medium" | "low";
  decisionScore: number;
  evidence: Record<string, unknown>;
  proposal: NuvaActionProposal | null;
};

export type NuvaAgentCouncilInput = {
  revenue: number;
  cashAvailable: number;
  projectedCash30d: number;
  overdueReceivables: number;
  inventoryValue: number;
  lowStockSkus: number;
  stockoutRisk: number;
  grossMargin: number | null;
  complianceReadiness: number | null;
  salesCount: number;
  purchaseSpend: number;
  peopleSignals?: number;
};

export type NuvaAgentCouncilResult = {
  findings: NuvaAgentFinding[];
  consensus: {
    headline: string;
    priority: NuvaAgentFinding | null;
    confidence: number;
    agreement: number;
    evidenceQuality: "high" | "medium" | "low";
    agentsConsulted: NuvaAgentId[];
    dissent: NuvaAgentFinding[];
  };
};

export const NUVA_AGENT_ROSTER: ReadonlyArray<{
  id: NuvaAgentId;
  name: string;
  mandate: string;
}> = [
  { id: "orchestrator", name: "Nüva Orchestrator", mandate: "Coordina señales, evita duplicados y prioriza decisiones." },
  { id: "finance", name: "Nüva Finance", mandate: "Liquidez, cobranza, rentabilidad y exposición financiera." },
  { id: "sales", name: "Nüva Sales", mandate: "Ventas, clientes, cobranza comercial y conversión." },
  { id: "inventory", name: "Nüva Supply", mandate: "Stock, reposición, compras y capital inmovilizado." },
  { id: "people", name: "Nüva People", mandate: "Personas, costos laborales y señales de gestión." },
  { id: "compliance", name: "Nüva Compliance", mandate: "Cumplimiento, datos faltantes y riesgos normativos." },
  { id: "growth", name: "Nüva Growth", mandate: "Oportunidades de crecimiento y eficiencia transversal." },
];

const severityBase: Record<NuvaAgentFinding["severity"], number> = {
  critical: 100,
  high: 82,
  medium: 62,
  opportunity: 55,
  low: 35,
};

const proposalBySignal: Record<string, NuvaActionProposal> = {
  "cash-risk": { actionType: "cash-burn", destination: "finance", mode: "review" },
  "cash-low": { actionType: "cash-burn", destination: "finance", mode: "review" },
  collections: { actionType: "receivables-overdue", destination: "crm", mode: "prepare" },
  stock: { actionType: "low-stock", destination: "inventory", mode: "review" },
  "stockout-risk": { actionType: "low-stock", destination: "inventory", mode: "review" },
  "purchase-pressure": { actionType: "purchase-pressure", destination: "purchases", mode: "prepare" },
  "growth-opportunity": { actionType: "growth-opportunity", destination: "customers", mode: "prepare" },
  compliance: { actionType: "compliance", destination: "finance", mode: "review" },
};

const evidenceQuality = (confidence: number): NuvaAgentFinding["evidenceQuality"] =>
  confidence >= 0.9 ? "high" : confidence >= 0.75 ? "medium" : "low";

const decisionScore = (severity: NuvaAgentFinding["severity"], confidence: number, impact: number) => {
  const impactSignal = Math.min(20, Math.log10(Math.max(1, Math.abs(impact))) * 2);
  return Math.round(severityBase[severity] + confidence * 20 + impactSignal);
};

const finding = (
  agentId: NuvaAgentId,
  signalKey: string,
  title: string,
  explanation: string,
  action: string,
  severity: NuvaAgentFinding["severity"],
  confidence: number,
  impact: number,
  evidence: Record<string, unknown>,
): NuvaAgentFinding => ({
  agentId,
  signalKey,
  title,
  explanation,
  action,
  severity,
  confidence,
  impact,
  requiresApproval: severity === "critical" || severity === "high" || impact >= 100000,
  evidenceQuality: evidenceQuality(confidence),
  decisionScore: decisionScore(severity, confidence, impact),
  evidence,
  proposal: proposalBySignal[signalKey] ?? null,
});

export function runNuvaAgentCouncil(input: NuvaAgentCouncilInput): NuvaAgentCouncilResult {
  const findings: NuvaAgentFinding[] = [];

  if (input.projectedCash30d < 0) {
    findings.push(finding("finance", "cash-risk", "Riesgo de liquidez proyectado", `La proyección de caja a 30 días es ${input.projectedCash30d}.`, "Priorizar cobranza y revisar egresos antes de comprometer nueva caja.", "critical", 0.96, Math.abs(input.projectedCash30d), { projectedCash30d: input.projectedCash30d, cashAvailable: input.cashAvailable }));
  } else if (input.overdueReceivables > 0) {
    findings.push(finding("finance", "collections", "Cuentas por cobrar vencidas", `Existen ${input.overdueReceivables} en cuentas vencidas.`, "Priorizar cobranza y preparar acciones comerciales sobre clientes vencidos.", input.overdueReceivables >= 1000000 ? "high" : "medium", 0.95, input.overdueReceivables, { overdueReceivables: input.overdueReceivables }));
  }

  if (input.lowStockSkus > 0 || input.stockoutRisk > 0) {
    findings.push(finding("inventory", "stock", "Riesgo de quiebre de stock", `${input.lowStockSkus} SKU requieren atención y el riesgo agregado de quiebre es ${input.stockoutRisk}%.`, "Priorizar reposición según demanda y disponibilidad de caja.", input.stockoutRisk >= 30 ? "high" : "medium", 0.9, input.lowStockSkus, { lowStockSkus: input.lowStockSkus, stockoutRisk: input.stockoutRisk, inventoryValue: input.inventoryValue }));
  }

  if (input.revenue > 0 && input.purchaseSpend > input.revenue * 0.8) {
    findings.push(finding("growth", "purchase-pressure", "Presión de compras sobre ventas", `El gasto en compras representa ${(input.purchaseSpend / input.revenue * 100).toFixed(1)}% de las ventas registradas.`, "Revisar rotación, margen y calendario de compras antes de aumentar inventario.", "medium", 0.82, input.purchaseSpend, { revenue: input.revenue, purchaseSpend: input.purchaseSpend }));
  }

  if (input.complianceReadiness != null && input.complianceReadiness < 70) {
    findings.push(finding("compliance", "compliance", "Brecha de cumplimiento", `La preparación de cumplimiento disponible es ${input.complianceReadiness}/100.`, "Abrir las brechas de cumplimiento y completar primero las de mayor impacto.", input.complianceReadiness < 40 ? "high" : "medium", 0.9, 100 - input.complianceReadiness, { complianceReadiness: input.complianceReadiness }));
  }

  if (input.salesCount > 0 && input.revenue > 0 && input.overdueReceivables === 0) {
    findings.push(finding("sales", "growth-opportunity", "Base comercial operativa", `${input.salesCount} ventas registradas con ${input.revenue} de facturación y sin vencidos detectados.`, "Identificar clientes, productos y períodos con mayor contribución para buscar crecimiento rentable.", "opportunity", 0.72, input.revenue, { salesCount: input.salesCount, revenue: input.revenue }));
  }

  if ((input.peopleSignals ?? 0) > 0) {
    findings.push(finding("people", "people-review", "Señales de gestión de personas", `${input.peopleSignals} señales requieren revisión en Nüva People.`, "Revisar costos, asistencia y alertas laborales antes de tomar decisiones de personal.", "medium", 0.8, input.peopleSignals ?? 0, { peopleSignals: input.peopleSignals }));
  }

  findings.sort((a, b) => b.decisionScore - a.decisionScore || b.impact - a.impact || b.confidence - a.confidence);

  const priority = findings[0] ?? null;
  const nonOrchestratorFindings = findings.filter((item) => item.agentId !== "orchestrator");
  const supportingFindings = priority
    ? nonOrchestratorFindings.filter((item) =>
        item.signalKey === priority.signalKey ||
        (priority.agentId === "finance" && ["collections", "cash-risk", "cash-low"].includes(item.signalKey)) ||
        (priority.agentId === "inventory" && ["stock", "purchase-pressure"].includes(item.signalKey)),
      )
    : [];
  const agreement = priority && nonOrchestratorFindings.length
    ? Math.round((Math.max(1, supportingFindings.length) / nonOrchestratorFindings.length) * 100)
    : 0;
  const avgConfidence = nonOrchestratorFindings.length
    ? nonOrchestratorFindings.reduce((sum, item) => sum + item.confidence, 0) / nonOrchestratorFindings.length
    : 0;
  const consensusConfidence = priority ? Math.round(((priority.confidence * 0.7) + (avgConfidence * 0.3)) * 100) / 100 : 0;
  const quality: NuvaAgentFinding["evidenceQuality"] =
    consensusConfidence >= 0.9 ? "high" : consensusConfidence >= 0.75 ? "medium" : "low";
  const dissent = priority
    ? nonOrchestratorFindings.filter((item) => item.decisionScore >= priority.decisionScore - 15 && item.signalKey !== priority.signalKey)
    : [];

  const headline = priority
    ? priority.agentId === "finance" && input.projectedCash30d < 0 && input.lowStockSkus > 0
      ? `El consejo prioriza liquidez: hay presión de caja y necesidades de inventario que deben evaluarse contra la caja disponible.`
      : `El consejo prioriza ${priority.title.toLowerCase()}.`
    : "El consejo no detectó prioridades con los datos disponibles.";

  return {
    findings: [
      ...findings,
      finding(
        "orchestrator",
        "council-overview",
        "Vista transversal del consejo",
        "El consejo cruzó señales financieras, comerciales, inventario, personas, cumplimiento y crecimiento con el mismo contexto empresarial.",
        "Usar la prioridad consensuada para decidir la siguiente acción y registrar su resultado.",
        "low",
        0.86,
        findings.length,
        { agents: NUVA_AGENT_ROSTER.map((agent) => agent.id), agreement, evidenceQuality: quality },
      ),
    ],
    consensus: {
      headline,
      priority,
      confidence: consensusConfidence,
      agreement,
      evidenceQuality: quality,
      agentsConsulted: NUVA_AGENT_ROSTER.map((agent) => agent.id),
      dissent,
    },
  };
}
