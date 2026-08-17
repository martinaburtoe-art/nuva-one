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

// Cinematic sequence: product reveal -> central welcome -> soft gradient exit.
const FULL_DURATION = 10500;
const REDUCED_DURATION = 1800;
const EXIT_DURATION = 2000;
const WELCOME_DELAY = 6500;

export function NuvaLaunchExperience({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    setVisible(true);
    const total = media.matches ? REDUCED_DURATION : FULL_DURATION;
    const exitAt = Math.max(0, total - EXIT_DURATION);
    const exitTimer = window.setTimeout(() => setExiting(true), exitAt);
    const completeTimer = window.setTimeout(() => { setVisible(false); onComplete(); }, total);
    return () => { window.clearTimeout(exitTimer); window.clearTimeout(completeTimer); };
  }, [onComplete]);

  const finish = () => {
    setExiting(true);
    window.setTimeout(() => { setVisible(false); onComplete(); }, EXIT_DURATION);
  };
  if (!visible) return null;

  return (
    <div aria-label="Bienvenido a Nüva One" aria-live="polite"
      className={`nuva-launch ${reduced ? "nuva-launch--reduced" : ""} ${exiting ? "nuva-launch--exiting" : ""}`}
      style={{ "--nuva-welcome-delay": `${WELCOME_DELAY}ms` } as CSSProperties}>
      <style>{`
        .nuva-launch--exiting { animation: nuva-launch-exit ${EXIT_DURATION}ms cubic-bezier(.16,1,.3,1) forwards !important; will-change: opacity,transform,filter; }
        .nuva-launch--exiting .nuva-launch__ambient { animation: nuva-launch-exit-ambient ${EXIT_DURATION}ms cubic-bezier(.16,1,.3,1) forwards !important; }
        .nuva-launch--exiting .nuva-launch__grid,.nuva-launch--exiting .nuva-launch__light-beam,.nuva-launch--exiting .nuva-launch__ring,.nuva-launch--exiting .nuva-launch__orbit,.nuva-launch--exiting .nuva-launch__core,.nuva-launch--exiting .nuva-launch__tagline { animation-play-state: paused !important; transition: opacity ${EXIT_DURATION}ms cubic-bezier(.16,1,.3,1),filter ${EXIT_DURATION}ms cubic-bezier(.16,1,.3,1),transform ${EXIT_DURATION}ms cubic-bezier(.16,1,.3,1); opacity:.1; filter:blur(3px); }
        .nuva-launch--exiting .nuva-launch__welcome { animation: nuva-welcome-exit ${EXIT_DURATION}ms cubic-bezier(.16,1,.3,1) forwards !important; }
        .nuva-launch__welcome { top:50% !important; left:50%; z-index:20; opacity:0; white-space:nowrap; text-align:center; transform:translate(-50%,-50%); animation:nuva-welcome-final 1000ms cubic-bezier(.16,1,.3,1) var(--nuva-welcome-delay) both; }
        .nuva-launch__welcome-title { font-size:clamp(2.7rem,7vw,6.8rem) !important; font-weight:800 !important; letter-spacing:-.055em; line-height:1.02; color:#080812 !important; text-shadow:0 3px 18px rgba(255,255,255,.96),0 0 42px rgba(139,92,246,.18); }
        .nuva-launch__welcome-subtitle { font-size:clamp(1rem,2vw,1.45rem) !important; margin-top:.75rem; color:#11111b !important; font-weight:600; letter-spacing:-.01em; }
        @keyframes nuva-welcome-final { 0%{opacity:0;transform:translate(-50%,-50%) scale(.94);filter:blur(16px)} 35%{opacity:1;transform:translate(-50%,-50%) scale(1);filter:blur(0)} 100%{opacity:1;transform:translate(-50%,-50%) scale(1);filter:blur(0)} }
        @keyframes nuva-welcome-exit { 0%{opacity:1;transform:translate(-50%,-50%) scale(1);filter:blur(0)} 45%{opacity:.72;transform:translate(-50%,-50%) scale(1.012);filter:blur(1px)} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.035);filter:blur(12px)} }
        @keyframes nuva-launch-exit { 0%{opacity:1;transform:scale(1);filter:blur(0)} 30%{opacity:.98;transform:scale(1.004);filter:blur(.1px)} 68%{opacity:.58;transform:scale(1.018);filter:blur(1.5px)} 100%{opacity:0;transform:scale(1.045);filter:blur(8px)} }
        @keyframes nuva-launch-exit-ambient { 0%{opacity:1;transform:scale(1);filter:blur(0)} 55%{opacity:.55;transform:scale(1.045);filter:blur(2px)} 100%{opacity:0;transform:scale(1.12);filter:blur(13px)} }
        @media (prefers-reduced-motion:reduce){.nuva-launch__welcome{animation:none!important;opacity:1;transform:translate(-50%,-50%);filter:none}.nuva-launch--exiting{animation-duration:450ms!important}}
      `}</style>
      <div className="nuva-launch__ambient" /><div className="nuva-launch__grid" />
      <div className="nuva-launch__light-beam nuva-launch__light-beam--one" /><div className="nuva-launch__light-beam nuva-launch__light-beam--two" />
      <div className="nuva-launch__ring nuva-launch__ring--outer" /><div className="nuva-launch__ring nuva-launch__ring--inner" />
      <div className="nuva-launch__stage">
        <div className="nuva-launch__orbit" aria-hidden="true">{items.map(([label, Icon, angle], index) => <div key={label} className="nuva-launch__module" style={{"--nuva-angle":`${angle}deg`,"--nuva-delay":`${index*90}ms`} as CSSProperties}><div className="nuva-launch__module-icon"><Icon /></div><span>{label}</span></div>)}</div>
        <div className="nuva-launch__core"><div className="nuva-launch__core-halo"/><div className="nuva-launch__core-ring"/><div className="nuva-launch__core-pulse"/><div className="nuva-launch__logo"><span>Nüva</span><small>ONE</small></div><div className="nuva-launch__spark nuva-launch__spark--one"/><div className="nuva-launch__spark nuva-launch__spark--two"/></div>
        <div className="nuva-launch__tagline"><Sparkles aria-hidden="true"/><span>Inteligencia para tu negocio</span></div>
        <div className="nuva-launch__welcome" aria-live="polite"><div className="nuva-launch__welcome-title">Bienvenido a Nüva One</div><div className="nuva-launch__welcome-subtitle">Todo tu negocio. Una inteligencia.</div></div>
      </div>
      <button type="button" aria-label="Omitir animación" onClick={finish} className="nuva-launch__skip"><X aria-hidden="true"/><span>Omitir</span></button>
    </div>
  );
}
