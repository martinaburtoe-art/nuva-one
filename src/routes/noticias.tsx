import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Landmark, Newspaper, Scale, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Noticias para Negocios — Nüva One" },
      { name: "description", content: "Actualidad económica, tributaria y empresarial para negocios y PyMEs chilenas, con fuentes oficiales y contexto práctico." },
    ],
  }),
  component: Noticias,
});

type NewsItem = {
  category: string;
  date: string;
  title: string;
  summary: string;
  impact: string;
  href: string;
  source: string;
};

const NEWS: NewsItem[] = [
  {
    category: "Economía",
    date: "9 sep 2026",
    title: "Banco Central publica el IPoM de septiembre",
    summary: "El escenario central reduce la proyección de crecimiento del PIB 2026 a 0,25%-0,75%. El informe también aborda inflación, demanda interna, inversión y condiciones financieras.",
    impact: "Para tu negocio: revisar precios, costos, inversión y caja con un escenario de crecimiento más débil durante 2026.",
    href: "https://www.bcentral.cl/es/web/banco-central/contenido/-/details/prensa/nota-de-prensa/bcch-publica-ipom-septiembre-2026",
    source: "Banco Central de Chile",
  },
  {
    category: "Impuestos",
    date: "1 sep 2026",
    title: "Nueva Declaración Jurada N.º 1965 para contenido digital",
    summary: "El SII creó una nueva DJ anual para personas y empresas con domicilio o residencia en Chile que operan plataformas de contenido digital. Aplicará desde Operación Renta 2027.",
    impact: "Para tu negocio: si generas o intermedias ingresos por contenido digital, conviene revisar desde ahora las obligaciones y registros necesarios.",
    href: "https://www.sii.cl/noticias/2026/010926noti02pcr.htm",
    source: "Servicio de Impuestos Internos",
  },
  {
    category: "Tributación",
    date: "15 sep 2026",
    title: "SII fortalece colaboración en materia tributaria",
    summary: "El SII informó un convenio con el Instituto Chileno de Derecho Tributario para desarrollar estudio, capacitación, investigación y educación continua.",
    impact: "Para tu negocio: mantener una fuente tributaria oficial y actualizada ayuda a interpretar cambios antes de tomar decisiones administrativas.",
    href: "https://www.sii.cl/noticias/2026/150926noti01srm.htm",
    source: "Servicio de Impuestos Internos",
  },
];

const SOURCES = [
  { name: "SII", category: "Impuestos", description: "Noticias tributarias, declaraciones, facturación y obligaciones.", href: "https://www.sii.cl/noticias/", icon: Scale },
  { name: "Banco Central", category: "Mercado", description: "Inflación, TPM, actividad, inversión y entorno financiero.", href: "https://www.bcentral.cl/", icon: TrendingUp },
  { name: "Ministerio de Economía", category: "Economía", description: "Medidas, programas y políticas públicas para empresas.", href: "https://www.economia.gob.cl/", icon: Landmark },
  { name: "CORFO", category: "Oportunidades", description: "Innovación, convocatorias y programas de apoyo empresarial.", href: "https://www.corfo.cl/", icon: Newspaper },
  { name: "SERCOTEC", category: "PyMEs", description: "Programas, capacitación y apoyo para emprendedores y PyMEs.", href: "https://www.sercotec.cl/", icon: Newspaper },
];

