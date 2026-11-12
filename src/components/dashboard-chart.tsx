import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const compactClp = new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 });

type ChartRow = {
  fecha?: string;
  mes?: string;
  ingresos: number;
  gastos: number;
};

export function DashboardChart({ data, filtered }: { data: ChartRow[]; filtered: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
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
        <CartesianGrid strokeDasharray="3 5" stroke="#E9E9E4" vertical={false} />
        <XAxis dataKey={filtered ? "fecha" : "mes"} stroke="#858991" fontSize={10} minTickGap={filtered ? 28 : 18} tickMargin={10} axisLine={false} tickLine={false} />
        <YAxis stroke="#858991" fontSize={10} width={48} tickFormatter={(v) => compactClp.format(Number(v))} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value, name) => [clp.format(Number(value ?? 0)), name === "ingresos" ? "Ingresos" : "Gastos"]} contentStyle={{ borderRadius: 12, border: "1px solid #E6E6E1", background: "#FFFFFF", color: "#34363B", fontSize: 12, boxShadow: "0 12px 30px rgb(24 28 42 / .10)" }} cursor={{ stroke: "#B8B9C8", strokeDasharray: "4 4" }} />
        <Area type="monotone" dataKey="ingresos" stroke="#B99A5D" fill="url(#dashboard-income)" strokeWidth={2.4} activeDot={{ r: 4, strokeWidth: 0 }} />
        <Area type="monotone" dataKey="gastos" stroke="#6366F1" fill="url(#dashboard-expense)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
