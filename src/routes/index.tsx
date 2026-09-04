import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicAiChatWidget } from "@/components/public-ai-chat-widget";
import { PymeNewsRadar } from "@/components/pyme-news-radar";
import { HomeProductPreview } from "@/components/home-product-preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileText,
  Gauge,
  LineChart,
  ScanLine,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. Usamos cifrado en tránsito y en reposo, aislamiento por negocio con Row-Level Security, y cumplimos con la Ley 19.628 y Ley 21.719 de protección de datos personales en Chile.",
  },
  {
    q: "¿Necesito tarjeta de crédito para empezar?",
    a: "No. Tienes 15 días de prueba gratuita con acceso completo, sin tarjeta.",
  },
  {
    q: "¿Puedo conectar Instagram y Facebook?",
    a: "Sí, mediante tu propia cuenta de Meta Business. Te guiamos en la conexión.",
  },
  {
    q: "¿Funciona para mi rubro?",
    a: "Sí. Nüva One está hecho para cualquier rubro: retail, servicios, manufactura, gastronomía, construcción, salud y más.",
  },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Sin contratos ni cargos por cancelación." },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Nüva One",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://nuva-one.vercel.app",
      description:
        "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones y Nüva IA.",
    },
    { "@type": "Organization", name: "Nüva One", url: "https://nuva-one.vercel.app" },
    {
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nüva One — La inteligencia de tu negocio, en un solo lugar" },
      {
        name: "description",
        content:
          "Nüva One reúne gestión, inventario, ventas, finanzas e inteligencia artificial para que las PYMEs entiendan su negocio y tomen mejores decisiones. 15 días gratis, sin tarjeta.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "es_CL" },
      {
        property: "og:title",
        content: "Nüva One — La inteligencia de tu negocio, en un solo lugar",
      },
      {
        property: "og:description",
        content: "Gestiona, entiende y anticipa tu negocio desde una sola plataforma.",
      },
    ],
    links: [{ rel: "canonical", href: "https://nuva-one.vercel.app/" }],
  }),
  component: Landing,
});

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="truncate text-lg font-semibold tracking-tight">Nüva One</span>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          <a
            href="#what-is-nuva"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Información
          </a>
          <a
            href="#ecosystem"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Plataforma
          </a>
          <a
            href="#intelligence"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Inteligencia
          </a>
          <a
            href="#how"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Cómo funciona
          </a>
          <Link
            to="/pricing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Precios
          </Link>
          <a
            href="#faq"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </a>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <Link to="/demo" className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Visualizar Nüva
            </Button>
          </Link>
          <a
            href="#what-is-nuva"
            className="inline-flex shrink-0 items-center rounded-lg border border-border/70 bg-background/70 px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground sm:hidden"
          >
            Información
          </a>
          <Link to="/auth" className="shrink-0">
            <Button variant="ghost" size="sm" className="whitespace-nowrap">
              Iniciar sesión
            </Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }} className="shrink-0">
            <Button size="sm" className="whitespace-nowrap shadow-elegant">
              Empezar gratis
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/.16),transparent_45%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent_0%,hsl(var(--background))_88%)]" />
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
        <div className="mx-auto max-w-4xl text-center animate-fade-in-up">
          <Badge
            variant="secondary"
            className="mb-6 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium"
          >
            <Sparkles className="mr-1.5 h-3 w-3 text-primary" /> Inteligencia para las PYMEs de hoy
          </Badge>
          <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Tu negocio genera datos.
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Nüva los convierte en decisiones.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Gestiona inventario, ventas, clientes y finanzas. Entiende qué está pasando con Nüva
            Score y detecta riesgos y oportunidades con Nüva Radar.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="h-12 w-full px-7 shadow-elegant sm:w-auto">
                Empezar gratis <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/demo">
              <Button size="lg" variant="outline" className="h-12 w-full px-7 sm:w-auto">
                <Sparkles className="mr-1.5 h-4 w-4" /> Ver Nüva en acción
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success" /> 15 días gratis
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success" /> Sin tarjeta
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-success" /> Datos protegidos
            </span>
          </div>
        </div>
        <HomeProductPreview />
      </div>
    </section>
  );
}

