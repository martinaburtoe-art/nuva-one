export type TaxReadinessInput = {
  dteAccepted: number;
  dteRejected: number;
  dtePending: number;
  dteMissingXml: number;
  rcvPurchaseUnreconciled: number;
  rcvSalesUnreconciled: number;
  ivaDifference: number;
  f29Errors: number;
  f29Warnings: number;
  periodLocked: boolean;
};

export type TaxReadinessResult = {
  score: number;
  status: "blocked" | "review" | "ready-for-review" | "ready";
  blockers: string[];
  warnings: string[];
  checks: Array<{ id: string; ok: boolean; label: string }>;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function assessChileTaxReadiness(input: TaxReadinessInput): TaxReadinessResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checks = [
    { id: "dte-rejected", ok: input.dteRejected === 0, label: "DTE rechazados resueltos" },
    { id: "dte-pending", ok: input.dtePending === 0, label: "DTE pendientes de validación" },
    { id: "xml", ok: input.dteMissingXml === 0, label: "XML de DTE disponible" },
    { id: "rcv-purchases", ok: input.rcvPurchaseUnreconciled === 0, label: "Compras RCV conciliadas" },
    { id: "rcv-sales", ok: input.rcvSalesUnreconciled === 0, label: "Ventas RCV conciliadas" },
    { id: "iva", ok: input.ivaDifference === 0, label: "IVA conciliado" },
    { id: "f29", ok: input.f29Errors === 0, label: "F29 sin errores internos" },
    { id: "lock", ok: input.periodLocked, label: "Período cerrado para cambios" },
  ];

  if (input.dteRejected > 0) blockers.push(`${input.dteRejected} DTE rechazados requieren resolución.`);
  if (input.dtePending > 0) blockers.push(`${input.dtePending} DTE aún están pendientes de validación.`);
  if (input.dteMissingXml > 0) blockers.push(`${input.dteMissingXml} DTE no tienen XML disponible.`);
  if (input.rcvPurchaseUnreconciled > 0) blockers.push(`${input.rcvPurchaseUnreconciled} compras no están conciliadas con RCV.`);
  if (input.rcvSalesUnreconciled > 0) blockers.push(`${input.rcvSalesUnreconciled} ventas no están conciliadas con RCV.`);
  if (input.ivaDifference !== 0) blockers.push(`Existe una diferencia de IVA de ${input.ivaDifference}.`);
  if (input.f29Errors > 0) blockers.push(`${input.f29Errors} errores impiden considerar preparado el F29.`);
  if (!input.periodLocked) warnings.push("El período aún no está bloqueado; se requiere revisión antes de una declaración final.");
  if (input.f29Warnings > 0) warnings.push(`${input.f29Warnings} advertencias del F29 requieren revisión profesional.`);

  const acceptedRatio = input.dteAccepted + input.dteRejected + input.dtePending > 0
    ? input.dteAccepted / (input.dteAccepted + input.dteRejected + input.dtePending)
    : 1;
  let score = 100;
  score -= blockers.length * 12;
  score -= warnings.length * 3;
  score += acceptedRatio === 1 ? 0 : -Math.round((1 - acceptedRatio) * 10);
  score = clamp(score);

  const status = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "ready-for-review" : input.periodLocked ? "ready" : "review";
  return { score, status, blockers, warnings, checks };
}
