import { useEffect } from "react";

type Gsap = any;
type Win = Window & { gsap?: Gsap; ScrollTrigger?: any };

const load = (src: string, id: string) =>
  new Promise<void>((resolve, reject) => {
    const old = document.getElementById(id) as HTMLScriptElement | null;
    if (old) {
      if (old.dataset.loaded === "true") resolve();
      else old.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.onload = () => {
      s.dataset.loaded = "true";
      resolve();
    };
    s.onerror = () => reject(new Error(src));
    document.head.appendChild(s);
  });

function injectArtDirection() {
  const id = "nuva-webloved-art-direction";
  if (document.getElementById(id)) return () => {};
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    .nuva-art-stage{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:clip;isolation:isolate}
    .nuva-art-stage__dots{position:absolute;left:0;right:0;top:15%;height:1px;opacity:.45;background-image:radial-gradient(circle,hsl(var(--foreground)/.42) 1px,transparent 1.5px);background-size:9px 1px;mask-image:linear-gradient(90deg,transparent,black 12%,black 88%,transparent)}
    .nuva-art-stage__dots--bottom{top:auto;bottom:14%;opacity:.25}
    .nuva-art-stage__index{position:absolute;left:clamp(1rem,4vw,4rem);top:11%;font:600 8px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.2em;color:hsl(var(--foreground)/.38)}
    .nuva-art-stage__index b{color:hsl(var(--primary));font-weight:700}
    .nuva-art-stage__word{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);font:900 clamp(8rem,25vw,28rem)/.72 system-ui,sans-serif;letter-spacing:-.09em;white-space:nowrap;user-select:none;opacity:.08;background:linear-gradient(180deg,hsl(var(--primary)/.95),hsl(var(--primary)/.08));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 18px 45px hsl(var(--primary)/.12))}
    .nuva-art-stage__tag{position:absolute;right:clamp(1rem,4vw,4rem);top:11%;padding:.55rem .75rem;border:1px solid hsl(var(--foreground)/.14);border-radius:999px;background:hsl(var(--background)/.42);backdrop-filter:blur(12px);font:600 8px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;color:hsl(var(--foreground)/.42)}
    .nuva-art-stage__stamp{position:absolute;left:clamp(1rem,4vw,4rem);bottom:8%;display:flex;align-items:center;gap:.65rem;font:600 8px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.17em;color:hsl(var(--foreground)/.35)}
    .nuva-art-stage__stamp strong{font:900 clamp(1.3rem,2.4vw,2.4rem)/1 system-ui,sans-serif;letter-spacing:-.05em;color:hsl(var(--foreground)/.72)}
    .nuva-art-stage__cross{position:absolute;width:18px;height:18px;opacity:.22}
    .nuva-art-stage__cross:before,.nuva-art-stage__cross:after{content:"";position:absolute;background:hsl(var(--foreground)/.55)}
    .nuva-art-stage__cross:before{left:50%;top:0;width:1px;height:100%}.nuva-art-stage__cross:after{left:0;top:50%;width:100%;height:1px}
    .nuva-art-stage__cross--a{right:9%;top:31%}.nuva-art-stage__cross--b{left:7%;top:64%}
    .nuva-art-stage__field{position:absolute;right:5%;top:53%;width:min(46vw,650px);aspect-ratio:1;transform:translateY(-50%);transform-style:preserve-3d;will-change:transform;z-index:2}
    .nuva-art-stage__orbit{position:absolute;inset:2%;border:1px solid hsl(var(--primary)/.28);border-radius:50%;transform-style:preserve-3d;box-shadow:0 0 70px hsl(var(--primary)/.08),inset 0 0 50px hsl(var(--primary)/.035)}
    .nuva-art-stage__orbit--a{transform:rotateX(67deg) rotateZ(12deg)}.nuva-art-stage__orbit--b{inset:13%;transform:rotateY(65deg) rotateZ(-28deg);border-color:hsl(205 95% 70%/.26)}.nuva-art-stage__orbit--c{inset:25%;transform:rotateX(72deg) rotateZ(44deg);border-color:hsl(270 90% 75%/.2)}
    .nuva-art-stage__core{position:absolute;left:50%;top:50%;width:clamp(82px,8vw,126px);aspect-ratio:1;transform:translate(-50%,-50%);display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle at 35% 25%,hsl(var(--primary)/1),hsl(var(--primary)/.2) 43%,transparent 72%);border:1px solid hsl(var(--primary)/.58);box-shadow:0 0 45px hsl(var(--primary)/.55),0 0 150px hsl(var(--primary)/.22)}
    .nuva-art-stage__core span{font:900 clamp(1.9rem,3.6vw,3.7rem)/1 system-ui,sans-serif;color:white;text-shadow:0 0 26px hsl(var(--primary)/.9)}
    .nuva-art-stage__node{position:absolute;padding:.5rem .65rem;border:1px solid hsl(var(--foreground)/.16);border-radius:999px;background:hsl(var(--background)/.62);backdrop-filter:blur(10px);font:600 8px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;color:hsl(var(--foreground)/.58);white-space:nowrap}
    .nuva-art-stage__node b{color:hsl(var(--primary));font-weight:700;margin-left:.35rem}.nuva-art-stage__node--a{left:0;top:27%}.nuva-art-stage__node--b{right:-1%;top:18%}.nuva-art-stage__node--c{right:1%;bottom:20%}.nuva-art-stage__node--d{left:3%;bottom:14%}
    @media(max-width:900px){.nuva-art-stage__field{right:50%;top:34%;width:min(88vw,560px);transform:translate(50%,-50%);opacity:.62}.nuva-art-stage__word{top:32%;font-size:clamp(6rem,27vw,15rem);opacity:.065}.nuva-art-stage__index{top:9%}.nuva-art-stage__tag{top:9%}.nuva-art-stage__dots{top:18%}.nuva-art-stage__dots--bottom{bottom:9%}.nuva-art-stage__stamp{bottom:4%}}
    @media(prefers-reduced-motion:reduce){.nuva-art-stage__word{filter:none}.nuva-art-stage__field{transform:translateY(-50%)}}
  `;
  document.head.appendChild(style);
  return () => style.remove();
}

function stage(hero: HTMLElement) {
  const el = document.createElement("div");
  el.className = "nuva-art-stage";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <div class="nuva-art-stage__dots"></div><div class="nuva-art-stage__dots nuva-art-stage__dots--bottom"></div>
    <div class="nuva-art-stage__index"><b>01</b> / NÜVA ONE — BUSINESS INTELLIGENCE</div>
    <div class="nuva-art-stage__tag">DATA → INTELLIGENCE → ACTION</div>
    <div class="nuva-art-stage__word">NÜVA</div>
    <div class="nuva-art-stage__cross nuva-art-stage__cross--a"></div><div class="nuva-art-stage__cross nuva-art-stage__cross--b"></div>
    <div class="nuva-art-stage__field">
      <div class="nuva-art-stage__orbit nuva-art-stage__orbit--a"></div><div class="nuva-art-stage__orbit nuva-art-stage__orbit--b"></div><div class="nuva-art-stage__orbit nuva-art-stage__orbit--c"></div>
      <div class="nuva-art-stage__core"><span>N</span></div>
      <span class="nuva-art-stage__node nuva-art-stage__node--a">DATA <b>01</b></span><span class="nuva-art-stage__node nuva-art-stage__node--b">CONTEXT <b>02</b></span><span class="nuva-art-stage__node nuva-art-stage__node--c">DECISION <b>03</b></span><span class="nuva-art-stage__node nuva-art-stage__node--d">ACTION <b>04</b></span>
    </div>
    <div class="nuva-art-stage__stamp"><span>THE BUSINESS OPERATING SYSTEM</span><strong>ONE / SYSTEM</strong></div>
  `;
  hero.prepend(el);
  return el;
}

