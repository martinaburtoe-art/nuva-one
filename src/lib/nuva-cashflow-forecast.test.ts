import { describe, expect, it } from "vitest";
import { buildCashflowForecast } from "./nuva-cashflow-forecast";

describe("Nüva cashflow forecast", () => {
  it("detects a projected liquidity deficit", () => {
    const result = buildCashflowForecast({
      currentBalance: 1_000_000,
      asOf: "2026-08-20T00:00:00.000Z",
      items: [
        { amount: 300_000, dueDate: "2026-08-22", kind: "inflow" },
        { amount: 1_800_000, dueDate: "2026-08-28", kind: "outflow" },
      ],
    });

    expect(result.projectedBalance30d).toBe(-500_000);
    expect(result.risk).toBe("high");
    expect(result.runwayDays).toBe(8);
    expect(result.actions.length).toBeGreaterThan(0);
  });

  it("keeps a healthy forecast low risk", () => {
    const result = buildCashflowForecast({
      currentBalance: 2_000_000,
      asOf: "2026-08-20T00:00:00.000Z",
      items: [{ amount: 500_000, dueDate: "2026-09-10", kind: "inflow" }],
    });

    expect(result.projectedBalance30d).toBe(2_500_000);
    expect(result.minimumProjectedBalance30d).toBe(2_000_000);
    expect(result.risk).toBe("low");
  });
});
