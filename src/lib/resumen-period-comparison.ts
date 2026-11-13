export type DateWindow = { from: string; to: string };

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Returns an immediately preceding, equal-length window for like-for-like analysis. */
export function getPreviousComparableWindow(input: {
  from: string | null;
  to: string | null;
  defaultFrom: string;
  today: string;
}): DateWindow | null {
  // An end-only filter means all history up to that date; there is no honest
  // finite comparison window to infer.
  if (!input.from && input.to) return null;
  const currentFrom = input.from ?? input.defaultFrom;
  const currentTo = input.to ?? input.today;
  const start = new Date(`${currentFrom}T00:00:00.000Z`);
  const end = new Date(`${currentTo}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) return null;
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const previousTo = shiftDate(currentFrom, -1);
  return { from: shiftDate(previousTo, -(days - 1)), to: previousTo };
}

export function calculatePercentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function getLargestExpenseCategory(
  transactions: readonly { type: string; category: string | null; amount: number | string }[],
): { category: string; amount: number; share: number } | null {
  const totals = new Map<string, number>();
  let totalExpenses = 0;
  for (const row of transactions) {
    if (row.type !== "expense") continue;
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const category = row.category?.trim() || "Sin categoría";
    totals.set(category, (totals.get(category) ?? 0) + amount);
    totalExpenses += amount;
  }
  if (totalExpenses <= 0 || totals.size === 0) return null;
  const [category, amount] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return { category, amount, share: (amount / totalExpenses) * 100 };
}
