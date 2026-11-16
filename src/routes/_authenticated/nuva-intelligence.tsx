import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, Brain, CheckCircle2, Info, Lightbulb, ShieldAlert, Sparkles, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { useBizList } from "@/lib/biz-data";
import { ExplainMyBusiness } from "@/components/explain-my-business";
import { useActiveBusiness } from "@/lib/use-business";

export const Route = createFileRoute("/_authenticated/nuva-intelligence")({
  head: () => ({ meta: [{ title: "Nüva Intelligence — Nüva One" }] }),
  component: NuvaIntelligence,
});

type View = "read" | "signals" | "opportunities" | "explain";

const views: Array<{ id: View; title: string; description: string; info: string }> = [
  { id: "read", title: "Lectura del negocio", description: "Qué muestran tus registros y qué conviene revisar", info: "Interpreta caja, ventas, inventario, cotizaciones y seguimiento usando únicamente los datos disponibles." },
  { id: "signals", title: "Señales", description: "Riesgos observables que requieren atención", info: "Muestra señales basadas en stock, tareas vencidas y resultado de movimientos registrados." },
  { id: "opportunities", title: "Oportunidades", description: "Potencial comercial que aún requiere gestión", info: "Resume cotizaciones abiertas como pipeline potencial; no equivale a ventas comprometidas." },
  { id: "explain", title: "Explícame mi negocio", description: "Comprende la lectura y sus límites", info: "Explica la lectura del negocio en lenguaje claro y conecta la interpretación con los datos disponibles." },
];

