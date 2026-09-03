import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

// The reference experience is a persistent 3D world: the camera moves through
// authored spaces while HTML pins stay synchronized with the scene. Nüva uses
// the same interaction grammar without copying proprietary assets.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThreeApi = any;

declare global {
  interface Window {
    __NUVA_THREE__?: ThreeApi;
  }
}

const ROOMS = [
  { id: "reception", name: "Recepción", module: "Dashboard", title: "El pulso del negocio, antes de abrir cada pantalla.", pin: "Nüva Score", color: "#8ce8ff" },
  { id: "sales", name: "Sala de Ventas", module: "CRM", title: "Cada oportunidad tiene un lugar y una historia.", pin: "Pipeline", color: "#ffc98a" },
  { id: "warehouse", name: "Bodega", module: "Inventario + Compras", title: "Stock visible. Compras anticipadas.", pin: "Bajo stock", color: "#9fe6b6" },
  { id: "meeting", name: "Sala de Reuniones", module: "Cotizaciones", title: "De la conversación a la decisión.", pin: "Cotización", color: "#d8b5ff" },
  { id: "archive", name: "Archivo", module: "Documentos", title: "Información segura, exactamente donde corresponde.", pin: "Documentos", color: "#a8d9ff" },
  { id: "comms", name: "Centro de Comunicaciones", module: "Integraciones", title: "Las señales de la empresa, juntas.", pin: "Señales", color: "#ff9ecf" },
  { id: "ai", name: "Sala de Datos", module: "Nüva IA", title: "Pregúntale al negocio. Nüva entiende el contexto.", pin: "Explícame mi negocio", color: "#7ff2e2" },
  { id: "admin", name: "Administración", module: "Billing", title: "Crecer sin perder el control.", pin: "Entitlements", color: "#ffe28a" },
  { id: "exit", name: "Recepción de salida", module: "Nüva One", title: "Ahora entra a tu propia empresa.", pin: "Empezar gratis", color: "#8ce8ff" },
] as const;

const PATH = [
  { x: 0, y: 2.2, z: 7.8, tx: 0, ty: 1.8, tz: 0 },
  { x: 2.1, y: 2.7, z: -2.4, tx: 0, ty: 1.7, tz: -10.8 },
  { x: -2.5, y: 2.35, z: -13.2, tx: 0, ty: 1.7, tz: -21.6 },
  { x: 2.4, y: 2.8, z: -24.0, tx: 0, ty: 1.8, tz: -32.4 },
  { x: -2.0, y: 2.45, z: -35.0, tx: 0, ty: 1.7, tz: -43.2 },
  { x: 2.2, y: 2.75, z: -46.0, tx: 0, ty: 1.8, tz: -54.0 },
  { x: -2.2, y: 2.55, z: -57.0, tx: 0, ty: 1.85, tz: -64.8 },
  { x: 1.7, y: 2.65, z: -68.0, tx: 0, ty: 1.8, tz: -75.6 },
  { x: 0, y: 2.35, z: -79.8, tx: 0, ty: 1.85, tz: -86.4 },
];

