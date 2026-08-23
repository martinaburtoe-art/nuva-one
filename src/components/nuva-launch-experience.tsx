import { useEffect } from "react";
import { X } from "lucide-react";

const LAUNCH_DURATION = 6500;

export function NuvaLaunchExperience({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      const timer = window.setTimeout(onComplete, 900);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(onComplete, LAUNCH_DURATION);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div aria-label="Bienvenido a Nüva One" aria-live="polite" className="nuva-launch">
      <div className="nuva-launch__ambient" />
      <div className="nuva-launch__grid" />
      <div className="nuva-launch__light-beam nuva-launch__light-beam--one" />
      <div className="nuva-launch__light-beam nuva-launch__light-beam--two" />
      <div className="nuva-launch__ring nuva-launch__ring--outer" />
      <div className="nuva-launch__ring nuva-launch__ring--inner" />

      <div className="nuva-launch__stage">
        <div className="nuva-launch__orbit" aria-hidden="true">
          {[
            ["IA", "Bot", -90], ["Clientes", "Users", -57], ["Ventas", "ShoppingCart", -24],
            ["Finanzas", "CircleDollarSign", 9], ["Caja", "ReceiptText", 42], ["Compras", "ClipboardList", 75],
            ["Inventario", "Package", 108], ["CRM", "Handshake", 141], ["Gestión", "BriefcaseBusiness", 174],
            ["Datos", "Boxes", 207], ["Insights", "ChartNoAxesCombined", 240],
          ].map(([label, icon, angle], index) => {
            const icons: Record<string, React.ComponentType<{ className?: string }>> = {
              Bot: require("lucide-react").Bot,
              Users: require("lucide-react").Users,
              ShoppingCart: require("lucide-react").ShoppingCart,
              CircleDollarSign: require("lucide-react").CircleDollarSign,
              ReceiptText: require("lucide-react").ReceiptText,
              ClipboardList: require("lucide-react").ClipboardList,
              Package: require("lucide-react").Package,
              Handshake: require("lucide-react").Handshake,
              BriefcaseBusiness: require("lucide-react").BriefcaseBusiness,
              Boxes: require("lucide-react").Boxes,
              ChartNoAxesCombined: require("lucide-react").ChartNoAxesCombined,
            };
            const Icon = icons[icon];
            return (
              <div key={label} className="nuva-launch__module" style={{ "--nuva-angle": `${angle}deg`, "--nuva-delay": `${index * 95}ms` } as React.CSSProperties}>
                <div className="nuva-launch__module-icon"><Icon /></div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        <div className="nuva-launch__core">
          <div className="nuva-launch__core-halo" />
          <div className="nuva-launch__core-ring" />
          <div className="nuva-launch__core-pulse" />
          <div className="nuva-launch__logo"><span>Nüva</span><small>ONE</small></div>
          <div className="nuva-launch__spark nuva-launch__spark--one" />
          <div className="nuva-launch__spark nuva-launch__spark--two" />
        </div>

        <div className="nuva-launch__tagline"><span>✦</span><span>Inteligencia para tu negocio</span></div>
        <div className="nuva-launch__welcome">
          <div className="nuva-launch__welcome-title">Bienvenido a Nüva One</div>
          <div className="nuva-launch__welcome-subtitle">Todo tu negocio. Una inteligencia.</div>
        </div>
      </div>

      <button type="button" aria-label="Omitir animación" onClick={onComplete} className="nuva-launch__skip">
        <X aria-hidden="true" />
        <span>Omitir</span>
      </button>
    </div>
  );
}
