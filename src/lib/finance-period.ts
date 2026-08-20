export type TaxDocument = {
  document_date?: string | Date | null;
  document_type?: string | null;
  iva_amount?: number | string | null;
  net_amount?: number | string | null;
};

export function getMonthBounds(year: number, monthIndex: number) {
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1),
  };
}

export function isInTaxPeriod(documentDate: string | Date | null | undefined, year: number, monthIndex: number) {
  if (!documentDate) return false;
  const date = new Date(documentDate);
  if (Number.isNaN(date.getTime())) return false;
  const { start, end } = getMonthBounds(year, monthIndex);
  return date >= start && date < end;
}

export function filterTaxDocumentsForPeriod(
  documents: TaxDocument[],
  year: number,
  monthIndex: number,
) {
  return documents.filter((document) => isInTaxPeriod(document.document_date, year, monthIndex));
}

export function isSalesTaxDocument(documentType: string | null | undefined) {
  return ["dte_sale", "credit_note", "debit_note"].includes(documentType ?? "");
}

export function isPurchaseTaxDocument(documentType: string | null | undefined) {
  return documentType === "dte_purchase";
}
