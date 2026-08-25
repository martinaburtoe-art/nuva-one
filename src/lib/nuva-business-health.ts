export type BusinessHealthSale = {
  total?: number | string | null;
  sale_date?: string | null;
  status?: string | null;
};

export type BusinessHealthCustomer = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type BusinessHealthProduct = {
  name?: string | null;
  price?: number | string | null;
  cost?: number | string | null;
  stock?: number | string | null;
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

export type BusinessHealthReconciliation = {
  status?: string | null;
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
  health: number;
  momentum: number;
  liquidity: number;
  dataReadiness: number;
  execution: number;
  controls: number;
  current30: number;
  previous30: number;
  recentCash: number;
  reconciliationOpen: number;
};

const DAY_MS = 86_400_000;
const WINDOW_MS = 30 * DAY_MS;

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

export function buildBusinessHealthIntelligence({
  sales,
  customers,
  products,
  activities,
  cashFlow,
  reconciliation,
  now = Date.now(),
}: BusinessHealthInput): BusinessHealthIntelligence {
  const validSales = sales.filter((sale) => !["cancelled", "draft"].includes((sale.status ?? "").toLowerCase()));
  const current30 = validSales.reduce((sum, sale) => {
    const date = timestampOrNull(sale.sale_date);
    return date !== null && now - date >= 0 && now - date <= WINDOW_MS ? sum + numberOrZero(sale.total) : sum;
  }, 0);
  const previous30 = validSales.reduce((sum, sale) => {
    const date = timestampOrNull(sale.sale_date);
    const age = date === null ? null : now - date;
    return age !== null && age > WINDOW_MS && age <= 2 * WINDOW_MS ? sum + numberOrZero(sale.total) : sum;
  }, 0);

  const momentum = previous30 > 0
    ? boundedScore(50 + ((current30 - previous30) / previous30) * 50)
    : current30 > 0 ? 75 : 50;

  const recentCash = cashFlow.reduce((sum, row) => {
    const date = timestampOrNull(row.flow_date);
    return date !== null && now - date >= 0 && now - date <= WINDOW_MS ? sum + numberOrZero(row.net_cash) : sum;
  }, 0);
  const liquidity = recentCash > 0 ? 80 : recentCash < 0 ? 25 : 50;

  const customerCompleteness = customers.length
    ? customers.reduce((sum, customer) => sum + [customer.name, customer.phone, customer.email].filter(Boolean).length / 3, 0) / customers.length
    : 0;
  const productCompleteness = products.length
    ? products.reduce((sum, product) => sum + [product.name, product.price, product.cost, product.stock].filter((value) => value !== null && value !== undefined && value !== "").length / 4, 0) / products.length
    : 0;
  const dataReadiness = boundedScore((customerCompleteness * 0.45 + productCompleteness * 0.55) * 100);

  const tasks = activities.filter((activity) => activity.type === "task");
  const openTasks = tasks.filter((task) => !task.completed).length;
  const overdueTasks = tasks.filter((task) => {
    const due = timestampOrNull(task.due_date);
    return !task.completed && due !== null && due < now;
  }).length;
  const execution = openTasks === 0 ? 100 : boundedScore(100 - (overdueTasks / Math.max(openTasks, 1)) * 100);

  const reconciliationOpen = reconciliation.filter((row) => !["reconciled", "posted"].includes((row.status ?? "").toLowerCase())).length;
  const controls = Math.max(0, 100 - Math.min(70, reconciliationOpen * 10));

  const health = boundedScore(
    momentum * 0.25 +
    liquidity * 0.2 +
    dataReadiness * 0.2 +
    execution * 0.2 +
    controls * 0.15,
  );

  return {
    health,
    momentum,
    liquidity,
    dataReadiness,
    execution,
    controls,
    current30,
    previous30,
    recentCash,
    reconciliationOpen,
  };
}
