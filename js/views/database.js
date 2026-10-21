/** View: Datenbank – zeigt Pulver, Geschosse und Druckgrenzen aus db.json. */
import { el, fmtTime } from '../util.js';

function section(title, rows, render) {
  return el('section', { class: 'card' },
    el('h2', {}, `${title} `, el('span', { class: 'badge' }, rows.length)),
    rows.length ? el('ul', { class: 'list' }, rows.map(render)) : el('p', { class: 'muted' }, 'Keine Einträge.'));
}

export function renderDatabase(root, { db }) {
  root.replaceChildren(
    el('p', { class: 'muted small' }, `Stand: ${fmtTime(db.updated)} · Version ${db.version ?? '—'}`),
    section('Pulver', db.powders, (p) => el('li', {},
      el('div', {}, el('strong', {}, p.name), el('div', { class: 'muted small' }, p.id)),
      el('span', { class: 'chip' }, `Abbrand-Rang ${p.burn_rate_rank ?? '—'}`))),
    section('Geschosse', db.bullets, (b) => el('li', {},
      el('div', {}, el('strong', {}, b.name), el('div', { class: 'muted small' }, b.id)))),
    section('Druckgrenzen', db.pressure_limits, (l) => el('li', {},
      el('strong', {}, l.cartridge),
      el('span', { class: 'chip warn' }, `${l.max_mpa_sim} sim-MPa`))),
    db.last_optimization
      ? el('section', { class: 'card' }, el('h2', {}, 'Letzte Optimierung (Routine)'),
          el('pre', { class: 'small' }, JSON.stringify(db.last_optimization, null, 2)))
      : null,
  );
}
