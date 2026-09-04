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

function GlassScreen({
  children,
  zoom = 1,
  opacity = 1,
}: {
  children: React.ReactNode;
  zoom?: number;
  opacity?: number;
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2 h-[78vh] w-[min(94vw,1180px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.6rem] border border-white/15 bg-[#080a0e] shadow-[0_70px_180px_rgba(0,0,0,.82)] will-change-transform"
      style={{ transform: `translate(-50%,-50%) scale(${zoom})`, opacity }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/.15),transparent_45%),linear-gradient(145deg,#11151d,#030406_78%)]" />
      <div className="absolute inset-[1px] rounded-[1.55rem] border border-white/[.04]" />
      {children}
    </div>
  );
}

function PhysicalWorld({ phase }: { phase: number }) {
  const hand = 50 + Math.sin(phase * Math.PI) * 7;
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#020304]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_26%,rgba(255,255,255,.12),transparent_24%),linear-gradient(150deg,#171b23,#030406_68%)]" />
      <div className="absolute bottom-[-7%] left-[-5%] h-[43%] w-[110%] rotate-[-4deg] bg-[linear-gradient(180deg,#17191d,#050608)] shadow-[0_-40px_100px_rgba(0,0,0,.8)]" />
      <div className="absolute bottom-[26%] left-1/2 h-[10%] w-[58%] -translate-x-1/2 rounded-full bg-white/[.035] blur-3xl" />
      <div className="absolute left-[15%] top-[17%] h-[52%] w-[70%] -rotate-[2deg] rounded-[1.4rem] border border-white/20 bg-[#101318] p-[1%] shadow-[0_55px_120px_rgba(0,0,0,.9)] [transform:perspective(1200px)_rotateX(7deg)_rotateY(-5deg)] sm:left-[24%] sm:w-[52%]">
        <div className="relative h-full overflow-hidden rounded-[.95rem] border border-white/10 bg-[#030507] shadow-[inset_0_0_70px_rgba(0,0,0,.9)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_5%,hsl(var(--primary)/.24),transparent_45%)]" />
          <div className="absolute left-[7%] right-[7%] top-[9%] flex justify-between border-b border-white/10 pb-2 text-[7px] tracking-[.2em]">
            <span className="font-semibold text-white/85">NÜVA ONE</span>
            <span className="text-primary">INTELLIGENCE</span>
          </div>
          <div className="absolute left-[7%] top-[27%] max-w-[58%]">
            <p className="text-[7px] uppercase tracking-[.25em] text-primary">Todo conectado</p>
            <p className="mt-3 text-[clamp(1.2rem,3vw,2.4rem)] font-medium leading-[.95] tracking-[-.05em] text-white">
              Tu negocio genera datos.
            </p>
            <p className="text-[clamp(1.2rem,3vw,2.4rem)] font-medium leading-[.95] tracking-[-.05em] text-white/45">
              Nüva los convierte en decisiones.
            </p>
          </div>
          <div className="absolute bottom-[10%] left-[7%] right-[7%] flex gap-2">
            <span className="h-10 flex-1 rounded-lg border border-white/10 bg-white/[.035]" />
            <span className="h-10 flex-1 rounded-lg border border-primary/20 bg-primary/[.05]" />
            <span className="h-10 flex-1 rounded-lg border border-white/10 bg-white/[.035]" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-[5%] left-[19%] right-[19%] h-[9%] rounded-[1rem_1rem_2.8rem_2.8rem] border border-white/15 bg-[#12151a] shadow-[0_30px_70px_rgba(0,0,0,.9)] [transform:perspective(900px)_rotateX(58deg)]" />
      <div
        className="absolute bottom-[6%] h-[25%] w-[22%] rounded-[2.4rem_2.4rem_1.2rem_1.2rem] bg-[linear-gradient(135deg,rgba(205,190,177,.18),rgba(95,79,70,.04))] blur-[.4px]"
        style={{ left: `${hand}%`, transform: "rotate(-13deg)" }}
      />
      <div className="absolute bottom-[8%] left-[7%] text-[9px] uppercase tracking-[.3em] text-white/25">
        scroll · entrar
      </div>
    </div>
  );
}

function AppScreen({ id, phase }: { id: SceneId; phase: number }) {
  const Icon =
    id === "inventory"
      ? ScanLine
      : id === "finance"
        ? CircleDollarSign
        : id === "crm"
          ? Users
          : id === "ai"
            ? Sparkles
            : id === "score"
              ? Target
              : TrendingUp;
  const title =
    {
      sales: "Ventas en tiempo real",
      inventory: "Inventario + Scanner",
      finance: "Flujo de caja",
      crm: "Clientes",
      ai: "Nüva AI",
      score: "Nüva Score",
    }[id] ?? "Nüva One";
  return (
    <div className="relative h-full w-full p-5 sm:p-10">
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10">
            <Icon className="size-4 text-primary" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">Nüva One</p>
            <p className="text-[9px] text-white/30">Inteligencia conectada</p>
          </div>
        </div>
        <span className="text-[9px] uppercase tracking-[.25em] text-white/25">{title}</span>
      </header>
      {id === "sales" && (
        <div className="flex h-[78%] items-end gap-2 pt-10">
          {[31, 46, 39, 59, 52, 73, 66, 87, 78, 94, 82, 100].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-primary/40"
              style={{ height: `${h + phase * 4}%`, opacity: 0.45 + i * 0.035 }}
            />
          ))}
        </div>
      )}
      {id === "inventory" && (
        <div className="flex h-[78%] items-center justify-center">
          <div className="relative flex aspect-video w-full max-w-3xl items-center justify-center rounded-2xl border border-primary/25 bg-black/30">
            <div
              className="absolute inset-x-[9%] h-px bg-primary shadow-[0_0_30px_hsl(var(--primary)/.95)]"
              style={{ top: `${10 + phase * 80}%` }}
            />
            <div className="absolute inset-[18%] rounded-2xl border border-primary/45" />
            <ScanLine className="size-12 text-primary" />
            <div className="absolute bottom-5 rounded-full bg-black/80 px-4 py-2 text-xs text-primary">
              {phase > 0.68 ? "✓ SKU-1048 · Stock 24 → 25" : "Escaneando · SKU-1048"}
            </div>
          </div>
        </div>
      )}
      {id === "finance" && (
        <div className="pt-12">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-white/30">Disponible</p>
              <p className="mt-2 text-4xl sm:text-6xl">$3.420.000</p>
            </div>
            <div>
              <p className="text-xs text-white/30">Margen</p>
              <p className="mt-2 text-3xl sm:text-5xl">24,8%</p>
            </div>
          </div>
          <div className="mt-14 h-48">
            <svg viewBox="0 0 900 180" className="h-full w-full">
              <path
                d="M0 148 C90 142 110 110 205 122 S310 140 390 78 S510 108 610 60 S760 78 900 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-primary/50"
              />
            </svg>
          </div>
        </div>
      )}
      {id === "crm" && (
        <div className="grid gap-3 pt-12 sm:grid-cols-3">
          {[
            ["Camila R.", "8 compras"],
            ["Felipe M.", "5 compras"],
            ["Antonia S.", "4 compras"],
          ].map(([n, b]) => (
            <div key={n} className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
              <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-sm">
                {n[0]}
              </span>
              <p className="mt-8 text-lg">{n}</p>
              <p className="mt-1 text-xs text-white/35">{b} · cliente recurrente</p>
            </div>
          ))}
        </div>
      )}
      {id === "ai" && (
        <div className="mx-auto max-w-4xl pt-10">
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5 text-base text-white/65">
            ¿Qué debería hacer esta semana para mejorar mis ventas?
          </div>
          <div className="mt-3 rounded-2xl bg-primary/[.08] p-6 text-sm leading-7 text-white/75">
            Prioriza reponer <strong className="text-white">SKU-1048</strong>, contacta a tus
            clientes recurrentes y concentra la promoción en los productos con mayor margen. Nüva
            cruza ventas, inventario, clientes y finanzas para llegar a esta recomendación.
          </div>
        </div>
      )}
      {id === "score" && (
        <div className="flex h-[78%] flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[.3em] text-white/30">Salud del negocio</p>
          <p className="mt-5 text-[clamp(7rem,20vw,12rem)] font-medium leading-none tracking-[-.08em]">
            82
          </p>
          <p className="mt-3 text-sm text-white/40">de 100 · negocio saludable</p>
          <div className="mt-8 h-1.5 w-[min(70vw,460px)] overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary/65" style={{ width: "82%" }} />
          </div>
        </div>
      )}
    </div>
  );
}

