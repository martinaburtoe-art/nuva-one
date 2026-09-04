import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CircleDollarSign,
  ScanLine,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

const scenes = [
  {
    id: "sales",
    eyebrow: "01 · VENTAS",
    title: "La venta ocurre en el negocio.",
    copy: "El movimiento físico se convierte en una operación visible: venta, cliente, ticket y rendimiento en un mismo lugar.",
    icon: TrendingUp,
    action: "Venta registrada",
    result: "+$84.990 · Cliente recurrente",
    insight: "Detecta qué estás vendiendo y quién vuelve.",
  },
  {
    id: "inventory",
    eyebrow: "02 · INVENTARIO + SCANNER",
    title: "El producto entra. Nüva actualiza el stock.",
    copy: "La cámara sigue el producto hasta el scanner. El movimiento llega al inventario y el dato queda disponible para decidir.",
    icon: ScanLine,
    action: "Producto escaneado",
    result: "SKU-1048 · Stock 24 → 25",
    insight: "Sabe qué tienes antes de que falte.",
  },
  {
    id: "finance",
    eyebrow: "03 · FINANZAS",
    title: "La operación se convierte en claridad financiera.",
    copy: "Ingresos y egresos dejan de vivir separados. Nüva conecta la operación con caja, margen y rentabilidad.",
    icon: CircleDollarSign,
    action: "Movimiento conciliado",
    result: "$1,03 M · utilidad estimada",
    insight: "Entiende dónde se está yendo tu dinero.",
  },
  {
    id: "crm",
    eyebrow: "04 · CLIENTES",
    title: "Cada cliente deja una historia.",
    copy: "Cuando vuelve, Nüva reconoce su recorrido: frecuencia, compras y oportunidades de seguimiento.",
    icon: Users,
    action: "Cliente reconocido",
    result: "87 clientes · 12 recurrentes",
    insight: "Convierte compras aisladas en relaciones.",
  },
  {
    id: "ai",
    eyebrow: "05 · NÜVA IA",
    title: "Los datos empiezan a responder.",
    copy: "Pregunta en lenguaje natural. Nüva cruza ventas, inventario, clientes y finanzas para devolverte una acción concreta.",
    icon: Sparkles,
    action: "Pregunta al negocio",
    result: "Reponer 30 unidades del SKU-1048",
    insight: "No necesitas interpretar todo. Pregunta.",
  },
  {
    id: "score",
    eyebrow: "06 · NÜVA SCORE",
    title: "Todo converge en una lectura del negocio.",
    copy: "Las señales se reúnen en una lectura ejecutiva para saber qué está sano, qué necesita atención y dónde actuar primero.",
    icon: Target,
    action: "Salud del negocio",
    result: "Nüva Score · 86 / 100",
    insight: "Una señal para saber dónde mirar.",
  },
  {
    id: "decision",
    eyebrow: "07 · DECISIÓN",
    title: "Dejas de mirar datos. Empiezas a decidir.",
    copy: "La historia termina donde empieza el verdadero valor: una decisión informada y el siguiente movimiento del dueño.",
    icon: Sparkles,
    action: "Siguiente movimiento",
    result: "Reponer · contactar · optimizar",
    insight: "Datos conectados. Decisiones mejores.",
  },
] as const;

type Scene = (typeof scenes)[number];

