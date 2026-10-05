import { Bot, CheckCircle2, ShieldCheck, Wrench, Database, LineChart, Users, ShoppingCart, Scale, Code2, Search, Palette, Activity, LockKeyhole } from "lucide-react";

type AgencyWorker = {
  name: string;
  role: string;
  specialty: string;
  status: "online" | "watching" | "standby";
  icon: typeof Bot;
  description: string;
};

const workers: AgencyWorker[] = [
  { name: "Constructor", role: "Engineering", specialty: "Construcción y reparación", status: "online", icon: Wrench, description: "Implementa trabajo verificado, corrige regresiones y prepara PRs." },
  { name: "Orchestrator", role: "Dirección", specialty: "Coordinación de Agency", status: "watching", icon: Bot, description: "Prioriza señales, asigna trabajo y coordina especialistas." },
  { name: "Finance", role: "Finanzas", specialty: "Caja, contabilidad y métricas", status: "watching", icon: LineChart, description: "Vigila integridad financiera y señales de liquidez." },
  { name: "Sales", role: "Ventas", specialty: "Ventas, CRM y conversión", status: "standby", icon: ShoppingCart, description: "Analiza pipeline, ventas y oportunidades comerciales." },
  { name: "Supply", role: "Abastecimiento", specialty: "Compras e inventario", status: "watching", icon: Database, description: "Supervisa stock, compras, recepción y riesgos de abastecimiento." },
  { name: "People", role: "Personas", specialty: "Nüva People y nómina", status: "standby", icon: Users, description: "Vigila RRHH, remuneraciones, contratos y cumplimiento laboral." },
  { name: "Compliance", role: "Cumplimiento", specialty: "Normativa y riesgo", status: "watching", icon: Scale, description: "Detecta riesgos regulatorios y requisitos pendientes." },
  { name: "Growth", role: "Growth", specialty: "Producto y crecimiento", status: "standby", icon: Search, description: "Investiga mercado, adopción y oportunidades de crecimiento." },
  { name: "Security", role: "Seguridad", specialty: "AppSec, RLS y privacidad", status: "watching", icon: LockKeyhole, description: "Busca regresiones de seguridad, aislamiento y exposición de datos." },
  { name: "QA", role: "Quality", specialty: "Tests y regresiones", status: "watching", icon: CheckCircle2, description: "Verifica cambios, pruebas, flujos core y evidencia." },
  { name: "Sentinel", role: "Observabilidad", specialty: "Salud y anomalías", status: "watching", icon: Activity, description: "Monitorea señales de producción y genera alertas verificables." },
  { name: "UX", role: "Experiencia", specialty: "UI, accesibilidad y responsive", status: "standby", icon: Palette, description: "Audita la experiencia visual y accesibilidad de Nüva One." },
  { name: "Release", role: "Release Engineering", specialty: "Gates y certificación", status: "watching", icon: Code2, description: "Consolida evidencia y protege los criterios de salida." },
];

const statusLabel = { online: "TRABAJANDO", watching: "MONITOREANDO", standby: "EN ESPERA" } as const;

export function AgencyTeam({ selectedWorker, onSelectWorker }: { selectedWorker?: string; onSelectWorker?: (agentId: string) => void }) {
  return (
    <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200/70"><ShieldCheck className="h-4 w-4" /> Equipo privado del Owner</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Nüva Agency · Equipo de trabajadores</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">Equipo interno especializado para cubrir ingeniería, producto, datos, seguridad, negocio, cumplimiento, calidad y operación. La cobertura automática está programada de forma continua: Sentinel cada 30 min, Constructor cada 30 min y Web QA cada hora. El estado mostrado es de la capa de Agency; no implica que cada agente esté ejecutando una tarea en este instante.</p>
        </div>
        <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-2 text-xs text-emerald-200"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-300" />Control exclusivo Owner</div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {workers.map((worker) => {
          const Icon = worker.icon;
          return (
            <article key={worker.name} onClick={() => onSelectWorker?.(worker.name.toLowerCase())} className={`cursor-pointer rounded-2xl border border-white/8 bg-black/15 p-4 transition hover:border-white/15 hover:bg-white/[0.045] ${selectedWorker === worker.name.toLowerCase() ? "border-cyan-300/30 bg-cyan-300/[0.05]" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]"><Icon className="h-5 w-5 text-white/65" /></div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold tracking-[0.12em] ${worker.status === "online" ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-200" : worker.status === "watching" ? "border-emerald-300/15 bg-emerald-300/5 text-emerald-200" : "border-white/10 bg-white/[0.03] text-white/35"}`}><span className={`h-1.5 w-1.5 rounded-full ${worker.status === "standby" ? "bg-white/25" : "bg-emerald-300"}`} />{statusLabel[worker.status]}</span>
              </div>
              <h3 className="mt-4 font-semibold">{worker.name}</h3>
              <div className="mt-1 text-xs text-cyan-200/65">{worker.role} · {worker.specialty}</div>
              <p className="mt-3 min-h-10 text-xs leading-5 text-white/40">{worker.description}</p>
            </article>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-white/30">
        <span className="rounded-full border border-white/8 px-2.5 py-1">13 especialistas</span>
        <span className="rounded-full border border-white/8 px-2.5 py-1">Owner-only</span>
        <span className="rounded-full border border-white/8 px-2.5 py-1">Evidence-first</span>
        <span className="rounded-full border border-white/8 px-2.5 py-1">Producción protegida</span>
        <span className="rounded-full border border-cyan-300/15 bg-cyan-300/5 px-2.5 py-1 text-cyan-200/70">Cobertura continua 24/7</span>
      </div>
    </section>
  );
}
