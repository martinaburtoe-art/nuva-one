import { describe, expect, it } from "vitest";
import { buildCashflowActions } from "./nuva-cashflow-actions";

describe("buildCashflowActions", () => {
  it("prioritizes a liquidity plan when projected cash is negative", () => {
    const actions = buildCashflowActions({
      projectedMinimum: -500000,
      deficitDay: 8,
      overdueReceivables: 1200000,
      discretionaryPayables: 400000,
    });

    expect(actions[0]).toMatchObject({
      id: "liquidity-deficit",
      priority: "critical",
      mode: "prepare",
    });
    expect(actions.map((a) => a.id)).toEqual([
      "liquidity-deficit",
      "collections",
      "discretionary-spend",
    ]);
  });

  it("does not create deficit actions when projected cash remains positive", () => {
    const actions = buildCashflowActions({ projectedMinimum: 100000, overdueReceivables: 0 });
    expect(actions).toHaveLength(0);
  });
});
