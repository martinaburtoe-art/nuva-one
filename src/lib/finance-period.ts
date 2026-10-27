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

function taxDateComponents(documentDate: string | Date): { year: number; month: number } | null {
  if (documentDate instanceof Date) {
    if (Number.isNaN(documentDate.getTime())) return null;
    return { year: documentDate.getFullYear(), month: documentDate.getMonth() };
  }
  if (typeof documentDate === "string") {
    const isoDate = /^(\d{4})-(\d{2})-\d{2}$/.exec(documentDate);
    if (isoDate) return { year: Number(isoDate[1]), month: Number(isoDate[2]) - 1 };
    const parsed = new Date(documentDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return { year: parsed.getFullYear(), month: parsed.getMonth() };
  }
  return null;
}

export function isInTaxPeriod(
  documentDate: string | Date | null | undefined,
  year: number,
  monthIndex: number,
) {
  if (!documentDate) return false;
  const parts = taxDateComponents(documentDate);
  return parts !== null && parts.year === year && parts.month === monthIndex;
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
