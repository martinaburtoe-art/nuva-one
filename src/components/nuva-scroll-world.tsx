import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

type Scene = {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  action: string;
  result: string;
  insight: string;
  icon: typeof TrendingUp;
  z: number;
};

const scenes: Scene[] = [
  { id: "business", eyebrow: "01 · EL NEGOCIO", title: "Todo empieza en el mundo real.", copy: "Una tienda, un vendedor, un cliente y productos que se mueven. Nüva nace de lo que realmente ocurre en tu negocio.", action: "Movimiento detectado", result: "Cliente + producto + venta", insight: "El contexto importa.", icon: TrendingUp, z: 0 },
  { id: "sales", eyebrow: "02 · VENTAS", title: "La venta ocurre. Nüva la convierte en contexto.", copy: "La cámara sigue la operación hasta el computador y entra en la misma pantalla donde el vendedor registra la venta.", action: "Venta registrada", result: "+$84.990 · Cliente recurrente", insight: "Detecta qué vendes y quién vuelve.", icon: TrendingUp, z: 1 },
  { id: "inventory", eyebrow: "03 · INVENTARIO + SCANNER", title: "El producto entra. El scanner lo reconoce.", copy: "La cámara sigue el producto, atraviesa el scanner y aterriza en el inventario. El stock cambia como consecuencia de la acción.", action: "Producto escaneado", result: "SKU-1048 · Stock 24 → 25", insight: "Sabe qué tienes antes de que falte.", icon: ScanLine, z: 2 },
  { id: "finance", eyebrow: "04 · FINANZAS", title: "La misma operación se vuelve claridad financiera.", copy: "El ticket de la escena anterior alimenta ingresos, egresos y flujo de caja. Un dato, múltiples decisiones.", action: "Movimiento conciliado", result: "$1,03 M · utilidad estimada", insight: "Entiende dónde se va tu dinero.", icon: CircleDollarSign, z: 3 },
  { id: "crm", eyebrow: "05 · CLIENTES", title: "El cliente vuelve. Nüva ya conoce la historia.", copy: "La cámara vuelve al local y encuentra al mismo cliente. Su historial y frecuencia aparecen sin romper la continuidad.", action: "Cliente reconocido", result: "87 clientes · 12 recurrentes", insight: "Compras aisladas → relaciones.", icon: Users, z: 4 },
  { id: "ai", eyebrow: "06 · NÜVA IA", title: "Ahora puedes preguntarle al negocio.", copy: "Nüva cruza las señales que acabamos de recorrer: ventas, inventario, clientes y finanzas.", action: "Pregunta al negocio", result: "Reponer 30 unidades del SKU-1048", insight: "No interpretes todo. Pregunta.", icon: Sparkles, z: 5 },
  { id: "score", eyebrow: "07 · NÜVA SCORE", title: "Todo converge en una lectura.", copy: "La cámara sale de la interfaz y vuelve a elevarse sobre el negocio. Las señales se reúnen en una sola lectura ejecutiva.", action: "Salud del negocio", result: "Nüva Score · 86 / 100", insight: "Una señal para saber dónde mirar.", icon: Target, z: 6 },
  { id: "decision", eyebrow: "08 · DECISIÓN", title: "La inteligencia termina donde empezó: en una acción.", copy: "El dueño vuelve al mundo físico con una decisión concreta: reponer, contactar u optimizar.", action: "Siguiente movimiento", result: "Reponer · contactar · optimizar", insight: "Datos conectados. Decisiones mejores.", icon: Sparkles, z: 7 },
];

const WORLD_DEPTH = 4200;
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

function WorldLighting({ progress }: { progress: number }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,hsl(var(--primary)/.16),transparent_34%),linear-gradient(180deg,#10141b,#050609_70%)]" />
      <div className="pointer-events-none absolute -left-[12%] top-[12%] h-[28rem] w-[28rem] rounded-full bg-primary/[.055] blur-3xl" style={{ transform: `translate3d(${progress * 90}px,${progress * -40}px,0)` }} />
      <div className="pointer-events-none absolute -right-[14%] bottom-[4%] h-[24rem] w-[24rem] rounded-full bg-primary/[.04] blur-3xl" style={{ transform: `translate3d(${progress * -70}px,${progress * 30}px,0)` }} />
      <div className="pointer-events-none absolute inset-0 opacity-[.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,.5)_100%)]" />
    </>
  );
}

