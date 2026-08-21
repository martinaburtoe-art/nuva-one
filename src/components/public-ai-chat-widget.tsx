import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { Link } from "@tanstack/react-router";
import { Sparkles, X, Send, Loader2, LogIn, Building2, ArrowRight, MessageCircle, Gauge, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActiveBusinessId } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { extractChatErrorMessage } from "@/lib/chat-error";

// Public marketing-site assistant. It shares the authenticated /api/chat
// context with the in-app assistant, while keeping anonymous visitors in a
// lightweight explanatory state instead of firing business queries.
export function PublicAiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeId] = useActiveBusinessId();

  const tokenRef = useRef<string | null>(null);
  const businessIdRef = useRef<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      tokenRef.current = data.session?.access_token ?? null;
      setToken(tokenRef.current);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token ?? null;
      setToken(tokenRef.current);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ["businesses", "public-widget"],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const active = businesses?.find((b) => b.id === activeId) ?? businesses?.[0] ?? null;

  useEffect(() => {
    businessIdRef.current = active?.id ?? "";
  }, [active?.id]);

  const state: "loading" | "signed_out" | "no_business" | "ready" = !authChecked
    ? "loading"
    : !token
      ? "signed_out"
      : businessesLoading
        ? "loading"
        : active
          ? "ready"
          : "no_business";

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("x-business-id", businessIdRef.current);
        if (tokenRef.current) headers.set("Authorization", `Bearer ${tokenRef.current}`);
        return fetch(input, { ...init, headers });
      },
    }),
    onError: (err) => {
      toast.error(extractChatErrorMessage(err.message));
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await sendMessage({ text: input });
    setInput("");
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-elegant transition-[transform,box-shadow] duration-300 hover:scale-105 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:bottom-6 sm:right-6",
          open && "rotate-90",
        )}
        aria-label={open ? "Cerrar asistente Nüva" : "Abrir asistente Nüva"}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {!open && (
        <div className="fixed bottom-[4.6rem] right-5 z-40 hidden max-w-[230px] animate-fade-in-up sm:block">
          <div className="rounded-2xl border border-primary/15 bg-card/95 px-3 py-2.5 text-xs shadow-elegant backdrop-blur-xl">
            <div className="flex items-center gap-2 font-semibold"><MessageCircle className="h-3.5 w-3.5 text-primary" /> Conoce la inteligencia de Nüva</div>
            <p className="mt-1 leading-relaxed text-muted-foreground">Pregúntale sobre tu negocio o mira cómo funciona en la demo.</p>
          </div>
        </div>
      )}

      <div
        className={cn(
          "fixed bottom-[4.75rem] right-3 z-50 w-[calc(100vw-1.5rem)] max-w-[390px] origin-bottom-right transition-[transform,opacity] duration-300 sm:bottom-24 sm:right-6",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="overflow-hidden rounded-3xl border border-primary/15 bg-card/95 shadow-[0_25px_80px_-25px_hsl(var(--primary)/.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-primary/10 via-background to-background px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary shadow-glow"><Sparkles className="h-4 w-4 text-primary-foreground" /><span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" /></div>
              <div>
                <div className="text-sm font-semibold">Asistente Nüva One</div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Tu negocio, en contexto</div>
              </div>
            </div>
            <Link to="/demo" className="hidden items-center gap-1 text-[11px] font-semibold text-primary sm:inline-flex">Ver demo <ArrowRight className="h-3 w-3" /></Link>
          </div>

          {state === "loading" && (
            <div className="min-h-56 space-y-4 p-5">
              <div className="rounded-2xl border bg-secondary/30 p-4">
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Nüva está preparando tu experiencia</p></div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Mientras conectamos tu sesión, descubre qué puedes preguntarle a Nüva.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border bg-background/70 p-3"><Gauge className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-semibold">Nüva Score</p><p className="mt-1 text-[11px] text-muted-foreground">Entiende la salud de tu negocio.</p></div>
                <div className="rounded-xl border bg-background/70 p-3"><Target className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-semibold">Nüva Radar</p><p className="mt-1 text-[11px] text-muted-foreground">Detecta señales y oportunidades.</p></div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Conectando...</div>
            </div>
          )}

          {state === "signed_out" && (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><LogIn className="h-6 w-6 text-primary" /></div>
              <div><p className="text-sm font-semibold">Conoce el asistente de Nüva</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Inicia sesión para hacer preguntas sobre tu negocio y trabajar con el contexto de tus datos.</p></div>
              <Button asChild size="sm" className="mt-1"><Link to="/auth">Iniciar sesión <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
              <Link to="/demo" className="text-xs font-semibold text-primary hover:underline">Prefiero ver la demo primero</Link>
            </div>
          )}

          {state === "no_business" && (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><Building2 className="h-6 w-6 text-primary" /></div>
              <div><p className="text-sm font-semibold">Primero conecta tu negocio</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Crea tu empresa para que Nüva pueda utilizar su contexto y ayudarte con preguntas concretas.</p></div>
              <Button asChild size="sm"><Link to="/onboarding">Crear negocio <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
            </div>
          )}

          {state === "ready" && (
            <>
              <div className="h-72 space-y-3 overflow-y-auto p-4 sm:h-80 sm:p-5">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-secondary/45 p-3.5"><p className="text-sm font-semibold">Tu negocio. Tus preguntas. Nüva.</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Empieza con una pregunta y convierte tus datos en una decisión.</p></div>
                    <div className="space-y-2">
                      {["¿Cómo va mi flujo de caja?", "¿Cuáles son mis productos top?", "Sugiéreme una acción para hoy"].map((s) => (
                        <button key={s} onClick={() => setInput(s)} className="block w-full rounded-xl border border-border/60 bg-background/70 p-2.5 text-left text-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5">{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
                      {m.parts.map((p, i) => p.type === "text" ? <span key={i}>{p.text}</span> : null)}
                    </div>
                  </div>
                ))}
                {isLoading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Pensando...</div>}
              </div>

              <form onSubmit={handleSend} className="flex gap-2 border-t bg-background/60 p-3">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pregúntale algo a Nüva..." disabled={isLoading} className="rounded-xl" />
                <Button type="submit" size="icon" className="shrink-0 rounded-xl" disabled={isLoading || !input.trim()} aria-label="Enviar pregunta"><Send className="h-4 w-4" /></Button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
