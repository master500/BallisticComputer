/** View: Datenbank – zeigt Pulver, Geschosse und Druckgrenzen aus db.json. */
import { el, fmt, fmtTime, setChildren } from '../util.js';

function ogiveLabel(ogive) {
  return { tangent: 'Ogival Tangente', secant: 'Ogival Sekante', hybrid: 'Ogival Hybrid', none: 'ohne Ogive' }[ogive] || '';
}

function section(title, rows, render) {
  return el('section', { class: 'card' },
    el('h2', {}, `${title} `, el('span', { class: 'badge' }, rows.length)),
    rows.length ? el('ul', { class: 'list' }, rows.map(render)) : el('p', { class: 'muted' }, 'Keine Einträge.'));
}

export function renderDatabase(root, { db }) {
  setChildren(root,
    el('p', { class: 'muted small' }, `Stand: ${fmtTime(db.updated)} · Version ${db.version ?? '—'}`),
    el('p', { class: 'warn-text', role: 'note' }, 'Rechenwert – keine echten Ladedaten, keine Freigabe'),
    section('Pulver', db.powders, (p) => el('li', {},
      el('div', {}, el('strong', {}, p.name), el('div', { class: 'muted small' }, p.id)),
      el('span', { class: 'chip' }, [p.burn_class, p.burn_rate_rank != null ? `Rang ${p.burn_rate_rank}` : null].filter(Boolean).join(' · ') || '—'))),
    section('Zündhütchen', db.primers || [], (p) => el('li', {},
      el('div', {}, el('strong', {}, p.name), el('div', { class: 'muted small' }, p.id)),
      el('span', { class: 'chip' }, `Faktor ${fmt(p.ignition, 2)}`))),
    section('Geschosse', db.bullets, (b) => el('li', {},
      el('div', {},
        el('strong', {}, b.name),
        el('div', { class: 'muted small' }, [b.id, ogiveLabel(b.ogive_form)].filter(Boolean).join(' · '))),
      el('span', { class: 'chip' }, Number.isFinite(b.mass_grain) ? `${fmt(b.mass_grain, 0)} grain` : '—'))),
    section('Druckgrenzen', db.pressure_limits, (l) => el('li', {},
      el('strong', {}, l.cartridge),
      el('span', { class: 'chip warn' }, `${fmt(l.pmax_bar, 0)} bar`))),
    db.last_optimization
      ? el('section', { class: 'card' }, el('h2', {}, 'Letzte Optimierung (Routine)'),
          el('pre', { class: 'small' }, JSON.stringify(db.last_optimization, null, 2)))
      : null,
  );
}
