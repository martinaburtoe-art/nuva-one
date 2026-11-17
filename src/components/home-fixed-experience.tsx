import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, BarChart3, Boxes, Brain, CheckCircle2, CircleDollarSign, ScanLine, ShoppingCart, Smartphone, Users } from "lucide-react";

// La demo interactiva pesa más que el contenido editorial: cargarla al acercarse a pantalla.
const DemoWorkspace = lazy(() => import("@/components/demo/demo-workspace").then((module) => ({ default: module.DemoWorkspace })));
const DemoStateProvider = lazy(() => import("@/lib/demo/demo-state").then((module) => ({ default: module.DemoStateProvider })));

const BENEFITS = [
  { icon: ShoppingCart, title: "Ventas con continuidad", text: "Mantén el registro comercial conectado con el resto de la operación." },
  { icon: Boxes, title: "Stock bajo control", text: "Consulta productos, existencias y movimientos desde un mismo espacio." },
  { icon: CircleDollarSign, title: "Caja y finanzas", text: "Ordena ingresos, gastos y movimientos para entender mejor tu operación." },
  { icon: Users, title: "Clientes con historial", text: "Conserva el contexto comercial y da seguimiento a tus relaciones." },
  { icon: BarChart3, title: "Información accionable", text: "Lee la actividad del negocio con reportes y vistas operacionales." },
  { icon: Brain, title: "Inteligencia contextual", text: "Interpreta la información disponible y úsala para orientar tus decisiones." },
];

function DeferredDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || shouldLoad) return;
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: "320px 0px" });

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={containerRef} className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-2xl">
      {shouldLoad ? (
        <Suspense fallback={<div className="flex min-h-[420px] items-center justify-center text-sm text-black/55" role="status">Preparando la demo interactiva…</div>}>
          <DemoStateProvider>
            <DemoWorkspace onExit={() => undefined} />
          </DemoStateProvider>
        </Suspense>
      ) : (
        <div className="flex min-h-[420px] items-center justify-center bg-white px-6 text-center text-sm text-black/55">
          La demo interactiva se cargará al acercarte a esta sección.
        </div>
      )}
    </div>
  );
}

