import { useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent, type WheelEvent } from "react";
import { Link } from "@tanstack/react-router";

const ROOMS = [
  { id: "reception", area: "Recepción", module: "Dashboard", accent: "195 95% 58%", title: "Entra. Nüva ya tiene el pulso del negocio.", copy: "Una vista ejecutiva donde Score, alertas y señales importantes aparecen antes de que tengas que buscarlas.", metrics: ["82", "+18%", "24"], labels: ["NÜVA SCORE", "VENTAS", "ALERTAS"] },
  { id: "sales", area: "Sala de Ventas", module: "CRM", accent: "28 95% 62%", title: "Donde cada oportunidad tiene contexto.", copy: "Clientes, oportunidades y pipeline viven en una misma escena para que ventas no pierda el hilo.", metrics: ["128", "34", "72%"], labels: ["CLIENTES", "OPORTUNIDADES", "CONVERSIÓN"] },
  { id: "warehouse", area: "Bodega", module: "Inventario + Compras", accent: "145 65% 52%", title: "Mira el stock antes de que se convierta en un problema.", copy: "Inventario, movimientos, mínimos y compras conectados en una vista operativa.", metrics: ["1.248", "17", "93%"], labels: ["SKU", "BAJO STOCK", "DISPONIBLE"] },
  { id: "meeting", area: "Sala de Reuniones", module: "Cotizaciones", accent: "270 82% 68%", title: "La negociación también deja una huella.", copy: "Cotizaciones y seguimiento comercial preparados para convertir una conversación en una decisión.", metrics: ["46", "$8,4M", "68%"], labels: ["COTIZACIONES", "PIPELINE", "CIERRE"] },
  { id: "archive", area: "Archivo", module: "Documentos", accent: "205 80% 68%", title: "Todo documento. En el lugar correcto.", copy: "Archivos, permisos y acceso seguro sin convertir la operación en una búsqueda interminable.", metrics: ["392", "99%", "14"], labels: ["ARCHIVOS", "CONTROL", "CUOTAS"] },
  { id: "comms", area: "Centro de Comunicaciones", module: "Integraciones", accent: "340 82% 68%", title: "La empresa sigue hablando mientras tú decides.", copy: "Notificaciones e integraciones acercan conversaciones, pagos y eventos al contexto operativo.", metrics: ["31", "98%", "12"], labels: ["SEÑALES", "ENTREGAS", "CANALES"] },
  { id: "ai", area: "Sala de Datos", module: "Nüva IA", accent: "185 90% 58%", title: "Entra al lugar donde los datos empiezan a responder.", copy: "Explícame mi negocio, memoria y contexto para pasar de mirar indicadores a entenderlos.", metrics: ["7", "4,8x", "92%"], labels: ["PREGUNTAS", "CONTEXTO", "CLARIDAD"] },
  { id: "admin", area: "Administración", module: "Billing", accent: "48 95% 62%", title: "La última pieza: control sin fricción.", copy: "Planes, entitlements y administración preparados para crecer con el negocio.", metrics: ["PRO", "12", "100%"], labels: ["PLAN", "USUARIOS", "ACCESO"] },
  { id: "exit", area: "Recepción de salida", module: "Nüva One", accent: "195 95% 58%", title: "Ahora ya conoces el recorrido.", copy: "El siguiente paso es entrar a tu propia empresa y ver qué puede hacer Nüva con tus datos.", metrics: ["01", "ONE", "→"], labels: ["CONECTA", "ENTIENDE", "DECIDE"] },
] as const;

type Room = (typeof ROOMS)[number];

function SceneSurface({ room }: { room: Room }) {
  return (
    <div className="nuva-company-tour__room" style={{ "--tour-accent": `hsl(${room.accent})` } as CSSProperties}>
      <div className="nuva-company-tour__ceiling" />
      <div className="nuva-company-tour__floor" />
      <div className="nuva-company-tour__desk" />
      <div className="nuva-company-tour__screen">
        <div className="nuva-company-tour__screen-head"><span>NÜVA ONE / {room.module}</span><span>LIVE · 09:41</span></div>
        <div className="nuva-company-tour__screen-title">{room.area}</div>
        <div className="nuva-company-tour__screen-grid">
          {room.metrics.map((metric, index) => <div className="nuva-company-tour__metric" key={metric}><b>{metric}</b><span>{room.labels[index]}</span></div>)}
        </div>
        <div className="nuva-company-tour__chart" />
      </div>
      <div className="nuva-company-tour__label nuva-company-tour__label--top">NÜVA / 0{ROOMS.indexOf(room) + 1} — {room.module}</div>
      <div className="nuva-company-tour__label nuva-company-tour__label--bottom">BUSINESS OPERATING SYSTEM / CHILE</div>
      <div className="nuva-company-tour__label nuva-company-tour__label--right">DATA → CONTEXT → DECISION</div>
    </div>
  );
}

