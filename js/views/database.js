/** View: Datenbank – zeigt Pulver, Geschosse und Druckgrenzen aus db.json. */
import { el, fmt, fmtTime } from '../util.js';

function section(title, rows, render) {
  return el('section', { class: 'card' },
    el('h2', {}, `${title} `, el('span', { class: 'badge' }, rows.length)),
    rows.length ? el('ul', { class: 'list' }, rows.map(render)) : el('p', { class: 'muted' }, 'Keine Einträge.'));
}

export function renderDatabase(root, { db }) {
  root.replaceChildren(
    el('p', { class: 'muted small' }, `Stand: ${fmtTime(db.updated)} · Version ${db.version ?? '—'}`),
    el('p', { class: 'warn-text', role: 'note' }, 'Rechenwert – keine echten Ladedaten, keine Freigabe'),
    section('Pulver', db.powders, (p) => el('li', {},
      el('div', {}, el('strong', {}, p.name), el('div', { class: 'muted small' }, p.id)),
      el('span', { class: 'chip' }, [p.burn_class, p.burn_rate_rank != null ? `Rang ${p.burn_rate_rank}` : null].filter(Boolean).join(' · ') || '—'))),
    section('Geschosse', db.bullets, (b) => el('li', {},
      el('div', {}, el('strong', {}, b.name), el('div', { class: 'muted small' }, b.id)),
      el('span', { class: 'chip' }, Number.isFinite(b.mass_grain) ? `${fmt(b.mass_grain, 1)} grain` : '—'))),
    section('Druckgrenzen', db.pressure_limits, (l) => el('li', {},
      el('strong', {}, l.cartridge),
      el('span', { class: 'chip warn' }, `${fmt(l.pmax_bar, 0)} bar`))),
    db.last_optimization
      ? el('section', { class: 'card' }, el('h2', {}, 'Letzte Optimierung (Routine)'),
          el('pre', { class: 'small' }, JSON.stringify(db.last_optimization, null, 2)))
      : null,
  );
}
