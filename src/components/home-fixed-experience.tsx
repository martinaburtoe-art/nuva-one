import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Boxes, Brain, CircleDollarSign, ShoppingCart, Users } from "lucide-react";
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
