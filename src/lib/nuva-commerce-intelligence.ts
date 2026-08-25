export type CommerceSignal = {
  id: string;
  module: "cashflow" | "inventory" | "sales";
  title: string;
  impact: number;
  priority: "critical" | "high" | "medium" | "low";
  action: string;
};

export type CommerceSnapshot = {
  revenue: number;
  cashAvailable: number;
  inventoryValue: number;
  stockoutRisk: number;
  grossMargin: number | null;
};

export type CommerceInsight = {
  snapshot: CommerceSnapshot;
  signals: CommerceSignal[];
  warnings: string[];
};

export function buildCommerceIntelligence(snapshot: CommerceSnapshot): CommerceInsight {
  const signals: CommerceSignal[] = [];
  const warnings: string[] = [];

  if (snapshot.cashAvailable < 0) {
    signals.push({
      id: "cash-negative",
      module: "cashflow",
      title: "Caja negativa",
      impact: Math.abs(snapshot.cashAvailable),
      priority: "critical",
      action: "Revisar obligaciones y flujo de caja inmediato",
    });
  }
  if (snapshot.stockoutRisk >= 80) {
    signals.push({
      id: "stockout-risk",
      module: "inventory",
      title: "Riesgo alto de quiebre de stock",
      impact: snapshot.stockoutRisk,
      priority: "high",
      action: "Priorizar reposición de SKU críticos",
    });
  }
  if (snapshot.grossMargin !== null && snapshot.grossMargin < 15) {
    signals.push({
      id: "margin-low",
      module: "sales",
      title: "Margen bruto bajo",
      impact: 15 - snapshot.grossMargin,
      priority: "high",
      action: "Revisar precios, costos y mix de productos",
    });
  }
  if (snapshot.inventoryValue > snapshot.revenue && snapshot.revenue > 0) {
    warnings.push(
      "El valor de inventario supera las ventas del período; revisar rotación y capital inmovilizado.",
    );
  }

  return { snapshot, signals, warnings };
}
