import * as React from "react";

export type NuvaInfoProps = {
  title: string;
  description: string;
  details?: string;
  example?: string;
  className?: string;
  label?: string;
};

export function NuvaInfo({
  title,
  description,
  details,
  example,
  className = "",
  label = "Más información",
}: NuvaInfoProps) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-cyan-200/60 bg-cyan-50 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200"
      >
        i
      </button>
      {open ? (
        <div
          id={id}
          role="dialog"
          aria-label={title}
          className="absolute right-0 top-8 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
          {details ? <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{details}</p> : null}
          {example ? (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <span className="font-semibold">Ejemplo:</span> {example}
            </div>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}
