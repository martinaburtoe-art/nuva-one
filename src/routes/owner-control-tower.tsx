import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Bot, Database, Gauge, RefreshCw, ShieldCheck, Users, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/owner-control-tower")({
  ssr: false,
  beforeLoad: async () => {
    await supabase.auth.refreshSession();
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    if (data.user.app_metadata?.platform_role !== "owner") throw redirect({ to: "/" });
  },
  component: OwnerControlTower,
});

type Payload = {
  platform?: Record<string, unknown>;
  ai_telemetry?: {
    events_24h?: number;
    events_30d?: number;
    input_tokens_24h?: number;
    output_tokens_24h?: number;
    total_tokens_24h?: number;
    estimated_cost_usd_24h?: number;
    estimated_cost_usd_30d?: number;
    fallbacks_24h?: number;
    avg_attempts_24h?: number;
    providers_24h?: Record<string, number>;
  } | null;
};

async function load() {
  const { data, error } = await supabase.functions.invoke("owner-metrics", { body: {} });
  if (error) throw new Error("No se pudo cargar el Control Tower.");
  return data as Payload;
}

const n = (value: unknown) => Number(value ?? 0).toLocaleString("es-CL");
const usd = (value: unknown) => `$${Number(value ?? 0).toFixed(2)} USD`;

function OwnerControlTower() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await load());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const p = data?.platform ?? {};
  const ai = data?.ai_telemetry ?? {};
  const cost24 = Number(ai.estimated_cost_usd_24h ?? 0);
  const fallback24 = Number(ai.fallbacks_24h ?? 0);
  const aiEvents24 = Number(ai.events_24h ?? 0);
  const fallbackRate = aiEvents24 ? (fallback24 / aiEvents24) * 100 : 0;

  return (
    <main className="min-h-screen bg-[#07070c] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-cyan-200/70">
                <ShieldCheck className="h-4 w-4" /> Owner only
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Nüva Control Tower</h1>
              <p className="mt-2 text-sm text-white/50">Salud operativa, IA, economía y señales de riesgo sin exponer contenido empresarial.</p>
            </div>
            <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
            </button>
          </div>
        </header>

        {error ? <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div> : null}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card icon={Users} label="Usuarios" value={n(p.users)} />
          <Card icon={Database} label="Empresas" value={n(p.businesses)} />
          <Card icon={Activity} label="Eventos 24h" value={n(p.events_today ?? ai.events_24h)} />
          <Card icon={Bot} label="IA 24h" value={n(ai.events_24h)} />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel title="IA · coste y resiliencia" icon={Bot}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Costo estimado 24h" value={usd(cost24)} />
              <Metric label="Costo estimado 30d" value={usd(ai.estimated_cost_usd_30d)} />
              <Metric label="Tokens 24h" value={n(ai.total_tokens_24h)} />
              <Metric label="Fallbacks 24h" value={`${n(fallback24)} · ${fallbackRate.toFixed(1)}%`} />
              <Metric label="Intentos promedio" value={Number(ai.avg_attempts_24h ?? 0).toFixed(2)} />
              <Metric label="Proveedores activos" value={n(Object.keys(ai.providers_24h ?? {}).length)} />
            </div>
          </Panel>

          <Panel title="Salud de plataforma" icon={Gauge}>
            <div className="space-y-3">
              <Status label="Aislamiento multi-tenant" state="Protegido por RLS + membership" />
              <Status label="Autorización IA" state="Server-side + RPC" />
              <Status label="Rate limiting" state="Activo" />
              <Status label="Telemetría" state={`${n(p.events_7d)} eventos / 7 días`} />
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel title="Proveedores IA · 24h" icon={Zap}>
            {Object.entries(ai.providers_24h ?? {}).length ? Object.entries(ai.providers_24h ?? {}).map(([provider, count]) => (
              <div key={provider} className="flex items-center justify-between border-b border-white/5 py-2 text-sm last:border-0">
                <span className="text-white/65">{provider}</span><strong>{n(count)}</strong>
              </div>
            )) : <p className="text-sm text-white/40">Sin eventos registrados.</p>}
          </Panel>
          <Panel title="Señales" icon={AlertTriangle}>
            <Status label="Fallback rate" state={fallbackRate > 10 ? "Revisar" : "Normal"} danger={fallbackRate > 10} />
            <Status label="Costo IA diario" state={cost24 > 25 ? "Revisar presupuesto" : "Dentro del guardrail"} danger={cost24 > 25} />
            <Status label="Eventos" state="Observables" />
          </Panel>
          <Panel title="Próximos gates" icon={ShieldCheck}>
            <ul className="space-y-2 text-sm text-white/55">
              <li>• p50/p95/p99 por endpoint</li>
              <li>• 25/50/100 VUs en staging</li>
              <li>• alertas de presupuesto</li>
              <li>• backup/restore drill</li>
            </ul>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Card({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><Icon className="h-4 w-4 text-cyan-200/70" /><p className="mt-3 text-xs text-white/40">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}
function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Gauge; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="mb-4 flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-cyan-200/70" />{title}</div>{children}</section>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-black/20 p-3"><p className="text-xs text-white/35">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
function Status({ label, state, danger = false }: { label: string; state: string; danger?: boolean }) {
  return <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0"><span className="text-sm text-white/55">{label}</span><span className={`text-right text-xs font-semibold ${danger ? "text-amber-300" : "text-emerald-300"}`}>{state}</span></div>;
}
