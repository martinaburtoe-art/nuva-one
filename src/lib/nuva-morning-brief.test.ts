import { describe, expect, it } from "vitest";
import { buildMorningBrief } from "./nuva-morning-brief";

describe("Nüva Morning Brief", () => {
  it("keeps the three highest severity priorities and exposes the next best action", () => {
    const result = buildMorningBrief({
      businessScore: 48,
      priorities: [
        { id: "a", severity: "medium", title: "A", summary: "A", action: "A" },
        {
          id: "b",
          severity: "critical",
          title: "Liquidez",
          summary: "Caja en riesgo",
          action: "Revisar caja",
        },
        { id: "c", severity: "high", title: "C", summary: "C", action: "C" },
        { id: "d", severity: "low", title: "D", summary: "D", action: "D" },
      ],
      cashDays: 12,
      overdueReceivables: 1240000,
      lowStockSkus: 4,
      complianceReadiness: 72,
    });

    expect(result.status).toBe("attention");
    expect(result.priorities.map((p) => p.id)).toEqual(["b", "c", "a"]);
    expect(result.metrics).toHaveLength(5);
    expect(result.nextBestAction?.id).toBe("b");
    expect(result.summary).toContain("Liquidez");
  });
});
