import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, CreditCard, FileText, Link2, Loader2, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type RecoveryRequest = {
  id: string;
  business_id: string;
  sale_id: string | null;
  provider: string;
  commerce_order: string;
  amount: number;
  subject: string;
  status: string;
  payment_intent_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  business: { id: string; name: string } | null;
  sale: { id: string; status: string; total: number; paid_amount: number } | null;
  intent: { id: string; status: string; amount: number; commerce_order: string; provider: string; resolved_at: string | null } | null;
};
type RecoveryAudit = {
  id: string;
  request_id: string;
  action: string;
  note: string;
  evidence: Record<string, unknown>;
  created_at: string;
};

export const Route = createFileRoute("/owner/payment-recovery")({
  ssr: false,
  beforeLoad: async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw redirect({ to: "/auth", search: { redirect: "/owner/payment-recovery" } });
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: "/owner/payment-recovery" } });
    if (data.user.app_metadata?.platform_role !== "owner") throw redirect({ to: "/" });
  },
  component: PaymentRecoveryPage,
});

const money = (value: number) => new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
}).format(Number(value) || 0);
const date = (value: string) => new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium", timeStyle: "short",
}).format(new Date(value));
const actionLabel: Record<string, string> = {
  provider_check: "Verificación de pasarela",
  link_intent: "Vinculación de intento",
  refund_required: "Devolución requerida",
  manual_adjustment_required: "Ajuste contable requerido",
  note: "Nota de conciliación",
};

function auditEvidenceLabel(evidence: Record<string, unknown>) {
  const parts: string[] = [];
  if (typeof evidence.source === "string") parts.push(`Origen: ${evidence.source}`);
  if (typeof evidence.provider_status === "string") parts.push(`Estado proveedor: ${evidence.provider_status}`);
  if (typeof evidence.outcome === "string") parts.push(`Resultado: ${evidence.outcome}`);
  if (typeof evidence.provider_amount === "number" || typeof evidence.provider_amount === "string") parts.push(`Importe proveedor: ${money(Number(evidence.provider_amount))}`);
  if (typeof evidence.provider_commerce_order === "string") parts.push(`Orden proveedor: ${evidence.provider_commerce_order}`);
  if (evidence.verified === false) parts.push("No verificado");
  return parts.join(" · ");
}

