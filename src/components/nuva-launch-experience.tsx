import { useEffect, useRef, useState, type ComponentType } from "react";
import { Bot, Boxes, BriefcaseBusiness, ChartNoAxesCombined, CircleDollarSign, ClipboardList, Handshake, Package, ReceiptText, ShoppingCart, Sparkles, Users, X } from "lucide-react";

const DURATION = 14000;
const EXIT = 900;
const ITEMS: Array<[string, ComponentType]> = [["IA", Bot], ["Clientes", Users], ["Ventas", ShoppingCart], ["Finanzas", CircleDollarSign], ["Caja", ReceiptText], ["Compras", ClipboardList], ["Inventario", Package], ["CRM", Handshake], ["Gestión", BriefcaseBusiness], ["Datos", Boxes], ["Insights", ChartNoAxesCombined]];
const ease = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 4);
const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

export function NuvaLaunchExperience({ onComplete }: { onComplete: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s);
    const modules = Array.from(root.querySelectorAll<HTMLElement>("[data-nuva-module]"));
    const core = q("[data-nuva-core]"), halo = q("[data-nuva-halo]"), ring = q("[data-nuva-ring]"), pulse = q("[data-nuva-pulse]"), logo = q("[data-nuva-logo]"), welcome = q("[data-nuva-welcome]"), tagline = q("[data-nuva-tagline]"), outer = q("[data-nuva-outer]"), inner = q("[data-nuva-inner]"), ambient = q("[data-nuva-ambient]"), beam1 = q("[data-nuva-beam='1']"), beam2 = q("[data-nuva-beam='2']");
    const start = performance.now();
    let frame = 0;
    const set = (el: HTMLElement | null, opacity: number, transform = "none", filter = "none") => { if (!el) return; el.style.setProperty("opacity", String(Math.max(0, Math.min(1, opacity))), "important"); el.style.setProperty("transform", transform, "important"); el.style.setProperty("filter", filter, "important"); };
    const tick = (now: number) => {
      const sec = Math.min(DURATION, now - start), p = sec / DURATION;
      if (ambient) { ambient.style.setProperty("opacity", String(0.55 + 0.35 * Math.sin(Math.min(1, p) * Math.PI)), "important"); ambient.style.setProperty("transform", `scale(${.96 + .12 * p})`, "important"); }
      set(outer, sec < 1300 ? ease(sec / 1300) : .68, `translate(-50%,-50%) scale(${.72 + .44 * smooth(p)})`);
      set(inner, sec < 1600 ? ease(sec / 1600) : .72, `translate(-50%,-50%) scale(${.72 + .44 * smooth(p)}) rotate(${360 * p}deg)`);
      set(beam1, sec > 2800 && sec < 11200 ? .34 : 0, `translate(-50%,-50%) rotate(${18 + 42 * p}deg) scaleX(${.65 + p})`);
      set(beam2, sec > 3500 && sec < 11200 ? .24 : 0, `translate(-50%,-50%) rotate(${-18 - 40 * p}deg) scaleX(${.65 + p})`);
      const ci = ease(sec / 1900), co = smooth((sec - 11200) / 2800), visible = sec < 11200 ? ci : 1 - co;
      set(core, visible, `translate(-50%,-50%) scale(${.68 + .34 * ci + .05 * smooth((sec - 9000) / 2500)})`);
      set(halo, visible * .95, `scale(${.58 + .72 * smooth(sec / 11000)})`, "blur(12px)");
      set(ring, visible, `scale(${.72 + .25 * smooth(p)}) rotate(${360 * p}deg)`);
      set(pulse, visible * (.3 + .35 * Math.abs(Math.sin(sec / 650))), `scale(${1 + .08 * Math.sin(sec / 520)})`);
      const li = ease((sec - 1100) / 1500), lo = smooth((sec - 11200) / 2600);
      set(logo, li * (1 - lo), `scale(${.76 + .26 * li})`, sec < 1600 ? "blur(7px)" : "none");
      modules.forEach((el, index) => {
        const angle = (-90 + index * (360 / ITEMS.length)) * Math.PI / 180;
        const local = Math.max(0, Math.min(1, (sec - index * 90) / 2500));
        const converge = smooth((sec - 8200) / 2800);
        const radius = Math.min(window.innerWidth * .31, 235) * (1 - .84 * converge);
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
        const opacity = local < 1 ? ease(local) : 1 - smooth((sec - 10800) / 1900);
        const scale = local < 1 ? .16 + .84 * ease(local) : 1 - .88 * converge;
        const blur = local < 1 ? (1 - ease(local)) * 9 : Math.max(0, converge - .75) * 35;
        el.style.setProperty("opacity", String(Math.max(0, Math.min(1, opacity))), "important");
        el.style.setProperty("transform", `translate(-50%,-50%) translate(${x}px,${y}px) scale(${Math.max(.05, scale)})`, "important");
        el.style.setProperty("filter", `blur(${blur}px)`, "important");
      });
      const wi = smooth((sec - 7600) / 1200), wo = smooth((sec - 11900) / 1900);
      set(welcome, wi * (1 - wo), `translateX(-50%) translateY(${(1 - wi) * 14 - wo * 10}px) scale(${.88 + .12 * wi})`);
      const ti = smooth((sec - 4200) / 1000), to = smooth((sec - 11800) / 1800);
      set(tagline, ti * (1 - to), `translateX(-50%) translateY(${(1 - ti) * 8 - to * 8}px)`);
      if (sec < DURATION) frame = requestAnimationFrame(tick); else onComplete();
    };
    modules.forEach((el) => { el.style.setProperty("opacity", "0", "important"); el.style.setProperty("transform", "translate(-50%,-50%) scale(.16)", "important"); el.style.setProperty("filter", "blur(9px)", "important"); });
    set(core, 0, "translate(-50%,-50%) scale(.68)");
    set(halo, 0, "scale(.58)", "blur(12px)");
    set(ring, 0, "scale(.72)");
    set(pulse, 0, "scale(.9)");
    set(logo, 0, "scale(.76)", "blur(7px)");
    set(welcome, 0, "translateX(-50%) translateY(14px) scale(.88)");
    set(tagline, 0, "translateX(-50%) translateY(8px)");
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onComplete]);

  const skip = () => { if (exiting) return; setExiting(true); window.setTimeout(onComplete, EXIT); };
  return <div ref={rootRef} className={`nuva-launch${exiting ? " nuva-launch--exit" : ""}`} aria-label="Bienvenido a Nüva One" aria-live="polite">
    <style>{` .nuva-launch{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;overflow:hidden;isolation:isolate;background:radial-gradient(circle at 50% 48%,#fff 0%,#f7f7fc 45%,#e9e8f5 100%);color:#111027}.nuva-launch__ambient,.nuva-launch__grid,.nuva-launch__ring,.nuva-launch__light-beam{position:absolute;pointer-events:none}.nuva-launch__ambient{inset:-30%;background:radial-gradient(circle at 50% 45%,rgba(100,75,240,.24),transparent 34%),radial-gradient(circle at 20% 70%,rgba(70,50,190,.12),transparent 32%);will-change:transform,opacity}.nuva-launch__grid{inset:0;opacity:.18;background-image:linear-gradient(rgba(70,50,190,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(70,50,190,.08) 1px,transparent 1px);background-size:58px 58px;mask-image:radial-gradient(circle,#000,transparent 72%)}.nuva-launch__stage{position:relative;width:min(94vw,760px);height:min(94vw,760px)}.nuva-launch__orbit{position:absolute;inset:0;z-index:4}.nuva-launch__module{position:absolute;left:50%;top:50%;width:78px;display:flex;flex-direction:column;align-items:center;gap:7px;opacity:1!important;will-change:transform,opacity,filter}.nuva-launch__module-icon{width:54px;height:54px;display:grid;place-items:center;border-radius:17px;border:1px solid rgba(70,50,190,.25);background:rgba(255,255,255,.94);box-shadow:0 12px 34px rgba(40,25,110,.12),0 0 34px rgba(110,85,255,.18);backdrop-filter:blur(14px)}.nuva-launch__module-icon svg{width:23px;height:23px;color:#4631b8;stroke-width:2}.nuva-launch__module span{color:#111027;font-size:10px;font-weight:850;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}.nuva-launch__core{position:absolute;left:50%;top:50%;z-index:5;width:205px;height:205px;display:grid;place-items:center;will-change:transform,opacity}.nuva-launch__core-halo{position:absolute;inset:-90px;border-radius:50%;background:radial-gradient(circle,rgba(105,75,255,.30),rgba(70,50,190,.07) 42%,transparent 72%);will-change:transform,opacity,filter}.nuva-launch__core-ring{position:absolute;inset:12px;border-radius:50%;border:1px solid rgba(70,50,190,.38);box-shadow:0 0 55px rgba(105,75,255,.25),inset 0 0 35px rgba(105,75,255,.12);will-change:transform,opacity}.nuva-launch__core-pulse{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(105,75,255,.50);will-change:transform,opacity}.nuva-launch__logo{z-index:2;width:150px;height:150px;border-radius:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,.94);border:1px solid rgba(10,10,20,.14);box-shadow:0 0 95px rgba(105,75,255,.28),0 24px 90px rgba(0,0,0,.12),inset 0 1px white;will-change:transform,opacity,filter}.nuva-launch__logo span{color:#111027;font-size:clamp(30px,6vw,44px);font-weight:800;letter-spacing:-.06em;line-height:.95}.nuva-launch__logo small{color:#4631b8;letter-spacing:.42em;margin-top:9px;padding-left:.42em;font-size:10px;font-weight:850}.nuva-launch__ring{left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%);will-change:transform,opacity}.nuva-launch__ring--outer{width:min(90vw,680px);aspect-ratio:1;border:1px solid rgba(70,50,190,.20)}.nuva-launch__ring--inner{width:min(66vw,500px);aspect-ratio:1;border:1px dashed rgba(70,50,190,.24)}.nuva-launch__light-beam{left:50%;top:50%;width:65vw;height:2px;background:linear-gradient(90deg,transparent,rgba(105,75,255,.40),transparent);will-change:transform,opacity}.nuva-launch__tagline{position:absolute;left:50%;bottom:5%;display:flex;align-items:center;gap:8px;white-space:nowrap;font-size:10px;font-weight:750;letter-spacing:.22em;text-transform:uppercase;will-change:transform,opacity}.nuva-launch__tagline svg{width:13px;height:13px;color:#4631b8}.nuva-launch__welcome{position:absolute;z-index:8;left:50%;top:5%;text-align:center;white-space:nowrap;will-change:transform,opacity}.nuva-launch__welcome-title{font-size:clamp(20px,3.4vw,34px);font-weight:850;letter-spacing:-.045em}.nuva-launch__welcome-subtitle{margin-top:8px;font-size:clamp(9px,1.35vw,12px);font-weight:750;letter-spacing:.2em;text-transform:uppercase;opacity:.66}.nuva-launch__skip{position:absolute;right:20px;top:20px;z-index:20;display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:999px;border:1px solid rgba(10,10,20,.14);background:rgba(255,255,255,.72);color:#111027;font-size:11px;font-weight:700;cursor:pointer}.nuva-launch--exit{animation:nvExit .9s cubic-bezier(.16,1,.3,1) both}@keyframes nvExit{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(1.02);filter:blur(8px)}}@media(max-width:640px){.nuva-launch__stage{width:100vw;height:100vw}.nuva-launch__module{width:62px}.nuva-launch__module-icon{width:42px;height:42px;border-radius:14px}.nuva-launch__module-icon svg{width:18px;height:18px}.nuva-launch__module span{font-size:8px}.nuva-launch__core{width:160px;height:160px}.nuva-launch__logo{width:122px;height:122px;border-radius:32px}.nuva-launch__tagline{font-size:8px;letter-spacing:.18em}.nuva-launch__welcome{top:6%}}`}</style>
    <div data-nuva-ambient className="nuva-launch__ambient"/><div className="nuva-launch__grid"/><div data-nuva-beam="1" className="nuva-launch__light-beam"/><div data-nuva-beam="2" className="nuva-launch__light-beam"/><div data-nuva-outer className="nuva-launch__ring nuva-launch__ring--outer"/><div data-nuva-inner className="nuva-launch__ring nuva-launch__ring--inner"/>
    <div className="nuva-launch__stage"><div className="nuva-launch__orbit" aria-hidden="true">{ITEMS.map(([label, Icon]) => <div key={label} data-nuva-module className="nuva-launch__module"><div className="nuva-launch__module-icon"><Icon/></div><span>{label}</span></div>)}</div><div data-nuva-core className="nuva-launch__core"><div data-nuva-halo className="nuva-launch__core-halo"/><div data-nuva-ring className="nuva-launch__core-ring"/><div data-nuva-pulse className="nuva-launch__core-pulse"/><div data-nuva-logo className="nuva-launch__logo"><span>Nüva</span><small>ONE</small></div></div><div data-nuva-tagline className="nuva-launch__tagline"><Sparkles aria-hidden="true"/><span>Inteligencia para tu negocio</span></div><div data-nuva-welcome className="nuva-launch__welcome"><div className="nuva-launch__welcome-title">Bienvenido a Nüva One</div><div className="nuva-launch__welcome-subtitle">Todo tu negocio. Una inteligencia.</div></div></div>
    <button type="button" className="nuva-launch__skip" onClick={skip} aria-label="Omitir animación"><X aria-hidden="true"/><span>Omitir</span></button>
  </div>;
}
