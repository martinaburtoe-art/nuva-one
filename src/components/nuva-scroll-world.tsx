import { useEffect, useRef, useState } from "react";
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

type SceneId = "business" | "sales" | "inventory" | "finance" | "crm" | "ai" | "score" | "decision";

const WORLD = 4200;
const scenes: { id: SceneId; depth: number; label: string }[] = [
  { id: "business", depth: 0, label: "Negocio" },
  { id: "sales", depth: 600, label: "Ventas" },
  { id: "inventory", depth: 1200, label: "Inventario" },
  { id: "finance", depth: 1800, label: "Finanzas" },
  { id: "crm", depth: 2400, label: "Clientes" },
  { id: "ai", depth: 3000, label: "Nüva AI" },
  { id: "score", depth: 3600, label: "Score" },
  { id: "decision", depth: WORLD, label: "Decisión" },
];

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

function LaptopScene({ phase }: { phase: number }) {
  const fingerX = 50 + Math.sin(phase * Math.PI) * 4;
  const screenGlow = 0.16 + phase * 0.1;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070809]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_14%,rgba(255,255,255,.13),transparent_28%),radial-gradient(ellipse_at_50%_82%,rgba(0,0,0,.95),transparent_54%),linear-gradient(155deg,#191b1e_0%,#090a0c_48%,#020304_100%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.018)_0px,rgba(255,255,255,.018)_1px,transparent_1px,transparent_4px)]" />

      <div className="absolute bottom-[-7%] left-[-8%] h-[46%] w-[116%] rotate-[-3.5deg] rounded-[50%_50%_0_0] border-t border-white/[.08] bg-[linear-gradient(180deg,#191b1f,#090a0c_35%,#020304)] shadow-[0_-30px_90px_rgba(0,0,0,.85)]" />
      <div className="absolute bottom-[18%] left-1/2 h-[14%] w-[64%] -translate-x-1/2 rounded-full bg-white/[.055] blur-3xl" />

      <div className="absolute left-1/2 top-[11%] w-[78%] -translate-x-1/2 sm:top-[12%] sm:w-[60%]" style={{ perspective: "1300px" }}>
        <div className="relative aspect-[1.52/1] -rotate-[2.5deg] rounded-[1.25rem] border border-white/20 bg-[linear-gradient(145deg,#25282d,#0c0e12_55%,#050607)] p-[1.3%] shadow-[0_65px_130px_rgba(0,0,0,.9),0_0_1px_rgba(255,255,255,.8)] [transform:rotateX(6deg)_rotateY(-4deg)]">
          <div className="absolute -top-[1.3%] left-1/2 h-[1.3%] w-[14%] -translate-x-1/2 rounded-b-full bg-black/70" />
          <div className="relative h-full overflow-hidden rounded-[.72rem] border border-black bg-[#050607] shadow-[inset_0_0_45px_rgba(0,0,0,.95)]">
            <div className="absolute inset-0" style={{ opacity: screenGlow, background: "radial-gradient(circle at 70% 0%, hsl(var(--primary) / .35), transparent 48%)" }} />
            <div className="absolute inset-[7%] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-[2.5%] text-[clamp(5px,.7vw,9px)] uppercase tracking-[.25em] text-white/45">
                <span className="font-semibold text-white/85">NÜVA ONE</span>
                <span className="text-primary">INTELLIGENCE</span>
              </div>
              <div className="mt-[10%] max-w-[68%]">
                <p className="text-[clamp(5px,.65vw,9px)] uppercase tracking-[.32em] text-primary/80">Todo conectado</p>
                <p className="mt-[4%] text-[clamp(1rem,2.8vw,3rem)] font-medium leading-[.91] tracking-[-.055em] text-white">Tu negocio genera datos.</p>
                <p className="text-[clamp(1rem,2.8vw,3rem)] font-medium leading-[.91] tracking-[-.055em] text-white/40">Nüva los convierte en decisiones.</p>
              </div>
              <div className="mt-auto grid grid-cols-3 gap-[2%]">
                <span className="h-[clamp(18px,3vw,44px)] rounded-md border border-white/10 bg-white/[.035]" />
                <span className="h-[clamp(18px,3vw,44px)] rounded-md border border-primary/20 bg-primary/[.05]" />
                <span className="h-[clamp(18px,3vw,44px)] rounded-md border border-white/10 bg-white/[.035]" />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,.12)_35%,transparent_50%)] opacity-25" />
          </div>
          <div className="absolute -bottom-[5%] left-[3%] right-[3%] h-[5%] rounded-full bg-black/70 blur-md" />
        </div>

        <div className="relative mx-[-6%] mt-[-1%] h-[14vw] max-h-28 min-h-12 rounded-[.9rem_.9rem_2.6rem_2.6rem] border border-white/15 bg-[linear-gradient(145deg,#292c31,#0d1014_45%,#050607)] shadow-[0_30px_70px_rgba(0,0,0,.85)] [transform:rotateX(62deg)] sm:h-28">
          <div className="absolute inset-[4%_17%_17%] rounded-xl border border-white/[.06] bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,.07),transparent_34%),#111317]" />
          <div className="absolute left-1/2 top-[51%] h-[17%] w-[14%] -translate-x-1/2 rounded-lg border border-white/[.08] bg-[#08090b] shadow-[inset_0_0_10px_rgba(255,255,255,.04)]" />
          <div className="absolute bottom-[2%] left-1/2 h-px w-[70%] -translate-x-1/2 bg-white/[.06]" />
        </div>
      </div>

      <div className="absolute bottom-[2%] h-[31%] w-[22%] rounded-[48%_44%_35%_42%] border border-white/[.06] bg-[radial-gradient(circle_at_34%_22%,rgba(236,220,208,.22),transparent_30%),linear-gradient(145deg,rgba(193,171,157,.2),rgba(78,65,59,.08))] shadow-[15px_20px_55px_rgba(0,0,0,.55)] blur-[.15px]" style={{ left: `${fingerX}%`, transform: "rotate(-13deg)" }}>
        <div className="absolute -top-[16%] left-[44%] h-[38%] w-[32%] rounded-[50%_50%_38%_38%] border border-white/[.05] bg-[linear-gradient(135deg,rgba(222,204,190,.24),rgba(87,70,62,.08))] shadow-[8px_10px_28px_rgba(0,0,0,.35)]" />
      </div>

      <div className="absolute bottom-[7%] left-[6%] text-[9px] uppercase tracking-[.34em] text-white/25">scroll · entrar</div>
      <div className="absolute bottom-[7%] right-[6%] text-[9px] uppercase tracking-[.25em] text-white/20">01 / 08</div>
    </div>
  );
}

