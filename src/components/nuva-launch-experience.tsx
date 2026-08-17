import { useEffect, useState } from "react";
import { Bot, Boxes, BriefcaseBusiness, ChartNoAxesCombined, CircleDollarSign, ClipboardList, Handshake, Package, ReceiptText, ShoppingCart, Sparkles, Users, X } from "lucide-react";

const items = [
  ["IA", Bot, -90], ["Clientes", Users, -45], ["Ventas", ShoppingCart, 0], ["Finanzas", CircleDollarSign, 45], ["Caja", ReceiptText, 90], ["Compras", ClipboardList, 135], ["Inventario", Package, 180], ["CRM", Handshake, 225], ["Gestión", BriefcaseBusiness, 270], ["Datos", Boxes, 315], ["Insights", ChartNoAxesCombined, 20],
] as const;

export function NuvaLaunchExperience() {
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), media.matches ? 700 : 2600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div aria-label="Nüva One" aria-live="polite" className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#070a12] animate-[nuva-fade-in_300ms_ease-out]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.12),transparent_36%)]" />
      <div className="absolute h-[24rem] w-[24rem] rounded-full border border-white/5 sm:h-[34rem] sm:w-[34rem]" />
      <div className="absolute h-[18rem] w-[18rem] rounded-full border border-white/5 sm:h-[24rem] sm:w-[24rem]" />
      <div className="relative flex h-80 w-80 items-center justify-center sm:h-[30rem] sm:w-[30rem]">
        {items.map(([label, Icon, angle], index) => {
          const r = (angle * Math.PI) / 180;
          const x = Math.cos(r) * 190;
          const y = Math.sin(r) * 190;
          return (
            <div key={label} className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 text-white/70 ${reduced ? "opacity-100" : "animate-[nuva-orbit-in_900ms_cubic-bezier(.22,1,.36,1)_forwards] opacity-0"}`} style={{ transform: reduced ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` : undefined, animationDelay: `${index * 60}ms`, ["--nuva-x" as string]: `${x}px`, ["--nuva-y" as string]: `${y}px` }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_0_30px_rgba(125,211,252,0.08)] backdrop-blur"><Icon className="h-4 w-4" /></div>
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </div>
          );
        })}
        <div className="absolute flex flex-col items-center justify-center">
          <div className="absolute h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl sm:h-56 sm:w-56" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-cyan-200/20 bg-white/[0.06] shadow-[0_0_70px_rgba(103,232,249,0.22)] backdrop-blur-xl sm:h-36 sm:w-36">
            <div className="absolute inset-0 rounded-[2rem] border border-white/10 animate-[nuva-pulse_1.8s_ease-out_infinite]" />
            <div className="text-center"><div className="text-[22px] font-semibold tracking-[-0.04em] text-white sm:text-[28px]">Nüva</div><div className="text-[11px] font-medium uppercase tracking-[0.28em] text-cyan-100/70">One</div></div>
          </div>
          <div className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/45"><Sparkles className="h-3 w-3" /> Inteligencia para tu negocio</div>
        </div>
      </div>
      <button type="button" aria-label="Omitir animación" onClick={() => setVisible(false)} className="absolute right-5 top-5 rounded-full border border-white/10 bg-white/5 p-2 text-white/40 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
    </div>
  );
}
