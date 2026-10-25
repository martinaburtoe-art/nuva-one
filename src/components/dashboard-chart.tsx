import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ChartRow = {
  fecha?: string;
  mes?: string;
  ingresos: number;
  gastos: number;
};

export function DashboardChart({ data, filtered }: { data: ChartRow[]; filtered: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="dashboard-income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.72 0.16 65)" stopOpacity={0.42} />
            <stop offset="100%" stopColor="oklch(0.72 0.16 65)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="dashboard-expense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.55 0.04 260)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="oklch(0.55 0.04 260)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.006 260)" />
        <XAxis dataKey={filtered ? "fecha" : "mes"} stroke="oklch(0.45 0.01 260)" fontSize={12} />
        <YAxis stroke="oklch(0.45 0.01 260)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.88 0.006 260)" }} />
        <Area type="monotone" dataKey="ingresos" stroke="oklch(0.7 0.15 65)" fill="url(#dashboard-income)" strokeWidth={2} />
        <Area type="monotone" dataKey="gastos" stroke="oklch(0.53 0.03 260)" fill="url(#dashboard-expense)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
