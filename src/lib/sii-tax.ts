export type SiiTaxTreatment = "gravado_19" | "exento";

export function normalizeTaxTreatment(value: unknown): SiiTaxTreatment {
  return value === "exento" ? "exento" : "gravado_19";
}

export function splitSiiTotal(totalValue: number, treatment: SiiTaxTreatment) {
  const total = Math.max(0, Math.round(Number(totalValue) || 0));
  if (treatment === "exento") return { net: total, iva: 0, total };
  const net = Math.round(total / 1.19);
  return { net, iva: total - net, total };
}

export function siiTreatmentLabel(treatment: SiiTaxTreatment) {
  return treatment === "exento" ? "Exento" : "Gravado 19%";
}
