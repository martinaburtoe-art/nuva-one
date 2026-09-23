export type NuvaAgentId =
  | "orchestrator"
  | "finance"
  | "sales"
  | "inventory"
  | "people"
  | "compliance"
  | "growth";

export type NuvaAgentFinding = {
  agentId: NuvaAgentId;
  title: string;
  explanation: string;
  action: string;
  severity: "critical" | "high" | "medium" | "low" | "opportunity";
  confidence: number;
  impact: number;
  requiresApproval: boolean;
  evidence: Record<string, unknown>;
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
  complianceReadiness: number;
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
    agentsConsulted: NuvaAgentId[];
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

const finding = (
  agentId: NuvaAgentId,
  title: string,
  explanation: string,
  action: string,
  severity: NuvaAgentFinding["severity"],
  confidence: number,
  impact: number,
  evidence: Record<string, unknown>,
): NuvaAgentFinding => ({
  agentId,
  title,
  explanation,
  action,
  severity,
  confidence,
  impact,
  requiresApproval: severity === "critical" || severity === "high" || impact >= 100000,
  evidence,
});

export function runNuvaAgentCouncil(input: NuvaAgentCouncilInput): NuvaAgentCouncilResult {
  const findings: NuvaAgentFinding[] = [];

  if (input.projectedCash30d < 0) {
    findings.push(finding("finance", "Riesgo de liquidez proyectado", `La proyección de caja a 30 días es ${input.projectedCash30d}.`, "Priorizar cobranza y revisar egresos antes de comprometer nueva caja.", "critical", 0.96, Math.abs(input.projectedCash30d), { projectedCash30d: input.projectedCash30d }));
  } else if (input.overdueReceivables > 0) {
    findings.push(finding("finance", "Cuentas por cobrar vencidas", `Existen ${input.overdueReceivables} en cuentas vencidas.`, "Priorizar cobranza y preparar acciones comerciales sobre clientes vencidos.", input.overdueReceivables >= 1000000 ? "high" : "medium", 0.95, input.overdueReceivables, { overdueReceivables: input.overdueReceivables }));
  }

  if (input.lowStockSkus > 0 || input.stockoutRisk > 0) {
    findings.push(finding("inventory", "Riesgo de quiebre de stock", `${input.lowStockSkus} SKU requieren atención y el riesgo agregado de quiebre es ${input.stockoutRisk}%.`, "Priorizar reposición según demanda y disponibilidad de caja.", input.stockoutRisk >= 30 ? "high" : "medium", 0.9, input.lowStockSkus, { lowStockSkus: input.lowStockSkus, stockoutRisk: input.stockoutRisk }));
  }

  if (input.revenue > 0 && input.purchaseSpend > input.revenue * 0.8) {
    findings.push(finding("growth", "Presión de compras sobre ventas", `El gasto en compras representa ${(input.purchaseSpend / input.revenue * 100).toFixed(1)}% de las ventas registradas.`, "Revisar rotación, margen y calendario de compras antes de aumentar inventario.", "medium", 0.82, input.purchaseSpend, { revenue: input.revenue, purchaseSpend: input.purchaseSpend }));
  }

  if (input.complianceReadiness < 70) {
    findings.push(finding("compliance", "Brecha de cumplimiento", `La preparación de cumplimiento disponible es ${input.complianceReadiness}/100.`, "Abrir las brechas de cumplimiento y completar primero las de mayor impacto.", input.complianceReadiness < 40 ? "high" : "medium", 0.9, 100 - input.complianceReadiness, { complianceReadiness: input.complianceReadiness }));
  }

  if (input.salesCount > 0 && input.revenue > 0 && input.overdueReceivables === 0) {
    findings.push(finding("sales", "Base comercial operativa", `${input.salesCount} ventas registradas con ${input.revenue} de facturación y sin vencidos detectados.`, "Identificar clientes, productos y períodos con mayor contribución para buscar crecimiento rentable.", "opportunity", 0.72, input.revenue, { salesCount: input.salesCount, revenue: input.revenue }));
  }

  if ((input.peopleSignals ?? 0) > 0) {
    findings.push(finding("people", "Señales de gestión de personas", `${input.peopleSignals} señales requieren revisión en Nüva People.`, "Revisar costos, asistencia y alertas laborales antes de tomar decisiones de personal.", "medium", 0.8, input.peopleSignals ?? 0, { peopleSignals: input.peopleSignals }));
  }

  findings.push(finding("orchestrator", "Vista transversal disponible", "El consejo de agentes cruzó señales financieras, comerciales, inventario, personas, cumplimiento y crecimiento.", "Usar la prioridad consensuada para decidir la siguiente acción y registrar su resultado.", "low", 0.86, findings.length, { agents: NUVA_AGENT_ROSTER.map((agent) => agent.id) }));

  findings.sort((a, b) => {
    const rank: Record<NuvaAgentFinding["severity"], number> = { critical: 5, high: 4, medium: 3, opportunity: 2, low: 1 };
    return rank[b.severity] - rank[a.severity] || b.impact - a.impact || b.confidence - a.confidence;
  });

  const priority = findings[0] ?? null;
  const confidence = priority ? Math.round(priority.confidence * 100) / 100 : 0;
  return {
    findings,
    consensus: {
      headline: priority ? `Prioridad del consejo: ${priority.title}.` : "El consejo no detectó prioridades con los datos disponibles.",
      priority,
      confidence,
      agentsConsulted: NUVA_AGENT_ROSTER.map((agent) => agent.id),
    },
  };
}
