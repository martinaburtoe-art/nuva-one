import { describe, expect, it } from "vitest";
import { buildNuvaActionCenter } from "./nuva-action-center";
import type { IntelligenceSignal } from "./nuva-intelligence";

const signal = (overrides: Partial<IntelligenceSignal>): IntelligenceSignal => ({
  id: "signal",
  severity: "info",
  title: "Signal",
  explanation: "Explanation",
  action: "Review",
  source: ["test"],
  ...overrides,
});

describe("buildNuvaActionCenter", () => {
  it("prioritizes critical signals", () => {
    const actions = buildNuvaActionCenter([
      signal({ id: "info", severity: "info", title: "Info" }),
      signal({ id: "critical", severity: "critical", title: "Critical", action: "Actuar" }),
      signal({ id: "warning", severity: "warning", title: "Warning" }),
    ]);
    expect(actions[0].id).toBe("critical");
    expect(actions[0].action).toBe("Actuar");
  });

  it("limits the list and keeps opportunities actionable", () => {
    const signals = Array.from({ length: 8 }, (_, i) =>
      signal({ id: `s-${i}`, severity: "opportunity", title: `Opportunity ${i}`, explanation: "Potential improvement" }),
    );
    const actions = buildNuvaActionCenter(signals, 3);
    expect(actions).toHaveLength(3);
    expect(actions[0].priority).toBe("opportunity");
    expect(actions[0].action.length).toBeGreaterThan(0);
  });

  it("maps operational signals to explicit destinations and CTAs", () => {
    const actions = buildNuvaActionCenter([
      signal({ id: "low-stock", severity: "critical", title: "Stock bajo", explanation: "2 SKU" }),
      signal({ id: "receivables-overdue", severity: "warning", title: "Cobranza", explanation: "$100.000" }),
      signal({ id: "purchase-pressure", severity: "warning", title: "Compras", explanation: "Alta" }),
      signal({ id: "cash-burn", severity: "critical", title: "Caja", explanation: "Negativa" }),
    ]);
    expect(actions.map((a) => a.destination)).toEqual(["inventory", "finance", "crm", "purchases"]);
    expect(actions.find((a) => a.destination === "inventory")?.cta).toBe("Revisar inventario");
    expect(actions.find((a) => a.destination === "finance")?.cta).toBe("Revisar finanzas");
  });

  it("routes tax, DTE, RCV and F29 signals to finance", () => {
    const actions = buildNuvaActionCenter([
      signal({ id: "tax", severity: "critical", title: "Obligación tributaria", explanation: "Revisar" }),
      signal({ id: "compliance", severity: "warning", title: "Compliance", explanation: "Revisar" }),
      signal({ id: "dte", severity: "warning", title: "DTE", explanation: "Revisar" }),
      signal({ id: "rcv", severity: "warning", title: "RCV", explanation: "Revisar" }),
      signal({ id: "f29", severity: "critical", title: "F29", explanation: "Revisar" }),
    ]);
    expect(actions).toHaveLength(5);
    expect(actions.every((action) => action.destination === "finance")).toBe(true);
  });

  it("falls back safely for unknown signals", () => {
    const [action] = buildNuvaActionCenter([signal({ id: "unknown", title: "Nuevo", explanation: "x" })]);
    expect(action.destination).toBe("dashboard");
    expect(action.cta).toBe("Revisar indicador");
  });
});
