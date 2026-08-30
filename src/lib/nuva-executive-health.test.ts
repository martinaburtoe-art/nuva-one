import { describe, expect, it } from "vitest";
import { buildExecutiveHealth } from "./nuva-executive-health";

describe("executive health", () => {
  it("weights strategic metrics and identifies the weakest area", () => {
    const result = buildExecutiveHealth([
      { key: "cash", label: "Caja", value: 50, target: 100, weight: 3 },
      { key: "margin", label: "Margen", value: 80, target: 100, weight: 2 },
      {
        key: "stock",
        label: "Riesgo stock",
        value: 20,
        target: 10,
        weight: 1,
        higherIsBetter: false,
      },
    ]);
    expect(result.score).toBe(60);
    expect(result.status).toBe("attention");
    expect(result.weakestMetric).toBe("Caja");
  });

  it("returns healthy for an empty metric set", () => {
    expect(buildExecutiveHealth([]).score).toBe(100);
  });
});
