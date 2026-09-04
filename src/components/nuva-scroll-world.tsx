import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, CircleDollarSign, ScanLine, Sparkles, Target, TrendingUp, Users } from "lucide-react";

const scenes = [
  {
    id: "sales",
    eyebrow: "01 · VENTAS",
    title: "La venta ocurre en el negocio.",
    copy: "Nüva convierte cada operación en información útil, sin obligarte a trabajar en varias herramientas.",
    icon: TrendingUp,
    action: "Venta registrada",
    result: "+$84.990 · Cliente recurrente",
  },
  {
    id: "inventory",
    eyebrow: "02 · INVENTARIO + SCANNER",
    title: "El producto entra. Nüva actualiza el stock.",
    copy: "Escanea un producto y lleva el movimiento directamente al inventario, con trazabilidad y contexto.",
    icon: ScanLine,
    action: "Producto escaneado",
    result: "SKU-1048 · Stock 24 → 25",
  },
  {
    id: "finance",
    eyebrow: "03 · FINANZAS",
    title: "La operación se convierte en claridad financiera.",
    copy: "Ventas y egresos alimentan una visión que te permite entender caja, margen y rentabilidad.",
    icon: CircleDollarSign,
    action: "Movimiento conciliado",
    result: "$1,03 M · utilidad estimada",
  },
  {
    id: "crm",
    eyebrow: "04 · CLIENTES",
    title: "Cada cliente deja una historia.",
    copy: "Nüva conecta compras e interacciones para que el vendedor sepa a quién tiene delante.",
    icon: Users,
    action: "Cliente reconocido",
    result: "87 clientes · 12 recurrentes",
  },
  {
    id: "ai",
    eyebrow: "05 · NÜVA IA",
    title: "Los datos empiezan a responder.",
    copy: "Nüva Copilot cruza el contexto del negocio y responde preguntas con información accionable.",
    icon: Sparkles,
    action: "Pregunta al negocio",
    result: "Reponer 30 unidades del SKU-1048",
  },
  {
    id: "score",
    eyebrow: "06 · NÜVA SCORE",
    title: "Todo converge en una lectura del negocio.",
    copy: "Ventas, inventario, finanzas y clientes se convierten en una señal ejecutiva para saber dónde mirar.",
    icon: Target,
    action: "Salud del negocio",
    result: "Nüva Score · 86 / 100",
  },
  {
    id: "decision",
    eyebrow: "07 · DECISIÓN",
    title: "Dejas de mirar datos. Empiezas a decidir.",
    copy: "Ese es el propósito de Nüva One: conectar lo que pasa en tu negocio con lo que debes hacer después.",
    icon: Sparkles,
    action: "Siguiente movimiento",
    result: "Reponer · contactar · optimizar",
  },
] as const;

type Scene = (typeof scenes)[number];

