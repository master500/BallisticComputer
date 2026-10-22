/**
 * CIP-Prüfung unter Meine Daten. Zuordnung nur per exaktem Namen oder exaktem Alias.
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

export function cipCheckCard(index, repaint) {
  if (!index) {
    return el('section', { class: 'card' },
      el('h2', {}, 'CIP-Prüfung'),
      el('p', { class: 'muted' }, 'Lade CIP-Werte …'));
  }
  const resolved = resolveCipQuery(index, state.query);
  const assigned = (resolved.status === 'exact' || resolved.status === 'alias') ? resolved.entry : null;
  const search = el('input', {
    type: 'search',
    'aria-label': 'CIP-Patrone zuordnen',
    placeholder: 'Exakter Name oder Alias, z. B. 9 mm Para',
    value: state.query,
    oninput: (e) => { state.query = e.target.value; repaint(); },
  });
  const parts = [
    el('h2', {}, 'CIP-Prüfung'),
    el('p', { class: 'muted small' }, 'Nur ein exakter CIP-Name oder ein festgelegter Alias wird zugeordnet. Drücke in bar, Längen in mm. Keine Freigabe.'),
    el('label', {}, 'Patrone', search),
  ];
  if (resolved.status === 'alias' && assigned) {
    parts.push(el('p', { class: 'small' }, `Alias trifft ${assigned.cartridge} und kann direkt gelten.`));
    parts.push(el('button', {
      class: 'btn', type: 'button',
      onclick: () => { state.query = assigned.cartridge; repaint(); },
    }, `${assigned.cartridge} ausdrücklich wählen`));
  } else if (resolved.status === 'none') {
    parts.push(el('p', { class: 'cip-rating hint-under', role: 'status' }, 'kein CIP-Grenzwert hinterlegt'));
  }

  if (assigned) {
    const rated = ratePressure({
      pmaxBar: assigned.pmaxBar,
      meanBar: state.unit === 'bar' ? parseNumber(state.mean) : null,
      shotsBar: state.unit === 'bar' ? parseBarList(state.shots) : [],
    });
    parts.push(el('p', {}, el('strong', {}, 'Zugeordnet: '), assigned.cartridge));
    parts.push(el('p', {}, `Pmax ${fmt(assigned.pmaxBar, 0)} bar`));
    parts.push(el('p', {}, Number.isFinite(assigned.l6Mm)
      ? `L6 ${assigned.l6Mm.toLocaleString('de-DE', { maximumFractionDigits: 2 })} mm`
      : 'L6 —'));
    parts.push(el('p', { 'data-pk': String(rated.pkDisplay) }, `${rated.pkText} · ${fmt(rated.pkDisplay, 0)} bar`));
    parts.push(field('Mittelwert (bar)', 'mean', 'z. B. 2115'));
    parts.push(field('Einzelschüsse (bar)', 'shots', 'z. B. 2702,5'));
    parts.push(sourceField(repaint));
    parts.push(unitField(repaint));
    parts.push(field('Patronenlänge OAL (mm)', 'oal', 'mm'));
    if (state.unit === 'psi') {
      parts.push(el('p', { class: 'cip-rating hint-under', role: 'status' }, psiNote()));
    } else if (parseNumber(state.mean) != null || parseBarList(state.shots).length) {
      parts.push(el('p', { class: `cip-rating hint-${rated.tone === 'red' ? 'red' : rated.tone === 'yellow' ? 'yellow' : 'under'}`, role: 'status' },
        `${rated.text} · ${state.source}`));
    }
    const hint = l6Hint(parseNumber(state.oal), assigned.l6Mm);
    if (hint) parts.push(el('p', { class: 'hint-yellow', role: 'status' }, hint));
  }

  return el('section', { class: 'card' }, parts);

  function field(label, key, placeholder) {
    return el('label', {}, label, el('input', {
      type: 'text', inputmode: 'decimal', placeholder, value: state[key],
      oninput: (e) => { state[key] = e.target.value; repaint(); },
    }));
  }
  function sourceField(paint) {
    return el('label', {}, 'Druckquelle', el('select', {
      'aria-label': 'Druckquelle',
      onchange: (e) => { state.source = e.target.value; paint(); },
    }, PRESSURE_SOURCES.map((source) => el('option', { value: source, selected: source === state.source }, source))));
  }
  function unitField(paint) {
    return el('label', {}, 'Druckeinheit', el('select', {
      'aria-label': 'Druckeinheit',
      onchange: (e) => { state.unit = e.target.value; paint(); },
    }, [['bar', 'bar'], ['psi', 'psi']].map(([value, label]) => el('option', {
      value, selected: value === state.unit,
    }, label))));
  }
}

export function mountCipCheck(box, index) {
  const paint = () => box.replaceChildren(cipCheckCard(index, paint));
  paint();
}
