import { describe, expect, it } from "vitest";
import { getDateRangePresets } from "./date-range-filter";

describe("getDateRangePresets", () => {
  it("returns inclusive 7-day and 30-day windows", () => {
    const presets = getDateRangePresets(new Date(2026, 10, 13, 12));
    expect(presets[0]).toMatchObject({ from: "07-11-2026", to: "13-11-2026" });
    expect(presets[1]).toMatchObject({ from: "15-10-2026", to: "13-11-2026" });
  });

  it("uses the local calendar month boundaries", () => {
    const presets = getDateRangePresets(new Date(2026, 10, 13, 12));
    expect(presets[2]).toMatchObject({ from: "01-11-2026", to: "13-11-2026" });
    expect(presets[3]).toMatchObject({ from: "01-10-2026", to: "31-10-2026" });
  });

  it("handles leap-year February and the previous-year boundary", () => {
    const leapYearPresets = getDateRangePresets(new Date(2024, 2, 15, 12));
    expect(leapYearPresets[3]).toMatchObject({ from: "01-02-2024", to: "29-02-2024" });

    const januaryPresets = getDateRangePresets(new Date(2027, 0, 5, 12));
    expect(januaryPresets[3]).toMatchObject({ from: "01-12-2026", to: "31-12-2026" });
  });
});
