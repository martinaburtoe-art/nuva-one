import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  BarChart3,
  Boxes,
  CreditCard,
  Sparkles,
  FileText,
  Workflow,
  Megaphone,
  ShoppingCart,
  TrendingUp,
  Users,
  Check,
  ArrowRight,
  Zap,
  Shield,
  Globe,
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
      url: "https://nuvaone.lovable.app",
      description:
        "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones, marketing y automatización con IA.",
      offers: [
        {
          "@type": "Offer",
          name: "Prueba gratuita",
          price: "0",
          priceCurrency: "CLP",
          description: "15 días de acceso completo a todos los módulos, sin tarjeta de crédito.",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "29990",
          priceCurrency: "CLP",
          priceValidUntil: "2027-12-31",
          description:
            "Negocios y productos ilimitados, IA, Caja, WhatsApp, Marketing y automatizaciones.",
        },
      ],
    },
    {
      "@type": "Organization",
      name: "Nüva One",
      url: "https://nuvaone.lovable.app",
    },
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
      {
        title: "Nüva One — Inventario, ventas y finanzas de tu PYME en una sola plataforma",
      },
      {
        name: "description",
        content:
          "Reemplaza planillas sueltas por una plataforma con inventario, ventas, finanzas, cotizaciones, marketing y un asistente IA. 15 días gratis, sin tarjeta.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "es_CL" },
      {
        property: "og:title",
        content: "Nüva One — Inventario, ventas y finanzas de tu PYME en una sola plataforma",
      },
      {
        property: "og:description",
        content:
          "Reemplaza planillas sueltas por una plataforma con inventario, ventas, finanzas, cotizaciones, marketing y un asistente IA. 15 días gratis, sin tarjeta.",
      },
    ],
    links: [{ rel: "canonical", href: "https://nuvaone.lovable.app/" }],
  }),
  component: Landing,
});

