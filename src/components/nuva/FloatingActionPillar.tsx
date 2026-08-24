import React from 'react';

export type FloatingActionPillarProps = {
  onAiClick: () => void;
  onInfoClick: () => void;
  aiLabel?: string;
  infoLabel?: string;
};

/**
 * Shared visual primitive for the two persistent contextual actions.
 * IA stays above module information, forming one vertical floating pillar.
 */
export function FloatingActionPillar({
  onAiClick,
  onInfoClick,
  aiLabel = 'Nüva IA',
  infoLabel = 'Información Módulo',
}: FloatingActionPillarProps) {
  return (
    <aside
      aria-label="Acciones flotantes de Nüva"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-3 sm:right-5"
    >
      <button
        type="button"
        aria-label={aiLabel}
        title={aiLabel}
        onClick={onAiClick}
        className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-950/90 text-white shadow-lg shadow-black/20 backdrop-blur-xl transition-transform duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-95"
      >
        <span aria-hidden="true" className="text-lg leading-none">✦</span>
      </button>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          aria-label={infoLabel}
          title={infoLabel}
          onClick={onInfoClick}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/90 text-slate-900 shadow-lg shadow-black/10 backdrop-blur-xl transition-transform duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-95"
        >
          <span aria-hidden="true" className="text-base font-semibold">i</span>
        </button>
        <span className="max-w-[9rem] text-center text-[11px] font-medium leading-tight text-slate-700 drop-shadow-sm dark:text-slate-200">
          {infoLabel}
        </span>
      </div>
    </aside>
  );
}

export default FloatingActionPillar;
