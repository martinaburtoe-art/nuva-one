import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  ChevronDown,
  Info,
  Package,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NUVA_PLANS, formatClp } from "@/lib/plan-config";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Planes Nüva One — Start y Pro" },
      {
        name: "description",
        content: "Conoce Nüva Start y Nüva Pro para gestionar, entender y hacer crecer tu PYME.",
      },
      { property: "og:title", content: "Planes Nüva One — Start y Pro" },
      {
        property: "og:description",
        content:
          "Descubre qué hace cada herramienta de Nüva One y elige el nivel de gestión que necesita tu PYME.",
      },
    ],
  }),
  component: PricingPage,
});

const plans = [
  {
    ...NUVA_PLANS.starter,
    description: "Para ordenar y controlar la operación diaria de tu PYME.",
    cta: "Comenzar con Start",
    featured: false,
    highlights: [
      `${NUVA_PLANS.starter.includedUsers} usuario incluido`,
      `Hasta ${NUVA_PLANS.starter.maxProducts.toLocaleString("es-CL")} productos`,
      `${NUVA_PLANS.starter.aiMessagesMonthly} créditos IA al mes`,
      `${NUVA_PLANS.starter.storageMb / 1024} GB de almacenamiento`,
    ],
    features: [
      "Dashboard del negocio",
      "Inventario y SKU",
      "Scanner móvil",
      "Ventas y caja",
      "Clientes y CRM básico",
      "Cotizaciones",
      "Compras y entregas",
      "Nüva Score básico",
      "IA para consultas y explicaciones",
      "15 días de prueba gratuita",
    ],
  },
  {
    ...NUVA_PLANS.pro,
    description: "Para analizar, anticipar y tomar mejores decisiones con inteligencia.",
    cta: "Elegir Pro",
    featured: true,
    highlights: [
      `${NUVA_PLANS.pro.includedUsers} usuarios incluidos`,
      `Hasta ${NUVA_PLANS.pro.maxProducts.toLocaleString("es-CL")} productos`,
      `${NUVA_PLANS.pro.aiMessagesMonthly} créditos IA al mes`,
      `${NUVA_PLANS.pro.storageMb / 1024} GB de almacenamiento`,
    ],
    features: [
      "Todo Nüva Start",
      "Nüva Score avanzado",
      "Nüva Radar",
      "Nüva Copilot",
      "IA empresarial avanzada",
      "Flujo de caja completo",
      "Estado de resultados",
      "Rentabilidad y proyecciones",
      "Alertas y automatizaciones",
      "Reportes avanzados",
      "Gestión tributaria organizada",
      "Exportaciones avanzadas",
    ],
  },
] as const;

const comparison = [
  ["Inventario + SKU", "Sí", "Sí"],
  ["Scanner móvil", "Sí", "Sí"],
  ["Ventas y caja", "Sí", "Sí"],
  ["CRM", "Básico", "Avanzado"],
  ["Nüva Score", "Básico", "Avanzado"],
  ["Nüva Radar", "—", "Sí"],
  ["Nüva Copilot", "—", "Sí"],
  ["Flujo de caja", "Básico", "Completo"],
  ["Estado de resultados", "—", "Sí"],
  ["Proyecciones", "—", "Sí"],
  ["Automatizaciones", "—", "Sí"],
] as const;

