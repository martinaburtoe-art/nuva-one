import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import { Bot, Boxes, BriefcaseBusiness, ChartNoAxesCombined, CircleDollarSign, ClipboardList, Handshake, Package, ReceiptText, ShoppingCart, Sparkles, Users, X } from "lucide-react";

const DURATION = 14000;
const EXIT = 900;

const ITEMS: Array<[string, ComponentType]> = [
  ["IA", Bot], ["Clientes", Users], ["Ventas", ShoppingCart], ["Finanzas", CircleDollarSign],
  ["Caja", ReceiptText], ["Compras", ClipboardList], ["Inventario", Package], ["CRM", Handshake],
  ["Gestión", BriefcaseBusiness], ["Datos", Boxes], ["Insights", ChartNoAxesCombined],
];

const style = `
.nuva-launch{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;overflow:hidden;background:#f4f3fb;color:#111027;isolation:isolate}
.nuva-launch__ambient{position:absolute;inset:-20%;background:radial-gradient(circle at 50% 48%,rgba(93,67,220,.20),transparent 30%),radial-gradient(circle at 20% 75%,rgba(69,48,184,.10),transparent 30%);animation:nvAmbient 14s ease both}
.nuva-launch__grid{position:absolute;inset:0;opacity:.18;background-image:linear-gradient(rgba(70,50,190,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(70,50,190,.08) 1px,transparent 1px);background-size:58px 58px;mask-image:radial-gradient(circle,#000,transparent 72%)}
.nuva-launch__stage{position:relative;width:min(94vw,760px);height:min(94vw,760px)}
.nuva-launch__orbit{position:absolute;inset:0;z-index:4}
.nuva-launch__module{position:absolute;left:50%;top:50%;width:78px;display:flex;flex-direction:column;align-items:center;gap:7px;opacity:0;transform:translate(-50%,-50%);animation:nvModule 14s cubic-bezier(.16,1,.3,1) var(--delay) both}
.nuva-launch__module-icon{width:54px;height:54px;display:grid;place-items:center;border-radius:17px;border:1px solid rgba(70,50,190,.24);background:rgba(255,255,255,.94);box-shadow:0 12px 34px rgba(40,25,110,.12),0 0 32px rgba(110,85,255,.16);backdrop-filter:blur(12px)}
.nuva-launch__module-icon svg{width:23px;height:23px;color:#4631b8;stroke-width:2}
.nuva-launch__module span{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#111027;white-space:nowrap}
.nuva-launch__core{position:absolute;left:50%;top:50%;width:205px;height:205px;transform:translate(-50%,-50%);display:grid;place-items:center;z-index:5;animation:nvCore 14s linear both}
.nuva-launch__core-halo{position:absolute;inset:-85px;border-radius:50%;background:radial-gradient(circle,rgba(105,75,255,.28),rgba(70,50,190,.07) 42%,transparent 72%);filter:blur(12px);animation:nvHalo 14s linear both}
.nuva-launch__core-ring{position:absolute;inset:10px;border-radius:50%;border:1px solid rgba(70,50,190,.36);box-shadow:0 0 55px rgba(105,75,255,.24),inset 0 0 35px rgba(105,75,255,.12);animation:nvRing 14s linear both}
.nuva-launch__core-pulse{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(105,75,255,.48);animation:nvPulse 14s linear both}
.nuva-launch__logo{z-index:2;width:150px;height:150px;border-radius:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,.92);border:1px solid rgba(10,10,20,.14);box-shadow:0 0 95px rgba(105,75,255,.28),0 24px 90px rgba(0,0,0,.12);animation:nvLogo 14s linear both}
.nuva-launch__logo span{font-size:clamp(30px,6vw,44px);font-weight:800;letter-spacing:-.06em;line-height:.95}.nuva-launch__logo small{margin-top:9px;padding-left:.42em;color:#4631b8;letter-spacing:.42em;font-size:10px;font-weight:850}
.nuva-launch__ring{position:absolute;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}.nuva-launch__ring--outer{width:min(90vw,680px);aspect-ratio:1;border:1px solid rgba(70,50,190,.19);animation:nvOuter 14s linear both}.nuva-launch__ring--inner{width:min(66vw,500px);aspect-ratio:1;border:1px dashed rgba(70,50,190,.22);animation:nvInner 14s linear both}
.nuva-launch__light-beam{position:absolute;left:50%;top:50%;width:65vw;height:2px;background:linear-gradient(90deg,transparent,rgba(105,75,255,.35),transparent);opacity:0;pointer-events:none}.nuva-launch__light-beam--one{animation:nvBeam1 14s linear both}.nuva-launch__light-beam--two{animation:nvBeam2 14s linear both}
.nuva-launch__tagline{position:absolute;left:50%;bottom:5%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;white-space:nowrap;font-size:10px;font-weight:750;letter-spacing:.22em;text-transform:uppercase;animation:nvTagline 14s linear both}.nuva-launch__tagline svg{width:13px;height:13px;color:#4631b8}
.nuva-launch__welcome{position:absolute;z-index:8;left:50%;top:5%;transform:translateX(-50%);text-align:center;white-space:nowrap;animation:nvWelcome 14s linear both}.nuva-launch__welcome-title{font-size:clamp(20px,3.4vw,34px);font-weight:850;letter-spacing:-.045em}.nuva-launch__welcome-subtitle{margin-top:8px;font-size:clamp(9px,1.35vw,12px);font-weight:750;letter-spacing:.2em;text-transform:uppercase;opacity:.66}
.nuva-launch__skip{position:absolute;right:20px;top:20px;z-index:20;display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:999px;border:1px solid rgba(10,10,20,.14);background:rgba(255,255,255,.72);color:#111027;font-size:11px;font-weight:700;cursor:pointer}
.nuva-launch--exit{animation:nvExit .9s cubic-bezier(.16,1,.3,1) both}
@keyframes nvModule{0%{opacity:0;transform:translate(-50%,-50%) scale(.1)}12%{opacity:1;transform:translate(-50%,-50%) rotate(var(--angle)) translateY(calc(-1 * var(--radius))) rotate(calc(-1 * var(--angle))) scale(1.05)}24%,58%{opacity:1;transform:translate(-50%,-50%) rotate(var(--angle)) translateY(calc(-1 * var(--radius))) rotate(calc(-1 * var(--angle))) scale(1)}72%{opacity:.72;transform:translate(-50%,-50%) rotate(var(--angle)) translateY(-80px) rotate(calc(-1 * var(--angle))) scale(.58)}84%{opacity:0;transform:translate(-50%,-50%) scale(.08)}100%{opacity:0}}
@keyframes nvCore{0%,8%{opacity:0;transform:translate(-50%,-50%) scale(.65)}18%{opacity:1;transform:translate(-50%,-50%) scale(1)}62%{opacity:1;transform:translate(-50%,-50%) scale(1)}78%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.12)}}
@keyframes nvHalo{0%,10%{opacity:0;transform:scale(.55)}20%{opacity:1;transform:scale(1)}68%{opacity:.75;transform:scale(1.15)}100%{opacity:0;transform:scale(1.35)}}
@keyframes nvRing{0%,12%{opacity:0;transform:scale(.7) rotate(0)}22%{opacity:1;transform:scale(1) rotate(20deg)}72%{opacity:.8;transform:scale(1.08) rotate(260deg)}100%{opacity:0;transform:scale(1.2) rotate(360deg)}}
@keyframes nvPulse{0%,16%{opacity:0;transform:scale(.7)}28%{opacity:.8;transform:scale(1)}50%{opacity:.2;transform:scale(1.12)}68%{opacity:.7;transform:scale(1.02)}100%{opacity:0;transform:scale(1.35)}}
@keyframes nvLogo{0%,14%{opacity:0;transform:scale(.72);filter:blur(8px)}24%{opacity:1;transform:scale(1.02);filter:blur(0)}60%{opacity:1;transform:scale(1)}78%{opacity:1;transform:scale(1.04)}94%{opacity:.8;filter:blur(2px)}100%{opacity:0;filter:blur(7px)}}
@keyframes nvWelcome{0%,58%{opacity:0;transform:translateX(-50%) translateY(14px) scale(.88);filter:blur(10px)}68%{opacity:1;transform:translateX(-50%) translateY(0) scale(1.02);filter:blur(0)}88%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}100%{opacity:0;transform:translateX(-50%) translateY(-10px) scale(1.03);filter:blur(8px)}}
@keyframes nvTagline{0%,28%{opacity:0;transform:translateX(-50%) translateY(8px)}38%,78%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-8px);filter:blur(6px)}}
@keyframes nvOuter{0%,10%{opacity:0;transform:translate(-50%,-50%) scale(.72)}20%{opacity:1;transform:translate(-50%,-50%) scale(1)}72%{opacity:.7;transform:translate(-50%,-50%) scale(1.08)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.16)}}
@keyframes nvInner{0%,12%{opacity:0;transform:translate(-50%,-50%) scale(.72) rotate(0)}25%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(30deg)}80%{opacity:.8;transform:translate(-50%,-50%) scale(1.08) rotate(280deg)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.16) rotate(360deg)}}
@keyframes nvBeam1{0%,25%{opacity:0;transform:translate(-50%,-50%) rotate(0) scaleX(.2)}40%{opacity:.55;transform:translate(-50%,-50%) rotate(20deg) scaleX(1)}78%{opacity:.25;transform:translate(-50%,-50%) rotate(48deg) scaleX(1.3)}100%{opacity:0}}
@keyframes nvBeam2{0%,30%{opacity:0;transform:translate(-50%,-50%) rotate(90deg) scaleX(.2)}45%{opacity:.4;transform:translate(-50%,-50%) rotate(68deg) scaleX(1)}78%{opacity:.25;transform:translate(-50%,-50%) rotate(45deg) scaleX(1.3)}100%{opacity:0}}
@keyframes nvAmbient{0%{transform:scale(.96);opacity:.5}55%{transform:scale(1.02);opacity:1}100%{transform:scale(1.12);opacity:0}}
@keyframes nvExit{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(1.02);filter:blur(8px)}}
@media(max-width:640px){.nuva-launch__stage{width:100vw;height:100vw}.nuva-launch__module{--radius:39vw;width:62px}.nuva-launch__module-icon{width:42px;height:42px;border-radius:14px}.nuva-launch__module-icon svg{width:18px;height:18px}.nuva-launch__module span{font-size:8px}.nuva-launch__core{width:160px;height:160px}.nuva-launch__logo{width:122px;height:122px;border-radius:32px}.nuva-launch__tagline{font-size:8px;letter-spacing:.18em}.nuva-launch__welcome{top:6%}}
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
    <div className={`nuva-launch${skipping ? " nuva-launch--exit" : ""}`} aria-label="Bienvenido a Nüva One" aria-live="polite">
      <style>{style}</style>
      <div className="nuva-launch__ambient" />
      <div className="nuva-launch__grid" />
      <div className="nuva-launch__light-beam nuva-launch__light-beam--one" />
      <div className="nuva-launch__light-beam nuva-launch__light-beam--two" />
      <div className="nuva-launch__ring nuva-launch__ring--outer" />
      <div className="nuva-launch__ring nuva-launch__ring--inner" />
      <div className="nuva-launch__stage">
        <div className="nuva-launch__orbit" aria-hidden="true">
          {ITEMS.map(([label, Icon], index) => (
            <div key={label} className="nuva-launch__module" style={{ "--angle": `${-90 + index * (360 / ITEMS.length)}deg`, "--radius": "min(31vw,235px)", "--delay": `${index * 90}ms` } as CSSProperties}>
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
        </div>
        <div className="nuva-launch__tagline"><Sparkles aria-hidden="true" /><span>Inteligencia para tu negocio</span></div>
        <div className="nuva-launch__welcome"><div className="nuva-launch__welcome-title">Bienvenido a Nüva One</div><div className="nuva-launch__welcome-subtitle">Todo tu negocio. Una inteligencia.</div></div>
      </div>
      <button type="button" className="nuva-launch__skip" onClick={skip} aria-label="Omitir animación"><X aria-hidden="true" /><span>Omitir</span></button>
    </div>
  );
}
