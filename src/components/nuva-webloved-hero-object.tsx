import { useEffect, useRef } from "react";

export function NuvaWebLovedHeroObject() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    let raf = 0;
    let disposed = false;
    let pointerX = 0;
    let pointerY = 0;
    let scroll = 0;
    let rotation = 0;

    const points = Array.from({ length: 150 }, (_, i) => {
      const a = (i / 150) * Math.PI * 2;
      const ring = 0.72 + ((i * 17) % 31) / 100;
      return {
        a,
        r: ring,
        y: ((i * 37) % 100) / 100 - 0.5,
        speed: 0.15 + ((i * 11) % 17) / 100,
      };
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const move = (event: PointerEvent) => {
      if (!fine) return;
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => {
      scroll = window.scrollY;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const render = (time: number) => {
      if (disposed) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.62 + pointerX * 18;
      const cy = h * 0.52 + pointerY * 12 + Math.min(scroll, 500) * 0.025;
      const scale = Math.min(w, h) * 0.28;
      const t = time * 0.001;
      rotation += reduced ? 0.00015 : 0.0045;

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.9);
      glow.addColorStop(0, "rgba(83,190,255,.24)");
      glow.addColorStop(0.34, "rgba(31,135,222,.10)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation * 0.2);
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, scale * (1.05 + ring * 0.23), scale * (0.26 + ring * 0.035), ring * 0.52, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(92,205,255,${0.16 - ring * 0.035})`;
        ctx.lineWidth = 1;
        ctx.setLineDash(ring === 1 ? [3, 9] : [1, 13]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const size = scale * 0.66;
      const verts = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
      ];
      const projected = verts.map(([x, y, z]) => {
        const ax = rotation * 0.9 + pointerX * 0.25;
        const ay = rotation * 0.58 + pointerY * 0.18;
        const px = x * Math.cos(ay) - z * Math.sin(ay);
        let pz = x * Math.sin(ay) + z * Math.cos(ay);
        const py = y * Math.cos(ax) - pz * Math.sin(ax);
        pz = y * Math.sin(ax) + pz * Math.cos(ax);
        const perspective = 1 / (1.9 - pz * 0.32);
        return [px * size * perspective, py * size * perspective, pz] as const;
      });
      const faces = [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]]
        .map((face) => ({ face, z: face.reduce((sum, i) => sum + projected[i][2], 0) / 4 }))
        .sort((a, b) => a.z - b.z);

      for (const { face, z } of faces) {
        ctx.beginPath();
        face.forEach((i, n) => {
          const [x, y] = projected[i];
          if (n === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
        const alpha = 0.055 + Math.max(0, z + 1) * 0.035;
        ctx.fillStyle = `rgba(112,210,255,${alpha})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(117,216,255,.32)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(0, 0, size * 0.16 + Math.sin(t * 2) * 2, 0, Math.PI * 2);
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.2);
      core.addColorStop(0, "rgba(235,250,255,.98)");
      core.addColorStop(0.2, "rgba(98,211,255,.82)");
      core.addColorStop(1, "rgba(22,126,220,0)");
      ctx.fillStyle = core;
      ctx.fill();
      ctx.restore();

      for (const p of points) {
        const a = p.a + rotation * p.speed;
        const radius = scale * p.r;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius * 0.31 + p.y * scale * 0.9;
        const depth = (Math.sin(a) + 1) / 2;
        const r = 0.7 + depth * 1.25;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(164,230,255,${0.12 + depth * 0.45})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="nuva-webloved-hero-object" aria-hidden="true">
      <canvas ref={canvasRef} className="nuva-webloved-hero-object__canvas" />
      <div className="nuva-webloved-hero-object__label nuva-webloved-hero-object__label--top">BUSINESS INTELLIGENCE / 01</div>
      <div className="nuva-webloved-hero-object__label nuva-webloved-hero-object__label--left">DATA<br />CONTEXT<br />DECISION</div>
      <div className="nuva-webloved-hero-object__label nuva-webloved-hero-object__label--right">REAL TIME<br />SIGNAL<br />ACTION</div>
      <div className="nuva-webloved-hero-object__line nuva-webloved-hero-object__line--left" />
      <div className="nuva-webloved-hero-object__line nuva-webloved-hero-object__line--right" />
    </div>
  );
}
