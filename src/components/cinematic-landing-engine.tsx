import { useEffect } from "react";

/**
 * Premium landing-only motion layer.
 * GSAP is loaded lazily so transactional routes do not pay the animation cost.
 * All transforms are compositor-friendly and the entire system exits for reduced motion.
 */
export function CinematicLandingEngine() {
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([gsapModule, scrollModule]) => {
      if (cancelled) return;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const hero = document.querySelector("main > section:first-of-type") as HTMLElement | null;
      const preview = document.querySelector("#product-preview") as HTMLElement | null;
      const experience = document.querySelector("#experience") as HTMLElement | null;
      const intro = document.querySelector("#what-is-nuva") as HTMLElement | null;
      if (!hero) return;

      const root = document.createElement("div");
      root.dataset.nuvaCinematicEngine = "true";
      root.setAttribute("aria-hidden", "true");
      root.innerHTML = `
        <div class="nuva-cinema-vignette"></div>
        <div class="nuva-cinema-progress"><span></span></div>
        <div class="nuva-cinema-beam"></div>
      `;
      document.body.appendChild(root);

      const heroContent = hero.querySelector(".mx-auto.max-w-4xl") as HTMLElement | null;
      const badge = heroContent?.querySelector("[class*=rounded-full]") as HTMLElement | null;
      const title = heroContent?.querySelector("h1") as HTMLElement | null;
      const copy = heroContent?.querySelector("p") as HTMLElement | null;
      const actions = heroContent?.querySelector("div.mt-9") as HTMLElement | null;
      const proof = heroContent?.querySelector("div.mt-6") as HTMLElement | null;
      const previewShell = preview?.querySelector(".mt-10") as HTMLElement | null;

      const ctx = gsap.context(() => {
        gsap.set([badge, title, copy, actions, proof, previewShell].filter(Boolean), {
          willChange: "transform, opacity",
        });

        const introTl = gsap.timeline({ defaults: { ease: "power4.out" } });
        introTl
          .fromTo(badge, { y: 28, opacity: 0, filter: "blur(10px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.8 }, 0.05)
          .fromTo(title, { y: 70, opacity: 0, scale: 0.97, filter: "blur(12px)" }, { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.15 }, 0.12)
          .fromTo(copy, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85 }, 0.42)
          .fromTo(actions, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.55)
          .fromTo(proof, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.68)
          .fromTo(previewShell, { y: 90, opacity: 0, scale: 0.965, rotateX: 3 }, { y: 0, opacity: 1, scale: 1, rotateX: 0, duration: 1.35 }, 0.35);

        if (previewShell) {
          gsap.to(previewShell, {
            y: -34,
            rotateX: 1.2,
            scale: 0.985,
            ease: "none",
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1.2 },
          });
        }

        [intro, preview, experience].filter(Boolean).forEach((section) => {
          const targets = Array.from(section!.querySelectorAll("h2, h3, p, .rounded-2xl, .rounded-3xl"))
            .filter((node) => !node.closest("#product-preview .mt-10"))
            .slice(0, 24);
          if (!targets.length) return;
          gsap.fromTo(targets, { y: 38, opacity: 0 }, {
            y: 0,
            opacity: 1,
            duration: 0.85,
            stagger: 0.045,
            ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 78%", once: true },
          });
        });

        if (experience) {
          gsap.to(experience, {
            backgroundPosition: "50% 35%",
            ease: "none",
            scrollTrigger: { trigger: experience, start: "top bottom", end: "bottom top", scrub: true },
          });
        }

        const progress = root.querySelector(".nuva-cinema-progress span");
        if (progress) {
          gsap.to(progress, {
            scaleX: 1,
            transformOrigin: "left center",
            ease: "none",
            scrollTrigger: { start: 0, end: "max", scrub: 0.15 },
          });
        }

        const onPointerMove = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          const x = event.clientX / window.innerWidth - 0.5;
          const y = event.clientY / window.innerHeight - 0.5;
          gsap.to(heroContent, { x: x * 8, y: y * 5, duration: 1.2, ease: "power3.out", overwrite: true });
          gsap.to(previewShell, { x: x * -12, y: y * -8, duration: 1.4, ease: "power3.out", overwrite: true });
          gsap.to(root.querySelector(".nuva-cinema-beam"), { x: x * 70, y: y * 35, duration: 1.5, ease: "power3.out", overwrite: true });
        };
        window.addEventListener("pointermove", onPointerMove, { passive: true });

        cleanup = () => {
          window.removeEventListener("pointermove", onPointerMove);
          ctx.revert();
          root.remove();
        };
      });
    }).catch(() => {
      // Motion is progressive enhancement: the landing remains fully usable without GSAP.
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
