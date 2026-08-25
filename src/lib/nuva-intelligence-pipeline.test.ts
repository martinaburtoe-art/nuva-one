import { describe, expect, it } from "vitest";
import { buildIntelligenceActions } from "./nuva-intelligence-pipeline";

describe("intelligence pipeline", () => {
  it("requires approval for critical or high-impact actions", () => {
    const result = buildIntelligenceActions([
      {
        id: "cash",
        module: "cashflow",
        title: "Riesgo de caja",
        severity: "critical",
        confidence: 92,
        impact: 500,
        action: "Revisar caja",
      },
      {
        id: "stock",
        module: "inventory",
        title: "Reposición",
        severity: "high",
        confidence: 95,
        impact: 1200,
        action: "Reponer SKU",
      },
    ]);
    expect(result[0].approvalRequired).toBe(true);
    expect(result[1].approvalRequired).toBe(true);
  });

  it("filters invalid confidence values", () => {
    const result = buildIntelligenceActions([
      {
        id: "bad",
        module: "ai",
        title: "Invalid",
        severity: "high",
        confidence: 120,
        impact: 1,
        action: "No ejecutar",
      },
    ]);
    expect(result).toHaveLength(0);
  });
});
