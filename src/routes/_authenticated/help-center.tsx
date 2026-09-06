import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Bot, ChevronRight, CircleHelp, FileText, LifeBuoy, MessageCircle, Search, ShieldCheck, Sparkles, Wrench, Zap } from "lucide-react";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/help-center")({
  head: () => ({ meta: [{ title: "Centro de ayuda — Nüva One" }] }),
  component: HelpCenter,
});

type HelpItem = { title: string; description: string; category: string; href?: string };

const items: HelpItem[] = [
  { title: "Primeros pasos", description: "Configura tu negocio y empieza a trabajar con Nüva One.", category: "Comenzar", href: "/dashboard" },
  { title: "Ventas y POS", description: "Registra ventas, revisa operaciones y entiende tus resultados.", category: "Operaciones", href: "/sales" },
  { title: "Inventario", description: "Productos, stock, reposición, compras y control de movimientos.", category: "Operaciones", href: "/inventory" },
  { title: "Finanzas", description: "Tesorería, cuentas, contabilidad, costos y control financiero.", category: "Finanzas", href: "/finance-professional" },
  { title: "Nüva Intelligence", description: "Aprende a interpretar alertas, señales y recomendaciones.", category: "Inteligencia", href: "/ai" },
  { title: "Centro Ejecutivo", description: "Convierte información del negocio en decisiones y acciones.", category: "Inteligencia", href: "/executive-command-center" },
  { title: "Clientes y CRM", description: "Gestiona clientes, seguimiento y oportunidades comerciales.", category: "Clientes", href: "/crm" },
  { title: "Conexiones", description: "Conoce cómo conectar y mantener tus fuentes de información.", category: "Configuración", href: "/conexiones" },
  { title: "Privacidad y seguridad", description: "Protección de datos, permisos y acceso por negocio.", category: "Seguridad" },
  { title: "Suscripción y facturación", description: "Planes, límites, pagos y administración de la cuenta.", category: "Cuenta", href: "/billing" },
];

const categories = ["Todo", "Comenzar", "Operaciones", "Finanzas", "Inteligencia", "Clientes", "Configuración", "Seguridad", "Cuenta"];

function HelpCenter() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todo");
  const [open, setOpen] = useState<HelpItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => (category === "Todo" || item.category === category) && (!q || `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(q)));
  }, [query, category]);

  if (open) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setOpen(null)}>← Volver al Centro de ayuda</Button>
        <Card className="overflow-hidden p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><BookOpen className="h-6 w-6" /></span>
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{open.category}</p><h1 className="mt-1 text-2xl font-bold">{open.title}</h1><p className="mt-2 text-sm text-muted-foreground">{open.description}</p></div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <HelpStep n="01" title="Entiende" text="Revisa qué hace esta área y qué información necesita." />
            <HelpStep n="02" title="Configura" text="Completa los datos esenciales antes de tomar decisiones." />
            <HelpStep n="03" title="Actúa" text="Usa las recomendaciones y vuelve a revisar el resultado." />
          </div>
          {open.href && <Link to={open.href} className="mt-8 inline-flex"><Button>Ir a {open.title}<ChevronRight className="ml-1 h-4 w-4" /></Button></Link>}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader title="Centro de ayuda" description="Aprende, resuelve y vuelve a trabajar. Todo lo que necesitas para sacar más provecho de Nüva One." />

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.09] via-background to-accent/30 p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Sparkles className="h-4 w-4" /> Ayuda inteligente</div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">¿Qué necesitas resolver?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Busca por tarea, módulo o problema. Nüva te lleva directamente al lugar correcto.</p>
          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej.: cómo controlar el stock, registrar una venta, revisar mis finanzas..." className="h-14 w-full rounded-2xl border bg-background pl-12 pr-4 text-sm shadow-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => <Button key={c} variant={category === c ? "default" : "outline"} size="sm" className="shrink-0 rounded-full" onClick={() => setCategory(c)}>{c}</Button>)}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => <button key={item.title} type="button" onClick={() => setOpen(item)} className="text-left"><Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:bg-muted/30 hover:shadow-md"><div className="flex items-start justify-between gap-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-primary"><HelpIcon category={item.category} /></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></div><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.category}</p><h3 className="mt-1 font-semibold">{item.title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p><p className="mt-4 text-xs font-semibold text-primary">Abrir ayuda →</p></Card></button>)}
      </div>

      {filtered.length === 0 && <Card className="p-10 text-center"><CircleHelp className="mx-auto h-8 w-8 text-muted-foreground" /><h3 className="mt-3 font-semibold">No encontramos esa ayuda</h3><p className="mt-1 text-sm text-muted-foreground">Prueba con otra palabra o cambia la categoría.</p></Card>}

      <div className="grid gap-4 md:grid-cols-3">
        <SupportCard icon={<Bot className="h-5 w-5" />} title="Pregunta a Nüva" text="Describe tu problema y obtén orientación contextual." href="/ai" />
        <SupportCard icon={<MessageCircle className="h-5 w-5" />} title="Necesito soporte" text="Cuando la documentación no sea suficiente, pide ayuda." />
        <SupportCard icon={<ShieldCheck className="h-5 w-5" />} title="Seguridad primero" text="Tus datos están separados por negocio y protegidos por permisos." />
      </div>

      <Card className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Zap className="h-5 w-5" /></span><div><h3 className="font-semibold">Atajos útiles</h3><p className="text-xs text-muted-foreground">Aprende más rápido: usa el buscador del Centro de ayuda antes de salir del flujo.</p></div></div><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded-lg border px-3 py-2">⌘ / Ctrl + K · Buscar</span><span className="rounded-lg border px-3 py-2">Esc · Cerrar</span></div></div></Card>
    </div>
  );
}

function HelpIcon({ category }: { category: string }) { return category === "Finanzas" ? <FileText className="h-5 w-5" /> : category === "Inteligencia" ? <Sparkles className="h-5 w-5" /> : category === "Operaciones" ? <Wrench className="h-5 w-5" /> : category === "Seguridad" ? <ShieldCheck className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />; }
function HelpStep({ n, title, text }: { n: string; title: string; text: string }) { return <div className="rounded-2xl border bg-muted/20 p-4"><p className="text-xs font-bold text-primary">{n}</p><p className="mt-2 font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>; }
function SupportCard({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href?: string }) { const content = <Card className="h-full p-5 transition-colors hover:bg-muted/30"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p><p className="mt-4 text-xs font-semibold text-primary">{href ? "Abrir →" : "Disponible en soporte →"}</p></Card>; return href ? <Link to={href}>{content}</Link> : content; }