function loadThree(): Promise<ThreeApi> {
  if (window.__NUVA_THREE__) return Promise.resolve(window.__NUVA_THREE__);
  return new Promise((resolve, reject) => {
    const onReady = (event: Event) => {
      const three = (event as CustomEvent<ThreeApi>).detail;
      if (three) {
        window.__NUVA_THREE__ = three;
        resolve(three);
      } else reject(new Error("Nüva 3D engine unavailable"));
    };
    window.addEventListener("nuva:three-ready", onReady, { once: true });
    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js"; window.dispatchEvent(new CustomEvent("nuva:three-ready",{detail:THREE}));`;
    script.onerror = () => reject(new Error("Unable to load Nüva 3D engine"));
    document.head.appendChild(script);
  });
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function NuvaSpatialGallery() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const targetPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const host = hostRef.current;
    const section = sectionRef.current;
    if (!host || !section) return;

    let disposed = false;
    let renderer: ThreeApi;
    let camera: ThreeApi;
    let scene: ThreeApi;
    let world: ThreeApi;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | undefined;

    const init = async () => {
      let THREE: ThreeApi;
      try {
        THREE = await loadThree();
      } catch {
        return;
      }
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color("#0a0d0f");
      scene.fog = new THREE.FogExp2("#0a0d0f", 0.024);

      camera = new THREE.PerspectiveCamera(43, 1, 0.1, 150);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);

      const hemi = new THREE.HemisphereLight("#fff8ed", "#10161a", 1.8);
      scene.add(hemi);
      const key = new THREE.DirectionalLight("#fff2dc", 3.5);
      key.position.set(5, 10, 7);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      scene.add(key);
      const cyan = new THREE.PointLight("#6ee7ff", 15, 24, 2);
      cyan.position.set(-4, 3.5, 0);
      scene.add(cyan);

      world = new THREE.Group();
      scene.add(world);

      const floorMaterial = new THREE.MeshStandardMaterial({ color: "#202629", roughness: 0.86, metalness: 0.08 });
      const wallMaterial = new THREE.MeshStandardMaterial({ color: "#d8d3c9", roughness: 0.92 });
      const trimMaterial = new THREE.MeshStandardMaterial({ color: "#151a1d", roughness: 0.6, metalness: 0.18 });
      const glassMaterial = new THREE.MeshPhysicalMaterial({ color: "#b8e9f1", roughness: 0.16, transmission: 0.32, transparent: true, opacity: 0.88 });
      const glowMaterial = new THREE.MeshStandardMaterial({ color: "#7eeaff", emissive: "#164a57", emissiveIntensity: 2.7, roughness: 0.28, metalness: 0.2 });

      ROOMS.forEach((room, index) => {
        const roomGroup = new THREE.Group();
        roomGroup.position.z = -index * 10.8;

        const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.22, 9), floorMaterial);
        floor.position.y = 0;
        floor.receiveShadow = true;
        roomGroup.add(floor);

        const back = new THREE.Mesh(new THREE.BoxGeometry(10, 6.2, 0.22), wallMaterial);
        back.position.set(0, 3.1, -4.35);
        back.receiveShadow = true;
        roomGroup.add(back);

        const left = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.2, 9), wallMaterial);
        left.position.set(-4.9, 3.1, 0);
        left.receiveShadow = true;
        roomGroup.add(left);
        const right = left.clone();
        right.position.x = 4.9;
        roomGroup.add(right);

        const desk = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.34, 1.75), trimMaterial);
        desk.position.set(0, 1.22, -1.1);
        desk.castShadow = true;
        roomGroup.add(desk);

        const display = new THREE.Mesh(new THREE.BoxGeometry(3.7, 2.2, 0.14), glassMaterial);
        display.position.set(0, 2.55, -1.72);
        display.castShadow = true;
        roomGroup.add(display);

        const screen = new THREE.Mesh(new THREE.BoxGeometry(3.08, 1.58, 0.06), glowMaterial);
        screen.position.set(0, 2.55, -1.81);
        roomGroup.add(screen);

        const side = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.35, 20), glowMaterial);
        side.position.set(-3.15, 1.0, -2.35);
        side.castShadow = true;
        roomGroup.add(side);

        for (let i = 0; i < 5; i += 1) {
          const block = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 0.58), i % 2 ? trimMaterial : glowMaterial);
          block.position.set(-2.45 + i * 0.8, 0.42, -0.05);
          block.rotation.y = i * 0.18;
          block.castShadow = true;
          roomGroup.add(block);
        }

        if (index === 1) {
          for (let i = 0; i < 3; i += 1) {
            const panel = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.78, 0.12), trimMaterial);
            panel.position.set(-2.8 + i * 2.5, 3.75, -4.18);
            panel.castShadow = true;
            roomGroup.add(panel);
          }
        }
        if (index === 2) {
          for (let i = 0; i < 6; i += 1) {
            const box = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.72, 0.72), i === 2 ? glowMaterial : trimMaterial);
            box.position.set(-3.15 + (i % 3) * 1.55, 0.52, -2.55 - Math.floor(i / 3) * 1.1);
            box.castShadow = true;
            roomGroup.add(box);
          }
        }
        if (index === 3) {
          const table = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.18, 32), trimMaterial);
          table.position.set(0, 1.0, -2.3);
          table.castShadow = true;
          roomGroup.add(table);
        }
        if (index === 6) {
          const torus = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.12, 18, 64), glowMaterial);
          torus.position.set(0, 2.65, -1.9);
          torus.rotation.x = Math.PI / 2;
          roomGroup.add(torus);
          const core = new THREE.Mesh(new THREE.SphereGeometry(0.46, 32, 20), glowMaterial);
          core.position.set(0, 2.65, -1.9);
          roomGroup.add(core);
        }
        if (index === 8) {
          const portal = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.18, 24, 64), glowMaterial);
          portal.position.set(0, 2.3, -4.05);
          roomGroup.add(portal);
        }

        world.add(roomGroup);
      });

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const onPointer = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        targetPointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
        targetPointer.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
      };
      const sync = () => {
        const rect = section.getBoundingClientRect();
        const scrollable = Math.max(1, section.offsetHeight - window.innerHeight);
        const raw = Math.max(0, Math.min(1, -rect.top / scrollable));
        const total = raw * (ROOMS.length - 1);
        const index = Math.min(ROOMS.length - 1, Math.floor(total + 0.00001));
        const local = total - index;
        if (index !== activeRef.current) {
          activeRef.current = index;
          setActive(index);
        }
        section.style.setProperty("--spatial-progress", String(raw));
        section.style.setProperty("--spatial-scene", String(local));
        const from = PATH[index];
        const to = PATH[Math.min(PATH.length - 1, index + 1)];
        const t = reduced ? 0 : local;
        camera.position.x = lerp(from.x, to.x, t) + pointer.current.x * 0.24;
        camera.position.y = lerp(from.y, to.y, t) - pointer.current.y * 0.12;
        camera.position.z = lerp(from.z, to.z, t);
        camera.lookAt(new THREE.Vector3(lerp(from.tx, to.tx, t), lerp(from.ty, to.ty, t), lerp(from.tz, to.tz, t)));
      };
      const onScroll = () => sync();
      const resize = () => {
        const rect = host.getBoundingClientRect();
        renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
        camera.aspect = rect.width / Math.max(1, rect.height);
        camera.updateProjectionMatrix();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      resize();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("pointermove", onPointer, { passive: true });

      const tick = () => {
        if (disposed) return;
        pointer.current.x += (targetPointer.current.x - pointer.current.x) * 0.075;
        pointer.current.y += (targetPointer.current.y - pointer.current.y) * 0.075;
        sync();
        renderer.render(scene, camera);
        animationFrame = requestAnimationFrame(tick);
      };
      tick();

      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("pointermove", onPointer);
        resizeObserver?.disconnect();
        cancelAnimationFrame(animationFrame);
        renderer.dispose();
        host.replaceChildren();
      };
    };

    let cleanup: (() => void) | undefined;
    void init().then((fn) => { cleanup = fn; });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  const jump = (index: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const top = window.scrollY + section.getBoundingClientRect().top;
    const scrollable = Math.max(0, section.offsetHeight - window.innerHeight);
    window.scrollTo({ top: top + scrollable * (index / (ROOMS.length - 1)), behavior: "smooth" });
  };

  const room = ROOMS[active];
  return (
    <section ref={sectionRef} id="nuva-spatial-gallery" className="nuva-spatial-gallery" style={{ "--room-count": ROOMS.length } as React.CSSProperties}>
      <div className="nuva-spatial-gallery__sticky">
        <div ref={hostRef} className="nuva-spatial-gallery__canvas" aria-hidden="true" />
        <div className="nuva-spatial-gallery__grain" />
        <div className="nuva-spatial-gallery__vignette" />
        <header className="nuva-spatial-gallery__header"><span>NÜVA ONE / VISITA A LA EMPRESA</span><span>SCROLL TO EXPLORE</span></header>
        <div className="nuva-spatial-gallery__copy" style={{ "--room-accent": room.color } as React.CSSProperties}>
          <span>{room.module} · {room.name}</span>
          <h2>{room.title}</h2>
          <p>Una empresa real, recorrida como un espacio: cada sala conecta una parte de la operación con una decisión.</p>
          <button type="button" onClick={() => jump(Math.min(ROOMS.length - 1, active + 1))} className="nuva-spatial-gallery__pin" aria-label={`Explorar ${room.pin}`}><i />{room.pin}<b>+</b></button>
        </div>
        <nav className="nuva-spatial-gallery__map" aria-label="Mapa del recorrido">
          {ROOMS.map((item, index) => <button key={item.id} type="button" aria-label={`Ir a ${item.name}`} aria-current={active === index} onClick={() => jump(index)}><span>{String(index + 1).padStart(2, "0")}</span></button>)}
        </nav>
        <div className="nuva-spatial-gallery__footer"><span>{room.name}</span><span>{String(active + 1).padStart(2, "0")} / 09</span><Link to="/demo">Saltar tour ↗</Link></div>
      </div>
    </section>
  );
}
