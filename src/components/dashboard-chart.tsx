import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ChartRow = {
  fecha?: string;
  mes?: string;
  ingresos: number;
  gastos: number;
};

export function DashboardChart({ data, filtered }: { data: ChartRow[]; filtered: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="dashboard-income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.22 268)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="oklch(0.65 0.22 268)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="dashboard-expense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.6 0.22 25)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="oklch(0.6 0.22 25)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 270)" />
        <XAxis dataKey={filtered ? "fecha" : "mes"} stroke="oklch(0.5 0.02 270)" fontSize={12} />
        <YAxis stroke="oklch(0.5 0.02 270)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 270)" }} />
        <Area type="monotone" dataKey="ingresos" stroke="oklch(0.55 0.22 268)" fill="url(#dashboard-income)" strokeWidth={2} />
        <Area type="monotone" dataKey="gastos" stroke="oklch(0.6 0.22 25)" fill="url(#dashboard-expense)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
