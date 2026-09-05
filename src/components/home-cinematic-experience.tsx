import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ArrowDown, ArrowRight, Check, ScanLine, Sparkles } from "lucide-react";
import "@/home-cinematic.css";
import "@/home-cinematic-art-direction.css";

type Scene = {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  body: string;
  visual: string;
  metric?: string;
  metricLabel?: string;
  screen?: string;
};

const SCENES: Scene[] = [
  { id: "hero", number: "01", eyebrow: "EL NEGOCIO REAL", title: "Todo empieza aquí.", body: "Tu negocio ya está funcionando. Nüva One entra en escena para conectar lo que ocurre detrás de cada venta.", visual: "store-open", metric: "07:42", metricLabel: "apertura" },
  { id: "sales", number: "02", eyebrow: "VENTAS", title: "Cada oportunidad cuenta.", body: "Una persona atiende. Una venta sucede. Nüva One convierte esa acción en información útil para todo el negocio.", visual: "counter", screen: "VENTA · $48.990" },
  { id: "customers", number: "03", eyebrow: "CLIENTES", title: "Conoce a quien vuelve.", body: "El cliente no es una fila de tickets. Su historial, sus compras y su relación con tu negocio viven en el mismo contexto.", visual: "customer", screen: "CLIENTE · RECURRENTE" },
  { id: "inventory", number: "04", eyebrow: "INVENTARIO", title: "Cuando todo está desordenado, cada minuto cuesta.", body: "La cámara entra al almacenamiento. Productos, cajas y stock dejan de ser una búsqueda a ciegas.", visual: "inventory", screen: "248 SKU · 5 ATENCIÓN" },
  { id: "scanner", number: "05", eyebrow: "SCANNER", title: "Un código. Toda la información.", body: "Escanea un producto y conecta en segundos SKU, precio, stock y movimientos.", visual: "scanner", screen: "SKU 8472 · STOCK 18" },
  { id: "purchases", number: "06", eyebrow: "COMPRAS", title: "Anticípate.", body: "Nüva detecta una señal antes de que se convierta en un problema y propone el siguiente movimiento.", visual: "replenish", screen: "STOCK BAJO → REPOSICIÓN" },
  { id: "cash", number: "07", eyebrow: "CAJA", title: "Cada peso cuenta.", body: "La venta actualiza cliente, inventario, caja y finanzas sin obligarte a duplicar trabajo.", visual: "cash", screen: "VENTA · SINCRONIZADA" },
  { id: "shipping", number: "08", eyebrow: "DESPACHOS", title: "Del negocio a la puerta.", body: "El pedido sale del estante y el estado sigue avanzando contigo.", visual: "shipping", screen: "PEDIDO · DESPACHADO" },
  { id: "finance", number: "09", eyebrow: "FINANZAS", title: "Entiende lo que realmente está pasando.", body: "En vez de más gráficos, una lectura clara: qué cambió, por qué importa y dónde conviene mirar.", visual: "desk", screen: "MARGEN +3,2%" },
  { id: "score", number: "10", eyebrow: "NÜVA SCORE", title: "No solo muestra datos. Los entiende.", body: "Ventas, inventario, clientes, finanzas y operaciones convergen en una lectura ejecutiva del negocio.", visual: "score", metric: "86", metricLabel: "salud del negocio" },
  { id: "automation", number: "11", eyebrow: "AUTOMATIZACIONES", title: "Tu negocio empieza a trabajar contigo.", body: "Una señal activa una cadena: detectar, alertar, recomendar y actuar.", visual: "automation", screen: "DETECTA → RECOMIENDA → ACTÚA" },
  { id: "studio", number: "12", eyebrow: "NÜVA STUDIO · IA", title: "Pregúntale a tu negocio.", body: "La IA entiende el contexto de tu empresa para ayudarte a decidir qué hacer esta semana.", visual: "studio", screen: "¿QUÉ DEBERÍA HACER ESTA SEMANA?" },
  { id: "connections", number: "13", eyebrow: "CONEXIONES", title: "Todo conectado.", body: "WhatsApp, facturación, pagos, IA y automatizaciones forman parte del mismo flujo operativo.", visual: "connections", metric: "∞", metricLabel: "contexto compartido" },
  { id: "final", number: "14", eyebrow: "NÜVA ONE", title: "Tu negocio. Todo conectado.", body: "La cámara vuelve al mismo lugar donde comenzó. La diferencia es que ahora todo tiene contexto.", visual: "store-final" },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function useElementProgress(ref: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = ref.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const scrollable = Math.max(element.offsetHeight - window.innerHeight, 1);
        setProgress(clamp(-rect.top / scrollable));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref]);

  return progress;
}

