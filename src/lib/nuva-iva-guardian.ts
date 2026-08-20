export type IvaDocumentKind = "sale" | "purchase" | "credit_note" | "debit_note";

export interface IvaDocument {
  id: string;
  kind: IvaDocumentKind;
  net: number;
  vat: number;
  gross: number;
  issuedAt: string;
  source?: "internal" | "sii";
  status?: "accepted" | "rejected" | "cancelled" | "pending";
}

export interface IvaGuardianInput {
  internal: IvaDocument[];
  sii: IvaDocument[];
}

export interface IvaGuardianResult {
  debitVat: number;
  creditVat: number;
  adjustments: number;
  estimatedVat: number;
  internalGross: number;
  siiGross: number;
  grossDifference: number;
  unmatchedInternal: string[];
  unmatchedSii: string[];
  risk: "low" | "medium" | "high";
  readiness: number;
  alerts: string[];
}

const round = (value: number) => Math.round(value * 100) / 100;

function effectiveVat(document: IvaDocument) {
  if (document.status === "cancelled" || document.status === "rejected") return 0;
  if (document.kind === "credit_note") return -Math.abs(document.vat);
  if (document.kind === "debit_note") return Math.abs(document.vat);
  return document.vat;
}

function validDocuments(documents: IvaDocument[]) {
  return documents.filter((document) => Number.isFinite(document.vat) && document.vat >= 0);
}

export function buildIvaGuardian(input: IvaGuardianInput): IvaGuardianResult {
  const internal = validDocuments(input.internal);
  const sii = validDocuments(input.sii);
  const siiById = new Set(sii.map((document) => document.id));
  const internalById = new Set(internal.map((document) => document.id));

  const debitVat = round(internal.filter((d) => d.kind === "sale").reduce((sum, d) => sum + effectiveVat(d), 0));
  const creditVat = round(internal.filter((d) => d.kind === "purchase").reduce((sum, d) => sum + effectiveVat(d), 0));
  const adjustments = round(internal.filter((d) => d.kind === "credit_note" || d.kind === "debit_note").reduce((sum, d) => sum + effectiveVat(d), 0));
  const estimatedVat = round(debitVat - creditVat + adjustments);

  const internalGross = round(internal.reduce((sum, d) => sum + d.gross, 0));
  const siiGross = round(sii.reduce((sum, d) => sum + d.gross, 0));
  const grossDifference = round(internalGross - siiGross);
  const unmatchedInternal = internal.filter((d) => !siiById.has(d.id)).map((d) => d.id);
  const unmatchedSii = sii.filter((d) => !internalById.has(d.id)).map((d) => d.id);

  const alerts: string[] = [];
  if (unmatchedInternal.length > 0) alerts.push("Existen documentos internos que no fueron encontrados en la fuente SII importada.");
  if (unmatchedSii.length > 0) alerts.push("Existen documentos SII que no están conciliados con el registro interno.");
  if (Math.abs(grossDifference) > 1) alerts.push("Existe una diferencia de monto bruto entre registros internos y SII.");
  if (estimatedVat < 0) alerts.push("El crédito/ajustes superan el débito estimado; revisar antes de preparar el período tributario.");

  const discrepancyPenalty = Math.min(50, unmatchedInternal.length * 8 + unmatchedSii.length * 8 + (Math.abs(grossDifference) > 1 ? 20 : 0));
  const readiness = Math.max(0, Math.min(100, 100 - discrepancyPenalty));
  const risk = readiness >= 90 ? "low" : readiness >= 70 ? "medium" : "high";

  return {
    debitVat,
    creditVat,
    adjustments,
    estimatedVat,
    internalGross,
    siiGross,
    grossDifference,
    unmatchedInternal,
    unmatchedSii,
    risk,
    readiness,
    alerts,
  };
}
