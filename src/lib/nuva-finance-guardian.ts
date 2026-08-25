export type FinanceDocument = {
  total: number;
  tax?: number;
  date: string;
  status?: "accepted" | "rejected" | "pending" | "cancelled";
};

export type FinanceGuardianInput = {
  sales: FinanceDocument[];
  purchases: FinanceDocument[];
  receivables?: { amount: number; dueDate: string; paid?: boolean }[];
  payables?: { amount: number; dueDate: string; paid?: boolean }[];
  cash?: number;
};

export type FinanceSignal = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  impact: number;
};

export type FinanceGuardianResult = {
  salesTotal: number;
  purchasesTotal: number;
  outputTax: number;
  inputTax: number;
  estimatedVat: number;
  overdueReceivables: number;
  overduePayables: number;
  projectedCash30d: number | null;
  signals: FinanceSignal[];
};

const daysBetween = (a: Date, b: Date) => Math.ceil((b.getTime() - a.getTime()) / 86_400_000);

export function buildFinanceGuardian(
  input: FinanceGuardianInput,
  now = new Date(),
): FinanceGuardianResult {
  const salesTotal = input.sales.reduce((sum, d) => sum + d.total, 0);
  const purchasesTotal = input.purchases.reduce((sum, d) => sum + d.total, 0);
  const outputTax = input.sales.reduce((sum, d) => sum + (d.tax ?? 0), 0);
  const inputTax = input.purchases.reduce((sum, d) => sum + (d.tax ?? 0), 0);
  const estimatedVat = Math.max(0, outputTax - inputTax);

  const overdueReceivables = (input.receivables ?? [])
    .filter((r) => !r.paid && new Date(r.dueDate) < now)
    .reduce((sum, r) => sum + r.amount, 0);
  const overduePayables = (input.payables ?? [])
    .filter((p) => !p.paid && new Date(p.dueDate) < now)
    .reduce((sum, p) => sum + p.amount, 0);

  const next30Receivables = (input.receivables ?? [])
    .filter(
      (r) =>
        !r.paid &&
        daysBetween(now, new Date(r.dueDate)) >= 0 &&
        daysBetween(now, new Date(r.dueDate)) <= 30,
    )
    .reduce((sum, r) => sum + r.amount, 0);
  const next30Payables = (input.payables ?? [])
    .filter(
      (p) =>
        !p.paid &&
        daysBetween(now, new Date(p.dueDate)) >= 0 &&
        daysBetween(now, new Date(p.dueDate)) <= 30,
    )
    .reduce((sum, p) => sum + p.amount, 0);

  const projectedCash30d =
    typeof input.cash === "number"
      ? input.cash + next30Receivables - next30Payables - estimatedVat
      : null;

  const signals: FinanceSignal[] = [];
  if (overdueReceivables > 0) {
    signals.push({
      id: "overdue-receivables",
      severity: "warning",
      title: "Cuentas por cobrar vencidas",
      detail: `Hay $${overdueReceivables.toLocaleString("es-CL")} pendientes de cobro.`,
      impact: Math.min(100, Math.round((overdueReceivables / Math.max(salesTotal, 1)) * 100)),
    });
  }
  if (estimatedVat > 0) {
    signals.push({
      id: "estimated-vat",
      severity: "info",
      title: "IVA estimado",
      detail: `IVA débito menos crédito estimado: $${estimatedVat.toLocaleString("es-CL")}.`,
      impact: 50,
    });
  }
  if (projectedCash30d !== null && projectedCash30d < 0) {
    signals.push({
      id: "cash-risk-30d",
      severity: "critical",
      title: "Riesgo de déficit de caja",
      detail: `La proyección a 30 días cae a $${projectedCash30d.toLocaleString("es-CL")}.`,
      impact: 100,
    });
  }
  if (overduePayables > 0) {
    signals.push({
      id: "overdue-payables",
      severity: "warning",
      title: "Cuentas por pagar vencidas",
      detail: `Hay $${overduePayables.toLocaleString("es-CL")} pendientes de pago.`,
      impact: 60,
    });
  }

  return {
    salesTotal,
    purchasesTotal,
    outputTax,
    inputTax,
    estimatedVat,
    overdueReceivables,
    overduePayables,
    projectedCash30d,
    signals,
  };
}
