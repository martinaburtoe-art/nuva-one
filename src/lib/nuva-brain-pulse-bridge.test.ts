import { describe, expect, it } from "vitest";
import { buildPulseFromBrainSignals } from "./nuva-brain-pulse-bridge";

describe("business brain to operating pulse", () => {
  it("preserves module, severity, impact and prioritizes critical signals", () => {
    const pulse = buildPulseFromBrainSignals([
      { id: "stock", module: "inventory", severity: "high", title: "Stock", detail: "x", action: "Reponer", score: 70, confidence: 80, impact: 2, requiresApproval: false },
      { id: "cash", module: "cashflow", severity: "critical", title: "Caja", detail: "x", action: "Revisar", score: 95, confidence: 90, impact: 500, requiresApproval: true },
    ]);
    expect(pulse.primaryAction).toBe("Revisar");
    expect(pulse.signals[0].module).toBe("cashflow");
  });
});
