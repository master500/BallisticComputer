/**
 * Minimaler Linien-Chart auf <canvas> (keine Abhängigkeiten).
 * drawLineChart(canvas, { series:[{points:[[x,y]], color, dots?}], xLabel, yLabel, hLine, fitToData? })
 * dots: nur Punkte ohne Verbindungslinie. fitToData: Achsen beginnen nahe Datenminimum statt bei 0.
 */
export function drawLineChart(canvas, { series, xLabel = '', yLabel = '', hLine = null, fitToData = false }) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 320;
  const cssH = canvas.clientHeight || 220;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const pad = { l: 46, r: 12, t: 12, b: 34 };
  const w = cssW - pad.l - pad.r;
  const h = cssH - pad.t - pad.b;
  const all = series.flatMap((s) => s.points);
  if (!all.length) return;
  let xMin = 0, yMin = 0;
  let xMax = Math.max(...all.map((p) => p[0])) || 1;
  let yMax = Math.max(...all.map((p) => p[1]), hLine ? hLine.value : 0) * 1.1 || 1;
  if (fitToData) {
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const xr = Math.max(...xs) - Math.min(...xs) || Math.abs(xs[0]) * 0.1 || 1;
    const yr = Math.max(...ys) - Math.min(...ys) || Math.abs(ys[0]) * 0.1 || 1;
    xMin = Math.min(...xs) - xr * 0.1; xMax = Math.max(...xs) + xr * 0.1;
    yMin = Math.min(...ys) - yr * 0.1; yMax = Math.max(...ys) + yr * 0.1;
  }
  const X = (x) => pad.l + ((x - xMin) / (xMax - xMin)) * w;
  const Y = (y) => pad.t + h - ((y - yMin) / (yMax - yMin)) * h;

  const styles = getComputedStyle(document.documentElement);
  const grid = styles.getPropertyValue('--grid').trim() || '#333';
  const text = styles.getPropertyValue('--muted').trim() || '#999';

  ctx.font = '11px -apple-system, system-ui, sans-serif';
  ctx.strokeStyle = grid; ctx.fillStyle = text; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const yv = yMin + ((yMax - yMin) / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.l, Y(yv)); ctx.lineTo(pad.l + w, Y(yv)); ctx.stroke();
    ctx.textAlign = 'right'; ctx.fillText(Math.round(yv), pad.l - 6, Y(yv) + 4);
  }
  ctx.textAlign = 'center';
  for (let i = 0; i <= 4; i++) {
    const xv = xMin + ((xMax - xMin) / 4) * i;
    ctx.fillText(xv.toFixed(xMax - xMin < 2 ? 2 : 1), X(xv), pad.t + h + 16);
  }
  ctx.fillText(xLabel, pad.l + w / 2, cssH - 4);
  ctx.save(); ctx.translate(12, pad.t + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yLabel, 0, 0); ctx.restore();

  if (hLine) {
    ctx.strokeStyle = hLine.color || '#ff453a'; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, Y(hLine.value)); ctx.lineTo(pad.l + w, Y(hLine.value)); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = hLine.color || '#ff453a'; ctx.textAlign = 'right';
    ctx.fillText(hLine.label || '', pad.l + w, Y(hLine.value) - 4);
  }
  for (const s of series) {
    if (s.dots) {
      ctx.fillStyle = s.color;
      for (const [x, y] of s.points) { ctx.beginPath(); ctx.arc(X(x), Y(y), 4.5, 0, Math.PI * 2); ctx.fill(); }
      continue;
    }
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath();
    s.points.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.stroke();
  }
}
