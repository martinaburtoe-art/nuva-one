import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Check, Sparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PublicAiChatWidget } from "@/components/public-ai-chat-widget";

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

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function useProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const element = ref.current;
        if (!element) return;
        const range = Math.max(element.offsetHeight - window.innerHeight, 1);
        setProgress(clamp(-element.getBoundingClientRect().top / range));
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref]);

  return progress;
}

function SceneArt({ kind, progress }: { kind: string; progress: number }) {
  const style = { "--art-progress": progress } as React.CSSProperties;
  const chapter = CHAPTERS.find((item) => item.visual === kind);

  return (
    <div className={`editorial-art editorial-art--${kind}`} style={style} aria-hidden="true">
      <div className="editorial-art__image">
        <div className="editorial-art__grain" />
        <div className="editorial-art__architecture editorial-art__architecture--one" />
        <div className="editorial-art__architecture editorial-art__architecture--two" />
        <div className="editorial-art__architecture editorial-art__architecture--three" />
      </div>
      <div className="editorial-art__light" />
      <div className="editorial-art__subject"><span /><i /></div>
      <div className="editorial-art__surface" />
      <div className="editorial-art__object editorial-art__object--a" />
      <div className="editorial-art__object editorial-art__object--b" />
      <div className="editorial-art__ui">
        <span className="editorial-art__ui-label">NÜVA ONE / {chapter?.kicker}</span>
        <strong>{chapter?.metric}</strong>
        <small>contexto actualizado</small>
      </div>
      <div className="editorial-art__line" />
      <div className="editorial-art__caption"><span>{String(CHAPTERS.findIndex((item) => item.visual === kind) + 1).padStart(2, "0")}</span><small>{chapter?.label}</small></div>
    </div>
  );
}

function FeatureStrip() {
  const items = ["Ventas", "Clientes", "Inventario", "Scanner", "Compras", "Caja", "Despachos", "Finanzas", "Nüva Score", "IA", "Automatizaciones"];
  return <div className="editorial-feature-strip" aria-label="Módulos conectados">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}

