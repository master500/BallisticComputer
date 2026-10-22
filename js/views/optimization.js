/** View: Optimierung – Parameter-Sweep, höchste v unter dem Demo-Druckgrenzwert. */
import { el, fmt } from '../util.js';
import { sweep } from '../model.js';
import { drawLineChart } from '../chart.js';
import { limitFor } from '../api.js';

const COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#bf5af2', '#64d2ff', '#ff375f', '#ffd60a', '#ac8e68'];
const state = { cartridge: null, chartBulletId: null, timer: 0, token: 0 };
const SELECT_DEBOUNCE_MS = 200;

export function renderOptimization(root, { db }) {
  db.powders ??= [];
  db.bullets ??= [];
  db.pressure_limits ??= [];
  if (!db.pressure_limits.some((l) => l.cartridge === state.cartridge)) state.cartridge = db.pressure_limits[0]?.cartridge ?? null;
  if (!db.bullets.some((b) => b.id === state.chartBulletId)) state.chartBulletId = db.bullets[0]?.id ?? null;

  const out = el('div');
  const cartridgeSelect = el('select', {
    onchange: (e) => { state.cartridge = e.target.value; schedule(SELECT_DEBOUNCE_MS); },
  }, db.pressure_limits.map((l) => el('option', {
    value: l.cartridge, selected: l.cartridge === state.cartridge,
  }, `${l.cartridge} (${fmt(l.pmax_bar, 0)} bar)`)));
  const bulletSelect = el('select', {
    onchange: (e) => { state.chartBulletId = e.target.value; schedule(SELECT_DEBOUNCE_MS); },
  }, db.bullets.map((b) => el('option', {
    value: b.id, selected: b.id === state.chartBulletId,
  }, b.name)));

  root.replaceChildren(
    el('section', { class: 'card' },
      el('label', {}, 'Demo-Patrone (Drucklimit)', cartridgeSelect),
      el('label', {}, 'Diagramm-Geschoss', bulletSelect),
      el('button', { class: 'btn primary', type: 'button', onclick: () => schedule(0) }, 'Sweep starten')),
    out,
  );

  function schedule(delay) {
    state.token += 1;
    const token = state.token;
    if (state.timer) clearTimeout(state.timer);
    out.replaceChildren(el('p', { class: 'muted', role: 'status' }, 'Berechne …'));
    state.timer = setTimeout(() => {
      state.timer = 0;
      if (token === state.token) computeChunked(token);
    }, delay);
  }

  function computeChunked(token) {
    const limit = limitFor(db, state.cartridge);
    const chartBullet = db.bullets.find((b) => b.id === state.chartBulletId) || db.bullets[0];
    const results = [];
    let index = 0;
    const step = () => {
      if (token !== state.token) return;
      if (index >= db.powders.length) {
        publish(results, limit, chartBullet);
        return;
      }
      const powder = db.powders[index++];
      results.push(...sweep({ powders: [powder], bullets: db.bullets, limit: limit.max }).results);
      setTimeout(step, 0);
    };
    step();
  }

  function publish(results, limit, chartBullet) {
    const ok = results.filter((r) => r.underLimit);
    const best = ok.length ? ok.reduce((a, b) => (b.muzzleVelocity > a.muzzleVelocity ? b : a)) : null;
    const canvas = el('canvas', { class: 'chart' });
    const combos = [];
    for (const p of db.powders) for (const b of db.bullets) combos.push({ p, b });
    const chartCombos = chartBullet ? db.powders.map((p) => ({ p, b: chartBullet })) : [];

    out.replaceChildren(
      el('p', { class: 'muted small' }, `Alle Demo-Pulver × alle Demo-Geschosse × Ladung (1–10 LE, Schritt 0,25). Höchste Geschwindigkeit mit Spitzendruck ≤ ${fmt(limit.bar)} bar (${limit.cartridge}). Das Diagramm zeigt ${chartBullet ? chartBullet.name : '—'}. Demo-Wert, keine echten Ladedaten.`),
      best
        ? el('section', { class: 'card highlight' },
            el('h2', {}, 'Bestes Ergebnis'),
            el('div', { class: 'kpis' },
              kpiBox('Geschw.', `${fmt(best.muzzleVelocity)} m/s · Demo-Wert`),
              kpiBox('Druck', `${fmt(best.peakPressure * 10)} bar · Demo-Wert`),
              kpiBox('Ladung', `${fmt(best.charge, 2)} LE`)),
            el('p', {}, `${best.powderName} + ${best.bulletName}`))
        : el('section', { class: 'card' }, el('p', {}, 'Keine Kombination unter dem Limit.')),
      el('section', { class: 'card' }, el('h2', {}, 'Druck über Ladung'), canvas,
        el('div', { class: 'legend' }, chartCombos.map((c, i) => el('span', {}, el('i', { style: `background:${COLORS[i % COLORS.length]}` }), c.p.name.replace('DemoPowder ', ''))))),
      el('section', { class: 'card' }, el('h2', {}, 'Beste je Kombination ', el('span', { class: 'badge' }, combos.length)),
        el('ul', { class: 'list' }, combos.map(({ p, b }) => {
          const ok = results.filter((r) => r.powderId === p.id && r.bulletId === b.id && r.underLimit);
          const top = ok.reduce((a, r) => (!a || r.muzzleVelocity > a.muzzleVelocity ? r : a), null);
          return el('li', {}, el('div', {}, el('strong', {}, p.name), el('div', { class: 'muted small' }, b.name)),
            el('span', { class: 'chip' }, top ? `${fmt(top.muzzleVelocity)} m/s @ ${fmt(top.charge, 2)} LE` : '—'));
        }))),
    );
    requestAnimationFrame(() => drawLineChart(canvas, {
      series: chartCombos.map(({ p, b }, i) => ({
        color: COLORS[i % COLORS.length],
        points: results.filter((r) => r.powderId === p.id && r.bulletId === b.id).map((r) => [r.charge, r.peakPressure * 10]),
      })),
      xLabel: 'Ladung (LE)', yLabel: 'Spitzendruck (bar)',
      hLine: { value: limit.bar, label: `Demo-Grenze ${fmt(limit.bar)} bar` },
    }));
  }
  schedule(0);
}

const kpiBox = (l, v) => el('div', { class: 'kpi' }, el('div', { class: 'muted small' }, l), el('div', { class: 'kpi-value' }, v));
