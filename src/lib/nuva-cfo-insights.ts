export type CfoSnapshot = {
  revenue: number;
  grossProfit: number;
  operatingExpenses: number;
  cash: number;
  projectedCash30d: number;
  receivables: number;
  overdueReceivables: number;
  payables: number;
  inventoryValue: number;
};

export type CfoInsight = {
  id: string;
  severity: "critical" | "warning" | "positive" | "info";
  title: string;
  explanation: string;
  metric: number | null;
  recommendedAction: string;
};

const pct = (value: number) => Math.round(value * 100);

export function buildCfoInsights(s: CfoSnapshot): CfoInsight[] {
  const insights: CfoInsight[] = [];
  const grossMargin = s.revenue > 0 ? s.grossProfit / s.revenue : 0;
  const overdueRate = s.receivables > 0 ? s.overdueReceivables / s.receivables : 0;
  const operatingCoverage = s.grossProfit > 0 ? s.operatingExpenses / s.grossProfit : 1;

  if (s.projectedCash30d < 0) {
    insights.push({
      id: "liquidity-risk",
      severity: "critical",
      title: "Riesgo de déficit de caja",
      explanation: "La proyección de caja a 30 días queda bajo cero con los compromisos y entradas actualmente registrados.",
      metric: s.projectedCash30d,
      recommendedAction: "Priorizar cobranza, revisar egresos y simular escenarios antes de asumir nuevos compromisos.",
    });
  } else if (s.projectedCash30d < s.cash * 0.25) {
    insights.push({
      id: "liquidity-warning",
      severity: "warning",
      title: "Colchón de caja reducido",
      explanation: "La caja proyectada a 30 días cae por debajo del 25% del saldo actual.",
      metric: s.projectedCash30d,
      recommendedAction: "Acelerar cobros y revisar gastos discrecionales.",
    });
  }

  if (overdueRate >= 0.3) {
    insights.push({
      id: "collections-risk",
      severity: "warning",
      title: "Cobranza deteriorada",
      explanation: `${pct(overdueRate)}% de las cuentas por cobrar están vencidas. Esto puede transformar ventas en presión de caja.`,
      metric: pct(overdueRate),
      recommendedAction: "Crear una campaña de cobranza priorizada por monto, antigüedad y probabilidad de pago.",
    });
  }

  if (grossMargin < 0.2) {
    insights.push({
      id: "margin-risk",
      severity: "warning",
      title: "Margen bruto bajo",
      explanation: `El margen bruto actual es de ${pct(grossMargin)}%, dejando poco espacio para absorber gastos operacionales.`,
      metric: pct(grossMargin),
      recommendedAction: "Revisar precios, costos unitarios y productos con contribución insuficiente.",
    });
  } else if (grossMargin >= 0.4) {
    insights.push({
      id: "healthy-margin",
      severity: "positive",
      title: "Margen bruto saludable",
      explanation: `El margen bruto alcanza ${pct(grossMargin)}%, proporcionando una base favorable para cubrir gastos y crecer.`,
      metric: pct(grossMargin),
      recommendedAction: "Proteger los productos de mayor contribución y evaluar oportunidades de crecimiento rentable.",
    });
  }

  if (operatingCoverage > 0.9) {
    insights.push({
      id: "opex-pressure",
      severity: "warning",
      title: "Alta presión de gastos",
      explanation: "Los gastos operacionales consumen una proporción elevada del margen bruto disponible.",
      metric: pct(operatingCoverage),
      recommendedAction: "Separar gastos esenciales de discrecionales y evaluar medidas de eficiencia.",
    });
  }

  if (s.inventoryValue > s.revenue * 0.75) {
    insights.push({
      id: "inventory-capital",
      severity: "info",
      title: "Capital relevante inmovilizado en inventario",
      explanation: "El valor del inventario supera el 75% de las ventas mensuales registradas.",
      metric: s.inventoryValue,
      recommendedAction: "Revisar rotación, stock lento y compras futuras antes de aumentar existencias.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "no-material-risk",
      severity: "positive",
      title: "Sin riesgos financieros materiales detectados",
      explanation: "Los indicadores entregados no superan los umbrales de alerta configurados.",
      metric: null,
      recommendedAction: "Continuar monitoreando caja, margen, cobranza e inventario.",
    });
  }

  return insights;
}
