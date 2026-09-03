import { useEffect, useRef, type ReactNode } from "react";

type CinematicRevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  y?: number;
};

/**
 * Lightweight motion primitive for non-critical product surfaces.
 * Uses the browser compositor and IntersectionObserver so the critical path
 * does not gain a runtime animation dependency. It also hard-respects
 * prefers-reduced-motion.
 */
export function CinematicReveal({
  children,
  className = "",
  delayMs = 0,
  y = 18,
}: CinematicRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      node.dataset.revealed = "true";
      return;
    }

    node.style.setProperty("--cinematic-y", `${y}px`);
    node.style.setProperty("--cinematic-delay", `${delayMs}ms`);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        node.dataset.revealed = "true";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [delayMs, y]);

  return (
    <div
      ref={ref}
      className={`cinematic-reveal ${className}`}
      data-revealed="false"
    >
      {children}
    </div>
  );
}

export function CinematicMotionStyles() {
  return (
    <style>{`
      .cinematic-reveal {
        opacity: 0;
        transform: translate3d(0, var(--cinematic-y, 18px), 0);
        transition:
          opacity 700ms cubic-bezier(.22,1,.36,1) var(--cinematic-delay, 0ms),
          transform 700ms cubic-bezier(.22,1,.36,1) var(--cinematic-delay, 0ms);
        will-change: opacity, transform;
      }
      .cinematic-reveal[data-revealed="true"] {
        opacity: 1;
        transform: translate3d(0, 0, 0);
        will-change: auto;
      }
      @media (prefers-reduced-motion: reduce) {
        .cinematic-reveal,
        .cinematic-reveal[data-revealed="true"] {
          opacity: 1;
          transform: none;
          transition: none;
          will-change: auto;
        }
      }
    `}</style>
  );
}