const featureDescriptions: Record<string, { title: string; description: string; benefit: string }> =
  {
    "Inventario + SKU": {
      title: "Inventario + SKU",
      description:
        "Organiza tus productos, códigos SKU, existencias y movimientos en un solo lugar.",
      benefit: "Deja de depender de planillas y reduce errores de stock.",
    },
    "Scanner móvil": {
      title: "Scanner móvil",
      description:
        "Usa la cámara de tu celular para identificar productos y agilizar registros de inventario.",
      benefit: "Convierte tu celular en una herramienta de control de inventario.",
    },
    "Ventas y caja": {
      title: "Ventas y caja",
      description:
        "Registra ventas y movimientos de caja para mantener una visión clara de la operación diaria.",
      benefit: "Sabe cuánto vendes y qué está pasando con tu dinero.",
    },
    CRM: {
      title: "CRM",
      description:
        "Centraliza clientes y su información para ordenar la relación comercial y hacer seguimiento.",
      benefit: "Conoce mejor a tus clientes y evita perder oportunidades.",
    },
    "Nüva Score": {
      title: "Nüva Score",
      description:
        "Es el indicador de salud de tu negocio. Nüva analiza la información disponible y la convierte en una puntuación fácil de entender, ayudándote a detectar fortalezas y áreas que necesitan atención.",
      benefit: "Entiende rápidamente qué tan saludable está tu negocio y dónde debes actuar.",
    },
    "Nüva Radar": {
      title: "Nüva Radar",
      description:
        "Es el sistema de detección de Nüva One. Monitorea señales relevantes del negocio y te ayuda a identificar riesgos, oportunidades y situaciones que requieren atención.",
      benefit:
        "No esperes a descubrir un problema cuando ya sea tarde: Nüva te ayuda a saber dónde mirar.",
    },
    "Nüva Copilot": {
      title: "Nüva Copilot",
      description:
        "Un asistente inteligente diseñado para ayudarte a trabajar con la información y procesos de tu empresa.",
      benefit: "Obtén orientación y apoyo para tomar decisiones sin hacerlo todo manualmente.",
    },
    "Flujo de caja": {
      title: "Flujo de caja",
      description:
        "Permite visualizar entradas, salidas y disponibilidad de efectivo para entender cómo se mueve el dinero de tu empresa.",
      benefit: "Anticipa necesidades de liquidez y toma decisiones con mayor control.",
    },
    "Estado de resultados": {
      title: "Estado de resultados",
      description:
        "Ordena ingresos, costos y gastos para ayudarte a comprender el resultado económico del negocio.",
      benefit: "Entiende si tu empresa realmente está generando rentabilidad.",
    },
    Proyecciones: {
      title: "Rentabilidad y proyecciones",
      description:
        "Utiliza la información disponible para analizar tendencias y proyectar escenarios del negocio.",
      benefit: "Planifica con información en lugar de tomar decisiones a ciegas.",
    },
    Automatizaciones: {
      title: "Alertas y automatizaciones",
      description:
        "Reduce tareas repetitivas y recibe señales cuando determinados eventos o condiciones requieren atención.",
      benefit: "Ahorra tiempo y mantén el control incluso cuando estás ocupado.",
    },
  };

