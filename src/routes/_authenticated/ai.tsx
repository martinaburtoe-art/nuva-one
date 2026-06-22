import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useActiveBusiness } from "@/lib/use-business";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({ meta: [{ title: "Asistente IA — NovaFlow" }] }),
  component: AiPage,
});

function AiPage() {
  const [input, setInput] = useState("");
  const { active } = useActiveBusiness();
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat", headers: { "x-business-id": active?.id ?? "" } }),
  });
  const loading = status === "submitted" || status === "streaming";

  const suggestions = [
    "¿Cuál fue mi mejor producto del último mes?",
    "¿Cómo está mi flujo de caja?",
    "Sugiéreme un plan de reposición de stock",
    "Redacta un mensaje de bienvenida para clientes nuevos",
  ];

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    await sendMessage({ text: input });
    setInput("");
  }

  return (
    <>
      <PageHeader title="Asistente IA" description="Pregunta cualquier cosa sobre tu negocio" />
      <Card className="flex h-[calc(100vh-12rem)] flex-col p-0 overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl pt-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="mt-6 text-2xl font-bold">¿Cómo te puedo ayudar?</h2>
              <p className="mt-2 text-sm text-muted-foreground">Pregunta sobre ventas, inventario, finanzas o marketing.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => setInput(s)}
                    className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-left text-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-accent">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role !== "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div className={cn(
                "max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
              )}>
                {m.parts.map((p, i) => p.type === "text" ? <span key={i}>{p.text}</span> : null)}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Pensando...
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="flex gap-2 border-t bg-background/60 p-4">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pregunta algo sobre tu negocio..." disabled={loading} className="h-11" />
          <Button type="submit" size="lg" disabled={loading || !input.trim()} className="shadow-elegant">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </>
  );
}
