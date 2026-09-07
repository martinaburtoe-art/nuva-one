import { Info } from "lucide-react";
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

export function ModuleInformation({ title, summary, purpose, includes, data, actions }: ModuleInformationProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="overflow-hidden border-primary/15 bg-primary/[0.025]">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Info className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">Información del módulo</p>
              <h2 className="mt-0.5 text-base font-semibold">{title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {open ? "Ocultar información" : "Ver cómo funciona"}
            </button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
        </div>
      </div>

      {open && (
        <div className="grid gap-4 border-t p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <InfoSection title="¿Para qué sirve?">
            <p>{purpose}</p>
          </InfoSection>
          <InfoSection title="¿Qué incluye?">
            <ul className="space-y-1.5">
              {includes.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </InfoSection>
          <InfoSection title="¿De dónde sale la información?">
            <p>{data}</p>
          </InfoSection>
          <InfoSection title="¿Qué puedo hacer aquí?">
            <ul className="space-y-1.5">
              {actions.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </InfoSection>
        </div>
      )}
    </Card>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-background p-3 text-xs leading-5 text-muted-foreground">
      <p className="mb-1 font-semibold text-foreground">{title}</p>
      {children}
    </div>
  );
}
