import React from 'react';

export type FloatingActionPillarProps = {
  onAiClick: () => void;
  onInfoClick: () => void;
  aiLabel?: string;
  infoLabel?: string;
};

/**
 * Persistent contextual actions kept inside the fixed top navigation area.
 * They no longer float over page content, so they cannot cover essential controls.
 */
export function FloatingActionPillar({
  onAiClick,
  onInfoClick,
  aiLabel = 'Nüva IA',
  infoLabel = 'Información Módulo',
}: FloatingActionPillarProps) {
  return (
    <aside
      aria-label="Acciones de Nüva"
      className="fixed right-0 top-0 z-[60] flex h-14 items-center gap-2 rounded-bl-2xl border-b border-l border-border/60 bg-background/90 px-3 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 sm:px-4"
    >
      <button
        type="button"
        aria-label={aiLabel}
        title={aiLabel}
        onClick={onAiClick}
        className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm transition-all duration-200 hover:scale-105 hover:bg-primary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95"
      >
        <span aria-hidden="true" className="text-lg leading-none">✦</span>
      </button>

      <button
        type="button"
        aria-label={infoLabel}
        title={infoLabel}
        onClick={onInfoClick}
        className="group inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 text-foreground shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
      >
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-xs font-bold text-primary"
        >
          i
        </span>
        <span className="whitespace-nowrap text-xs font-medium">{infoLabel}</span>
      </button>
    </aside>
  );
}

export default FloatingActionPillar;
