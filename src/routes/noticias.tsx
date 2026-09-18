import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Landmark, Newspaper, Search, Scale, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Noticias para Negocios — Nüva One" },
      { name: "description", content: "Actualidad económica, tributaria, regulatoria y empresarial para negocios y PyMEs chilenas, con fuentes oficiales y contexto práctico." },
    ],
  }),
  component: Noticias,
});

type NewsItem = {
  category: string;
  date: string;
  title: string;
  summary: string;
  detail: string;
  impact: string;
  href: string;
  source: string;
};

const NEWS: NewsItem[] = [
  {
    category: "Economía",
    date: "9 sep 2026",
    title: "Banco Central publica el IPoM de septiembre",
    summary: "El escenario central proyecta un crecimiento del PIB 2026 de 0,25%-0,75% y mantiene el foco en la evolución de la inflación y la demanda interna.",
    detail: "El informe reúne antecedentes de actividad, consumo, inversión, inflación y condiciones financieras. Es una referencia para contextualizar decisiones de presupuesto y caja.",
    impact: "Revisar precios, costos, inventario, inversión y liquidez bajo distintos escenarios de demanda.",
    href: "https://www.bcentral.cl/es/web/banco-central/contenido/-/details/prensa/nota-de-prensa/bcch-publica-ipom-septiembre-2026",
    source: "Banco Central de Chile",
  },
  {
    category: "PyMEs",
    date: "7 sep 2026",
    title: "Agenda ProPyme aborda trámites, financiamiento y liquidez",
    summary: "El Ministerio de Economía informó avances de una agenda orientada a desafíos de las MiPymes, incluyendo acceso al financiamiento y problemas de liquidez.",
    detail: "La instancia reúne al sector público y gremios para trabajar propuestas en materias tributarias, regulatorias e institucionales.",
    impact: "Seguir cambios que puedan modificar costos de cumplimiento, acceso a financiamiento o condiciones para operar.",
    href: "https://www.economia.gob.cl/2026/09/07/ministro-mas-compromete-avances-en-agenda-legislativa-para-fortalecer-a-las-mipymes.htm",
    source: "Ministerio de Economía",
  },
  {
    category: "Impuestos",
    date: "1 sep 2026",
    title: "Nueva Declaración Jurada N.º 1965 para contenido digital",
    summary: "El SII creó una nueva DJ anual para personas y empresas con domicilio o residencia en Chile que operan plataformas de contenido digital. Aplicará desde Operación Renta 2027.",
    detail: "La obligación alcanza a entidades que gestionen, administren o intermedien ingresos o contraprestaciones mediante sitios web, aplicaciones u otros medios digitales.",
    impact: "Si tu negocio participa en este tipo de actividad, revisar desde ahora registros, ingresos y documentación tributaria.",
    href: "https://www.sii.cl/noticias/2026/010926noti02pcr.htm",
    source: "Servicio de Impuestos Internos",
  },
  {
    category: "Empresas",
    date: "28 ago 2026",
    title: "Más de 140 mil empresas constituidas entre enero y julio",
    summary: "El Ministerio de Economía informó 140.412 constituciones acumuladas durante los primeros siete meses de 2026, el mayor nivel para ese período en la serie.",
    detail: "El 91,9% de las constituciones de julio utilizó el Registro de Empresas y Sociedades. Comercio y servicios aparecen entre los principales giros declarados.",
    impact: "Más empresas también significa más competencia, nuevos proveedores y potenciales clientes dentro del ecosistema empresarial.",
    href: "https://www.economia.gob.cl/2026/08/28/informe-de-creacion-de-empresas-y-cooperativas-julio-2026.htm",
    source: "Ministerio de Economía",
  },
  {
    category: "Innovación",
    date: "11 sep 2026",
    title: "Corfo impulsa soluciones de IA para agilizar patentes municipales",
    summary: "El Ministerio de Economía informó un programa de Bienes Públicos de Corfo orientado a desarrollar soluciones de inteligencia artificial para agilizar procesos de patentes municipales.",
    detail: "La iniciativa aborda un proceso relevante para la formalización y operación de negocios, utilizando tecnología para reducir fricciones administrativas.",
    impact: "La digitalización de trámites puede abrir oportunidades para proveedores tecnológicos y reducir costos de gestión empresarial.",
    href: "https://www.economia.gob.cl/2026/09/11/corfo-lanza-programa-de-bienes-publicos-para-el-desarrollo-de-soluciones-de-ia-que-agilicen-patentes-municipales.htm",
    source: "Ministerio de Economía",
  },
  {
    category: "Tributación",
    date: "15 sep 2026",
    title: "SII fortalece colaboración en materia tributaria",
    summary: "El SII informó un convenio con el Instituto Chileno de Derecho Tributario para desarrollar estudio, capacitación, investigación y educación continua.",
    detail: "La colaboración busca fortalecer el conocimiento técnico en Derecho Tributario y la formación continua.",
    impact: "Para decisiones tributarias, priorizar siempre la normativa y comunicaciones oficiales por sobre interpretaciones informales.",
    href: "https://www.sii.cl/noticias/2026/150926noti01srm.htm",
    source: "Servicio de Impuestos Internos",
  },
  {
    category: "Financiamiento",
    date: "7 sep 2026",
    title: "ProPyme pone el financiamiento y la liquidez en el centro",
    summary: "La agenda ProPyme incorpora acceso al financiamiento y liquidez entre los desafíos abordados junto a representantes de las MiPymes.",
    detail: "El foco permite seguir futuras medidas, instrumentos y cambios que puedan incidir en las condiciones financieras de pequeños y medianos negocios.",
    impact: "Revisar necesidades de capital de trabajo y mantener identificadas las alternativas de financiamiento disponibles.",
    href: "https://www.economia.gob.cl/2026/09/07/ministro-mas-compromete-avances-en-agenda-legislativa-para-fortalecer-a-las-mipymes.htm",
    source: "Ministerio de Economía",
  },
];

