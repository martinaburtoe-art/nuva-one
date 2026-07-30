import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { Link } from "@tanstack/react-router";
import { Sparkles, X, Send, Loader2, LogIn, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActiveBusinessId } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { extractChatErrorMessage } from "@/lib/chat-error";

// Same assistant as the in-app AiChatBubble (same /api/chat endpoint, same
// shared ai_conversations/ai_messages memory), but mountable on the public
// marketing site so an existing customer can ask a quick question without
// clicking through into the full dashboard. Gates itself through three
// states first: signed out -> prompt to log in; signed in with no business
// -> prompt to finish onboarding; otherwise -> the actual chat.
export function PublicAiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeId] = useActiveBusinessId();

  // Mirrors ai-chat-bubble.tsx: refs feed a per-request fetch so the
  // Authorization header is never frozen at the pre-login `null` state.
  // `token`/`activeId` state stays for gating the UI (signed_out/no_business/ready).
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

  // Gated on `token` so anonymous landing-page visitors never fire this
  // query -- RLS would return nothing for them anyway, but there's no
  // reason to spend a request on every marketing-page pageview.
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

          {state === "loading" && (
            <div className="flex h-56 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {state === "signed_out" && (
            <div className="flex h-56 flex-col items-center justify-center gap-3 p-6 text-center">
              <LogIn className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Inicia sesión para preguntarle al asistente sobre tu negocio.
              </p>
              <Button asChild size="sm">
                <Link to="/auth">Iniciar sesión</Link>
              </Button>
            </div>
          )}

          {state === "no_business" && (
            <div className="flex h-56 flex-col items-center justify-center gap-3 p-6 text-center">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Crea tu negocio para que el asistente tenga datos que mostrarte.
              </p>
              <Button asChild size="sm">
                <Link to="/onboarding">Crear negocio</Link>
              </Button>
            </div>
          )}

          {state === "ready" && (
            <>
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
