import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackDemoEvent } from "@/lib/demo/demo-analytics";

export type DemoStep = {
  title: string;
  description: string;
  target: string;
};

export const DEMO_STEPS: DemoStep[] = [
  {
    title: "1. Tu negocio, en un vistazo",
    description: "Parte con una visión clara de ingresos, gastos, ventas y stock.",
    target: "overview",
  },
  {
    title: "2. Nüva Score",
    description: "Convierte tus datos en una lectura simple de la salud del negocio.",
    target: "score",
  },
  {
    title: "3. Explícame mi negocio",
    description: "Obtén una explicación accionable sin revisar planillas una por una.",
    target: "explain",
  },
  {
    title: "4. Inventario inteligente",
    description: "Detecta quiebres de stock y prioriza qué reponer.",
    target: "inventory",
  },
  {
    title: "5. Recomendación",
    description: "Nüva conecta señales para sugerirte una acción concreta.",
    target: "recommendation",
  },
  {
    title: "6. Una venta mueve todo",
    description: "Simula una venta y observa cómo cambian stock, ingresos y finanzas.",
    target: "sale",
  },
  {
    title: "7. Finanzas y CRM conectados",
    description: "La venta queda reflejada en tus métricas y en la relación con clientes.",
    target: "finance",
  },
  {
    title: "8. Pregúntale a la IA",
    description:
      "Consulta el negocio en lenguaje natural. Esta demo usa IA simulada, sin consumir cuota.",
    target: "ai",
  },
  {
    title: "9. Tu siguiente paso",
    description:
      "Cuando el valor queda claro, puedes crear tu cuenta y comenzar con tus propios datos.",
    target: "cta",
  },
];

type Spotlight = { top: number; left: number; width: number; height: number } | null;

export function GuidedTour({
  step,
  onStep,
  onClose,
}: {
  step: number;
  onStep: (next: number) => void;
  onClose: () => void;
}) {
  const current = DEMO_STEPS[step];
  const [spotlight, setSpotlight] = useState<Spotlight>(null);

  useEffect(() => {
    trackDemoEvent("tour_step", { step: step + 1, target: current.target });
    const element = document.querySelector<HTMLElement>(`[data-demo="${current.target}"]`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    const update = () => {
      if (!element) return setSpotlight(null);
      const rect = element.getBoundingClientRect();
      setSpotlight({
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [step, current.target]);

  return (
    <>
      {spotlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[65] rounded-2xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.38)] transition-all duration-300"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}
      <div
        className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-xl rounded-2xl border bg-card/95 p-5 shadow-2xl backdrop-blur-xl"
        role="dialog"
        aria-label="Tour guiado de Nüva One"
        aria-modal="false"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
              Tour guiado · {step + 1}/{DEMO_STEPS.length}
            </div>
            <h2 className="text-lg font-semibold">{current.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {current.description}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar tour">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1" aria-label={`Paso ${step + 1} de ${DEMO_STEPS.length}`}>
            {DEMO_STEPS.map((item, index) => (
              <span
                key={item.target}
                className={`h-1.5 w-5 rounded-full ${index === step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={step === 0}
              onClick={() => onStep(step - 1)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Atrás
            </Button>
            <Button
              size="sm"
              onClick={() => (step === DEMO_STEPS.length - 1 ? onClose() : onStep(step + 1))}
            >
              {step === DEMO_STEPS.length - 1 ? "Explorar libremente" : "Siguiente"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
