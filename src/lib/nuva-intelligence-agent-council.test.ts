import { describe, expect, it } from "vitest";
import { NUVA_AGENT_ROSTER, runNuvaAgentCouncil } from "./nuva-intelligence-agent-council";

describe("runNuvaAgentCouncil", () => {
  it("consults the full roster and prioritizes a critical liquidity signal", () => {
    const result = runNuvaAgentCouncil({
      revenue: 1000000,
      cashAvailable: 100000,
      projectedCash30d: -250000,
      overdueReceivables: 80000,
      inventoryValue: 300000,
      lowStockSkus: 2,
      stockoutRisk: 10,
      grossMargin: null,
      complianceReadiness: 100,
      salesCount: 20,
      purchaseSpend: 300000,
    });

    expect(result.consensus.priority?.agentId).toBe("finance");
    expect(result.consensus.priority?.severity).toBe("critical");
    expect(result.consensus.agentsConsulted).toEqual(NUVA_AGENT_ROSTER.map((agent) => agent.id));
    expect(result.findings.some((finding) => finding.agentId === "inventory")).toBe(true);
    expect(result.findings.some((finding) => finding.agentId === "sales")).toBe(true);
  });
});
