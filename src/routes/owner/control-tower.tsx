import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, Bot, Database, Gauge, RefreshCw, ShieldCheck, Send, Square, Terminal, Zap, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AgencyTeam } from "@/components/owner/agency-team";

type PlatformMetrics = { users?: number; businesses?: number; memberships?: number; customers?: number; products?: number; sales?: number; transactions?: number; quotes?: number; ai_conversations?: number; ai_messages?: number; income?: number; expenses?: number; generated_at?: string };
type ControlMetrics = {
  platform?: PlatformMetrics | null;
  ai_telemetry?: { events_24h?: number; events_30d?: number; input_tokens_24h?: number; output_tokens_24h?: number; total_tokens_24h?: number; estimated_cost_usd_24h?: number; estimated_cost_usd_30d?: number; fallbacks_24h?: number; avg_attempts_24h?: number; providers_24h?: Record<string, number> } | null;
};
type AgencyMessage = { role: "user" | "assistant"; content: string };

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

async function askWorker(agentId: string, messages: AgencyMessage[], signal: AbortSignal) {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");

  const response = await fetch("/api/owner/agency-chat", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ agentId, messages }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error === "AGENCY_ACCESS_DENIED" ? "Acceso denegado al Control Plane." : body?.error ?? "No fue posible contactar al Constructor.");
  }
  return response.body;
}

const n = (value: number | undefined) => (value ?? 0).toLocaleString("es-CL");
const usd = (value: number | undefined) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(value ?? 0);

