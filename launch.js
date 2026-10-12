(() => {
  "use strict";
  const overlay = document.getElementById("launchSplash");
  const canvas = document.getElementById("launchCanvas");
  let frame = 0;
  const remove = () => { cancelAnimationFrame(frame); overlay?.remove(); };
  const deadline = setTimeout(remove, 3300);
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) { remove(); return; }
    const width = innerWidth, height = innerHeight, ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const fontSize = Math.min(width * .18, height * .28, 210);
    const font = "800 " + fontSize + "px system-ui";
    const word = "LHdrive", letters = [], particles = [];
    ctx.font = font;
    let x = (width - ctx.measureText(word).width) / 2;
    const symbols = "0123456789アイウエオカキクケコサシスセソネミホラワ";
    [...word].forEach((letter, index) => {
      const layer = document.createElement("canvas");
      layer.width = width; layer.height = height;
      const c = layer.getContext("2d");
      c.font = font; c.textBaseline = "middle"; c.fillStyle = "#70f5a3";
      c.fillText(letter, x, height / 2);
      letters.push(layer);
      const data = c.getImageData(0, 0, width, height).data;
      const letterWidth = ctx.measureText(letter).width;
      for (let y = 0; y < height; y += 13) {
        for (let px = Math.max(0, Math.floor(x)); px < Math.min(width, x + letterWidth + 2); px += 13) {
          if (data[(y * width + px) * 4 + 3] > 100) particles.push({ x: px, y, index, rate: 90 + Math.random() * 70, phase: Math.random() * symbols.length });
        }
      }
      x += letterWidth;
    });
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const clamp = v => Math.max(0, Math.min(1, v));
    function draw(now) {
      const elapsed = now - start, seconds = elapsed / 1000;
      if (elapsed >= 3000) { clearTimeout(deadline); remove(); return; }
      ctx.clearRect(0, 0, width, height);
      letters.forEach((layer, index) => {
        ctx.save();
        ctx.globalAlpha = reduced ? 1 : 1 - clamp((seconds - .35 - index * .22) / .3);
        ctx.shadowColor = "#65ffa0"; ctx.shadowBlur = 18;
        ctx.drawImage(layer, 0, 0); ctx.restore();
      });
      if (!reduced) {
        ctx.font = "14px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (const p of particles) {
          const local = seconds - .35 - p.index * .22;
          if (local <= 0) continue;
          const alpha = clamp(local / .3) * (1 - clamp((seconds - 2.05) / .65));
          const y = p.y + local * p.rate;
          const glyph = symbols[Math.floor(local * 6 + p.phase) % symbols.length];
          for (let tail = 3; tail >= 0; tail--) {
            ctx.globalAlpha = alpha * (tail ? .11 : .85);
            ctx.fillStyle = tail ? "#29c96b" : "#a8ffd0";
            ctx.fillText(glyph, p.x, y - tail * 15);
          }
        }
      }
      ctx.globalAlpha = 1;
      overlay.style.opacity = String(1 - clamp((seconds - 2.7) / .3));
      frame = requestAnimationFrame(draw);
    }
    draw(start);
  } catch { clearTimeout(deadline); remove(); }
})();

