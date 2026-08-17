import { useEffect, useState, type CSSProperties } from "react";
import {
  Bot, Boxes, BriefcaseBusiness, ChartNoAxesCombined, CircleDollarSign,
  ClipboardList, Handshake, Package, ReceiptText, ShoppingCart, Sparkles, Users, X,
} from "lucide-react";

const items = [
  ["IA", Bot, -90], ["Clientes", Users, -57], ["Ventas", ShoppingCart, -24],
  ["Finanzas", CircleDollarSign, 9], ["Caja", ReceiptText, 42], ["Compras", ClipboardList, 75],
  ["Inventario", Package, 108], ["CRM", Handshake, 141], ["Gestión", BriefcaseBusiness, 174],
  ["Datos", Boxes, 207], ["Insights", ChartNoAxesCombined, 240],
] as const;

// Cinematic timeline: reveal -> orbit -> converge -> welcome -> dissolve.
const INTRO_MS = 2200;
const ORBIT_MS = 4200;
const CONVERGE_MS = 1600;
const WELCOME_MS = 2400;
const EXIT_MS = 1900;
const FULL_DURATION = INTRO_MS + ORBIT_MS + CONVERGE_MS + WELCOME_MS + EXIT_MS;
const REDUCED_DURATION = 1400;
const ORBIT_START = INTRO_MS;
const CONVERGE_START = INTRO_MS + ORBIT_MS;
const WELCOME_START = CONVERGE_START + CONVERGE_MS;
const EXIT_START = WELCOME_START + WELCOME_MS;

