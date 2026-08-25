import { describe, expect, it } from "vitest";
import { buildNextBestActions } from "./nuva-action-orchestrator";

describe("next best actions", () => {
  it("ranks critical high-impact actions first", () => {
    const result = buildNextBestActions([
      {
        id: "inventory",
        module: "inventory",
        title: "Stockout",
        priority: "high",
        impact: 80,
        action: "Reponer",
        requiresApproval: true,
      },
      {
        id: "cash",
        module: "cashflow",
        title: "Cash risk",
        priority: "critical",
        impact: 20,
        action: "Revisar caja",
      },
    ]);
    expect(result[0].id).toBe("cash");
    expect(result[0].rank).toBe(1);
  });
});
