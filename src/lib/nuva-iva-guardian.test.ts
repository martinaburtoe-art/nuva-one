import { describe, expect, it } from "vitest";
import { buildIvaGuardian } from "./nuva-iva-guardian";

describe("Nüva IVA Guardian", () => {
  it("calculates debit, credit and estimated VAT", () => {
    const result = buildIvaGuardian({
      internal: [
        { id: "F1", kind: "sale", net: 100000, vat: 19000, gross: 119000, issuedAt: "2026-08-01" },
        { id: "P1", kind: "purchase", net: 50000, vat: 9500, gross: 59500, issuedAt: "2026-08-02" },
      ],
      sii: [
        { id: "F1", kind: "sale", net: 100000, vat: 19000, gross: 119000, issuedAt: "2026-08-01" },
        { id: "P1", kind: "purchase", net: 50000, vat: 9500, gross: 59500, issuedAt: "2026-08-02" },
      ],
    });

    expect(result.debitVat).toBe(19000);
    expect(result.creditVat).toBe(9500);
    expect(result.estimatedVat).toBe(9500);
    expect(result.readiness).toBe(100);
    expect(result.risk).toBe("low");
  });

  it("flags internal/SII mismatches before a tax period is prepared", () => {
    const result = buildIvaGuardian({
      internal: [{ id: "F1", kind: "sale", net: 100000, vat: 19000, gross: 119000, issuedAt: "2026-08-01" }],
      sii: [{ id: "F2", kind: "sale", net: 100000, vat: 19000, gross: 119000, issuedAt: "2026-08-01" }],
    });

    expect(result.unmatchedInternal).toEqual(["F1"]);
    expect(result.unmatchedSii).toEqual(["F2"]);
    expect(result.alerts.length).toBeGreaterThan(0);
    expect(result.risk).toBe("medium");
  });

  it("applies credit and debit notes as explicit adjustments", () => {
    const result = buildIvaGuardian({
      internal: [
        { id: "F1", kind: "sale", net: 100000, vat: 19000, gross: 119000, issuedAt: "2026-08-01" },
        { id: "NC1", kind: "credit_note", net: 10000, vat: 1900, gross: 11900, issuedAt: "2026-08-03" },
        { id: "ND1", kind: "debit_note", net: 5000, vat: 950, gross: 5950, issuedAt: "2026-08-04" },
      ],
      sii: [],
    });

    expect(result.adjustments).toBe(-950);
    expect(result.estimatedVat).toBe(18050);
  });
});
