import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Database, DollarSign, Gauge, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

/**
 * Centro de mando ejecutivo de la Owner Console. Conecta por primera vez:
 *  - /api/owner/operational-metrics (telemetría operacional rica: tasas de
 *    error, latencias p50/95/99, servicios, vitals, top errores) que la UI
 *    anterior ignoraba casi por completo;
 *  - /api/owner/platform-metrics (RPC get_platform_owner_metrics, agregados
 *    del SaaS que no tenía ningún llamador).
 * Sin datos simulados: fuentes no disponibles se muestran como tales.
 */
export const Route = createFileRoute("/owner/console")({
  ssr: false,
  beforeLoad: ownerGuard("/owner/console"),
  component: CommandCenter,
});

function ownerGuard(path: string) {
  return async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw redirect({ to: "/auth", search: { redirect: path } });
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: path } });
    if ((data.user.app_metadata as Record<string, unknown> | null)?.platform_role !== "owner") {
      throw redirect({ to: "/" });
    }
  };
}

type PlatformMetrics = {
  users?: number; businesses?: number; memberships?: number; customers?: number;
  products?: number; sales?: number; transactions?: number; quotes?: number;
  ai_conversations?: number; ai_messages?: number; income?: number; expenses?: number;
  generated_at?: string;
};
type OperationalMetrics = {
  generated_at?: string;
  telemetry?: {
    events_24h?: number; error_events_24h?: number; distinct_errors_24h?: number;
    error_rate_5m?: number; error_rate_1h?: number;
    latency_p50_ms?: number | null; latency_p95_ms?: number | null; latency_p99_ms?: number | null;
  };
  services?: Record<string, unknown>;
  vitals?: Record<string, unknown>;
  top_errors?: Array<Record<string, unknown>>;
  error?: string;
};

async function postJson<T>(path: string): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  const response = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const source = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(source?.error ?? "No disponible");
  return source as T;
}

const n = (v: number | undefined | null) => (v ?? 0).toLocaleString("es-CL");
const clp = (v: number | undefined | null) =>
  v == null ? "—" : new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);
const ms = (v: number | null | undefined) => (v == null ? "—" : `${n(v)} ms`);
const pct = (v: number | undefined | null) => (v == null ? "—" : `${(v * 100).toFixed(2)}%`);

