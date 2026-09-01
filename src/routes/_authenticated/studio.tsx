import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2, Mic2, Play, Send, Sparkles, Video, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-utils";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({ meta: [{ title: "Nüva Studio — Nüva One" }] }),
  component: StudioPage,
});

type Output = { step: number; capability: string; title?: string; summary?: string; text?: string; imageUrl?: string; audioUrl?: string; mediaUrl?: string; instruction?: string; dependsOn?: number[] };

const quickGoals = [
  ["Lanzar una campaña", "Crea una estrategia, mensajes, piezas visuales, video y voz conectados."],
  ["Encontrar oportunidades", "Analiza el negocio y convierte las oportunidades en acciones y contenido."],
  ["Crear contenido", "Construye un paquete reutilizable de copy, imagen, video y locución."],
  ["Construir mi marca", "Define Brand DNA y úsalo como contexto para todas las piezas posteriores."],
];

const capabilityLabel: Record<string, string> = {
  research: "Investigación", strategy: "Estrategia", marketing: "Marketing", copywriting: "Copywriting",
  image: "Imagen", image_edit: "Edición", video: "Video", voice: "Voz", brand: "Brand DNA",
  document: "Documento", automation: "Automatización", chat: "Nüva Agent",
};

function StudioPage() {
  const { active } = useActiveBusiness();
  const [token, setToken] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null)); }, []);

  async function runWorkflow() {
    if (!active?.id || !token || !prompt.trim() || loading) return;
    setLoading(true); setError(null); setOutputs([]);
    try {
      const response = await fetch("/api/studio/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId: active.id, prompt: prompt.trim(), maxSteps: 6 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo ejecutar el flujo de Studio.");
      setGoal(data.goal ?? prompt.trim());
      setOutputs(Array.isArray(data.outputs) ? data.outputs : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error al ejecutar Nüva Studio.");
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Nüva Studio" description="Un motor de creación conectado: una meta, un contexto y un flujo que coordina texto, imagen, video y voz." />

      <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5 p-5 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow"><Sparkles className="h-6 w-6 text-primary-foreground" /></div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Nüva AI Studio</p><h2 className="mt-1 text-2xl font-bold tracking-tight">¿Qué quieres conseguir?</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Nüva crea un plan, conecta cada paso con los resultados anteriores y utiliza el contexto de tu negocio para producir un resultado final coherente.</p></div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void runWorkflow(); }} placeholder="Ej.: Quiero lanzar mi nuevo producto en Chile y crear toda la campaña." className="h-12 bg-background/80" />
          <Button onClick={() => void runWorkflow()} disabled={loading || !prompt.trim() || !active?.id} className="h-12 px-6">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{loading ? "Ejecutando..." : "Crear con Nüva"}</Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickGoals.map(([title, description]) => <button key={title} type="button" onClick={() => setPrompt(title === "Lanzar una campaña" ? "Quiero lanzar un producto y crear toda la campaña conectando estrategia, copy, imagen, video y voz." : title === "Encontrar oportunidades" ? "Analiza mi negocio, encuentra las oportunidades prioritarias y conviértelas en acciones de crecimiento y contenido." : title === "Crear contenido" ? "Crea un paquete de contenido conectado: estrategia, copy, imagen, video y voz." : "Construye mi Brand DNA y úsalo para crear una identidad consistente en mis siguientes piezas.")} className="rounded-2xl border bg-background/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></button>)}
        </div>
      </section>

      {error && <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</section>}

      {outputs.length > 0 && <section className="space-y-4">
        <div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Flujo ejecutado</p><h3 className="mt-1 text-xl font-bold">{goal}</h3></div><span className="text-xs text-muted-foreground">{outputs.length} pasos conectados</span></div>
        <div className="relative space-y-4">
          {outputs.map((output, index) => <article key={`${output.step}-${output.capability}`} className="relative rounded-2xl border bg-card p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{output.step}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold">{capabilityLabel[output.capability] ?? output.capability}</span>{index > 0 && <span className="text-[11px] text-muted-foreground">usa resultados anteriores</span>}</div><h4 className="mt-2 text-base font-semibold">{output.title ?? capabilityLabel[output.capability] ?? output.capability}</h4>{output.summary && <p className="mt-1 text-sm text-muted-foreground">{output.summary}</p>}</div></div>
            {output.text && <div className="mt-5 rounded-xl bg-muted/40 p-4 text-sm leading-7 whitespace-pre-wrap">{output.text}</div>}
            {output.imageUrl && <div className="mt-5 overflow-hidden rounded-2xl border bg-muted"><img src={output.imageUrl} alt="Activo generado por Nüva Studio" className="mx-auto max-h-[640px] w-full object-contain" /></div>}
            {output.audioUrl && <div className="mt-5 rounded-xl border bg-muted p-4"><div className="mb-2 flex items-center gap-2 text-sm font-medium"><Mic2 className="h-4 w-4" /> Locución</div><audio controls className="w-full" src={output.audioUrl}>Tu navegador no puede reproducir este audio.</audio></div>}
            {output.mediaUrl && <div className="mt-5 overflow-hidden rounded-2xl border bg-black"><div className="flex items-center gap-2 px-4 py-3 text-xs text-white"><Video className="h-4 w-4" /> Video generado</div><video controls className="mx-auto max-h-[640px] w-full" src={output.mediaUrl}>Tu navegador no puede reproducir este video.</video></div>}
          </article>)}
        </div>
      </section>}

      {outputs.length === 0 && !loading && <section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border bg-card p-5"><Wand2 className="h-5 w-5" /><p className="mt-4 text-sm font-semibold">Un solo contexto</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Cada paso recibe el negocio, el objetivo y los resultados relevantes de los pasos anteriores.</p></div><div className="rounded-2xl border bg-card p-5"><ImageIcon className="h-5 w-5" /><p className="mt-4 text-sm font-semibold">Multimodal de verdad</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Texto, imagen, video y voz son salidas del mismo flujo, no herramientas aisladas.</p></div><div className="rounded-2xl border bg-card p-5"><Play className="h-5 w-5" /><p className="mt-4 text-sm font-semibold">Resultado reutilizable</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Los assets generados quedan asociados al negocio para utilizarlos en los siguientes pasos.</p></div></section>}
    </div>
  );
}
