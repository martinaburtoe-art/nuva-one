import { describe, expect, it } from "vitest";
import { evaluateTaxExceptions } from "./nuva-tax-exception-engine";

describe("tax exception engine", () => {
  it("blocks credit notes without an original document", () => {
    const result = evaluateTaxExceptions("2026-08", [
      { id: "NC-1", type: "credit_note", net: 1000, iva: 190, total: 1190, period: "2026-08" },
    ]);
    expect(result.blockers).toContain("Nota de crédito NC-1 no referencia documento original.");
    expect(result.adjustedIva).toBe(-190);
  });

  it("detects duplicates and keeps period mismatches out of current totals", () => {
    const result = evaluateTaxExceptions("2026-08", [
      {
        id: "F-1",
        type: "debit_note",
        originalDocumentId: "F-0",
        net: 1000,
        iva: 190,
        total: 1190,
        period: "2026-08",
      },
      {
        id: "F-1",
        type: "debit_note",
        originalDocumentId: "F-0",
        net: 1000,
        iva: 190,
        total: 1190,
        period: "2026-08",
      },
      { id: "F-2", type: "exempt", net: 500, iva: 0, total: 500, period: "2026-07" },
    ]);
    expect(result.blockers.some((b) => b.includes("duplicado"))).toBe(true);
    expect(result.adjustedNet).toBe(1000);
    expect(result.adjustedIva).toBe(190);
    expect(result.warnings.some((w) => w.includes("2026-07"))).toBe(true);
  });
});