function CommandCenter() {
  const [platform, setPlatform] = useState<PlatformMetrics | null>(null);
  const [ops, setOps] = useState<OperationalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformDown, setPlatformDown] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const [nextOps] = await Promise.all([
        postJson<OperationalMetrics>("/api/owner/operational-metrics"),
        postJson<{ platform: PlatformMetrics }>("/api/owner/platform-metrics")
          .then((r) => { setPlatform(r.platform); setPlatformDown(null); })
          .catch((err: Error) => setPlatformDown(err.message)),
      ]);
      setOps(nextOps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const t = ops?.telemetry;
  const errorRate = t?.error_rate_5m ?? 0;
  const degraded = errorRate > 0.05;

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Centro de mando</h1>
          <p className="mt-1 text-sm text-white/55">
            Estado real de la plataforma y del negocio SaaS. Sin datos simulados.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {error && (
        <Card className="mb-5 border-red-500/40 bg-red-500/10 p-5 text-sm">
          <p className="flex items-center gap-2 font-semibold text-red-200"><AlertTriangle className="h-4 w-4" />{error}</p>
          <p className="mt-1 text-white/60">Reintenta o revisa tu sesión. Las demás fuentes pueden seguir disponibles.</p>
        </Card>
      )}

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Negocios" value={platform ? n(platform.businesses) : null} icon={<Database className="h-4 w-4" />} down={platformDown} />
        <Kpi label="Usuarios" value={platform ? n(platform.users) : null} icon={<Users className="h-4 w-4" />} down={platformDown} />
        <Kpi label="Membresías" value={platform ? n(platform.memberships) : null} icon={<Users className="h-4 w-4" />} down={platformDown} />
        <Kpi label="Ventas totales" value={platform ? n(platform.sales) : null} icon={<Activity className="h-4 w-4" />} down={platformDown} />
        <Kpi label="Transacciones" value={platform ? n(platform.transactions) : null} icon={<Activity className="h-4 w-4" />} down={platformDown} />
        <Kpi label="Cotizaciones" value={platform ? n(platform.quotes) : null} icon={<Gauge className="h-4 w-4" />} down={platformDown} />
        <Kpi label="Ingresos (cobros pagados)" value={platform ? clp(platform.income) : null} icon={<DollarSign className="h-4 w-4" />} down={platformDown} />
        <Kpi label="Gastos de plataforma" value={platform ? clp(platform.expenses) : null} icon={<DollarSign className="h-4 w-4" />} down={platformDown} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl border-white/10 bg-white/[0.04] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white/85"><Activity className="h-4 w-4" />Operación (24h)</h2>
          {loading && !ops ? <Skeleton /> : (
            <div className="mt-4 space-y-2 text-sm">
              <Line label="Eventos" value={n(t?.events_24h)} />
              <Line label="Errores" value={n(t?.error_events_24h)} />
              <Line label="Errores distintos" value={n(t?.distinct_errors_24h)} />
              <Line label="Tasa error 5m" value={pct(t?.error_rate_5m)} highlight={degraded} />
              <Line label="Tasa error 1h" value={pct(t?.error_rate_1h)} />
              <Line label="Latencia p50" value={ms(t?.latency_p50_ms)} />
              <Line label="Latencia p95" value={ms(t?.latency_p95_ms)} />
              <Line label="Latencia p99" value={ms(t?.latency_p99_ms)} />
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border-white/10 bg-white/[0.04] p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white/85">Top errores (24h) · agrupados por fingerprint</h2>
          {loading && !ops ? <Skeleton /> : (
            (ops?.top_errors?.length ?? 0) === 0 ? (
              <p className="mt-4 text-sm text-white/50">Sin errores registrados en la ventana. Fuente: telemetría operacional.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {ops?.top_errors?.slice(0, 8).map((e, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs">
                    <span className="font-mono text-white/80">{String(e.type ?? e.event_type ?? e.fingerprint ?? "error")}</span>
                    <span className="text-white/50">{String(e.route ?? e.path ?? "")}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold">{n(Number(e.count ?? e.events ?? 0))}</span>
                  </div>
                ))}
              </div>
            )
          )}
          <p className="mt-4 text-[11px] text-white/40">
            Actualizado: {ops?.generated_at ?? "—"} · Servicios: {Object.keys(ops?.services ?? {}).length} fuentes ·
            {" "}Vitals: {Object.keys(ops?.vitals ?? {}).length} métricas
          </p>
        </Card>
      </section>

      {degraded && (
        <Card className="mt-4 border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <span className="font-semibold">Tasa de error elevada.</span> Revisa la pestaña Alertas para abrir el incidente correspondiente.
        </Card>
      )}
    </main>
  );
}

function Kpi({ label, value, icon, down }: { label: string; value: string | null; icon: React.ReactNode; down: string | null }) {
  return (
    <Card className="rounded-2xl border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between text-white/50">{label}{icon}</div>
      <p className="mt-2 text-2xl font-bold tracking-tight">
        {value ?? <span className="text-sm font-normal text-white/40">No disponible{down ? ` · ${down}` : ""}</span>}
      </p>
    </Card>
  );
}

function Line({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-1.5">
      <span className="text-white/55">{label}</span>
      <span className={`font-semibold ${highlight ? "text-amber-300" : "text-white/90"}`}>{value}</span>
    </div>
  );
}

function Skeleton() {
  return <div className="mt-4 h-28 animate-pulse rounded-xl bg-white/5" />;
}
