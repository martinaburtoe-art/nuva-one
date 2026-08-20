export type TaxDocumentStatus = "accepted" | "rejected" | "pending" | "missing";

export type TaxDocument = {
  id: string;
  type: "purchase" | "sale";
  folio: string;
  status: TaxDocumentStatus;
  net: number;
  iva: number;
  total: number;
  period: string;
};

export type TaxReconciliationInput = {
  period: string;
  documents: TaxDocument[];
  rcvPurchasesNet: number;
  rcvPurchasesIva: number;
  rcvSalesNet: number;
  rcvSalesIva: number;
  f29OutputIva: number;
  f29InputIva: number;
  f29Errors: string[];
};

export type TaxReconciliationResult = {
  status: "blocked" | "review" | "ready_for_review";
  score: number;
  blockers: string[];
  warnings: string[];
  totals: { salesNet: number; salesIva: number; purchasesNet: number; purchasesIva: number };
};

const round = (n: number) => Math.round(n * 100) / 100;
const equal = (a: number, b: number) => Math.abs(a - b) <= 1;

export function reconcileTaxPeriod(input: TaxReconciliationInput): TaxReconciliationResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const docs = input.documents.filter((d) => d.period === input.period);
  const sales = docs.filter((d) => d.type === "sale" && d.status === "accepted");
  const purchases = docs.filter((d) => d.type === "purchase" && d.status === "accepted");
  const pending = docs.filter((d) => d.status === "pending");
  const rejected = docs.filter((d) => d.status === "rejected");
  const missing = docs.filter((d) => d.status === "missing");

  const totals = {
    salesNet: round(sales.reduce((sum, d) => sum + d.net, 0)),
    salesIva: round(sales.reduce((sum, d) => sum + d.iva, 0)),
    purchasesNet: round(purchases.reduce((sum, d) => sum + d.net, 0)),
    purchasesIva: round(purchases.reduce((sum, d) => sum + d.iva, 0)),
  };

  if (pending.length) blockers.push(`${pending.length} DTE en estado pendiente.`);
  if (rejected.length) blockers.push(`${rejected.length} DTE rechazados requieren revisión.`);
  if (missing.length) blockers.push(`${missing.length} documentos marcados como faltantes.`);
  if (!equal(totals.salesNet, input.rcvSalesNet) || !equal(totals.salesIva, input.rcvSalesIva)) blockers.push("Las ventas aceptadas no cuadran con el RCV informado.");
  if (!equal(totals.purchasesNet, input.rcvPurchasesNet) || !equal(totals.purchasesIva, input.rcvPurchasesIva)) blockers.push("Las compras aceptadas no cuadran con el RCV informado.");
  if (!equal(input.f29OutputIva, input.rcvSalesIva)) blockers.push("El débito IVA informado para F29 no coincide con el RCV de ventas.");
  if (!equal(input.f29InputIva, input.rcvPurchasesIva)) blockers.push("El crédito IVA informado para F29 no coincide con el RCV de compras.");
  if (input.f29Errors.length) blockers.push(...input.f29Errors.map((error) => `F29: ${error}`));
  if (docs.length === 0) blockers.push("No existen documentos del período para conciliar.");
  if (docs.some((d) => d.total !== round(d.net + d.iva))) warnings.push("Existen documentos cuyo total no coincide con neto + IVA; revisar impuestos y exentos.");

  const status = blockers.length ? "blocked" : warnings.length ? "review" : "ready_for_review";
  const score = Math.max(0, Math.min(100, 100 - blockers.length * 20 - warnings.length * 5));
  return { status, score, blockers, warnings, totals };
}
