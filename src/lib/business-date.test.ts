import { describe, expect, it } from "vitest";
import { getBusinessLocalDate, isBusinessDateOverdue } from "./business-date";

describe("business date boundaries", () => {
  it("uses the Chilean calendar date instead of UTC after 21:00 local time", () => {
    const now = new Date("2026-11-19T01:00:00.000Z"); // 22:00 in Santiago on Nov 18
    expect(getBusinessLocalDate(now)).toBe("2026-11-18");
    expect(isBusinessDateOverdue("2026-11-19", now)).toBe(false);
    expect(isBusinessDateOverdue("2026-11-18", now)).toBe(false);
  });

  it("marks the previous calendar date overdue after midnight in the business timezone", () => {
    const now = new Date("2026-11-19T03:00:00.000Z"); // 00:00 in Santiago on Nov 19
    expect(getBusinessLocalDate(now)).toBe("2026-11-19");
    expect(isBusinessDateOverdue("2026-11-18", now)).toBe(true);
  });

  it("compares timestamps as instants", () => {
    const now = new Date("2026-11-19T03:00:00.000Z");
    expect(isBusinessDateOverdue("2026-11-19T02:59:59.000Z", now)).toBe(true);
    expect(isBusinessDateOverdue("2026-11-19T03:00:00.000Z", now)).toBe(false);
  });

  it("rejects invalid date-only values", () => {
    expect(isBusinessDateOverdue("2026-02-30", new Date("2026-03-01T12:00:00.000Z"))).toBe(false);
    expect(isBusinessDateOverdue("not-a-date", new Date("2026-03-01T12:00:00.000Z"))).toBe(false);
  });

  it("supports an explicit business timezone", () => {
    const now = new Date("2026-11-19T01:00:00.000Z");
    expect(getBusinessLocalDate(now, "UTC")).toBe("2026-11-19");
    expect(isBusinessDateOverdue("2026-11-19", now, "UTC")).toBe(false);
  });
});
