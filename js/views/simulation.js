/** View: Simulation – Druckverlauf über Weg/Zeit und Mündungsgeschwindigkeit. */
import { el, fmt } from '../util.js';
import { simulate } from '../model.js';
import { drawLineChart } from '../chart.js';
import { limitFor } from '../api.js';

const state = { powderId: null, bulletId: null, cartridge: null, charge: 5, axis: 'x' };

export function renderSimulation(root, { db }) {
  db.powders ??= [];
  db.bullets ??= [];
  db.pressure_limits ??= [];
  if (!db.powders.some((p) => p.id === state.powderId)) state.powderId = db.powders[0]?.id ?? null;
  if (!db.bullets.some((b) => b.id === state.bulletId)) state.bulletId = db.bullets[0]?.id ?? null;
  if (!db.pressure_limits.some((l) => l.cartridge === state.cartridge)) state.cartridge = db.pressure_limits[0]?.cartridge ?? null;

  const select = (items, key, valueOf, labelOf) => el('select', {
    onchange: (e) => { state[key] = e.target.value; run(); },
  }, items.map((item) => {
    const value = valueOf(item);
    return el('option', { value, selected: value === state[key] }, labelOf(item));
  }));

  const chargeOut = el('output', {}, fmt(state.charge, 2));
  const slider = el('input', {
    type: 'range', min: 1, max: 10, step: 0.25, value: state.charge,
    oninput: (e) => { state.charge = Number(e.target.value); chargeOut.textContent = fmt(state.charge, 2); run(); },
  });
  const axisToggle = el('div', { class: 'segmented' },
    ['x', 't'].map((a) => el('button', {
      type: 'button', class: state.axis === a ? 'active' : '',
      onclick: (e) => { state.axis = a; [...e.target.parentNode.children].forEach((b) => b.classList.toggle('active', b === e.target)); run(); },
    }, a === 'x' ? 'über Weg' : 'über Zeit')));

  const canvas = el('canvas', { class: 'chart', 'aria-label': 'Druckverlauf (simuliert)' });
  const kpis = el('div', { class: 'kpis' });

  root.replaceChildren(
    el('section', { class: 'card' },
      el('label', {}, 'Demo-Patrone', select(db.pressure_limits, 'cartridge', (l) => l.cartridge, (l) => `${l.cartridge} (${l.max_mpa_sim} sim-MPa)`)),
      el('label', {}, 'Demo-Pulver', select(db.powders, 'powderId', (p) => p.id, (p) => p.name)),
      el('label', {}, 'Demo-Geschoss', select(db.bullets, 'bulletId', (b) => b.id, (b) => b.name)),
      el('label', {}, el('span', {}, 'Ladung (abstrakte LE): ', chargeOut), slider)),
    kpis,
    el('section', { class: 'card' }, axisToggle, canvas,
      el('p', { class: 'muted small' }, 'Spielzeugmodell (Lagrange-artig, unkalibriert). Pseudo-Einheiten, kein Realbezug.')),
  );

  function run() {
    const powder = db.powders.find((p) => p.id === state.powderId);
    const bullet = db.bullets.find((b) => b.id === state.bulletId);
    const limit = limitFor(db, state.cartridge);
    if (!powder || !bullet) return;
    const r = simulate({ powder, bullet, charge: state.charge });
    const over = r.peakPressure > limit.max;
    kpis.replaceChildren(
      kpi('Spitzendruck', `${fmt(r.peakPressure)} sim-MPa`, over ? 'bad' : 'good'),
      kpi('Mündungsgeschw.', `${fmt(r.muzzleVelocity)} sim-m/s`),
      kpi('Limit', `${fmt(limit.max)} sim-MPa`, over ? 'bad' : ''),
      kpi('Abbrand an Mündung', `${fmt(r.burnedAtExit * 100)} %`),
    );
    const key = state.axis;
    drawLineChart(canvas, {
      series: [{ color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        points: r.samples.map((s) => [key === 'x' ? s.x : s.t * 1000, s.p]) }],
      xLabel: key === 'x' ? 'Weg (Pseudo-Einheiten)' : 'Zeit (Pseudo-ms)',
      yLabel: 'Druck (sim-MPa)',
      hLine: { value: limit.max, label: `Demo-Limit ${limit.max}` },
    });
  }
  requestAnimationFrame(run);
  window.onresize = () => { if (canvas.isConnected) run(); };
}

function kpi(label, value, tone = '') {
  return el('div', { class: `kpi ${tone}` }, el('div', { class: 'muted small' }, label), el('div', { class: 'kpi-value' }, value));
}
