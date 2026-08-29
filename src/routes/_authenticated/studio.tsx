import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Megaphone,
  Mic2,
  Palette,
  Search,
  Send,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({ meta: [{ title: "Nüva Studio — Nüva One" }] }),
  component: StudioPage,
});

type Capability = "marketing" | "copywriting" | "image" | "video" | "voice" | "research" | "brand" | "strategy";

type StudioResult = {
  text: string;
  imageUrl?: string;
  audioUrl?: string;
};

const actions: Array<{
  id: Capability;
  title: string;
  description: string;
  icon: typeof Sparkles;
  prompt: string;
}> = [
  { id: "marketing", title: "Crear campaña", description: "Estrategia, contenido y CTA", icon: Megaphone, prompt: "Diseña una campaña completa para aumentar mis ventas." },
  { id: "copywriting", title: "Crear contenido", description: "Posts, captions, slogans y guiones", icon: Wand2, prompt: "Crea 5 ideas de contenido para mis redes sociales." },
  { id: "image", title: "Crear imagen", description: "Piezas visuales y producto", icon: ImageIcon, prompt: "Crea una pieza publicitaria profesional para mi negocio." },
  { id: "video", title: "Crear video", description: "Reels, anuncios y guiones", icon: Video, prompt: "Crea un Reel de 30 segundos para promocionar mi negocio." },
  { id: "voice", title: "Crear voz", description: "Locución para contenido", icon: Mic2, prompt: "Escribe una locución comercial de 20 segundos." },
  { id: "research", title: "Investigar", description: "Mercado, tendencias y oportunidades", icon: Search, prompt: "Identifica oportunidades de mercado para mi negocio." },
  { id: "brand", title: "Construir Brand DNA", description: "Tono, identidad y consistencia", icon: Palette, prompt: "Construye una propuesta de Brand DNA para mi negocio." },
  { id: "strategy", title: "Encontrar oportunidades", description: "Prioridades y acciones", icon: Lightbulb, prompt: "Analiza mi negocio y dame las 3 oportunidades más importantes." },
];

function StudioPage() {
  const { active } = useActiveBusiness();
  const [token, setToken] = useState<string | null>(null);
  const [capability, setCapability] = useState<Capability>("marketing");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<StudioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const selected = useMemo(() => actions.find((item) => item.id === capability) ?? actions[0], [capability]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  async function run() {
    if (!active?.id || !token || !prompt.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId: active.id, capability, prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo completar la tarea");
      setResult({
        text: data.result?.text ?? "Tarea completada.",
        imageUrl: data.result?.imageUrl,
        audioUrl: data.result?.audioUrl,
      });
    } catch (error) {
      setResult({ text: error instanceof Error ? error.message : "Ocurrió un error." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Nüva Studio" description="Tu espacio de creación, marketing e inteligencia para hacer crecer el negocio." />

      <section className="rounded-2xl border bg-gradient-to-br from-background via-background to-primary/5 p-5 md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Nüva AI Studio</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Dime qué quieres conseguir.</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Nüva utiliza el contexto de tu empresa para convertir una idea en una acción concreta.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action) => {
            const Icon = action.icon;
            const isSelected = action.id === capability;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  setCapability(action.id);
                  setPrompt(action.prompt);
                }}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary",
                  isSelected && "border-primary bg-primary/5 shadow-sm",
                )}
              >
                <Icon className="h-5 w-5" />
                <p className="mt-3 text-sm font-semibold">{action.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void run();
            }}
            placeholder={`¿Qué quieres crear con ${selected.title.toLowerCase()}?`}
            className="h-12"
          />
          <Button onClick={() => void run()} disabled={loading || !prompt.trim() || !active?.id} className="h-12 px-5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "Creando..." : "Crear"}
          </Button>
        </div>
      </section>

      {result && (
        <section className="rounded-2xl border bg-card p-5 md:p-7">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4" /> Resultado
          </div>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/90">{result.text}</div>
          {result.imageUrl && (
            <div className="mt-5 overflow-hidden rounded-xl border bg-muted">
              <img src={result.imageUrl} alt="Activo generado por Nüva Studio" className="mx-auto max-h-[640px] w-full object-contain" />
            </div>
          )}
          {result.audioUrl && (
            <div className="mt-5 rounded-xl border bg-muted p-4">
              <audio controls className="w-full" src={result.audioUrl}>
                Tu navegador no puede reproducir este audio.
              </audio>
            </div>
          )}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Contexto empresarial", "Nüva trabaja con la información de tu negocio en vez de responder como una IA genérica."],
          ["Smart Routing", "La capa de IA elige proveedor y puede hacer fallback cuando corresponda."],
          ["Biblioteca de activos", "Las imágenes y locuciones se guardan como activos reutilizables del negocio."],
        ].map(([title, description]) => (
          <div key={title} className="rounded-xl border bg-card p-5">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