const SOURCES = [
  { name: "SII", category: "Impuestos", description: "Noticias tributarias, declaraciones, facturación y obligaciones.", href: "https://www.sii.cl/noticias/", icon: Scale },
  { name: "Banco Central", category: "Mercado", description: "Inflación, TPM, actividad, inversión y entorno financiero.", href: "https://www.bcentral.cl/", icon: TrendingUp },
  { name: "Ministerio de Economía", category: "Economía", description: "Medidas, programas y novedades para empresas.", href: "https://www.economia.gob.cl/", icon: Landmark },
  { name: "CORFO", category: "Innovación", description: "Programas, convocatorias y oportunidades de innovación.", href: "https://www.corfo.cl/", icon: Newspaper },
  { name: "SERCOTEC", category: "PyMEs", description: "Programas, capacitación y apoyo para emprendedores.", href: "https://www.sercotec.cl/", icon: Newspaper },
];

const CATEGORIES = ["Todas", "Economía", "PyMEs", "Impuestos", "Tributación", "Empresas", "Innovación", "Financiamiento"];

function Noticias() {
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredNews = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return NEWS.filter((item) => {
      const matchesCategory = activeCategory === "Todas" || item.category === activeCategory;
      const matchesSearch = !term || `${item.title} ${item.summary} ${item.detail} ${item.impact} ${item.source}`.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

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
            innovación y oportunidades que pueden impactar la operación de tu negocio.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Badge variant="outline">Actualizado: 18 sep 2026</Badge>
            <Badge variant="outline">Fuentes oficiales</Badge>
            <Badge variant="outline">Contexto para PyMEs</Badge>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3" aria-label="Contexto económico">
          <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Crecimiento 2026</p><p className="mt-2 text-3xl font-bold">0,25%-0,75%</p><p className="mt-1 text-sm text-muted-foreground">Rango central del IPoM de septiembre.</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Inflación</p><p className="mt-2 text-3xl font-bold">≈ 4%</p><p className="mt-1 text-sm text-muted-foreground">Entorno descrito por el Banco Central en septiembre.</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Empresas 2026</p><p className="mt-2 text-3xl font-bold">140.412</p><p className="mt-1 text-sm text-muted-foreground">Constituciones acumuladas entre enero y julio.</p></CardContent></Card>
        </section>

        <section className="mt-12 rounded-2xl border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-sm font-medium text-primary">Briefing ejecutivo</p><h2 className="mt-1 text-2xl font-bold">Lo que conviene mirar esta semana</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">No todas las noticias tienen el mismo impacto. Aquí las agrupamos por el tipo de decisión empresarial que pueden afectar.</p></div>
            <Link to="/dashboard"><Button variant="outline">Ver mi operación <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Briefing title="Caja y costos" text="El escenario macro importa para demanda, precios, inversión y planificación de liquidez." />
            <Briefing title="Cumplimiento" text="Las novedades tributarias deben contrastarse con la fuente oficial antes de actuar." />
            <Briefing title="Crecimiento" text="La creación de empresas, innovación y programas públicos pueden abrir nuevos mercados y oportunidades." />
          </div>
        </section>

        <section className="mt-14" aria-label="Más noticias que pueden importar a tu empresa">
          <div>
            <p className="text-sm font-medium text-primary">Actualidad verificada</p>
            <h2 className="mt-1 text-2xl font-bold">Más noticias que pueden importar a tu empresa</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Filtra por tema y revisa las novedades que pueden tener relación con tu operación.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar noticias, temas o fuentes..." aria-label="Buscar noticias" className="h-11 w-full rounded-full border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
            {(searchTerm || activeCategory !== "Todas") && <button type="button" onClick={() => { setSearchTerm(""); setActiveCategory("Todas"); }} className="h-11 rounded-full border px-4 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground">Limpiar filtros</button>}
          </div>

          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar noticias por categoría">
            {CATEGORIES.map((category) => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 ${active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-background text-muted-foreground"}`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <div className="mt-7 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredNews.length} {filteredNews.length === 1 ? "noticia encontrada" : "noticias encontradas"}
              {activeCategory !== "Todas" ? ` · ${activeCategory}` : ""}
            </p>
            {activeCategory !== "Todas" && (
              <button type="button" onClick={() => setActiveCategory("Todas")} className="text-sm font-medium text-primary hover:underline">
                Ver todas
              </button>
            )}
          </div>

          {filteredNews.length > 0 ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredNews.map((item) => <NewsCard key={item.title} item={item} />)}
            </div>
          ) : (
            <Card className="mt-5"><CardContent className="p-8 text-center"><p className="font-semibold">No hay noticias en esta categoría todavía.</p><p className="mt-2 text-sm text-muted-foreground">Vuelve a “Todas” para revisar la cobertura disponible.</p></CardContent></Card>
          )}
        </section>

        <section className="mt-14" aria-label="Cómo leer las noticias">
          <div><p className="text-sm font-medium text-primary">Lectura empresarial</p><h2 className="mt-1 text-2xl font-bold">De la noticia a la decisión</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Cada noticia puede mirarse desde cuatro dimensiones operativas antes de tomar una decisión.</p></div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Lens number="01" title="Ventas" text="¿Puede cambiar la demanda, los precios o el comportamiento del cliente?" />
            <Lens number="02" title="Caja" text="¿Afecta costos, financiamiento, pagos o necesidades de liquidez?" />
            <Lens number="03" title="Operación" text="¿Cambia procesos, inventario, proveedores o cumplimiento?" />
            <Lens number="04" title="Estrategia" text="¿Aparece una oportunidad, riesgo o nuevo escenario competitivo?" />
          </div>
        </section>

        <section className="mt-14">
          <div><p className="text-sm font-medium text-primary">Fuentes que importan</p><h2 className="mt-1 text-2xl font-bold">Un punto de entrada a la información oficial</h2></div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">{SOURCES.map(({ name, category, description, href, icon: Icon }) => <Card key={name}><CardContent className="p-5"><Icon className="h-5 w-5 text-primary" /><Badge variant="outline" className="mt-4">{category}</Badge><h3 className="mt-3 font-semibold">{name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><a href={href} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-medium">Visitar fuente <ExternalLink className="ml-2 h-4 w-4" /></a></CardContent></Card>)}</div>
        </section>

        <section className="mt-14 rounded-2xl border bg-card p-7 sm:p-9">
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
  return <Card className="h-full transition-shadow hover:shadow-elegant"><CardContent className="flex h-full flex-col p-6"><div className="flex items-center justify-between gap-3"><Badge variant="outline">{item.category}</Badge><span className="text-xs text-muted-foreground">{item.date}</span></div><h3 className="mt-4 text-xl font-semibold leading-tight">{item.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.summary}</p><div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide">En detalle</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p></div><div className="mt-4 border-l-2 border-primary/50 pl-4"><p className="text-xs font-semibold uppercase tracking-wide">Para tu negocio</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.impact}</p></div><a href={item.href} target="_blank" rel="noreferrer" className="mt-auto pt-5 inline-flex items-center text-sm font-medium text-primary">Leer en {item.source} <ExternalLink className="ml-2 h-4 w-4" /></a></CardContent></Card>;
}

function Briefing({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border p-5"><p className="font-semibold">{title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>;
}

function Lens({ number, title, text }: { number: string; title: string; text: string }) {
  return <Card><CardContent className="p-5"><span className="text-xs font-semibold text-primary">{number}</span><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></CardContent></Card>;
}
