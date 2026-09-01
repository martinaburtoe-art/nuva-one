import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Image as ImageIcon, Loader2, Mic2, Play, Send, Sparkles, Video, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-utils";

export const Route = createFileRoute("/_authenticated/studio")({ head: () => ({ meta: [{ title: "Nüva Studio — Nüva One" }] }), component: StudioPage });

type Output = { step: number; capability: string; title?: string; summary?: string; text?: string; imageUrl?: string; audioUrl?: string; mediaUrl?: string; instruction?: string; dependsOn?: number[] };
const quickGoals = [
  ["Lanzar una campaña", "Estrategia, mensajes, piezas visuales, video y voz conectados."],
  ["Encontrar oportunidades", "Analiza el negocio y convierte oportunidades en acciones de crecimiento."],
  ["Crear contenido", "Construye un paquete reutilizable de copy, imagen, video y locución."],
  ["Construir mi marca", "Define Brand DNA y úsalo como contexto para las piezas posteriores."],
];
const capabilityLabel: Record<string, string> = { research: "Investigación", strategy: "Estrategia", marketing: "Marketing", copywriting: "Copywriting", image: "Imagen", image_edit: "Edición", video: "Video", voice: "Voz", brand: "Brand DNA", document: "Documento", automation: "Automatización", chat: "Nüva Agent" };

function inline(value: string): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part.startsWith("`") && part.endsWith("`") ? <code key={index} className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]">{part.slice(1, -1)}</code> : <span key={index}>{part}</span>);
}

