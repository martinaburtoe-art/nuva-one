import { AlertTriangle, ArrowDownRight, ArrowUpRight, ShieldAlert, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

type Sale = { total?: number | string | null; sale_date?: string | null };
type Quote = { total?: number | string | null; created_at?: string | null; status?: string | null };
type Activity = { completed?: boolean | null; due_date?: string | null; created_at?: string | null; type?: string | null };
type Props = { sales?: Sale[]; quotes?: Quote[]; activities?: Activity[] };

const money = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const inDays = (value: string | null | undefined, days: number) => !!value && Date.now() - new Date(value).getTime() <= days * 86400000;

export function NuvaPredictiveSignals({ sales = [], quotes = [], activities = [] }: Props) {
  const recentSales = sales.filter((s) => inDays(s.sale_date, 30));
  const previousSales = sales.filter((s) => {
    if (!s.sale_date) return false;
    const age = (Date.now() - new Date(s.sale_date).getTime()) / 86400000;
    return age > 30 && age <= 60;
  });
  const recentRevenue = recentSales.reduce((sum, s) => sum + Number(s.total ?? 0), 0);
  const previousRevenue = previousSales.reduce((sum, s) => sum + Number(s.total ?? 0), 0);
  const salesDelta = previousRevenue ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  const pendingQuotes = quotes.filter((q) => !["won", "lost", "cancelled"].includes(String(q.status ?? "").toLowerCase()));
  const recentQuoteValue = pendingQuotes.filter((q) => inDays(q.created_at, 30)).reduce((sum, q) => sum + Number(q.total ?? 0), 0);
  const tasks = activities.filter((a) => a.type === "task");
  const overdue = tasks.filter((a) => !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now()).length;
  const signals = [] as { tone: "danger" | "warning" | "positive"; title: string; text: string }[];
  if (salesDelta <= -15 && recentQuoteValue <= previousRevenue) signals.push({ tone: "danger", title: "Riesgo de desaceleración", text: `Las ventas de 30 días están ${Math.abs(Math.round(salesDelta))}% por debajo del período anterior y el pipeline reciente no compensa la caída.` });
  if (overdue >= 2) signals.push({ tone: "warning", title: "Presión de ejecución", text: `${overdue} seguimientos están vencidos. Resolverlos puede ser más prioritario que abrir nuevas iniciativas.` });
  if (salesDelta >= 15) signals.push({ tone: "positive", title: "Aceleración comercial", text: `Las ventas recientes están ${Math.round(salesDelta)}% por encima del período anterior.` });
  if (pendingQuotes.length >= 3 && recentQuoteValue > 0) signals.push({ tone: "positive", title: "Pipeline con oportunidad", text: `${pendingQuotes.length} cotizaciones siguen abiertas; el valor creado en los últimos 30 días es ${money(recentQuoteValue)}.` });
  if (!signals.length) signals.push({ tone: "positive", title: "Sin señal emergente crítica", text: "Las fuentes disponibles no muestran una combinación suficiente de señales para elevar una alerta predictiva." });

  return <Card className="overflow-hidden border-primary/15"><div className="p-6 md:p-7"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><TrendingUp className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Nüva Predictive Signals</p><h3 className="mt-1 text-xl font-semibold">Señales emergentes antes de que se conviertan en problemas</h3><p className="mt-1 text-sm text-muted-foreground">Reglas transparentes sobre tendencias observables; no son predicciones de caja negra.</p></div></div><div className="mt-5 space-y-3">{signals.slice(0, 3).map((s) => <Signal key={s.title} {...s} />)}</div></div></Card>;
}

function Signal({ tone, title, text }: { tone: "danger" | "warning" | "positive"; title: string; text: string }) { const Icon = tone === "danger" ? ShieldAlert : tone === "warning" ? AlertTriangle : title.includes("Aceleración") ? ArrowUpRight : ArrowDownRight; return <div className="flex gap-3 rounded-xl border bg-muted/20 p-4"><Icon className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p></div></div>; }
