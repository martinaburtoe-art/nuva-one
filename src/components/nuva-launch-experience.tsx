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
  ["IA", Bot, -90],
  ["Clientes", Users, -57],
  ["Ventas", ShoppingCart, -24],
  ["Finanzas", CircleDollarSign, 9],
  ["Caja", ReceiptText, 42],
  ["Compras", ClipboardList, 75],
  ["Inventario", Package, 108],
  ["CRM", Handshake, 141],
  ["Gestión", BriefcaseBusiness, 174],
  ["Datos", Boxes, 207],
  ["Insights", ChartNoAxesCombined, 240],
] as const;

const FULL_DURATION = 5200;
const REDUCED_DURATION = 1400;

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
    <div
      aria-label="Bienvenido a Nüva One"
      aria-live="polite"
      className={`nuva-launch ${reduced ? "nuva-launch--reduced" : ""}`}
    >
      <div className="nuva-launch__ambient" />
      <div className="nuva-launch__grid" />
      <div className="nuva-launch__ring nuva-launch__ring--outer" />
      <div className="nuva-launch__ring nuva-launch__ring--inner" />

      <div className="nuva-launch__stage">
        <div
          className="nuva-launch__welcome"
          style={{
            position: "absolute",
            top: "5%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5,
            textAlign: "center",
            whiteSpace: "nowrap",
            animation: "nuva-launch-welcome 1100ms cubic-bezier(.16,1,.3,1) 120ms both",
          }}
        >
          <div
            style={{
              color: "#09090b",
              fontSize: "clamp(18px, 3.2vw, 30px)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              textShadow: "0 1px 0 rgba(255,255,255,.5)",
            }}
          >
            Bienvenido a Nüva One
          </div>
          <div
            style={{
              marginTop: 7,
              color: "#09090b",
              fontSize: "clamp(10px, 1.5vw, 13px)",
              fontWeight: 600,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              opacity: 0.72,
            }}
          >
            Todo tu negocio. Una inteligencia.
          </div>
        </div>

        <div className="nuva-launch__orbit">
          {items.map(([label, Icon, angle], index) => (
            <div
              key={label}
              className="nuva-launch__module"
              style={{
                "--nuva-angle": `${angle}deg`,
                "--nuva-delay": `${index * 75}ms`,
              } as CSSProperties}
            >
              <div className="nuva-launch__module-icon">
                <Icon aria-hidden="true" />
              </div>
              <span
                style={{
                  color: "#09090b",
                  fontWeight: 800,
                  textShadow: "0 1px 8px rgba(255,255,255,.7)",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="nuva-launch__core">
          <div className="nuva-launch__core-halo" />
          <div className="nuva-launch__core-ring" />
          <div
            className="nuva-launch__logo"
            style={{
              color: "#09090b",
              background: "rgba(255,255,255,.72)",
              borderColor: "rgba(9,9,11,.16)",
              boxShadow: "0 0 90px rgba(118,82,255,.32), 0 20px 80px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.95)",
            }}
          >
            <span style={{ color: "#09090b", background: "none", WebkitTextFillColor: "#09090b" }}>Nüva</span>
            <small style={{ color: "#09090b" }}>ONE</small>
          </div>
          <div className="nuva-launch__spark nuva-launch__spark--one" />
          <div className="nuva-launch__spark nuva-launch__spark--two" />
        </div>

        <div className="nuva-launch__tagline">
          <Sparkles aria-hidden="true" />
          <span>Inteligencia para tu negocio</span>
        </div>
      </div>

      <button
        type="button"
        aria-label="Omitir animación"
        onClick={finish}
        className="nuva-launch__skip"
      >
        <X aria-hidden="true" />
        <span>Omitir</span>
      </button>
    </div>
  );
}
