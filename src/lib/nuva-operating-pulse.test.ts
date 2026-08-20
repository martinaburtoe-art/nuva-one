import { describe, expect, it } from "vitest";
import { buildOperatingPulse } from "./nuva-operating-pulse";

describe("operating pulse", () => {
  it("prioritizes critical signals and exposes the next action", () => {
    const pulse = buildOperatingPulse([
      { id: "inv-1", module: "inventory", title: "Stockout", severity: "high", impact: 900, action: "Reponer SKU crítico" },
      { id: "cash-1", module: "cashflow", title: "Cash risk", severity: "critical", impact: 1500, action: "Revisar caja" },
      { id: "crm-1", module: "crm", title: "Follow-up", severity: "medium", impact: 100, action: "Contactar cliente" },
    ]);
    expect(pulse.signals[0].id).toBe("cash-1");
    expect(pulse.primaryAction).toBe("Revisar caja");
    expect(pulse.score).toBe(35);
    expect(pulse.status).toBe("critical");
  });

  it("returns a healthy pulse with no signals", () => {
    expect(buildOperatingPulse([])).toEqual({ score: 100, status: "healthy", primaryAction: null, signals: [] });
  });
});
