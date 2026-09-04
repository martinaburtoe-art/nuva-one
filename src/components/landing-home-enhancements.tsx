import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Boxes, Check, MessageSquare, Sparkles, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const pillars = [
  { value: "1", label: "panel de control", detail: "Una vista para entender tu negocio." },
  { value: "10+", label: "módulos conectados", detail: "Operación, clientes, inventario y finanzas." },
  { value: "IA", label: "con contexto real", detail: "Respuestas basadas en los datos de tu empresa." },
  { value: "24/7", label: "visión disponible", detail: "Consulta indicadores cuando los necesites." },
];

const workflow = [
  { icon: Boxes, title: "Capturas", text: "Ventas, productos, gastos y movimientos quedan registrados." },
  { icon: BarChart3, title: "Entiendes", text: "Nüva Score e indicadores convierten datos en señales." },
  { icon: Sparkles, title: "Preguntas", text: "La IA explica qué está pasando y qué mirar." },
  { icon: Workflow, title: "Actúas", text: "Cotizas, compras y automatizas desde el mismo lugar." },
];

export function LandingValueSystem() {
  return (
    <section className="border-y bg-background py-16 sm:py-20" aria-labelledby="value-system-title">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-10">
          <div className="min-w-0">
            <Badge variant="secondary" className="mb-4">El sistema detrás del negocio</Badge>
            <h2 id="value-system-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
              No necesitas más información. Necesitas una mejor vista.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Nüva One conecta la operación diaria con indicadores y decisiones. Menos tiempo buscando datos; más tiempo haciendo crecer el negocio.
            </p>
            <Link to="/demo" className="mt-6 inline-block">
              <Button>Ver cómo se conecta <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
            </Link>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
            {pillars.map((item) => (
              <Card key={item.label} className="min-w-0 border-border/60 p-4">
                <div className="text-2xl font-bold tracking-tight">{item.value}</div>
                <div className="mt-1 break-words text-xs font-semibold">{item.label}</div>
                <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">{item.detail}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingWorkflow() {
  return (
    <section className="border-y bg-secondary/20 py-16 sm:py-20" aria-labelledby="workflow-title">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">De dato a decisión</Badge>
          <h2 id="workflow-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            El valor aparece cuando todo conversa entre sí.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Una venta alimenta tus indicadores. El stock cambia. La IA lo interpreta. Tú decides qué hacer.
          </p>
        </div>
        <div className="relative mt-10 grid min-w-0 gap-4 md:mt-12 md:grid-cols-4">
          <div className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-border md:block" />
          {workflow.map((item, index) => (
            <Card key={item.title} className="relative z-10 min-w-0 border-border/60 bg-card p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium text-muted-foreground">0{index + 1}</div>
                  <h3 className="font-semibold">{item.title}</h3>
                </div>
              </div>
              <p className="mt-4 break-words text-sm leading-6 text-muted-foreground">{item.text}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex min-w-0 flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 gap-3">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="font-semibold">Y si no sabes qué significa un indicador, pregúntale a Nüva.</div>
              <p className="mt-1 text-sm text-muted-foreground">La IA está pensada para explicar el negocio, no solo mostrar números.</p>
            </div>
          </div>
          <Link to="/demo" className="shrink-0">
            <Button variant="outline">Probar la experiencia <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          {["Sin tarjeta para probar", "Datos aislados por negocio", "Diseñado para PYMEs", "Hecho en Chile"].map((text) => (
            <span key={text} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 shrink-0 text-success" />{text}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
