import { describe, expect, it } from "vitest";
import { forecastMetric } from "./nuva-predictive-engine";

describe("predictive engine", () => {
  it("detects a material downward trend", () => {
    const result = forecastMetric(
      [
        { period: "1", value: 100 },
        { period: "2", value: 90 },
        { period: "3", value: 80 },
        { period: "4", value: 70 },
        { period: "5", value: 60 },
        { period: "6", value: 50 },
      ],
      2,
    );
    expect(result.trend).toBe("down");
    expect(result.risk).toBe("critical");
    expect(result.forecast[0]).toBeGreaterThanOrEqual(0);
  });

  it("stays stable for a flat series", () => {
    const result = forecastMetric([
      { period: "1", value: 100 },
      { period: "2", value: 100 },
      { period: "3", value: 100 },
    ]);
    expect(result.trend).toBe("stable");
    expect(result.risk).toBe("low");
  });

  it("refuses to invent a forecast without enough data", () => {
    const result = forecastMetric([{ period: "1", value: 100 }]);
    expect(result.forecast).toHaveLength(0);
    expect(result.confidence).toBe("low");
  });
});