function Nav() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-border/40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Nüva One</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Características
          </a>
          <a
            href="#how"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Cómo funciona
          </a>
          <a
            href="#pricing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Precios
          </a>
          <a
            href="#faq"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm">
              Iniciar sesión
            </Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="sm" className="shadow-elegant">
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
    <section className="relative overflow-hidden bg-gradient-mesh">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <div className="mx-auto max-w-3xl text-center animate-fade-in-up">
          <Badge
            variant="secondary"
            className="mb-6 rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-xs font-medium backdrop-blur"
          >
            <Sparkles className="mr-1.5 h-3 w-3" /> Nuevo · Asistente IA integrado
          </Badge>
          <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Deja las planillas.{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Maneja tu PYME desde un solo lugar
            </span>
            .
          </h1>
          <p className="mt-6 text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Inventario, ventas, finanzas, cotizaciones y marketing conectados en una sola plataforma
            — con un asistente de IA que responde con los datos reales de tu negocio.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button
                size="lg"
                className="h-12 px-6 shadow-elegant transition-transform hover:scale-105"
              >
                Empieza gratis — Sin tarjeta <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="outline" className="h-12 px-6">
                Ver cómo funciona (2 min)
              </Button>
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success" /> 15 días gratis
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success" /> Sin tarjeta de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success" /> Cancela cuando quieras
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-success" /> Datos protegidos — Ley 21.719
            </span>
          </div>
        </div>

        {/* Mockup */}
        <div className="relative mx-auto mt-16 max-w-5xl animate-fade-in-up">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-2 shadow-elegant backdrop-blur">
            <div className="rounded-xl bg-gradient-to-br from-card to-secondary p-6">
              <div className="mb-4 flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-warning/60" />
                <div className="h-3 w-3 rounded-full bg-success/60" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { l: "Ingresos", v: "$12.4M", t: "+18%", c: "text-success" },
                  { l: "Ventas", v: "284", t: "+12%", c: "text-success" },
                  { l: "Stock", v: "1.2k", t: "Activo", c: "text-muted-foreground" },
                  { l: "Margen", v: "32%", t: "+4 pts", c: "text-success" },
                ].map((k) => (
                  <div key={k.l} className="rounded-lg bg-card p-4 shadow-soft">
                    <div className="text-xs text-muted-foreground">{k.l}</div>
                    <div className="mt-1 text-2xl font-semibold">{k.v}</div>
                    <div className={`mt-1 text-xs ${k.c}`}>{k.t}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid h-32 grid-cols-12 items-end gap-1 rounded-lg bg-card p-4">
                {[40, 65, 50, 80, 55, 90, 70, 95, 75, 100, 85, 110].map((h, i) => (
                  <div
                    key={i}
                    className="rounded-t bg-gradient-primary opacity-80"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-3xl text-center text-sm text-muted-foreground">
          Nüva One es una plataforma de gestión todo-en-uno para pequeñas y medianas empresas en
          Chile y Latinoamérica. Integra inventario, ventas, finanzas, cotizaciones, compras y
          marketing en Meta en un solo sistema, con un asistente de inteligencia artificial que
          responde preguntas usando los datos reales del negocio. Incluye 15 días de prueba gratuita
          sin tarjeta de crédito.
        </p>
      </div>
    </section>
  );
}

function Problems() {
  const items = [
    {
      icon: FileText,
      p: "Planillas desconectadas",
      s: "Toda tu info en una sola plataforma sincronizada.",
    },
    {
      icon: TrendingUp,
      p: "Sin visibilidad de flujo de caja",
      s: "Proyecciones y alertas en tiempo real.",
    },
    {
      icon: Megaphone,
      p: "Marketing manual y lento",
      s: "Programa Instagram y Facebook desde un calendario.",
    },
    { icon: Boxes, p: "Inventario descontrolado", s: "Stock unificado con alertas automáticas." },
    {
      icon: BarChart3,
      p: "Sin insights del negocio",
      s: "Asistente IA que responde con tus propios datos.",
    },
    {
      icon: Workflow,
      p: "Procesos repetitivos",
      s: "Automatizaciones conectadas a tus herramientas.",
    },
  ];
  return (
    <section className="border-y bg-secondary/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Lo que frena a tu PYME, Nüva One lo resuelve
          </h2>
          <p className="mt-4 text-muted-foreground">
            Diseñado para quienes manejan demasiado con muy poco tiempo.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card
              key={it.p}
              className="group border-border/60 p-6 transition-all hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                <it.icon className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium text-muted-foreground line-through">{it.p}</div>
              <div className="mt-1 text-base font-semibold">{it.s}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Crea tu cuenta", d: "Registro en menos de un minuto, sin tarjeta." },
    { n: "02", t: "Conecta tus canales", d: "Productos, redes sociales y datos del negocio." },
    { n: "03", t: "Gestiona todo en uno", d: "Ventas, inventario, finanzas y marketing." },
    { n: "04", t: "Decide con IA", d: "Insights y automatizaciones que ahorran horas." },
  ];
  return (
    <section id="how" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Empieza en minutos</h2>
          <p className="mt-4 text-muted-foreground">Sin instalaciones. Sin contratos.</p>
        </div>
        <div className="relative mt-16 grid gap-8 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow">
                {s.n}
              </div>
              <div className="mt-4 text-center">
                <h3 className="font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: CreditCard,
      t: "Finanzas y Cash Flow",
      d: "Ingresos, gastos, proyecciones y facturación.",
    },
    { icon: Boxes, t: "Inventario", d: "Stock unificado, alertas y movimientos." },
    { icon: ShoppingCart, t: "Ventas", d: "Pedidos multicanal con embudo y métricas." },
    { icon: Users, t: "Compras", d: "Proveedores, órdenes y pagos." },
    { icon: BarChart3, t: "Indicadores", d: "KPIs y análisis personalizados." },
    { icon: Megaphone, t: "Marketing Meta", d: "Calendario, programación y métricas." },
    { icon: Sparkles, t: "Asistente IA", d: "Respuestas con tus datos reales." },
    { icon: FileText, t: "Cotizaciones", d: "Envía cotizaciones profesionales en segundos." },
    { icon: Workflow, t: "Automatizaciones", d: "Flujos visuales conectados a n8n." },
    { icon: Globe, t: "Multi-negocio", d: "Maneja varias empresas con un solo login." },
  ];
  return (
    <section id="features" className="border-y bg-secondary/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Todo lo que necesitas, conectado
          </h2>
          <p className="mt-4 text-muted-foreground">
            Una plataforma. Diez módulos. Cero planillas.
          </p>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((f) => (
            <Card
              key={f.t}
              className="group border-border/60 p-5 transition-all hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold">{f.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      n: "Prueba gratuita",
      p: "Gratis",
      per: "15 días",
      f: [
        "Acceso completo a todos los módulos",
        "Sin tarjeta de crédito",
        "Cancela cuando quieras",
      ],
      c: "",
      metric: "Prueba todos los módulos antes de decidir.",
    },
    {
      n: "Pro",
      p: "$29.990",
      per: "/mes",
      f: [
        "Todo lo de la prueba, sin límite de tiempo",
        "Negocios y productos ilimitados",
        "IA, Caja, WhatsApp y Marketing",
        "Automatizaciones y equipo",
      ],
      c: "Más popular",
      hi: true,
      metric: "Reemplaza 3-4 herramientas sueltas por una sola suscripción.",
    },
  ];
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Precios simples y transparentes
          </h2>
          <p className="mt-4 text-muted-foreground">
            Un solo nivel de funciones. Prueba 15 días gratis, luego Pro.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-3xl gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <Card
              key={p.n}
              className={`relative p-8 transition-transform hover:-translate-y-1 ${p.hi ? "border-primary shadow-elegant md:scale-105" : "border-border/60"}`}
            >
              {p.c && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary">
                  {p.c}
                </Badge>
              )}
              <h3 className="text-lg font-semibold">{p.n}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{p.p}</span>
                {p.per && <span className="text-sm text-muted-foreground">{p.per}</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {p.f.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" /> {feat}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">{p.metric}</p>
              <Link to="/auth" search={{ mode: "signup" }} className="mt-4 block">
                <Button className="w-full" variant={p.hi ? "default" : "outline"}>
                  Empezar
                </Button>
              </Link>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Sin permanencia. Cambia de plan cuando quieras.
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  const cases = [
    {
      icon: ShoppingCart,
      t: "Retail y tiendas",
      d: "Unifica stock y ventas de todas tus sucursales o canales en un solo inventario, sin planillas duplicadas.",
    },
    {
      icon: CreditCard,
      t: "Servicios profesionales",
      d: "Envía cotizaciones en minutos y sigue tu flujo de caja proyectado sin depender de tu contador para cada consulta.",
    },
    {
      icon: Megaphone,
      t: "Gastronomía y atención al público",
      d: "Programa publicaciones en Instagram y Facebook, y controla caja y turnos desde la misma plataforma.",
    },
  ];
  return (
    <section className="border-y bg-secondary/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Para qué usan Nüva One negocios como el tuyo
          </h2>
          <p className="mt-4 text-muted-foreground">
            Casos de uso reales de la plataforma, según el tipo de negocio.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {cases.map((x) => (
            <Card
              key={x.t}
              className="border-border/60 p-6 transition-all hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <x.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold">{x.t}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{x.d}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Preguntas frecuentes</h2>
        </div>
        <Accordion type="single" collapsible className="mt-12">
          {FAQ_ITEMS.map((it) => (
            <AccordionItem key={it.q} value={it.q}>
              <AccordionTrigger className="text-left text-base font-medium">
                {it.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-primary py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-balance text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl">
          Empieza a operar tu negocio como uno grande.
        </h2>
        <p className="mt-4 text-lg text-primary-foreground/80">
          Sin tarjeta. Sin contratos. Sin instalaciones.
        </p>
        <Link to="/auth" search={{ mode: "signup" }} className="mt-10 inline-block">
          <Button
            size="lg"
            variant="secondary"
            className="h-12 px-6 shadow-elegant transition-transform hover:scale-105"
          >
            Crear cuenta gratis <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-secondary/30 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Nüva One</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              La plataforma todo-en-uno para PYMEs en Chile y Latinoamérica.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Producto</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#features">Características</a>
              </li>
              <li>
                <a href="#pricing">Precios</a>
              </li>
              <li>
                <a href="#faq">FAQ</a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Empresa</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#">Sobre nosotros</a>
              </li>
              <li>
                <a href="#">Contacto</a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/privacy">Privacidad</Link>
              </li>
              <li>
                <Link to="/terms">Términos</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} Nüva One. Hecho con <Zap className="inline h-3 w-3" /> en
            Chile.
          </p>
          <p className="flex items-center gap-1.5">
            <Shield className="h-3 w-3" /> Datos protegidos · Ley 19.628
          </p>
        </div>
      </div>
    </footer>
  );
}

function ExitIntentPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("novaflow.exit_popup_shown")) return;

    function show() {
      if (sessionStorage.getItem("novaflow.exit_popup_shown")) return;
      sessionStorage.setItem("novaflow.exit_popup_shown", "1");
      setOpen(true);
    }

    function onMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) show();
    }

    function onScroll() {
      const scrolled =
        window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrolled >= 0.6) show();
    }

    document.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <Card
        className="relative w-full max-w-md border-border/60 p-8 shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Cerrar"
          className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
        >
          ✕
        </button>
        <Badge variant="secondary" className="mb-4 w-fit rounded-full px-3 py-1 text-xs">
          <Sparkles className="mr-1.5 h-3 w-3" /> Antes de irte
        </Badge>
        <h3 className="text-xl font-semibold tracking-tight">Tienes 15 días gratis esperándote</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Acceso completo a inventario, ventas, finanzas y el asistente IA. Sin tarjeta de crédito,
          cancela cuando quieras.
        </p>
        <Link to="/auth" search={{ mode: "signup" }} className="mt-6 block">
          <Button className="w-full" onClick={() => setOpen(false)}>
            Crear cuenta gratis <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      </Card>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <Nav />
      <main>
        <Hero />
        <Problems />
        <HowItWorks />
        <Features />
        <Pricing />
        <UseCases />
        <FAQ />
        <CTA />
      </main>
      <Footer />
      <ExitIntentPopup />
    </div>
  );
}