function StoreScene({ phase, active }: { phase: number; active: boolean }) {
  const personX = 44 + Math.sin(phase * Math.PI) * 12;
  const productX = 31 + Math.sin(phase * Math.PI * 1.4) * 8;
  const scannerX = 60 + Math.sin(phase * Math.PI) * 5;
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0e13]">
      <div className="absolute inset-x-[7%] top-[8%] h-[7%] rounded-full border border-white/10 bg-white/[.025]" />
      <div className="absolute bottom-[10%] left-[7%] right-[7%] h-px bg-white/15" />
      <div className="absolute bottom-[10%] left-[12%] h-[48%] w-[17%] rounded-t-2xl border border-white/10 bg-white/[.045]" />
      <div className="absolute bottom-[10%] left-[34%] h-[61%] w-[18%] rounded-t-2xl border border-primary/20 bg-primary/[.045]" />
      <div className="absolute bottom-[10%] right-[10%] h-[55%] w-[19%] rounded-t-2xl border border-white/10 bg-white/[.04]" />
      <div className="absolute bottom-[10%] left-[51%] h-[18%] w-[23%] rounded-xl border border-white/10 bg-white/[.055]" />
      <div className="absolute bottom-[28%] h-9 w-9 rounded-full border border-white/20 bg-white/[.09] transition-transform duration-300" style={{ left: `${personX}%` }} />
      <div className="absolute bottom-[10%] h-[20%] w-[12%] rounded-t-[2rem] border border-white/15 bg-white/[.075] transition-transform duration-300" style={{ left: `${personX - 2}%` }} />
      <div className="absolute bottom-[30%] h-9 w-12 rounded-md border border-primary/35 bg-primary/[.08] shadow-[0_0_28px_hsl(var(--primary)/.16)] transition-transform duration-300" style={{ left: `${productX}%` }} />
      <div className="absolute bottom-[25%] h-16 w-12 rounded-lg border border-white/15 bg-[#11161e] transition-transform duration-300" style={{ left: `${scannerX}%` }}>
        <div className="absolute inset-x-1 top-3 h-px bg-primary shadow-[0_0_12px_hsl(var(--primary)/.9)]" />
      </div>
      <div className="absolute left-[8%] top-[12%] text-[9px] uppercase tracking-[.22em] text-white/30">Negocio · en vivo</div>
      {active && <div className="absolute bottom-[17%] left-[26%] rounded-full border border-primary/30 bg-primary/[.08] px-3 py-1 text-[9px] text-primary">acción → dato</div>}
    </div>
  );
}

