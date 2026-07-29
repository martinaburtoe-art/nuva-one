import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActiveBusiness } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AiChatBubble() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { active } = useActiveBusiness();

  // Read auth/business via refs + a custom fetch (evaluated per-request)
  // instead of a static headers object -- useChat only captures `transport`
  // on its first render, so a plain headers object freezes in the
  // pre-login `token === null` state forever, sending every request with
  // no Authorization header and failing with "No autenticado".
  const tokenRef = useRef<string | null>(null);
  const businessIdRef = useRef<string>("");
  useEffect(() => {
    businessIdRef.current = active?.id ?? "";
  }, [active?.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      tokenRef.current = data.session?.access_token ?? null;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token ?? null;
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
        return fetch(input, { ...init, headers });
      },
    }),
    onError: (err) => {
      let msg = err.message || "Error al conectar con el asistente. Intenta nuevamente.";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.error) msg = parsed.error;
      } catch {
        // err.message wasn't JSON -- use it as-is
      }
      toast.error(msg);
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
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-elegant transition-all hover:scale-105 hover:shadow-glow"
        aria-label="Asistente IA"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-[360px] origin-bottom-right transition-all duration-200",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="rounded-2xl border bg-card shadow-elegant">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold">Asistente Nüva One</div>
              <div className="text-xs text-muted-foreground">Pregunta sobre tu negocio</div>
            </div>
          </div>

          <div className="h-80 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Prueba con:</p>
                {[
                  "¿Cómo va mi flujo de caja?",
                  "¿Cuáles son mis productos top?",
                  "Sugiéreme una acción para hoy",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="block w-full rounded-lg border border-border/60 bg-secondary/40 p-2 text-left text-xs transition-colors hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}
                >
                  {m.parts.map((p, i) =>
                    p.type === "text" ? <span key={i}>{p.text}</span> : null,
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Pensando...
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2 border-t p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta..."
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