function NuvaIntelligence() {
  const [activeView, setActiveView] = useState<View | null>(null);
  const { active: activeBusiness } = useActiveBusiness();
  const salesQuery = useBizList<any>("sales", { order: "sale_date" });
  const transactionsQuery = useBizList<any>("transactions", { order: "tx_date" });
  const productsQuery = useBizList<any>("products", { order: "name" });
  const quotesQuery = useBizList<any>("quotes", { order: "created_at" });
  const activitiesQuery = useBizList<any>("customer_activities", { order: "created_at" });
  const councilQuery = useBizList<any>("nuva_business_memory", { order: "created_at" });
  const actionQueueQuery = useBizList<any>("nuva_action_queue", { order: "created_at" });

  const sales = salesQuery.data;
  const transactions = transactionsQuery.data;
  const products = productsQuery.data;
  const quotes = quotesQuery.data;
  const activities = activitiesQuery.data;
  const councilMemory = councilQuery.data;
  const actionQueue = actionQueueQuery.data;

  const intelligence = useMemo(() => {
    const income = (transactions ?? []).filter((t: any) => t.type === "income").reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0);
    const expense = (transactions ?? []).filter((t: any) => t.type === "expense").reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0);
    const lowStock = (products ?? []).filter((p: any) => {
      const threshold = Number(p.min_stock ?? p.low_stock_threshold ?? 0);
      return Number(p.stock ?? 0) <= threshold;
    }).length;
    const overdue = (activities ?? []).filter((a: any) => a.type === "task" && !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now()).length;
    const openQuotes = (quotes ?? []).filter((q: any) => ["draft", "sent", "viewed"].includes(String(q.status ?? "").toLowerCase()));
    const openPipeline = openQuotes.reduce((sum: number, q: any) => sum + Number(q.total ?? 0), 0);
    const net = income - expense;
    const signals = lowStock + overdue + (income > 0 && net < 0 ? 1 : 0);
    return {
      income,
      expense,
      net,
      lowStock,
      overdue,
      openQuotes: openQuotes.length,
      openPipeline,
      signals,
      salesCount: (sales ?? []).length,
      productsCount: (products ?? []).length,
      transactionsCount: (transactions ?? []).length,
    };
  }, [activities, products, quotes, sales, transactions]);

  const money = (value: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
  const active = views.find((view) => view.id === activeView);
  const latestCouncil = (councilMemory ?? []).filter((memory: any) => memory.memory_type === "agent_consensus").sort((a: any, b: any) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0];
  const councilEvidence = latestCouncil?.evidence && typeof latestCouncil.evidence === "object" ? latestCouncil.evidence : {};
  const rawCouncilConfidence = typeof councilEvidence.confidence === "number" ? councilEvidence.confidence : typeof latestCouncil?.confidence === "number" ? latestCouncil.confidence : null;
  const councilConfidence = rawCouncilConfidence == null ? null : Math.max(0, Math.min(100, Math.round(rawCouncilConfidence <= 1 ? rawCouncilConfidence * 100 : rawCouncilConfidence)));
  const councilAgreement = typeof councilEvidence.agreement === "number"
    ? (councilEvidence.agreement <= 1 ? Math.round(councilEvidence.agreement * 100) : Math.round(councilEvidence.agreement))
    : null;
  const agentsConsulted = typeof councilEvidence.agent_count === "number"
    ? councilEvidence.agent_count
    : typeof councilEvidence.agents_consulted === "number" ? councilEvidence.agents_consulted : null;
  const pendingActions = (actionQueue ?? []).filter((action: any) => ["pending", "approved", "executing"].includes(String(action.status))).length;
  const councilTitle = councilQuery.isLoading ? "Consultando consenso…" : councilQuery.isError ? "No se pudo consultar el consenso" : latestCouncil?.title ?? "Aún no hay un consenso registrado";
  const councilContent = councilQuery.isLoading ? "Estamos consultando los registros persistidos del consejo." : councilQuery.isError ? "No es posible verificar el consenso en este momento. Los indicadores de agentes y confianza se mantienen sin datos." : latestCouncil?.content ?? "Cuando exista una deliberación persistida, aquí podrás revisar su conclusión y la evidencia asociada. No se muestran agentes ni niveles de confianza sin registro.";
  const sourceQueries = [salesQuery, transactionsQuery, productsQuery, quotesQuery, activitiesQuery];
  const loadedSources = activeBusiness?.id ? sourceQueries.filter((query) => !query.isLoading && !query.isError).length : 0;
  const sourceErrors = activeBusiness?.id ? sourceQueries.filter((query) => query.isError).length : 0;
  const loadingSources = Boolean(activeBusiness?.id) && sourceQueries.some((query) => query.isLoading);
  const allSourcesReady = Boolean(activeBusiness?.id) && !loadingSources && sourceErrors === 0;

  return (
    <ModuleGuard module="dashboard">
      <div className="nuva-workspace nuva-workspace--intelligence space-y-5">
        <PageHeader title="Nüva Intelligence" description="Convierte la actividad de tu negocio en contexto claro, evidencia y prioridades que puedes revisar." />

        {!activeView ? (
          <>
            <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 p-5 text-white shadow-xl shadow-violet-950/15 sm:p-7">
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)] lg:items-end">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Badge className="border border-violet-200/20 bg-white/10 text-violet-100 hover:bg-white/10"><Brain className="mr-1 h-3.5 w-3.5" /> INTELLIGENCE LAYER</Badge><span className="text-xs text-violet-100/70">Análisis basado en tus registros</span></div>
                  <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Decisiones con contexto. No solo números.</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-violet-100/75">Nüva conecta señales comerciales, financieras y operativas. Cada lectura muestra qué dato la respalda y dónde puedes comprobarlo.</p>
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-violet-100/70"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5"><span className={allSourcesReady ? "h-1.5 w-1.5 rounded-full bg-emerald-300" : "h-1.5 w-1.5 rounded-full bg-amber-300"} />{!activeBusiness?.id ? "Sin negocio activo" : loadingSources ? "Consultando fuentes…" : allSourcesReady ? "Fuentes consultadas" : "Cobertura parcial"}</span><span>{loadedSources} de 5 fuentes operativas consultadas</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <HeroMetric label="Señales observadas" value={String(intelligence.signals)} detail="Stock, seguimiento y resultado" />
                  <HeroMetric label="Pipeline potencial" value={money(intelligence.openPipeline)} detail={`${intelligence.openQuotes} cotizaciones abiertas`} />
                </div>
              </div>
            </section>

            <Card className="overflow-hidden rounded-2xl border-violet-500/20 bg-background/80 shadow-sm">
              <div className="border-b border-violet-500/10 bg-violet-500/[0.04] p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.08] p-2.5 text-violet-600 dark:text-violet-400"><UsersRound className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">Nüva Agent Council</p>
                      <h2 className="mt-1 text-xl font-semibold">{councilTitle}</h2>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{councilContent}</p>
                    </div>
                  </div>
                  <Link to="/executive-command-center" className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted">Ver acciones <ArrowUpRight className="h-3.5 w-3.5" /></Link>
                </div>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 md:p-6">
                <CouncilMetric label="Agentes consultados" value={councilQuery.isLoading ? "—" : councilQuery.isError ? "N/D" : agentsConsulted == null ? "Sin registro" : String(agentsConsulted)} detail="Conteo desde la evidencia del consenso" />
                <CouncilMetric label="Confianza registrada" value={councilQuery.isLoading || councilQuery.isError || councilConfidence == null ? "—" : `${councilConfidence}%`} detail="Solo si viene en la evidencia persistida" />
                <CouncilMetric label="Acuerdo registrado" value={councilQuery.isLoading || councilQuery.isError || councilAgreement == null ? "—" : `${councilAgreement}%`} detail="Solo si viene en la evidencia persistida" />
                <CouncilMetric label="Acciones abiertas" value={actionQueueQuery.isLoading ? "—" : actionQueueQuery.isError ? "N/D" : String(pendingActions)} detail={actionQueueQuery.isError ? "No se pudo consultar la cola de acciones" : "Pendientes o aprobadas; requieren control humano"} />
              </div>
            </Card>

            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">Herramientas de Intelligence</p><h2 className="mt-1 text-xl font-semibold">Elige qué quieres entender</h2></div><span className="hidden text-xs text-muted-foreground md:block">4 herramientas</span></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {views.map((view) => <button key={view.id} type="button" onClick={() => setActiveView(view.id)} className="group rounded-2xl border border-border/70 bg-background/80 p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"><div className="flex h-full min-h-[132px] flex-col justify-between gap-5"><div><div className="flex items-center justify-between gap-2"><p className="font-semibold">{view.title}</p><span title={view.info} aria-label={`Información: ${view.title}`} className="rounded-full p-1 text-muted-foreground"><Info className="h-4 w-4" /></span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{view.description}</p></div><span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400">Abrir herramienta <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span></div></button>)}
              </div>
            </section>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setActiveView(null)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border bg-background/80 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"><ArrowLeft className="h-4 w-4" /> Volver a Intelligence</button>
            <div className="flex items-end justify-between gap-3 border-b pb-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">Nüva Intelligence</p><h2 className="mt-1 text-xl font-semibold">{active?.title}</h2><p className="mt-1 text-sm text-muted-foreground">{active?.description}</p></div></div>
            {activeView === "read" && (
              <div className="space-y-5">
                <Card className="overflow-hidden border-violet-500/20"><div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8"><div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">Lectura ejecutiva</p><h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{intelligence.signals > 0 ? "Hay señales que merecen una revisión." : "No aparecen señales en las fuentes consultadas."}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Esta lectura resume registros operativos disponibles. No reemplaza conciliación bancaria, cierre contable ni una evaluación profesional. Si alguna fuente falla, la cobertura se muestra como parcial.</p></div><div className="min-w-[150px] rounded-2xl border bg-background/80 p-5 text-center"><p className="text-xs text-muted-foreground">Fuentes disponibles</p><p className="mt-1 text-3xl font-bold tabular-nums">{loadedSources}<span className="text-base font-medium text-muted-foreground">/5</span></p><p className="text-xs text-muted-foreground">{!activeBusiness?.id ? "Selecciona un negocio" : sourceErrors > 0 ? `${sourceErrors} con error` : loadingSources ? "Consultando…" : "Consultas completadas"}</p></div></div></Card>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Kpi label="Ingresos registrados" value={money(intelligence.income)} /><Kpi label="Gastos registrados" value={money(intelligence.expense)} /><Kpi label="Resultado neto registrado" value={money(intelligence.net)} /><Kpi label="Pipeline potencial" value={money(intelligence.openPipeline)} /></div>
                <div className="grid gap-4 lg:grid-cols-3"><InsightTile title="Inventario" value={`${intelligence.lowStock} productos en o bajo mínimo`} detail="Conteo calculado usando el mínimo configurado para cada producto." href="/inventory" /><InsightTile title="Seguimiento comercial" value={`${intelligence.overdue} tareas vencidas`} detail="Tareas marcadas como pendientes cuya fecha de vencimiento ya pasó." href="/customers" /><InsightTile title="Cotizaciones" value={`${intelligence.openQuotes} abiertas`} detail="El valor cotizado es pipeline potencial, no ingreso realizado ni venta comprometida." href="/quotes" /></div>
              </div>
            )}
            {activeView === "signals" && <div className="space-y-4"><SectionIntro title="Señales detectadas" text="Cada señal se deriva de registros operativos. Abre su fuente para comprobar el detalle." /><div className="grid gap-4 md:grid-cols-2"><SignalCard icon={<ShieldAlert className="h-5 w-5" />} title="Presión de inventario" value={intelligence.lowStock} description="Productos en o bajo su mínimo configurado." href="/inventory" /><SignalCard icon={<AlertTriangle className="h-5 w-5" />} title="Seguimiento vencido" value={intelligence.overdue} description="Tareas pendientes con fecha de vencimiento pasada." href="/customers" /><SignalCard icon={<CheckCircle2 className="h-5 w-5" />} title="Cotizaciones abiertas" value={intelligence.openQuotes} description={`Pipeline potencial: ${money(intelligence.openPipeline)}; no equivale a ventas cerradas.`} href="/quotes" /><SignalCard icon={<Sparkles className="h-5 w-5" />} title="Resultado registrado" value={money(intelligence.net)} description="Ingresos menos gastos registrados en las transacciones consultadas; no es utilidad contable." href="/finance" /></div></div>}
            {activeView === "opportunities" && <Card className="overflow-hidden border-violet-500/20 p-6 md:p-8"><div className="flex items-start gap-4"><Lightbulb className="mt-1 h-6 w-6 shrink-0 text-violet-600 dark:text-violet-400" /><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">Potencial comercial</p><h2 className="mt-1 text-xl font-semibold">{intelligence.openQuotes > 0 ? "Tienes cotizaciones que podrían avanzar." : "Aún no hay cotizaciones abiertas para analizar."}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{intelligence.openQuotes > 0 ? `Nüva identifica ${intelligence.openQuotes} cotizaciones abiertas por ${money(intelligence.openPipeline)}. Es un pipeline potencial: no representa ingresos, compromisos ni probabilidad de conversión.` : "Cuando existan cotizaciones abiertas, Nüva podrá resumir su valor y ayudarte a priorizar el seguimiento."}</p><Link to="/quotes" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700">Revisar cotizaciones <ArrowRight className="h-4 w-4" /></Link></div></div></Card>}
            {activeView === "explain" && <ExplainMyBusiness />}
          </>
        )}
      </div>
    </ModuleGuard>
  );
}

function HeroMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm"><p className="text-xs text-violet-100/70">{label}</p><p className="mt-2 break-words text-2xl font-semibold tracking-tight text-white tabular-nums">{value}</p><p className="mt-1 text-xs text-violet-100/60">{detail}</p></div>;
}
function SectionIntro({ title, text }: { title: string; text: string }) { return <div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>; }
function Kpi({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border bg-background/80 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-lg font-bold tabular-nums">{value}</p></div>; }
function CouncilMetric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-xl border bg-background/60 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-xl font-bold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }
function InsightTile({ title, value, detail, href }: { title: string; value: string; detail: string; href: "/inventory" | "/quotes" | "/customers" }) { return <Link to={href} className="block rounded-2xl"><Card className="h-full border-violet-500/10 p-5 transition-all hover:-translate-y-0.5 hover:border-violet-500/30"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p><p className="mt-2 text-lg font-semibold">{value}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400">Ver evidencia <ArrowUpRight className="h-3.5 w-3.5" /></span></Card></Link>; }
function SignalCard({ icon, title, value, description, href }: { icon: React.ReactNode; title: string; value: number | string; description: string; href: "/inventory" | "/customers" | "/quotes" | "/finance" }) { return <Link to={href} className="block rounded-2xl"><Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:border-violet-500/30"><div className="flex items-start gap-3"><div className="rounded-xl border bg-violet-500/[0.08] p-2 text-violet-600 dark:text-violet-400">{icon}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-1 break-words text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400">Ver evidencia <ArrowUpRight className="h-3.5 w-3.5" /></span></div></div></Card></Link>; }
