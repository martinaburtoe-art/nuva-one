import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, WalletCards, Calculator, ReceiptText, ShoppingCart, Boxes, Users, Target, BrainCircuit } from "lucide-react";
import { useActiveBusiness } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ModuleGuard } from "@/components/module-guard";

type Specialist = "orchestrator" | "finance" | "accounting" | "tax" | "sales" | "inventory" | "crm" | "strategy";

const specialists: Array<{ id: Specialist; label: string; description: string; icon: typeof BrainCircuit }> = [
  { id: "orchestrator", label: "Nüva Agent", description: "Analiza tu negocio de forma integral", icon: BrainCircuit },
  { id: "finance", label: "Finanzas", description: "Caja, rentabilidad y liquidez", icon: WalletCards },
  { id: "accounting", label: "Contabilidad", description: "Cuentas, asientos y balances", icon: Calculator },
  { id: "tax", label: "Tributario Chile", description: "IVA, PPM, DTE y períodos", icon: ReceiptText },
  { id: "sales", label: "Ventas", description: "Ventas, clientes y productos", icon: ShoppingCart },
  { id: "inventory", label: "Inventario", description: "Stock, rotación y reposición", icon: Boxes },
  { id: "crm", label: "Clientes", description: "Cartera, recurrencia y oportunidades", icon: Users },
  { id: "strategy", label: "Estrategia", description: "Prioridades y planes de acción", icon: Target },
];

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({ meta: [{ title: "Nüva Agent — Nüva One" }] }),
  component: AiPage,
});

