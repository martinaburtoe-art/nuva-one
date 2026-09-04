import { Activity, ArrowUpRight } from "lucide-react";

export function PymeNewsRadar() {
  return (
    <section
      aria-label="Radar PYME"
      className="rounded-3xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Activity className="h-4 w-4" />
            Radar PYME
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Señales que pueden mover tu negocio.
          </h2>
        </div>
        <ArrowUpRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Nüva conecta la operación diaria con señales relevantes para que detectes oportunidades
        antes y conviertas información en acciones concretas.
      </p>
    </section>
  );
}
