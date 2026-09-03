import { useEffect } from "react";

type TimelineLike = { fromTo: (...args: unknown[]) => TimelineLike };
type GsapLike = {
  registerPlugin: (plugin: unknown) => void;
  context: (callback: () => void) => { revert: () => void };
  timeline: (vars?: Record<string, unknown>) => TimelineLike;
  fromTo: (targets: unknown, from: Record<string, unknown>, to: Record<string, unknown>) => void;
  to: (targets: unknown, vars: Record<string, unknown>) => void;
  set: (targets: unknown, vars: Record<string, unknown>) => void;
};
type WindowWithGsap = Window & { gsap?: GsapLike; ScrollTrigger?: object };

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function addCinematicAtmosphere() {
  const root = document.createElement("div");
  root.className = "nuva-cinema-atmosphere";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <div class="nuva-cinema-atmosphere__aurora"></div>
    <div class="nuva-cinema-atmosphere__grid"></div>
    <div class="nuva-cinema-atmosphere__orb nuva-cinema-atmosphere__orb--a"></div>
    <div class="nuva-cinema-atmosphere__orb nuva-cinema-atmosphere__orb--b"></div>
    <div class="nuva-cinema-atmosphere__wordmark">NÜVA</div>
    <div class="nuva-cinema-atmosphere__scan"></div>
  `;
  document.body.appendChild(root);
  return root;
}

/** Landing-only cinematic motion. GSAP is lazy-loaded; transactional routes never mount it. */
export function CinematicLandingEngine() {
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void Promise.all([
      loadScript("https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js", "nuva-gsap"),
      loadScript("https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js", "nuva-gsap-scrolltrigger"),
    ]).then(() => {
      if (cancelled) return;
      const win = window as WindowWithGsap;
      const gsap = win.gsap;
      const ScrollTrigger = win.ScrollTrigger;
      if (!gsap || !ScrollTrigger) return;
      gsap.registerPlugin(ScrollTrigger);

      const hero = document.querySelector("main > section:first-of-type") as HTMLElement | null;
      const preview = document.querySelector("#product-preview") as HTMLElement | null;
      const experience = document.querySelector("#experience") as HTMLElement | null;
      const intro = document.querySelector("#what-is-nuva") as HTMLElement | null;
      if (!hero) return;

      const atmosphere = addCinematicAtmosphere();
      const root = document.createElement("div");
      root.dataset.nuvaCinematicEngine = "true";
      root.setAttribute("aria-hidden", "true");
      root.innerHTML = `<div class="nuva-cinema-vignette"></div><div class="nuva-cinema-progress"><span></span></div><div class="nuva-cinema-beam"></div>`;
      document.body.appendChild(root);

      const heroContent = hero.querySelector(".mx-auto.max-w-4xl") as HTMLElement | null;
      const badge = heroContent?.querySelector("[class*=rounded-full]") as HTMLElement | null;
      const title = heroContent?.querySelector("h1") as HTMLElement | null;
      const copy = heroContent?.querySelector("p") as HTMLElement | null;
      const actions = heroContent?.querySelector("div.mt-9") as HTMLElement | null;
      const proof = heroContent?.querySelector("div.mt-6") as HTMLElement | null;
      const previewShell = preview?.querySelector(".mt-10") as HTMLElement | null;
      const heroVisuals = atmosphere.querySelectorAll<HTMLElement>(".nuva-cinema-atmosphere__orb");

      const ctx = gsap.context(() => {
        gsap.set(atmosphere, { opacity: 1 });
        gsap.set(hero, { perspective: 1400 });

        const introTl = gsap.timeline({ defaults: { ease: "power4.out" } });
        introTl
          .fromTo(badge, { y: 28, opacity: 0, filter: "blur(10px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.8 }, 0.05)
          .fromTo(title, { y: 70, opacity: 0, scale: 0.94, filter: "blur(14px)", rotateX: 5 }, { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", rotateX: 0, duration: 1.2 }, 0.12)
          .fromTo(copy, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85 }, 0.42)
          .fromTo(actions, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.55)
          .fromTo(proof, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.68)
          .fromTo(previewShell, { y: 100, opacity: 0, scale: 0.94, rotateX: 6 }, { y: 0, opacity: 1, scale: 1, rotateX: 0, duration: 1.4 }, 0.32)
          .fromTo(atmosphere.querySelector(".nuva-cinema-atmosphere__wordmark"), { opacity: 0, scale: 1.12, letterSpacing: "0.35em" }, { opacity: 0.055, scale: 1, letterSpacing: "0.08em", duration: 1.8 }, 0.1);

        if (previewShell) {
          gsap.to(previewShell, {
            y: -42, rotateX: 1.5, scale: 0.965,
            ease: "none",
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1.1 },
          });
        }

        gsap.to(atmosphere.querySelector(".nuva-cinema-atmosphere__wordmark"), {
          yPercent: -38, scale: 1.16, opacity: 0.075, ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1.4 },
        });
        gsap.to(heroContent, {
          yPercent: -10, opacity: 0.72, ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1.2 },
        });
        heroVisuals.forEach((orb, i) => {
          gsap.to(orb, {
            xPercent: i ? 28 : -22, yPercent: i ? -20 : 18, scale: i ? 1.2 : 0.82,
            ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1.6 },
          });
        });

        [intro, preview, experience].filter(Boolean).forEach((section) => {
          const targets = Array.from(section!.querySelectorAll("h2, h3, p, .rounded-2xl, .rounded-3xl"))
            .filter((node) => !node.closest("#product-preview .mt-10"))
            .slice(0, 24);
          if (!targets.length) return;
          gsap.fromTo(targets,
            { y: 44, opacity: 0, filter: "blur(5px)" },
            { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, stagger: 0.055, ease: "power3.out", scrollTrigger: { trigger: section, start: "top 78%", once: true } },
          );
        });

        if (experience) {
          gsap.to(experience, {
            backgroundPosition: "50% 35%", ease: "none",
            scrollTrigger: { trigger: experience, start: "top bottom", end: "bottom top", scrub: true },
          });
          const cards = Array.from(experience.querySelectorAll<HTMLElement>(".rounded-2xl, .rounded-3xl")).slice(0, 8);
          cards.forEach((card, i) => {
            gsap.fromTo(card,
              { y: 70 + (i % 3) * 18, rotateY: i % 2 ? 2 : -2, opacity: 0 },
              { y: 0, rotateY: 0, opacity: 1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 86%", end: "top 58%", scrub: 0.7 } },
            );
          });
        }

        const progress = root.querySelector(".nuva-cinema-progress span");
        if (progress) gsap.to(progress, { scaleX: 1, transformOrigin: "left center", ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.15 } });

        const onPointerMove = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          const x = event.clientX / window.innerWidth - 0.5;
          const y = event.clientY / window.innerHeight - 0.5;
          gsap.to(heroContent, { x: x * 9, y: y * 5, duration: 1.1, ease: "power3.out", overwrite: true });
          gsap.to(previewShell, { x: x * -15, y: y * -9, duration: 1.3, ease: "power3.out", overwrite: true });
          gsap.to(heroVisuals, { x: (i: number) => x * (i ? 26 : -18), y: (i: number) => y * (i ? 20 : -14), duration: 1.6, ease: "power3.out", overwrite: true });
          gsap.to(root.querySelector(".nuva-cinema-beam"), { x: x * 70, y: y * 35, duration: 1.5, ease: "power3.out", overwrite: true });
        };
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        cleanup = () => { window.removeEventListener("pointermove", onPointerMove); ctx.revert(); root.remove(); atmosphere.remove(); };
      });
    }).catch(() => undefined);

    return () => { cancelled = true; cleanup?.(); };
  }, []);

  return null;
}
