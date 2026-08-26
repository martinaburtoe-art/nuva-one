import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoWorkspace } from "@/components/demo/demo-workspace";
import { DemoStateProvider } from "@/lib/demo/demo-state";
import { trackDemoEvent } from "@/lib/demo/demo-analytics";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Explora Nüva One — Demo interactiva" },
      {
        name: "description",
        content:
          "Explora una experiencia completa de Nüva One con un negocio ficticio. Recorre módulos, indicadores, operación, finanzas, CRM e IA sin registro.",
      },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  return (
    <DemoStateProvider>
      <DemoExperience />
    </DemoStateProvider>
  );
}

function DemoExperience() {
  return (
    <div className="min-h-screen bg-background">
      <section className="border-b bg-card/95 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Demo completa</Badge>
                <span className="text-xs text-muted-foreground">Sin registro · datos ficticios · sin pagos</span>
              </div>
              <h1 className="mt-1 text-base font-semibold sm:text-lg">
                Entra a Nüva One y recorre cómo será usar la plataforma completa.
              </h1>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Esta experiencia reproduce la lógica visual del espacio de trabajo: menú lateral, barra superior y módulos conectados. Puedes navegar libremente, probar operaciones y ver cómo cambia el contexto.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link to="/">
              <Button variant="outline" size="sm">
                Volver a Nüva <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm" onClick={() => trackDemoEvent("cta_clicked", { location: "demo_top" })}>
                Crear mi cuenta <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <DemoWorkspace
        onExit={() => {
          window.location.assign("/");
        }}
      />

      <div className="border-t bg-secondary/20 px-4 py-5 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-2 sm:flex-row">
          <Eye className="h-4 w-4 text-primary" />
          <span>Has estado explorando una simulación segura. Las operaciones del demo no modifican cuentas, inventario, facturación, pagos ni datos reales.</span>
          <Link to="/auth" search={{ mode: "signup" }} className="font-semibold text-primary hover:underline">
            Ahora quiero usar Nüva One
          </Link>
        </div>
        <button
          className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => window.location.reload()}
        >
          <RotateCcw className="h-3 w-3" /> Reiniciar experiencia completa
        </button>
      </div>
    </div>
  );
}
