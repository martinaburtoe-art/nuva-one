export type CashflowItem = {
  amount: number;
  dueDate: string;
  kind: "inflow" | "outflow";
  status?: "open" | "paid";
};

export type CashflowForecast = {
  currentBalance: number;
  projectedBalance30d: number;
  minimumProjectedBalance30d: number;
  runwayDays: number | null;
  risk: "low" | "medium" | "high";
  actions: string[];
};

const DAY = 86_400_000;

export function buildCashflowForecast(input: {
  currentBalance: number;
  items: CashflowItem[];
  asOf?: string;
}): CashflowForecast {
  const asOf = new Date(input.asOf ?? new Date().toISOString());
  const horizon = new Date(asOf.getTime() + 30 * DAY);
  let balance = input.currentBalance;
  let minimum = balance;
  let runway: number | null = balance > 0 ? 30 : 0;
  const actions: string[] = [];

  const items = input.items
    .filter((item) => item.status !== "paid")
    .map((item) => ({ ...item, date: new Date(item.dueDate) }))
    .filter((item) => !Number.isNaN(item.date.getTime()) && item.date <= horizon)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const item of items) {
    balance += item.kind === "inflow" ? item.amount : -item.amount;
    minimum = Math.min(minimum, balance);
    if (balance < 0 && runway === 30) {
      runway = Math.max(0, Math.ceil((item.date.getTime() - asOf.getTime()) / DAY));
    }
  }

  const projected = balance;
  const risk =
    projected < 0 || minimum < 0
      ? "high"
      : projected < input.currentBalance * 0.25
        ? "medium"
        : "low";

  if (risk === "high") {
    actions.push("Priorizar cobranza de cuentas por cobrar vencidas");
    actions.push("Revisar y postergar egresos no críticos");
    actions.push("Preparar escenario de liquidez para los próximos 30 días");
  } else if (risk === "medium") {
    actions.push("Monitorear caja y cuentas por cobrar diariamente");
    actions.push("Revisar compras e inversiones no esenciales");
  }

  return {
    currentBalance: input.currentBalance,
    projectedBalance30d: projected,
    minimumProjectedBalance30d: minimum,
    runwayDays: runway,
    risk,
    actions,
  };
}