function StoreScene({ scene, progress }: { scene: Scene; progress: number }) {
  const Icon = scene.icon;
  const isScanner = scene.id === "inventory";
  const isAi = scene.id === "ai";
  const isScore = scene.id === "score";

  return (
    <div className="relative mx-auto h-[31rem] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#090b10] shadow-2xl sm:h-[37rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,hsl(var(--primary)/.18),transparent_28%),radial-gradient(circle_at_82%_74%,hsl(var(--primary)/.10),transparent_30%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(255,255,255,.055),transparent)]" />

      <div className="absolute left-[5%] top-[16%] h-[54%] w-[41%] min-w-[15rem] rounded-[1.4rem] border border-white/10 bg-white/[.035] p-4 backdrop-blur-sm sm:p-6" style={{ transform: `translate3d(${progress * -8}px, ${progress * 5}px, 0)` }}>
        <div className="flex items-center justify-between border-b border-white/10 pb-3 text-[10px] text-white/45">
          <span>TIENDA · 09:42</span><span className="rounded-full border border-white/10 px-2 py-1">EN VIVO</span>
        </div>
        <div className="mt-5 flex h-[72%] items-end gap-3">
          <div className="h-[70%] w-[18%] rounded-t-2xl border border-white/10 bg-white/[.04]" />
          <div className="h-[92%] w-[22%] rounded-t-2xl border border-white/10 bg-white/[.055]" />
          <div className="h-[58%] w-[19%] rounded-t-2xl border border-white/10 bg-white/[.035]" />
          <div className="relative h-[82%] w-[24%] rounded-t-2xl border border-primary/20 bg-primary/[.08]">
            <div className="absolute left-1/2 top-[18%] h-12 w-12 -translate-x-1/2 rounded-full border border-white/15 bg-white/[.06]" />
            <div className="absolute bottom-[12%] left-1/2 h-24 w-20 -translate-x-1/2 rounded-t-[2rem] border border-white/10 bg-white/[.055]" />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[10px] text-white/55">
          <span>{scene.action}</span><span className="text-primary">●</span>
        </div>
      </div>

      <div className="absolute right-[5%] top-[11%] w-[48%] min-w-[17rem]" style={{ transform: `translate3d(${progress * 10}px, ${progress * -4}px, 0)` }}>
        <div className="rounded-[1.2rem] border border-white/10 bg-[#11141a] p-2 shadow-[0_30px_100px_rgba(0,0,0,.45)]">
          <div className="flex items-center gap-1.5 px-2 pb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white/20" /><span className="h-1.5 w-1.5 rounded-full bg-white/20" /><span className="h-1.5 w-1.5 rounded-full bg-white/20" />
            <span className="ml-auto text-[8px] text-white/30">nuva.one / {scene.id}</span>
          </div>
          <div className="rounded-[.85rem] border border-white/10 bg-[#0b0d12] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><span className="text-xs font-semibold text-white">Nüva One</span></div>
              <span className="text-[9px] text-white/35">Datos conectados</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[.035] p-3"><p className="text-[9px] text-white/35">{scene.action}</p><p className="mt-1 text-sm font-semibold text-white">{scene.result}</p></div>
              <div className="rounded-xl border border-primary/15 bg-primary/[.055] p-3"><p className="text-[9px] text-white/35">Nüva interpreta</p><p className="mt-1 text-sm font-semibold text-primary">Acción recomendada</p></div>
            </div>
            <div className="mt-3 h-24 rounded-xl border border-white/10 bg-white/[.02] p-3">
              {isScanner ? <div className="relative flex h-full items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-primary/[.035]"><div className="absolute inset-x-5 top-1/2 h-px bg-primary shadow-[0_0_18px_hsl(var(--primary))] animate-scan-line" /><div className="absolute inset-[22%] rounded-lg border border-primary/60 animate-pulse" /><ScanLine className="h-7 w-7 text-primary" /></div> : isAi ? <div className="space-y-2"><div className="ml-auto h-5 w-3/5 rounded-full bg-primary/30" /><div className="h-10 w-4/5 rounded-xl border border-white/10 bg-white/[.035]" /><div className="h-2 w-2/5 rounded-full bg-primary/25" /></div> : isScore ? <div className="flex items-center gap-4"><div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-primary/25 border-t-primary"><span className="text-lg font-bold text-white">86</span></div><div className="flex-1 space-y-2"><div className="h-2 w-full rounded-full bg-white/10"><div className="h-full w-[86%] rounded-full bg-primary" /></div><div className="h-2 w-[72%] rounded-full bg-white/10" /><div className="h-2 w-[91%] rounded-full bg-white/10" /></div></div> : <div className="flex h-full items-end gap-1.5">{[32,48,41,64,55,72,67,86,78,94].map((height, index) => <div key={index} className="flex-1 rounded-t bg-primary/45" style={{ height: `${height}%`, transform: `scaleY(${0.75 + progress * 0.15})`, transformOrigin: "bottom" }} />)}</div>}
            </div>
          </div>
        </div>
        <div className="mx-auto h-2 w-[58%] rounded-b-xl bg-white/[.08]" />
      </div>

      <div className="absolute bottom-[8%] left-[5%] right-[5%] flex items-end justify-between gap-5">
        <div className="max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-primary">{scene.eyebrow}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">{scene.title}</h3>
          <p className="mt-3 max-w-lg text-xs leading-relaxed text-white/50 sm:text-sm">{scene.copy}</p>
        </div>
        <div className="hidden rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right backdrop-blur sm:block">
          <p className="text-[9px] uppercase tracking-[.18em] text-white/30">Nüva conecta</p>
          <p className="mt-1 text-xs font-semibold text-white">Acción → datos → decisión</p>
        </div>
      </div>
    </div>
  );
}

export function NuvaScrollWorld() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const sceneCount = scenes.length;

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const progress = max > 0 ? window.scrollY / max : 0;
        setScrollProgress(Math.min(1, Math.max(0, progress)));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  const { index, local, scene } = useMemo(() => {
    const raw = scrollProgress * (sceneCount - 0.001);
    const index = Math.min(sceneCount - 1, Math.floor(raw));
    return { index, local: raw - index, scene: scenes[index] };
  }, [scrollProgress, sceneCount]);

  return (
    <section className="relative bg-[#06070a] text-white" aria-label="Experiencia Nüva One">
      <div className="h-[430vh] sm:h-[500vh]">
        <div className="sticky top-0 flex h-screen min-h-[42rem] items-center overflow-hidden py-16 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/.13),transparent_35%)]" />
          <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6">
            <div className="mb-5 flex items-center justify-between gap-4 sm:mb-7">
              <div className="flex items-center gap-2 text-xs text-white/45"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary"><Sparkles className="h-3.5 w-3.5" /></span><span>Nüva One · Scroll World</span></div>
              <div className="hidden text-[10px] uppercase tracking-[.2em] text-white/25 sm:block">Desplázate para entrar</div>
            </div>
            <div className="mb-5 max-w-3xl sm:mb-7"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-primary">Tu negocio, visto desde dentro</p><h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Del movimiento real a la <span className="text-primary">decisión.</span></h2></div>
            <StoreScene scene={scene} progress={local} />
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex gap-1.5" aria-label={`Escena ${index + 1} de ${sceneCount}`}>{scenes.map((item, i) => <span key={item.id} className={`h-1 rounded-full transition-all duration-300 ${i === index ? "w-8 bg-primary" : "w-2 bg-white/15"}`} />)}</div>
              <span className="text-[10px] tabular-nums text-white/30">{String(index + 1).padStart(2, "0")} / {String(sceneCount).padStart(2, "0")}</span>
            </div>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row"><Link to="/auth" search={{ mode: "signup" }} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">Empezar gratis <ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/demo" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[.04] px-6 text-sm font-medium text-white transition-colors hover:bg-white/[.08]">Ver Nüva en acción</Link></div>
          </div>
        </div>
      </div>
    </section>
  );
}
