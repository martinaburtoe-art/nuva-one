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

// Deliberate cinematic timeline: reveal -> orbit -> converge -> welcome -> gradient exit.
const INTRO_MS = 2200;
const ORBIT_MS = 3300;
const CONVERGE_MS = 1500;
const WELCOME_MS = 2200;
const EXIT_MS = 1800;
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
    <div aria-label="Bienvenido a Nüva One" aria-live="polite"
      className={`nuva-launch ${reduced ? "nuva-launch--reduced" : ""} ${phaseClass}`}
      style={{
        "--nuva-intro-ms": `${INTRO_MS}ms`, "--nuva-orbit-ms": `${ORBIT_MS}ms`,
        "--nuva-converge-ms": `${CONVERGE_MS}ms`, "--nuva-welcome-ms": `${WELCOME_MS}ms`,
        "--nuva-exit-ms": `${EXIT_MS}ms`,
      } as CSSProperties}>
      <style>{`
        .nuva-launch--intro .nuva-launch__welcome,.nuva-launch--orbit .nuva-launch__welcome,.nuva-launch--converge .nuva-launch__welcome{opacity:0;visibility:hidden}
        .nuva-launch--welcome .nuva-launch__welcome{opacity:1;visibility:visible;animation:nuva-welcome-in 850ms cubic-bezier(.16,1,.3,1) both}
        .nuva-launch--exit .nuva-launch__welcome{opacity:1;visibility:visible;animation:nuva-welcome-out ${EXIT_MS}ms cubic-bezier(.22,1,.36,1) forwards}
        .nuva-launch--exit{animation:nuva-scene-out ${EXIT_MS}ms cubic-bezier(.22,1,.36,1) forwards;will-change:opacity,transform,filter}
        .nuva-launch--exit .nuva-launch__ambient{animation:nuva-ambient-out ${EXIT_MS}ms cubic-bezier(.22,1,.36,1) forwards}
        .nuva-launch--exit .nuva-launch__grid,.nuva-launch--exit .nuva-launch__light-beam,.nuva-launch--exit .nuva-launch__ring,.nuva-launch--exit .nuva-launch__orbit,.nuva-launch--exit .nuva-launch__core,.nuva-launch--exit .nuva-launch__tagline{opacity:.2;filter:blur(2px);transition:opacity ${EXIT_MS}ms cubic-bezier(.22,1,.36,1),filter ${EXIT_MS}ms cubic-bezier(.22,1,.36,1),transform ${EXIT_MS}ms cubic-bezier(.22,1,.36,1)};transform:scale(1.035)}
        .nuva-launch__welcome{position:absolute!important;top:50%!important;left:50%!important;z-index:30!important;width:min(94vw,1200px);transform:translate(-50%,-50%);text-align:center;pointer-events:none}
        .nuva-launch__welcome-title{font-size:clamp(3rem,8vw,7.4rem)!important;font-weight:800!important;line-height:1.02;letter-spacing:-.055em;color:#080812!important;text-shadow:0 3px 20px rgba(255,255,255,.98),0 0 50px rgba(139,92,246,.2)}
        .nuva-launch__welcome-subtitle{font-size:clamp(1rem,2.1vw,1.5rem)!important;margin-top:.8rem;color:#11111b!important;font-weight:600}
        @keyframes nuva-welcome-in{0%{opacity:0;transform:translate(-50%,-50%) scale(.88);filter:blur(18px)}55%{opacity:1;transform:translate(-50%,-50%) scale(1.015);filter:blur(0)}100%{opacity:1;transform:translate(-50%,-50%) scale(1);filter:blur(0)}}
        @keyframes nuva-welcome-out{0%{opacity:1;transform:translate(-50%,-50%) scale(1);filter:blur(0)}45%{opacity:.75;transform:translate(-50%,-50%) scale(1.012);filter:blur(1px)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.045);filter:blur(10px)}}
        @keyframes nuva-scene-out{0%{opacity:1;transform:scale(1);filter:blur(0)}45%{opacity:.92;transform:scale(1.008);filter:blur(.4px)}100%{opacity:0;transform:scale(1.035);filter:blur(7px)}}
        @keyframes nuva-ambient-out{0%{opacity:1;transform:scale(1);filter:blur(0)}100%{opacity:0;transform:scale(1.12);filter:blur(12px)}}
        .nuva-launch--reduced{animation:none!important}.nuva-launch--reduced .nuva-launch__welcome{opacity:1!important;visibility:visible!important;animation:none!important}
      `}</style>
      <div className="nuva-launch__ambient" /><div className="nuva-launch__grid" />
      <div className="nuva-launch__light-beam nuva-launch__light-beam--one" /><div className="nuva-launch__light-beam nuva-launch__light-beam--two" />
      <div className="nuva-launch__ring nuva-launch__ring--outer" /><div className="nuva-launch__ring nuva-launch__ring--inner" />
      <div className="nuva-launch__stage">
        <div className="nuva-launch__orbit" aria-hidden="true">{items.map(([label, Icon, angle], index) => <div key={label} className="nuva-launch__module" style={{"--nuva-angle":`${angle}deg`,"--nuva-delay":`${index*110}ms`} as CSSProperties}><div className="nuva-launch__module-icon"><Icon /></div><span>{label}</span></div>)}</div>
        <div className="nuva-launch__core"><div className="nuva-launch__core-halo"/><div className="nuva-launch__core-ring"/><div className="nuva-launch__core-pulse"/><div className="nuva-launch__logo"><span>Nüva</span><small>ONE</small></div><div className="nuva-launch__spark nuva-launch__spark--one"/><div className="nuva-launch__spark nuva-launch__spark--two"/></div>
        <div className="nuva-launch__tagline"><Sparkles aria-hidden="true"/><span>Inteligencia para tu negocio</span></div>
        <div className="nuva-launch__welcome"><div className="nuva-launch__welcome-title">Bienvenido a Nüva One</div><div className="nuva-launch__welcome-subtitle">Todo tu negocio. Una inteligencia.</div></div>
      </div>
      <button type="button" aria-label="Omitir animación" onClick={finish} className="nuva-launch__skip"><X aria-hidden="true"/><span>Omitir</span></button>
    </div>
  );
}
