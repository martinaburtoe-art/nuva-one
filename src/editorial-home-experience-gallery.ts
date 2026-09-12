export function installEditorialGallery() {
  const section = document.querySelector<HTMLElement>(".editorial-gallery");
  const sticky = section?.querySelector<HTMLElement>(".editorial-gallery__sticky");
  const track = section?.querySelector<HTMLElement>(".editorial-gallery__track");
  const progressBar = section?.querySelector<HTMLElement>(".editorial-gallery__progress span");

  if (!section || !sticky || !track) return () => {};

  let raf = 0;
  let active = true;

  const update = () => {
    raf = 0;
    if (!active) return;
    const rect = section.getBoundingClientRect();
    const range = Math.max(section.offsetHeight - window.innerHeight, 1);
    const value = Math.min(1, Math.max(0, -rect.top / range));
    const maxTranslate = Math.max(0, track.scrollWidth - sticky.clientWidth + 48);
    track.style.transform = `translate3d(${-maxTranslate * value}px, 0, 0)`;
    progressBar?.style.setProperty("transform", `scaleX(${value})`);
    section.style.setProperty("--gallery-progress", value.toFixed(4));
  };

  const requestUpdate = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };

  const observer = new ResizeObserver(requestUpdate);
  observer.observe(section);
  observer.observe(track);
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  requestUpdate();

  return () => {
    active = false;
    cancelAnimationFrame(raf);
    observer.disconnect();
    window.removeEventListener("scroll", requestUpdate);
    window.removeEventListener("resize", requestUpdate);
    track.style.transform = "";
    progressBar?.style.removeProperty("transform");
  };
}
