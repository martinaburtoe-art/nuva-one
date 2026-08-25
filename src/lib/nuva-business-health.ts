export type BusinessHealthSale = {
  total?: number | string | null;
  sale_date?: string | null;
  status?: string | null;
};
export type BusinessHealthCustomer = { name?: string | null; status?: string | null };
export type BusinessHealthProduct = {
  name?: string | null;
  price?: number | string | null;
  cost?: number | string | null;
  stock?: number | string | null;
  low_stock_threshold?: number | string | null;
};
export type BusinessHealthActivity = {
  type?: string | null;
  completed?: boolean | null;
  due_date?: string | null;
};
export type BusinessHealthCashRow = {
  flow_date?: string | null;
  net_cash?: number | string | null;
};
export type BusinessHealthReconciliation = { status?: string | null };

export type SignalSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type BusinessSignal = {
  id: string;
  domain: "SALES" | "CASH" | "INVENTORY" | "CUSTOMERS" | "EXECUTION" | "CONTROLS" | "DATA";
  severity: SignalSeverity;
  confidence: number;
  title: string;
  what: string;
  why: string;
  evidence: { metric: string; value: number | string }[];
  action: string;
  expectedImpact: string;
};

export type BusinessHealthInput = {
  sales: BusinessHealthSale[];
  customers: BusinessHealthCustomer[];
  products: BusinessHealthProduct[];
  activities: BusinessHealthActivity[];
  cashFlow: BusinessHealthCashRow[];
  reconciliation: BusinessHealthReconciliation[];
  now?: number;
};

export type BusinessHealthIntelligence = {
  /** Deprecated compatibility field. It is now the bottleneck indicator, not a weighted score. */
  health: number;
  healthMethod: "bottleneck";
  momentum: number;
  liquidity: number;
  dataReadiness: number;
  execution: number;
  controls: number;
  current30: number;
  previous30: number;
  recentCash: number;
  reconciliationOpen: number;
  confidence: number;
  signals: BusinessSignal[];
};

const WINDOW_MS = 30 * 86_400_000;
const numberOrZero = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const timestampOrNull = (value: string | null | undefined) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};
const boundedScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const severityFor = (
  value: number,
  thresholds: [number, number, number, number],
): SignalSeverity => {
  if (value >= thresholds[3]) return "CRITICAL";
  if (value >= thresholds[2]) return "HIGH";
  if (value >= thresholds[1]) return "MEDIUM";
  if (value >= thresholds[0]) return "LOW";
  return "INFO";
};