export function EditorialHomeExperience() {
  const storyRef = useRef<HTMLElement>(null);
  const progress = useProgress(storyRef);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [active, setActive] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<"forward" | "backward">("forward");
  const previousProgress = useRef(0);
  const chapters = useMemo(() => CHAPTERS, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (progress > previousProgress.current + 0.0005) setScrollDirection("forward");
    if (progress < previousProgress.current - 0.0005) setScrollDirection("backward");
    previousProgress.current = progress;
    const next = Math.min(chapters.length - 1, Math.floor(progress * chapters.length));
    setActive(next);
  }, [progress, chapters.length]);

  const chapter = chapters[active];
  const chapterPosition = progress * chapters.length;
  const chapterProgress = reducedMotion ? 0.5 : active === chapters.length - 1 ? 1 : clamp(chapterPosition - active);
  const previousChapter = chapters[Math.max(active - 1, 0)];
  const nextChapter = chapters[Math.min(active + 1, chapters.length - 1)];
  const isBackward = scrollDirection === "backward" && active > 0;
  const outgoingChapter = isBackward ? previousChapter : chapter;
  const incomingChapter = isBackward ? chapter : nextChapter;
  const outgoingOpacity = isBackward ? 1 - chapterProgress : 1 - chapterProgress;
  const incomingOpacity = isBackward ? chapterProgress : chapterProgress;

  const go = (index: number) => {
    const element = storyRef.current;
    if (!element) return;
    const range = Math.max(element.offsetHeight - window.innerHeight, 1);
    const targetProgress = index === chapters.length - 1 ? 0.998 : Math.min(0.998, index / chapters.length + 0.02);
    window.scrollTo({
      top: window.scrollY + element.getBoundingClientRect().top + range * targetProgress,
      behavior: reducedMotion ? "auto" : "smooth",
    });
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
            <div className="editorial-story__progress-readout" aria-live="polite">
              <span>PROGRESO</span><strong>{Math.round(progress * 100)}%</strong><i><b style={{ transform: `scaleX(${progress})` }} /></i>
            </div>
            <div className={`editorial-story__background editorial-story__background--${chapter.visual}`} style={{ "--scene-progress": chapterProgress } as React.CSSProperties} />
            <div className="editorial-story__art-wrap editorial-scene-enter" style={{ opacity: outgoingOpacity, filter: `blur(${(1 - chapterProgress) * 2}px)`, transition: "opacity .18s linear, filter .18s linear" }}>
              <SceneArt kind={outgoingChapter.visual} progress={isBackward ? 0.5 : chapterProgress} />
            </div>
            <div className="editorial-story__art-wrap editorial-scene-enter" style={{ opacity: incomingOpacity, filter: `blur(${(1 - chapterProgress) * 2}px)`, transition: "opacity .18s linear, filter .18s linear" }}>
              <SceneArt kind={incomingChapter.visual} progress={isBackward ? chapterProgress : 0} />
            </div>
            <div className="editorial-story__veil" />

            <div className="editorial-story__topline"><span>EXPERIENCIA / NÜVA ONE</span><span>{String(active + 1).padStart(2, "0")} — {String(chapters.length).padStart(2, "0")}</span></div>
            <div key={`copy-${chapter.id}`} className="editorial-story__copy editorial-scene-copy-enter">
              <span className="editorial-kicker">{chapter.kicker}</span>
              <h1>{chapter.title}</h1>
              <p>{chapter.text}</p>
              <span className="editorial-scroll-note"><ArrowDown size={14} /> Desplaza para continuar</span>
            </div>
            <div key={`metric-${chapter.id}`} className="editorial-story__metric editorial-scene-metric-enter"><span>{chapter.metric}</span><small>SEÑAL DEL NEGOCIO</small></div>

            <aside className="editorial-chapters" aria-label="Capítulos">
              {chapters.map((item, index) => <button key={item.id} className={index === active ? "is-active" : ""} onClick={() => go(index)} aria-label={`Ir a ${item.label}`}><i /> <span>{item.label}</span></button>)}
            </aside>

            <div className="editorial-progress" aria-label={`Progreso de la experiencia: ${Math.round(progress * 100)}%`}><span style={{ transform: `scaleX(${progress})` }} /></div>
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
          <div><span className="editorial-kicker">PREGUNTAS FRECUENTES</span><h2>Lo esencial, sin letra pequeña.</h2><p className="editorial-faq__note">Nüva One está pensado para acompañar la operación real de una PYME sin convertirla en una experiencia compleja.</p></div>
          <div className="editorial-faq__list">
            <details><summary>¿Mis datos están seguros?</summary><p>Usamos cifrado en tránsito y en reposo y aislamiento por negocio con Row-Level Security.</p></details>
            <details><summary>¿Necesito tarjeta para empezar?</summary><p>No. Tienes 15 días de prueba gratuita con acceso completo, sin tarjeta.</p></details>
            <details><summary>¿Puedo conectar Instagram y Facebook?</summary><p>Sí, mediante tu propia cuenta de Meta Business. Te guiamos en la conexión.</p></details>
            <details><summary>¿Funciona para mi rubro?</summary><p>Sí. Nüva One está pensado para adaptarse a distintos tipos de negocios y operaciones.</p></details>
            <details><summary>¿Puedo cancelar cuando quiera?</summary><p>Sí. Sin contratos ni cargos por cancelación.</p></details>
          </div>
        </section>

        <section className="editorial-final">
          <div className="editorial-final__mark"><Zap size={18} /> NÜVA ONE</div>
          <h2>Menos fragmentación.<br /><em>Más contexto.</em></h2>
          <p>Empieza con 15 días gratis y descubre cómo cambia la forma en que gestionas y entiendes tu negocio.</p>
          <div className="editorial-final__actions"><Link to="/auth" search={{ mode: "signup" }}>Empezar gratis <ArrowRight size={15} /></Link><Link to="/pricing">Ver planes</Link></div>
          <div className="editorial-final__checks"><span><Check size={13} /> 15 días gratis</span><span><Check size={13} /> Sin tarjeta</span><span><Check size={13} /> Crece contigo</span></div>
        </section>
      </main>

      <footer className="editorial-footer"><span>Nüva One</span><span>© {new Date().getFullYear()} Nüva One. Todos los derechos reservados.</span><Link to="/">Volver a la Homepage actual</Link></footer>
      <PublicAiChatWidget />
    </div>
  );
}
