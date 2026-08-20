import { describe, expect, it } from "vitest";
import { buildEarlyWarnings } from "./nuva-early-warning";

describe("early warning", () => {
  it("creates actionable warnings only above confidence threshold", () => {
    const result = buildEarlyWarnings([
      { id: "1", module: "cashflow", title: "Caja", severity: "critical", confidence: 90, impact: 1000, action: "Revisar" },
      { id: "2", module: "inventory", title: "Stock", severity: "medium", confidence: 70, impact: 100, action: "Vigilar" },
      { id: "3", module: "crm", title: "Cliente", severity: "high", confidence: 40, impact: 500, action: "No actuar" },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].horizon).toBe("immediate");
    expect(result[0].status).toBe("act");
  });
});
