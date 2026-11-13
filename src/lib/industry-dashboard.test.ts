import { describe, expect, it } from "vitest";
import { buildIndustryDashboardMetrics } from "@/lib/industry-dashboard";

describe("industry dashboard metric manifest", () => {
  it("shows only evidence-backed basic metrics as available", () => {
    const metrics = buildIndustryDashboardMetrics("hardware_store", {
      sales: { available: true, records: 24 },
      cash: { available: true, records: 5 },
      inventory: { available: true, records: 80 },
      quotes: { available: true, records: 12 },
    });
    expect(metrics.find((metric) => metric.id === "daily_sales")?.status).toBe("available");
    expect(metrics.find((metric) => metric.id === "stock_health")?.status).toBe("available");
    expect(metrics.find((metric) => metric.id === "margin_by_product")?.status).toBe("planned");
    expect(metrics.find((metric) => metric.id === "stockout_risk")?.status).toBe("planned");
  });

  it("does not mark a metric available when its source is empty", () => {
    const metrics = buildIndustryDashboardMetrics("neighborhood_grocery", {
      sales: { available: true, records: 0 },
      cash: { available: true, records: 3 },
      inventory: { available: true, records: 50 },
    });
    expect(metrics.find((metric) => metric.id === "daily_sales")?.status).toBe("insufficient_data");
    expect(metrics.find((metric) => metric.id === "cash_position")?.status).toBe("available");
  });

  it("requires complete cost evidence before exposing product margin", () => {
    const incomplete = buildIndustryDashboardMetrics("produce_market", {
      sales: { available: true, records: 20, complete: false },
      inventory: { available: true, records: 30, complete: true },
    });
    expect(incomplete.find((metric) => metric.id === "margin_by_product")?.status).toBe("planned");

    const complete = buildIndustryDashboardMetrics("produce_market", {
      sales: { available: true, records: 20, complete: true },
      inventory: { available: true, records: 30, complete: true },
    });
    expect(complete.find((metric) => metric.id === "margin_by_product")?.status).toBe("available");
  });

  it("never promotes roadmap-only metrics just because raw tables have data", () => {
    const metrics = buildIndustryDashboardMetrics("hardware_store", {
      sales: { available: true, records: 20, complete: true },
      inventory: { available: true, records: 30, complete: true },
    });
    expect(metrics.find((metric) => metric.id === "stockout_risk")?.status).toBe("planned");
  });

  it("keeps capabilities without a verified operational source in planned state", () => {
    const metrics = buildIndustryDashboardMetrics("beauty_wellness", {
      sales: { available: true, records: 10 },
      cash: { available: true, records: 2 },
      customers: { available: true, records: 15 },
    });
    expect(metrics.find((metric) => metric.id === "appointment_occupancy")?.status).toBe("planned");
  });
});