function AppScreen({ id, phase }: { id: SceneId; phase: number }) {
  const Icon = id === "inventory" ? ScanLine : id === "finance" ? CircleDollarSign : id === "crm" ? Users : id === "ai" ? Sparkles : id === "score" ? Target : TrendingUp;
  const title = { sales: "Ventas en tiempo real", inventory: "Inventario + Scanner", finance: "Flujo de caja", crm: "Clientes", ai: "Nüva AI", score: "Nüva Score" }[id] ?? "Nüva One";

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#07090c] p-5 sm:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,hsl(var(--primary)/.12),transparent_34%),linear-gradient(145deg,#11151b,#030406_72%)]" />
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10"><Icon className="size-4 text-primary" /></span>
          <div><p className="text-xs font-semibold text-white">Nüva One</p><p className="text-[9px] text-white/30">Inteligencia conectada</p></div>
        </div>
        <span className="text-[9px] uppercase tracking-[.25em] text-white/25">{title}</span>
      </div>

      {id === "sales" && (
        <div className="relative z-10 h-[78%] pt-8">
          <div className="mb-7 flex items-end justify-between"><div><p className="text-xs text-white/35">Ventas hoy</p><p className="mt-1 text-4xl tracking-[-.04em] sm:text-6xl">$428.600</p></div><span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] text-primary">+18,4%</span></div>
          <div className="flex h-[68%] items-end gap-1.5 sm:gap-2">{[31,46,39,59,52,73,66,87,78,94,82,100].map((height, i) => <div key={i} className="relative flex-1 rounded-t bg-primary/45" style={{ height: `${Math.min(100, height + phase * 4)}%`, opacity: 0.42 + i * 0.038 }}>{i === 11 && <span className="absolute -top-6 right-0 text-[9px] text-primary">ahora</span>}</div>)}</div>
        </div>
      )}

      {id === "inventory" && (
        <div className="relative z-10 flex h-[78%] items-center justify-center">
          <div className="relative flex aspect-video w-full max-w-3xl items-center justify-center overflow-hidden rounded-[1.4rem] border border-primary/25 bg-black/45 shadow-[inset_0_0_80px_rgba(0,0,0,.7)]">
            <div className="absolute inset-[16%] rounded-2xl border border-primary/35" />
            <div className="absolute inset-x-[9%] h-px bg-primary shadow-[0_0_34px_hsl(var(--primary)/.95)]" style={{ top: `${8 + phase * 84}%` }} />
            <div className="absolute inset-[22%] rounded-xl border border-white/[.06]" />
            <ScanLine className="relative z-10 size-12 text-primary drop-shadow-[0_0_20px_hsl(var(--primary)/.7)]" />
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/80 px-4 py-2 text-xs text-primary backdrop-blur-md">{phase > 0.68 ? "✓ SKU-1048 · Stock 24 → 25" : "Escaneando · SKU-1048"}</div>
          </div>
        </div>
      )}

      {id === "finance" && (
        <div className="relative z-10 pt-10">
          <div className="grid gap-4 sm:grid-cols-3">{[["Disponible", "$3.420.000"], ["Margen", "24,8%"], ["Proyección", "+12,6%"]].map(([label, value], i) => <div key={label} className={`rounded-2xl border p-5 ${i === 2 ? "border-primary/15 bg-primary/[.05]" : "border-white/10 bg-white/[.025]"}`}><p className="text-xs text-white/30">{label}</p><p className={`mt-2 text-3xl tracking-[-.04em] sm:text-4xl ${i === 2 ? "text-primary" : ""}`}>{value}</p></div>)}</div>
          <div className="mt-10 h-48 rounded-2xl border border-white/10 bg-black/20 p-4"><svg viewBox="0 0 900 180" className="h-full w-full"><defs><linearGradient id="nuva-finance-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".18" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs><path d="M0 148 C90 142 110 110 205 122 S310 140 390 78 S510 108 610 60 S760 78 900 18 L900 180 L0 180 Z" fill="url(#nuva-finance-fill)" className="text-primary" /><path d="M0 148 C90 142 110 110 205 122 S310 140 390 78 S510 108 610 60 S760 78 900 18" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary/60" /></svg></div>
        </div>
      )}

      {id === "crm" && <div className="relative z-10 grid gap-3 pt-10 sm:grid-cols-3">{[["Camila R.", "8 compras", "Alta recurrencia"], ["Felipe M.", "5 compras", "Buen margen"], ["Antonia S.", "4 compras", "Lista para volver"]].map(([name, purchases, note]) => <div key={name} className="rounded-2xl border border-white/10 bg-white/[.025] p-6" style={{ transform: `translateY(${(1 - phase) * 10}px)` }}><span className="grid size-11 place-items-center rounded-full bg-primary/10 text-sm text-primary">{name[0]}</span><p className="mt-7 text-lg">{name}</p><p className="mt-1 text-xs text-white/35">{purchases} · cliente recurrente</p><p className="mt-6 border-t border-white/10 pt-4 text-[10px] uppercase tracking-[.18em] text-white/25">{note}</p></div>)}</div>}

      {id === "ai" && <div className="relative z-10 mx-auto max-w-4xl pt-8"><div className="rounded-2xl border border-white/10 bg-white/[.025] p-5 text-base text-white/65 shadow-[0_20px_70px_rgba(0,0,0,.2)]">¿Qué debería hacer esta semana para mejorar mis ventas?</div><div className="mt-3 rounded-2xl border border-primary/15 bg-primary/[.07] p-6 text-sm leading-7 text-white/75"><span className="mb-3 block text-[9px] uppercase tracking-[.25em] text-primary">Recomendación de Nüva</span>Prioriza reponer <strong className="text-white">SKU-1048</strong>, contacta a tus clientes recurrentes y concentra la promoción en los productos con mayor margen. Nüva cruza ventas, inventario, clientes y finanzas para llegar a esta recomendación.</div><div className="mt-4 flex flex-wrap gap-2 text-[10px] text-white/30">{["Ventas", "Inventario", "Clientes", "Finanzas"].map((item) => <span key={item} className="rounded-full border border-white/10 px-3 py-1">{item}</span>)}</div></div>}

      {id === "score" && <div className="relative z-10 flex h-[78%] flex-col items-center justify-center text-center"><p className="text-[10px] uppercase tracking-[.3em] text-white/30">Salud del negocio</p><p className="mt-5 text-[clamp(7rem,20vw,12rem)] font-medium leading-none tracking-[-.08em] text-white">82</p><p className="mt-3 text-sm text-white/40">de 100 · negocio saludable</p><div className="mt-8 h-1.5 w-[min(70vw,460px)] overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-primary/70 shadow-[0_0_22px_hsl(var(--primary)/.45)]" style={{ width: `${82 * clamp(phase * 1.35)}%` }} /></div></div>}
    </div>
  );
}