function SceneVisual({ scene, sceneProgress }: { scene: Scene; sceneProgress: number }) {
  const shift = `${(sceneProgress - 0.5) * -3}%`;
  const scale = 1.02 + sceneProgress * 0.045;

  return (
    <div className={`cinematic-visual cinematic-visual--${scene.visual}`} style={{ transform: `translate3d(0, ${shift}, 0) scale(${scale})` }}>
      <div className="cinematic-visual__grain" />
      <div className="cinematic-visual__window" />
      <div className="cinematic-visual__light" />
      <div className="cinematic-visual__floor" />
      <div className="cinematic-visual__shelf" />
      <div className="cinematic-visual__boxes" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <div className="cinematic-visual__subject"><div className="cinematic-visual__subject-head" /><div className="cinematic-visual__subject-body" /></div>
      <div className="cinematic-visual__customer" aria-hidden="true"><span /><i /></div>
      <div className="cinematic-visual__counter" />
      <div className="cinematic-visual__device"><div className="cinematic-screen"><span>{scene.screen ?? "NÜVA ONE"}</span><div className="cinematic-screen__lines" /></div></div>
      <div className="cinematic-visual__scanner" aria-hidden="true"><span /><i /></div>
      <div className="cinematic-visual__package" aria-hidden="true"><span /><i /><b /></div>
      <div className="cinematic-visual__object" />
      <div className="cinematic-visual__signal" aria-hidden="true"><i /><i /><i /></div>
      <div className="cinematic-visual__network" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="cinematic-visual__accent" />
      {scene.metric && <div className="cinematic-visual__metric"><strong>{scene.metric}</strong><span>{scene.metricLabel}</span></div>}
    </div>
  );
}

export function HomeCinematicExperience() {
  const storyRef = useRef<HTMLElement>(null);
  const progress = useElementProgress(storyRef);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const sceneIndex = Math.min(SCENES.length - 1, Math.floor(progress * SCENES.length));
  const sceneProgress = reducedMotion ? 0.5 : (progress * SCENES.length) % 1;
  const scene = SCENES[sceneIndex];
  const nextScene = SCENES[Math.min(sceneIndex + 1, SCENES.length - 1)];
  const globalPercent = Math.round(progress * 100);
  const navItems = useMemo(() => SCENES.filter((item) => ["hero", "sales", "inventory", "score", "studio", "final"].includes(item.id)), []);

  return (
    <section ref={storyRef} className="cinematic-story" aria-label="Experiencia cinematográfica de Nüva One">
      <div className="cinematic-story__sticky">
        <div className="cinematic-story__stage" aria-hidden="true">
          <SceneVisual scene={scene} sceneProgress={sceneProgress} />
          {nextScene.id !== scene.id && <div className="cinematic-story__next" style={{ opacity: sceneProgress }}><SceneVisual scene={nextScene} sceneProgress={0} /></div>}
          <div className="cinematic-story__wash" />
        </div>

        <div className="cinematic-story__chrome">
          <Link to="/" className="cinematic-wordmark">Nüva One</Link>
          <div className="cinematic-progress" aria-label={`Progreso ${globalPercent}%`}><span>{scene.number}</span><div><i style={{ transform: `scaleX(${progress})` }} /></div><span>{String(SCENES.length).padStart(2, "0")}</span></div>
          <Link to="/auth" search={{ mode: "signup" }} className="cinematic-start">Empezar gratis <ArrowRight size={14} /></Link>
        </div>

        <div className="cinematic-story__nav" aria-hidden="true">
          {navItems.map((item) => <span key={item.id} className={item.id === scene.id ? "is-active" : ""}>{item.number}</span>)}
        </div>

        <div className="cinematic-story__copy" key={scene.id}>
          <div className="cinematic-copy__eyebrow"><span>{scene.number}</span><span>{scene.eyebrow}</span></div>
          <h1>{scene.title}</h1>
          <p>{scene.body}</p>
          {scene.id === "hero" && <div className="cinematic-hero-proof"><span><Check size={13} /> 15 días gratis</span><span><Check size={13} /> Sin tarjeta</span></div>}
          {scene.id === "scanner" && <div className="cinematic-chip"><ScanLine size={15} /> Escaneo en contexto</div>}
          {scene.id === "final" && <div className="cinematic-cta-row"><Link to="/auth" search={{ mode: "signup" }} className="cinematic-cta cinematic-cta--primary">Empezar gratis <ArrowRight size={16} /></Link><Link to="/demo" className="cinematic-cta cinematic-cta--secondary">Ver Nüva en acción</Link></div>}
        </div>

        <div className="cinematic-story__scroll-hint"><ArrowDown size={15} /><span>Scroll para entrar</span></div>
        <div className="cinematic-story__caption"><Sparkles size={12} /><span>INTELIGENCIA PARA PYMEs</span></div>
      </div>

      <div className="cinematic-story__timeline" aria-hidden="true">
        {SCENES.map((item) => <span key={item.id} id={`cinematic-${item.id}`} />)}
      </div>
    </section>
  );
}