function AiPage() {
  const [input, setInput] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [specialist, setSpecialist] = useState<Specialist>("orchestrator");
  const { active } = useActiveBusiness();
  const tokenRef = useRef<string | null>(null);
  const businessIdRef = useRef<string>("");

  useEffect(() => { businessIdRef.current = active?.id ?? ""; }, [active?.id]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      tokenRef.current = data.session?.access_token ?? null;
      setToken(tokenRef.current);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token ?? null;
      setToken(tokenRef.current);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("x-business-id", businessIdRef.current);
        if (tokenRef.current) headers.set("Authorization", `Bearer ${tokenRef.current}`);
        return fetch(input, { ...init, headers, body: init?.body });
      },
      body: () => ({ specialist }),
    }),
    onError: (err) => {
      let msg = err.message || "Error al conectar con Nüva Agent. Intenta nuevamente.";
      try { const parsed = JSON.parse(err.message); if (parsed?.error) msg = parsed.error; } catch { /* plain message */ }
      if (/límite.*(diari|starter)/i.test(msg)) setLimitReached(true); else toast.error(msg);
    },
  });
  const loading = status === "submitted" || status === "streaming";

  const suggestions: Record<Specialist, string[]> = {
    orchestrator: ["Analiza la salud de mi negocio", "¿Qué debería mejorar primero?", "¿Por qué cambió mi rentabilidad?", "Dame 3 acciones para este mes"],
    finance: ["¿Cómo está mi flujo de caja?", "¿Qué está afectando mi rentabilidad?", "Analiza mis gastos", "¿Cuánto puedo gastar sin comprometer mi caja?"],
    accounting: ["Revisa mis saldos contables", "Explícame mi resultado", "¿Qué cuentas concentran mis gastos?", "¿Hay algo inconsistente en mis datos?"],
    tax: ["Explícame mi IVA del período", "¿Qué significa mi crédito fiscal?", "Analiza mis datos tributarios", "¿Qué información tributaria me falta?"],
    sales: ["¿Cuál fue mi mejor producto?", "¿Qué clientes generan más ventas?", "Analiza mis ventas", "¿Dónde tengo oportunidades comerciales?"],
    inventory: ["¿Qué productos debería reponer?", "¿Tengo sobrestock?", "Analiza la rotación", "¿Dónde puedo tener quiebres de stock?"],
    crm: ["Analiza mi cartera de clientes", "¿Qué clientes debería reactivar?", "¿Tengo concentración de clientes?", "Dame segmentos accionables"],
    strategy: ["¿Cuál es mi principal problema?", "Dame un plan de acción", "¿Dónde debería enfocar mi capital?", "Analiza mis prioridades"],
  };

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    if (!token) { toast.error("Tu sesión aún se está cargando, intenta de nuevo en un segundo."); return; }
    setLimitReached(false);
    await sendMessage({ text: input });
    setInput("");
  }

  const activeSpecialist = specialists.find((item) => item.id === specialist) ?? specialists[0];

  return (
    <ModuleGuard module="ai">
      <>
        <PageHeader title="Nüva Agent" description="Un agente especializado que entiende tu negocio y conecta sus áreas." />
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="p-3 lg:h-[calc(100dvh-13rem)] lg:overflow-y-auto">
            <div className="mb-3 px-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Especialistas</p>
              <p className="mt-1 text-xs text-muted-foreground">Selecciona un enfoque o deja que Nüva decida.</p>
            </div>
            <div className="space-y-1">
              {specialists.map((item) => {
                const Icon = item.icon;
                const selected = specialist === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSpecialist(item.id)}
                    className={cn("flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all", selected ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent")}
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", selected ? "bg-primary-foreground/15" : "bg-secondary")}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0"><span className="block text-sm font-semibold">{item.label}</span><span className={cn("block truncate text-[11px]", selected ? "text-primary-foreground/75" : "text-muted-foreground")}>{item.description}</span></span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl border bg-secondary/30 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Contexto empresarial</p>
              <p className="mt-1">Nüva Agent utiliza los datos del negocio activo y su memoria de conversación. Cada negocio permanece aislado.</p>
            </div>
          </Card>

          <Card className="flex h-[calc(100dvh-13rem)] flex-col overflow-hidden p-0 md:h-[calc(100vh-12rem)]">
            <div className="flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow"><Sparkles className="h-5 w-5 text-primary-foreground" /></div>
              <div><p className="text-sm font-semibold">{activeSpecialist.label}</p><p className="text-xs text-muted-foreground">{active?.name ?? "Sin negocio seleccionado"}</p></div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
              {messages.length === 0 && (
                <div className="mx-auto max-w-3xl pt-6 md:pt-10">
                  <div className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow"><BrainCircuit className="h-7 w-7 text-primary-foreground" /></div>
                    <h2 className="mt-5 text-2xl font-bold">Tu agente empresarial</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Pregunta, analiza y entiende lo que está pasando en tu negocio. Nüva selecciona el enfoque adecuado o puedes elegir un especialista.</p>
                  </div>
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {suggestions[specialist].map((s) => <button key={s} onClick={() => setInput(s)} className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-left text-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-accent">{s}</button>)}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role !== "user" && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary"><Sparkles className="h-4 w-4 text-primary-foreground" /></div>}
                  <div className={cn("max-w-2xl whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary")}>{m.parts.map((p, i) => p.type === "text" ? <span key={i}>{p.text}</span> : null)}</div>
                </div>
              ))}
              {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Nüva Agent está analizando...</div>}
            </div>
            {limitReached && <div className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-accent/40 px-4 py-3 text-sm"><span>Alcanzaste el límite de IA de tu plan este mes.</span><Link to="/settings" className="shrink-0 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Actualizar plan</Link></div>}
            <form onSubmit={handleSend} className="flex gap-2 border-t bg-background/60 p-3 md:p-4">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={sessionReady ? `Pregunta a ${activeSpecialist.label}...` : "Cargando sesión..."} disabled={loading || !sessionReady || limitReached} className="h-11" />
              <Button type="submit" size="lg" disabled={loading || !sessionReady || !input.trim() || limitReached} className="shadow-elegant"><Send className="h-4 w-4" /></Button>
            </form>
          </Card>
        </div>
      </>
    </ModuleGuard>
  );
}
