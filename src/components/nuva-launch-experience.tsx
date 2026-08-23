import { useEffect, useState, type CSSProperties, type ComponentType } from "react";
import { Bot, Boxes, BriefcaseBusiness, ChartNoAxesCombined, CircleDollarSign, ClipboardList, Handshake, Package, ReceiptText, ShoppingCart, Sparkles, Users, X } from "lucide-react";

const DURATION = 12000;
const EXIT = 1200;

const ITEMS: Array<[string, ComponentType]> = [
  ["IA", Bot], ["Clientes", Users], ["Ventas", ShoppingCart], ["Finanzas", CircleDollarSign],
  ["Caja", ReceiptText], ["Compras", ClipboardList], ["Inventario", Package], ["CRM", Handshake],
  ["Gestión", BriefcaseBusiness], ["Datos", Boxes], ["Insights", ChartNoAxesCombined],
];

const launchStyle = `
.nuva-launch{--launch-duration:12s!important;position:fixed!important;inset:0!important;z-index:99999!important;display:grid!important;place-items:center!important;overflow:hidden!important;isolation:isolate!important;background:radial-gradient(circle at 50% 48%,#fff 0%,#f7f7fc 43%,#e9e8f5 100%)!important;color:#09090b!important;animation:nuva-launch-in .55s cubic-bezier(.16,1,.3,1) both!important}
.nuva-launch__ambient{position:absolute!important;inset:-30%!important;background:radial-gradient(circle at 50% 45%,rgba(120,95,255,.22),transparent 34%),radial-gradient(circle at 20% 70%,rgba(70,50,190,.12),transparent 32%)!important;animation:nuva-ambient 12s ease-in-out both!important}
.nuva-launch__grid{position:absolute!important;inset:0!important;opacity:.2!important;background-image:linear-gradient(rgba(70,50,190,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(70,50,190,.08) 1px,transparent 1px)!important;background-size:58px 58px!important;mask-image:radial-gradient(circle,#000,transparent 72%)!important}
.nuva-launch__stage{position:relative!important;width:min(94vw,760px)!important;height:min(94vw,760px)!important;display:grid!important;place-items:center!important}
.nuva-launch__orbit{position:absolute!important;inset:0!important;z-index:3!important;pointer-events:none!important}
.nuva-launch__module{--nuva-radius:min(31vw,235px);position:absolute!important;left:50%!important;top:50%!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:7px!important;min-width:70px!important;opacity:0!important;filter:blur(10px)!important;transform-origin:center!important;animation:nuva-module 12s cubic-bezier(.16,1,.3,1) var(--nuva-delay) both!important;will-change:transform,opacity,filter!important}
.nuva-launch__module-icon{display:grid!important;place-items:center!important;width:54px!important;height:54px!important;border-radius:17px!important;border:1px solid rgba(70,50,190,.25)!important;background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(235,233,250,.86))!important;box-shadow:0 12px 34px rgba(40,25,110,.12),0 0 34px rgba(110,85,255,.18)!important;backdrop-filter:blur(14px)!important}
.nuva-launch__module-icon svg{width:23px!important;height:23px!important;color:#4631b8!important;stroke-width:2!important}
.nuva-launch__module span{color:#111027!important;font-size:11px!important;font-weight:850!important;letter-spacing:.055em!important;text-transform:uppercase!important;text-shadow:0 1px white,0 2px 10px rgba(255,255,255,.8)!important}
.nuva-launch__core{position:relative!important;z-index:4!important;display:grid!important;place-items:center!important;width:205px!important;height:205px!important;animation:nuva-core 12s linear both!important}
.nuva-launch__core-halo{position:absolute!important;inset:-90px!important;border-radius:999px!important;background:radial-gradient(circle,rgba(105,75,255,.27),rgba(70,50,190,.07) 40%,transparent 72%)!important;filter:blur(12px)!important;animation:nuva-halo 12s linear both!important}
.nuva-launch__core-ring{position:absolute!important;inset:12px!important;border-radius:999px!important;border:1px solid rgba(70,50,190,.35)!important;box-shadow:0 0 55px rgba(105,75,255,.25),inset 0 0 35px rgba(105,75,255,.12)!important;animation:nuva-ring 12s linear both!important}
.nuva-launch__core-pulse{position:absolute!important;inset:0!important;border-radius:999px!important;border:2px solid rgba(105,75,255,.5)!important;animation:nuva-pulse 12s linear both!important}
.nuva-launch__logo{z-index:2!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;width:150px!important;height:150px!important;border-radius:40px!important;background:rgba(255,255,255,.88)!important;border:1px solid rgba(10,10,20,.14)!important;box-shadow:0 0 95px rgba(105,75,255,.28),0 24px 90px rgba(0,0,0,.12),inset 0 1px white!important;animation:nuva-logo 12s linear both!important}
.nuva-launch__logo span{color:#111027!important;font-size:clamp(30px,6vw,44px)!important;font-weight:800!important;letter-spacing:-.06em!important;line-height:.95!important}.nuva-launch__logo small{color:#111027!important;letter-spacing:.42em!important;margin-top:9px!important;padding-left:.42em!important;font-size:10px!important;font-weight:850!important}
.nuva-launch__tagline{position:absolute!important;bottom:5.5%!important;left:50%!important;transform:translateX(-50%)!important;color:#111027!important;letter-spacing:.24em!important;text-transform:uppercase!important;white-space:nowrap!important;display:flex!important;align-items:center!important;gap:8px!important;font-size:10px!important;font-weight:750!important;animation:nuva-tagline 12s linear both!important}.nuva-launch__tagline svg{color:#4631b8!important;width:13px!important;height:13px!important}
.nuva-launch__welcome{position:absolute!important;z-index:8!important;top:4.5%!important;left:50%!important;transform:translateX(-50%)!important;text-align:center!important;white-space:nowrap!important;animation:nuva-welcome 12s linear both!important}.nuva-launch__welcome-title{color:#111027!important;font-size:clamp(20px,3.4vw,34px)!important;font-weight:850!important;letter-spacing:-.045em!important}.nuva-launch__welcome-subtitle{color:#111027!important;letter-spacing:.2em!important;text-transform:uppercase!important;opacity:.68!important;margin-top:8px!important;font-size:clamp(9px,1.35vw,12px)!important;font-weight:750!important}
.nuva-launch__ring{position:absolute!important;left:50%!important;top:50%!important;border-radius:999px!important;transform:translate(-50%,-50%)!important;pointer-events:none!important}.nuva-launch__ring--outer{width:min(90vw,680px)!important;aspect-ratio:1!important;border:1px solid rgba(70,50,190,.2)!important;animation:nuva-outer 12s linear both!important}.nuva-launch__ring--inner{width:min(66vw,500px)!important;aspect-ratio:1!important;border:1px dashed rgba(70,50,190,.22)!important;animation:nuva-inner 12s linear both!important}.nuva-launch__light-beam{position:absolute!important;width:55vw!important;height:1px!important;left:50%!important;top:50%!important;background:linear-gradient(90deg,transparent,rgba(105,75,255,.4),transparent)!important;opacity:0!important}.nuva-launch__light-beam--one{animation:nuva-beam1 12s linear both!important}.nuva-launch__light-beam--two{animation:nuva-beam2 12s linear both!important}.nuva-launch__spark{animation:none!important}
.nuva-launch__skip{z-index:20!important;position:absolute!important;top:20px!important;right:20px!important;display:inline-flex!important;align-items:center!important;gap:7px!important;padding:8px 12px!important;border-radius:999px!important;color:#111027!important;background:rgba(255,255,255,.68)!important;border:1px solid rgba(10,10,20,.14)!important;font-size:11px!important;font-weight:700!important}
.nuva-launch--exit{animation:nuva-exit .9s cubic-bezier(.16,1,.3,1) both!important}.nuva-launch--exit .nuva-launch__module,.nuva-launch--exit .nuva-launch__welcome,.nuva-launch--exit .nuva-launch__core,.nuva-launch--exit .nuva-launch__ring{animation:none!important;opacity:0!important;filter:blur(8px)!important}
@keyframes nuva-launch-in{from{opacity:0}to{opacity:1}}@keyframes nuva-ambient{0%{transform:scale(.96)}45%{transform:scale(1)}75%{transform:scale(1.06)}100%{transform:scale(1.12);opacity:0}}@keyframes nuva-module{0%{opacity:0;filter:blur(12px);transform:translate(-50%,-50%) rotate(var(--nuva-angle)) translateY(0) rotate(calc(-1 * var(--nuva-angle))) scale(.12)}13%{opacity:1;filter:blur(1px);transform:translate(-50%,-50%) rotate(var(--nuva-angle)) translateY(calc(-1 * var(--nuva-radius) * .9)) rotate(calc(-1 * var(--nuva-angle))) scale(1.04)}24%,56%{opacity:1;filter:blur(0);transform:translate(-50%,-50%) rotate(var(--nuva-angle)) translateY(calc(-1 * var(--nuva-radius))) rotate(calc(-1 * var(--nuva-angle))) scale(1)}68%{opacity:.78;filter:blur(1px);transform:translate(-50%,-50%) rotate(var(--nuva-angle)) translateY(-70px) rotate(calc(-1 * var(--nuva-angle))) scale(.55)}78%{opacity:0;filter:blur(8px);transform:translate(-50%,-50%) rotate(var(--nuva-angle)) translateY(0) rotate(calc(-1 * var(--nuva-angle))) scale(.08)}100%{opacity:0}}
@keyframes nuva-core{0%,12%{opacity:0;transform:scale(.7)}20%{opacity:1;transform:scale(1)}58%{opacity:1;transform:scale(1)}74%{opacity:1;transform:scale(1.07)}100%{opacity:0;transform:scale(1.08)}}@keyframes nuva-halo{0%,12%{opacity:0;transform:scale(.6)}23%{opacity:1;transform:scale(1)}65%{opacity:.8;transform:scale(1.12)}100%{opacity:0;transform:scale(1.3)}}@keyframes nuva-ring{0%,15%{opacity:0;transform:scale(.7) rotate(0)}25%{opacity:1;transform:scale(1) rotate(20deg)}70%{opacity:.8;transform:scale(1.08) rotate(240deg)}100%{opacity:0;transform:scale(1.2) rotate(360deg)}}@keyframes nuva-pulse{0%,20%{opacity:0;transform:scale(.7)}31%{opacity:.8;transform:scale(1)}50%{opacity:.2;transform:scale(1.12)}67%{opacity:.7;transform:scale(1.02)}100%{opacity:0;transform:scale(1.35)}}@keyframes nuva-logo{0%,17%{opacity:0;transform:scale(.72);filter:blur(8px)}27%{opacity:1;transform:scale(1.02);filter:blur(0)}58%{opacity:1;transform:scale(1)}76%{opacity:1;transform:scale(1.04)}94%{opacity:.85;filter:blur(1px)}100%{opacity:0;filter:blur(7px)}}@keyframes nuva-welcome{0%,58%{opacity:0;transform:translateX(-50%) translateY(12px) scale(.84);filter:blur(12px)}67%{opacity:1;transform:translateX(-50%) translateY(0) scale(1.02);filter:blur(0)}87%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}100%{opacity:0;transform:translateX(-50%) translateY(-10px) scale(1.03);filter:blur(8px)}}@keyframes nuva-tagline{0%,28%{opacity:0;transform:translateX(-50%) translateY(8px)}38%,76%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-8px);filter:blur(6px)}}@keyframes nuva-outer{0%,10%{opacity:0;transform:translate(-50%,-50%) scale(.72)}20%{opacity:1;transform:translate(-50%,-50%) scale(1)}72%{opacity:.7;transform:translate(-50%,-50%) scale(1.08)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.16)}}@keyframes nuva-inner{0%,12%{opacity:0;transform:translate(-50%,-50%) scale(.72) rotate(0)}25%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(30deg)}80%{opacity:.8;transform:translate(-50%,-50%) scale(1.08) rotate(280deg)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.16) rotate(360deg)}}@keyframes nuva-beam1{0%,25%{opacity:0;transform:translate(-50%,-50%) rotate(0) scaleX(.2)}40%{opacity:.55;transform:translate(-50%,-50%) rotate(20deg) scaleX(1)}75%{opacity:.3;transform:translate(-50%,-50%) rotate(48deg) scaleX(1.3)}100%{opacity:0}}@keyframes nuva-beam2{0%,30%{opacity:0;transform:translate(-50%,-50%) rotate(90deg) scaleX(.2)}45%{opacity:.4;transform:translate(-50%,-50%) rotate(68deg) scaleX(1)}78%{opacity:.25;transform:translate(-50%,-50%) rotate(45deg) scaleX(1.3)}100%{opacity:0}}@keyframes nuva-exit{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(1.02);filter:blur(8px)}}
@media(max-width:640px){.nuva-launch__stage{width:100vw!important;height:100vw!important}.nuva-launch__module{--nuva-radius:39vw}.nuva-launch__module-icon{width:42px!important;height:42px!important;border-radius:14px!important}.nuva-launch__module-icon svg{width:18px!important;height:18px!important}.nuva-launch__module span{font-size:8px!important}.nuva-launch__core{width:160px!important;height:160px!important}.nuva-launch__logo{width:122px!important;height:122px!important;border-radius:32px!important}.nuva-launch__tagline{font-size:8px!important;letter-spacing:.18em!important}.nuva-launch__welcome{top:6%!important}}
/* IMPORTANT: the global motion stylesheet can force every animation to 0.01ms when the OS/browser requests reduced motion. The Nüva launch is an intentional product intro and must retain its full choreography. */
@media (prefers-reduced-motion: reduce){.nuva-launch,.nuva-launch *,.nuva-launch *::before,.nuva-launch *::after{animation-duration:12s!important;animation-iteration-count:1!important;transition-duration:0ms!important}.nuva-launch__skip{animation-duration:900ms!important}.nuva-launch--exit{animation-duration:900ms!important}}
`;

