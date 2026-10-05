// Kleines Konfetti für Gewinn-Screens (ohne externe Bibliothek).

export function konfetti(canvas, farben, { menge = 140, dauer = 3500 } = {}) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const b = (canvas.width = innerWidth * dpr);
  const h = (canvas.height = innerHeight * dpr);
  const teile = Array.from({ length: menge }, () => ({
    x: b / 2 + (Math.random() - 0.5) * b * 0.3,
    y: h * 0.45,
    vx: (Math.random() - 0.5) * 22 * dpr,
    vy: (-Math.random() * 22 - 8) * dpr,
    w: (6 + Math.random() * 6) * dpr,
    hh: (10 + Math.random() * 8) * dpr,
    dreh: Math.random() * Math.PI,
    vdreh: (Math.random() - 0.5) * 0.4,
    farbe: farben[Math.floor(Math.random() * farben.length)],
  }));
  const start = performance.now();

  function frame(t) {
    const verstrichen = t - start;
    ctx.clearRect(0, 0, b, h);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, verstrichen - dauer + 800) / 800);
    for (const p of teile) {
      p.vy += 0.6 * dpr;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.dreh += p.vdreh;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.dreh);
      ctx.fillStyle = p.farbe;
      ctx.fillRect(-p.w / 2, -p.hh / 2, p.w, p.hh * Math.abs(Math.cos(p.dreh * 2)));
      ctx.restore();
    }
    if (verstrichen < dauer) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, b, h);
  }
  requestAnimationFrame(frame);
}
