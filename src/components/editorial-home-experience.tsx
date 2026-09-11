import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Check, ScanLine, Sparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const CHAPTERS = [
  { id: "hero", label: "Inicio", kicker: "EL NEGOCIO REAL", title: "Todo empieza aquí.", text: "Una sola mirada para entender lo que ocurre detrás de cada decisión.", visual: "hero", metric: "01" },
  { id: "sales", label: "Ventas", kicker: "VENTAS", title: "Cada oportunidad cuenta.", text: "Registra ventas y convierte cada interacción en contexto para el resto del negocio.", visual: "sales", metric: "$48.990" },
  { id: "customers", label: "Clientes", kicker: "CLIENTES", title: "Conoce a quien vuelve.", text: "Historial, compras y relación en un mismo lugar para entender por qué un cliente regresa.", visual: "customers", metric: "72%" },
  { id: "inventory", label: "Inventario", kicker: "INVENTARIO", title: "Lo que tienes. Lo que falta. Lo que sigue.", text: "Visualiza stock y movimientos sin perderte entre planillas ni búsquedas interminables.", visual: "inventory", metric: "248 SKU" },
  { id: "scanner", label: "Scanner", kicker: "SCANNER", title: "Un código. Toda la información.", text: "Escanea, identifica y actualiza el contexto del producto en segundos.", visual: "scanner", metric: "SKU 8472" },
  { id: "purchases", label: "Compras", kicker: "COMPRAS", title: "Anticípate.", text: "Convierte las señales del inventario en decisiones de compra antes de quedarte sin stock.", visual: "purchases", metric: "REPOSICIÓN" },
  { id: "cash", label: "Caja", kicker: "CAJA", title: "Cada peso cuenta.", text: "Una venta no termina en la caja: actualiza el contexto que necesita todo tu negocio.", visual: "cash", metric: "+$48.990" },
  { id: "shipping", label: "Despachos", kicker: "DESPACHOS", title: "Del negocio a la puerta.", text: "Sigue el pedido desde el estante hasta el cliente, sin perder el hilo.", visual: "shipping", metric: "EN CAMINO" },
  { id: "finance", label: "Finanzas", kicker: "FINANZAS", title: "Entiende lo que realmente está pasando.", text: "Menos ruido. Más lectura: ingresos, gastos, margen y señales que importan.", visual: "finance", metric: "+3,2%" },
  { id: "score", label: "Nüva Score", kicker: "NÜVA SCORE", title: "No solo muestra datos. Los entiende.", text: "Una lectura ejecutiva para saber cómo está tu negocio y dónde conviene mirar.", visual: "score", metric: "86" },
  { id: "automation", label: "Automatizaciones", kicker: "AUTOMATIZACIONES", title: "Tu negocio empieza a trabajar contigo.", text: "Detecta, alerta, recomienda y actúa sobre tareas que antes dependían de ti.", visual: "automation", metric: "24/7" },
  { id: "studio", label: "Nüva Studio", kicker: "NÜVA STUDIO · IA", title: "Pregúntale a tu negocio.", text: "Una conversación con el contexto real de tu empresa para decidir qué hacer después.", visual: "studio", metric: "IA" },
  { id: "connections", label: "Conexiones", kicker: "CONEXIONES", title: "Todo conectado.", text: "Ventas, clientes, inventario, caja, finanzas e inteligencia dejan de vivir por separado.", visual: "connections", metric: "∞" },
  { id: "final", label: "Nüva One", kicker: "NÜVA ONE", title: "Tu negocio. Todo conectado.", text: "Empieza con una operación más clara y construye sobre ella a medida que creces.", visual: "final", metric: "14 / 14" },
] as const;

function clamp(value: number) { return Math.min(1, Math.max(0, value)); }

function useProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const range = Math.max(el.offsetHeight - window.innerHeight, 1);
        setProgress(clamp(-el.getBoundingClientRect().top / range));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [ref]);
  return progress;
}

function SceneArt({ kind, progress }: { kind: string; progress: number }) {
  const style = { "--art-progress": progress } as React.CSSProperties;
  return (
    <div className={`editorial-art editorial-art--${kind}`} style={style} aria-hidden="true">
      <div className="editorial-art__image" />
      <div className="editorial-art__light" />
      <div className="editorial-art__subject"><span /><i /></div>
      <div className="editorial-art__surface" />
      <div className="editorial-art__object editorial-art__object--a" />
      <div className="editorial-art__object editorial-art__object--b" />
      <div className="editorial-art__ui">
        <span className="editorial-art__ui-label">NÜVA ONE</span>
        <strong>{CHAPTERS.find((item) => item.visual === kind)?.metric}</strong>
        <small>contexto actualizado</small>
      </div>
      <div className="editorial-art__line" />
    </div>
  );
}

function FeatureStrip() {
  const items = ["Ventas", "Clientes", "Inventario", "Compras", "Caja", "Despachos", "Finanzas", "Nüva Score", "IA", "Automatizaciones"];
  return <div className="editorial-feature-strip" aria-label="Módulos conectados">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}