function ControlTower() {
  const [metrics, setMetrics] = useState<ControlMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState("constructor");
  const [messages, setMessages] = useState<AgencyMessage[]>([{ role: "assistant", content: "Trabajador conectado. Puedo entregarte reportes verificables, revisar evidencia y mantener contexto operativo." }]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);\n  const [feedback, setFeedback] = useState<Record<number, "positive" | "negative">>({});
  const abortRef = useRef<AbortController | null>(null);

  const refresh = async () => {
    setLoading(true); setError(null);
    try { setMetrics(await loadMetrics()); }
    catch (err) { setError(err instanceof Error ? err.message : "Error inesperado"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const sendFeedback = async (index: number, helpful: boolean) => {
    if (feedback[index]) return;
    const message = messages[index];
    if (!message || message.role !== "assistant") return;
    const previousUser = [...messages.slice(0, index)].reverse().find((item) => item.role === "user");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/owner/agency-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agentId: selectedWorker, prompt: previousUser?.content ?? "", response: message.content, feedback: helpful }),
      });
      if (response.ok) setFeedback((current) => ({ ...current, [index]: helpful ? "positive" : "negative" }));
    } catch {
      // El feedback no debe interrumpir la conversación.
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setChatLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const stream = await askWorker(selectedWorker, next, controller.signal);
      if (!stream) throw new Error("El Constructor no devolvió un flujo de respuesta.");
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      setMessages([...next, { role: "assistant", content: "" }]);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: answer }]);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setMessages([...next, { role: "assistant", content: `No pude completar la respuesta: ${err instanceof Error ? err.message : "error inesperado"}` }]);
    } finally {
      abortRef.current = null;
      setChatLoading(false);
    }
  };

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
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">Centro privado del propietario para supervisar Nüva One y conversar con el Constructor interno.</p>
            </div>
            <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar</button>
          </div>
        </header>

        <AgencyTeam selectedWorker={selectedWorker} onSelectWorker={(agentId) => { setSelectedWorker(agentId); setMessages([{ role: "assistant", content: "Trabajador conectado. Puedo entregarte reportes verificables, revisar evidencia y mantener contexto operativo." }]); }} />

        {error ? <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div> : null}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card icon={Activity} label="Usuarios" value={n(platform?.users)} />
          <Card icon={Database} label="PYMEs" value={n(platform?.businesses)} />
          <Card icon={Bot} label="Mensajes IA" value={n(ai?.events_24h)} />
          <Card icon={AlertTriangle} label="Fallbacks IA 24h" value={n(fallbackCount)} tone={fallbackCount > 0 ? "warn" : "ok"} />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.35fr]">
          <div className="space-y-5">
            <Panel title="Constructor interno" icon={Terminal}>
              <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
                <div className="flex items-center gap-3"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-300" /><div><div className="font-semibold">Disponible</div><div className="text-xs text-white/40">Canal privado · solo Owner</div></div></div>
                <div className="mt-4 grid gap-2 text-xs text-white/55">
                  <Row label="Foco" value="#145 / #144" />
                  <Row label="Modo" value="Evidencia primero" />
                  <Row label="Producción" value="Protegida" />
                </div>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-4 text-xs leading-5 text-white/45">El chat ya está conectado al endpoint privado del Constructor. La ejecución autónoma continúa gobernada por los gates de Agency; esta conversación no simula commits, PRs ni despliegues.</div>
            </Panel>
            <Panel title="Plataforma" icon={Database}>
              <Row label="Usuarios" value={n(platform?.users)} /><Row label="PYMEs" value={n(platform?.businesses)} /><Row label="Membresías" value={n(platform?.memberships)} /><Row label="Clientes" value={n(platform?.customers)} /><Row label="Productos" value={n(platform?.products)} />
            </Panel>
            <Panel title="Operación" icon={Gauge}>
              <Row label="Ventas" value={n(platform?.sales)} /><Row label="Transacciones" value={n(platform?.transactions)} /><Row label="Cotizaciones" value={n(platform?.quotes)} /><Row label="Conversaciones IA" value={n(platform?.ai_conversations)} /><Row label="Estado" value="Operativo" />
            </Panel>
          </div>

          <section className="flex min-h-[680px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div><div className="flex items-center gap-2 font-semibold"><Bot className="h-4 w-4 text-cyan-200" /> Nüva Agency · {selectedWorker}</div><div className="mt-1 text-xs text-white/35">Canal privado del trabajador seleccionado · memoria operativa persistente</div></div>
              {chatLoading ? <button onClick={() => abortRef.current?.abort()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10"><Square className="h-3 w-3" /> Detener</button> : <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">ONLINE</span>}
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {messages.map((message, index) => <div key={index} className={message.role === "user" ? "ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-indigo-500/20 px-4 py-3 text-sm text-white" : "max-w-[88%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white/75"}><div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">{message.role === "user" ? "Tú" : selectedWorker}</div><div className="whitespace-pre-wrap">{message.content || "Pensando…"}</div>{message.role === "assistant" && message.content && !chatLoading ? <div className="mt-3 flex items-center gap-2 border-t border-white/6 pt-2"><span className="text-[10px] text-white/25">¿Te sirvió?</span><button onClick={() => void sendFeedback(index, true)} disabled={Boolean(feedback[index])} className={`rounded-md px-2 py-1 text-[10px] ${feedback[index] === "positive" ? "bg-emerald-300/15 text-emerald-200" : "text-white/35 hover:bg-white/5"}`}>Útil</button><button onClick={() => void sendFeedback(index, false)} disabled={Boolean(feedback[index])} className={`rounded-md px-2 py-1 text-[10px] ${feedback[index] === "negative" ? "bg-amber-300/15 text-amber-200" : "text-white/35 hover:bg-white/5"}`}>Corregir</button></div> : null}</div>)}
            </div>
            <div className="border-t border-white/10 p-4">
              <div className="flex gap-2 rounded-xl border border-white/10 bg-black/20 p-2 focus-within:border-cyan-200/30">
                <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder={`Ordena o pregunta a ${selectedWorker}…`} rows={2} className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-white/25" disabled={chatLoading} />
                <button onClick={() => void send()} disabled={chatLoading || !input.trim()} className="self-end rounded-lg bg-white px-3 py-2 text-black transition hover:bg-white/90 disabled:opacity-30"><Send className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 text-[10px] text-white/25">Enter enviar · Shift+Enter salto de línea · acceso exclusivo Owner</div>
            </div>
          </section>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel title="Nüva IA" icon={Bot}><Row label="Requests 24h" value={n(ai?.events_24h)} /><Row label="Tokens 24h" value={n(ai?.total_tokens_24h)} /><Row label="Intentos promedio" value={(ai?.avg_attempts_24h ?? 0).toFixed(2)} /><Row label="Costo estimado 24h" value={usd(ai?.estimated_cost_usd_24h)} /><Row label="Costo estimado 30d" value={usd(ai?.estimated_cost_usd_30d)} /></Panel>
          <Panel title="Criterios de salida a beta" icon={ShieldCheck}><CheckRow text="Owner autenticado y aislado" ok /><CheckRow text="Métricas de plataforma disponibles" ok={Boolean(platform)} /><CheckRow text="Telemetría de IA disponible" ok={Boolean(ai)} /><CheckRow text="Fallback de proveedor implementado" ok /><CheckRow text="Prueba 25/50/100 VUs ejecutada en staging" ok={false} /></Panel>
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
