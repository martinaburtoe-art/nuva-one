import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";

type T = any;
type Hotspot = { label: string; detail: string; x: string; y: string; room: number };

declare global { interface Window { __NUVA_THREE__?: T } }

const rooms = [
  ["Recepción", "Dashboard", "El pulso del negocio.", "Nüva Score"],
  ["Sala de Ventas", "CRM", "Cada oportunidad tiene un lugar.", "Pipeline"],
  ["Bodega", "Inventario + Compras", "Stock visible. Compras anticipadas.", "Bajo stock"],
  ["Sala de Reuniones", "Cotizaciones", "De la conversación a la decisión.", "Cotización"],
  ["Archivo", "Documentos", "Información segura, exactamente donde corresponde.", "Documentos"],
  ["Comunicaciones", "Integraciones", "Todas las señales, juntas.", "Señales"],
  ["Sala de Datos", "Nüva IA", "Pregúntale al negocio.", "Explícame mi negocio"],
  ["Administración", "Billing", "Crecer sin perder el control.", "Entitlements"],
  ["Salida", "Nüva One", "Ahora entra a tu propia empresa.", "Empezar gratis"],
] as const;

const hotspots: Hotspot[][] = [
  [{ label: "Nüva Score", detail: "Lee el estado del negocio de un vistazo.", x: "58%", y: "42%", room: 0 }, { label: "Alertas", detail: "Detecta lo que requiere atención.", x: "68%", y: "55%", room: 1 }, { label: "Accesos rápidos", detail: "Llega a la acción sin perder tiempo.", x: "48%", y: "62%", room: 2 }],
  [{ label: "Pipeline", detail: "Visualiza oportunidades y etapas.", x: "58%", y: "40%", room: 2 }, { label: "Clientes", detail: "Todo el contexto comercial en un lugar.", x: "67%", y: "55%", room: 3 }, { label: "Actividad", detail: "Sigue cada interacción importante.", x: "49%", y: "63%", room: 4 }],
  [{ label: "Stock", detail: "Conoce existencias y quiebres.", x: "57%", y: "44%", room: 3 }, { label: "Compras", detail: "Anticipa reposiciones.", x: "69%", y: "57%", room: 4 }, { label: "SKU", detail: "Encuentra productos al instante.", x: "47%", y: "65%", room: 5 }],
  [{ label: "Cotización", detail: "Convierte una conversación en propuesta.", x: "57%", y: "43%", room: 4 }, { label: "PDF", detail: "Entrega una propuesta lista para enviar.", x: "69%", y: "56%", room: 5 }, { label: "Seguimiento", detail: "Mantén el proceso bajo control.", x: "47%", y: "65%", room: 6 }],
  [{ label: "Documentos", detail: "Archivos protegidos y ordenados.", x: "57%", y: "42%", room: 5 }, { label: "Permisos", detail: "Cada acceso corresponde a un rol.", x: "68%", y: "55%", room: 6 }, { label: "Cuotas", detail: "Controla capacidad y uso.", x: "48%", y: "64%", room: 7 }],
  [{ label: "WhatsApp", detail: "Conecta conversaciones con el negocio.", x: "57%", y: "42%", room: 6 }, { label: "Calendario", detail: "Centraliza las señales del equipo.", x: "69%", y: "56%", room: 7 }, { label: "Pagos", detail: "Integra el movimiento financiero.", x: "48%", y: "64%", room: 8 }],
  [{ label: "Explícame mi negocio", detail: "Pregunta y entiende tus datos.", x: "57%", y: "41%", room: 7 }, { label: "Memoria", detail: "La IA conserva el contexto útil.", x: "69%", y: "55%", room: 8 }, { label: "Decisiones", detail: "Transforma señales en acciones.", x: "48%", y: "65%", room: 8 }],
  [{ label: "Planes", detail: "Elige el nivel que corresponde a tu negocio.", x: "57%", y: "43%", room: 8 }, { label: "Entitlements", detail: "Cada plan habilita lo que corresponde.", x: "69%", y: "56%", room: 8 }, { label: "Control", detail: "Crece con visibilidad financiera.", x: "48%", y: "65%", room: 8 }],
  [{ label: "Tu empresa", detail: "Ahora puedes recorrerla con Nüva.", x: "57%", y: "42%", room: 0 }, { label: "Empieza gratis", detail: "Entra a tu espacio de trabajo.", x: "69%", y: "56%", room: 0 }, { label: "Nüva One", detail: "Un sistema para operar mejor.", x: "48%", y: "65%", room: 0 }],
];