function NuvаScreen({ scene, phase }: { scene: Scene; phase: number }) {
  const scanner = scene.id === "inventory";
  const ai = scene.id === "ai";
  const score = scene.id === "score";
  const finance = scene.id === "finance";
  const crm = scene.id === "crm";
  const sales = scene.id === "sales";
  const updated = phase > 0.72;
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.7rem] border border-white/15 bg-[#090b10] shadow-[0_45px_120px_rgba(0,0,0,.65)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/.12),transparent_42%)]" />
      <div className="relative flex h-full flex-col p-4 sm:p-7">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><scene.icon className="h-4 w-4 text-primary" /></span><div><p className="text-xs font-semibold text-white">Nüva One</p><p className="text-[8px] text-white/30">Inteligencia conectada</p></div></div>
          <span className="text-[8px] text-primary">nuva.one</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[.035] p-3"><p className="text-[8px] text-white/30">{scene.action}</p><p className="mt-1 text-xs font-semibold text-white sm:text-sm">{scene.result}</p></div>
          <div className="rounded-xl border border-primary/15 bg-primary/[.05] p-3"><p className="text-[8px] text-white/30">Nüva interpreta</p><p className="mt-1 text-xs font-semibold text-primary sm:text-sm">{scene.insight}</p></div>
        </div>
        <div className="relative mt-3 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/[.018] p-3">
          {scanner && <div className="relative flex h-full items-center justify-center rounded-lg border border-primary/20 bg-primary/[.025]"><div className="absolute inset-x-8 h-px bg-primary shadow-[0_0_20px_hsl(var(--primary)/.9)]" style={{ top: `${12 + phase * 76}%` }} /><div className="absolute inset-[18%] rounded-xl border border-primary/45" /><ScanLine className="h-8 w-8 text-primary" style={{ opacity: updated ? .35 : 1 }} /><span className="absolute bottom-3 rounded-full bg-black/60 px-3 py-1 text-[8px] text-primary">{updated ? "✓ Código detectado · Stock actualizado" : "Escaneando · SKU-1048"}</span></div>}
          {ai && <div className="space-y-3"><div className="ml-auto max-w-[70%] rounded-xl bg-primary/15 p-3 text-[9px] text-white">¿Qué debería hacer esta semana para mejorar mis ventas?</div><div className="rounded-xl border border-white/10 bg-white/[.035] p-3 text-[9px] leading-relaxed text-white/65"><span className="text-primary">Nüva IA</span><br />Cruzo ventas + inventario + clientes + finanzas.<br /><strong className="text-white">Reponer 30 unidades del SKU-1048.</strong></div></div>}
          {score && <div className="flex h-full flex-col items-center justify-center"><div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-primary/15 border-t-primary" style={{ transform: `rotate(${phase * 32}deg)` }}><span className="text-4xl font-bold text-white" style={{ transform: `rotate(${-phase * 32}deg)` }}>{Math.round(72 + phase * 14)}</span></div><span className="mt-4 text-[9px] uppercase tracking-[.2em] text-white/40">Nüva Score · salud del negocio</span></div>}
          {finance && <div className="flex h-full items-end gap-3">{[46,65,54,78,62,88,72].map((height, i) => <div key={i} className="flex-1 rounded-t bg-primary/35" style={{ height: `${height + phase * 7}%` }} />)}</div>}
          {crm && <div className="space-y-3">{[78,52,91].map((width, i) => <div key={i} className="flex items-center gap-3"><div className="h-9 w-9 rounded-full border border-white/10 bg-primary/10" /><div className="flex-1"><div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-primary/50" style={{ width: `${width}%` }} /></div><p className="mt-1 text-[8px] text-white/25">Historial · frecuencia · seguimiento</p></div></div>)}</div>}
          {sales && <div className="flex h-full items-end gap-2">{[30,44,38,60,52,74,66,88,78,94].map((height, i) => <div key={i} className="flex-1 rounded-t bg-primary/40" style={{ height: `${height}%` }} />)}</div>}
          {!scanner && !ai && !score && !finance && !crm && !sales && <div className="flex h-full items-center justify-center text-sm text-white/30">{scene.result}</div>}
        </div>
      </div>
    </div>
  );
}

function DecisionWorld({ phase }: { phase: number }) {
  return <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,#11151c,#06080c)]"><div className="absolute bottom-[11%] left-[7%] right-[7%] h-px bg-white/15" /><div className="absolute bottom-[11%] left-[16%] h-[45%] w-[16%] rounded-t-2xl border border-white/10 bg-white/[.04]" /><div className="absolute bottom-[11%] right-[15%] h-[58%] w-[18%] rounded-t-2xl border border-primary/20 bg-primary/[.045]" /><div className="absolute bottom-[11%] left-[47%] h-8 w-8 rounded-full border border-white/20 bg-white/[.08]" style={{ transform: `translateX(${Math.sin(phase * Math.PI) * 24}px)` }} /><div className="absolute inset-x-[9%] top-[13%]"><p className="text-[9px] uppercase tracking-[.22em] text-primary">Decisión</p><h3 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-4xl">Datos conectados. <span className="text-primary">Decisiones mejores.</span></h3><div className="mt-5 flex flex-wrap gap-2">{["Reponer 30 unidades", "Contactar clientes", "Ajustar gastos"].map((item, i) => <span key={item} className="rounded-xl border border-primary/25 bg-primary/[.06] px-3 py-2 text-[10px] text-white" style={{ transform: `translateY(${Math.sin((phase + i * .17) * Math.PI) * -5}px)` }}>{item}</span>)}</div></div></div>;
}

function Layer({ scene, distance, focusDepth, progress }: { scene: Scene; distance: number; focusDepth: number; progress: number }) {
  const focus = 1 - clamp(Math.abs(distance) / focusDepth);
  const opacity = clamp(focus * 1.2);
  if (opacity < 0.015) return null;
  const scale = .76 + focus * .24;
  const blur = (1 - focus) * 9;
  const scenePhase = clamp(1 - Math.abs(distance) / 500);
  const entering = distance > -120 && distance < 220;
  const exiting = distance < -120 && distance > -420;
  const screen = scene.id !== "business" && scene.id !== "decision" && scene.id !== "score";
  const transform = screen
    ? `translateZ(${scene.z * 600}px) translate3d(${entering ? 0 : distance < -120 ? -8 : 8}px,0,0) scale(${scale})`
    : `translateZ(${scene.z * 600}px) scale(${scale})`;
  return (
    <div className="absolute inset-[7%]" style={{ transformStyle: "preserve-3d", transform, opacity, filter: blur > .4 ? `blur(${blur}px)` : undefined, pointerEvents: focus > .65 ? "auto" : "none" }}>
      {scene.id === "business" && <StoreScene phase={scenePhase} active={focus > .35} />}
      {scene.id === "decision" && <DecisionWorld phase={scenePhase} />}
      {scene.id !== "business" && scene.id !== "decision" && <div className="relative h-full w-full">{scene.id === "score" ? <div className="h-full w-full"><StoreScene phase={scenePhase} active={false} /><div className="absolute inset-[11%] rounded-[1.7rem] border border-primary/20 bg-[#090b10]/90 p-5 shadow-[0_35px_100px_rgba(0,0,0,.6)] sm:p-8"><div className="flex h-full flex-col justify-center"><p className="text-[9px] uppercase tracking-[.22em] text-primary">07 · NÜVA SCORE</p><div className="mt-4 flex items-center gap-6"><div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-primary/20 border-t-primary text-3xl font-bold text-white">{Math.round(72 + scenePhase * 14)}</div><p className="max-w-md text-sm leading-relaxed text-white/55">Ventas, inventario, finanzas y clientes convergen en una lectura del negocio.</p></div></div></div></div> : <NuvаScreen scene={scene} phase={scenePhase} />}</div>}
      {entering && screen && <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-primary/30 shadow-[0_0_70px_hsl(var(--primary)/.12)]" />}
      {exiting && screen && <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_35%,rgba(0,0,0,.35))]" />}
    </div>
  );
}

function ReducedMotion() {
  return <section className="bg-[#06070a] px-4 py-16 text-white sm:px-6" aria-label="Recorrido de Nüva One"><div className="mx-auto max-w-3xl"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-primary">Tu negocio, visto desde dentro</p><h2 className="mt-2 text-3xl font-semibold sm:text-5xl">Del movimiento real a la <span className="text-primary">decisión.</span></h2><div className="mt-10 space-y-5">{scenes.map((scene) => { const Icon = scene.icon; return <article key={scene.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><div className="flex items-center gap-2 text-primary"><Icon className="h-4 w-4" /><span className="text-[10px] uppercase tracking-[.2em]">{scene.eyebrow}</span></div><h3 className="mt-3 text-xl font-semibold">{scene.title}</h3><p className="mt-2 text-sm leading-relaxed text-white/55">{scene.copy}</p></article>; })}</div><div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"><Link to="/auth" search={{ mode: "signup" }} className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground">Empezar gratis <ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/demo" className="inline-flex h-11 items-center rounded-xl border border-white/15 px-6 text-sm">Ver Nüva en acción</Link></div></div></section>;
}

export function NuvaScrollWorld() {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = useMediaQuery("(max-width: 640px)");
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const smoothed = useRef(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const section = sectionRef.current;
    if (!section) return;
    let target = 0;
    const read = () => {
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, section.offsetHeight - window.innerHeight);
      target = clamp(-rect.top / travel);
    };
    const tick = () => {
      read();
      smoothed.current += (target - smoothed.current) * .16;
      setProgress(smoothed.current);
      raf.current = requestAnimationFrame(tick);
    };
    read();
    smoothed.current = target;
    raf.current = requestAnimationFrame(tick);
    window.addEventListener("resize", read);
    return () => { if (raf.current !== null) cancelAnimationFrame(raf.current); window.removeEventListener("resize", read); };
  }, [reducedMotion]);

  const cameraZ = progress * WORLD_DEPTH;
  const focusDepth = mobile ? 360 : 450;
  const activeIndex = useMemo(() => { let best = 0; let distance = Infinity; scenes.forEach((scene, i) => { const d = Math.abs(scene.z * 600 - cameraZ); if (d < distance) { distance = d; best = i; } }); return best; }, [cameraZ]);
  const active = scenes[activeIndex];
  const cameraRotateY = Math.sin(progress * Math.PI * 2) * (mobile ? 1 : 2.2);
  const cameraRotateX = 3 - progress * 2;

  if (reducedMotion) return <ReducedMotion />;

  return (
    <section ref={sectionRef} className="relative bg-[#06070a] text-white" aria-label="Experiencia cinematográfica de Nüva One">
      <div style={{ height: "840vh" }}>
        <div className="sticky top-0 flex h-screen min-h-[44rem] items-center overflow-hidden py-12 sm:py-16">
          <WorldLighting progress={progress} />
          <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6">
            <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-xs text-white/45"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary"><Sparkles className="h-3.5 w-3.5" /></span><span>Nüva One · Scroll World</span></div><span className="hidden text-[10px] uppercase tracking-[.2em] text-white/25 sm:block">Desplázate para entrar</span></div>
            <div className="mb-4 max-w-4xl"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-primary">Tu negocio, visto desde dentro</p><h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Del movimiento real a la <span className="text-primary">decisión.</span></h2></div>
            <div className="relative mx-auto h-[30rem] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#07090d] shadow-[0_35px_120px_rgba(0,0,0,.5)] sm:h-[36rem]" style={{ perspective: mobile ? "900px" : "1500px" }}>
              <div className="absolute inset-0" style={{ transformStyle: "preserve-3d", transform: `rotateX(${cameraRotateX}deg) rotateY(${cameraRotateY}deg) translateZ(${-cameraZ + 420}px)` }}>
                {scenes.map((scene) => <Layer key={scene.id} scene={scene} distance={scene.z * 600 - cameraZ} focusDepth={focusDepth} progress={progress} />)}
              </div>
              <div className="pointer-events-none absolute inset-x-[7%] bottom-[7%] z-20 max-w-xl">
                <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-primary">{active.eyebrow}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight sm:text-3xl">{active.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/50 sm:text-sm">{active.copy}</p>
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-4"><div className="flex gap-1.5" aria-label={`Escena ${activeIndex + 1} de ${scenes.length}`}>{scenes.map((scene, i) => <span key={scene.id} className={`h-1 rounded-full transition-all duration-300 ${i === activeIndex ? "w-8 bg-primary" : "w-2 bg-white/15"}`} />)}</div><span className="text-[10px] tabular-nums text-white/30">{String(activeIndex + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}</span></div>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row"><Link to="/auth" search={{ mode: "signup" }} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">Empezar gratis <ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/demo" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[.04] px-6 text-sm font-medium text-white transition-colors hover:bg-white/[.08]">Ver Nüva en acción</Link></div>
          </div>
        </div>
      </div>
    </section>
  );
}
