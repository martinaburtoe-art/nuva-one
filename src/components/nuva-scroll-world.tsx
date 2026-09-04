import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleDollarSign, ScanLine, Sparkles, Target, TrendingUp, Users } from "lucide-react";

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
  { id: "business", eyebrow: "01 · EL NEGOCIO", title: "Todo empieza en el mundo real.", copy: "Una operación real entra en Nüva sin romper el contexto.", action: "Movimiento detectado", result: "Cliente + producto + venta", insight: "El contexto importa.", icon: TrendingUp, z: 0 },
  { id: "sales", eyebrow: "02 · VENTAS", title: "La venta ocurre. Nüva la entiende.", copy: "La cámara sigue la operación hasta la pantalla y continúa dentro de la misma experiencia.", action: "Venta registrada", result: "+$84.990 · Cliente recurrente", insight: "Detecta qué vendes y quién vuelve.", icon: TrendingUp, z: 1 },
  { id: "inventory", eyebrow: "03 · INVENTARIO + SCANNER", title: "El producto entra. El scanner lo reconoce.", copy: "El movimiento físico produce un cambio digital visible.", action: "Producto escaneado", result: "SKU-1048 · Stock 24 → 25", insight: "Sabe qué tienes antes de que falte.", icon: ScanLine, z: 2 },
  { id: "finance", eyebrow: "04 · FINANZAS", title: "La misma operación se vuelve claridad financiera.", copy: "Un movimiento alimenta ingresos, egresos y flujo de caja.", action: "Movimiento conciliado", result: "$1,03 M · utilidad estimada", insight: "Entiende dónde se va tu dinero.", icon: CircleDollarSign, z: 3 },
  { id: "crm", eyebrow: "05 · CLIENTES", title: "El cliente vuelve. Nüva ya conoce la historia.", copy: "La relación aparece sin perder la continuidad de la escena.", action: "Cliente reconocido", result: "87 clientes · 12 recurrentes", insight: "Compras aisladas → relaciones.", icon: Users, z: 4 },
  { id: "ai", eyebrow: "06 · NÜVA IA", title: "Ahora puedes preguntarle al negocio.", copy: "Nüva cruza ventas, inventario, clientes y finanzas para responder.", action: "Pregunta al negocio", result: "Reponer 30 unidades del SKU-1048", insight: "No interpretes todo. Pregunta.", icon: Sparkles, z: 5 },
  { id: "score", eyebrow: "07 · NÜVA SCORE", title: "Todo converge en una lectura.", copy: "Las señales se reúnen en una sola lectura ejecutiva.", action: "Salud del negocio", result: "Nüva Score · 86 / 100", insight: "Una señal para saber dónde mirar.", icon: Target, z: 6 },
  { id: "decision", eyebrow: "08 · DECISIÓN", title: "La inteligencia termina en una acción.", copy: "La cámara vuelve al mundo físico con una decisión concreta.", action: "Siguiente movimiento", result: "Reponer · contactar · optimizar", insight: "Datos conectados. Decisiones mejores.", icon: Sparkles, z: 7 },
];

const WORLD_DEPTH = 4200;
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

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

