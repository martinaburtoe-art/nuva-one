import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, Bot, Database, Gauge, RefreshCw, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PlatformMetrics = {
  users?: number;
  businesses?: number;
  memberships?: number;
  customers?: number;
  products?: number;
  sales?: number;
  transactions?: number;
  quotes?: number;
  ai_conversations?: number;
  ai_messages?: number;
  income?: number;
  expenses?: number;
  generated_at?: string;
};

type ControlMetrics = {
  platform?: PlatformMetrics | null;
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

export const Route = createFileRoute("/owner/control-tower")({
  ssr: false,
  beforeLoad: async () => {
    await supabase.auth.refreshSession();
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    if (data.user.app_metadata?.platform_role !== "owner") throw redirect({ to: "/" });
  },
  component: ControlTower,
});

async function loadMetrics() {
  const { data, error } = await supabase.functions.invoke("owner-metrics", { body: {} });
  if (error) throw new Error("No se pudieron cargar los indicadores de plataforma.");
  return data as ControlMetrics;
}

const n = (value: number | undefined) => (value ?? 0).toLocaleString("es-CL");
const usd = (value: number | undefined) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(value ?? 0);

function ControlTower() {
  const [metrics, setMetrics] = useState<ControlMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try { setMetrics(await loadMetrics()); }
    catch (err) { setError(err instanceof Error ? err.message : "Error inesperado"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const platform = metrics?.platform;
  const ai = metrics?.ai_telemetry;
  const fallbackCount = ai?.fallbacks_24h ?? 0;

  return (
    <main className="min-h-screen bg-[#07070c] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-200/70"><ShieldCheck className="h-4 w-4" /> Nüva One · Private Operations</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Control Tower</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">Centro operativo para validar la plataforma antes de abrir la beta: salud, carga, IA, costos y señales de incidente.</p>
            </div>
            <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar</button>
          </div>
        </header>

        {error ? <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div> : null}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card icon={Activity} label="Usuarios" value={n(platform?.users)} />
          <Card icon={Database} label="PYMEs" value={n(platform?.businesses)} />
          <Card icon={Bot} label="Mensajes IA" value={n(ai?.events_24h)} />
          <Card icon={AlertTriangle} label="Fallbacks IA 24h" value={n(fallbackCount)} tone={fallbackCount > 0 ? "warn" : "ok"} />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel title="Plataforma" icon={Database}>
            <Row label="Usuarios" value={n(platform?.users)} />
            <Row label="PYMEs" value={n(platform?.businesses)} />
            <Row label="Membresías" value={n(platform?.memberships)} />
            <Row label="Clientes" value={n(platform?.customers)} />
            <Row label="Productos" value={n(platform?.products)} />
          </Panel>
          <Panel title="Operación" icon={Gauge}>
            <Row label="Ventas" value={n(platform?.sales)} />
            <Row label="Transacciones" value={n(platform?.transactions)} />
            <Row label="Cotizaciones" value={n(platform?.quotes)} />
            <Row label="Conversaciones IA" value={n(platform?.ai_conversations)} />
            <Row label="Estado" value="Operativo" />
          </Panel>
          <Panel title="Nüva IA" icon={Bot}>
            <Row label="Requests 24h" value={n(ai?.events_24h)} />
            <Row label="Tokens 24h" value={n(ai?.total_tokens_24h)} />
            <Row label="Intentos promedio" value={(ai?.avg_attempts_24h ?? 0).toFixed(2)} />
            <Row label="Costo estimado 24h" value={usd(ai?.estimated_cost_usd_24h)} />
            <Row label="Costo estimado 30d" value={usd(ai?.estimated_cost_usd_30d)} />
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel title="Proveedor / distribución" icon={Zap}>
            {Object.entries(ai?.providers_24h ?? {}).length === 0 ? <p className="text-sm text-white/40">Sin eventos de IA en las últimas 24 horas.</p> : Object.entries(ai?.providers_24h ?? {}).map(([provider, count]) => <Row key={provider} label={provider} value={n(count)} />)}
          </Panel>
          <Panel title="Criterios de salida a beta" icon={ShieldCheck}>
            <CheckRow text="Owner autenticado y aislado" ok />
            <CheckRow text="Métricas de plataforma disponibles" ok={Boolean(platform)} />
            <CheckRow text="Telemetría de IA disponible" ok={Boolean(ai)} />
            <CheckRow text="Fallback de proveedor implementado" ok />
            <CheckRow text="Prueba 25/50/100 VUs ejecutada en staging" ok={false} />
          </Panel>
        </section>

        <footer className="mt-8 border-t border-white/8 pt-5 text-xs text-white/30">Lectura agregada de plataforma · última actualización {platform?.generated_at ? new Date(platform.generated_at).toLocaleString("es-CL") : "—"}</footer>
      </div>
    </main>
  );
}

function Card({ icon: Icon, label, value, tone = "normal" }: { icon: LucideIcon; label: string; value: string; tone?: "normal" | "warn" | "ok" }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><Icon className="h-5 w-5 text-white/50" /><div className="mt-4 text-xs uppercase tracking-[0.18em] text-white/35">{label}</div><div className={`mt-1 text-2xl font-semibold ${tone === "warn" ? "text-amber-200" : tone === "ok" ? "text-emerald-200" : "text-white"}`}>{value}</div></div>;
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="mb-4 flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-white/50" />{title}</div><div className="space-y-2">{children}</div></div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm"><span className="text-white/45">{label}</span><span className="font-medium text-white/85">{value}</span></div>;
}

function CheckRow({ text, ok }: { text: string; ok: boolean }) {
  return <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm"><span className="text-white/55">{text}</span><span className={ok ? "text-emerald-300" : "text-amber-300"}>{ok ? "READY" : "PENDING"}</span></div>;
}