export function EditorialHomeExperience() {
  const storyRef = useRef<HTMLElement>(null);
  const progress = useProgress(storyRef);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [active, setActive] = useState(0);
  const chapters = useMemo(() => CHAPTERS, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync(); query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    const next = Math.min(chapters.length - 1, Math.floor(progress * chapters.length));
    setActive(next);
  }, [progress, chapters.length]);

  const chapter = chapters[active];
  const chapterProgress = reducedMotion ? 0.5 : (active === chapters.length - 1 ? 1 : progress * chapters.length - active);
  const go = (index: number) => {
    const el = storyRef.current;
    if (!el) return;
    const range = Math.max(el.offsetHeight - window.innerHeight, 1);
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top + range * ((index + 0.002) / chapters.length), behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <div className="editorial-home">
      <header className="editorial-nav">
        <Link to="/" className="editorial-brand">Nüva One<span>.</span></Link>
        <nav aria-label="Navegación de experiencia">
          <button onClick={() => go(1)}>Producto</button>
          <button onClick={() => go(8)}>Inteligencia</button>
          <Link to="/pricing">Precios</Link>
          <a href="#editorial-faq">FAQ</a>
        </nav>
        <div className="editorial-nav__actions">
          <Link to="/demo" className="editorial-demo"><Sparkles size={14} /> Demo</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="editorial-cta">Empezar gratis <ArrowRight size={14} /></Link>
        </div>
      </header>

      <main>
        <section ref={storyRef} className="editorial-story" aria-label="Nüva One, una historia de negocio">
          <div className="editorial-story__sticky">
            <div className="editorial-story__background" />
            <div className="editorial-story__art-wrap">
              <SceneArt kind={chapter.visual} progress={chapterProgress} />
            </div>
            <div className="editorial-story__veil" />

            <div className="editorial-story__topline"><span>EXPERIENCIA / NÜVA ONE</span><span>{String(active + 1).padStart(2, "0")} — {String(chapters.length).padStart(2, "0")}</span></div>
            <div className="editorial-story__copy">
              <span className="editorial-kicker">{chapter.kicker}</span>
              <h1>{chapter.title}</h1>
              <p>{chapter.text}</p>
              <span className="editorial-scroll-note"><ArrowDown size={14} /> Desplaza para continuar</span>
            </div>
            <div className="editorial-story__metric"><span>{chapter.metric}</span><small>SEÑAL DEL NEGOCIO</small></div>

            <aside className="editorial-chapters" aria-label="Capítulos">
              {chapters.map((item, index) => <button key={item.id} className={index === active ? "is-active" : ""} onClick={() => go(index)} aria-label={`Ir a ${item.label}`}><i /> <span>{item.label}</span></button>)}
            </aside>

            <div className="editorial-progress"><span style={{ transform: `scaleX(${progress})` }} /></div>
          </div>
        </section>

        <section className="editorial-intro">
          <div><span className="editorial-kicker">UN SOLO CONTEXTO</span><h2>Tu negocio no vive en módulos separados.</h2></div>
          <p>Cuando una venta cambia el stock, el cliente, la caja y las finanzas también deberían enterarse. Nüva One conecta ese movimiento para que puedas operar, entender y decidir desde el mismo contexto.</p>
        </section>

        <FeatureStrip />

        <section className="editorial-capabilities">
          <article><span>01</span><h3>Opera.</h3><p>Ventas, clientes, inventario, scanner, compras, caja y despachos en una experiencia coherente.</p><Link to="/auth" search={{ mode: "signup" }}>Comenzar <ArrowRight size={14} /></Link></article>
          <article><span>02</span><h3>Entiende.</h3><p>Finanzas y Nüva Score convierten los movimientos cotidianos en señales comprensibles.</p><Link to="/demo">Ver demo <ArrowRight size={14} /></Link></article>
          <article><span>03</span><h3>Anticípate.</h3><p>Automatizaciones y Nüva Studio te ayudan a detectar lo importante antes de que se convierta en problema.</p><Link to="/auth" search={{ mode: "signup" }}>Probar Nüva <ArrowRight size={14} /></Link></article>
        </section>

        <section id="editorial-faq" className="editorial-faq">
          <div><span className="editorial-kicker">PREGUNTAS FRECUENTES</span><h2>Lo esencial, sin letra pequeña.</h2></div>
          <div className="editorial-faq__list">
            <details><summary>¿Necesito tarjeta para empezar?</summary><p>No. Puedes comenzar con la prueba gratuita sin tarjeta.</p></details>
            <details><summary>¿Puedo conectar mis canales?</summary><p>Sí. Nüva One está preparado para trabajar con conexiones de negocio y servicios externos.</p></details>
            <details><summary>¿Funciona para distintos rubros?</summary><p>Sí. La plataforma está pensada para adaptarse a la operación real de distintos tipos de negocios.</p></details>
          </div>
        </section>

        <section className="editorial-final">
          <div className="editorial-final__mark"><Zap size={18} /> NÜVA ONE</div>
          <h2>Menos fragmentación.<br /><em>Más contexto.</em></h2>
          <p>Haz que tu negocio vuelva a sentirse como una sola cosa.</p>
          <div className="editorial-final__actions"><Link to="/auth" search={{ mode: "signup" }}>Empezar gratis <ArrowRight size={15} /></Link><Link to="/pricing">Ver planes</Link></div>
          <div className="editorial-final__checks"><span><Check size={13} /> 15 días gratis</span><span><Check size={13} /> Sin tarjeta</span><span><Check size={13} /> Crece contigo</span></div>
        </section>
      </main>

      <footer className="editorial-footer"><span>Nüva One</span><span>Experiencia alternativa · 2026</span><Link to="/">Volver a la Homepage actual</Link></footer>
    </div>
  );
}