export function NuvaLaunchExperience({ onComplete }: { onComplete: () => void }) {
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(onComplete, DURATION);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  const skip = () => {
    if (skipping) return;
    setSkipping(true);
    window.setTimeout(onComplete, EXIT);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: launchStyle }} />
      <div aria-label="Bienvenido a Nüva One" aria-live="polite" className={`nuva-launch ${skipping ? "nuva-launch--exit" : ""}`}>
        <div className="nuva-launch__ambient" /><div className="nuva-launch__grid" />
        <div className="nuva-launch__light-beam nuva-launch__light-beam--one" /><div className="nuva-launch__light-beam nuva-launch__light-beam--two" />
        <div className="nuva-launch__ring nuva-launch__ring--outer" /><div className="nuva-launch__ring nuva-launch__ring--inner" />
        <div className="nuva-launch__stage">
          <div className="nuva-launch__orbit" aria-hidden="true">
            {ITEMS.map(([label, Icon], index) => (
              <div key={label} className="nuva-launch__module" style={{ "--nuva-angle": `${-90 + index * (360 / ITEMS.length)}deg`, "--nuva-delay": `${index * 45}ms` } as CSSProperties}>
                <div className="nuva-launch__module-icon"><Icon /></div><span>{label}</span>
              </div>
            ))}
          </div>
          <div className="nuva-launch__core"><div className="nuva-launch__core-halo"/><div className="nuva-launch__core-ring"/><div className="nuva-launch__core-pulse"/><div className="nuva-launch__logo"><span>Nüva</span><small>ONE</small></div></div>
          <div className="nuva-launch__tagline"><Sparkles aria-hidden="true"/><span>Inteligencia para tu negocio</span></div>
          <div className="nuva-launch__welcome"><div className="nuva-launch__welcome-title">Bienvenido a Nüva One</div><div className="nuva-launch__welcome-subtitle">Todo tu negocio. Una inteligencia.</div></div>
        </div>
        <button type="button" aria-label="Omitir animación" onClick={skip} className="nuva-launch__skip"><X aria-hidden="true"/><span>Omitir</span></button>
      </div>
    </>
  );
}
