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
    expect(result.consensus.priority?.proposal?.actionType).toBe("cash-burn");
    expect(result.consensus.agentsConsulted).toEqual(NUVA_AGENT_ROSTER.map((agent) => agent.id));
    expect(result.findings.some((finding) => finding.agentId === "inventory")).toBe(true);
    expect(result.findings.some((finding) => finding.agentId === "sales")).toBe(true);
    expect(result.consensus.confidence).toBeGreaterThan(0.8);
  });

  it("does not manufacture a compliance breach when compliance data is unavailable", () => {
    const result = runNuvaAgentCouncil({
      revenue: 500000,
      cashAvailable: 200000,
      projectedCash30d: 250000,
      overdueReceivables: 0,
      inventoryValue: 100000,
      lowStockSkus: 0,
      stockoutRisk: 0,
      grossMargin: null,
      complianceReadiness: null,
      salesCount: 10,
      purchaseSpend: 100000,
    });

    expect(result.findings.some((finding) => finding.signalKey === "compliance")).toBe(false);
  });

  it("makes the finance signal govern an inventory conflict without discarding the supply finding", () => {
    const result = runNuvaAgentCouncil({
      revenue: 2000000,
      cashAvailable: 50000,
      projectedCash30d: -400000,
      overdueReceivables: 1200000,
      inventoryValue: 800000,
      lowStockSkus: 8,
      stockoutRisk: 45,
      grossMargin: 32,
      complianceReadiness: 95,
      salesCount: 80,
      purchaseSpend: 1800000,
    });

    expect(result.consensus.priority?.agentId).toBe("finance");
    expect(result.consensus.headline).toContain("prioriza liquidez");
    expect(result.consensus.dissent.some((finding) => finding.agentId === "inventory")).toBe(true);
    expect(result.findings.find((finding) => finding.agentId === "inventory")?.proposal?.actionType).toBe("low-stock");
    expect(result.consensus.agreement).toBeGreaterThan(0);
  });
});
