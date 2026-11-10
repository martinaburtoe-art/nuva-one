import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ChartRow = {
  fecha?: string;
  mes?: string;
  ingresos: number;
  gastos: number;
};

export function DashboardChart({ data, filtered }: { data: ChartRow[]; filtered: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="dashboard-income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B99A5D" stopOpacity={0.42} />
            <stop offset="100%" stopColor="oklch(0.72 0.16 65)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="dashboard-expense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.32} />
            <stop offset="100%" stopColor="oklch(0.55 0.04 260)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E9E9E4" />
        <XAxis dataKey={filtered ? "fecha" : "mes"} stroke="#858991" fontSize={10} minTickGap={18} tickMargin={8} />
        <YAxis stroke="oklch(0.45 0.01 260)" fontSize={10} width={38} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E6E1", background: "#FFFFFF", color: "#34363B", fontSize: 11 }} />
        <Area type="monotone" dataKey="ingresos" stroke="#B99A5D" fill="url(#dashboard-income)" strokeWidth={2} />
        <Area type="monotone" dataKey="gastos" stroke="#6366F1" fill="url(#dashboard-expense)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
