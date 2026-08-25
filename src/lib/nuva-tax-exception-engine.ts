export type TaxExceptionType =
  | "credit_note"
  | "debit_note"
  | "voided"
  | "duplicate"
  | "exempt"
  | "rounding"
  | "period_mismatch";

export type TaxExceptionDocument = {
  id: string;
  type: TaxExceptionType;
  originalDocumentId?: string;
  net: number;
  iva: number;
  total: number;
  period: string;
};

export type TaxExceptionResult = {
  blockers: string[];
  warnings: string[];
  adjustedNet: number;
  adjustedIva: number;
  adjustedTotal: number;
};

export function evaluateTaxExceptions(
  period: string,
  documents: TaxExceptionDocument[],
): TaxExceptionResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  let adjustedNet = 0;
  let adjustedIva = 0;
  let adjustedTotal = 0;
  const ids = new Set<string>();

  for (const document of documents) {
    if (ids.has(document.id)) {
      blockers.push(`Documento duplicado detectado: ${document.id}.`);
      continue;
    }
    ids.add(document.id);

    if (document.period !== period) {
      warnings.push(`Documento ${document.id} pertenece al período ${document.period}.`);
      continue;
    }

    const sign = document.type === "credit_note" || document.type === "voided" ? -1 : 1;
    if (document.type === "debit_note")
      warnings.push(`Nota de débito ${document.id} incrementa la base del período.`);
    if (document.type === "exempt") {
      adjustedNet += sign * document.net;
      adjustedTotal += sign * document.total;
      continue;
    }

    adjustedNet += sign * document.net;
    adjustedIva += sign * document.iva;
    adjustedTotal += sign * document.total;

    if (document.type === "credit_note" && !document.originalDocumentId)
      blockers.push(`Nota de crédito ${document.id} no referencia documento original.`);
    if (document.type === "debit_note" && !document.originalDocumentId)
      blockers.push(`Nota de débito ${document.id} no referencia documento original.`);
    if (
      document.type === "rounding" &&
      Math.abs(document.total - (document.net + document.iva)) > 1
    )
      warnings.push(`Redondeo del documento ${document.id} supera la tolerancia.`);
  }

  return { blockers, warnings, adjustedNet, adjustedIva, adjustedTotal };
}
