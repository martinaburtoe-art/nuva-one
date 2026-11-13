import { describe, expect, it } from "vitest";
import { getNuvaScorePeriod } from "@/lib/nuva-score-periods";

describe("getNuvaScorePeriod", () => {
  it("uses local calendar dates without UTC ISO conversion", () => {
    const period = getNuvaScorePeriod(new Date(2026, 10, 12, 23, 45));
    expect(period).toEqual({
      today: "2026-11-12",
      last30Start: "2026-10-14",
      currentMonthStart: "2026-11-01",
      previousMonthStart: "2026-10-01",
      previousComparableEndExclusive: "2026-10-13",
    });
  });

  it("clamps the previous comparison window to the prior month's final day", () => {
    const period = getNuvaScorePeriod(new Date(2026, 2, 31, 12));
    expect(period.previousMonthStart).toBe("2026-02-01");
    expect(period.previousComparableEndExclusive).toBe("2026-03-01");
  });

  it("handles leap February when comparing from March 31", () => {
    const period = getNuvaScorePeriod(new Date(2024, 2, 31, 12));
    expect(period.previousComparableEndExclusive).toBe("2024-03-01");
  });

  it("handles year boundaries", () => {
    const period = getNuvaScorePeriod(new Date(2027, 0, 1, 8));
    expect(period.previousMonthStart).toBe("2026-12-01");
    expect(period.previousComparableEndExclusive).toBe("2026-12-02");
  });
});
