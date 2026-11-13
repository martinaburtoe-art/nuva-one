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
});
