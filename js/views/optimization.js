/** View: Optimierung – Parameter-Sweep, höchste v unter dem Demo-Druckgrenzwert. */
import { el, fmt } from '../util.js';
import { sweep } from '../model.js';
import { drawLineChart } from '../chart.js';
import { primaryLimit } from '../api.js';

const COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#bf5af2', '#64d2ff', '#ff375f'];

export function renderOptimization(root, { db }) {
  const limit = primaryLimit(db);
  const out = el('div');
  const btn = el('button', { class: 'btn primary', type: 'button', onclick: run }, 'Sweep starten');
  root.replaceChildren(
    el('section', { class: 'card' },
      el('p', {}, `Variiert Demo-Pulver × Demo-Geschoss × Ladung (1–10 LE, Schritt 0,25) und sucht die höchste simulierte Geschwindigkeit mit Spitzendruck ≤ ${limit.max} sim-MPa (${limit.cartridge}).`),
      btn),
    out,
  );

  function run() {
    const { results, best } = sweep({ powders: db.powders, bullets: db.bullets, limit: limit.max });
    const canvas = el('canvas', { class: 'chart' });
    const combos = [];
    for (const p of db.powders) for (const b of db.bullets) combos.push({ p, b });

    out.replaceChildren(
      best
        ? el('section', { class: 'card highlight' },
            el('h2', {}, 'Bestes Ergebnis (simuliert)'),
            el('div', { class: 'kpis' },
              kpiBox('Geschw.', `${fmt(best.muzzleVelocity)} sim-m/s`),
              kpiBox('Druck', `${fmt(best.peakPressure)} sim-MPa`),
              kpiBox('Ladung', `${fmt(best.charge, 2)} LE`)),
            el('p', {}, `${best.powderName} + ${best.bulletName}`))
        : el('section', { class: 'card' }, el('p', {}, 'Keine Kombination unter dem Limit.')),
      el('section', { class: 'card' }, el('h2', {}, 'Druck über Ladung'), canvas,
        el('div', { class: 'legend' }, combos.map((c, i) => el('span', {}, el('i', { style: `background:${COLORS[i % COLORS.length]}` }), `${c.p.name.replace('DemoPowder ', '')} / ${c.b.name.replace('Demo ', '')}`)))),
      el('section', { class: 'card' }, el('h2', {}, 'Beste je Kombination'),
        el('ul', { class: 'list' }, combos.map(({ p, b }) => {
          const ok = results.filter((r) => r.powderId === p.id && r.bulletId === b.id && r.underLimit);
          const top = ok.reduce((a, r) => (!a || r.muzzleVelocity > a.muzzleVelocity ? r : a), null);
          return el('li', {}, el('div', {}, el('strong', {}, p.name), el('div', { class: 'muted small' }, b.name)),
            el('span', { class: 'chip' }, top ? `${fmt(top.muzzleVelocity)} sim-m/s @ ${fmt(top.charge, 2)} LE` : '—'));
        }))),
    );
    requestAnimationFrame(() => drawLineChart(canvas, {
      series: combos.map(({ p, b }, i) => ({
        color: COLORS[i % COLORS.length],
        points: results.filter((r) => r.powderId === p.id && r.bulletId === b.id).map((r) => [r.charge, r.peakPressure]),
      })),
      xLabel: 'Ladung (LE)', yLabel: 'Spitzendruck (sim-MPa)',
      hLine: { value: limit.max, label: `Demo-Limit ${limit.max}` },
    }));
  }
  run();
}

const kpiBox = (l, v) => el('div', { class: 'kpi' }, el('div', { class: 'muted small' }, l), el('div', { class: 'kpi-value' }, v));