export function NuvaCompanyTour() {
  const [active, setActive] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const wheelLock = useRef(false);
  const touchStart = useRef<number | null>(null);
  const timers = useRef<number[]>([]);
  const room = ROOMS[active];

  const go = (nextIndex: number) => {
    const target = Math.max(0, Math.min(ROOMS.length - 1, nextIndex));
    if (target === active || transitioning) return;
    setTransitioning(true);
    const first = window.setTimeout(() => {
      setActive(target);
      const second = window.setTimeout(() => setTransitioning(false), 90);
      timers.current.push(second);
    }, 260);
    timers.current.push(first);
  };

  const next = () => go(active + 1);
  const previous = () => go(active - 1);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next();
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") previous();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, transitioning]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const hotspots = useMemo(() => {
    const firstTarget = Math.min(active + 1, ROOMS.length - 1);
    const secondTarget = Math.min(active + 2, ROOMS.length - 1);
    return [
      { left: "24%", top: "42%", target: firstTarget, label: `Entrar a ${ROOMS[firstTarget].area}` },
      { left: "68%", top: "48%", target: secondTarget, label: `Explorar ${ROOMS[secondTarget].module}` },
    ];
  }, [active]);

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) < 8 || wheelLock.current) return;
    wheelLock.current = true;
    event.deltaY > 0 ? next() : previous();
    const timer = window.setTimeout(() => { wheelLock.current = false; }, 820);
    timers.current.push(timer);
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => { touchStart.current = event.touches[0]?.clientY ?? null; };
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const end = event.changedTouches[0]?.clientY;
    touchStart.current = null;
    if (start === null || end === undefined || Math.abs(start - end) < 42) return;
    start > end ? next() : previous();
  };

  return (
    <section id="company-tour" className="nuva-company-tour" aria-label="Visita a la empresa Nüva">
      <div className="nuva-company-tour__stage" onWheel={onWheel} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {ROOMS.map((item, index) => (
          <div key={item.id} className={`nuva-company-tour__scene ${index === active ? "is-active" : ""}`} style={{ "--tour-accent": `hsl(${item.accent})` } as CSSProperties} aria-hidden={index !== active}>
            <SceneSurface room={item} />
            {index === active && hotspots.map((hotspot) => <button key={`${hotspot.target}-${hotspot.left}`} type="button" className="nuva-company-tour__hotspot" style={{ left: hotspot.left, top: hotspot.top }} onClick={() => go(hotspot.target)} aria-label={hotspot.label}><span>{hotspot.label}</span></button>)}
          </div>
        ))}
        <div className="nuva-company-tour__hud"><div className="nuva-company-tour__eyebrow">{room.module} / 0{active + 1}</div><h2 className="nuva-company-tour__title">{room.title}</h2><p className="nuva-company-tour__copy">{room.copy}</p></div>
        <div className="nuva-company-tour__map" aria-label="Mapa del recorrido">{ROOMS.map((item, index) => <button key={item.id} type="button" className={index === active ? "is-active" : ""} onClick={() => go(index)} aria-label={`Ir a ${item.area}`} aria-current={index === active ? "step" : undefined} />)}</div>
        <button type="button" className="nuva-company-tour__skip" onClick={() => document.getElementById("what-is-nuva")?.scrollIntoView({ behavior: "smooth" })}>Saltar tour ↗</button>
        <div className="nuva-company-tour__controls">
          <div className="nuva-company-tour__progress" aria-label={`Sala ${active + 1} de ${ROOMS.length}`}>{ROOMS.map((item, index) => <span key={item.id} className={`nuva-company-tour__dot ${index === active ? "is-active" : ""}`} />)}</div>
          <div className="nuva-company-tour__room-name">{room.area} — {room.module}</div>
          {active < ROOMS.length - 1 ? <button type="button" className="nuva-company-tour__next" onClick={next}>Siguiente sala <span>↗</span></button> : <Link to="/auth" search={{ mode: "signup" }} className="nuva-company-tour__next">Entrar a Nüva <span>↗</span></Link>}
        </div>
        <div className="nuva-company-tour__scroll-hint">SCROLL / WHEEL / SWIPE TO MOVE</div>
        <div className={`nuva-company-tour__transition ${transitioning ? "is-on" : ""}`} aria-hidden="true"><div><small>Entrando a la siguiente sala</small><strong>{room.area}</strong></div></div>
      </div>
    </section>
  );
}
