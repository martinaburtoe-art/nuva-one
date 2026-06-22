import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BarChart3, Boxes, CreditCard, Sparkles, FileText, Workflow,
  Megaphone, ShoppingCart, TrendingUp, Users, Check, Star,
  ArrowRight, Zap, Shield, Globe,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NovaFlow — Gestiona todo tu negocio desde un solo lugar" },
      { name: "description", content: "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones, marketing y automatización con IA. Empieza gratis." },
      { property: "og:title", content: "NovaFlow — Tu negocio, todo conectado" },
      { property: "og:description", content: "Inventario, ventas, finanzas y marketing en una plataforma inteligente." },
    ],
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
          <span className="text-lg font-semibold tracking-tight">NovaFlow</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Características</a>
          <a href="#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Cómo funciona</a>
          <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Precios</a>
          <a href="#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Iniciar sesión</Button></Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="sm" className="shadow-elegant">Empezar gratis</Button>
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
          <Badge variant="secondary" className="mb-6 rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-xs font-medium backdrop-blur">
            <Sparkles className="mr-1.5 h-3 w-3" /> Nuevo · Asistente IA integrado
          </Badge>
          <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Tu negocio, <span className="bg-gradient-primary bg-clip-text text-transparent">todo conectado</span>.
          </h1>
          <p className="mt-6 text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Inventario, ventas, finanzas, cotizaciones y marketing —{" "}
            todo en una sola plataforma inteligente, hecha para PYMEs en Chile y Latinoamérica.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="h-12 px-6 shadow-elegant transition-transform hover:scale-105">
                Empieza gratis — Sin tarjeta <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-12 px-6">Ver demo</Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">14 días Pro gratis · Cancela cuando quieras</p>
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
                  <div key={i} className="rounded-t bg-gradient-primary opacity-80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -left-8 top-1/4 hidden rounded-xl border border-border/60 bg-card p-4 shadow-elegant md:block">
            <div className="text-xs text-muted-foreground">Cash flow proyectado</div>
            <div className="text-xl font-semibold text-success">+$3.2M</div>
          </div>
          <div className="absolute -right-8 bottom-1/4 hidden rounded-xl border border-border/60 bg-card p-4 shadow-elegant md:block">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="text-xs font-medium">IA: Reabastecer SKU-042</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Problems() {
  const items = [
    { icon: FileText, p: "Planillas desconectadas", s: "Toda tu info en una sola plataforma sincronizada." },
    { icon: TrendingUp, p: "Sin visibilidad de flujo de caja", s: "Proyecciones y alertas en tiempo real." },
    { icon: Megaphone, p: "Marketing manual y lento", s: "Programa Instagram y Facebook desde un calendario." },
    { icon: Boxes, p: "Inventario descontrolado", s: "Stock unificado con alertas automáticas." },
    { icon: BarChart3, p: "Sin insights del negocio", s: "Asistente IA que responde con tus propios datos." },
    { icon: Workflow, p: "Procesos repetitivos", s: "Automatizaciones conectadas a tus herramientas." },
  ];
  return (
    <section className="border-y bg-secondary/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Lo que frena a tu PYME, NovaFlow lo resuelve</h2>
          <p className="mt-4 text-muted-foreground">Diseñado para quienes manejan demasiado con muy poco tiempo.</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card key={it.p} className="group border-border/60 p-6 transition-all hover:-translate-y-1 hover:shadow-elegant">
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
    { icon: CreditCard, t: "Finanzas y Cash Flow", d: "Ingresos, gastos, proyecciones y facturación." },
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
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Todo lo que necesitas, conectado</h2>
          <p className="mt-4 text-muted-foreground">Una plataforma. Diez módulos. Cero planillas.</p>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((f) => (
            <Card key={f.t} className="group border-border/60 p-5 transition-all hover:-translate-y-1 hover:shadow-elegant">
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
    { n: "Starter", p: "Gratis", f: ["1 negocio", "Hasta 50 productos", "Ventas e inventario", "1 usuario"], c: "" },
    { n: "Pro", p: "$29.990", per: "/mes", f: ["Negocios ilimitados", "Productos ilimitados", "IA + Cotizaciones", "Automatizaciones", "5 usuarios"], c: "Más popular", hi: true },
    { n: "Enterprise", p: "Personalizado", f: ["Soporte dedicado", "SLA y SAML SSO", "Integración a medida", "Usuarios ilimitados"], c: "" },
  ];
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Precios simples y transparentes</h2>
          <p className="mt-4 text-muted-foreground">Empieza gratis. Crece a tu ritmo.</p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.n} className={`relative p-8 transition-transform hover:-translate-y-1 ${p.hi ? "border-primary shadow-elegant md:scale-105" : "border-border/60"}`}>
              {p.c && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary">{p.c}</Badge>}
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
              <Link to="/auth" search={{ mode: "signup" }} className="mt-8 block">
                <Button className="w-full" variant={p.hi ? "default" : "outline"}>Empezar</Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    { n: "María Fernández", b: "Boutique Norte", q: "Pasé de tres planillas a una sola pantalla. Increíble.", r: 5 },
    { n: "Diego Pérez", b: "Café Lautaro", q: "El asistente IA me responde mejor que mi contador.", r: 5 },
    { n: "Camila Rojas", b: "Servicios CR Ltda.", q: "Cotizamos en 2 minutos lo que antes tomaba media hora.", r: 5 },
  ];
  return (
    <section className="border-y bg-secondary/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Negocios que ya confían en NovaFlow</h2>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {t.map((x) => (
            <Card key={x.n} className="border-border/60 p-6 transition-all hover:-translate-y-1 hover:shadow-elegant">
              <div className="flex gap-1">{Array.from({ length: x.r }).map((_, i) => <Star key={i} className="h-4 w-4 fill-warning text-warning" />)}</div>
              <p className="mt-4 text-sm leading-relaxed">"{x.q}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-primary" />
                <div>
                  <div className="text-sm font-semibold">{x.n}</div>
                  <div className="text-xs text-muted-foreground">{x.b}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const qs = [
    { q: "¿Mis datos están seguros?", a: "Sí. Usamos cifrado en tránsito y en reposo, aislamiento por negocio con Row-Level Security, y cumplimos con la Ley 19.628 de protección de datos personales en Chile." },
    { q: "¿Necesito tarjeta de crédito para empezar?", a: "No. El plan Starter es gratuito y los planes pagos incluyen 14 días de prueba sin tarjeta." },
    { q: "¿Puedo conectar Instagram y Facebook?", a: "Sí, mediante tu propia cuenta de Meta Business. Te guiamos en la conexión." },
    { q: "¿Funciona para mi rubro?", a: "Sí. NovaFlow está hecho para cualquier rubro: retail, servicios, manufactura, gastronomía, construcción, salud y más." },
    { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Sin contratos ni cargos por cancelación." },
  ];
  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Preguntas frecuentes</h2>
        </div>
        <Accordion type="single" collapsible className="mt-12">
          {qs.map((it) => (
            <AccordionItem key={it.q} value={it.q}>
              <AccordionTrigger className="text-left text-base font-medium">{it.q}</AccordionTrigger>
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
        <p className="mt-4 text-lg text-primary-foreground/80">Sin tarjeta. Sin contratos. Sin instalaciones.</p>
        <Link to="/auth" search={{ mode: "signup" }} className="mt-10 inline-block">
          <Button size="lg" variant="secondary" className="h-12 px-6 shadow-elegant transition-transform hover:scale-105">
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
              <span className="font-semibold">NovaFlow</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              La plataforma todo-en-uno para PYMEs en Chile y Latinoamérica.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Producto</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#features">Características</a></li>
              <li><a href="#pricing">Precios</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Empresa</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#">Sobre nosotros</a></li>
              <li><a href="#">Contacto</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy">Privacidad</Link></li>
              <li><Link to="/terms">Términos</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} NovaFlow. Hecho con <Zap className="inline h-3 w-3" /> en Chile.</p>
          <p className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> Datos protegidos · Ley 19.628</p>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <Problems />
        <HowItWorks />
        <Features />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
