import { useEffect, useRef, useState } from "react";
import { BookOpen, CircleHelp, LifeBuoy, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOPICS = [
  {
    title: "¿Cómo funciona el demo?",
    text: "Todo lo que ves usa datos ficticios. Puedes navegar, simular ventas y probar la IA sin modificar una cuenta real.",
  },
  {
    title: "¿Qué puedo probar?",
    text: "Explora Caja, Ventas, CRM, Facturación, Compras, Inventario, Envíos, Finanzas, Indicadores, Cotizaciones, IA y Comunidad.",
  },
  {
    title: "¿Qué es Control Financiero Inteligente?",
    text: "Nüva combina ingresos, egresos, caja e inventario para mostrar señales de liquidez, cobranza y margen que ayudan a decidir.",
  },
  {
    title: "¿Qué pasa cuando termino?",
    text: "Puedes crear tu cuenta y continuar con tu negocio real. El demo no transfiere ni modifica datos ficticios en tu cuenta.",
  },
];

export function DemoHelpCenter() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="fixed bottom-5 left-5 z-[75] gap-2 rounded-full border-primary/20 bg-background/95 shadow-lg backdrop-blur"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CircleHelp className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">Centro de ayuda</span>
        <span className="sm:hidden">Ayuda</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 p-4 backdrop-blur-[2px] sm:items-center" role="presentation">
          <button
            type="button"
            aria-label="Cerrar centro de ayuda"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-help-title"
            className="relative w-full max-w-lg rounded-2xl border bg-background p-5 shadow-2xl"
          >
            <button
              ref={closeRef}
              type="button"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3 pr-8">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary">Ayuda Nüva</p>
                <h2 id="demo-help-title" className="text-lg font-semibold">Centro de ayuda del demo</h2>
                <p className="mt-1 text-sm text-muted-foreground">Respuestas rápidas para aprovechar la experiencia.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2">
              {TOPICS.map((topic) => (
                <details key={topic.title} className="group rounded-xl border p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
                    <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                    <span className="flex-1">{topic.title}</span>
                    <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
                  </summary>
                  <p className="mt-2 pl-6 text-sm leading-6 text-muted-foreground">{topic.text}</p>
                </details>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
              <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
              Si quieres ver Nüva con datos reales, crea tu cuenta y configura tu negocio.
            </div>
          </section>
        </div>
      )}
    </>
  );
}
