/** View: Simulation – Druckverlauf über Weg/Zeit und Mündungsgeschwindigkeit. */
import { el, fmt, setChildren } from '../util.js';
import { magnumStandardHint, primerChangeHint } from '../userdata/primer.js';
import { simulate } from '../model.js';
import { drawLineChart } from '../chart.js';
import { limitFor } from '../api.js';
import { GRAIN_PER_LE, demoBar } from '../ladder.js';

const state = { powderId: null, bulletId: null, primerId: null, cartridge: null, chargeGrain: 25, axis: 'x', primerHint: '' };

export function renderSimulation(root, { db }) {
  db.powders ??= [];
  db.bullets ??= [];
  db.primers ??= [];
  db.pressure_limits ??= [];
  if (!db.powders.some((p) => p.id === state.powderId)) state.powderId = db.powders[0]?.id ?? null;
  if (!db.bullets.some((b) => b.id === state.bulletId)) state.bulletId = db.bullets[0]?.id ?? null;
  if (!db.primers.some((p) => p.id === state.primerId)) state.primerId = db.primers[0]?.id ?? null;
  if (!db.pressure_limits.some((l) => l.cartridge === state.cartridge)) state.cartridge = db.pressure_limits[0]?.cartridge ?? null;

  const select = (items, key, valueOf, labelOf) => el('select', {
    onchange: (e) => {
      if (key === 'primerId') {
        const prev = db.primers.find((p) => p.id === state.primerId);
        const next = db.primers.find((p) => p.id === e.target.value);
        state.primerHint = primerChangeHint(prev?.name, next?.name);
      }
      state[key] = e.target.value;
      run();
    },
  }, items.map((item) => {
    const value = valueOf(item);
    return el('option', { value, selected: value === state[key] }, labelOf(item));
  }));

  const chargeOut = el('output', {}, `${fmt(state.chargeGrain, 1)} grain`);
  const slider = el('input', {
    type: 'range', min: 5, max: 50, step: 0.1, value: state.chargeGrain,
    oninput: (e) => { state.chargeGrain = Number(e.target.value); chargeOut.textContent = `${fmt(state.chargeGrain, 1)} grain`; run(); },
  });
  const axisToggle = el('div', { class: 'segmented' },
    ['x', 't'].map((a) => el('button', {
      type: 'button', class: state.axis === a ? 'active' : '',
      onclick: (e) => { state.axis = a; [...e.target.parentNode.children].forEach((b) => b.classList.toggle('active', b === e.target)); run(); },
    }, a === 'x' ? 'über Weg' : 'über Zeit')));

  const primerHints = el('div');
  const canvas = el('canvas', { class: 'chart', 'aria-label': 'Druckverlauf' });
  const kpis = el('div', { class: 'kpis' });

  root.replaceChildren(
    el('section', { class: 'card' },
      el('label', {}, 'Demo-Patrone', select(db.pressure_limits, 'cartridge', (l) => l.cartridge, (l) => `${l.cartridge} (${fmt(l.pmax_bar, 0)} bar)`)),
      el('label', {}, 'Demo-Pulver', select(db.powders, 'powderId', (p) => p.id, (p) => p.name)),
      el('label', {}, 'Demo-Geschoss', select(db.bullets, 'bulletId', (b) => b.id, (b) => b.name)),
      el('label', {}, 'Demo-Zündhütchen', select(db.primers, 'primerId', (p) => p.id, (p) => p.name)),
      primerHints,
      el('label', {}, el('span', {}, 'Ladung ', chargeOut), slider)),
    el('p', { class: 'warn-text', role: 'note' }, 'Rechenwert – keine echten Ladedaten, keine Freigabe'),
    kpis,
    el('section', { class: 'card' }, axisToggle, canvas,
      el('p', { class: 'muted small' }, 'Spielzeugmodell (Lagrange-artig, unkalibriert).')),
  );

  function run() {
    const powder = db.powders.find((p) => p.id === state.powderId);
    const bullet = db.bullets.find((b) => b.id === state.bulletId);
    const primer = db.primers.find((p) => p.id === state.primerId);
    const limit = limitFor(db, state.cartridge);
    const magnumText = magnumStandardHint(primer?.name, state.cartridge);
    setChildren(primerHints,
      state.primerHint ? el('p', { class: 'hint-yellow', role: 'status' }, state.primerHint) : null,
      magnumText ? el('p', { class: 'hint-yellow', role: 'status' }, magnumText) : null);
    if (!powder || !bullet) return;
    const r = simulate({ powder, bullet, primer, charge: state.chargeGrain / GRAIN_PER_LE });
    const over = r.peakPressure > limit.max;
    const limitBar = limit.bar;
    kpis.replaceChildren(
      kpi('Spitzendruck', `${fmt(demoBar(r.peakPressure), 0)} bar`, over ? 'bad' : ''),
      kpi('Mündungsgeschw.', `${fmt(r.muzzleVelocity, 0)} m/s`),
      kpi('Demo-Grenze', `${fmt(limitBar, 0)} bar`, over ? 'bad' : ''),
      kpi('Abbrand an Mündung', `${fmt(r.burnedAtExit * 100, 0)} %`),
    );
    const key = state.axis;
    drawLineChart(canvas, {
      series: [{ color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        points: r.samples.map((s) => [key === 'x' ? s.x : s.t * 1000, demoBar(s.p)]) }],
      xLabel: key === 'x' ? 'Weg' : 'Zeit',
      yLabel: 'Druck (bar)',
      hLine: { value: limitBar, label: `Demo-Grenze ${fmt(limitBar, 0)} bar` },
    });
  }
  requestAnimationFrame(run);
  window.onresize = () => { if (canvas.isConnected) run(); };
}

function kpi(label, value, tone = '') {
  return el('div', { class: `kpi ${tone}` }, el('div', { class: 'muted small' }, label), el('div', { class: 'kpi-value' }, value));
}
