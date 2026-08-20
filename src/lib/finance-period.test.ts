import { describe, expect, it } from "vitest";
import {
  filterTaxDocumentsForPeriod,
  isInTaxPeriod,
  isPurchaseTaxDocument,
  isSalesTaxDocument,
} from "./finance-period";

describe("finance tax periods", () => {
  it("accepts dates inside the selected month and rejects adjacent months", () => {
    expect(isInTaxPeriod("2026-08-01", 2026, 7)).toBe(true);
    expect(isInTaxPeriod("2026-08-31", 2026, 7)).toBe(true);
    expect(isInTaxPeriod("2026-09-01", 2026, 7)).toBe(false);
    expect(isInTaxPeriod("2026-07-31", 2026, 7)).toBe(false);
  });

  it("filters documents by the selected tax period", () => {
    const docs = [
      { document_date: "2026-08-10", document_type: "dte_sale" },
      { document_date: "2026-08-20", document_type: "dte_purchase" },
      { document_date: "2026-09-01", document_type: "dte_sale" },
    ];
    expect(filterTaxDocumentsForPeriod(docs, 2026, 7)).toHaveLength(2);
  });

  it("classifies sales and purchase tax documents", () => {
    expect(isSalesTaxDocument("dte_sale")).toBe(true);
    expect(isSalesTaxDocument("credit_note")).toBe(true);
    expect(isSalesTaxDocument("debit_note")).toBe(true);
    expect(isPurchaseTaxDocument("dte_purchase")).toBe(true);
    expect(isPurchaseTaxDocument("dte_sale")).toBe(false);
  });
});
