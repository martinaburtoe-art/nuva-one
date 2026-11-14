export type QuoteTaxTreatment = "taxable" | "exempt" | "non_taxable";

export type QuoteCalculationItem = {
  name: string;
  qty: number;
  price: number;
};

export type QuoteTotals = {
  subtotal: number;
  discountAmount: number;
  discountPct: number;
  taxableBase: number;
  tax: number;
  vatRate: number;
  taxTreatment: QuoteTaxTreatment;
  total: number;
};

export function calculateQuoteTotals(
  items: QuoteCalculationItem[],
  discountPct: number,
  taxTreatment: QuoteTaxTreatment,
  vatRate = 19,
): QuoteTotals {
  if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
    throw new Error("El descuento debe estar entre 0 y 100.");
  }
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) {
    throw new Error("La tasa de impuesto no es válida.");
  }
  if (!["taxable", "exempt", "non_taxable"].includes(taxTreatment)) {
    throw new Error("El tratamiento tributario no es válido.");
  }

  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.qty);
    const price = Number(item.price);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error("Cada cantidad debe ser mayor que cero.");
    if (!Number.isFinite(price) || price < 0) throw new Error("Cada precio debe ser cero o mayor.");
    const line = Math.round(qty * price);
    if (!Number.isSafeInteger(line) || !Number.isSafeInteger(sum + line)) {
      throw new Error("El importe supera el límite monetario admitido.");
    }
    return sum + line;
  }, 0);

  const discountAmount = Math.round((subtotal * discountPct) / 100);
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const effectiveRate = taxTreatment === "taxable" ? vatRate : 0;
  const tax = Math.round((taxableBase * effectiveRate) / 100);
  const total = taxableBase + tax;

  return {
    subtotal,
    discountAmount,
    discountPct,
    taxableBase,
    tax,
    vatRate: effectiveRate,
    taxTreatment,
    total,
  };
}

export function formatQuoteNumber(value?: number | null): string {
  return value ? `COT-${String(value).padStart(4, "0")}` : "BORRADOR";
}