export function CinematicLandingEngine() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hero = document.querySelector("main > section:first-of-type") as HTMLElement | null;
    if (!hero) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const removeStyles = injectArtDirection();
    hero.classList.add("nuva-cinematic-hero");
    const visual = stage(hero);
    let cancelled = false;
    let revert: (() => void) | undefined;
    const finish = () => hero.classList.add("nuva-cinematic-hero--ready");
    if (reduced) {
      finish();
      return () => { visual.remove(); removeStyles(); hero.classList.remove("nuva-cinematic-hero", "nuva-cinematic-hero--ready"); };
    }
    void Promise.all([
      load("https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js", "nuva-gsap"),
      load("https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js", "nuva-gsap-scrolltrigger"),
    ]).then(() => {
      if (cancelled) return;
      const w = window as Win, gsap = w.gsap, ST = w.ScrollTrigger;
      if (!gsap || !ST) { finish(); return; }
      gsap.registerPlugin(ST);
      const content = hero.querySelector(".mx-auto.max-w-4xl") as HTMLElement | null;
      const badge = content?.querySelector("[class*=rounded-full]"), title = content?.querySelector("h1"), copy = content?.querySelector("p"), actions = content?.querySelector("div.mt-9"), proof = content?.querySelector("div.mt-6");
      const preview = document.querySelector("#product-preview") as HTMLElement | null;
      const shell = preview?.querySelector(".mt-10") as HTMLElement | null;
      const field = visual.querySelector(".nuva-art-stage__field"), core = visual.querySelector(".nuva-art-stage__core"), orbits = visual.querySelectorAll(".nuva-art-stage__orbit"), nodes = visual.querySelectorAll(".nuva-art-stage__node"), word = visual.querySelector(".nuva-art-stage__word"), stamp = visual.querySelector(".nuva-art-stage__stamp");
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power4.out" }, onComplete: finish });
        tl.fromTo(visual.querySelector(".nuva-art-stage__index"), { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: .6 })
          .fromTo(visual.querySelector(".nuva-art-stage__tag"), { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: .6 }, .08)
          .fromTo(word, { opacity: 0, scale: 1.12, filter: "blur(18px)" }, { opacity: .08, scale: 1, filter: "blur(0)", duration: 1.35 }, .05)
          .fromTo(field, { opacity: 0, scale: .62, rotate: -12 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.25 }, .12)
          .fromTo(orbits, { opacity: 0, scale: .5 }, { opacity: 1, scale: 1, duration: 1, stagger: .08 }, .2)
          .fromTo(core, { opacity: 0, scale: .2 }, { opacity: 1, scale: 1, duration: .95, ease: "back.out(1.8)" }, .35)
          .fromTo(nodes, { opacity: 0, scale: .7, y: 14 }, { opacity: 1, scale: 1, y: 0, duration: .65, stagger: .08 }, .55)
          .fromTo(stamp, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .55 }, .72)
          .fromTo(badge, { y: 22, opacity: 0, filter: "blur(8px)" }, { y: 0, opacity: 1, filter: "blur(0)", duration: .7 }, .32)
          .fromTo(title, { y: 60, opacity: 0, scale: .96, filter: "blur(12px)" }, { y: 0, opacity: 1, scale: 1, filter: "blur(0)", duration: 1.05 }, .4)
          .fromTo(copy, { y: 25, opacity: 0 }, { y: 0, opacity: 1, duration: .7 }, .66)
          .fromTo(actions, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .6 }, .74)
          .fromTo(proof, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .5 }, .82)
          .fromTo(shell, { y: 75, opacity: 0, scale: .91, rotateX: 7 }, { y: 0, opacity: 1, scale: 1, rotateX: 0, duration: 1.2 }, .48);
        gsap.to(orbits[0], { rotate: 360, duration: 22, repeat: -1, ease: "none" });
        gsap.to(orbits[1], { rotate: -360, duration: 30, repeat: -1, ease: "none" });
        gsap.to(orbits[2], { rotate: 360, duration: 42, repeat: -1, ease: "none" });
        gsap.to(core, { scale: 1.06, duration: 2.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.to(word, { yPercent: -28, scale: 1.14, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1.2 } });
        gsap.to(field, { y: -30, rotate: 3, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1.2 } });
        gsap.to(content, { yPercent: -9, opacity: .72, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1.1 } });
        if (shell) gsap.to(shell, { y: -52, rotateX: 1.5, scale: .96, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1.1 } });
        const onMove = (e: PointerEvent) => { if (e.pointerType !== "mouse") return; const x = e.clientX / window.innerWidth - .5, y = e.clientY / window.innerHeight - .5; gsap.to(field, { x: x * 28, y: y * 17, duration: 1.1, ease: "power3.out", overwrite: true }); gsap.to(content, { x: x * 8, y: y * 4, duration: 1, ease: "power3.out", overwrite: true }); gsap.to(shell, { x: x * -18, y: y * -8, duration: 1.2, ease: "power3.out", overwrite: true }); };
        window.addEventListener("pointermove", onMove, { passive: true });
        revert = () => { window.removeEventListener("pointermove", onMove); ctx.revert(); };
      });
    }).catch(finish);
    return () => { cancelled = true; revert?.(); visual.remove(); removeStyles(); hero.classList.remove("nuva-cinematic-hero", "nuva-cinematic-hero--ready"); };
  }, []);
  return null;
}
