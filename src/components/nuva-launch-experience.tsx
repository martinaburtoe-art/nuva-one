import { useEffect, useState, type CSSProperties } from "react";
import {
  Bot,
  Boxes,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  Handshake,
  Package,
  ReceiptText,
  ShoppingCart,
  Sparkles,
  Users,
  X,
} from "lucide-react";

const items = [
  ["IA", Bot, -90], ["Clientes", Users, -57], ["Ventas", ShoppingCart, -24],
  ["Finanzas", CircleDollarSign, 9], ["Caja", ReceiptText, 42],
  ["Compras", ClipboardList, 75], ["Inventario", Package, 108],
  ["CRM", Handshake, 141], ["Gestión", BriefcaseBusiness, 174],
  ["Datos", Boxes, 207], ["Insights", ChartNoAxesCombined, 240],
] as const;

const FULL_DURATION = 4600;
const REDUCED_DURATION = 1200;

export function NuvaLaunchExperience({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onComplete();
    }, media.matches ? REDUCED_DURATION : FULL_DURATION);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  const finish = () => {
    setVisible(false);
    onComplete();
  };

  if (!visible) return null;

  return (
    <div aria-label="Nüva One" aria-live="polite" className={`nuva-launch ${reduced ? "nuva-launch--reduced" : ""}`}>
      <div className="nuva-launch__ambient" />
      <div className="nuva-launch__grid" />
      <div className="nuva-launch__ring nuva-launch__ring--outer" />
      <div className="nuva-launch__ring nuva-launch__ring--inner" />
      <div className="nuva-launch__stage">
        <div className="nuva-launch__orbit">
          {items.map(([label, Icon, angle], index) => (
            <div key={label} className="nuva-launch__module" style={{ "--nuva-angle": `${angle}deg`, "--nuva-delay": `${index * 55}ms` } as CSSProperties}>
              <div className="nuva-launch__module-icon"><Icon aria-hidden="true" /></div>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="nuva-launch__core">
          <div className="nuva-launch__core-halo" />
          <div className="nuva-launch__core-ring" />
          <div className="nuva-launch__logo"><span>Nüva</span><small>ONE</small></div>
          <div className="nuva-launch__spark nuva-launch__spark--one" />
          <div className="nuva-launch__spark nuva-launch__spark--two" />
        </div>
        <div className="nuva-launch__tagline"><Sparkles aria-hidden="true" /><span>Inteligencia para tu negocio</span></div>
      </div>
      <button type="button" aria-label="Omitir animación" onClick={finish} className="nuva-launch__skip"><X aria-hidden="true" /><span>Omitir</span></button>
    </div>
  );
}