function Noticias() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-semibold tracking-tight">Nüva One</Link>
          <div className="flex items-center gap-2">
            <Link to="/foro"><Button variant="ghost" size="sm">Comunidad</Button></Link>
            <Link to="/negocios"><Button variant="outline" size="sm">Red de negocios</Button></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
        <section className="max-w-4xl">
          <Badge variant="secondary">Noticias para Negocios · Chile</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
            Entiende lo que está pasando. <span className="text-primary">Decide con contexto.</span>
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            Un centro de actualidad empresarial para seguir economía, impuestos, regulación, financiamiento,
            oportunidades y cambios que pueden impactar la operación de tu negocio.
          </p>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3" aria-label="Contexto económico">
          <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Crecimiento 2026</p><p className="mt-2 text-3xl font-bold">0,25%-0,75%</p><p className="mt-1 text-sm text-muted-foreground">Rango central proyectado por el Banco Central.</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Inflación anual</p><p className="mt-2 text-3xl font-bold">≈ 4%</p><p className="mt-1 text-sm text-muted-foreground">IPC observado en los últimos meses según IPoM septiembre.</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Meta inflación</p><p className="mt-2 text-3xl font-bold">3%</p><p className="mt-1 text-sm text-muted-foreground">Convergencia proyectada hacia el 2.º trimestre de 2027.</p></CardContent></Card>
        </section>

        <div className="mt-12 flex flex-wrap gap-2" aria-label="Categorías de noticias">
          {["Todas", "Economía", "Impuestos", "Tributación", "Financiamiento", "PyMEs", "Oportunidades"].map((item, index) => (
            <Badge key={item} variant={index === 0 ? "default" : "outline"} className="px-4 py-2">{item}</Badge>
          ))}
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]" aria-label="Noticias destacadas">
          <Card className="overflow-hidden border-primary/20">
            <CardHeader className="bg-primary/5 p-7">
              <div className="flex items-center justify-between gap-4">
                <Badge>Destacada · Economía</Badge><span className="text-xs text-muted-foreground">9 sep 2026</span>
              </div>
              <CardTitle className="mt-4 text-2xl sm:text-3xl">IPoM septiembre 2026: menor crecimiento esperado y foco en inflación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-7">
              <p className="leading-7 text-muted-foreground">{NEWS[0].summary}</p>
              <div className="rounded-xl border bg-muted/30 p-5"><p className="text-sm font-semibold">Qué significa para un negocio</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{NEWS[0].impact}</p></div>
              <a href={NEWS[0].href} target="_blank" rel="noreferrer"><Button>Leer fuente oficial <ExternalLink className="ml-2 h-4 w-4" /></Button></a>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            {NEWS.slice(1).map((item) => <NewsCard key={item.title} item={item} />)}
          </div>
        </section>

        <section className="mt-12" aria-label="Últimas noticias">
          <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">Actualidad verificada</p><h2 className="mt-1 text-2xl font-bold">Más información para seguir tu negocio</h2></div><span className="text-sm text-muted-foreground">Fuentes oficiales</span></div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Economía", "Revisa el escenario macro y cómo puede afectar demanda, costos e inversión.", "https://www.bcentral.cl/"],
              ["Impuestos", "Consulta novedades tributarias directamente desde el SII.", "https://www.sii.cl/noticias/"],
              ["Oportunidades", "Explora programas y convocatorias para empresas e innovación.", "https://www.corfo.cl/"],
            ].map(([title, text, href]) => (
              <Card key={title} className="transition-shadow hover:shadow-elegant"><CardContent className="p-6"><Badge variant="outline">{title}</Badge><p className="mt-4 text-sm leading-6 text-muted-foreground">{text}</p><a href={href} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center text-sm font-medium text-primary">Explorar fuente <ArrowRight className="ml-2 h-4 w-4" /></a></CardContent></Card>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">Fuentes que importan</p><h2 className="mt-1 text-2xl font-bold">Un punto de entrada a la información oficial</h2></div></div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {SOURCES.map(({ name, category, description, href, icon: Icon }) => <Card key={name}><CardContent className="p-5"><Icon className="h-5 w-5 text-primary" /><Badge variant="outline" className="mt-4">{category}</Badge><h3 className="mt-3 font-semibold">{name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><a href={href} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-medium">Visitar fuente <ExternalLink className="ml-2 h-4 w-4" /></a></CardContent></Card>)}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border bg-card p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium text-primary">De la información a la acción</p><h2 className="mt-1 text-xl font-semibold">Conecta las noticias con la realidad de tu negocio.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Después de revisar una novedad, vuelve a Nüva One para analizar ventas, caja, inventario, clientes y resultados con el contexto de tu propia operación.</p></div>
            <Link to="/dashboard"><Button>Ir al dashboard <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return <Card><CardContent className="p-6"><div className="flex items-center justify-between gap-3"><Badge variant="outline">{item.category}</Badge><span className="text-xs text-muted-foreground">{item.date}</span></div><h3 className="mt-4 text-xl font-semibold leading-tight">{item.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.summary}</p><div className="mt-4 border-l-2 border-primary/50 pl-4"><p className="text-xs font-semibold uppercase tracking-wide">Para tu negocio</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.impact}</p></div><a href={item.href} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center text-sm font-medium text-primary">Leer en {item.source} <ExternalLink className="ml-2 h-4 w-4" /></a></CardContent></Card>;
}
