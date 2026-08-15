import { ArrowRight, Brain, CircleAlert, Sparkles } from "lucide-react";

type Insight = {
  title: string;
  description: string;
  recommendation: string;
  tone?: "warning" | "positive" | "neutral";
};

export function NovaIntelligencePanel({
  insight,
  onAction,
  onAskAI,
}: {
  insight?: Insight;
  onAction?: () => void;
  onAskAI?: () => void;
}) {
  const current = insight ?? {
    title: "Nüva está listo para encontrar tu primera señal",
    description:
      "A medida que registres ventas, gastos e inventario, Nüva conectará esos datos para detectar lo que merece tu atención.",
    recommendation: "Registra algunos datos para activar Intelligence.",
    tone: "neutral" as const,
  };

  const warning = current.tone === "warning";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-300">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500/10">
              <Brain className="h-4 w-4" />
            </span>
            Nüva Intelligence
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              {warning ? <CircleAlert className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              Nüva encontró algo que deberías saber
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-3xl">
              {current.title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {current.description}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recomendación de Nüva</p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{current.recommendation}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          >
            Ver análisis <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onAskAI}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            Preguntar a Nüva IA
          </button>
        </div>
      </div>
    </section>
  );
}
