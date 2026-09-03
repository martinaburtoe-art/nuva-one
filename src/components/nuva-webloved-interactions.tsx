import { useEffect } from "react";

const LANDING_SECTIONS = [
  ["what-is-nuva", "Información"],
  ["ecosystem", "Plataforma"],
  ["intelligence", "Inteligencia"],
  ["how", "Proceso"],
  ["pricing", "Precios"],
  ["faq", "FAQ"],
] as const;

export function NuvaWebLovedInteractions() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const landing = window.location.pathname === "/";
    const cleanups: Array<() => void> = [];

    root.classList.add("nuva-webloved-runtime");

    const progress = document.createElement("div");
    progress.className = "nuva-scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.appendChild(progress);
    const updateProgress = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / max))})`;
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
    cleanups.push(() => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      progress.remove();
    });

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.nuvaRevealed = "true";
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );
    const reveal = () => {
      document
        .querySelectorAll<HTMLElement>("main section:not([data-nuva-reveal-ready]), main h2:not([data-nuva-reveal-ready]), main [data-nuva-reveal]")
        .forEach((node) => {
          node.dataset.nuvaRevealReady = "true";
          if (reduced) node.dataset.nuvaRevealed = "true";
          else observer.observe(node);
        });
    };
    reveal();
    const mutation = new MutationObserver(reveal);
    mutation.observe(document.body, { childList: true, subtree: true });
    cleanups.push(() => { observer.disconnect(); mutation.disconnect(); });

    if (landing) {
      const nav = document.createElement("nav");
      nav.className = "nuva-editorial-nav";
      nav.setAttribute("aria-label", "Navegación de Nüva One");
      nav.innerHTML = LANDING_SECTIONS.map(([id, label], i) =>
        `<a href="#${id}" data-section="${id}"><i>${String(i + 1).padStart(2, "0")}</i><span>${label}</span></a>`,
      ).join("");
      document.body.appendChild(nav);

      const menu = document.createElement("button");
      menu.className = "nuva-mobile-menu";
      menu.type = "button";
      menu.setAttribute("aria-label", "Abrir navegación");
      menu.setAttribute("aria-expanded", "false");
      menu.innerHTML = "<span></span><span></span>";
      document.body.appendChild(menu);

      const mobilePanel = document.createElement("div");
      mobilePanel.className = "nuva-mobile-panel";
      mobilePanel.setAttribute("aria-hidden", "true");
      mobilePanel.innerHTML = LANDING_SECTIONS.map(([id, label], i) =>
        `<a href="#${id}"><b>${String(i + 1).padStart(2, "0")}</b>${label}</a>`,
      ).join("");
      document.body.appendChild(mobilePanel);

      const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
      const onAnchor = (event: Event) => {
        const link = event.currentTarget as HTMLAnchorElement;
        const id = link.getAttribute("href")?.slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        if (mobilePanel.classList.contains("is-open")) closeMenu();
      };
      const closeMenu = () => {
        mobilePanel.classList.remove("is-open");
        mobilePanel.setAttribute("aria-hidden", "true");
        menu.classList.remove("is-open");
        menu.setAttribute("aria-expanded", "false");
      };
      const toggleMenu = () => {
        const open = !mobilePanel.classList.contains("is-open");
        mobilePanel.classList.toggle("is-open", open);
        mobilePanel.setAttribute("aria-hidden", String(!open));
        menu.classList.toggle("is-open", open);
        menu.setAttribute("aria-expanded", String(open));
      };
      anchors.forEach((link) => link.addEventListener("click", onAnchor));
      menu.addEventListener("click", toggleMenu);

      const sectionObserver = new IntersectionObserver(
        (entries) => entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = (entry.target as HTMLElement).id;
          nav.querySelectorAll("a").forEach((a) => a.classList.toggle("is-active", a.dataset.section === id));
        }),
        { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
      );
      LANDING_SECTIONS.forEach(([id]) => {
        const section = document.getElementById(id);
        if (section) sectionObserver.observe(section);
      });

      cleanups.push(() => {
        anchors.forEach((link) => link.removeEventListener("click", onAnchor));
        menu.removeEventListener("click", toggleMenu);
        sectionObserver.disconnect();
        nav.remove(); menu.remove(); mobilePanel.remove();
      });
    }

    if (landing && finePointer && !reduced) {
      const cursor = document.createElement("div");
      cursor.className = "nuva-cursor";
      cursor.innerHTML = "<span></span>";
      document.body.appendChild(cursor);
      let x = -100, y = -100, tx = x, ty = y, raf = 0;
      const render = () => {
        x += (tx - x) * 0.18; y += (ty - y) * 0.18;
        cursor.style.transform = `translate3d(${x}px,${y}px,0)`;
        raf = requestAnimationFrame(render);
      };
      const move = (event: MouseEvent) => { tx = event.clientX; ty = event.clientY; };
      const over = (event: Event) => {
        const target = event.target as Element | null;
        cursor.classList.toggle("is-hovering", Boolean(target?.closest("a,button,[role='button'],input,textarea,select,[data-magnetic]")));
      };
      window.addEventListener("mousemove", move, { passive: true });
      document.addEventListener("mouseover", over);
      render();

      const magnets = Array.from(document.querySelectorAll<HTMLElement>("a,button,[data-magnetic]"));
      const handlers = magnets.map((el) => {
        const moveMagnet = (event: MouseEvent) => {
          const r = el.getBoundingClientRect();
          const dx = (event.clientX - (r.left + r.width / 2)) * 0.12;
          const dy = (event.clientY - (r.top + r.height / 2)) * 0.12;
          el.style.setProperty("--mag-x", `${Math.max(-10, Math.min(10, dx))}px`);
          el.style.setProperty("--mag-y", `${Math.max(-10, Math.min(10, dy))}px`);
        };
        const leaveMagnet = () => { el.style.removeProperty("--mag-x"); el.style.removeProperty("--mag-y"); };
        el.addEventListener("mousemove", moveMagnet); el.addEventListener("mouseleave", leaveMagnet);
        return () => { el.removeEventListener("mousemove", moveMagnet); el.removeEventListener("mouseleave", leaveMagnet); };
      });
      cleanups.push(() => {
        cancelAnimationFrame(raf);
        window.removeEventListener("mousemove", move);
        document.removeEventListener("mouseover", over);
        handlers.forEach((cleanup) => cleanup());
        cursor.remove();
      });
    }

    const contact = document.createElement("a");
    contact.className = "nuva-floating-contact";
    contact.href = "#faq";
    contact.setAttribute("aria-label", "Ir a preguntas frecuentes de Nüva One");
    contact.innerHTML = "<span>CONTACTO</span><b>↗</b>";
    document.body.appendChild(contact);
    cleanups.push(() => contact.remove());

    const transition = document.createElement("div");
    transition.className = "nuva-page-transition";
    transition.setAttribute("aria-hidden", "true");
    document.body.appendChild(transition);
    requestAnimationFrame(() => transition.classList.add("is-ready"));
    const clickTransition = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download") || link.origin !== window.location.origin) return;
      const url = new URL(link.href);
      if (url.hash && url.pathname === window.location.pathname) return;
      transition.classList.remove("is-ready");
      transition.classList.add("is-exiting");
    };
    document.addEventListener("click", clickTransition, true);
    cleanups.push(() => { document.removeEventListener("click", clickTransition, true); transition.remove(); });

    return () => { cleanups.reverse().forEach((cleanup) => cleanup()); root.classList.remove("nuva-webloved-runtime"); };
  }, []);

  return null;
}