export function buildBusinessHealthIntelligence({
  sales,
  customers,
  products,
  activities,
  cashFlow,
  reconciliation,
  now = Date.now(),
}: BusinessHealthInput): BusinessHealthIntelligence {
  const validSales = sales.filter(
    (sale) => !["cancelled", "draft"].includes((sale.status ?? "").toLowerCase()),
  );
  const current30 = validSales.reduce((sum, sale) => {
    const date = timestampOrNull(sale.sale_date);
    return date !== null && now - date >= 0 && now - date <= WINDOW_MS
      ? sum + numberOrZero(sale.total)
      : sum;
  }, 0);
  const previous30 = validSales.reduce((sum, sale) => {
    const date = timestampOrNull(sale.sale_date);
    const age = date === null ? null : now - date;
    return age !== null && age > WINDOW_MS && age <= 2 * WINDOW_MS
      ? sum + numberOrZero(sale.total)
      : sum;
  }, 0);

  const salesDeltaPct = previous30 > 0 ? ((current30 - previous30) / previous30) * 100 : null;
  const momentum =
    previous30 > 0
      ? boundedScore(50 + ((current30 - previous30) / previous30) * 50)
      : current30 > 0
        ? 75
        : 50;

  const recentCash = cashFlow.reduce((sum, row) => {
    const date = timestampOrNull(row.flow_date);
    return date !== null && now - date >= 0 && now - date <= WINDOW_MS
      ? sum + numberOrZero(row.net_cash)
      : sum;
  }, 0);
  const liquidity = recentCash > 0 ? 80 : recentCash < 0 ? 25 : 50;

  const customerCompleteness = customers.length
    ? customers.reduce(
        (sum, customer) => sum + [customer.name, customer.status].filter(Boolean).length / 2,
        0,
      ) / customers.length
    : 0;
  const productCompleteness = products.length
    ? products.reduce(
        (sum, product) =>
          sum +
          [product.name, product.price, product.cost, product.stock].filter(
            (value) => value !== null && value !== undefined && value !== "",
          ).length /
            4,
        0,
      ) / products.length
    : 0;
  const dataReadiness = boundedScore(
    (customerCompleteness * 0.5 + productCompleteness * 0.5) * 100,
  );

  const tasks = activities.filter((activity) => activity.type === "task");
  const openTasks = tasks.filter((task) => !task.completed).length;
  const overdueTasks = tasks.filter((task) => {
    const due = timestampOrNull(task.due_date);
    return !task.completed && due !== null && due < now;
  }).length;
  const execution =
    tasks.length === 0 ? 50 : boundedScore(100 - (overdueTasks / Math.max(openTasks, 1)) * 100);

  const reconciliationOpen = reconciliation.filter(
    (row) => !["reconciled", "posted"].includes((row.status ?? "").toLowerCase()),
  ).length;
  const controls =
    reconciliation.length === 0
      ? 50
      : boundedScore(100 - Math.min(100, (reconciliationOpen / reconciliation.length) * 100));

  // A bottleneck indicator is deliberately used instead of arbitrary weighted scoring:
  // the weakest business-control dimension defines the headline health.
  const health = Math.min(momentum, liquidity, dataReadiness, execution, controls);
  const availableDomains = [
    sales.length > 0,
    cashFlow.length > 0,
    products.length > 0,
    customers.length > 0,
    activities.length > 0,
    reconciliation.length > 0,
  ].filter(Boolean).length;
  const confidence = boundedScore((availableDomains / 6) * 100);

  const signals: BusinessSignal[] = [];

  if (salesDeltaPct !== null && salesDeltaPct <= -10) {
    signals.push({
      id: "sales-decline-30d",
      domain: "SALES",
      severity: severityFor(Math.abs(salesDeltaPct), [10, 15, 25, 40]),
      confidence,
      title: "Ventas en descenso",
      what: `Las ventas variaron ${salesDeltaPct.toFixed(1)}% frente a los 30 días anteriores.`,
      why: "La comparación usa únicamente ventas con fecha válida y estados no cancelados ni borradores.",
      evidence: [
        { metric: "current_30d", value: current30 },
        { metric: "previous_30d", value: previous30 },
        { metric: "variation_pct", value: Number(salesDeltaPct.toFixed(1)) },
      ],
      action:
        "Revisar productos, clientes y canales que explican la caída antes de aplicar descuentos o aumentar gasto comercial.",
      expectedImpact:
        "Identificar el origen de la caída y priorizar una intervención comercial basada en evidencia.",
    });
  } else if (salesDeltaPct !== null && salesDeltaPct >= 10) {
    signals.push({
      id: "sales-growth-30d",
      domain: "SALES",
      severity: "INFO",
      confidence,
      title: "Ventas en crecimiento",
      what: `Las ventas variaron +${salesDeltaPct.toFixed(1)}% frente a los 30 días anteriores.`,
      why: "La comparación usa únicamente ventas con fecha válida y estados no cancelados ni borradores.",
      evidence: [
        { metric: "current_30d", value: current30 },
        { metric: "previous_30d", value: previous30 },
        { metric: "variation_pct", value: Number(salesDeltaPct.toFixed(1)) },
      ],
      action:
        "Revisar qué productos, clientes y canales están impulsando el crecimiento para replicar el patrón.",
      expectedImpact: "Convertir el crecimiento observado en aprendizaje comercial reutilizable.",
    });
  }

  if (recentCash < 0) {
    signals.push({
      id: "negative-cash-flow-30d",
      domain: "CASH",
      severity: "HIGH",
      confidence,
      title: "Flujo neto de caja negativo",
      what: "El flujo neto registrado en los últimos 30 días es negativo.",
      why: "Las entradas y salidas disponibles en el conjunto de datos muestran una salida neta.",
      evidence: [{ metric: "net_cash_30d", value: recentCash }],
      action:
        "Revisar vencimientos de cuentas por cobrar/pagar y gastos no esenciales antes de asumir nueva presión de caja.",
      expectedImpact: "Reducir riesgo de liquidez y ordenar las decisiones de corto plazo.",
    });
  }

  const criticalStock = products.filter((product) => {
    const stock = numberOrZero(product.stock);
    const threshold = numberOrZero(product.low_stock_threshold);
    return stock <= 0 || (threshold > 0 && stock <= threshold);
  });
  if (criticalStock.length > 0) {
    signals.push({
      id: "inventory-low-stock",
      domain: "INVENTORY",
      severity: criticalStock.some((p) => numberOrZero(p.stock) <= 0) ? "CRITICAL" : "HIGH",
      confidence,
      title: "Stock bajo o agotado",
      what: `${criticalStock.length} producto(s) están en o bajo su umbral de stock.`,
      why: "La señal compara stock actual contra el umbral registrado por producto.",
      evidence: [{ metric: "affected_products", value: criticalStock.length }],
      action:
        "Revisar demanda reciente y compras antes de reponer; priorizar productos con ventas activas y stock agotado.",
      expectedImpact: "Reducir quiebres de stock sin inmovilizar capital innecesariamente.",
    });
  }

  if (overdueTasks > 0) {
    signals.push({
      id: "overdue-tasks",
      domain: "EXECUTION",
      severity: overdueTasks >= 5 ? "HIGH" : "MEDIUM",
      confidence,
      title: "Tareas vencidas",
      what: `Hay ${overdueTasks} tarea(s) vencida(s) sin completar.`,
      why: "La señal usa tareas con fecha de vencimiento anterior a la fecha de análisis y estado no completado.",
      evidence: [
        { metric: "overdue_tasks", value: overdueTasks },
        { metric: "open_tasks", value: openTasks },
      ],
      action: "Priorizar las tareas vencidas por impacto y asignar responsable y nueva fecha.",
      expectedImpact: "Reducir acumulación operativa y recuperar capacidad de ejecución.",
    });
  }

  if (reconciliationOpen > 0) {
    signals.push({
      id: "open-reconciliations",
      domain: "CONTROLS",
      severity: reconciliationOpen >= 5 ? "HIGH" : "MEDIUM",
      confidence,
      title: "Conciliaciones pendientes",
      what: `Hay ${reconciliationOpen} registro(s) de conciliación que no están cerrados.`,
      why: "Se consideran abiertos los estados distintos de reconciled y posted.",
      evidence: [
        { metric: "open_reconciliations", value: reconciliationOpen },
        { metric: "total_reconciliations", value: reconciliation.length },
      ],
      action:
        "Revisar y cerrar las conciliaciones pendientes antes de usar sus cifras como base de decisiones críticas.",
      expectedImpact:
        "Aumentar la confiabilidad de la información financiera utilizada por Nüva Intelligence.",
    });
  }

  if (dataReadiness < 60) {
    signals.push({
      id: "data-readiness-low",
      domain: "DATA",
      severity: "MEDIUM",
      confidence,
      title: "Datos incompletos",
      what: "La cobertura de datos disponibles limita la profundidad del análisis.",
      why: "No todos los dominios necesarios contienen registros suficientes o campos básicos completos.",
      evidence: [
        { metric: "data_readiness", value: dataReadiness },
        { metric: "confidence", value: confidence },
      ],
      action:
        "Completar los datos mínimos de clientes y productos y conectar las fuentes disponibles antes de tomar decisiones basadas en tendencias.",
      expectedImpact: "Aumentar precisión, cobertura y confianza de los insights.",
    });
  }

  signals.sort(
    (a, b) =>
      ({ CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 })[b.severity] -
      { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 }[a.severity],
  );

  return {
    health,
    healthMethod: "bottleneck",
    momentum,
    liquidity,
    dataReadiness,
    execution,
    controls,
    current30,
    previous30,
    recentCash,
    reconciliationOpen,
    confidence,
    signals,
  };
}