function Decision({ progress }: { progress: number }) {
  return <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#020304] px-6 text-center"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(var(--primary)/.1),transparent_38%)]" /><div className="relative max-w-6xl"><p className="text-[10px] uppercase tracking-[.4em] text-white/30">NÜVA ONE · SIGUIENTE MOVIMIENTO</p><h2 className="mt-7 text-[clamp(3.1rem,8vw,8.5rem)] font-medium leading-[.88] tracking-[-.07em] text-white">Tu negocio genera datos.<br /><span className="text-white/40">Nüva los convierte en decisiones.</span></h2><p className="mx-auto mt-8 max-w-2xl text-sm leading-6 text-white/40">De la venta al inventario. Del inventario a las finanzas. De los datos a una decisión concreta.</p><Link to="/auth" className="group mt-9 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-[0_15px_50px_rgba(255,255,255,.12)]">Empieza con Nüva <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link><div className="mt-10 text-[9px] tracking-[.3em] text-white/20">{Math.round(progress * 100)}% · EXPERIENCIA COMPLETA</div></div></div>;
}

export function NuvaScrollWorld() {
  const [progress, setProgress] = useState(0);
  const target = useRef(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      target.current = clamp(window.scrollY / max);
    };
    const tick = () => {
      setProgress((value) => value + (target.current - value) * 0.085);
      raf.current = requestAnimationFrame(tick);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    raf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, []);

  const z = progress * WORLD;
  const active = scenes.reduce((a, b) => (Math.abs(b.depth - z) < Math.abs(a.depth - z) ? b : a), scenes[0]);
  const next = scenes.find((scene) => scene.depth > z) ?? scenes.at(-1)!;

  return (
    <section className="relative h-[840vh] bg-[#020304] text-white" aria-label="Experiencia cinematográfica Nüva One">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,.035),transparent_35%),linear-gradient(180deg,#090b0e,#010203)]" />
        <div className="absolute inset-0 [perspective:1400px]">
          <div className="absolute inset-0 [transform-style:preserve-3d] will-change-transform" style={{ transform: `translateZ(${-z}px)` }}>
            <div className="absolute left-1/2 top-0 h-screen w-screen -translate-x-1/2" style={{ transform: "translateZ(0px)" }}><LaptopScene phase={clamp(progress * 1.8)} /></div>
            {scenes.slice(1, 7).map((scene) => {
              const distance = Math.abs(scene.depth - z);
              const opacity = clamp(1 - distance / 980, 0.02, 1);
              const near = clamp(1 - distance / 520);
              const scale = 1 + near * 0.24;
              const lift = scene.id === next.id ? (1 - near) * 80 : 0;
              return <div key={scene.id} className="absolute left-1/2 top-0 h-screen w-screen -translate-x-1/2 will-change-transform" style={{ transform: `translateZ(${scene.depth}px) translateY(${lift}px)`, opacity, filter: `blur(${Math.min(7, distance / 135)}px)`, zIndex: scene.depth <= z ? 2 : 1 }}><div className="absolute inset-0 flex items-center justify-center"><div className="relative h-[78vh] w-[min(94vw,1180px)] overflow-hidden rounded-[1.6rem] border border-white/15 shadow-[0_70px_180px_rgba(0,0,0,.86)] will-change-transform" style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}><AppScreen id={scene.id} phase={near} /><div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,.06)_47%,transparent_58%)] opacity-30" /></div></div></div>;
            })}
            <div className="absolute left-1/2 top-0 h-screen w-screen -translate-x-1/2" style={{ transform: `translateZ(${WORLD}px)` }}><Decision progress={progress} /></div>
          </div>
        </div>
        <div className="pointer-events-none absolute left-5 top-1/2 hidden -translate-y-1/2 md:block"><div className="space-y-3">{scenes.map((scene) => <div key={scene.id} className={`h-1 rounded-full transition-all duration-300 ${active.id === scene.id ? "w-10 bg-white" : "w-3 bg-white/20"}`} />)}</div></div>
        <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[9px] uppercase tracking-[.3em] text-white/35 backdrop-blur-md">{active.label}</div>
        <div className="pointer-events-none absolute bottom-7 inset-x-0 text-center text-[9px] uppercase tracking-[.35em] text-white/25">Scroll · entra · explora · decide</div>
      </div>
    </section>
  );
}
