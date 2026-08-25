export type IntelligenceSeverity = "critical" | "warning" | "opportunity" | "info";

export type IntelligenceSignal = {
  id: string;
  severity: IntelligenceSeverity;
  title: string;
  explanation: string;
  action: string;
  metric?: number;
  unit?: "clp" | "percent" | "days" | "units";
  source: string[];
};

type Sale = {
  total?: number;
  sale_date?: string;
  status?: string;
  paid_amount?: number;
  due_date?: string;
};
type Purchase = { total?: number; purchase_date?: string; status?: string };
type Transaction = { amount?: number; type?: string; tx_date?: string };
type Stock = {
  quantity?: number;
  min_stock?: number;
  reorder_point?: number;
  name?: string;
  sku?: string;
};

const amount = (value: unknown) => Number(value || 0);
const active = (status?: string) => status !== "cancelled" && status !== "canceled";

export function buildNuvaIntelligence(input: {
  sales?: Sale[];
  purchases?: Purchase[];
  transactions?: Transaction[];
  stock?: Stock[];
  now?: Date;
}): IntelligenceSignal[] {
  const sales = (input.sales ?? []).filter((x) => active(x.status));
  const purchases = (input.purchases ?? []).filter((x) => active(x.status));
  const transactions = input.transactions ?? [];
  const stock = input.stock ?? [];
  const now = input.now ?? new Date();
  const signals: IntelligenceSignal[] = [];

  const revenue = sales.reduce((s, x) => s + amount(x.total), 0);
  const purchaseSpend = purchases.reduce((s, x) => s + amount(x.total), 0);
  const expenses = transactions
    .filter((x) => x.type === "expense")
    .reduce((s, x) => s + amount(x.amount), 0);
  const income = transactions
    .filter((x) => x.type === "income")
    .reduce((s, x) => s + amount(x.amount), 0);

  const overdue = sales.filter((x) => {
    if (!x.due_date) return false;
    return new Date(x.due_date) < now && amount(x.paid_amount) < amount(x.total);
  });
  const overdueAmount = overdue.reduce(
    (s, x) => s + Math.max(0, amount(x.total) - amount(x.paid_amount)),
    0,
  );

  if (overdueAmount > 0) {
    signals.push({
      id: "receivables-overdue",
      severity: overdueAmount > revenue * 0.2 ? "critical" : "warning",
      title: "Cuentas por cobrar requieren atención",
      explanation: `${overdue.length} venta(s) presentan saldo vencido por ${Math.round(overdueAmount).toLocaleString("es-CL")} CLP.`,
      action:
        "Prioriza cobranza y registra compromisos de pago antes de aumentar nuevas ventas a crédito.",
      metric: overdueAmount,
      unit: "clp",
      source: ["ventas", "caja"],
    });
  }

  if (revenue > 0 && purchaseSpend > revenue * 0.7) {
    const ratio = (purchaseSpend / revenue) * 100;
    signals.push({
      id: "purchase-pressure",
      severity: ratio > 90 ? "critical" : "warning",
      title: "Presión de compras sobre las ventas",
      explanation: `Las compras representan aproximadamente ${ratio.toFixed(1)}% de las ventas analizadas.`,
      action:
        "Revisa margen por producto, rotación y condiciones de proveedores antes de aumentar inventario.",
      metric: ratio,
      unit: "percent",
      source: ["compras", "ventas", "inventario"],
    });
  }

  const lowStock = stock.filter((x) => {
    const qty = amount(x.quantity);
    const threshold = amount(x.reorder_point || x.min_stock);
    return threshold > 0 && qty <= threshold;
  });
  if (lowStock.length) {
    signals.push({
      id: "low-stock",
      severity: "warning",
      title: "Inventario próximo al punto de reposición",
      explanation: `${lowStock.length} SKU(s) están en o bajo su nivel de reposición configurado.`,
      action: "Revisa la rotación y genera una compra sugerida para los SKU prioritarios.",
      metric: lowStock.length,
      unit: "units",
      source: ["inventario", "compras"],
    });
  }

  const netCashProxy = income - expenses;
  if (expenses > income && transactions.length > 0) {
    signals.push({
      id: "cash-burn",
      severity: "critical",
      title: "Egresos superiores a ingresos registrados",
      explanation: `Los egresos registrados superan los ingresos por ${Math.round(expenses - income).toLocaleString("es-CL")} CLP en el conjunto analizado.`,
      action: "Revisa gastos recurrentes y obligaciones próximas antes de comprometer nueva caja.",
      metric: Math.abs(netCashProxy),
      unit: "clp",
      source: ["caja", "finanzas"],
    });
  }

  if (revenue > 0 && expenses < revenue * 0.15 && sales.length >= 3) {
    signals.push({
      id: "growth-opportunity",
      severity: "opportunity",
      title: "Espacio para mejorar conversión y recompra",
      explanation:
        "Las ventas muestran actividad mientras los gastos operativos registrados son relativamente bajos.",
      action:
        "Activa campañas de recompra y seguimiento de clientes antes de aumentar estructura de costos.",
      metric: revenue,
      unit: "clp",
      source: ["ventas", "clientes", "marketing"],
    });
  }

  if (!signals.length) {
    signals.push({
      id: "business-stable",
      severity: "info",
      title: "Sin alertas críticas detectadas",
      explanation: "Con los datos disponibles no se detectaron señales de riesgo prioritarias.",
      action:
        "Mantén el seguimiento y completa los datos de ventas, compras, caja e inventario para aumentar la precisión.",
      source: ["ventas", "compras", "caja", "inventario"],
    });
  }

  return signals.sort((a, b) => {
    const weight: Record<IntelligenceSeverity, number> = {
      critical: 4,
      warning: 3,
      opportunity: 2,
      info: 1,
    };
    return weight[b.severity] - weight[a.severity];
  });
}
