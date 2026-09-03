import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";

type T = any;

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

export function NuvaIcgTour() {
  const host = useRef<HTMLDivElement>(null), section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0), activeRef = useRef(0);
  const pointer = useRef({x:0,y:0}), target = useRef({x:0,y:0});

  useEffect(() => {
    const el = host.current, root = section.current; if (!el || !root) return;
    let dead=false, raf=0, renderer:T, camera:T, scene:T, world:T, ro:ResizeObserver|undefined;
    const init = async () => {
      let THREE:T; try { THREE=await three(); } catch { return; } if(dead) return;
      scene=new THREE.Scene(); scene.background=new THREE.Color("#d9d1c2"); scene.fog=new THREE.FogExp2("#d9d1c2",.016);
      camera=new THREE.PerspectiveCamera(43,1,.1,220);
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
      renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.shadowMap.enabled=true; el.appendChild(renderer.domElement);
      scene.add(new THREE.HemisphereLight("#fffaf0","#817766",2.5));
      const sun=new THREE.DirectionalLight("#fff5df",4); sun.position.set(7,15,10); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
      world=new THREE.Group(); scene.add(world);
      const mat=(c:string,r=.8,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
      const floor=mat("#b5a690",.95), wall=mat("#eee7da",.96), wood=mat("#705a47",.72,.04), dark=mat("#292622",.62,.1), accent=mat("#718f87",.34,.12);
      const box=(g:T,s:[number,number,number],p:[number,number,number],m:T)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(...s),m);q.position.set(...p);q.castShadow=true;q.receiveShadow=true;g.add(q);return q;};
      rooms.forEach((_,i)=>{
        const g=new THREE.Group(), x=(i%3)*11, z=-Math.floor(i/3)*11; g.position.set(x,0,z);
        box(g,[10,.2,9.2],[0,0,0],floor); box(g,[10,5.8,.2],[0,2.9,-4.4],wall); box(g,[.2,5.8,9.2],[-4.9,2.9,0],wall); box(g,[.2,5.8,9.2],[4.9,2.9,0],wall);
        box(g,[4.8,.34,1.7],[0,1.15,-.65],wood); box(g,[3.7,2.15,.12],[0,2.55,-1.55],dark);
        for(let n=0;n<4;n++) box(g,[.68,.12,.68],[-1.55+n*1.02,1.42,-.02],n===1?accent:wood);
        if(i===0) for(let n=0;n<3;n++) box(g,[.9,.72,.08],[-1.5+n*1.5,3.6,-4.25],n===0?accent:wood);
        if(i===1) for(let n=0;n<3;n++) box(g,[1.2,.8,.12],[-2.7+n*2.7,3.3,-4.2],n===1?accent:wood);
        if(i===2) for(let n=0;n<6;n++) box(g,[1.05,.7,.72],[-3.15+(n%3)*1.55,.52,-2.65-Math.floor(n/3)*1.05],n===2?accent:wood);
        if(i===3){const t=new THREE.Mesh(new THREE.CylinderGeometry(1.55,1.55,.18,32),wood);t.position.set(0,1,-2.2);t.castShadow=true;g.add(t);}
        if(i===4) for(let n=0;n<4;n++) box(g,[.95,2.2,.5],[-3.1+n*1.6,1.5,-4],n===2?accent:wood);
        if(i===5) for(let n=0;n<3;n++) box(g,[1.25,1.25,.12],[-2.5+n*2.5,2.6,-4.1],accent);
        if(i===6){const r=new THREE.Mesh(new THREE.TorusGeometry(1.2,.16,20,64),accent);r.position.set(0,2.5,-2);r.rotation.x=Math.PI/2;g.add(r);const o=new THREE.Mesh(new THREE.SphereGeometry(.5,32,20),accent);o.position.set(0,2.5,-2);g.add(o);}
        if(i===7) for(let n=0;n<3;n++) box(g,[1.4,1.1,.6],[-2.4+n*2.4,.75,-2.5],n===1?accent:dark);
        if(i===8){const p=new THREE.Mesh(new THREE.TorusGeometry(1.7,.18,24,64),accent);p.position.set(0,2.45,-4.1);g.add(p);}
        world.add(g);
      });
      const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches, look=new THREE.Vector3();
      const move=(e:PointerEvent)=>{if(e.pointerType!=="touch"){target.current.x=(e.clientX/innerWidth-.5)*2;target.current.y=(e.clientY/innerHeight-.5)*2;}};
      const sync=()=>{
        const r=root.getBoundingClientRect(), max=Math.max(1,root.offsetHeight-innerHeight), p=Math.max(0,Math.min(1,-r.top/max)); root.style.setProperty("--tour-progress",String(p));
        if(p<.13){const t=reduced?1:p/.13;camera.position.set(11+pointer.current.x*.6,18-t*14,15-t*7);look.set(11,0,-11);}
        else {const j=((p-.13)/.87)*(rooms.length-1),i=Math.min(8,Math.floor(j+.00001)),t=reduced?0:j-i;if(i!==activeRef.current){activeRef.current=i;setActive(i);}const a=[(i%3)*11,2.1,-Math.floor(i/3)*11+4.1],b=[((Math.min(8,i+1))%3)*11,2.1,-Math.floor(Math.min(8,i+1)/3)*11+4.1];camera.position.set(a[0]+(b[0]-a[0])*t+pointer.current.x*.2,a[1]+(b[1]-a[1])*t-pointer.current.y*.1,a[2]+(b[2]-a[2])*t);look.set((i%3)*11,1.85,-Math.floor(i/3)*11-2.8);}
        camera.lookAt(look);
      };
      const resize=()=>{const r=el.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();};
      ro=new ResizeObserver(resize);ro.observe(el);resize();addEventListener("scroll",sync,{passive:true});addEventListener("pointermove",move,{passive:true});
      const tick=()=>{if(dead)return;pointer.current.x+=(target.current.x-pointer.current.x)*.07;pointer.current.y+=(target.current.y-pointer.current.y)*.07;sync();renderer.render(scene,camera);raf=requestAnimationFrame(tick)};tick();
      return()=>{removeEventListener("scroll",sync);removeEventListener("pointermove",move);ro?.disconnect();cancelAnimationFrame(raf);renderer.dispose();el.replaceChildren();};
    };
    let cleanup:(()=>void)|undefined;void init().then(x=>{cleanup=x});return()=>{dead=true;cleanup?.()};
  },[]);

  const jump=(i:number)=>{const root=section.current;if(!root)return;const top=scrollY+root.getBoundingClientRect().top,max=Math.max(0,root.offsetHeight-innerHeight),p=i===0?.13:.13+.87*i/8;scrollTo({top:top+max*p,behavior:"smooth"});};
  const room=rooms[active];
  return <section ref={section} id="nuva-icg-tour" className="nuva-icg-tour" style={{"--tour-accent":"#718f87"} as CSSProperties}>
    <div className="nuva-icg-tour__sticky"><div ref={host} className="nuva-icg-tour__scene" aria-hidden="true"/><div className="nuva-icg-tour__shade"/>
      <header><span>NÜVA ONE</span><span>VISITA A LA EMPRESA</span><span>SCROLL TO EXPLORE</span></header>
      <div className="nuva-icg-tour__copy"><small>{room[1]} · {room[0]}</small><h2>{room[2]}</h2><button onClick={()=>jump(Math.min(8,active+1))} type="button"><i/>{room[3]} <b>+</b></button></div>
      <nav aria-label="Mapa de la empresa">{rooms.map((x,i)=><button key={x[0]} onClick={()=>jump(i)} aria-current={active===i} aria-label={`Ir a ${x[0]}`}><span>{String(i+1).padStart(2,"0")}</span></button>)}</nav>
      <footer><span>{room[0]}</span><span>{String(active+1).padStart(2,"0")} / 09</span><Link to="/demo">Saltar tour ↗</Link></footer>
    </div>
  </section>;
}