function ProfessionalResult({ text }: { text: string }) {
  const lines = text.replaceAll("\\**", "**").split(/\r?\n/).map((line) => line.trimEnd());
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let table: string[][] = [];
  const flushBullets = () => { if (!bullets.length) return; blocks.push(<ul key={`b-${blocks.length}`} className="my-3 list-disc space-y-2 pl-5 text-sm leading-6">{bullets.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>); bullets = []; };
  const flushTable = () => { if (!table.length) return; const rows = table.filter((row) => !row.every((cell) => /^[-: ]+$/.test(cell))); if (!rows.length) { table = []; return; } const [header, ...body] = rows; blocks.push(<div key={`t-${blocks.length}`} className="my-4 overflow-x-auto rounded-xl border bg-background"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-muted/60"><tr>{header.map((cell, i) => <th key={i} className="px-4 py-3 font-semibold">{inline(cell.trim())}</th>)}</tr></thead><tbody>{body.map((row, ri) => <tr key={ri} className="border-t">{row.map((cell, ci) => <td key={ci} className="px-4 py-3 align-top leading-6">{inline(cell.trim())}</td>)}</tr>)}</tbody></table></div>); table = []; };
  lines.forEach((raw, index) => { const line = raw.trim(); if (!line) { flushBullets(); flushTable(); return; } if (line.startsWith("|") && line.endsWith("|")) { flushBullets(); table.push(line.slice(1, -1).split("|").map((cell) => cell.trim())); return; } flushTable(); const bullet = line.match(/^[-*•]\s+(.+)/); if (bullet) { bullets.push(bullet[1]); return; } flushBullets(); const heading = line.match(/^(#{1,3})\s+(.+)/); if (heading) { const level = heading[1].length; blocks.push(<div key={`h-${index}`} className={level === 1 ? "mt-5 text-lg font-bold" : level === 2 ? "mt-5 text-base font-bold" : "mt-4 text-sm font-bold uppercase tracking-wide text-primary"}>{inline(heading[2])}</div>); return; } if (/^---+$/.test(line)) { blocks.push(<div key={`d-${index}`} className="my-4 border-t" />); return; } blocks.push(<p key={`p-${index}`} className="my-2 text-sm leading-7">{inline(line)}</p>); });
  flushBullets(); flushTable(); return <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">{blocks}</div>;
}

function StudioPage() {
  const { active } = useActiveBusiness();
  const [token, setToken] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null)); }, []);
  async function runWorkflow() { if (!active?.id || !token || !prompt.trim() || loading) return; setLoading(true); setError(null); setOutputs([]); try { const response = await fetch("/api/studio/workflow", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ businessId: active.id, prompt: prompt.trim(), maxSteps: 6 }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "No se pudo ejecutar el flujo de Studio."); setGoal(data.goal ?? prompt.trim()); setOutputs(Array.isArray(data.outputs) ? data.outputs : []); } catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error al ejecutar Nüva Studio."); } finally { setLoading(false); } }
  const setQuickPrompt = (title: string) => setPrompt(title === "Lanzar una campaña" ? "Quiero lanzar un producto y crear toda la campaña conectando estrategia, copy, imagen, video y voz." : title === "Encontrar oportunidades" ? "Analiza mi negocio, encuentra las oportunidades prioritarias y conviértelas en acciones de crecimiento y contenido." : title === "Crear contenido" ? "Crea un paquete de contenido conectado: estrategia, copy, imagen, video y voz." : "Construye mi Brand DNA y úsalo para crear una identidad consistente en mis siguientes piezas.");
  return <div className="space-y-6">
    <PageHeader title="Nüva Studio" description="Un director de marketing conectado: una meta, un contexto y un flujo que coordina estrategia, contenido, imagen, video y voz." />
    <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5 p-5 md:p-8">
      <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow"><Sparkles className="h-6 w-6 text-primary-foreground" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Nüva Marketing Director</p><h2 className="mt-1 text-2xl font-bold tracking-tight">¿Qué quieres conseguir?</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Nüva analiza el contexto de tu negocio, construye un plan y conecta cada resultado con el siguiente paso.</p></div></div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void runWorkflow(); }} placeholder="Ej.: Quiero lanzar mi nuevo producto en Chile y crear toda la campaña." className="h-12 bg-background/80" /><Button onClick={() => void runWorkflow()} disabled={loading || !prompt.trim() || !active?.id} className="h-12 px-6">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{loading ? "Ejecutando..." : "Crear con Nüva"}</Button></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{quickGoals.map(([title, description]) => <button key={title} type="button" onClick={() => setQuickPrompt(title)} className="rounded-2xl border bg-background/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></button>)}</div>
    </section>
    {error && <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</section>}
    {outputs.length > 0 && <section className="space-y-4"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Flujo ejecutado</p><h3 className="mt-1 text-xl font-bold">{goal}</h3></div><span className="text-xs text-muted-foreground">{outputs.length} pasos conectados</span></div><div className="space-y-4">{outputs.map((output, index) => <article key={`${output.step}-${output.capability}`} className="rounded-2xl border bg-card p-5 shadow-sm md:p-6"><div className="flex items-start gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{output.step}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold">{capabilityLabel[output.capability] ?? output.capability}</span>{index > 0 && <span className="text-[11px] text-muted-foreground">contexto heredado del flujo</span>}</div><h4 className="mt-2 text-base font-semibold">{output.title ?? capabilityLabel[output.capability] ?? output.capability}</h4>{output.summary && <p className="mt-1 text-sm text-muted-foreground">{output.summary}</p>}</div></div>{output.text && <div className="mt-5"><ProfessionalResult text={output.text} /></div>}{output.imageUrl && <div className="mt-5 overflow-hidden rounded-2xl border bg-muted"><img src={output.imageUrl} alt="Activo generado por Nüva Studio" className="mx-auto max-h-[640px] w-full object-contain" /></div>}{output.audioUrl && <div className="mt-5 rounded-xl border bg-muted p-4"><div className="mb-2 flex items-center gap-2 text-sm font-medium"><Mic2 className="h-4 w-4" /> Locución</div><audio controls className="w-full" src={output.audioUrl}>Tu navegador no puede reproducir este audio.</audio></div>}{output.mediaUrl && <div className="mt-5 overflow-hidden rounded-2xl border bg-black"><div className="flex items-center gap-2 px-4 py-3 text-xs text-white"><Video className="h-4 w-4" /> Video generado</div><video controls className="mx-auto max-h-[640px] w-full" src={output.mediaUrl}>Tu navegador no puede reproducir este video.</video></div>}</article>)}</div></section>}
    {outputs.length === 0 && !loading && <section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border bg-card p-5"><Wand2 className="h-5 w-5" /><p className="mt-4 text-sm font-semibold">Un solo contexto</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Cada paso recibe el negocio, el objetivo y los resultados relevantes de los pasos anteriores.</p></div><div className="rounded-2xl border bg-card p-5"><ImageIcon className="h-5 w-5" /><p className="mt-4 text-sm font-semibold">Multimodal de verdad</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Texto, imagen, video y voz son salidas del mismo flujo, no herramientas aisladas.</p></div><div className="rounded-2xl border bg-card p-5"><Play className="h-5 w-5" /><p className="mt-4 text-sm font-semibold">Resultado reutilizable</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Los assets generados quedan asociados al negocio para utilizarlos en los siguientes pasos.</p></div></section>}
  </div>;
}
