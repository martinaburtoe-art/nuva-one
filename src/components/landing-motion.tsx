import { useEffect, useState, type CSSProperties } from "react";
import { MessageCircle, MoveUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function LandingMotion() {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState({ x: -100, y: -100, visible: false });
  const [cursorHover, setCursorHover] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    root.classList.add("nuva-landing-motion");

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0);
      document.querySelector("header")?.classList.toggle("nuva-nav-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const timer = window.setTimeout(() => setLoading(false), reduceMotion ? 120 : 650);

    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main section > div, main section article, main section [data-card], footer > div",
      ),
    );
    const textTargets = Array.from(
      document.querySelectorAll<HTMLElement>("main h1, main h2, main h3"),
    );
    const parallaxTargets = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main section img[data-parallax], main > section:first-child img",
      ),
    );

    if (reduceMotion) {
      revealTargets.forEach((el) => el.classList.add("nuva-revealed"));
      textTargets.forEach((el) => el.classList.add("nuva-text-revealed"));
    } else {
      revealTargets.forEach((el, index) => {
        el.classList.add("nuva-reveal");
        el.style.setProperty("--nuva-delay", `${Math.min(index % 5, 4) * 55}ms`);
      });
      textTargets.forEach((el, index) => {
        el.classList.add("nuva-text-reveal");
        el.style.setProperty("--nuva-delay", `${Math.min(index % 4, 3) * 70}ms`);
      });
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("nuva-revealed", "nuva-text-revealed");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -40px" },
      );
      [...revealTargets, ...textTargets].forEach((el) => observer.observe(el));

      let raf = 0;
      const parallax = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          parallaxTargets.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const offset = (window.innerHeight / 2 - (rect.top + rect.height / 2)) * 0.018;
            el.style.setProperty("--nuva-parallax", `${Math.max(-12, Math.min(12, offset))}px`);
          });
        });
      };
      window.addEventListener("scroll", parallax, { passive: true });
      parallax();

      const magneticTargets = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href="/demo"], a[href*="mode=signup"], a[href="/auth"] button, button.shadow-elegant',
        ),
      );
      const magnetic = magneticTargets.filter((el) => el.getBoundingClientRect().width > 80);
      const moveMagnetic = (event: MouseEvent) => {
        const el = event.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.08;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.08;
        el.style.setProperty("--mag-x", `${x}px`);
        el.style.setProperty("--mag-y", `${y}px`);
        el.classList.add("nuva-magnetic-active");
      };
      const leaveMagnetic = (event: MouseEvent) => {
        const el = event.currentTarget as HTMLElement;
        el.style.setProperty("--mag-x", "0px");
        el.style.setProperty("--mag-y", "0px");
        el.classList.remove("nuva-magnetic-active");
      };
      magnetic.forEach((el) => {
        el.addEventListener("mousemove", moveMagnetic);
        el.addEventListener("mouseleave", leaveMagnetic);
      });

      return () => {
        observer.disconnect();
        window.removeEventListener("scroll", parallax);
        cancelAnimationFrame(raf);
        magnetic.forEach((el) => {
          el.removeEventListener("mousemove", moveMagnetic);
          el.removeEventListener("mouseleave", leaveMagnetic);
        });
        window.removeEventListener("scroll", onScroll);
        window.clearTimeout(timer);
        root.classList.remove("nuva-landing-motion");
      };
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
      root.classList.remove("nuva-landing-motion");
    };
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!desktop || reduceMotion) return;
    const onMove = (event: MouseEvent) =>
      setCursor({ x: event.clientX, y: event.clientY, visible: true });
    const onLeave = () => setCursor((value) => ({ ...value, visible: false }));
    const updateHover = (event: MouseEvent) =>
      setCursorHover(
        Boolean(
          (event.target as HTMLElement | null)?.closest(
            "a, button, [role=button], input, textarea, select",
          ),
        ),
      );
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("mouseover", updateHover, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("mouseover", updateHover);
    };
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
        "a[href^='#']",
      );
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href === "#") return;
      const destination = document.querySelector(href);
      if (!destination) return;
      event.preventDefault();
      destination.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      <style>{`
        html.nuva-landing-motion { scroll-padding-top: 88px; }
        .nuva-motion-bg { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; opacity: .52; }
        .nuva-motion-bg::before, .nuva-motion-bg::after { content: ""; position: absolute; width: 42vw; height: 42vw; border-radius: 999px; filter: blur(70px); opacity: .16; animation: nuvaFloat 15s ease-in-out infinite alternate; }
        .nuva-motion-bg::before { top: -14vw; left: -10vw; background: var(--primary); }
        .nuva-motion-bg::after { right: -12vw; bottom: 8vw; background: var(--accent); animation-delay: -6s; }
        .nuva-motion-grid { position: absolute; inset: 0; background-image: linear-gradient(color-mix(in srgb, var(--border) 22%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border) 22%, transparent) 1px, transparent 1px); background-size: 48px 48px; mask-image: linear-gradient(to bottom, black, transparent 78%); opacity: .25; }
        .nuva-reveal { opacity: 0; transform: translate3d(0, 22px, 0); transition: opacity .72s cubic-bezier(.22,1,.36,1) var(--nuva-delay, 0ms), transform .72s cubic-bezier(.22,1,.36,1) var(--nuva-delay, 0ms); }
        .nuva-revealed { opacity: 1; transform: none; }
        .nuva-text-reveal { opacity: 0; clip-path: inset(0 0 100% 0); transform: translateY(14px); transition: opacity .72s ease var(--nuva-delay, 0ms), clip-path .85s cubic-bezier(.22,1,.36,1) var(--nuva-delay, 0ms), transform .85s cubic-bezier(.22,1,.36,1) var(--nuva-delay, 0ms); }
        .nuva-text-revealed { opacity: 1; clip-path: inset(0 0 0 0); transform: none; }
        [data-parallax], main > section:first-child img { transform: translate3d(0, var(--nuva-parallax, 0px), 0); will-change: transform; }
        .nuva-cursor { position: fixed; left: 0; top: 0; z-index: 9999; width: 18px; height: 18px; margin: -9px 0 0 -9px; border: 1px solid color-mix(in srgb, var(--foreground) 55%, transparent); border-radius: 999px; pointer-events: none; transform: translate3d(var(--cursor-x), var(--cursor-y), 0) scale(var(--cursor-scale)); transition: transform .16s ease; mix-blend-mode: difference; }
        .nuva-cursor-dot { position: fixed; left: 0; top: 0; z-index: 10000; width: 4px; height: 4px; margin: -2px 0 0 -2px; border-radius: 999px; background: var(--foreground); pointer-events: none; transform: translate3d(var(--cursor-x), var(--cursor-y), 0); }
        .nuva-nav-scrolled { box-shadow: 0 12px 34px color-mix(in srgb, var(--foreground) 7%, transparent); backdrop-filter: blur(20px); }
        .nuva-magnetic-active { transform: translate3d(var(--mag-x), var(--mag-y), 0) !important; transition: transform .08s linear, box-shadow .2s ease; }
        .nuva-floating-contact { animation: nuvaPulse 3s ease-in-out infinite; }
        @keyframes nuvaFloat { to { transform: translate3d(5vw, 3vw, 0) scale(1.08); } }
        @keyframes nuvaPulse { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes nuvaLoader { 0% { transform: translateX(-100%); } 50% { transform: translateX(100%); } 100% { transform: translateX(220%); } }
        @media (max-width: 767px) {
          .nuva-motion-bg::before, .nuva-motion-bg::after { width: 70vw; height: 70vw; filter: blur(48px); }
          .nuva-motion-grid { background-size: 36px 36px; }
          main > section:first-child .grid.grid-cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          header a[href="/auth"] { display: none; }
          .nuva-floating-contact { bottom: 5.5rem; right: 1rem; }
        }
        @media (min-width: 768px) { main > section:first-child .grid.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; } .nuva-reveal, .nuva-text-reveal { opacity: 1; clip-path: none; transform: none; } }
      `}</style>
      <div className="nuva-motion-bg" aria-hidden="true">
        <div className="nuva-motion-grid" />
      </div>
      <div
        className="fixed left-0 top-0 z-[10000] h-[2px] origin-left bg-primary shadow-[0_0_12px_var(--primary)]"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
      {loading && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-background/95 px-6 backdrop-blur-sm"
          aria-label="Cargando Nüva One"
        >
          <div className="flex w-full max-w-xs flex-col items-center gap-5">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-lg">
              <span className="absolute inset-1 rounded-xl border border-primary/30 animate-pulse" />
              <span className="text-xl font-black tracking-tight">N</span>
            </div>
            <div className="w-full">
              <div className="mb-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <span>Nüva One</span>
                <span>Iniciando</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-1/2 animate-[nuvaLoader_0.9s_ease-in-out_infinite] rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
      )}
      {cursor.visible && (
        <>
          <div
            className="nuva-cursor hidden md:block"
            style={
              {
                "--cursor-x": `${cursor.x}px`,
                "--cursor-y": `${cursor.y}px`,
                "--cursor-scale": cursorHover ? 1.8 : 1,
              } as CSSProperties
            }
          />
          <div
            className="nuva-cursor-dot hidden md:block"
            style={
              {
                "--cursor-x": `${cursor.x}px`,
                "--cursor-y": `${cursor.y}px`,
              } as CSSProperties
            }
          />
        </>
      )}
      <Link
        to="/demo"
        aria-label="Abrir demo de Nüva One"
        className="nuva-floating-contact fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-primary/20 bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xl transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Habla con Nüva</span>
        <MoveUpRight className="h-3.5 w-3.5 opacity-70" />
      </Link>
    </>
  );
}
