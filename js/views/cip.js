/** Ansicht: CIP-Tabelle – nur Nachschlagewerte, Pmax in bar und L6 in mm. */
import { el, fmt } from '../util.js';
import { filterCipRows, loadCipIndex, resolveCipQuery } from '../cip/lookup.js';

const state = { query: '', index: null };

function mmText(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 2 })} mm`;
}

export function renderCip(root) {
  root.replaceChildren(el('p', { class: 'muted' }, 'Lade CIP-Tabelle …'));
  const ready = state.index ? Promise.resolve(state.index) : loadCipIndex();
  ready.then((index) => {
    state.index = index;
    paint(root);
  }).catch((err) => {
    root.replaceChildren(el('section', { class: 'card' },
      el('h2', {}, 'CIP-Tabelle'),
      el('p', {}, String(err.message || err))));
  });
}

function paint(root) {
  const resolved = resolveCipQuery(state.index, state.query);
  const rows = filterCipRows(state.index, state.query);
  const search = el('input', {
    type: 'search',
    placeholder: 'Exakter CIP-Name, z. B. 308 Win. oder 9 mm Luger',
    value: state.query,
    'aria-label': 'CIP-Patrone suchen',
    oninput: (e) => { state.query = e.target.value; paint(root); },
  });
  let note = null;
  if (resolved.status === 'alias' && resolved.entry) {
    note = el('p', { class: 'hint-yellow' }, `Vorschlag (Alias): ${resolved.entry.cartridge}`);
  } else if (resolved.status === 'none') {
    note = el('p', { class: 'muted small' }, 'Kein exakter CIP-Name. Teiltreffer werden nicht vorgeschlagen.');
  }
  root.replaceChildren(
    el('section', { class: 'card' },
      el('h2', {}, 'CIP-Tabelle ', el('span', { class: 'badge' }, state.index.rows.length)),
      el('p', { class: 'muted small' }, 'Nur Nachschlagewerte. Keine Ladedaten. Quelle: C.I.P., abgerufen 21.10.2026'),
      el('label', {}, 'Patrone', search),
      note),
    el('section', { class: 'card' },
      rows.length
        ? el('ul', { class: 'list' }, rows.map((row) => el('li', {},
          el('div', {},
            el('strong', {}, row.cartridge),
            el('div', { class: 'muted small' }, Number.isFinite(row.l6Mm) ? `L6 ${mmText(row.l6Mm)}` : 'L6 —')),
          el('span', { class: 'chip' }, `${fmt(row.pmaxBar, 0)} bar`))))
        : el('p', { class: 'muted' }, 'Kein Eintrag.')),
  );
}
