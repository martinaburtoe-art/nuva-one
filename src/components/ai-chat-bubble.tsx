import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActiveBusiness } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { extractChatErrorMessage } from "@/lib/chat-error";

// Holder de módulo para auth/negocio: react-hooks/refs prohíbe leer refs en
// closures creadas durante el render (como el `fetch` del transporte). Este
// objeto se escribe solo desde efectos y callbacks, y el fetch lo lee por
// petición, preservando el comportamiento original de los refs.
const chatAuth: { businessId: string; token: string | null } = {
  businessId: "",
  token: null,
};

function createAuthedTransport() {
  return new DefaultChatTransport({
    api: "/api/chat",
    fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set("x-business-id", chatAuth.businessId);
      if (chatAuth.token) headers.set("Authorization", `Bearer ${chatAuth.token}`);
      return fetch(input, { ...init, headers });
    },
  });
}

export function AiChatBubble() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { active } = useActiveBusiness();

  // Read auth/business via a module-level holder + a custom fetch
  // (evaluated per-request) instead of a static headers object -- useChat
  // only captures `transport` on its first render, so a plain headers object
  // freezes in the pre-login `token === null` state forever, sending every
  // request with no Authorization header and failing with "No autenticado".
  useEffect(() => {
    chatAuth.businessId = active?.id ?? "";
  }, [active?.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      chatAuth.token = data.session?.access_token ?? null;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      chatAuth.token = session?.access_token ?? null;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { messages, sendMessage, status } = useChat({
    transport: createAuthedTransport(),
    onError: (err) => {
      toast.error(extractChatErrorMessage(err.message));
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Belt-and-suspenders: re-check the session right before sending instead
    // of only trusting the mount-time effect. Closes the one real gap in the
    // module-holder approach -- a token that expired or hadn't loaded yet by
    // the time the user hit send -- so this request is never fired with a
    // missing Authorization header (which is what "No autenticado" means).
    if (!chatAuth.token) {
      const { data } = await supabase.auth.getSession();
      chatAuth.token = data.session?.access_token ?? null;
      if (!chatAuth.token) {
        toast.error("Tu sesión expiró. Vuelve a iniciar sesión para usar el asistente.");
        return;
      }
    }

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
