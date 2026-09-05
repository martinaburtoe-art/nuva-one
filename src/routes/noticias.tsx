import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Landmark, Newspaper, Scale, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Noticias y actualidad PyME — Nüva One" },
      {
        name: "description",
        content:
          "Centro de actualidad para PyMEs chilenas: economía, impuestos, financiamiento, regulación y oportunidades empresariales.",
      },
    ],
  }),
  component: Noticias,
});

type Source = {
  name: string;
  description: string;
  category: string;
  href: string;
  icon: typeof Newspaper;
};

const SOURCES: Source[] = [
  {
    name: "SII — Noticias y novedades",
    description: "Cambios tributarios, facturación electrónica, declaraciones y obligaciones para empresas.",
    category: "Impuestos",
    href: "https://www.sii.cl/noticias/",
    icon: Scale,
  },
  {
    name: "Ministerio de Economía",
    description: "Medidas, programas y novedades públicas que afectan a empresas y emprendedores en Chile.",
    category: "Economía",
    href: "https://www.economia.gob.cl/",
    icon: Landmark,
  },
  {
    name: "Banco Central de Chile",
    description: "Inflación, tasas, actividad económica y publicaciones que ayudan a interpretar el entorno empresarial.",
    category: "Mercado",
    href: "https://www.bcentral.cl/",
    icon: TrendingUp,
  },
  {
    name: "CORFO",
    description: "Convocatorias, innovación, financiamiento y programas de apoyo para empresas chilenas.",
    category: "Oportunidades",
    href: "https://www.corfo.cl/",
    icon: Newspaper,
  },
];

function Noticias() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-semibold tracking-tight">
            Nüva One
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/foro">
              <Button variant="ghost" size="sm">Comunidad</Button>
            </Link>
            <Link to="/negocios">
              <Button variant="outline" size="sm">Red de negocios</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="max-w-3xl">
          <Badge variant="secondary">Actualidad PyME Chile</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Noticias que pueden cambiar tu negocio.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Un centro de actualidad sin titulares inventados: Nüva One reúne accesos directos a fuentes
            oficiales para que puedas revisar impuestos, economía, financiamiento y regulación desde un
            mismo lugar.
          </p>
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-2" aria-label="Fuentes de actualidad">
          {SOURCES.map((source) => {
            const Icon = source.icon;
            return (
              <Card key={source.name} className="group transition-shadow hover:shadow-elegant">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <Badge variant="outline" className="mb-1 text-[10px]">{source.category}</Badge>
                        <CardTitle className="text-lg">{source.name}</CardTitle>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{source.description}</p>
                  <a href={source.href} target="_blank" rel="noreferrer" className="mt-5 inline-flex">
                    <Button variant="outline" size="sm">Ver fuente oficial</Button>
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="mt-10 rounded-2xl border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Conecta la actualidad con tu operación</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Después de revisar una novedad, vuelve a Nüva One para analizar ventas, finanzas,
                inventario y decisiones con el contexto de tu negocio.
              </p>
            </div>
            <Link to="/dashboard">
              <Button>Ir al dashboard</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