function StoreVisual({ scene, progress }: { scene: Scene; progress: number }) {
  const Icon = scene.icon;
  const scanner = scene.id === "inventory";
  const ai = scene.id === "ai";
  const score = scene.id === "score";
  const decision = scene.id === "decision";
  const drift = Math.sin(progress * Math.PI) * 18;

  return (
    <div className="relative mx-auto h-[30rem] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#07090d] shadow-[0_35px_120px_rgba(0,0,0,.48)] sm:h-[36rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,hsl(var(--primary)/.18),transparent_27%),radial-gradient(circle_at_86%_70%,hsl(var(--primary)/.12),transparent_31%)]" />
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div
        className="absolute inset-x-0 top-0 h-full transition-transform duration-700 ease-out"
        style={{ transform: `translate3d(${drift * 0.15}px, ${-drift * 0.1}px, 0) scale(${1 + progress * 0.018})` }}
      >
        <div className="absolute left-[4%] top-[13%] h-[55%] w-[42%] rounded-[1.5rem] border border-white/10 bg-white/[.035] p-4 backdrop-blur-[2px] sm:p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 text-[9px] uppercase tracking-[.18em] text-white/35">
            <span>Negocio · 09:42</span><span className="rounded-full border border-white/10 px-2 py-1 tracking-normal">En vivo</span>
          </div>
          <div className="relative mt-5 h-[70%] overflow-hidden rounded-xl border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.06))]">
            <div className="absolute inset-x-5 bottom-5 h-px bg-white/10" />
            <div className="absolute bottom-5 left-[9%] h-[42%] w-[14%] rounded-t-xl border border-white/10 bg-white/[.045]" />
            <div className="absolute bottom-5 left-[28%] h-[65%] w-[17%] rounded-t-xl border border-white/10 bg-white/[.06]" />
            <div className="absolute bottom-5 left-[51%] h-[52%] w-[15%] rounded-t-xl border border-primary/20 bg-primary/[.07]" />
            <div className="absolute bottom-5 right-[9%] h-[73%] w-[17%] rounded-t-xl border border-white/10 bg-white/[.045]" />
            <div className="absolute left-[55%] top-[17%] h-10 w-10 rounded-full border border-white/15 bg-white/[.06]" />
            <div className="absolute left-[50%] top-[33%] h-[40%] w-[20%] rounded-t-[2rem] border border-white/10 bg-white/[.055]" />
            <div className="absolute bottom-0 left-0 h-1/2 w-full bg-[linear-gradient(to_top,rgba(0,0,0,.35),transparent)]" />
            {scanner && <div className="absolute left-[44%] top-[20%] h-[44%] w-[30%] rounded-xl border border-primary/30 bg-primary/[.06] shadow-[0_0_35px_hsl(var(--primary)/.14)]" />}
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[9px] text-white/45 backdrop-blur">
            <span>{scene.action}</span><span className="text-primary">●</span>
          </div>
        </div>
      </div>

      <div
        className="absolute right-[4%] top-[9%] w-[51%] min-w-[17rem] transition-transform duration-700 ease-out"
        style={{ transform: `translate3d(${-drift * 0.18}px, ${drift * 0.12}px, 0) scale(${0.98 + progress * 0.025})` }}
      >
        <div className="rounded-[1.25rem] border border-white/10 bg-[#11141a]/95 p-2 shadow-[0_35px_100px_rgba(0,0,0,.58)] backdrop-blur-xl">
          <div className="flex items-center gap-1.5 px-2 pb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white/20" /><span className="h-1.5 w-1.5 rounded-full bg-white/20" /><span className="h-1.5 w-1.5 rounded-full bg-white/20" />
            <span className="ml-auto text-[8px] text-white/25">nuva.one / {scene.id}</span>
          </div>
          <div className="rounded-[.9rem] border border-white/10 bg-[#0a0c11] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></span><div><p className="text-xs font-semibold text-white">Nüva One</p><p className="text-[8px] text-white/30">Inteligencia conectada</p></div></div>
              <span className="hidden text-[9px] text-white/30 sm:block">Actualizado ahora</span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[.035] p-3"><p className="text-[9px] text-white/30">{scene.action}</p><p className="mt-1 text-sm font-semibold text-white">{scene.result}</p></div>
              <div className="rounded-xl border border-primary/15 bg-primary/[.05] p-3"><p className="text-[9px] text-white/30">Nüva interpreta</p><p className="mt-1 text-sm font-semibold text-primary">{scene.insight}</p></div>
            </div>

            <div className="relative mt-3 h-28 overflow-hidden rounded-xl border border-white/10 bg-white/[.02] p-3">
              {scanner ? (
                <div className="relative flex h-full items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-primary/[.035]">
                  <div className="absolute inset-x-6 top-1/2 h-px bg-primary shadow-[0_0_18px_hsl(var(--primary)/.9)] transition-transform duration-500" style={{ transform: `translateY(${(progress - .5) * 42}px)` }} />
                  <div className="absolute inset-[20%] rounded-lg border border-primary/55" style={{ transform: `scale(${1 + progress * .05})` }} />
                  <ScanLine className="h-7 w-7 text-primary" />
                  <span className="absolute bottom-2 rounded-full bg-black/45 px-2 py-1 text-[8px] text-primary">Código detectado · SKU-1048</span>
                </div>
              ) : ai ? (
                <div className="space-y-2.5">
                  <div className="ml-auto h-5 w-3/5 rounded-full bg-primary/25" />
                  <div className="flex gap-2"><div className="h-8 w-8 shrink-0 rounded-full bg-primary/10" /><div className="h-10 flex-1 rounded-xl border border-white/10 bg-white/[.035]" /></div>
                  <div className="h-2 w-2/5 rounded-full bg-primary/25" />
                </div>
              ) : score ? (
                <div className="flex h-full items-center gap-4">
                  <div className="relative flex h-18 w-18 shrink-0 items-center justify-center rounded-full border-4 border-primary/20 border-t-primary" style={{ transform: `rotate(${progress * 35}deg)` }}><span className="text-lg font-bold text-white" style={{ transform: `rotate(${-progress * 35}deg)` }}>86</span></div>
                  <div className="flex-1 space-y-2"><div className="h-2 w-full rounded-full bg-white/10"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${72 + progress * 14}%` }} /></div><div className="h-2 w-[72%] rounded-full bg-white/10" /><div className="h-2 w-[91%] rounded-full bg-white/10" /></div>
                </div>
              ) : decision ? (
                <div className="flex h-full items-center justify-center gap-2 sm:gap-3">{["Reponer", "Contactar", "Optimizar"].map((item, i) => <div key={item} className="rounded-xl border border-primary/20 bg-primary/[.055] px-3 py-2 text-[9px] font-medium text-white transition-transform duration-500" style={{ transform: `translateY(${Math.sin((progress + i * .18) * Math.PI) * 6}px)` }}>{item}</div>)}</div>
              ) : (
                <div className="flex h-full items-end gap-1.5">{[32,48,41,64,55,72,67,86,78,94].map((height, index) => <div key={index} className="flex-1 rounded-t bg-primary/45 transition-transform duration-500" style={{ height: `${height}%`, transform: `scaleY(${.78 + progress * .2})`, transformOrigin: "bottom" }} />)}</div>
              )}
            </div>
          </div>
        </div>
        <div className="mx-auto h-2 w-[58%] rounded-b-xl bg-white/[.08]" />
      </div>

      <div className="absolute inset-x-[4%] bottom-[6%] flex items-end justify-between gap-5">
        <div className="max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-primary">{scene.eyebrow}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">{scene.title}</h3>
          <p className="mt-3 text-xs leading-relaxed text-white/50 sm:text-sm">{scene.copy}</p>
        </div>
        <div className="hidden rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-right backdrop-blur sm:block"><p className="text-[9px] uppercase tracking-[.18em] text-white/25">Flujo Nüva</p><p className="mt-1 text-xs font-semibold text-white">Acción → contexto → decisión</p></div>
      </div>
    </div>
  );
}

export function NuvaScrollWorld() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const sceneCount = scenes.length;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const travel = Math.max(1, section.offsetHeight - window.innerHeight);
        const progress = Math.min(1, Math.max(0, -rect.top / travel));
        setScrollProgress(progress);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  const { index, local, scene } = useMemo(() => {
    const raw = scrollProgress * sceneCount;
    const index = Math.min(sceneCount - 1, Math.floor(raw));
    return { index, local: raw - index, scene: scenes[index] };
  }, [scrollProgress, sceneCount]);

  return (
    <section ref={sectionRef} className="relative bg-[#06070a] text-white" aria-label="Experiencia cinematográfica de Nüva One">
      <div className="h-[560vh] sm:h-[620vh]">
        <div className="sticky top-0 flex h-screen min-h-[44rem] items-center overflow-hidden py-14 sm:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/.14),transparent_35%)]" />
          <div className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[.025] blur-3xl" />
          <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6">
            <div className="mb-4 flex items-center justify-between gap-4 sm:mb-5"><div className="flex items-center gap-2 text-xs text-white/45"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary"><Sparkles className="h-3.5 w-3.5" /></span><span>Nüva One · Scroll World</span></div><span className="hidden text-[10px] uppercase tracking-[.2em] text-white/25 sm:block">Desplázate para entrar</span></div>
            <div className="mb-4 max-w-3xl sm:mb-5"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-primary">Tu negocio, visto desde dentro</p><h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Del movimiento real a la <span className="text-primary">decisión.</span></h2></div>
            <StoreVisual scene={scene} progress={local} />
            <div className="mt-3 flex items-center justify-between gap-4"><div className="flex gap-1.5" aria-label={`Escena ${index + 1} de ${sceneCount}`}>{scenes.map((item, i) => <span key={item.id} className={`h-1 rounded-full transition-all duration-300 ${i === index ? "w-8 bg-primary" : "w-2 bg-white/15"}`} />)}</div><span className="text-[10px] tabular-nums text-white/30">{String(index + 1).padStart(2, "0")} / {String(sceneCount).padStart(2, "0")}</span></div>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row"><Link to="/auth" search={{ mode: "signup" }} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">Empezar gratis <ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/demo" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[.04] px-6 text-sm font-medium text-white transition-colors hover:bg-white/[.08]">Ver Nüva en acción</Link></div>
          </div>
        </div>
      </div>
    </section>
  );
}
