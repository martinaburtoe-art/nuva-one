import { useEffect, useState, type CSSProperties, type ComponentType } from "react";
import { Bot, Boxes, BriefcaseBusiness, ChartNoAxesCombined, CircleDollarSign, ClipboardList, Handshake, Package, ReceiptText, ShoppingCart, Sparkles, Users, X } from "lucide-react";

// Timing is deliberately aligned with the CSS animation durations + the longest
// stagger delay. The previous values advanced the React phase before the last
// desktop icon had finished its entrance/convergence animation, causing jumps.
const INTRO = 2300;
const ORBIT = 3200;
const CONVERGE = 1800;
const WELCOME = 2000;
const EXIT = 1400;
const TOTAL = INTRO + ORBIT + CONVERGE + WELCOME + EXIT;

const ITEMS: Array<[string, ComponentType]> = [
  ["IA", Bot], ["Clientes", Users], ["Ventas", ShoppingCart], ["Finanzas", CircleDollarSign],
  ["Caja", ReceiptText], ["Compras", ClipboardList], ["Inventario", Package], ["CRM", Handshake],
  ["Gestión", BriefcaseBusiness], ["Datos", Boxes], ["Insights", ChartNoAxesCombined],
];

export function NuvaLaunchExperience({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"intro" | "orbit" | "converge" | "welcome" | "exit">("intro");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    if (media.matches) {
      const timer = window.setTimeout(onComplete, 900);
      return () => window.clearTimeout(timer);
    }

    const timers = [
      window.setTimeout(() => setPhase("orbit"), INTRO),
      window.setTimeout(() => setPhase("converge"), INTRO + ORBIT),
      window.setTimeout(() => setPhase("welcome"), INTRO + ORBIT + CONVERGE),
      window.setTimeout(() => setPhase("exit"), INTRO + ORBIT + CONVERGE + WELCOME),
      window.setTimeout(onComplete, TOTAL),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [onComplete]);

  const skip = () => {
    setPhase("exit");
    window.setTimeout(onComplete, EXIT);
  };

  return (
    <div aria-label="Bienvenido a Nüva One" aria-live="polite" className={`nuva-launch nuva-launch--${phase} ${reduced ? "nuva-launch--reduced" : ""}`}>
      <div className="nuva-launch__ambient" />
      <div className="nuva-launch__grid" />
      <div className="nuva-launch__light-beam nuva-launch__light-beam--one" />
      <div className="nuva-launch__light-beam nuva-launch__light-beam--two" />
      <div className="nuva-launch__ring nuva-launch__ring--outer" />
      <div className="nuva-launch__ring nuva-launch__ring--inner" />
      <div className="nuva-launch__stage">
        <div className="nuva-launch__orbit" aria-hidden="true">
          {ITEMS.map(([label, Icon], index) => (
            <div
              key={label}
              className="nuva-launch__module"
              style={{ "--nuva-angle": `${-90 + index * 33}deg`, "--nuva-delay": `${index * 65}ms` } as CSSProperties}
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
      <button type="button" aria-label="Omitir animación" onClick={skip} className="nuva-launch__skip">
        <X aria-hidden="true" /><span>Omitir</span>
      </button>
    </div>
  );
}
