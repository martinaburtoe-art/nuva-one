import type { ReactNode } from "react";
import { ChevronDown, Info } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";

type ModuleInformationProps = {
  title: string;
  summary: string;
  purpose: string;
  includes: string[];
  data: string;
  actions: string[];
};

export function ModuleInformation({
  title,
  summary,
  purpose,
  includes,
  data,
  actions,
}: ModuleInformationProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="overflow-hidden border-border/70 bg-card/70">
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary">
          <Info className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              Guía
            </p>
            <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground sm:text-sm">
            {summary}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-[background-color,color,border-color] duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? "Ocultar" : "Cómo funciona"}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {open && (
        <div className="grid gap-2 border-t border-border/60 bg-muted/20 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
          <InfoSection title="Propósito">
            <p>{purpose}</p>
          </InfoSection>
          <InfoSection title="Incluye">
            <ul className="space-y-1.5">
              {includes.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </InfoSection>
          <InfoSection title="Datos">
            <p>{data}</p>
          </InfoSection>
          <InfoSection title="Acciones">
            <ul className="space-y-1.5">
              {actions.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </InfoSection>
        </div>
      )}
    </Card>
  );
}

function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/80 p-3 text-xs leading-5 text-muted-foreground">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/70">
        {title}
      </p>
      {children}
    </div>
  );
}
