import { useEffect, useRef, useState, type ComponentType } from "react";
import { Bot, Boxes, BriefcaseBusiness, ChartNoAxesCombined, CircleDollarSign, ClipboardList, Handshake, Package, ReceiptText, ShoppingCart, Sparkles, Users, X } from "lucide-react";

const DURATION = 14000;
const EXIT = 900;
const ITEMS: Array<[string, ComponentType]> = [["IA", Bot], ["Clientes", Users], ["Ventas", ShoppingCart], ["Finanzas", CircleDollarSign], ["Caja", ReceiptText], ["Compras", ClipboardList], ["Inventario", Package], ["CRM", Handshake], ["Gestión", BriefcaseBusiness], ["Datos", Boxes], ["Insights", ChartNoAxesCombined]];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 4);
const smooth = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };

export function NuvaLaunchExperience({ onComplete }: { onComplete: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef(onComplete);
  const [exiting, setExiting] = useState(false);
  completeRef.current = onComplete;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = <T extends HTMLElement,>(s: string) => root.querySelector<T>(s);
    const modules = Array.from(root.querySelectorAll<HTMLElement>("[data-nuva-v2-module]"));
    const core = q("[data-nuva-v2-core]"), halo = q("[data-nuva-v2-halo]"), ring = q("[data-nuva-v2-ring]"), pulse = q("[data-nuva-v2-pulse]"), logo = q("[data-nuva-v2-logo]"), welcome = q("[data-nuva-v2-welcome]"), tagline = q("[data-nuva-v2-tagline]"), outer = q("[data-nuva-v2-outer]"), inner = q("[data-nuva-v2-inner]"), ambient = q("[data-nuva-v2-ambient]"), beam1 = q("[data-nuva-v2-beam='1']"), beam2 = q("[data-nuva-v2-beam='2']");
    const start = performance.now();
    let frame = 0;
    let finished = false;
    const set = (el: HTMLElement | null, opacity: number, transform = "none", filter = "none") => { if (!el) return; el.style.setProperty("opacity", String(clamp(opacity)), "important"); el.style.setProperty("transform", transform, "important"); el.style.setProperty("filter", filter, "important"); };
    const tick = (now: number) => {
      const elapsed = Math.min(DURATION, Math.max(0, now - start));
      const p = elapsed / DURATION;
      if (ambient) { ambient.style.setProperty("opacity", String(.5 + .38 * Math.sin(p * Math.PI)), "important"); ambient.style.setProperty("transform", `scale(${.96 + .12 * p})`, "important"); }
      set(outer, elapsed < 1300 ? ease(elapsed / 1300) : .72, `translate(-50%,-50%) scale(${.72 + .42 * smooth(p)})`);
      set(inner, elapsed < 1600 ? ease(elapsed / 1600) : .76, `translate(-50%,-50%) scale(${.72 + .42 * smooth(p)}) rotate(${360 * p}deg)`);
      set(beam1, elapsed > 2600 && elapsed < 11800 ? .34 : 0, `translate(-50%,-50%) rotate(${18 + 42 * p}deg) scaleX(${.7 + p})`);
      set(beam2, elapsed > 3400 && elapsed < 11800 ? .24 : 0, `translate(-50%,-50%) rotate(${-18 - 40 * p}deg) scaleX(${.7 + p})`);
      const coreIn = ease(elapsed / 1900), coreOut = smooth((elapsed - 11600) / 2200), coreVisible = elapsed < 11600 ? coreIn : 1 - coreOut;
      set(core, coreVisible, `translate(-50%,-50%) scale(${.7 + .32 * coreIn + .04 * smooth((elapsed - 9000) / 2500)})`);
      set(halo, coreVisible * .95, `scale(${.58 + .72 * smooth(elapsed / 11200)})`, "blur(12px)");
      set(ring, coreVisible, `scale(${.72 + .25 * smooth(p)}) rotate(${360 * p}deg)`);
      set(pulse, coreVisible * (.25 + .4 * Math.abs(Math.sin(elapsed / 650))), `scale(${1 + .08 * Math.sin(elapsed / 520)})`);
      const logoIn = ease((elapsed - 900) / 1700), logoOut = smooth((elapsed - 11600) / 2200);
      set(logo, logoIn * (1 - logoOut), `scale(${.74 + .28 * logoIn})`, elapsed < 1500 ? "blur(7px)" : "none");
      modules.forEach((el, index) => {
        const angle = (-90 + index * (360 / ITEMS.length)) * Math.PI / 180;
        const inP = ease((elapsed - index * 100) / 2600);
        const converge = smooth((elapsed - 8200) / 3000);
        const radius = Math.min(window.innerWidth * .32, 245) * (1 - .86 * converge);
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
        const opacity = inP < 1 ? Math.max(.02, inP) : Math.max(0, 1 - smooth((elapsed - 11300) / 1700));
        const scale = inP < 1 ? .18 + .82 * inP : Math.max(.08, 1 - .9 * converge);
        const blur = inP < 1 ? (1 - inP) * 8 : Math.max(0, converge - .78) * 25;
        set(el, opacity, `translate(-50%,-50%) translate(${x}px,${y}px) scale(${scale})`, `blur(${blur}px)`);
      });
      const wi = smooth((elapsed - 7400) / 1200), wo = smooth((elapsed - 11900) / 1700);
      set(welcome, wi * (1 - wo), `translateX(-50%) translateY(${(1 - wi) * 14 - wo * 10}px) scale(${.9 + .1 * wi})`);
      const ti = smooth((elapsed - 3900) / 1000), to = smooth((elapsed - 11800) / 1600);
      set(tagline, ti * (1 - to), `translateX(-50%) translateY(${(1 - ti) * 8 - to * 8}px)`);
      if (elapsed >= DURATION) { if (!finished) { finished = true; completeRef.current(); } return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const skip = () => { if (exiting) return; setExiting(true); window.setTimeout(() => completeRef.current(), EXIT); };
  return <div ref={rootRef} className={`nuva-launch-v2${exiting ? " nuva-launch-v2--exit" : ""}`} aria-label="Bienvenido a Nüva One" aria-live="polite">
    <style>{`@keyframes nv2Exit{from{opacity:1;transform:scale(1);filter:blur(0)}to{opacity:0;transform:scale(1.02);filter:blur(8px)}}.nuva-launch-v2{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;isolation:isolate;background:radial-gradient(circle at 50% 48%,#fff 0%,#f7f7fc 45%,#e9e8f5 100%);color:#111027;font-family:inherit}.nuva-launch-v2--exit{animation:nv2Exit .9s cubic-bezier(.16,1,.3,1) both}.nuva-launch-v2__ambient,.nuva-launch-v2__grid,.nuva-launch-v2__ring,.nuva-launch-v2__beam{position:absolute;pointer-events:none}.nuva-launch-v2__ambient{inset:-30%;background:radial-gradient(circle at 50% 45%,rgba(100,75,240,.24),transparent 34%),radial-gradient(circle at 20% 70%,rgba(70,50,190,.12),transparent 32%)}.nuva-launch-v2__grid{inset:0;opacity:.18;background-image:linear-gradient(rgba(70,50,190,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(70,50,190,.08) 1px,transparent 1px);background-size:58px 58px;mask-image:radial-gradient(circle,#000,transparent 72%)}.nuva-launch-v2__stage{position:relative;width:min(94vw,760px);height:min(94vw,760px)}.nuva-launch-v2__orbit{position:absolute;inset:0;z-index:4}.nuva-launch-v2__module{position:absolute;left:50%;top:50%;width:78px;display:flex;flex-direction:column;align-items:center;gap:7px;will-change:transform,opacity,filter}.nuva-launch-v2__icon{width:54px;height:54px;display:grid;place-items:center;border-radius:17px;border:1px solid rgba(70,50,190,.25);background:rgba(255,255,255,.94);box-shadow:0 12px 34px rgba(40,25,110,.12),0 0 34px rgba(110,85,255,.18);backdrop-filter:blur(14px)}.nuva-launch-v2__icon svg{width:23px;height:23px;color:#4631b8;stroke-width:2}.nuva-launch-v2__module span{color:#111027;font-size:10px;font-weight:850;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}.nuva-launch-v2__core{position:absolute;left:50%;top:50%;z-index:5;width:205px;height:205px;display:grid;place-items:center}.nuva-launch-v2__halo{position:absolute;inset:-90px;border-radius:50%;background:radial-gradient(circle,rgba(105,75,255,.30),rgba(70,50,190,.07) 42%,transparent 72%)}.nuva-launch-v2__core-ring{position:absolute;inset:12px;border-radius:50%;border:1px solid rgba(70,50,190,.38);box-shadow:0 0 55px rgba(105,75,255,.25),inset 0 0 35px rgba(105,75,255,.12)}.nuva-launch-v2__pulse{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(105,75,255,.50)}.nuva-launch-v2__logo{z-index:2;width:150px;height:150px;border-radius:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,.94);border:1px solid rgba(10,10,20,.14);box-shadow:0 0 95px rgba(105,75,255,.28),0 24px 90px rgba(0,0,0,.12),inset 0 1px white}.nuva-launch-v2__logo span{color:#111027;font-size:clamp(30px,6vw,44px);font-weight:800;letter-spacing:-.06em;line-height:.95}.nuva-launch-v2__logo small{color:#4631b8;letter-spacing:.42em;margin-top:9px;padding-left:.42em;font-size:10px;font-weight:850}.nuva-launch-v2__ring{left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%)}.nuva-launch-v2__outer{width:min(90vw,680px);aspect-ratio:1;border:1px solid rgba(70,50,190,.20)}.nuva-launch-v2__inner{width:min(66vw,500px);aspect-ratio:1;border:1px dashed rgba(70,50,190,.24)}.nuva-launch-v2__beam{left:50%;top:50%;width:65vw;height:2px;background:linear-gradient(90deg,transparent,rgba(105,75,255,.40),transparent)}.nuva-launch-v2__tagline{position:absolute;left:50%;bottom:5%;display:flex;align-items:center;gap:8px;white-space:nowrap;font-size:10px;font-weight:750;letter-spacing:.22em;text-transform:uppercase}.nuva-launch-v2__tagline svg{width:13px;height:13px;color:#4631b8}.nuva-launch-v2__welcome{position:absolute;z-index:8;left:50%;top:5%;text-align:center;white-space:nowrap}.nuva-launch-v2__welcome-title{font-size:clamp(20px,3.4vw,34px);font-weight:850;letter-spacing:-.045em}.nuva-launch-v2__welcome-subtitle{margin-top:8px;font-size:clamp(9px,1.35vw,12px);font-weight:750;letter-spacing:.2em;text-transform:uppercase;opacity:.66}.nuva-launch-v2__skip{position:absolute;right:20px;top:20px;z-index:20;display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:999px;border:1px solid rgba(10,10,20,.14);background:rgba(255,255,255,.72);color:#111027;font-size:11px;font-weight:700;cursor:pointer}@media(max-width:640px){.nuva-launch-v2__stage{width:100vw;height:100vw}.nuva-launch-v2__module{width:62px}.nuva-launch-v2__icon{width:42px;height:42px;border-radius:14px}.nuva-launch-v2__icon svg{width:18px;height:18px}.nuva-launch-v2__module span{font-size:8px}.nuva-launch-v2__core{width:160px;height:160px}.nuva-launch-v2__logo{width:122px;height:122px;border-radius:32px}.nuva-launch-v2__tagline{font-size:8px;letter-spacing:.18em}.nuva-launch-v2__welcome{top:6%}}`}</style>
    <div data-nuva-v2-ambient className="nuva-launch-v2__ambient"/><div className="nuva-launch-v2__grid"/><div data-nuva-v2-beam="1" className="nuva-launch-v2__beam"/><div data-nuva-v2-beam="2" className="nuva-launch-v2__beam"/><div data-nuva-v2-outer className="nuva-launch-v2__ring nuva-launch-v2__outer"/><div data-nuva-v2-inner className="nuva-launch-v2__ring nuva-launch-v2__inner"/>
    <div className="nuva-launch-v2__stage"><div className="nuva-launch-v2__orbit" aria-hidden="true">{ITEMS.map(([label, Icon]) => <div key={label} data-nuva-v2-module className="nuva-launch-v2__module"><div className="nuva-launch-v2__icon"><Icon/></div><span>{label}</span></div>)}</div><div data-nuva-v2-core className="nuva-launch-v2__core"><div data-nuva-v2-halo className="nuva-launch-v2__halo"/><div data-nuva-v2-ring className="nuva-launch-v2__core-ring"/><div data-nuva-v2-pulse className="nuva-launch-v2__pulse"/><div data-nuva-v2-logo className="nuva-launch-v2__logo"><span>Nüva</span><small>ONE</small></div></div><div data-nuva-v2-tagline className="nuva-launch-v2__tagline"><Sparkles/> Todo tu negocio. Una inteligencia.</div><div data-nuva-v2-welcome className="nuva-launch-v2__welcome"><div className="nuva-launch-v2__welcome-title">Bienvenido a Nüva One</div><div className="nuva-launch-v2__welcome-subtitle">Todo tu negocio. Una inteligencia.</div></div></div>
    <button className="nuva-launch-v2__skip" onClick={skip}><X/> Omitir</button>
    </div>
  );
}
