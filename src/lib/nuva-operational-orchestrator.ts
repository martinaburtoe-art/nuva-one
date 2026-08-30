import { buildNuvaDecision, type NuvaDecision } from "./nuva-decision-engine";
import { buildOperationalIntelligence, type OperationalIntelligence, type OperationalSnapshot } from "./nuva-operational-data-adapter";

type SaleRow = { total?: number | string | null; sale_date?: string | null; status?: string | null; paid_amount?: number | string | null; due_date?: string | null };
type PurchaseRow = { total?: number | string | null; purchase_date?: string | null; status?: string | null };
type TransactionRow = { amount?: number | string | null; type?: string | null; tx_date?: string | null };
type ProductRow = { stock?: number | string | null; min_stock?: number | string | null; reorder_point?: number | string | null; price?: number | string | null; name?: string | null; sku?: string | null };
const n = (value: unknown) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; };

export type NuvaOperationalInput = { sales: SaleRow[]; purchases: PurchaseRow[]; transactions: TransactionRow[]; products: ProductRow[] };
export type NuvaOperationalResult = { decision: NuvaDecision; intelligence: OperationalIntelligence; snapshot: OperationalSnapshot };

/** Single orchestration boundary for executive intelligence. Raw operational data is normalized once. */
export function buildNuvaOperationalResult(input: NuvaOperationalInput): NuvaOperationalResult {
  const activeSales = input.sales.filter((sale) => sale.status !== "cancelled");
  const income = input.transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + n(tx.amount), 0);
  const expense = input.transactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + n(tx.amount), 0);
  const revenue = activeSales.reduce((sum, sale) => sum + n(sale.total), 0);
  const cashAvailable = income - expense;
  const inventoryValue = input.products.reduce((sum, product) => sum + Math.max(0, n(product.stock)) * Math.max(0, n(product.price)), 0);
  const lowStockSkus = input.products.filter((product) => n(product.stock) <= Math.max(n(product.min_stock), n(product.reorder_point))).length;
  const stockoutRisk = input.products.length === 0 ? 0 : Math.round((input.products.filter((product) => n(product.stock) <= 0).length / input.products.length) * 100);
  const overdueReceivables = activeSales.filter((sale) => {
    const due = sale.due_date ? new Date(sale.due_date).getTime() : NaN;
    return Number.isFinite(due) && due < Date.now() && n(sale.paid_amount) < n(sale.total);
  }).reduce((sum, sale) => sum + Math.max(0, n(sale.total) - n(sale.paid_amount)), 0);

  const snapshot: OperationalSnapshot = {
    financialHealthScore: cashAvailable >= 0 ? Math.min(100, 60 + (income > 0 ? Math.min(25, (cashAvailable / income) * 25) : 0)) : 30,
    cashAvailable,
    projectedCash30d: cashAvailable,
    overdueReceivables,
    revenue,
    inventoryValue,
    lowStockSkus,
    stockoutRisk,
    grossMargin: null,
    taxMismatchAmount: 0,
    complianceReadiness: 100,
    dataSources: [input.sales.length ? "ventas" : "", input.purchases.length ? "compras" : "", input.transactions.length ? "caja-finanzas" : "", input.products.length ? "inventario" : "", activeSales.length ? "cobranza" : ""],
  };

  const decision = buildNuvaDecision({
    sales: input.sales.map((sale) => ({ total: n(sale.total), sale_date: sale.sale_date ?? undefined, status: sale.status ?? undefined, paid_amount: n(sale.paid_amount), due_date: sale.due_date ?? undefined })),
    purchases: input.purchases.map((purchase) => ({ total: n(purchase.total), purchase_date: purchase.purchase_date ?? undefined, status: purchase.status ?? undefined })),
    transactions: input.transactions.map((tx) => ({ amount: n(tx.amount), type: tx.type ?? undefined, tx_date: tx.tx_date ?? undefined })),
    stock: input.products.map((product) => ({ quantity: n(product.stock), min_stock: n(product.min_stock), reorder_point: n(product.reorder_point), price: n(product.price), name: product.name ?? undefined, sku: product.sku ?? undefined })),
  });
  const intelligence = buildOperationalIntelligence(snapshot);
  return { decision, intelligence, snapshot };
}
