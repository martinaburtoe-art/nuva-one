export type ResumenTransaction = {
  amount: number | string;
  type: string;
  tx_date: string;
  category: string | null;
};

export type ResumenChartRow = {
  fecha?: string;
  mes?: string;
  ingresos: number;
  gastos: number;
};

export function buildResumenChartData(
  transactions: ResumenTransaction[],
  options: {
    from: string | null;
    to: string | null;
    categories: string[];
    daily: boolean;
    now?: Date;
  },
): ResumenChartRow[] {
  const rows = transactions.filter((row) => {
    if (options.from && row.tx_date < options.from) return false;
    if (options.to && row.tx_date > options.to) return false;
    if (options.categories.length > 0 && !options.categories.includes(row.category ?? "")) return false;
    return true;
  });

  if (options.daily) {
    const byDay: Record<string, ResumenChartRow> = {};
    rows.forEach((row) => {
      const key = row.tx_date;
      if (!byDay[key]) {
        byDay[key] = {
          fecha: new Date(`${key}T00:00:00`).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" }),
          ingresos: 0,
          gastos: 0,
        };
      }
      if (row.type === "income") byDay[key].ingresos += Number(row.amount);
      else if (row.type === "expense") byDay[key].gastos += Number(row.amount);
    });
    return Object.keys(byDay).sort().map((key) => byDay[key]);
  }

  const byMonth: Record<string, ResumenChartRow> = {};
  const now = options.now ?? new Date();
  const firstObserved = rows.reduce<Date | null>((earliest, row) => {
    const date = new Date(`${row.tx_date}T00:00:00`);
    return !earliest || date < earliest ? date : earliest;
  }, null);
  const start = options.from
    ? new Date(`${options.from}T00:00:00`)
    : options.to
      ? firstObserved ?? new Date(`${options.to}T00:00:00`)
      : new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const end = options.to ? new Date(`${options.to}T00:00:00`) : now;
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= lastMonth) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    byMonth[key] = {
      mes: cursor.toLocaleDateString("es-CL", { month: "short", year: "2-digit" }),
      ingresos: 0,
      gastos: 0,
    };
    cursor.setMonth(cursor.getMonth() + 1);
  }

  rows.forEach((row) => {
    // La fecha contable se interpreta localmente para evitar saltos de mes por UTC.
    const [year, month] = row.tx_date.split("-").map(Number);
    const key = `${year}-${month - 1}`;
    if (!byMonth[key]) return;
    if (row.type === "income") byMonth[key].ingresos += Number(row.amount);
    else if (row.type === "expense") byMonth[key].gastos += Number(row.amount);
  });

  return Object.values(byMonth);
}