export function NuvaLaunchExperience({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [phase, setPhase] = useState<"intro" | "orbit" | "converge" | "welcome" | "exit">("intro");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isReduced = media.matches;
    setReduced(isReduced);
    setVisible(true);

    if (isReduced) {
      const timer = window.setTimeout(() => { setVisible(false); onComplete(); }, REDUCED_DURATION);
      return () => window.clearTimeout(timer);
    }

    const timers = [
      window.setTimeout(() => setPhase("orbit"), ORBIT_START),
      window.setTimeout(() => setPhase("converge"), CONVERGE_START),
      window.setTimeout(() => setPhase("welcome"), WELCOME_START),
      window.setTimeout(() => setPhase("exit"), EXIT_START),
      window.setTimeout(() => { setVisible(false); onComplete(); }, FULL_DURATION),
    ];

    return () => timers.forEach(window.clearTimeout);
  }, [onComplete]);

  const finish = () => {
    setPhase("exit");
    window.setTimeout(() => { setVisible(false); onComplete(); }, EXIT_MS);
  };

  if (!visible) return null;
  const phaseClass = `nuva-launch--${phase}`;

  return (
    <div
      aria-label="Bienvenido a Nüva One"
      aria-live="polite"
      className={`nuva-launch ${reduced ? "nuva-launch--reduced" : ""} ${phaseClass}`}
    >
      <style>{`
        /* Nüva launch v2: the phase state is the single source of truth. */
        .nuva-launch .nuva-launch__module { animation: none !important; }
        .nuva-launch__orbit { transform-origin: 50% 50%; }

        /* INTRO: modules are born from the Nüva core. */
        .nuva-launch--intro .nuva-launch__module {
          opacity: 0;
          filter: blur(12px);
          transform: translate(-50%,-50%) rotate(var(--nuva-angle)) translateY(0) rotate(calc(-1 * var(--nuva-angle))) scale(.2);
          transition: opacity 700ms cubic-bezier(.16,1,.3,1), filter 900ms cubic-bezier(.16,1,.3,1), transform 1200ms cubic-bezier(.16,1,.3,1);
          transition-delay: var(--nuva-delay);
        }

        /* ORBIT: stable circular arrangement plus subtle individual float. */
        .nuva-launch--orbit .nuva-launch__orbit {
          animation: nuva-orbit-drift ${ORBIT_MS}ms cubic-bezier(.45,0,.55,1) both;
        }
        .nuva-launch--orbit .nuva-launch__module {
          opacity: 1;
          filter: blur(0);
          transform: translate(-50%,-50%) rotate(var(--nuva-angle)) translateY(calc(-1 * var(--nuva-radius))) rotate(calc(-1 * var(--nuva-angle))) scale(1);
          transition: opacity 900ms cubic-bezier(.16,1,.3,1), filter 900ms cubic-bezier(.16,1,.3,1), transform 1200ms cubic-bezier(.16,1,.3,1);
          transition-delay: var(--nuva-delay);
          animation: nuva-module-float ${ORBIT_MS}ms cubic-bezier(.37,0,.63,1) var(--nuva-delay) both;
        }

        /* CONVERGE: all modules travel inward together, preserving radial order. */
        .nuva-launch--converge .nuva-launch__module {
          opacity: .12;
          filter: blur(5px);
          transform: translate(-50%,-50%) rotate(var(--nuva-angle)) translateY(0) rotate(calc(-1 * var(--nuva-angle))) scale(.28);
          transition: transform ${CONVERGE_MS}ms cubic-bezier(.65,0,.25,1), opacity ${CONVERGE_MS}ms ease, filter ${CONVERGE_MS}ms ease;
          transition-delay: calc(var(--nuva-delay) * .18);
        }
        .nuva-launch--converge .nuva-launch__orbit { animation: none; }

        /* CORE: becomes the only visual anchor after convergence. */
        .nuva-launch--intro .nuva-launch__core { transform: scale(.84); opacity: .72; }
        .nuva-launch--orbit .nuva-launch__core { transform: scale(1); opacity: 1; transition: transform 1000ms cubic-bezier(.16,1,.3,1), opacity 800ms ease; }
        .nuva-launch--converge .nuva-launch__core { transform: scale(1.1); opacity: 1; transition: transform ${CONVERGE_MS}ms cubic-bezier(.16,1,.3,1); }
        .nuva-launch--welcome .nuva-launch__core { transform: scale(.72); opacity: .12; transition: transform 900ms cubic-bezier(.22,1,.36,1), opacity 900ms ease; }

        /* WELCOME: one clean hero moment, centered on the viewport. */
        .nuva-launch--intro .nuva-launch__welcome,
        .nuva-launch--orbit .nuva-launch__welcome,
        .nuva-launch--converge .nuva-launch__welcome { opacity: 0; visibility: hidden; }
        .nuva-launch--welcome .nuva-launch__welcome {
          opacity: 1; visibility: visible;
          animation: nuva-welcome-in 900ms cubic-bezier(.16,1,.3,1) both;
        }
        .nuva-launch--exit .nuva-launch__welcome {
          opacity: 1; visibility: visible;
          animation: nuva-welcome-out ${EXIT_MS}ms cubic-bezier(.22,1,.36,1) forwards;
        }

        /* EXIT: continuous dissolve instead of a hard cut. */
        .nuva-launch--exit {
          animation: nuva-scene-out ${EXIT_MS}ms cubic-bezier(.22,1,.36,1) forwards;
          will-change: opacity, transform, filter;
        }
        .nuva-launch--exit .nuva-launch__ambient {
          animation: nuva-ambient-out ${EXIT_MS}ms cubic-bezier(.22,1,.36,1) forwards;
        }
        .nuva-launch--exit .nuva-launch__grid,
        .nuva-launch--exit .nuva-launch__light-beam,
        .nuva-launch--exit .nuva-launch__ring,
        .nuva-launch--exit .nuva-launch__orbit,
        .nuva-launch--exit .nuva-launch__core,
        .nuva-launch--exit .nuva-launch__tagline {
          opacity: .1;
          filter: blur(3px);
          transform: scale(1.045);
          transition: opacity ${EXIT_MS}ms cubic-bezier(.22,1,.36,1), filter ${EXIT_MS}ms cubic-bezier(.22,1,.36,1), transform ${EXIT_MS}ms cubic-bezier(.22,1,.36,1);
        }

        .nuva-launch__welcome {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          z-index: 30 !important;
          width: min(94vw, 1200px);
          transform: translate(-50%,-50%);
          text-align: center;
          pointer-events: none;
        }
        .nuva-launch__welcome-title {
          font-size: clamp(3rem, 8vw, 7.4rem) !important;
          font-weight: 800 !important;
          line-height: 1.02;
          letter-spacing: -.055em;
          color: #080812 !important;
          text-shadow: 0 3px 20px rgba(255,255,255,.98), 0 0 50px rgba(139,92,246,.2);
        }
        .nuva-launch__welcome-subtitle {
          font-size: clamp(1rem, 2.1vw, 1.5rem) !important;
          margin-top: .8rem;
          color: #11111b !important;
          font-weight: 600;
        }

        @keyframes nuva-orbit-drift {
          0% { transform: rotate(-2deg); }
          35% { transform: rotate(2deg); }
          70% { transform: rotate(-1deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes nuva-module-float {
          0% { margin-top: 0; }
          22% { margin-top: -7px; }
          52% { margin-top: 4px; }
          78% { margin-top: -3px; }
          100% { margin-top: 0; }
        }
        @keyframes nuva-welcome-in {
          0% { opacity: 0; transform: translate(-50%,-50%) scale(.88); filter: blur(18px); }
          55% { opacity: 1; transform: translate(-50%,-50%) scale(1.015); filter: blur(0); }
          100% { opacity: 1; transform: translate(-50%,-50%) scale(1); filter: blur(0); }
        }
        @keyframes nuva-welcome-out {
          0% { opacity: 1; transform: translate(-50%,-50%) scale(1); filter: blur(0); }
          45% { opacity: .72; transform: translate(-50%,-50%) scale(1.012); filter: blur(1px); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1.045); filter: blur(10px); }
        }
        @keyframes nuva-scene-out {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          45% { opacity: .9; transform: scale(1.008); filter: blur(.5px); }
          100% { opacity: 0; transform: scale(1.035); filter: blur(7px); }
        }
        @keyframes nuva-ambient-out {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          100% { opacity: 0; transform: scale(1.12); filter: blur(12px); }
        }

        .nuva-launch--reduced { animation: none !important; }
        .nuva-launch--reduced .nuva-launch__welcome { opacity: 1 !important; visibility: visible !important; animation: none !important; }
        @media (max-width: 640px) {
          .nuva-launch__stage { width: 100vw; height: 100vw; max-height: 100svh; }
          .nuva-launch__module { --nuva-radius: min(35vw, 165px); min-width: 58px; gap: 5px; }
          .nuva-launch__module-icon { width: 42px; height: 42px; border-radius: 13px; }
          .nuva-launch__module-icon svg { width: 19px; height: 19px; }
          .nuva-launch__module span { font-size: 8px; }
          .nuva-launch__core { width: 155px; height: 155px; }
          .nuva-launch__welcome-title { font-size: clamp(2.6rem, 12vw, 4.6rem) !important; }
        }
      `}</style>

      <div className="nuva-launch__ambient" />
      <div className="nuva-launch__grid" />
      <div className="nuva-launch__light-beam nuva-launch__light-beam--one" />
      <div className="nuva-launch__light-beam nuva-launch__light-beam--two" />
      <div className="nuva-launch__ring nuva-launch__ring--outer" />
      <div className="nuva-launch__ring nuva-launch__ring--inner" />

      <div className="nuva-launch__stage">
        <div className="nuva-launch__orbit" aria-hidden="true">
          {items.map(([label, Icon, angle], index) => (
            <div
              key={label}
              className="nuva-launch__module"
              style={{ "--nuva-angle": `${angle}deg`, "--nuva-delay": `${index * 95}ms` } as CSSProperties}
            >
              <div className="nuva-launch__module-icon"><Icon /></div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="nuva-launch__core">
          <div className="nuva-launch__core-halo" />
          <div className="nuva-launch__core-ring" />
          <div className="nuva-launch__core-pulse" />
          <div className="nuva-launch__logo"><span>Nüva</span><small>ONE</small></div>
          <div className="nuva-launch__spark nuva-launch__spark--one" />
          <div className="nuva-launch__spark nuva-launch__spark--two" />
        </div>

        <div className="nuva-launch__tagline"><Sparkles aria-hidden="true" /><span>Inteligencia para tu negocio</span></div>
        <div className="nuva-launch__welcome">
          <div className="nuva-launch__welcome-title">Bienvenido a Nüva One</div>
          <div className="nuva-launch__welcome-subtitle">Todo tu negocio. Una inteligencia.</div>
        </div>
      </div>

      <button type="button" aria-label="Omitir animación" onClick={finish} className="nuva-launch__skip">
        <X aria-hidden="true" /><span>Omitir</span>
      </button>
    </div>
  );
}
