import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Boxes, Brain, CheckCircle2, CircleDollarSign, ScanLine, ShoppingCart, Smartphone, Users } from "lucide-react";
import { DemoWorkspace } from "@/components/demo/demo-workspace";
import { DemoStateProvider } from "@/lib/demo/demo-state";

const BENEFITS = [
  { icon: ShoppingCart, title: "Ventas conectadas", text: "Registra ventas y mantén el resto de la operación actualizado." },
  { icon: Boxes, title: "Inventario en contexto", text: "Controla stock, productos y movimientos sin trabajar a ciegas." },
  { icon: CircleDollarSign, title: "Finanzas claras", text: "Entiende ingresos, gastos, caja y resultados desde un mismo lugar." },
  { icon: Users, title: "Clientes y CRM", text: "Conserva historial y contexto para atender mejor y vender con información." },
  { icon: BarChart3, title: "Reportes útiles", text: "Convierte los datos operacionales en información que puedas usar." },
  { icon: Brain, title: "Inteligencia para decidir", text: "Nüva One ayuda a interpretar lo que está pasando en tu negocio." },
];

export function HomeFixedExperience() {
  return (
    <>
      <section className="relative isolate min-h-[min(860px,100vh)] overflow-hidden bg-[#080809] text-white">
        <video className="absolute inset-0 h-full w-full object-cover" src="/Chilean_retail_shop_opens_morning_20260918131053.mp4" autoPlay loop muted playsInline preload="auto" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 mx-auto flex min-h-[min(860px,100vh)] max-w-7xl items-end px-6 pb-16 pt-32 md:px-10 md:pb-20">
          <div className="max-w-4xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-[#E6C687]">NÜVA ONE · TODO CONECTADO</p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.045em] sm:text-7xl lg:text-[clamp(5rem,8vw,8.5rem)]">La inteligencia de tu negocio, en un solo lugar.</h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">Ventas, inventario, finanzas, clientes e inteligencia conectados para que puedas gestionar y entender tu negocio.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-full bg-[#E6C687] px-6 py-3 text-sm font-bold text-[#080809]">Empezar gratis <ArrowRight size={15} /></Link>
              <a href="#demo" className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold backdrop-blur">Probar Nüva One</a>
            </div>
          </div>
        </div>
      </section>

 

      <section aria-label="Smart Scan de Nüva One" className="relative overflow-hidden bg-[#f4f7ff] px-5 py-24 text-[#11131a] md:px-10 md:py-36">
        <div className="absolute -left-32 top-20 h-96 w-96 animate-pulse rounded-full bg-[#6366F1]/15 blur-3xl motion-reduce:animate-none" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 animate-pulse rounded-full bg-fuchsia-300/20 blur-3xl motion-reduce:animate-none" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="order-2 lg:order-1">
            <div className="relative mx-auto w-full max-w-[520px]">
              <div className="absolute left-1/2 top-1/2 h-[82%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[3rem] bg-[#6366F1]/20 blur-3xl" />
              <div className="relative mx-auto w-[260px] rotate-[-8deg] rounded-[3rem] border-[10px] transition-transform duration-700 hover:rotate-[-5deg] hover:scale-[1.025] border-[#171923] bg-[#0b0c11] p-2 shadow-[0_40px_90px_rgba(30,32,55,0.35)] sm:w-[300px]">
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
                        <div className="absolute inset-[18%] rounded-xl border-2 border-[#6366F1]/70 bg-white/35" />
                        <div className="absolute left-[12%] right-[12%] top-1/2 h-0.5 animate-[scan_2.2s_ease-in-out_infinite] motion-reduce:animate-none bg-fuchsia-500 shadow-[0_0_12px_rgba(217,70,239,0.9)]" />
                        <div className="absolute inset-x-7 bottom-6 h-12 rounded-lg bg-white/90 p-2 text-[8px] shadow-lg">
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
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6366F1] shadow-xl backdrop-blur animate-bounce motion-reduce:animate-none">
                <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live Scan
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#6366F1]">NÜVA ONE · SMART SCAN</p>
            <h2 className="mt-5 max-w-xl text-5xl font-semibold leading-[0.95] tracking-[-0.045em] sm:text-7xl">Escanea.<br />Vende.<br /><span className="text-[#6366F1]">Controla.</span></h2>
            <p className="mt-7 max-w-xl text-lg leading-8 text-black/60">Tu teléfono puede convertirse en una herramienta de punto de venta e inventario. Escanea un producto y deja que Nüva One conecte la venta con el stock en segundos.</p>
            <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-[#11131a]"><ScanLine size={18} className="text-[#6366F1]" /> Sin hardware complejo. Sin equipos adicionales.</div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-full bg-[#6366F1] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">Probar Nüva One <ArrowRight size={15} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#080809] px-6 py-24 text-white md:px-10 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#E6C687]">¿QUÉ ES NÜVA ONE?</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Todo lo que tu negocio necesita. Sin fragmentarlo.</h2>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/65">Nüva One reúne la operación de tu empresa en una sola plataforma. Menos información dispersa, menos trabajo duplicado y más contexto para decidir.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                  <Icon className="h-5 w-5 text-[#E6C687]" />
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{text}</p>
                </article>
              ))}
            </div>
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
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-2xl">
            <DemoStateProvider><DemoWorkspace onExit={() => undefined} /></DemoStateProvider>
          </div>
        </div>
      </section>
    </>
  );
}
