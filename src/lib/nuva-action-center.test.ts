import { describe, expect, it } from "vitest";
import { buildNuvaActionCenter } from "./nuva-action-center";

describe("buildNuvaActionCenter", () => {
  it("prioritizes critical signals", () => {
    const actions = buildNuvaActionCenter([
      { id: "info", severity: "info", title: "Info", description: "x" },
      {
        id: "critical",
        severity: "critical",
        title: "Critical",
        description: "x",
        recommendation: "Actuar",
      },
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

  it("maps operational signals to explicit destinations and CTAs", () => {
    const actions = buildNuvaActionCenter([
      { id: "low-stock", severity: "critical", title: "Stock bajo", description: "2 SKU" },
      {
        id: "receivables-overdue",
        severity: "warning",
        title: "Cobranza",
        description: "$100.000",
      },
      { id: "purchase-pressure", severity: "warning", title: "Compras", description: "Alta" },
      { id: "cash-burn", severity: "critical", title: "Caja", description: "Negativa" },
    ]);
    expect(actions.map((a) => a.destination)).toEqual(["inventory", "finance", "crm", "purchases"]);
    expect(actions.find((a) => a.destination === "inventory")?.cta).toBe("Revisar inventario");
    expect(actions.find((a) => a.destination === "finance")?.cta).toBe("Revisar finanzas");
  });

  it("routes tax, DTE, RCV and F29 signals to finance", () => {
    const actions = buildNuvaActionCenter([
      { id: "tax", severity: "critical", title: "Obligación tributaria", description: "Revisar" },
      { id: "compliance", severity: "warning", title: "Compliance", description: "Revisar" },
      { id: "dte", severity: "warning", title: "DTE", description: "Revisar" },
      { id: "rcv", severity: "warning", title: "RCV", description: "Revisar" },
      { id: "f29", severity: "critical", title: "F29", description: "Revisar" },
    ]);
    expect(actions).toHaveLength(5);
    expect(actions.every((action) => action.destination === "finance")).toBe(true);
  });

  it("falls back safely for unknown signals", () => {
    const [action] = buildNuvaActionCenter([{ id: "unknown", title: "Nuevo", description: "x" }]);
    expect(action.destination).toBe("dashboard");
    expect(action.cta).toBe("Revisar indicador");
  });
});