function Decision({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#020304] px-6 text-center">
      <div className="max-w-6xl">
        <p className="text-[10px] uppercase tracking-[.4em] text-white/30">
          NÜVA ONE · SIGUIENTE MOVIMIENTO
        </p>
        <h2 className="mt-7 text-[clamp(3.1rem,8vw,8.5rem)] font-medium leading-[.88] tracking-[-.07em] text-white">
          Tu negocio genera datos.
          <br />
          <span className="text-white/40">Nüva los convierte en decisiones.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-sm leading-6 text-white/40">
          De la venta al inventario. Del inventario a las finanzas. De los datos a una decisión
          concreta.
        </p>
        <Link
          to="/auth"
          className="group mt-9 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
        >
          Empieza con Nüva{" "}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <div className="mt-10 text-[9px] tracking-[.3em] text-white/20">
          {Math.round(progress * 100)}% · EXPERIENCIA COMPLETA
        </div>
      </div>
    </div>
  );
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
      setProgress((v) => v + (target.current - v) * 0.09);
      raf.current = requestAnimationFrame(tick);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    raf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);
  const z = progress * WORLD;
  const active = scenes.reduce(
    (a, b) => (Math.abs(b.depth - z) < Math.abs(a.depth - z) ? b : a),
    scenes[0],
  );
  const next = scenes.find((s) => s.depth > z) ?? scenes.at(-1)!;
  const distance = Math.abs(active.depth - z);
  const penetration = clamp(1 - distance / 420);
  const screenScale = active.id === "business" ? 1 + penetration * 0.02 : 1 + penetration * 0.18;
  return (
    <section
      className="relative h-[840vh] bg-[#020304] text-white"
      aria-label="Experiencia cinematográfica Nüva One"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,.045),transparent_34%),linear-gradient(180deg,#080a0d,#010203)]" />
        <div className="absolute inset-0 [perspective:1400px]">
          <div
            className="absolute inset-0 [transform-style:preserve-3d]"
            style={{ transform: `translateZ(${-z}px)` }}
          >
            <div
              className="absolute left-1/2 top-0 h-screen w-screen -translate-x-1/2"
              style={{ transform: "translateZ(0px)" }}
            >
              <PhysicalWorld phase={progress} />
            </div>
            {scenes.slice(1, 7).map((scene) => {
              const d = Math.abs(scene.depth - z);
              const opacity = clamp(1 - d / 900, 0.08, 1);
              const scale = scene.id === next.id ? screenScale : 1;
              return (
                <div
                  key={scene.id}
                  className="absolute left-1/2 top-0 h-screen w-screen -translate-x-1/2"
                  style={{
                    transform: `translateZ(${scene.depth}px)`,
                    opacity,
                    filter: `blur(${Math.min(6, d / 150)}px)`,
                    zIndex: scene.depth <= z ? 2 : 1,
                  }}
                >
                  <GlassScreen zoom={scale} opacity={1}>
                    <AppScreen id={scene.id} phase={clamp(1 - d / 520)} />
                  </GlassScreen>
                </div>
              );
            })}
            <div
              className="absolute left-1/2 top-0 h-screen w-screen -translate-x-1/2"
              style={{ transform: `translateZ(${WORLD}px)` }}
            >
              <Decision progress={progress} />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute left-5 top-1/2 hidden -translate-y-1/2 md:block">
          <div className="space-y-3">
            {scenes.map((s) => (
              <div
                key={s.id}
                className={`h-1 rounded-full transition-all duration-300 ${active.id === s.id ? "w-10 bg-white" : "w-3 bg-white/20"}`}
              />
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-7 inset-x-0 text-center text-[9px] uppercase tracking-[.35em] text-white/25">
          Scroll · entra · explora · decide
        </div>
      </div>
    </section>
  );
}
