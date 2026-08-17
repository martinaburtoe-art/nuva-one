import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Bot, Building2, CircleDollarSign, Gauge, LogOut, RefreshCw, ShieldCheck, Sparkles, Users, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Metrics = {
  users: number; businesses: number; memberships: number; customers: number; products: number; sales: number; transactions: number; quotes: number; ai_conversations: number; ai_messages: number; income: number; expenses: number; generated_at: string;
};

export const Route = createFileRoute("/owner")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    if (data.user.app_metadata?.platform_role !== "owner") throw redirect({ to: "/" });
  },
  component: OwnerConsole,
});

async function loadMetrics(): Promise<Metrics> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!token || !url || !key) throw new Error("No se pudo autenticar el panel de propietario.");
  const response = await fetch(`${url}/rest/v1/rpc/get_platform_owner_metrics`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) throw new Error("No se pudieron cargar los indicadores de Nüva.");
  return (await response.json()) as Metrics;
}

function OwnerConsole() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true); setError(null);
    try { setMetrics(await loadMetrics()); } catch (err) { setError(err instanceof Error ? err.message : "Error inesperado"); } finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const net = useMemo(() => (metrics?.income ?? 0) - (metrics?.expenses ?? 0), [metrics]);
  const cards = metrics ? [
    ["Usuarios", metrics.users, Users], ["Empresas", metrics.businesses, Building2], ["Clientes", metrics.customers, Users], ["Productos", metrics.products, Gauge], ["Ventas", metrics.sales, Activity], ["Conversaciones IA", metrics.ai_conversations, Bot],
  ] as const : [];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200/70"><ShieldCheck className="h-4 w-4" /> Private Owner Console</div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Nüva Pulse</h1><p className="mt-2 max-w-2xl text-sm text-white/55">El panel operativo de Nüva One: crecimiento, producto, IA, actividad y salud económica.</p></div>
          <div className="flex gap-2"><button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar</button><button onClick={() => void supabase.auth.signOut()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10"><LogOut className="h-4 w-4" /> Salir</button></div>
        </header>

        {error ? <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"><XCircle className="h-5 w-5" />{error}</div> : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([label, value, Icon]) => <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20"><div className="flex items-center justify-between"><span className="text-sm text-white/55">{label}</span><Icon className="h-5 w-5 text-cyan-200/70" /></div><div className="mt-4 text-3xl font-semibold">{loading ? "—" : value.toLocaleString("es-CL")}</div></div>)}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-cyan-200" /> Intelligence</div><h2 className="mt-2 text-xl font-semibold">Qué está pasando en Nüva</h2><div className="mt-5 grid gap-3 sm:grid-cols-3"><Signal label="Mensajes IA" value={metrics?.ai_messages ?? 0} /><Signal label="Cotizaciones" value={metrics?.quotes ?? 0} /><Signal label="Membresías" value={metrics?.memberships ?? 0} /></div><p className="mt-5 text-sm leading-6 text-white/50">Esta primera versión usa métricas reales y agregadas. La siguiente capa incorporará activación, retención, funnel y telemetría del Command Center.</p></div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><div className="flex items-center gap-2 text-sm font-semibold"><CircleDollarSign className="h-4 w-4 text-emerald-200" /> Economía</div><div className="mt-6 space-y-4"><Money label="Ingresos registrados" value={metrics?.income ?? 0} /><Money label="Gastos registrados" value={metrics?.expenses ?? 0} /><div className="border-t border-white/10 pt-4"><Money label="Neto" value={net} /></div></div></div>
        </section>

        <footer className="mt-6 text-xs text-white/30">Actualizado: {metrics ? new Date(metrics.generated_at).toLocaleString("es-CL") : "—"} · Acceso protegido por app_metadata.platform_role=owner + RPC server-side.</footer>
      </div>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-white/8 bg-black/10 p-4"><div className="text-xs text-white/45">{label}</div><div className="mt-2 text-2xl font-semibold">{value.toLocaleString("es-CL")}</div></div>; }
function Money({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between gap-4"><span className="text-sm text-white/55">{label}</span><strong className="text-lg">{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value)}</strong></div>; }
