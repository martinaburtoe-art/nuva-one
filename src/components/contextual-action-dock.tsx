import { useEffect, useState } from "react";
import { Loader2, Save, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type ContextualActionDockProps = {
  formId: string;
  primaryLabel: string;
  primaryPendingLabel?: string;
  primaryPending?: boolean;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  secondaryPendingLabel?: string;
  secondaryPending?: boolean;
  secondaryDisabled?: boolean;
  onSecondaryAction?: () => void;
};

type DockMode = "expanded" | "compact" | "hidden";

function isEditable(target: Element | null): boolean {
  return Boolean(target?.matches("input, textarea, select, [contenteditable='true'], [role='combobox']"));
}

/**
 * Estribo: a workflow-local mobile action dock. It retracts while the user
 * edits/focuses a field or scrolls down, expands on upward intent, and stays
 * above the global mobile navigation safe area.
 */
export function ContextualActionDock({
  formId,
  primaryLabel,
  primaryPendingLabel = "Guardando…",
  primaryPending = false,
  primaryDisabled = false,
  secondaryLabel = "Acción rápida",
  secondaryPendingLabel = "Procesando…",
  secondaryPending = false,
  secondaryDisabled = false,
  onSecondaryAction,
}: ContextualActionDockProps) {
  const [mode, setMode] = useState<DockMode>("expanded");

  useEffect(() => {
    let previousScroll = window.scrollY;

    const onScroll = (event: Event) => {
      const target = event.target;
      const scrollTop = target instanceof HTMLElement
        ? target.scrollTop
        : window.scrollY;
      const delta = scrollTop - previousScroll;
      if (delta > 5) setMode("compact");
      else if (delta < -5) setMode("expanded");
      previousScroll = scrollTop;
    };

    const onFocusIn = (event: FocusEvent) => {
      if (isEditable(event.target as Element | null)) setMode("hidden");
    };

    const restoreWhenKeyboardCloses = () => {
      const viewport = window.visualViewport;
      const keyboardOpen = Boolean(viewport && window.innerHeight - viewport.height > 120);
      if (keyboardOpen || isEditable(document.activeElement)) {
        setMode("hidden");
      } else {
        setMode("expanded");
      }
    };

    const onFocusOut = () => queueMicrotask(restoreWhenKeyboardCloses);
    const onViewportResize = () => {
      const viewport = window.visualViewport;
      if (viewport && window.innerHeight - viewport.height > 120) setMode("hidden");
      else if (!isEditable(document.activeElement)) setMode("expanded");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onViewportResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
    };
  }, []);

  if (mode === "hidden") return null;

  const compact = mode === "compact";
  return (
    <div
      data-testid="contextual-action-dock"
      data-mode={mode}
      className={cn(
        "fixed inset-x-3 z-[70] flex items-center gap-2 rounded-2xl border border-border/80 bg-background/95 p-2 shadow-[0_12px_40px_-12px_hsl(var(--foreground)/.28)] backdrop-blur-xl transition-[transform,opacity,padding] duration-200 motion-reduce:transition-none lg:hidden",
        "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]",
        compact ? "mx-auto w-fit max-w-[calc(100vw-1.5rem)]" : "mx-auto max-w-xl",
      )}
    >
      <button
        type="submit"
        form={formId}
        disabled={primaryDisabled || primaryPending}
        aria-label={primaryPending ? primaryPendingLabel : primaryLabel}
        aria-busy={primaryPending}
        className={cn(
          "flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-[transform,background-color] duration-150 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60",
          compact ? "min-w-12 px-3" : "min-w-0 flex-1",
        )}
      >
        {primaryPending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
        {!compact && <span>{primaryPending ? primaryPendingLabel : primaryLabel}</span>}
      </button>
      {onSecondaryAction && (
        <button
          type="button"
          onClick={onSecondaryAction}
          disabled={secondaryDisabled || secondaryPending || primaryPending}
          aria-label={secondaryPending ? secondaryPendingLabel : secondaryLabel}
          aria-busy={secondaryPending}
          className={cn(
            "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-[transform,background-color] duration-150 active:scale-[.98] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60",
            compact ? "min-w-12 px-3" : "min-w-0 flex-1",
          )}
        >
          {secondaryPending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Zap className="h-4 w-4" aria-hidden="true" />}
          {!compact && <span>{secondaryPending ? secondaryPendingLabel : secondaryLabel}</span>}
        </button>
      )}
    </div>
  );
}
