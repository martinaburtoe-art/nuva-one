import { ArrowRight, BarChart3, Boxes, CheckCircle2, CircleAlert, Users, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

type Props = { sales: number; customers: number; products: number; openTasks: number; overdueTasks: number };

function score(value: number, target: number) { return Math.max(0, Math.min(100, Math.round((value / Math.max(target, 1)) * 100))); }

export function BusinessHealthCard({ sales, customers, products, openTasks, overdueTasks }: Props) {
  const commercial = score(sales, 10);
  const customersScore = score(customers, 10);
  const inventory = score(products, 20);
  const execution = openTasks === 0 ? 100 : Math.max(0, Math.round(100 - (overdueTasks / openTasks) * 100));
  const health = Math.round(commercial * 0.3 + customersScore * 0.2 + inventory * 0.2 + execution * 0.3);
  const tone = health >= 80 ? "text-success" : health >= 60 ? "text-warning" : "text-destructive";
  const label = health >= 80 ? "Saludable" : health >= 60 ? "Requiere atención" : "Prioridad alta";
  const domains = [
    { label: "Ventas", value: commercial, icon: BarChart3 },
    { label: "Clientes", value: customersScore, icon: Users },
    { label: "Inventario", value: inventory, icon: Boxes },
    { label: "Ejecución", value: execution, icon: Zap },
  ];
  return <Card className="relative overflow-hidden p-6"><div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-primary/10 blur-3xl" /><div className="relative"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Nüva Business Health</p><h2 className="mt-2 text-2xl font-bold tracking-tight">Salud operativa del negocio</h2><p className="mt-1 text-sm text-muted-foreground">Una lectura ejecutiva basada en actividad real disponible.</p></div><div className="flex items-center gap-3"><div className={`text-4xl font-bold tabular-nums ${tone}`}>{health}</div><div><div className={`text-sm font-semibold ${tone}`}>{label}</div><div className="text-xs text-muted-foreground">sobre 100</div></div></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{domains.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border bg-background/70 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><span className="text-sm font-bold tabular-nums">{value}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} /></div></div>)}</div><div className="mt-5 flex flex-col gap-3 rounded-2xl border bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3">{overdueTasks > 0 ? <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />}<div><p className="text-sm font-semibold">{overdueTasks > 0 ? `Tienes ${overdueTasks} tarea${overdueTasks === 1 ? "" : "s"} vencida${overdueTasks === 1 ? "" : "s"}.` : "La ejecución comercial no muestra tareas vencidas."}</p><p className="mt-1 text-xs text-muted-foreground">{overdueTasks > 0 ? "Prioriza resolverlas antes de crear nuevos seguimientos." : "Mantén el ritmo y revisa las prioridades de mayor impacto."}</p></div></div><Link to="/customer-action-center" className="shrink-0"><span className="inline-flex items-center text-sm font-semibold text-primary">Ver prioridades <ArrowRight className="ml-1 h-4 w-4" /></span></Link></div></div></Card>;
}
