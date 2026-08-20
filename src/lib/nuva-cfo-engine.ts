export type CFOInput = {
  revenue: number;
  grossProfit: number;
  operatingExpenses: number;
  cash: number;
  projectedCash30d: number;
  receivables: number;
  overdueReceivables: number;
  payables: number;
  inventoryValue: number;
  monthlyInventoryCost: number;
};

export type CFOInsight = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  finding: string;
  metric: number;
  unit: "CLP" | "percent" | "days" | "ratio";
  action: string;
};

const round = (n: number) => Math.round(n * 100) / 100;
const pct = (n: number) => round(n * 100);

export function buildCFOInsights(input: CFOInput): CFOInsight[] {
  const insights: CFOInsight[] = [];
  const monthlyBurn = Math.max(0, input.operatingExpenses);
  const runwayDays = monthlyBurn > 0 ? round((input.cash / monthlyBurn) * 30) : 999;
  const overdueRate = input.receivables > 0 ? input.overdueReceivables / input.receivables : 0;
  const grossMargin = input.revenue > 0 ? input.grossProfit / input.revenue : 0;
  const operatingResult = input.grossProfit - input.operatingExpenses;
  const inventoryMonths = input.monthlyInventoryCost > 0 ? input.inventoryValue / input.monthlyInventoryCost : 0;

  if (input.projectedCash30d < 0) {
    insights.push({
      id: "liquidity-gap",
      severity: "critical",
      title: "Riesgo de déficit de caja",
      finding: `La caja proyectada a 30 días es ${Math.round(input.projectedCash30d).toLocaleString("es-CL")} CLP.`,
      metric: Math.round(input.projectedCash30d),
      unit: "CLP",
      action: "Priorizar cobranza, revisar egresos no críticos y simular escenarios antes de comprometer nueva inversión.",
    });
  }

  if (overdueRate >= 0.3) {
    insights.push({
      id: "collections-risk",
      severity: overdueRate >= 0.5 ? "high" : "medium",
      title: "Cobranza deteriorada",
      finding: `${pct(overdueRate)}% de las cuentas por cobrar están vencidas.`,
      metric: pct(overdueRate),
      unit: "percent",
      action: "Priorizar clientes vencidos por monto y antigüedad y preparar un plan de cobranza.",
    });
  }

  if (grossMargin < 0.25) {
    insights.push({
      id: "margin-pressure",
      severity: grossMargin < 0.15 ? "high" : "medium",
      title: "Presión sobre margen bruto",
      finding: `El margen bruto actual es ${pct(grossMargin)}%.`,
      metric: pct(grossMargin),
      unit: "percent",
      action: "Revisar precios, costos unitarios y productos con contribución insuficiente.",
    });
  }

  if (operatingResult < 0) {
    insights.push({
      id: "operating-loss",
      severity: "high",
      title: "Resultado operacional negativo",
      finding: "El margen bruto no alcanza para cubrir los gastos operacionales registrados.",
      metric: Math.round(operatingResult),
      unit: "CLP",
      action: "Separar gastos críticos de discrecionales y revisar estructura de costos.",
    });
  }

  if (inventoryMonths > 6) {
    insights.push({
      id: "inventory-capital",
      severity: inventoryMonths > 9 ? "high" : "medium",
      title: "Capital inmovilizado en inventario",
      finding: `El inventario representa aproximadamente ${inventoryMonths.toFixed(1)} meses de costo.`,
      metric: round(inventoryMonths),
      unit: "months" as "ratio",
      action: "Reducir compras de baja rotación y priorizar liquidación de stock inmovilizado.",
    });
  }

  if (runwayDays < 30 && input.projectedCash30d >= 0) {
    insights.push({
      id: "short-runway",
      severity: "medium",
      title: "Colchón de caja reducido",
      finding: `La caja cubre aproximadamente ${runwayDays} días de gastos operacionales al ritmo actual.`,
      metric: runwayDays,
      unit: "days",
      action: "Aumentar visibilidad de cobros y pagos antes de asumir compromisos relevantes.",
    });
  }

  return insights.sort((a, b) => {
    const weight = { critical: 4, high: 3, medium: 2, low: 1 };
    return weight[b.severity] - weight[a.severity];
  });
}