export function HomeFixedExperience() {
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;

    // Autoplay robusto: algunos navegadores no reproducen el video hasta
    // que el elemento tiene metadata/buffer suficiente.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const play = () => {
      if (video.paused) {
        void video.play().catch(() => {
          // Reintentos adicionales en eventos de carga/visibilidad.
        });
      }
    };

    const events = ["loadedmetadata", "loadeddata", "canplay", "canplaythrough"];
    events.forEach((event) => video.addEventListener(event, play));
    document.addEventListener("visibilitychange", play);
    window.addEventListener("pageshow", play);

    let lastTime = video.currentTime;
    let stalledTicks = 0;
    const watchdog = window.setInterval(() => {
      if (video.paused || video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        play();
        return;
      }

      if (video.currentTime === lastTime) {
        stalledTicks += 1;
        if (stalledTicks >= 3) {
          stalledTicks = 0;
          video.load();
          play();
        }
      } else {
        stalledTicks = 0;
        lastTime = video.currentTime;
      }
    }, 1000);

    play();

    return () => {
      events.forEach((event) => video.removeEventListener(event, play));
      document.removeEventListener("visibilitychange", play);
      window.removeEventListener("pageshow", play);
      window.clearInterval(watchdog);
    };
  }, []);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.muted = true;
          void video.play().catch(() => undefined);
        }
      },
      { threshold: 0.01 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section className="home-hero relative isolate min-h-[100svh] overflow-hidden bg-[#080809] text-white">
        <video ref={heroVideoRef} className="home-hero__video absolute inset-0 h-full w-full object-cover" src="/Chilean_retail_shop_opens_morning_20260918131053.mp4" aria-hidden="true" autoPlay loop muted playsInline preload="metadata" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 mx-auto flex min-h-[min(860px,100vh)] max-w-7xl items-end px-6 pb-16 pt-32 md:px-10 md:pb-20">
          <div className="max-w-4xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-[#E6C687]">NÜVA ONE · PARA DISTRIBUIDORAS Y COMERCIOS EN CRECIMIENTO</p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.045em] sm:text-7xl lg:text-[clamp(5rem,8vw,8.5rem)]">Controla la operación. <span className="text-[#E6C687]">Decide con contexto.</span></h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">Conecta ventas, inventario, clientes, cotizaciones y finanzas para dejar de gestionar cada parte del negocio por separado.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-full bg-[#E6C687] px-6 py-3 text-sm font-bold text-[#080809]">Empezar gratis <ArrowRight size={15} /></Link>
              <a href="#demo" className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold backdrop-blur">Probar Nüva One</a>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Qué es Nüva One" className="relative overflow-hidden bg-[#080809] px-6 py-24 text-white md:px-10 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#E6C687]">¿QUÉ ES NÜVA ONE?</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Cuando cada área trabaja por separado, pierdes el hilo.</h2>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/65">Una venta afecta el stock. Una reposición afecta la caja. Una cotización puede convertirse en ingreso. Nüva One reúne esas piezas para que puedas seguir la operación con mayor claridad.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition-transform duration-300 hover:-translate-y-1 hover:border-white/20">
                  <Icon className="h-5 w-5 text-[#E6C687]" />
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="para-quien" aria-label="Para quién es Nüva One" className="relative overflow-hidden bg-[#f5f3ee] px-6 py-20 text-[#101820] md:px-10 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8a6a3e]">EL FOCO INICIAL</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl">Para negocios que venden, reponen y necesitan cuidar su margen.</h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-black/60">Nüva One parte por distribuidoras y comercios con inventario, pedidos, proveedores y clientes recurrentes: equipos que necesitan saber qué se vendió, qué queda, qué deben reponer y qué está pendiente de cobro.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/pricing" className="inline-flex items-center gap-2 rounded-full bg-[#142d40] px-5 py-3 text-sm font-bold text-white">Ver planes <ArrowRight size={15} /></Link>
              <a href="#demo" className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-5 py-3 text-sm font-semibold text-[#142d40]">Explorar la demo</a>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-[24px] border border-black/10 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,31,43,.35)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#142d40]/[0.07] text-[#142d40]"><Boxes className="h-5 w-5" /></div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a3e]">Distribución B2B</p>
              <h3 className="mt-2 text-xl font-semibold">Pedidos, productos y reposición.</h3>
              <p className="mt-2 text-sm leading-6 text-black/55">Mantén el contexto entre clientes, cotizaciones, ventas, stock y compras.</p>
            </article>
            <article className="rounded-[24px] border border-black/10 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,31,43,.35)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#142d40]/[0.07] text-[#142d40]"><ShoppingCart className="h-5 w-5" /></div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a3e]">Comercio con inventario</p>
              <h3 className="mt-2 text-xl font-semibold">Ventas y stock en el mismo flujo.</h3>
              <p className="mt-2 text-sm leading-6 text-black/55">Consulta tus productos y movimientos sin depender de varias planillas desconectadas.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="demo" className="bg-[#f5f3ee] px-4 py-20 text-[#080809] md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#6366F1]">DEMO INTERACTIVA</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Ahora pruébalo aquí mismo.</h2>
            <p className="mt-5 text-base leading-7 text-black/60">Explora una simulación completa de Nüva One con datos ficticios. Navega por los módulos y entiende cómo se conecta la operación, sin salir de la homepage.</p>
          </div>
          <DeferredDemo />
        </div>
      </section>

      <section aria-label="Smart Scan de Nüva One" className="relative overflow-hidden bg-[#f4f7ff] px-5 py-24 text-[#11131a] md:px-10 md:py-36">
        <div className="absolute -left-32 top-20 h-96 w-96 animate-pulse rounded-full bg-[#6366F1]/15 blur-3xl motion-reduce:animate-none" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 animate-pulse rounded-full bg-fuchsia-300/20 blur-3xl motion-reduce:animate-none" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="order-2 lg:order-1">
            <div className="relative mx-auto w-full max-w-[520px]">
              <div className="absolute left-1/2 top-1/2 h-[82%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[3rem] bg-[#6366F1]/20 blur-3xl" />
              <div className="smart-scan-phone relative mx-auto w-[260px] rotate-[-8deg] rounded-[3rem] border-[10px] border-[#171923] bg-[#0b0c11] p-2 shadow-[0_40px_90px_rgba(30,32,55,0.35)] transition-transform duration-700 hover:rotate-[-5deg] hover:scale-[1.025] sm:w-[300px]">
                <div className="relative aspect-[9/18.5] overflow-hidden rounded-[2.25rem] bg-[#e9eef8]">
                  <div className="absolute left-1/2 top-3 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-[#0b0c11]" />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#dce5f5] via-white to-[#eef1f8]" />
                  <div className="absolute inset-x-5 top-12">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <span>NÜVA ONE</span><Smartphone size={13} />
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Escáner activo</p>
                      <div className="relative mt-3 aspect-square overflow-hidden rounded-xl bg-slate-200">
                        <div className="absolute inset-[12%] rounded-xl border-2 border-[#6366F1]/70 bg-white/30 shadow-inner" />
                        <div className="absolute inset-x-[18%] top-[24%] h-[34%] rounded-md bg-white/85 p-3 shadow-sm">
                          <div className="flex h-full items-stretch justify-center gap-[3px] overflow-hidden rounded bg-white px-3 py-2">
                            {[3,1,2,1,4,2,1,3,2,1,4,1,2,3,1,2,4,1,3,2,1,4,2,1,3].map((w, position) => (
                              <span key={`${w}-${position}`} style={{ width: `${w}px` }} className="h-full shrink-0 bg-[#11131a]" />
                            ))}
                          </div>
                          <p className="mt-1 text-center font-mono text-[7px] tracking-[0.22em] text-slate-500">7801234567890</p>
                        </div>
                        <div className="absolute left-[10%] right-[10%] top-[18%] h-0.5 animate-[scan_1.8s_ease-in-out_infinite] bg-fuchsia-500 shadow-[0_0_14px_rgba(217,70,239,0.95)] motion-reduce:animate-none" />
                        <div className="absolute inset-x-7 bottom-5 h-12 rounded-lg bg-white/95 p-2 text-[8px] shadow-lg transition-all duration-500">
                          <p className="font-bold">Café Molido 250g</p><p className="mt-1 text-slate-500">$5.990 · Stock 24</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 rounded-2xl bg-[#11131a] p-3 text-white shadow-lg">
                      <div className="flex items-center gap-2 text-[9px] font-semibold"><CheckCircle2 size={12} className="text-emerald-400" /> Producto identificado</div>
                      <div className="mt-2 flex justify-between text-[9px] text-white/60"><span>Stock</span><span className="font-bold text-white">24 → 23</span></div>
                      <div className="mt-1 flex justify-between text-[9px] text-white/60"><span>Venta</span><span className="font-bold text-white">+$5.990</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2">
                <div className="rounded-full border border-white/80 bg-white/95 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#6366F1] shadow-xl backdrop-blur">
                  <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" /> CELULAR
                </div>
                <div className="rounded-full border border-white/70 bg-[#11131a]/90 px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white shadow-lg backdrop-blur">
                  Live Scan
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#6366F1]">NÜVA ONE · SMART SCAN</p>
            <h2 className="mt-5 max-w-xl text-5xl font-semibold leading-[0.95] tracking-[-0.045em] sm:text-7xl">Escanea.<br />Vende.<br /><span className="text-[#6366F1]">Controla.</span></h2>
            <p className="mt-7 max-w-xl text-lg leading-8 text-black/60">Tu teléfono puede convertirse en una herramienta de punto de venta e inventario. Escanea un producto y deja que Nüva One conecte la venta con el stock en segundos.</p>
            <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-[#11131a]"><ScanLine size={18} className="text-[#6366F1]" /> Sin hardware complejo. Sin equipos adicionales.</div>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                { step: "01", title: "Escanea", text: "Lee el código del producto directamente desde tu teléfono." },
                { step: "02", title: "Identifica", text: "Reconoce el producto, precio y stock disponible." },
                { step: "03", title: "Registra", text: "La venta actualiza el inventario y deja el movimiento disponible para tu operación." },
              ].map((item) => (
                <div key={item.step} className="rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-[#6366F1]">{item.step}</p>
                  <p className="mt-2 text-sm font-bold">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-black/55">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#6366F1]/15 bg-[#6366F1]/[0.05] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#6366F1]">En segundos</p>
                <p className="mt-1 text-sm leading-6 text-black/60">Consulta stock y registra una venta desde el mismo flujo, sin cambiar de sistema.</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/65 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-black/45">Más contexto</p>
                <p className="mt-1 text-sm leading-6 text-black/60">Cada movimiento puede alimentar la visión de ventas, inventario y resultados del negocio.</p>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-full bg-[#6366F1] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">Probar Nüva One <ArrowRight size={15} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Cómo se conecta tu operación" className="relative overflow-hidden bg-[#080809] px-5 py-24 text-white md:px-10 md:py-36">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E6C687]/50 to-transparent" />
        <div className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-[#E6C687]/[0.08] blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#E6C687]">UNA OPERACIÓN CON CONTEXTO</p>
            <h2 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl">No necesitas más pantallas. <span className="text-[#E6C687]">Necesitas ver cómo se relaciona todo.</span></h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/60">El trabajo comercial no ocurre en módulos aislados. Sigue el recorrido de tus clientes, productos y dinero con información que conserva su contexto.</p>
          </div>
          <div className="mt-14 grid gap-3 md:grid-cols-4">
            {[
              { n: "01", title: "Oportunidad", text: "Un cliente consulta, solicita precio o necesita una propuesta." },
              { n: "02", title: "Venta", text: "La cotización avanza y se convierte en una operación comercial." },
              { n: "03", title: "Inventario", text: "El movimiento se refleja en productos, existencias y reposición." },
              { n: "04", title: "Finanzas", text: "Ingresos, gastos y cobros ayudan a entender el resultado." },
            ].map((item, index) => (
              <article key={item.n} className="relative rounded-2xl border border-white/10 bg-white/[0.045] p-6 transition-colors duration-300 hover:border-[#E6C687]/40 hover:bg-white/[0.07]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-[0.2em] text-[#E6C687]">{item.n}</span>
                  {index < 3 && <ArrowRight className="hidden h-4 w-4 text-white/35 md:block" />}
                </div>
                <h3 className="mt-8 text-2xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/55">{item.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#E6C687]/20 bg-[#E6C687]/[0.06] px-6 py-5 md:px-8">
            <div>
              <p className="text-sm font-semibold text-white">Empieza por el flujo que más importa a tu negocio.</p>
              <p className="mt-1 text-sm text-white/50">Explora la demostración con datos ficticios o revisa los planes disponibles.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="#demo" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white">Ver demo</a>
              <Link to="/pricing" className="inline-flex items-center gap-2 rounded-full bg-[#E6C687] px-5 py-2.5 text-sm font-bold text-[#080809]">Ver planes <ArrowRight size={15} /></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
