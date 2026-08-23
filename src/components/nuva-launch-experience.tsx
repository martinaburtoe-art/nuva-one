import { useEffect, useState, type CSSProperties, type ComponentType } from "react";
import { Bot, Boxes, BriefcaseBusiness, ChartNoAxesCombined, CircleDollarSign, ClipboardList, Handshake, Package, ReceiptText, ShoppingCart, Sparkles, Users, X } from "lucide-react";

// One continuous timeline. CSS owns the choreography; React only controls completion/skip.
const DURATION = 9000;
const EXIT = 1200;

const ITEMS: Array<[string, ComponentType]> = [
  ["IA", Bot], ["Clientes", Users], ["Ventas", ShoppingCart], ["Finanzas", CircleDollarSign],
  ["Caja", ReceiptText], ["Compras", ClipboardList], ["Inventario", Package], ["CRM", Handshake],
  ["Gestión", BriefcaseBusiness], ["Datos", Boxes], ["Insights", ChartNoAxesCombined],
];

export function NuvaLaunchExperience({ onComplete }: { onComplete: () => void }) {
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      const timer = window.setTimeout(onComplete, 700);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(onComplete, DURATION);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  const skip = () => {
    if (skipping) return;
    setSkipping(true);
    window.setTimeout(onComplete, EXIT);
  };

  return (
    <div aria-label="Bienvenido a Nüva One" aria-live="polite" className={`nuva-launch ${skipping ? "nuva-launch--exit" : ""}`}>
      <div className="nuva-launch__ambient" /><div className="nuva-launch__grid" />
      <div className="nuva-launch__light-beam nuva-launch__light-beam--one" /><div className="nuva-launch__light-beam nuva-launch__light-beam--two" />
      <div className="nuva-launch__ring nuva-launch__ring--outer" /><div className="nuva-launch__ring nuva-launch__ring--inner" />
      <div className="nuva-launch__stage">
        <div className="nuva-launch__orbit" aria-hidden="true">
          {ITEMS.map(([label, Icon], index) => (
            <div key={label} className="nuva-launch__module" style={{ "--nuva-angle": `${-90 + index * (360 / ITEMS.length)}deg`, "--nuva-delay": `${index * 55}ms` } as CSSProperties}>
              <div className="nuva-launch__module-icon"><Icon /></div><span>{label}</span>
            </div>
          ))}
        </div>
        <div className="nuva-launch__core"><div className="nuva-launch__core-halo"/><div className="nuva-launch__core-ring"/><div className="nuva-launch__core-pulse"/><div className="nuva-launch__logo"><span>Nüva</span><small>ONE</small></div><div className="nuva-launch__spark nuva-launch__spark--one"/><div className="nuva-launch__spark nuva-launch__spark--two"/></div>
        <div className="nuva-launch__tagline"><Sparkles aria-hidden="true"/><span>Inteligencia para tu negocio</span></div>
        <div className="nuva-launch__welcome"><div className="nuva-launch__welcome-title">Bienvenido a Nüva One</div><div className="nuva-launch__welcome-subtitle">Todo tu negocio. Una inteligencia.</div></div>
      </div>
      <button type="button" aria-label="Omitir animación" onClick={skip} className="nuva-launch__skip"><X aria-hidden="true"/><span>Omitir</span></button>
    </div>
  );
}
