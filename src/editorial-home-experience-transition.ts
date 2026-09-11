const CHAPTER_COUNT = 14;

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function installEditorialScrollTransition() {
  const story = document.querySelector<HTMLElement>(".editorial-story");
  if (!story) return () => undefined;

  const layers = Array.from(story.querySelectorAll<HTMLElement>(".editorial-story__art-wrap"));
  if (layers.length !== 2) return () => undefined;

  layers.forEach((layer, index) => {
    layer.dataset.editorialLayer = String(index);
  });

  const progressReadout = story.querySelector<HTMLElement>(".editorial-story__progress-readout");
  const progressBar = story.querySelector<HTMLElement>(".editorial-progress");
  progressReadout?.setAttribute("aria-live", "off");
  progressBar?.setAttribute("role", "progressbar");
  progressBar?.setAttribute("aria-valuemin", "0");
  progressBar?.setAttribute("aria-valuemax", "100");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let previousY = window.scrollY;
  let direction: "forward" | "backward" = "forward";

  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const range = Math.max(story.offsetHeight - window.innerHeight, 1);
      const progress = clamp(-story.getBoundingClientRect().top / range);
      const chapterPosition = progress * CHAPTER_COUNT;
      const active = Math.min(CHAPTER_COUNT - 1, Math.floor(chapterPosition + 0.5));
      const raw = chapterPosition - active + 0.5;
      const transition = reducedMotion.matches ? 0 : clamp(Math.abs(raw - 0.5) * 2);

      if (window.scrollY > previousY + 1) direction = "forward";
      if (window.scrollY < previousY - 1) direction = "backward";
      previousY = window.scrollY;

      story.dataset.transitionDirection = direction;
      story.style.setProperty("--transition-progress", String(transition));
      story.style.setProperty("--story-progress", String(progress));
      progressBar?.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    });
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  reducedMotion.addEventListener?.("change", update);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
    reducedMotion.removeEventListener?.("change", update);
  };
}
