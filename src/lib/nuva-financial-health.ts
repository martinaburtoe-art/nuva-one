export type FinancialHealthInput = {
  cash: number;
  projectedCash30d: number;
  receivables: number;
  overdueReceivables: number;
  payables: number;
  monthlyRevenue: number;
  monthlyGrossProfit: number;
  monthlyOperatingExpenses: number;
  inventoryValue: number;
  inventoryMonthlyCost: number;
};

export type FinancialHealth = {
  score: number;
  level: "critical" | "risk" | "stable" | "healthy";
  indicators: Array<{
    id: string;
    score: number;
    label: string;
    detail: string;
  }>;
  priorities: string[];
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function buildFinancialHealth(input: FinancialHealthInput): FinancialHealth {
  const cashScore =
    input.projectedCash30d < 0
      ? 10
      : clamp(60 + (input.projectedCash30d / Math.max(input.cash, 1)) * 40);
  const collectionScore =
    input.receivables <= 0
      ? 100
      : clamp(100 - (input.overdueReceivables / input.receivables) * 100);
  const margin = input.monthlyRevenue > 0 ? input.monthlyGrossProfit / input.monthlyRevenue : 0;
  const marginScore = clamp(margin * 100);
  const operatingScore =
    input.monthlyGrossProfit <= 0
      ? 10
      : clamp((1 - input.monthlyOperatingExpenses / input.monthlyGrossProfit) * 100);
  const inventoryCoverage =
    input.inventoryMonthlyCost > 0 ? input.inventoryValue / input.inventoryMonthlyCost : 0;
  const inventoryScore =
    inventoryCoverage > 6 ? 55 : clamp(100 - Math.max(0, inventoryCoverage - 3) * 15);

  const indicators = [
    {
      id: "cash",
      score: cashScore,
      label: "Liquidez",
      detail: "Capacidad de sostener caja durante los próximos 30 días.",
    },
    {
      id: "collections",
      score: collectionScore,
      label: "Cobranza",
      detail: "Proporción de cuentas por cobrar que permanece vigente.",
    },
    {
      id: "margin",
      score: marginScore,
      label: "Margen bruto",
      detail: "Capacidad de generar margen sobre las ventas.",
    },
    {
      id: "operations",
      score: operatingScore,
      label: "Eficiencia operacional",
      detail: "Relación entre margen bruto y gastos operacionales.",
    },
    {
      id: "inventory",
      score: inventoryScore,
      label: "Capital en inventario",
      detail: "Riesgo de capital inmovilizado o cobertura excesiva.",
    },
  ];

  const score = clamp(
    indicators.reduce((sum, indicator) => sum + indicator.score, 0) / indicators.length,
  );
  const level = score < 35 ? "critical" : score < 55 ? "risk" : score < 75 ? "stable" : "healthy";
  const priorities: string[] = [];

  [...indicators]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .forEach((indicator) => {
      if (indicator.id === "cash")
        priorities.push("Proteger liquidez y acelerar cobros antes de comprometer nuevos egresos.");
      if (indicator.id === "collections")
        priorities.push("Priorizar cuentas por cobrar vencidas y preparar acciones de cobranza.");
      if (indicator.id === "margin")
        priorities.push("Revisar precios, costos y productos con margen insuficiente.");
      if (indicator.id === "operations")
        priorities.push(
          "Revisar gastos operacionales y separar costos críticos de discrecionales.",
        );
      if (indicator.id === "inventory")
        priorities.push("Reducir capital inmovilizado y ajustar compras a la demanda proyectada.");
    });

  return { score, level, indicators, priorities: [...new Set(priorities)] };
}