function PricingPage() {
  const [openFeature, setOpenFeature] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-4 w-4" />
            </span>
            Nüva One
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm">
                Volver
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm">Empezar gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-72 max-w-4xl bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5"
          >
            <Sparkles className="mr-1.5 h-3 w-3" /> Planes Nüva One
          </Badge>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Elige cómo quieres gestionar tu negocio.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            No estás eligiendo solo funciones. Estás eligiendo cuánto control, inteligencia y
            acompañamiento quieres tener sobre tu empresa.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-xs text-muted-foreground shadow-sm">
            <ShieldCheck className="h-4 w-4 text-primary" /> 15 días gratis · Sin tarjeta · Cancela
            cuando quieras
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border bg-card p-5 shadow-sm sm:p-7 ${plan.featured ? "border-primary/60 shadow-[0_25px_80px_-30px_hsl(var(--primary)/.55)]" : "border-border/70"}`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="rounded-full px-4 shadow-lg">Más recomendado</Badge>
                </div>
              )}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${plan.featured ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}
                >
                  {plan.featured ? <Brain className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                </div>
              </div>
              <div className="mt-7">
                <span className="text-4xl font-bold tracking-tight sm:text-5xl">
                  {formatClp(plan.monthlyPriceClp)}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">/ mes</span>
                <div className="mt-2 text-xs text-muted-foreground">
                  o {formatClp(plan.annualPriceClp)} / año
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {plan.highlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border bg-secondary/30 p-3 text-xs font-medium leading-snug"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <Link
                to="/checkout"
                search={{ plan: plan.id, billing: "monthly" }}
                className="mt-6"
              >
                <Button
                  className="h-12 w-full rounded-xl"
                  variant={plan.featured ? "default" : "outline"}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <div className="mt-7 border-t pt-6">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Qué obtienes
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y bg-secondary/20 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <Badge variant="outline" className="rounded-full">
              <Info className="mr-1.5 h-3.5 w-3.5" /> Te explicamos cada herramienta
            </Badge>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Compara entendiendo lo que realmente obtienes
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              ¿Es la primera vez que escuchas hablar de Nüva Score o Nüva Radar? No importa. Toca
              cualquier funcionalidad para descubrir qué hace, qué problema resuelve y por qué puede
              ser útil para tu negocio.
            </p>
          </div>
          <div className="mt-8 overflow-hidden rounded-3xl border bg-card">
            <div className="grid grid-cols-[1.55fr_1fr_1fr] border-b bg-secondary/40 px-4 py-4 text-xs font-semibold sm:px-6">
              <span>Herramienta</span>
              <span>Start</span>
              <span>Pro</span>
            </div>
            {comparison.map(([feature, start, pro]) => {
              const info = featureDescriptions[feature];
              const isOpen = openFeature === feature;
              return (
                <div key={feature} className="border-b last:border-0">
                  <button
                    type="button"
                    onClick={() => setOpenFeature(isOpen ? null : feature)}
                    className="grid w-full grid-cols-[1.55fr_1fr_1fr] items-center px-4 py-4 text-left text-sm transition-colors hover:bg-secondary/30 sm:px-6"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span>{feature}</span>
                      {info && <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    </span>
                    <span className="text-muted-foreground">{start}</span>
                    <span className="flex items-center gap-2 font-medium text-primary">
                      {pro}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>
                  {isOpen && info && (
                    <div className="mx-4 mb-4 rounded-2xl border bg-secondary/30 p-4 sm:mx-6">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
                          <Info className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{info.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {info.description}
                          </p>
                          <p className="mt-3 text-sm font-medium">💡 {info.benefit}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-10">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                ¿Qué plan tiene más sentido para ti?
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Piensa en el resultado que buscas, no solo en las funciones. Start te ayuda a
                ordenar y controlar. Pro agrega inteligencia para interpretar, anticipar y decidir
                mejor.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border p-5">
                <div className="font-semibold">Nüva Start</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Ideal si quieres digitalizar la operación, ordenar inventario, ventas, clientes y
                  caja y comenzar a conocer mejor el estado de tu negocio.
                </p>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                <div className="font-semibold">Nüva Pro</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Ideal si quieres ir más allá del registro: analizar tu empresa, detectar señales,
                  proyectar resultados, automatizar tareas y tomar decisiones con mayor información.
                </p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <Link
                to="/checkout"
                search={{ plan: "pro", billing: "monthly" }}
                className="inline-flex"
              >
                <Button size="lg" className="rounded-xl">
                  Probar Nüva One gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border bg-card p-5">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-semibold">Usuarios adicionales</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start: {formatClp(NUVA_PLANS.starter.extraUserPriceClp)} por usuario. Pro:{" "}
              {formatClp(NUVA_PLANS.pro.extraUserPriceClp)}.
            </p>
          </div>
          <div className="rounded-3xl border bg-card p-5">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-semibold">IA controlada</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Los créditos protegen el costo de IA y hacen transparente su consumo.
            </p>
          </div>
          <div className="rounded-3xl border bg-card p-5">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-semibold">Sin sorpresas</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Los límites se aplican también en backend, no solo en la interfaz.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
