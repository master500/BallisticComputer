/**
 * CIP-Prüfung unter Meine Daten. Zuordnung nur per exaktem Namen oder exaktem Alias.
 * Eingabefelder bleiben stehen, damit eine Suche nicht nach dem ersten Zeichen abbricht.
 */
import { el, fmt } from '../util.js';
import { parseNumber } from './mapping.js';
import { resolveCipQuery } from '../cip/lookup.js';
import { PRESSURE_SOURCES, l6Hint, psiNote, ratePressure } from '../cip/pressure.js';

const state = {
  query: '',
  mean: '',
  shots: '',
  source: 'unbekannt',
  unit: 'bar',
  oal: '',
};

function parseBarList(text) {
  return String(text ?? '').split(/[;\s]+/).map((part) => parseNumber(part)).filter((value) => value != null);
}

function textField(label, key, placeholder) {
  return el('label', {}, label, el('input', {
    type: 'text',
    inputmode: 'decimal',
    placeholder,
    value: state[key],
    oninput: (e) => { state[key] = e.target.value; },
  }));
}

export function mountCipCheck(box, index) {
  if (!index) {
    box.replaceChildren(el('section', { class: 'card' },
      el('h2', {}, 'CIP-Prüfung'),
      el('p', { class: 'muted' }, 'Lade CIP-Werte …')));
    return;
  }
  const results = el('div');
  const search = el('input', {
    type: 'search',
    'aria-label': 'CIP-Patrone zuordnen',
    placeholder: 'Exakter Name oder Alias, z. B. 9 mm Para',
    value: state.query,
    oninput: (e) => { state.query = e.target.value; fill(); },
  });
  const mean = textField('Mittelwert (bar)', 'mean', 'z. B. 2115');
  const shots = textField('Einzelschüsse (bar)', 'shots', 'z. B. 2702,5');
  const oal = textField('Patronenlänge OAL (mm)', 'oal', 'mm');
  for (const field of [mean, shots, oal]) {
    field.querySelector('input').addEventListener('input', fill);
  }
  const source = el('select', {
    'aria-label': 'Druckquelle',
    onchange: (e) => { state.source = e.target.value; fill(); },
  }, PRESSURE_SOURCES.map((item) => el('option', { value: item, selected: item === state.source }, item)));
  const unit = el('select', {
    'aria-label': 'Druckeinheit',
    onchange: (e) => { state.unit = e.target.value; fill(); },
  }, [['bar', 'bar'], ['psi', 'psi']].map(([value, label]) => el('option', { value, selected: value === state.unit }, label)));
  const pick = el('div');
  box.replaceChildren(el('section', { class: 'card' },
    el('h2', {}, 'CIP-Prüfung'),
    el('p', { class: 'muted small' }, 'Nur ein exakter CIP-Name oder ein festgelegter Alias wird zugeordnet. Drücke in bar, Längen in mm. Keine Freigabe.'),
    el('label', {}, 'Patrone', search),
    pick,
    results,
    mean,
    shots,
    el('label', {}, 'Druckquelle', source),
    el('label', {}, 'Druckeinheit', unit),
    oal));
  fill();

  function fill() {
    const resolved = resolveCipQuery(index, state.query);
    const assigned = (resolved.status === 'exact' || resolved.status === 'alias') ? resolved.entry : null;
    pick.replaceChildren(resolved.status === 'alias' && assigned
      ? el('div', {},
        el('p', { class: 'small' }, `Alias trifft ${assigned.cartridge} und kann direkt gelten.`),
        el('button', {
          class: 'btn', type: 'button',
          onclick: () => { state.query = assigned.cartridge; search.value = assigned.cartridge; fill(); },
        }, `${assigned.cartridge} ausdrücklich wählen`))
      : resolved.status === 'none'
        ? el('p', { class: 'cip-rating hint-under', role: 'status' }, 'kein CIP-Grenzwert hinterlegt')
        : null);
    if (!assigned) { results.replaceChildren(); return; }
    const meanBar = state.unit === 'bar' ? parseNumber(state.mean) : null;
    const shotsBar = state.unit === 'bar' ? parseBarList(state.shots) : [];
    const rated = ratePressure({ pmaxBar: assigned.pmaxBar, meanBar, shotsBar });
    const parts = [
      el('p', {}, el('strong', {}, 'Zugeordnet: '), assigned.cartridge),
      el('p', {}, `Pmax ${fmt(assigned.pmaxBar, 0)} bar`),
      el('p', {}, Number.isFinite(assigned.l6Mm)
        ? `L6 ${assigned.l6Mm.toLocaleString('de-DE', { maximumFractionDigits: 2 })} mm`
        : 'L6 —'),
      el('p', { 'data-pk': String(rated.pkDisplay) }, `${rated.pkText} · ${fmt(rated.pkDisplay, 0)} bar`),
    ];
    if (state.unit === 'psi') parts.push(el('p', { class: 'cip-rating hint-under', role: 'status' }, psiNote()));
    else if (meanBar != null || shotsBar.length) {
      const tone = rated.tone === 'red' ? 'red' : rated.tone === 'yellow' ? 'yellow' : 'under';
      parts.push(el('p', { class: `cip-rating hint-${tone}`, role: 'status' }, `${rated.text} · ${state.source}`));
    }
    const hint = l6Hint(parseNumber(state.oal), assigned.l6Mm);
    if (hint) parts.push(el('p', { class: 'hint-yellow', role: 'status' }, hint));
    results.replaceChildren(...parts);
  }
}
