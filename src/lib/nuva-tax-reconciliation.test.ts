import { describe, expect, it } from "vitest";
import { reconcileTaxPeriod } from "./nuva-tax-reconciliation";

describe("tax reconciliation", () => {
  it("blocks a period with pending DTE and mismatched RCV/F29", () => {
    const result = reconcileTaxPeriod({
      period: "2026-08",
      documents: [
        { id: "1", type: "sale", folio: "10", status: "accepted", net: 1000, iva: 190, total: 1190, period: "2026-08" },
        { id: "2", type: "sale", folio: "11", status: "pending", net: 500, iva: 95, total: 595, period: "2026-08" },
        { id: "3", type: "purchase", folio: "20", status: "accepted", net: 400, iva: 76, total: 476, period: "2026-08" },
      ],
      rcvPurchasesNet: 400,
      rcvPurchasesIva: 76,
      rcvSalesNet: 1500,
      rcvSalesIva: 285,
      f29OutputIva: 285,
      f29InputIva: 76,
      f29Errors: [],
    });

    expect(result.status).toBe("blocked");
    expect(result.blockers.some((b) => b.includes("pendiente"))).toBe(true);
  });

  it("marks a clean period ready for professional review", () => {
    const result = reconcileTaxPeriod({
      period: "2026-08",
      documents: [
        { id: "1", type: "sale", folio: "10", status: "accepted", net: 1000, iva: 190, total: 1190, period: "2026-08" },
        { id: "2", type: "purchase", folio: "20", status: "accepted", net: 400, iva: 76, total: 476, period: "2026-08" },
      ],
      rcvPurchasesNet: 400,
      rcvPurchasesIva: 76,
      rcvSalesNet: 1000,
      rcvSalesIva: 190,
      f29OutputIva: 190,
      f29InputIva: 76,
      f29Errors: [],
    });

    expect(result.status).toBe("ready_for_review");
    expect(result.score).toBe(100);
  });
});