function PaymentRecoveryPage() {
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [audit, setAudit] = useState<RecoveryAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("La sesión expiró. Inicia sesión nuevamente.");
      const response = await fetch("/api/owner/payment-recovery", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await response.json().catch(() => null) as {
        requests?: RecoveryRequest[]; audit?: RecoveryAudit[]; error?: string;
      } | null;
      if (!response.ok) throw new Error(body?.error ?? "No fue posible cargar la cola.");
      setRequests(body?.requests ?? []);
      setAudit(body?.audit ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar conciliaciones.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const act = async (requestId: string, action: string) => {
    if (busyId) return;
    const note = notes[requestId]?.trim() ?? "";
    if (action !== "check_provider" && note.length < 5) {
      setFeedback((current) => ({ ...current, [requestId]: "Agrega una nota de al menos 5 caracteres para registrar la decisión." }));
      return;
    }
    setBusyId(requestId);
    setFeedback((current) => ({ ...current, [requestId]: "" }));
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("La sesión expiró. Inicia sesión nuevamente.");
      const response = await fetch("/api/owner/payment-recovery", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, action, note }),
      });
      const body = await response.json().catch(() => null) as { error?: string; result?: { outcome?: string; status?: string } } | null;
      if (!response.ok) throw new Error(body?.error ?? "No fue posible completar la acción.");
      const outcome = body?.result?.outcome;
      setFeedback((current) => ({
        ...current,
        [requestId]: outcome ? `Resultado verificado: ${outcome}` : "Acción registrada en la bitácora de conciliación.",
      }));
      setNotes((current) => ({ ...current, [requestId]: "" }));
      await load(true);
    } catch (err) {
      setFeedback((current) => ({ ...current, [requestId]: err instanceof Error ? err.message : "Acción fallida." }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-6 text-slate-900 dark:bg-[#090b12] dark:text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <a href="/owner/control-tower" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" /> Control Tower
              </a>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                <ShieldCheck className="h-4 w-4" /> Acceso exclusivo del propietario
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Conciliación de pagos</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Revisa cobros que quedaron en cuarentena. La verificación consulta directamente a la pasarela; las decisiones quedan auditadas.
              </p>
            </div>
            <button onClick={() => void load(true)} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Actualizar
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.04]">
              <p className="text-xs text-slate-500">Solicitudes en cuarentena</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{requests.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.04]">
              <p className="text-xs text-slate-500">Importe total en revisión</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{money(requests.reduce((sum, row) => sum + Number(row.amount || 0), 0))}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.04]">
              <p className="text-xs text-slate-500">Acciones auditadas cargadas</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{audit.length}</p>
            </div>
          </div>
        </header>

        <div className="mb-5 flex gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p><strong>Protección financiera:</strong> no se genera un segundo cobro ni se fuerza un pago. Si el proveedor confirma un pago incompatible con la venta, el intento permanece en cuarentena para devolución o ajuste manual. Las acciones de esta pantalla no ejecutan transferencias ni devoluciones.</p>
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{error}</div>}
        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03]"><Loader2 className="h-5 w-5 animate-spin" /> Cargando solicitudes...</div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-300/20 dark:bg-emerald-300/5">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-300" />
            <h2 className="mt-3 text-lg font-semibold">No hay pagos pendientes de conciliación</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">La cola está vacía en este momento. Actualiza para comprobar nuevos casos.</p>
          </div>
        ) : (
          <section className="space-y-4">
            {requests.map((row) => {
              const history = audit.filter((item) => item.request_id === row.id);
              const isBusy = busyId === row.id;
              return (
                <article key={row.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-white/10">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-300/10 dark:text-amber-200">Requiere conciliación</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300">{row.provider}</span>
                      </div>
                      <h2 className="mt-3 text-lg font-semibold">{row.business?.name ?? "Negocio no disponible"}</h2>
                      <p className="mt-1 break-all font-mono text-xs text-slate-500">Orden: {row.commerce_order}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-500">Importe solicitado</p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">{money(row.amount)}</p>
                      <p className="mt-1 text-xs text-slate-500">Actualizado {date(row.updated_at)}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 md:grid-cols-3">
                    <div className="space-y-1 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Venta</p>
                      <p>{row.sale_id ? `#${row.sale_id.slice(0, 8)}` : "Pago sin venta asociada"}</p>
                      <p className="text-xs text-slate-500">{row.sale ? `Estado: ${row.sale.status} · Pagado ${money(row.sale.paid_amount)} / ${money(row.sale.total)}` : "Sin datos de venta"}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Intento de pago</p>
                      <p>{row.intent ? row.intent.status : row.payment_intent_id ? "Referencia no disponible" : "No vinculado"}</p>
                      <p className="break-all font-mono text-[11px] text-slate-500">{row.payment_intent_id ?? "Se buscará por orden y negocio"}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Motivo original</p>
                      <p className="break-words">{row.last_error ?? "No informado"}</p>
                      <p className="text-xs text-slate-500">Creado {date(row.created_at)}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`note-${row.id}`}>Nota / fundamento de la decisión</label>
                    <p className="mb-2 text-[11px] text-slate-500">No ingreses tokens, claves API, credenciales ni payloads privados en esta nota.</p>
                    <textarea
                      id={`note-${row.id}`}
                      value={notes[row.id] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))}
                      rows={2}
                      maxLength={1000}
                      placeholder="Describe la evidencia revisada o el siguiente paso operativo..."
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-[#0d111b] dark:focus:ring-indigo-400/10"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => void act(row.id, "check_provider")} disabled={Boolean(busyId) || row.provider === "vsb"} title={row.provider === "vsb" ? "Conciliación deshabilitada hasta validar el contrato oficial VSB" : undefined} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Verificar pasarela
                      </button>
                      {!row.payment_intent_id && (
                        <button onClick={() => void act(row.id, "link_intent")} disabled={Boolean(busyId)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium hover:bg-white disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10">
                          <Link2 className="h-4 w-4" /> Vincular intento encontrado
                        </button>
                      )}
                      <button onClick={() => void act(row.id, "refund_required")} disabled={Boolean(busyId)} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 px-3.5 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-300/20 dark:text-amber-200 dark:hover:bg-amber-300/10">
                        <Wallet className="h-4 w-4" /> Marcar devolución necesaria
                      </button>
                      <button onClick={() => void act(row.id, "manual_adjustment_required")} disabled={Boolean(busyId)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium hover:bg-white disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10">
                        <FileText className="h-4 w-4" /> Marcar ajuste contable
                      </button>
                    </div>
                    {feedback[row.id] && <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">{feedback[row.id]}</p>}
                  </div>

                  {history.length > 0 && (
                    <div className="border-t border-slate-100 px-5 py-4 dark:border-white/10">
                      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Clock3 className="h-4 w-4" /> Historial de auditoría</h3>
                      <ol className="space-y-3">
                        {history.map((item) => (
                          <li key={item.id} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-medium">{actionLabel[item.action] ?? item.action}</p>
                              <p className="text-xs text-slate-500">{item.note}</p>
                              {auditEvidenceLabel(item.evidence) && <p className="mt-1 break-words text-[11px] text-slate-400">{auditEvidenceLabel(item.evidence)}</p>}
                            </div>
                            <time className="shrink-0 text-xs text-slate-500">{date(item.created_at)}</time>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
        <footer className="mt-8 text-center text-xs text-slate-500">
          Datos privados del propietario · No se muestran tokens, claves ni payloads de la pasarela.
        </footer>
      </div>
    </main>
  );
}
