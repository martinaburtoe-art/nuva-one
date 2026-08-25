import { describe, expect, it } from "vitest";
import { buildRegulatoryActions } from "./nuva-regulatory-actions";

describe("Nüva regulatory actions", () => {
  it("creates explicit preparation actions for missing capabilities", () => {
    const actions = buildRegulatoryActions([]);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((action) => action.mode === "prepare")).toBe(true);
    expect(actions.every((action) => action.missing.length > 0)).toBe(true);
  });

  it("prioritizes critical regulatory gaps", () => {
    const actions = buildRegulatoryActions([]);
    expect(actions[0]?.priority).toBe("critical");
  });

  it("returns no action for a fully implemented rule", () => {
    const actions = buildRegulatoryActions([
      "dte",
      "xml",
      "folios",
      "certification",
      "audit-trail",
      "boleta",
      "credit-note",
      "daily-summary",
      "folio-control",
      "delivery",
      "attendance",
      "schedule-rules",
      "alerts",
      "privacy-center",
      "consent",
      "purpose-management",
      "data-export",
      "deletion",
      "retention",
    ]);
    expect(actions).toHaveLength(0);
  });
});
