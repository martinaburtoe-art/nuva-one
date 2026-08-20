import { describe, expect, it } from "vitest";
import { buildNuvaActionCenter } from "./nuva-action-center";

describe("buildNuvaActionCenter", () => {
  it("prioritizes critical signals", () => {
    const actions = buildNuvaActionCenter([
      { id: "info", severity: "info", title: "Info", description: "x" },
      { id: "critical", severity: "critical", title: "Critical", description: "x", recommendation: "Actuar" },
      { id: "warning", severity: "warning", title: "Warning", description: "x" },
    ]);
    expect(actions[0].id).toBe("critical");
    expect(actions[0].action).toBe("Actuar");
  });

  it("limits the list and keeps opportunities actionable", () => {
    const signals = Array.from({ length: 8 }, (_, i) => ({
      id: `s-${i}`,
      severity: "opportunity" as const,
      title: `Opportunity ${i}`,
      description: "Potential improvement",
    }));
    const actions = buildNuvaActionCenter(signals, 3);
    expect(actions).toHaveLength(3);
    expect(actions[0].priority).toBe("opportunity");
    expect(actions[0].action.length).toBeGreaterThan(0);
  });
});