function three() {
  return new Promise<T>((resolve, reject) => {
    if (window.__NUVA_THREE__) return resolve(window.__NUVA_THREE__);
    const ready = (e: Event) => { const api = (e as CustomEvent<T>).detail; if (api) { window.__NUVA_THREE__ = api; resolve(api); } else reject(new Error("three unavailable")); };
    window.addEventListener("nuva:three-ready", ready, { once: true });
    const s = document.createElement("script"); s.type = "module";
    s.textContent = `import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js";window.dispatchEvent(new CustomEvent("nuva:three-ready",{detail:THREE}));`;
    s.onerror = () => reject(new Error("three load failed")); document.head.appendChild(s);
  });
}

function makeUiTexture(THREE: T, room: number) {
  const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 560;
  const ctx = canvas.getContext("2d"); if (!ctx) return null;
  ctx.fillStyle = "#141413"; ctx.fillRect(0, 0, 900, 560);
  ctx.fillStyle = "#f2ede4"; ctx.fillRect(34, 34, 832, 492);
  ctx.fillStyle = "#1b1a18"; ctx.font = "600 28px Arial"; ctx.fillText("NÜVA ONE", 62, 82);
  ctx.fillStyle = "#7a756b"; ctx.font = "18px Arial"; ctx.fillText(rooms[room][1], 62, 112);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 1 ? "#718f87" : "#d7d0c4"; ctx.fillRect(62 + i * 250, 150, 220, 115); ctx.fillStyle = "#262521"; ctx.fillRect(80 + i * 250, 174, 110, 12); ctx.fillStyle = "#898377"; ctx.fillRect(80 + i * 250, 204, 155, 8); ctx.fillRect(80 + i * 250, 228, 120, 8); }
  ctx.strokeStyle = "#c7c0b4"; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(70 + i * 190, 330); ctx.lineTo(70 + i * 190, 480); ctx.stroke(); }
  ctx.fillStyle = "#718f87"; ctx.fillRect(70, 420, 470, 22); ctx.fillStyle = "#292824"; ctx.font = "16px monospace"; ctx.fillText(rooms[room][3].toUpperCase(), 70, 395);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export function NuvaIcgTour() {
  const host = useRef<HTMLDivElement>(null), section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0), activeRef = useRef(0);
  const [transitioning, setTransitioning] = useState(false);
  const pointer = useRef({ x: 0, y: 0 }), target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = host.current, root = section.current; if (!el || !root) return;
    let dead = false, raf = 0, renderer: T, camera: T, scene: T, world: T, ro: ResizeObserver | undefined;
    const init = async () => {
      let THREE: T; try { THREE = await three(); } catch { return; } if (dead) return;
      scene = new THREE.Scene(); scene.background = new THREE.Color("#d8d0c1"); scene.fog = new THREE.FogExp2("#d8d0c1", .018);
      camera = new THREE.PerspectiveCamera(46, 1, .1, 220);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true; el.appendChild(renderer.domElement);
      scene.add(new THREE.HemisphereLight("#fffaf0", "#6e6254", 2.8));
      const sun = new THREE.DirectionalLight("#fff4dd", 4.6); sun.position.set(8, 16, 9); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
      const warm = new THREE.PointLight("#d9c19c", 2.2, 18); warm.position.set(5, 5, 2); scene.add(warm);
      world = new THREE.Group(); scene.add(world);
      const mat = (c: string, r = .8, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
      const floor = mat("#b2a28e", .96), wall = mat("#eee7da", .97), wood = mat("#725b46", .7, .03), dark = mat("#292724", .54, .14), accent = mat("#718f87", .3, .18), glass = new THREE.MeshPhysicalMaterial({ color: "#dfe9e4", roughness: .16, metalness: .02, transmission: .25, transparent: true, opacity: .62 });
      const box = (g: T, s: [number, number, number], p: [number, number, number], m: T) => { const q = new THREE.Mesh(new THREE.BoxGeometry(...s), m); q.position.set(...p); q.castShadow = true; q.receiveShadow = true; g.add(q); return q; };
      const addScreen = (g: T, room: number, x = 0, y = 2.55, z = -4.22) => { const texture = makeUiTexture(THREE, room); if (!texture) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.35), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })); m.position.set(x, y, z); g.add(m); };
      const addLamp = (g: T, x: number, z: number) => { const shade = new THREE.Mesh(new THREE.CylinderGeometry(.32, .48, .34, 24), accent); shade.position.set(x, 4.85, z); g.add(shade); const l = new THREE.PointLight("#fff0d5", 2.4, 7); l.position.set(x, 4.3, z); g.add(l); };
      rooms.forEach((_, i) => {
        const g = new THREE.Group(), x = (i % 3) * 11, z = -Math.floor(i / 3) * 11; g.position.set(x, 0, z);
        box(g, [10, .22, 9.2], [0, 0, 0], floor); box(g, [10, 5.8, .22], [0, 2.9, -4.4], wall); box(g, [.22, 5.8, 9.2], [-4.9, 2.9, 0], wall); box(g, [.22, 5.8, 9.2], [4.9, 2.9, 0], wall);
        box(g, [4.8, .34, 1.7], [0, 1.15, -.65], wood); box(g, [3.9, 2.2, .14], [0, 2.65, -1.5], dark); addScreen(g, i);
        for (let n = 0; n < 4; n++) box(g, [.68, .12, .68], [-1.55 + n * 1.02, 1.42, -.02], n === 1 ? accent : wood);
        addLamp(g, -2.9, -1.1); addLamp(g, 2.9, -1.1);
        if (i === 0) { for (let n = 0; n < 3; n++) box(g, [.9, .72, .08], [-1.5 + n * 1.5, 3.65, -4.22], n === 0 ? accent : wood); }
        if (i === 1) { for (let n = 0; n < 3; n++) box(g, [1.2, .8, .12], [-2.7 + n * 2.7, 3.35, -4.18], n === 1 ? accent : wood); }
        if (i === 2) { for (let n = 0; n < 6; n++) box(g, [1.05, .7, .72], [-3.15 + (n % 3) * 1.55, .52, -2.65 - Math.floor(n / 3) * 1.05], n === 2 ? accent : wood); }
        if (i === 3) { const t = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, .18, 40), wood); t.position.set(0, 1, -2.2); t.castShadow = true; g.add(t); for (let n = 0; n < 3; n++) box(g, [.45, .72, .45], [-2 + n * 2, .48, -2.2], dark); }
        if (i === 4) for (let n = 0; n < 4; n++) box(g, [.95, 2.2, .5], [-3.1 + n * 1.6, 1.5, -4], n === 2 ? accent : wood);
        if (i === 5) for (let n = 0; n < 3; n++) { const panel = box(g, [1.25, 1.25, .12], [-2.5 + n * 2.5, 2.6, -4.12], accent); panel.material = glass; }
        if (i === 6) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.2, .16, 24, 64), accent); r.position.set(0, 2.5, -2); r.rotation.x = Math.PI / 2; g.add(r); const o = new THREE.Mesh(new THREE.SphereGeometry(.5, 32, 20), accent); o.position.set(0, 2.5, -2); g.add(o); }
        if (i === 7) for (let n = 0; n < 3; n++) box(g, [1.4, 1.1, .6], [-2.4 + n * 2.4, .75, -2.5], n === 1 ? accent : dark);
        if (i === 8) { const p = new THREE.Mesh(new THREE.TorusGeometry(1.7, .18, 28, 64), accent); p.position.set(0, 2.45, -4.1); g.add(p); box(g, [3.2, .08, .08], [0, 2.45, -4.1], accent); }
        world.add(g);
      });
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches, look = new THREE.Vector3();
      const move = (e: PointerEvent) => { if (e.pointerType !== "touch") { target.current.x = (e.clientX / innerWidth - .5) * 2; target.current.y = (e.clientY / innerHeight - .5) * 2; } };
      let lastRoom = 0;
      const sync = () => {
        const r = root.getBoundingClientRect(), max = Math.max(1, root.offsetHeight - innerHeight), p = Math.max(0, Math.min(1, -r.top / max)); root.style.setProperty("--tour-progress", String(p));
        if (p < .13) { const t = reduced ? 1 : p / .13; camera.position.set(11 + pointer.current.x * .7, 18 - t * 14, 15 - t * 7); look.set(11, 0, -11); }
        else { const j = ((p - .13) / .87) * (rooms.length - 1), i = Math.min(8, Math.floor(j + .00001)), t = reduced ? 0 : j - i; const next = Math.min(8, i + 1); const a = [(i % 3) * 11, 2.15, -Math.floor(i / 3) * 11 + 4.15], b = [(next % 3) * 11, 2.15, -Math.floor(next / 3) * 11 + 4.15]; camera.position.set(a[0] + (b[0] - a[0]) * t + pointer.current.x * .28, a[1] + (b[1] - a[1]) * t - pointer.current.y * .14, a[2] + (b[2] - a[2]) * t); look.set((i % 3) * 11, 1.95, -Math.floor(i / 3) * 11 - 2.75); if (i !== lastRoom) { lastRoom = i; activeRef.current = i; setActive(i); setTransitioning(true); window.setTimeout(() => setTransitioning(false), 760); } }
        camera.lookAt(look);
      };
      const resize = () => { const r = el.getBoundingClientRect(); renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); };
      ro = new ResizeObserver(resize); ro.observe(el); resize(); addEventListener("scroll", sync, { passive: true }); addEventListener("pointermove", move, { passive: true });
      const tick = () => { if (dead) return; pointer.current.x += (target.current.x - pointer.current.x) * .065; pointer.current.y += (target.current.y - pointer.current.y) * .065; sync(); renderer.render(scene, camera); raf = requestAnimationFrame(tick); }; tick();
      return () => { removeEventListener("scroll", sync); removeEventListener("pointermove", move); ro?.disconnect(); cancelAnimationFrame(raf); renderer.dispose(); el.replaceChildren(); };
    };
    let cleanup: (() => void) | undefined; void init().then(x => { cleanup = x; }); return () => { dead = true; cleanup?.(); };
  }, []);

  const jump = (i: number) => { const root = section.current; if (!root) return; const top = scrollY + root.getBoundingClientRect().top, max = Math.max(0, root.offsetHeight - innerHeight), p = i === 0 ? .13 : .13 + .87 * i / 8; scrollTo({ top: top + max * p, behavior: "smooth" }); };
  const room = rooms[active];
  return <section ref={section} id="nuva-icg-tour" className="nuva-icg-tour" style={{ "--tour-accent": "#718f87" } as CSSProperties}>
    <div className="nuva-icg-tour__sticky">
      <div ref={host} className="nuva-icg-tour__scene" aria-hidden="true" />
      <div className="nuva-icg-tour__shade" />
      <div className={`nuva-icg-tour__transition ${transitioning ? "is-active" : ""}`} aria-hidden="true"><span>Entrando</span><strong>{room[0]}</strong><em>{String(active + 1).padStart(2, "0")} / 09</em></div>
      <header><span>NÜVA ONE</span><span>VISITA A LA EMPRESA</span><span>SCROLL TO EXPLORE</span></header>
      <div className="nuva-icg-tour__copy"><small>{room[1]} · {room[0]}</small><h2>{room[2]}</h2><button onClick={() => jump(Math.min(8, active + 1))} type="button"><i />{room[3]} <b>+</b></button></div>
      <div className="nuva-icg-tour__hotspots" aria-label={`Puntos interactivos de ${room[0]}`}>{hotspots[active].map((pin, index) => <button key={`${pin.label}-${index}`} className="nuva-icg-tour__hotspot" style={{ left: pin.x, top: pin.y } as CSSProperties} onClick={() => jump(pin.room)} aria-label={`${pin.label}: ${pin.detail}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{pin.label}</strong><em>{pin.detail}</em></button>)}</div>
      <nav aria-label="Mapa de la empresa">{rooms.map((x, i) => <button key={x[0]} onClick={() => jump(i)} aria-current={active === i} aria-label={`Ir a ${x[0]}`}><span>{String(i + 1).padStart(2, "0")}</span></button>)}</nav>
      <footer><span>{room[0]}</span><span>{String(active + 1).padStart(2, "0")} / 09</span><Link to="/demo">Saltar tour ↗</Link></footer>
    </div>
  </section>;
}
