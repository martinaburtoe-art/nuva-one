import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";

const ROOMS = [
  { id: "reception", area: "Recepción", module: "Dashboard", accent: "195 95% 58%", title: "Entra. Nüva ya tiene el pulso del negocio.", copy: "Una vista ejecutiva donde Score, alertas y señales importantes aparecen antes de que tengas que buscarlas.", metrics: ["82", "+18%", "24"], labels: ["NÜVA SCORE", "VENTAS", "ALERTAS"] },
  { id: "sales", area: "Sala de Ventas", module: "CRM", accent: "28 95% 62%", title: "Cada oportunidad tiene un lugar y una historia.", copy: "Clientes, oportunidades y pipeline viven en una misma escena para que ventas no pierda el hilo.", metrics: ["128", "34", "72%"], labels: ["CLIENTES", "OPORTUNIDADES", "CONVERSIÓN"] },
  { id: "warehouse", area: "Bodega", module: "Inventario + Compras", accent: "145 65% 52%", title: "Mira el stock antes de que se convierta en un problema.", copy: "Inventario, movimientos, mínimos y compras conectados en una vista operativa.", metrics: ["1.248", "17", "93%"], labels: ["SKU", "BAJO STOCK", "DISPONIBLE"] },
  { id: "meeting", area: "Sala de Reuniones", module: "Cotizaciones", accent: "270 82% 68%", title: "La negociación también deja una huella.", copy: "Cotizaciones y seguimiento comercial preparados para convertir una conversación en una decisión.", metrics: ["46", "$8,4M", "68%"], labels: ["COTIZACIONES", "PIPELINE", "CIERRE"] },
  { id: "archive", area: "Archivo", module: "Documentos", accent: "205 80% 68%", title: "Todo documento. En el lugar correcto.", copy: "Archivos, permisos y acceso seguro sin convertir la operación en una búsqueda interminable.", metrics: ["392", "99%", "14"], labels: ["ARCHIVOS", "CONTROL", "CUOTAS"] },
  { id: "comms", area: "Centro de Comunicaciones", module: "Integraciones", accent: "340 82% 68%", title: "La empresa sigue hablando mientras tú decides.", copy: "Notificaciones e integraciones acercan conversaciones, pagos y eventos al contexto operativo.", metrics: ["31", "98%", "12"], labels: ["SEÑALES", "ENTREGAS", "CANALES"] },
  { id: "ai", area: "Sala de Datos", module: "Nüva IA", accent: "185 90% 58%", title: "Entra al lugar donde los datos empiezan a responder.", copy: "Explícame mi negocio, memoria y contexto para pasar de mirar indicadores a entenderlos.", metrics: ["7", "4,8x", "92%"], labels: ["PREGUNTAS", "CONTEXTO", "CLARIDAD"] },
  { id: "admin", area: "Administración", module: "Billing", accent: "48 95% 62%", title: "La última pieza: control sin fricción.", copy: "Planes, entitlements y administración preparados para crecer con el negocio.", metrics: ["PRO", "12", "100%"], labels: ["PLAN", "USUARIOS", "ACCESO"] },
  { id: "exit", area: "Recepción de salida", module: "Nüva One", accent: "195 95% 58%", title: "Ahora ya conoces el recorrido.", copy: "El siguiente paso es entrar a tu propia empresa y ver qué puede hacer Nüva con tus datos.", metrics: ["01", "ONE", "→"], labels: ["CONECTA", "ENTIENDE", "DECIDE"] },
] as const;

type Room = (typeof ROOMS)[number];

function MiniBar({ value, index }: { value: number; index: number }) {
  return <span className="nuva-company-tour__mini-bar" style={{ "--bar-value": `${value}%`, "--bar-delay": `${index * 55}ms` } as CSSProperties} />;
}