function HomeIntroduction() {
  return (
    <section id="what-is-nuva" className="border-y bg-secondary/20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <Badge
              variant="secondary"
              className="rounded-full border border-primary/20 bg-primary/5"
            >
              <Sparkles className="mr-1.5 h-3 w-3 text-primary" /> ¿Qué es Nüva One?
            </Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              La plataforma que reúne la operación y la inteligencia de tu negocio.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Nüva One es una plataforma todo-en-uno para PYMEs. Conecta inventario, ventas,
              clientes, cotizaciones, finanzas, scanner y automatización en un mismo ecosistema para
              que dejes de trabajar con información dispersa.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Y va un paso más allá: Nüva Score resume la salud de tu empresa, Nüva Radar detecta
              riesgos y oportunidades, y Nüva Copilot te ayuda a entender qué significan tus datos y
              qué podrías hacer a continuación.
            </p>
            <Link to="/demo" className="mt-7 inline-flex">
              <Button size="lg" className="h-12 px-6 shadow-elegant">
                Ver cómo funciona <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <Card className="rounded-3xl p-6 shadow-xl sm:p-8">
            <p className="text-sm font-semibold text-primary">¿Qué ganas con Nüva One?</p>
            <div className="mt-5 space-y-4">
              {[
                [
                  Zap,
                  "Más tiempo",
                  "Reduce tareas manuales y evita revisar información en muchos lugares.",
                ],
                [
                  Gauge,
                  "Más claridad",
                  "Entiende el estado de tu negocio con indicadores que tienen contexto.",
                ],
                [
                  Target,
                  "Más anticipación",
                  "Detecta señales, riesgos y oportunidades antes de que pasen desapercibidos.",
                ],
                [
                  Sparkles,
                  "Mejores decisiones",
                  "Usa la inteligencia de Nüva para pasar de datos a acciones concretas.",
                ],
              ].map(([Icon, title, desc]) => (
                <div key={title as string} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{title as string}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {desc as string}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function ProductStory() {
  const [active, setActive] = useState(0);
  const scenes = [
    {
      label: "01 · Detecta",
      title: "Primero, Nüva ve lo que tú no tienes tiempo de revisar.",
      desc: "Nüva Score resume la salud del negocio y Nüva Radar pone el foco en señales que merecen atención.",
      icon: Gauge,
    },
    {
      label: "02 · Entiende",
      title: "Después, convierte los números en contexto.",
      desc: "No tienes que descifrar dashboards aislados. Nüva te ayuda a interpretar qué está ocurriendo y por qué puede importar.",
      icon: Target,
    },
    {
      label: "03 · Decide",
      title: "Finalmente, pasa de información a acción.",
      desc: "Pregunta, compara escenarios y define tu siguiente movimiento con una visión más completa del negocio.",
      icon: Sparkles,
    },
  ];
  const scene = scenes[active];
  const Icon = scene.icon;
  return (
    <section
      className="relative overflow-hidden border-y bg-secondary/15 py-24 sm:py-32"
      id="experience"
    >
      <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="rounded-full border border-primary/20 bg-primary/5">
            La experiencia Nüva
          </Badge>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            No te mostramos una lista de funciones.
            <br />
            <span className="text-primary">Te mostramos cómo piensa Nüva.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Nüva One no es solo un panel con números. Es una capa de inteligencia que conecta lo que
            ocurre en tu negocio con las decisiones que necesitas tomar.
          </p>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div className="space-y-3">
            {scenes.map((item, index) => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActive(index)}
                  className={`w-full rounded-2xl border p-5 text-left transition-all ${active === index ? "border-primary/30 bg-background shadow-lg" : "border-border/60 bg-background/40 hover:border-primary/20 hover:bg-background/70"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <ItemIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        {item.label}
                      </p>
                      <p className="mt-1 font-semibold">{item.title}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <Card className="rounded-3xl p-7 shadow-xl sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-7 w-7" />
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              {scene.label}
            </p>
            <h3 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{scene.title}</h3>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{scene.desc}</p>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Ecosystem() {
  const modules = [
    [Boxes, "Inventario", "Stock, movimientos, alertas y control de productos."],
    [TrendingUp, "Ventas", "Cotizaciones, pedidos, clientes y análisis comercial."],
    [CircleDollarSign, "Finanzas", "Ingresos, egresos, caja y visión financiera."],
    [Users, "CRM", "Centraliza clientes y oportunidades comerciales."],
    [FileText, "Documentos", "Genera, organiza y consulta información clave."],
    [ScanLine, "Scanner", "Digitaliza información y reduce trabajo manual."],
    [Workflow, "Automatización", "Conecta procesos para trabajar con menos fricción."],
    [Sparkles, "Nüva IA", "Pregunta sobre tu negocio y obtén respuestas con contexto."],
  ];
  return (
    <section id="ecosystem" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="rounded-full border border-primary/20 bg-primary/5">
            Un ecosistema conectado
          </Badge>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Todo lo que necesitas. <span className="text-primary">En un solo contexto.</span>
          </h2>
          <p className="mt-5 text-muted-foreground sm:text-lg">
            Cada módulo comparte información para que las decisiones no se tomen a ciegas.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map(([Icon, title, desc]) => (
            <Card
              key={title as string}
              className="rounded-2xl p-5 transition-shadow hover:shadow-lg"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{title as string}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc as string}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Intelligence() {
  const features = [
    [Gauge, "Nüva Score", "Una lectura ejecutiva de la salud de tu negocio."],
    [Activity, "Nüva Radar", "Señales y alertas para detectar riesgos y oportunidades."],
    [Sparkles, "Nüva Copilot", "Una IA que responde con el contexto de tu empresa."],
    [BarChart3, "Analítica", "Visualiza tendencias, rendimiento y evolución."],
  ];
  return (
    <section id="intelligence" className="border-y bg-secondary/15 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <Badge
              variant="secondary"
              className="rounded-full border border-primary/20 bg-primary/5"
            >
              Inteligencia empresarial
            </Badge>
            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Tu información deja de ser un archivo.
              <span className="text-primary"> Se convierte en criterio.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-muted-foreground sm:text-lg">
              Nüva combina datos operacionales con inteligencia para ayudarte a detectar patrones,
              entender problemas y actuar antes.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map(([Icon, title, desc]) => (
              <Card key={title as string} className="rounded-2xl p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{title as string}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {desc as string}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ["01", "Conecta", "Registra tu negocio y comienza a centralizar la información."],
    ["02", "Gestiona", "Trabaja con inventario, ventas, clientes y finanzas."],
    ["03", "Entiende", "Nüva transforma los datos en indicadores y señales."],
    ["04", "Decide", "Usa el contexto para tomar mejores decisiones."],
  ];
  return (
    <section id="how" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="rounded-full border border-primary/20 bg-primary/5">
            Cómo funciona
          </Badge>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            De datos dispersos a <span className="text-primary">decisiones claras.</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {steps.map(([number, title, desc]) => (
            <Card key={number} className="rounded-2xl p-6">
              <span className="text-xs font-bold tracking-[0.18em] text-primary">{number}</span>
              <h3 className="mt-3 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingPreview() {
  return (
    <section className="border-y bg-secondary/15 py-20 sm:py-28" id="pricing">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="rounded-full border border-primary/20 bg-primary/5">
            Planes simples
          </Badge>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Empieza gratis. Escala cuando lo necesites.
          </h2>
          <p className="mt-5 text-muted-foreground sm:text-lg">
            Prueba Nüva One durante 15 días, sin tarjeta, y descubre qué cambia cuando todo tu
            negocio está conectado.
          </p>
        </div>
        <div className="mt-10 flex justify-center">
          <Link to="/pricing">
            <Button size="lg" className="h-12 px-7 shadow-elegant">
              Ver planes y precios <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center">
          <Badge variant="secondary" className="rounded-full border border-primary/20 bg-primary/5">
            Preguntas frecuentes
          </Badge>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Lo que necesitas saber.
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem key={item.q} value={`item-${index}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-foreground px-6 py-14 text-background shadow-2xl sm:px-12 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Sparkles className="mx-auto h-8 w-8 opacity-80" />
          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
            Tu negocio ya tiene los datos.
            <br />
            <span className="text-primary">Ahora dale inteligencia.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-background/70 sm:text-lg">
            Empieza con 15 días gratis y descubre cómo cambia la forma en que gestionas y entiendes
            tu negocio.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" variant="secondary" className="h-12 w-full px-7 sm:w-auto">
                Empezar gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/demo">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full border-background/20 bg-transparent px-7 text-background hover:bg-background/10 hover:text-background sm:w-auto"
              >
                Ver la demo
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Nüva One</span>
        </div>
        <p>© {new Date().getFullYear()} Nüva One. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

function Landing() {
  const { data: sessionData } = useQuery({
    queryKey: ["public-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(STRUCTURED_DATA);
    document.head.appendChild(script);
    return () => script.remove();
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <HomeIntroduction />
        <ProductStory />
        <Ecosystem />
        <Intelligence />
        <HowItWorks />
        <PricingPreview />
        <FAQ />
        <CTA />
      </main>
      <Footer />
      <PublicAiChatWidget />
    </div>
  );
}