function AmbientScene({ phase, dark = false }: { phase: number; dark?: boolean }) {
  const lightX = 18 + phase * 55;
  return (
    <div className={`absolute inset-0 overflow-hidden rounded-[2rem] ${dark ? "bg-[#030407]" : "bg-[#111318]"}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_8%,rgba(255,255,255,.11),transparent_32%),linear-gradient(145deg,#151922,#07090d_72%)]" />
      <div className="absolute -top-[18%] h-[70%] w-[45%] rounded-full bg-primary/[.07] blur-[90px]" style={{ left: `${lightX}%` }} />
      <div className="absolute bottom-0 left-[8%] right-[8%] h-[28%] border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.035),transparent)]" />
      <div className="absolute bottom-[10%] left-[12%] h-[31%] w-[18%] rounded-t-[1.5rem] border border-white/10 bg-white/[.025]" />
      <div className="absolute bottom-[10%] right-[12%] h-[42%] w-[21%] rounded-t-[1.5rem] border border-white/10 bg-white/[.02]" />
      <div className="absolute left-[8%] top-[10%] text-[8px] uppercase tracking-[.28em] text-white/25">Nüva One · live environment</div>
    </div>
  );
}

function LaptopScene({ phase }: { phase: number }) {
  const handX = 52 + Math.sin(phase * Math.PI) * 5;
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-[#030406]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,.08),transparent_25%),linear-gradient(150deg,#161a22,#020305_68%)]" />
      <div className="absolute bottom-0 left-[-5%] right-[-5%] h-[38%] rotate-[-3deg] bg-[linear-gradient(180deg,#15171b,#07080a)] shadow-[0_-30px_80px_rgba(0,0,0,.55)]" />
      <div className="absolute left-[18%] top-[13%] h-[57%] w-[64%] -rotate-[2deg] rounded-[1.4rem] border border-white/15 bg-[#11141a] p-[1.1%] shadow-[0_45px_100px_rgba(0,0,0,.8)] [transform:perspective(1200px)_rotateX(8deg)_rotateY(-4deg)] sm:left-[23%] sm:w-[54%]">
        <div className="relative h-full overflow-hidden rounded-[.9rem] border border-white/10 bg-[#05070a] shadow-[inset_0_0_50px_rgba(0,0,0,.7)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,hsl(var(--primary)/.16),transparent_40%)]" />
          <div className="absolute left-[7%] right-[7%] top-[8%] flex items-center justify-between border-b border-white/10 pb-2"><span className="text-[7px] font-semibold text-white/80">Nüva One</span><span className="text-[6px] text-primary">INTELLIGENCE</span></div>
          <div className="absolute left-[7%] top-[22%] w-[42%]"><p className="text-[6px] uppercase tracking-[.2em] text-primary">Tu negocio, visto desde dentro</p><p className="mt-2 text-[13px] font-semibold leading-tight text-white sm:text-[17px]">Tu negocio genera datos.</p><p className="text-[13px] font-semibold leading-tight text-primary sm:text-[17px]">Nüva los convierte en decisiones.</p></div>
          <div className="absolute bottom-[12%] left-[7%] right-[7%] grid grid-cols-3 gap-2"><span className="h-10 rounded-lg border border-white/10 bg-white/[.035]" /><span className="h-10 rounded-lg border border-primary/20 bg-primary/[.045]" /><span className="h-10 rounded-lg border border-white/10 bg-white/[.035]" /></div>
          <div className="absolute inset-0 rounded-[.9rem] shadow-[inset_0_-40px_80px_rgba(0,0,0,.45)]" />
        </div>
      </div>
      <div className="absolute bottom-[5%] left-[20%] right-[20%] h-[8%] rounded-[1rem_1rem_2.5rem_2.5rem] border border-white/10 bg-[#111318] shadow-[0_25px_60px_rgba(0,0,0,.8)] [transform:perspective(900px)_rotateX(60deg)]" />
      <div className="absolute bottom-[8%] h-[23%] w-[21%] rounded-[2rem_2rem_1rem_1rem] bg-[#b9a99d]/[.08] blur-[1px] transition-transform duration-300" style={{ left: `${handX}%`, transform: "rotate(-12deg)" }} />
      <div className="absolute bottom-[10%] left-[8%] rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[8px] uppercase tracking-[.18em] text-white/40">scroll → entrar</div>
    </div>
  );
}

function NuvaScreen({ scene, phase }: { scene: Scene; phase: number }) {
  const scanner = scene.id === "inventory";
  const ai = scene.id === "ai";
  const score = scene.id === "score";
  const finance = scene.id === "finance";
  const crm = scene.id === "crm";
  const sales = scene.id === "sales";
  const updated = phase > 0.68;
  const Icon = scene.icon;
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.8rem] border border-white/15 bg-[#07090d] shadow-[0_50px_130px_rgba(0,0,0,.78)] [transform:perspective(1200px)_rotateX(2deg)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/.14),transparent_42%)]" />
      <div className="relative flex h-full flex-col p-4 sm:p-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></span><div><p className="text-xs font-semibold text-white">Nüva One</p><p className="text-[8px] text-white/30">Inteligencia conectada</p></div></div><span className="text-[8px] text-primary">nuva.one</span></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-white/[.035] p-3"><p className="text-[8px] text-white/30">{scene.action}</p><p className="mt-1 text-xs font-semibold text-white sm:text-sm">{scene.result}</p></div><div className="rounded-xl border border-primary/15 bg-primary/[.05] p-3"><p className="text-[8px] text-white/30">Nüva interpreta</p><p className="mt-1 text-xs font-semibold text-primary sm:text-sm">{scene.insight}</p></div></div>
        <div className="relative mt-3 flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/20 p-3">
          {scanner && <div className="relative flex h-full items-center justify-center rounded-lg border border-primary/20"><div className="absolute inset-x-8 h-px bg-primary shadow-[0_0_24px_hsl(var(--primary)/.95)]" style={{ top: `${8 + phase * 82}%` }} /><div className="absolute inset-[17%] rounded-xl border border-primary/45" /><ScanLine className="h-9 w-9 text-primary" style={{ opacity: updated ? .3 : 1 }} /><span className="absolute bottom-3 rounded-full bg-black/70 px-3 py-1 text-[8px] text-primary">{updated ? "✓ SKU-1048 · Stock 24 → 25" : "Escaneando · SKU-1048"}</span></div>}
          {sales && <div className="flex h-full items-end gap-2">{[32,45,40,61,52,74,67,88,79,95].map((height, i) => <div key={i} className="flex-1 rounded-t bg-primary/40" style={{ height: `${height + phase * 5}%` }} />)}</div>}
          {finance && <div className="flex h-full items-end gap-3">{[45,63,54,77,61,88,72].map((height, i) => <div key={i} className="flex-1 rounded-t bg-primary/35" style={{ height: `${height + phase * 6}%` }} />)}</div>}
          {crm && <div className="space-y-3 pt-2">{[78,52,91].map((width, i) => <div key={i} className="flex items-center gap-3"><div className="h-9 w-9 rounded-full border border-white/10 bg-primary/10" /><div className="flex-1"><div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-primary/50" style={{ width: `${width}%` }} /></div><p className="mt-1 text-[8px] text-white/25">Historial · frecuencia · seguimiento</p></div></div>)}</div>}
          {ai && <div className="space-y-3"><div className="ml-auto max-w-[74%] rounded-xl bg-primary/15 p-3 text-[9px] text-white">¿Qué debería hacer esta semana para mejorar mis ventas?</div><div className="rounded-xl border border-white/10 bg-white/[.035] p-3 text-[9px] leading-relaxed text-white/65"><span className="text-primary">Nüva IA</span><br />Cruzo ventas + inventario + clientes + finanzas.<br /><strong className="text-white">Reponer 30 unidades del SKU-1048.</strong></div></div>}
          {score && <div className="flex h-full flex-col items-center justify-center"><div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-primary/15 border-t-primary" style={{ transform: `rotate(${phase * 32}deg)` }}><span className="text-4xl font-bold text-white" style={{ transform: `rotate(${-phase * 32}deg)` }}>{Math.round(72 + phase * 14)}</span></div><span className="mt-4 text-[9px] uppercase tracking-[.2em] text-white/40">Nüva Score · salud del negocio</span></div>}
        </div>
      </div>
    </div>
  );
}

function DecisionScene({ phase }: { phase: number }) {
  return <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-[#05070a]"><AmbientScene phase={phase} /><div className="absolute inset-x-[8%] top-[14%] max-w-2xl"><p className="text-[9px] uppercase tracking-[.25em] text-primary">Decisión</p><h3 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-6xl">Datos conectados.<br /><span className="text-primary">Decisiones mejores.</span></h3><div className="mt-6 flex flex-wrap gap-2">{["Reponer 30 unidades", "Contactar clientes", "Ajustar gastos"].map((item, i) => <span key={item} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[10px] text-white/80" style={{ transform: `translateY(${Math.sin((phase + i * .2) * Math.PI) * -5}px)` }}>{item}</span>)}</div></div></div>;
}

function Layer({ scene, distance, focusDepth }: { scene: Scene; distance: number; focusDepth: number }) {
  const focus = 1 - clamp(Math.abs(distance) / focusDepth);
  const opacity = clamp(focus * 1.2);
  if (opacity < 0.015) return null;
  const approach = clamp(1 - Math.abs(distance) / 260);
  const scale = scene.id === "business" || scene.id === "decision"
    ? 0.82 + focus * 0.18
    : 0.74 + focus * 0.26 + approach * 0.34;
  const blur = (1 - focus) * 8;
  const phase = clamp(1 - Math.abs(distance) / 500);
  const screen = scene.id !== "business" && scene.id !== "decision";
  const entering = distance > -160 && distance < 240;
  const travelX = entering ? 0 : distance < -160 ? -18 : 18;
  const transform = screen
    ? `translateZ(${scene.z * 600}px) translate3d(${travelX}px,0,0) scale(${scale})`
    : `translateZ(${scene.z * 600}px) scale(${scale})`;
  const portal = screen ? approach : 0;
  return (
    <div className="absolute inset-[5%] [transform-style:preserve-3d]" style={{ transform, opacity, filter: blur > .4 ? `blur(${blur}px)` : undefined, pointerEvents: focus > .65 ? "auto" : "none", willChange: "transform, opacity, filter" }}>
      {scene.id === "business" && <LaptopScene phase={phase} />}
      {scene.id === "decision" && <DecisionScene phase={phase} />}
      {screen && scene.id !== "business" && scene.id !== "decision" && <NuvaScreen scene={scene} phase={phase} />}
      {portal > 0 && screen && <div className="pointer-events-none absolute inset-[-2%] rounded-[2.2rem] border border-primary/30 shadow-[0_0_110px_hsl(var(--primary)/.18),inset_0_0_90px_hsl(var(--primary)/.08)]" style={{ opacity: portal * .8 }} />}
    </div>
  );
}

function ReducedMotion() {
  return <section className="bg-[#05070a] px-4 py-16 text-white sm:px-6" aria-label="Recorrido de Nüva One"><div className="mx-auto max-w-3xl"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-primary">Tu negocio, visto desde dentro</p><h2 className="mt-2 text-3xl font-semibold sm:text-5xl">Del movimiento real a la <span className="text-primary">decisión.</span></h2><div className="mt-10 space-y-5">{scenes.map((scene) => { const Icon = scene.icon; return <article key={scene.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><div className="flex items-center gap-2 text-primary"><Icon className="h-4 w-4" /><span className="text-[10px] uppercase tracking-[.2em]">{scene.eyebrow}</span></div><h3 className="mt-3 text-xl font-semibold">{scene.title}</h3><p className="mt-2 text-sm leading-relaxed text-white/55">{scene.copy}</p></article>; })}</div><div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"><Link to="/auth" search={{ mode: "signup" }} className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground">Empezar gratis <ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/demo" className="inline-flex h-11 items-center rounded-xl border border-white/15 px-6 text-sm">Ver Nüva en acción</Link></div></div></section>;
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
      smoothed.current += (target - smoothed.current) * 0.14;
      setProgress(smoothed.current);
      raf.current = requestAnimationFrame(tick);
    };
    read();
    smoothed.current = target;
    raf.current = requestAnimationFrame(tick);
    window.addEventListener("resize", read, { passive: true });
    return () => { if (raf.current !== null) cancelAnimationFrame(raf.current); window.removeEventListener("resize", read); };
  }, [reducedMotion]);

  const cameraZ = progress * WORLD_DEPTH;
  const focusDepth = mobile ? 360 : 450;
  const activeIndex = useMemo(() => { let best = 0; let nearest = Infinity; scenes.forEach((scene, index) => { const distance = Math.abs(scene.z * 600 - cameraZ); if (distance < nearest) { nearest = distance; best = index; } }); return best; }, [cameraZ]);
  const active = scenes[activeIndex];
  const cameraRotateY = Math.sin(progress * Math.PI * 2) * (mobile ? 1 : 2.6);
  const cameraRotateX = 2.8 - progress * 1.8;

  if (reducedMotion) return <ReducedMotion />;

  return <section ref={sectionRef} className="relative bg-[#05070a] text-white [overscroll-behavior:contain]" aria-label="Experiencia cinematográfica de Nüva One">
    <div style={{ height: "840vh" }}>
      <div className="sticky top-0 flex h-screen min-h-[40rem] items-center overflow-hidden py-8 sm:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,hsl(var(--primary)/.09),transparent_35%),linear-gradient(180deg,#0b0e13,#030407_78%)]" />
        <div className="relative mx-auto w-full max-w-[1440px] px-3 sm:px-6">
          <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] text-white/40"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary"><Sparkles className="h-3.5 w-3.5" /></span><span>Nüva One · Scroll World</span></div><span className="hidden text-[9px] uppercase tracking-[.24em] text-white/20 sm:block">desplázate para entrar</span></div>
          <div className="mb-3 max-w-4xl"><p className="text-[9px] font-semibold uppercase tracking-[.25em] text-primary">Tu negocio, visto desde dentro</p><h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Del movimiento real a la <span className="text-primary">decisión.</span></h2></div>
          <div className="relative mx-auto h-[29rem] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#030507] shadow-[0_40px_140px_rgba(0,0,0,.72)]" style={{ perspective: mobile ? "850px" : "1500px" }}>
            <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: `rotateX(${cameraRotateX}deg) rotateY(${cameraRotateY}deg) translateZ(${-cameraZ + 430}px)`, willChange: "transform" }}>
              {scenes.map((scene) => <Layer key={scene.id} scene={scene} distance={scene.z * 600 - cameraZ} focusDepth={focusDepth} />)}
            </div>
            <div className="pointer-events-none absolute inset-x-[6%] bottom-[6%] z-20 max-w-2xl"><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-primary">{active.eyebrow}</p><h3 className="mt-2 text-xl font-semibold tracking-tight sm:text-3xl">{active.title}</h3><p className="mt-2 max-w-xl text-xs leading-relaxed text-white/45 sm:text-sm">{active.copy}</p></div>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,.5)_100%)]" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-4"><div className="flex gap-1.5" aria-label={`Escena ${activeIndex + 1} de ${scenes.length}`}>{scenes.map((scene, index) => <span key={scene.id} className={`h-1 rounded-full transition-all duration-300 ${index === activeIndex ? "w-8 bg-primary" : "w-2 bg-white/15"}`} />)}</div><span className="text-[9px] tabular-nums text-white/25">{String(activeIndex + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}</span></div>
          <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row"><Link to="/auth" search={{ mode: "signup" }} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">Empezar gratis <ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/demo" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[.04] px-6 text-sm font-medium text-white transition-colors hover:bg-white/[.08]">Ver Nüva en acción</Link></div>
        </div>
      </div>
    </div>
  </section>;
}
