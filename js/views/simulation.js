/** View: Simulation – Druckverlauf über Weg/Zeit und Mündungsgeschwindigkeit. */
import { el, fmt } from '../util.js';
import { simulate } from '../model.js';
import { drawLineChart } from '../chart.js';
import { limitFor } from '../api.js';
import { flightStore } from '../flight.js';
import { demoLadderStep, flightSolution, v0SourceText } from '../trajectory.js';

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

  const canvas = el('canvas', { class: 'chart', 'aria-label': 'Druckverlauf' });
  const kpis = el('div', { class: 'kpis' });
  const flight = flightStore.read();
  const temperature = field('Temperatur (°C)', flight.temperatureC, (value) => { flightStore.save({ temperatureC: value ?? 15 }); run(); });
  const pressure = field('Luftdruck (hPa)', flight.pressureHpa, (value) => { flightStore.save({ pressureHpa: value ?? 1013.25 }); run(); });
  const flightHost = el('div');

  root.replaceChildren(
    el('section', { class: 'card' },
      el('label', {}, 'Demo-Patrone', select(db.pressure_limits, 'cartridge', (l) => l.cartridge, (l) => `${l.cartridge} (${fmt(l.pmax_bar, 0)} bar)`)),
      el('label', {}, 'Demo-Pulver', select(db.powders, 'powderId', (p) => p.id, (p) => p.name)),
      el('label', {}, 'Demo-Geschoss', select(db.bullets, 'bulletId', (b) => b.id, (b) => b.name)),
      el('label', {}, el('span', {}, 'Ladung (abstrakte LE): ', chargeOut), slider)),
    kpis,
    el('section', { class: 'card' }, axisToggle, canvas,
      el('p', { class: 'muted small' }, 'Spielzeugmodell (Lagrange-artig, unkalibriert). Demo-Wert, keine echten Ladedaten.')),
    el('section', { class: 'card' },
      el('h2', {}, 'Geschwindigkeit über Entfernung'),
      el('p', { class: 'muted small' }, 'Punktmasse mit G1 oder G7. Standardatmosphäre 15 °C, sofern Temperatur und Luftdruck nicht geändert werden.'),
      temperature,
      pressure,
      flightHost),
  );

  function run() {
    const powder = db.powders.find((p) => p.id === state.powderId);
    const bullet = db.bullets.find((b) => b.id === state.bulletId);
    const limit = limitFor(db, state.cartridge);
    if (!powder || !bullet) return;
    const r = simulate({ powder, bullet, charge: state.charge });
    const over = r.peakPressure > limit.max;
    kpis.replaceChildren(
      kpi('Spitzendruck', `${fmt(r.peakPressure * 10)} bar · Demo-Wert`, over ? 'bad' : ''),
      kpi('Mündungsgeschw.', `${fmt(r.muzzleVelocity)} m/s · Demo-Wert`),
      kpi('Demo-Grenze', `${fmt(limit.bar)} bar`, over ? 'bad' : ''),
      kpi('Abbrand an Mündung', `${fmt(r.burnedAtExit * 100)} %`),
    );
    const key = state.axis;
    drawLineChart(canvas, {
      series: [{ color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        points: r.samples.map((s) => [key === 'x' ? s.x : s.t * 1000, s.p * 10]) }],
      xLabel: key === 'x' ? 'Weg' : 'Zeit',
      yLabel: 'Druck (bar)',
      hLine: { value: limit.bar, label: `Demo-Grenze ${fmt(limit.bar)} bar` },
    });
    drawFlight(flightHost, bullet, r.muzzleVelocity, state.charge);
  }
  requestAnimationFrame(run);
  window.onresize = () => { if (canvas.isConnected) run(); };
}

function kpi(label, value, tone = '') {
  return el('div', { class: `kpi ${tone}` }, el('div', { class: 'muted small' }, label), el('div', { class: 'kpi-value' }, value));
}

function field(label, value, onValue) {
  const input = el('input', {
    type: 'text', inputmode: 'decimal', 'aria-label': label, value: String(value ?? ''),
    oninput: (e) => onValue(parseDecimal(e.target.value)),
  });
  return el('label', {}, label, input);
}

function parseDecimal(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function drawFlight(host, bullet, simulated, charge) {
  const stored = flightStore.read();
  const massGrain = Number(bullet.mass_grain);
  const solved = flightSolution({
    bcG1: bullet.bc_g1, bcG7: bullet.bc_g7, user: stored, v0Simulated: simulated, massGrain,
    temperatureC: stored.temperatureC, pressureHpa: stored.pressureHpa,
  });
  if (solved.status !== 'ok') {
    host.replaceChildren(el('p', { class: 'warn-text', role: 'status' }, solved.text));
    return;
  }
  const step = demoLadderStep(charge);
  const source = v0SourceText({
    measured: solved.measured,
    step: step.step,
    chargeText: `${fmt(step.charge, 2)} LE`,
  });
  host.replaceChildren(
    el('p', {}, `V0 ${fmt(solved.v0, 1)} m/s · ${source}`),
    el('p', { class: 'small' }, `${fmt(massGrain, 1)} grain · BC ${fmt(solved.bc, 3)} · Widerstandsfunktion ${solved.drag}`),
    solved.demoNote ? el('p', { class: 'small warn-text' }, solved.demoNote) : null,
    el('div', { class: 'table-wrap' },
      el('table', {},
        el('thead', {}, el('tr', {},
          el('th', {}, 'Entfernung (m)'),
          el('th', {}, 'Geschwindigkeit (m/s)'),
          el('th', {}, 'Energie (J)'))),
        el('tbody', {}, solved.rows.map((item) => el('tr', {},
          el('td', {}, fmt(item.distanceM, 0)),
          el('td', {}, fmt(item.velocity, 1)),
          el('td', {}, fmt(item.energyJ, 0))))))),
  );
}
