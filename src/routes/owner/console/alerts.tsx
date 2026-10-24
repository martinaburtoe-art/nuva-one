import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BellRing, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Consola de incidentes del motor determinístico de alertas. Cada incidente
 * nace de un umbral medido contra métricas reales (nada de IA ni causas
 * inventadas); ack/resolución son acciones humanas con bitácora.
 */
export const Route = createFileRoute("/owner/console/alerts")({
  ssr: false,
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw redirect({ to: "/auth", search: { redirect: "/owner/console/alerts" } });
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: "/owner/console/alerts" } });
    if ((data.user.app_metadata as Record<string, unknown> | null)?.platform_role !== "owner") throw redirect({ to: "/" });
  },
  component: AlertsConsole,
});

type Threshold = { metric: string; comparison: string; threshold_value: number; window_label: string; severity: string; enabled: boolean; description: string };
type Incident = {
  id: string; fingerprint: string; metric: string; severity: string; status: string;
  observed_value: number; threshold_value: number; comparison: string; window_label: string;
  occurrences: number; first_seen_at: string; last_seen_at: string; resolution_note: string | null;
};
type IncidentEvent = { id: string; incident_id: string; event: string; observed_value: number | null; created_at: string };

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  const response = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const source = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(source?.error ?? "No disponible");
  return source as T;
}

const severityStyle: Record<string, string> = {
  critical: "border-red-500/50 bg-red-500/10 text-red-200",
  warning: "border-amber-500/50 bg-amber-500/10 text-amber-200",
  info: "border-sky-500/50 bg-sky-500/10 text-sky-200",
};
const statusLabel: Record<string, string> = { open: "Abierto", acknowledged: "Investigando", resolved: "Resuelto" };
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-CL") : "—");

function AlertsConsole() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      await postJson("/api/owner/alerts", { op: "evaluate" });
      const state = await postJson<{ incidents: Incident[]; thresholds: Threshold[]; events: IncidentEvent[] }>("/api/owner/alerts", { op: "list" });
      setIncidents(state.incidents); setThresholds(state.thresholds); setEvents(state.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (op: "acknowledge" | "resolve", incident: Incident) => {
    if (op === "resolve" && !window.confirm(`¿Marcar como resuelto el incidente de ${incident.metric}? Deja evidencia en la bitácora.`)) return;
    setBusy(incident.id + op);
    try {
      const note = op === "resolve" ? window.prompt("Nota de resolución (opcional, se audita):") ?? "" : "";
      await postJson("/api/owner/alerts", { op, incident_id: incident.id, note });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally { setBusy(null); }
  };

  const open = incidents.filter((i) => i.status !== "resolved");

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertas e incidentes</h1>
          <p className="mt-1 text-sm text-white/55">
            Motor determinístico: umbrales explícitos contra métricas reales. La resolución es humana y queda auditada.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}
          className="border-white/15 bg-white/5 text-xs font-semibold text-white/80 hover:bg-white/10">
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Reevaluar
        </Button>
      </div>

      {error && (
        <Card className="mb-5 border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</Card>
      )}

      <Card className="mb-6 rounded-2xl border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold text-white/85">Umbrales configurados (editables en BD por el propietario)</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {thresholds.map((t) => (
            <div key={t.metric} className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-white/85">{t.metric}</span>
                <span className={`rounded-full border px-2 py-0.5 ${severityStyle[t.severity] ?? severityStyle.info}`}>{t.severity}</span>
              </div>
              <p className="mt-1 text-white/55">
                {t.comparison} {Number(t.threshold_value).toLocaleString("es-CL")} · ventana {t.window_label} · {t.enabled ? "activo" : "apagado"}
              </p>
              <p className="mt-1 text-white/40">{t.description}</p>
            </div>
          ))}
          {thresholds.length === 0 && !loading && <p className="text-sm text-white/50">Sin umbrales cargados.</p>}
        </div>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-white/85">
        Incidentes · {open.length} activos de {incidents.length}
      </h2>
      {loading && incidents.length === 0 ? (
        <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
      ) : incidents.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-white/15 p-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300/70" />
          <p className="mt-3 font-medium text-white/80">Sin incidentes abiertos</p>
          <p className="mt-1 text-sm text-white/45">Todas las métricas medidas quedaron dentro de sus umbrales en la última evaluación.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {incidents.map((i) => (
            <Card key={i.id} className="rounded-2xl border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${severityStyle[i.severity] ?? severityStyle.info}`}>
                    {i.severity}
                  </span>
                  <div>
                    <p className="font-mono text-sm font-semibold text-white/90">{i.metric}</p>
                    <p className="text-[11px] text-white/45">
                      {statusLabel[i.status] ?? i.status} · {i.occurrences} ocurrencias · observado {n(i.observed_value)} {i.comparison} umbral {n(i.threshold_value)} · ventana {i.window_label}
                    </p>
                    <p className="text-[11px] text-white/40">Primera vez {fmt(i.first_seen_at)} · Última {fmt(i.last_seen_at)}</p>
                    {i.resolution_note && <p className="text-[11px] text-emerald-200/70">Resolución: {i.resolution_note}</p>}
                  </div>
                </div>
                {i.status !== "resolved" && (
                  <div className="flex gap-2">
                    {i.status === "open" && (
                      <Button size="sm" variant="outline" disabled={busy === i.id + "acknowledge"}
                        onClick={() => void act("acknowledge", i)}
                        className="h-8 border-white/20 bg-white/5 text-[11px] text-white/80 hover:bg-white/10">
                        <BellRing className="mr-1 h-3 w-3" />Investigar
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={busy === i.id + "resolve"}
                      onClick={() => void act("resolve", i)}
                      className="h-8 border-emerald-400/30 bg-emerald-400/10 text-[11px] text-emerald-100 hover:bg-emerald-400/20">
                      <CheckCircle2 className="mr-1 h-3 w-3" />Resolver
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <Card className="mt-6 rounded-2xl border-white/10 bg-white/[0.03] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white/70"><ShieldAlert className="h-4 w-4" />Historial reciente</h2>
          <div className="mt-3 space-y-1 text-[11px] text-white/50">
            {events.slice(0, 20).map((e) => (
              <p key={e.id} className="font-mono">{fmt(e.created_at)} · {e.event}{e.observed_value != null ? ` · ${n(e.observed_value)}` : ""}</p>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}

const n = (v: number) => v.toLocaleString("es-CL");
