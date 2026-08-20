import { describe, expect, it } from "vitest";
import { normalizeMetric, normalizeSignals } from "./nuva-data-contract";

describe("normalized intelligence data contract", () => {
  it("normalizes invalid metric values without changing the contract", () => {
    expect(normalizeMetric({ id: "cash", module: "cashflow", name: "Disponible", value: Number.NaN, unit: "  CLP  ", period: " 2026-08 ", source: "  caja " })).toEqual({
      id: "cash", module: "cashflow", name: "Disponible", value: 0, unit: "CLP", period: "2026-08", source: "caja",
    });
  });

  it("filters invalid signals and normalizes valid ones", () => {
    const result = normalizeSignals([
      { id: "ok", module: "sales", title: "  Margen bajo ", severity: "high", confidence: 91.4, impact: Number.NaN, action: "  Revisar precio " },
      { id: "bad", module: "inventory", title: "Stock", severity: "high", confidence: 120, impact: 10, action: "Reponer" },
      { id: "empty", module: "crm", title: " ", severity: "low", confidence: 80, impact: 1, action: "Contactar" },
    ]);
    expect(result).toEqual([{ id: "ok", module: "sales", title: "Margen bajo", severity: "high", confidence: 91, impact: 0, action: "Revisar precio" }]);
  });
});
