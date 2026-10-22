/** View: Optimierung – Demo-Leiter unter der Demo-Grenze, nie unter CIP. */
import { el, fmt, setChildren } from '../util.js';
import { drawLineChart } from '../chart.js';
import { limitFor } from '../api.js';
import { buildLadder, demoBar, ladderNeedsRestart } from '../ladder.js';
import { magnumStandardHint, primerChangeHint } from '../userdata/primer.js';

const state = {
  cartridge: null, powderId: null, bulletId: null, primerId: null, pick: null, timer: 0, token: 0, primerHint: '',
};
const SELECT_DEBOUNCE_MS = 200;

export function renderOptimization(root, { db }) {
  db.powders ??= [];
  db.bullets ??= [];
  db.primers ??= [];
  db.pressure_limits ??= [];
  if (!db.pressure_limits.some((l) => l.cartridge === state.cartridge)) state.cartridge = db.pressure_limits[0]?.cartridge ?? null;
  if (!db.powders.some((p) => p.id === state.powderId)) state.powderId = db.powders[0]?.id ?? null;
  if (!db.bullets.some((b) => b.id === state.bulletId)) state.bulletId = db.bullets[0]?.id ?? null;
  if (!db.primers.some((p) => p.id === state.primerId)) state.primerId = db.primers[0]?.id ?? null;

  const out = el('div');
  const choose = (items, key, valueOf, labelOf) => el('select', {
    onchange: (e) => {
      if (key === 'primerId') {
        const prev = db.primers.find((p) => p.id === state.primerId);
        const next = db.primers.find((p) => p.id === e.target.value);
        state.primerHint = primerChangeHint(prev?.name, next?.name);
      }
      state[key] = e.target.value;
      schedule(SELECT_DEBOUNCE_MS);
    },
  }, items.map((item) => {
    const value = valueOf(item);
    return el('option', { value, selected: value === state[key] }, labelOf(item));
  }));

  root.replaceChildren(
    el('section', { class: 'card' },
      el('label', {}, 'Demo-Patrone', choose(db.pressure_limits, 'cartridge', (l) => l.cartridge, (l) => `${l.cartridge} (${fmt(l.pmax_bar, 0)} bar)`)),
      el('label', {}, 'Demo-Pulver', choose(db.powders, 'powderId', (p) => p.id, (p) => p.name)),
      el('label', {}, 'Demo-Geschoss', choose(db.bullets, 'bulletId', (b) => b.id, (b) => b.name)),
      el('label', {}, 'Demo-Zündhütchen', choose(db.primers, 'primerId', (p) => p.id, (p) => p.name)),
      el('p', {}, 'Maximalladung = Demo-Grenze'),
      el('p', {}, 'Rechenwert – keine Freigabe'),
      el('p', { class: 'muted small' }, '„Maximal“ meint die Demo-Grenze. Echte Ladungen beginnen immer bei der Startladung des Herstellers.')),
    out,
  );

  function currentPick() {
    return { powderId: state.powderId, bulletId: state.bulletId, primerId: state.primerId };
  }

  function schedule(delay) {
    if (ladderNeedsRestart(state.pick, currentPick())) state.pick = currentPick();
    state.token += 1;
    const token = state.token;
    if (state.timer) clearTimeout(state.timer);
    out.replaceChildren(el('p', { class: 'muted', role: 'status' }, 'Berechne …'));
    state.timer = setTimeout(() => {
      state.timer = 0;
      if (token === state.token) publish(token);
    }, delay);
  }

  function publish(token) {
    if (token !== state.token) return;
    const powder = db.powders.find((p) => p.id === state.powderId);
    const bullet = db.bullets.find((b) => b.id === state.bulletId);
    const primer = db.primers.find((p) => p.id === state.primerId);
    const limit = limitFor(db, state.cartridge);
    if (!powder || !bullet) return;
    const ladder = buildLadder({ powder, bullet, primer, limitPressure: limit.max });
    const magnumText = magnumStandardHint(primer?.name, state.cartridge);
    const canvas = el('canvas', { class: 'chart', 'aria-label': 'Leiter Druck über Ladung' });
    const limitBar = limit.bar;
    setChildren(out,
      state.primerHint ? el('p', { class: 'hint-yellow', role: 'status' }, state.primerHint) : null,
      magnumText ? el('p', { class: 'hint-yellow', role: 'status' }, magnumText) : null,
      el('p', { class: 'muted small' }, `Leiter ab 90 % der Demo-Grenzladung, Schritte 0,8 % davon, Ende an der Grenze. Farben und Abbruch nutzen ${fmt(limitBar, 0)} bar (${limit.cartridge}).`),
      el('section', { class: 'card' },
        el('h2', {}, 'Ladungsleiter'),
        ladder.steps.length
          ? el('ul', { class: 'list' }, ladder.steps.map((step) => stepRow(step, ladder.selection)))
          : el('p', {}, 'Keine Demo-Ladung unter der Demo-Grenze.')),
      ladder.selection
        ? el('section', { class: 'card' },
          el('h2', {}, 'Auswahl'),
          el('p', {}, `${fmt(ladder.selection.grain, 1)} grain`))
        : null,
      el('section', { class: 'card' }, el('h2', {}, 'Druck über Ladung'), canvas),
      seatingSection(ladder),
    );
    requestAnimationFrame(() => drawLineChart(canvas, {
      series: [{ color: '#0a84ff', points: ladder.steps.map((step) => [step.grain, demoBar(step.pressure)]) }],
      xLabel: 'Ladung (grain)',
      yLabel: 'Druck (bar)',
      hLine: { value: limitBar, label: `Demo-Grenze ${fmt(limitBar, 0)} bar` },
    }));
  }

  schedule(0);
}

function stepRow(step, selection) {
  const tone = step.over ? 'hint-red' : step.yellow ? 'hint-yellow' : '';
  const mark = step.over ? 'über der Demo-Grenze' : step.yellow ? 'ab 90 % der Demo-Grenze' : 'unter 90 % der Demo-Grenze';
  const selected = selection && step.grain === selection.grain;
  return el('li', {},
    el('div', { class: tone },
      el('strong', {}, `${fmt(step.grain, 1)} grain`),
      el('div', { class: 'small' }, `${fmt(demoBar(step.pressure), 0)} bar · ${mark}`),
      selected ? el('div', {}, 'Auswahl') : null));
}

function seatingSection(ladder) {
  if (!ladder.seating.length) {
    return el('section', { class: 'card' }, el('h2', {}, 'Setztiefe'), el('p', {}, 'Ohne Ogive kein Setztiefentest.'));
  }
  const recommendation = ladder.seatingRecommendation;
  return el('section', { class: 'card' },
    el('h2', {}, 'Setztiefe'),
    el('p', {}, `Ladung ${fmt(ladder.seatingChargeGrain, 1)} grain, mindestens 3 % unter dem obersten Leiter-Schritt.`),
    recommendation
      ? el('p', {}, `Empfehlung: ${recommendation.label}`)
      : el('p', {}, 'Keine Empfehlung – eine Setztiefe liegt über der Demo-Grenze.'),
    el('ul', { class: 'list' }, ladder.seating.map((row) => {
      const tone = row.over ? 'hint-red' : row.yellow ? 'hint-yellow' : '';
      const marked = recommendation && row.depthMm === recommendation.depthMm;
      return el('li', {},
        el('div', { class: tone },
          el('strong', {}, row.label),
          el('span', { class: 'chip' }, `${fmt(demoBar(row.pressure), 0)} bar`),
          marked ? el('div', {}, 'Empfehlung') : null));
    })));
}