function ProductScene({ room }: { room: Room }) {
  if (room.id === "sales") {
    return (
      <div className="nuva-company-tour__product nuva-company-tour__product--kanban">
        <div className="nuva-company-tour__product-top"><b>Pipeline comercial</b><span>34 oportunidades</span></div>
        <div className="nuva-company-tour__columns">
          {["NUEVO", "EN PROCESO", "CIERRE"].map((column, columnIndex) => (
            <div className="nuva-company-tour__column" key={column}>
              <span>{column}</span>
              {["Comercial Sur", "Andes Market", "Casa Norte"].slice(0, columnIndex + 1).map((name, i) => (
                <div className="nuva-company-tour__lead" key={name}>
                  <i>{name.slice(0, 1)}</i><strong>{name}</strong><small>{columnIndex === 2 ? "$1,8M" : `${8 + i * 4} días`}</small>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (room.id === "warehouse") {
    return (
      <div className="nuva-company-tour__product nuva-company-tour__product--warehouse">
        <div className="nuva-company-tour__product-top"><b>Inventario</b><span>1.248 SKU</span></div>
        <div className="nuva-company-tour__shelves">
          {Array.from({ length: 12 }, (_, i) => <div className={`nuva-company-tour__box ${i === 3 || i === 8 ? "is-low" : ""}`} key={i}><b>{String(1048 + i)}</b><span>{i === 3 || i === 8 ? "LOW" : "OK"}</span></div>)}
        </div>
        <div className="nuva-company-tour__warehouse-foot"><span>17 bajo mínimo</span><b>5 compras sugeridas ↗</b></div>
      </div>
    );
  }

  if (room.id === "meeting") {
    return (
      <div className="nuva-company-tour__product nuva-company-tour__product--quote">
        <div className="nuva-company-tour__paper-head"><span>NÜVA ONE</span><small>COTIZACIÓN #00482</small></div>
        <div className="nuva-company-tour__paper-line is-wide" /><div className="nuva-company-tour__paper-line" />
        <div className="nuva-company-tour__paper-table">{["Implementación", "Plan Pro", "Soporte"].map((x, i) => <div key={x}><span>{x}</span><b>{["$1.200.000", "$89.000", "$140.000"][i]}</b></div>)}</div>
        <div className="nuva-company-tour__paper-total"><span>TOTAL</span><b>$1.429.000</b></div>
      </div>
    );
  }

  if (room.id === "archive") {
    return (
      <div className="nuva-company-tour__product nuva-company-tour__product--archive">
        <div className="nuva-company-tour__product-top"><b>Biblioteca documental</b><span>392 archivos</span></div>
        <div className="nuva-company-tour__folders">{["Contratos", "Facturas", "Cotizaciones", "RRHH", "Operación", "Privado"].map((x, i) => <div key={x}><span className="nuva-company-tour__folder-icon">▱</span><b>{x}</b><small>{12 + i * 7}</small></div>)}</div>
      </div>
    );
  }

  if (room.id === "comms") {
    return (
      <div className="nuva-company-tour__product nuva-company-tour__product--comms">
        <div className="nuva-company-tour__product-top"><b>Centro de señales</b><span>LIVE</span></div>
        <div className="nuva-company-tour__signal"><i>W</i><div><b>WhatsApp</b><span>Cliente respondió a cotización</span></div><small>ahora</small></div>
        <div className="nuva-company-tour__signal"><i>↗</i><div><b>Pago</b><span>Factura #8421 conciliada</span></div><small>2m</small></div>
        <div className="nuva-company-tour__signal"><i>◷</i><div><b>Calendario</b><span>Reunión comercial en 30 min</span></div><small>8m</small></div>
      </div>
    );
  }

  if (room.id === "ai") {
    return (
      <div className="nuva-company-tour__product nuva-company-tour__product--ai">
        <div className="nuva-company-tour__ai-head"><span>NÜVA IA</span><b>CONTEXTO ACTIVO</b></div>
        <div className="nuva-company-tour__ai-question">¿Por qué bajó mi margen esta semana?</div>
        <div className="nuva-company-tour__ai-answer"><span>Analicé ventas, compras e inventario.</span><b>El margen cayó 2,8 pp.</b><p>Principal causa: aumento de costo en 14 productos de mayor rotación. Nüva detecta una oportunidad de ajuste antes del próximo ciclo.</p></div>
        <div className="nuva-company-tour__ai-pills"><span>Ventas</span><span>Inventario</span><span>Compras</span><span>Contexto</span></div>
      </div>
    );
  }

  if (room.id === "admin") {
    return (
      <div className="nuva-company-tour__product nuva-company-tour__product--billing">
        <div className="nuva-company-tour__product-top"><b>Plan actual</b><span>CONTROL</span></div>
        <div className="nuva-company-tour__plan"><span>PRO</span><strong>$39.990</strong><small>mensual · 12 usuarios</small></div>
        <div className="nuva-company-tour__entitlement"><span>Usuarios</span><MiniBar value={72} index={0}></MiniBar><b>9 / 12</b></div>
        <div className="nuva-company-tour__entitlement"><span>Documentos</span><MiniBar value={48} index={1}></MiniBar><b>392 / 800</b></div>
      </div>
    );
  }

  return (
    <div className={`nuva-company-tour__product nuva-company-tour__product--${room.id}`}>
      <div className="nuva-company-tour__product-top"><b>{room.module}</b><span>LIVE · 09:41</span></div>
      <div className="nuva-company-tour__dashboard-metrics">
        {room.metrics.map((metric, index) => <div key={metric}><span>{room.labels[index]}</span><strong>{metric}</strong><MiniBar value={[82, 66, 91][index]} index={index} /></div>)}
      </div>
      <div className="nuva-company-tour__chart-grid"><div className="nuva-company-tour__line-chart"><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="nuva-company-tour__donut"><span>{room.id === "exit" ? "ONE" : "86"}</span></div></div>
    </div>
  );
}

function SceneSurface({ room }: { room: Room }) {
  const index = ROOMS.indexOf(room);
  return (
    <div className="nuva-company-tour__room" style={{ "--tour-accent": `hsl(${room.accent})` } as CSSProperties}>
      <div className="nuva-company-tour__ambient-light" />
      <div className="nuva-company-tour__back-wall" />
      <div className="nuva-company-tour__side-wall nuva-company-tour__side-wall--left" />
      <div className="nuva-company-tour__side-wall nuva-company-tour__side-wall--right" />
      <div className="nuva-company-tour__ceiling" />
      <div className="nuva-company-tour__floor" />
      <div className="nuva-company-tour__window"><span /><span /><span /></div>
      <div className="nuva-company-tour__desk"><div className="nuva-company-tour__desk-edge" /><div className="nuva-company-tour__chair" /></div>
      <div className="nuva-company-tour__screen-frame"><div className="nuva-company-tour__screen-glow" /><ProductScene room={room} /></div>
      <div className="nuva-company-tour__object-stack"><span /><span /><span /></div>
      <div className="nuva-company-tour__label nuva-company-tour__label--top">NÜVA / 0{index + 1} — {room.module}</div>
      <div className="nuva-company-tour__label nuva-company-tour__label--bottom">BUSINESS OPERATING SYSTEM / CHILE</div>
      <div className="nuva-company-tour__label nuva-company-tour__label--right">DATA → CONTEXT → DECISION</div>
      <div className="nuva-company-tour__scene-index">0{index + 1}<small>/09</small></div>
    </div>
  );
}

export function NuvaCompanyTour() {
  const [active, setActive] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(0);
  const prefersReducedMotion = useRef(false);

  const sync = () => {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const scrollable = Math.max(1, section.offsetHeight - window.innerHeight);
    const raw = Math.min(1, Math.max(0, -rect.top / scrollable));
    const total = raw * (ROOMS.length - 1);
    const index = Math.min(ROOMS.length - 1, Math.floor(total + 0.0001));
    const local = total - index;
    activeRef.current = index;
    setActive(index);
    setSceneProgress(local);
    section.style.setProperty("--tour-scroll", `${raw}`);
    section.style.setProperty("--tour-scene-progress", `${local}`);
    section.style.setProperty("--tour-active", `${index}`);
  };

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        sync();
      });
    };
    const onResize = () => sync();
    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const go = (target: number) => {
    const index = Math.max(0, Math.min(ROOMS.length - 1, target));
    const section = sectionRef.current;
    if (!section) return;
    const start = window.scrollY + section.getBoundingClientRect().top;
    const scrollable = Math.max(0, section.offsetHeight - window.innerHeight);
    const destination = start + (scrollable * index) / (ROOMS.length - 1);
    setActive(index);
    activeRef.current = index;
    if (prefersReducedMotion.current) window.scrollTo(0, destination);
    else window.scrollTo({ top: destination, behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") go(activeRef.current + 1);
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") go(activeRef.current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hotspots = useMemo(() => {
    const firstTarget = Math.min(active + 1, ROOMS.length - 1);
    const secondTarget = Math.min(active + 2, ROOMS.length - 1);
    return [
      { left: "27%", top: "46%", target: firstTarget, label: `Entrar a ${ROOMS[firstTarget].area}` },
      { left: "72%", top: "52%", target: secondTarget, label: `Explorar ${ROOMS[secondTarget].module}` },
    ].filter((item, index, list) => item.target !== active && list.findIndex((candidate) => candidate.target === item.target) === index);
  }, [active]);

  const room = ROOMS[active];
  const nextTarget = Math.min(active + 1, ROOMS.length - 1);

  return (
    <section ref={sectionRef} id="company-tour" className="nuva-company-tour" aria-label="Visita a la empresa Nüva" style={{ "--tour-room-count": ROOMS.length } as CSSProperties}>
      <div className="nuva-company-tour__sticky">
        <div className="nuva-company-tour__stage">
          <div className="nuva-company-tour__grain" />
          {ROOMS.map((item, index) => {
            const distance = index - active - sceneProgress;
            return (
              <div key={item.id} className={`nuva-company-tour__scene ${index === active ? "is-active" : ""}`} data-room-index={index} style={{ "--scene-distance": distance } as CSSProperties} aria-hidden={index !== active}>
                <SceneSurface room={item} />
                {index === active && hotspots.map((hotspot) => <button key={`${hotspot.target}-${hotspot.left}`} type="button" className="nuva-company-tour__hotspot" style={{ left: hotspot.left, top: hotspot.top }} onClick={() => go(hotspot.target)} aria-label={hotspot.label}><span>{hotspot.label}</span></button>)}
              </div>
            );
          })}

          <div className="nuva-company-tour__hud">
            <div className="nuva-company-tour__eyebrow">{room.module} / 0{active + 1}</div>
            <h2 className="nuva-company-tour__title">{room.title}</h2>
            <p className="nuva-company-tour__copy">{room.copy}</p>
            <div className="nuva-company-tour__hud-meta"><span>SCENE {String(active + 1).padStart(2, "0")}</span><span>{Math.round(sceneProgress * 100)}% TRANSITION</span></div>
          </div>

          <div className="nuva-company-tour__map" aria-label="Mapa del recorrido">
            <span className="nuva-company-tour__map-line" />
            {ROOMS.map((item, index) => <button key={item.id} type="button" className={index === active ? "is-active" : ""} onClick={() => go(index)} aria-label={`Ir a ${item.area}`} aria-current={index === active ? "step" : undefined}><span>{String(index + 1).padStart(2, "0")}</span></button>)}
          </div>

          <button type="button" className="nuva-company-tour__skip" onClick={() => document.getElementById("what-is-nuva")?.scrollIntoView({ behavior: prefersReducedMotion.current ? "auto" : "smooth" })}>Saltar tour ↗</button>

          <div className="nuva-company-tour__controls">
            <div className="nuva-company-tour__progress" aria-label={`Sala ${active + 1} de ${ROOMS.length}`}><div className="nuva-company-tour__progress-track"><span style={{ transform: `scaleX(${(active + sceneProgress) / (ROOMS.length - 1)})` }} /></div><b>0{active + 1}</b><em>/09</em></div>
            <div className="nuva-company-tour__room-name">{room.area} — {room.module}</div>
            {active < ROOMS.length - 1 ? <button type="button" className="nuva-company-tour__next" onClick={() => go(nextTarget)}>Siguiente sala <span>↗</span></button> : <Link to="/auth" search={{ mode: "signup" }} className="nuva-company-tour__next">Entrar a Nüva <span>↗</span></Link>}
          </div>

          <div className="nuva-company-tour__scroll-hint"><span>SCROLL</span><i>↓</i><span>TO WALK THROUGH THE COMPANY</span></div>
          <div className="nuva-company-tour__transition-label" aria-live="polite"><small>AHORA ESTÁS EN</small><strong>{room.area}</strong></div>
        </div>
      </div>
    </section>
  );
}
