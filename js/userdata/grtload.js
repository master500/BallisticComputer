/**
 * Gordon's Reloading Tool Projektdatei (*.grtload, XML) – nur zur Anzeige.
 *
 * Geparst wird im Browser mit DOMParser. Textwerte sind URL-kodiert
 * (decodeURIComponent). Die Ladung steht in der Datei in Kilogramm.
 * Ein numerischer Schussdruck aus der Datei wird mit Faktor 10 in bar übernommen
 * und als „berechnet (GRT)“ gekennzeichnet. Text-Platzhalter werden verworfen.
 *
 * Übernommen werden ausschließlich Anzeigefelder: Titel, Kalibername,
 * Hülsenvolumen, pMaxZul und Verfahren, Geschoss (Name, Gewicht, Länge),
 * Pulvername, Ladungen mit Notiz und gemessene Schussgeschwindigkeiten.
 * Interne Pulvermodell-Parameter (Ba, Qex, a0, …) und CIP-Zeichnungsdaten
 * werden nicht gelesen und nicht gespeichert.
 */
import { mpaToBar, psiNote, psiToBar } from '../cip/pressure.js';
import { parsePressureNumber } from './mapping.js';

/** Avoirdupois: 1 grain = 0.06479891 g. */
export const GRAMS_PER_GRAIN = 0.06479891;

export function decodeGrtValue(raw) {
  if (raw == null) return '';
  const text = String(raw);
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export function isGrtLoad(text, fileName = '') {
  if (/\.grtload$/i.test(fileName)) return true;
  return /<GordonsReloadingTool(?:\s|>)/.test(String(text).slice(0, 4000));
}

function readNumber(raw) {
  const text = decodeGrtValue(raw).trim().replace(/\s/g, '').replace(',', '.');
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function directChildren(el, tag) {
  if (!el?.children) return [];
  const out = [];
  for (const node of el.children) {
    if (node.tagName === tag) out.push(node);
  }
  return out;
}

function firstChild(el, tag) {
  return directChildren(el, tag)[0] || null;
}

function matchingInput(parent, name) {
  if (!parent || typeof parent.getElementsByTagName !== 'function') return null;
  for (const node of parent.getElementsByTagName('input')) {
    if (node.getAttribute('name') === name) return node;
  }
  return null;
}

function inputValue(parent, name) {
  const node = matchingInput(parent, name);
  return node ? decodeGrtValue(node.getAttribute('value')).trim() : '';
}

function inputNumber(parent, name) {
  const node = matchingInput(parent, name);
  return node ? readNumber(node.getAttribute('value')) : null;
}

function pressureKind(unit) {
  const token = String(unit || '').trim().toLowerCase();
  if (!token) return 'empty';
  if (token === 'bar') return 'bar';
  if (token === 'psi') return 'psi';
  if (token === 'cup' || token === 'lup') return 'drop';
  return 'label';
}

function classifyPressure(unitAttr, method) {
  const fromUnit = pressureKind(unitAttr);
  const fromMethod = pressureKind(method);
  if (fromUnit === 'drop' || fromMethod === 'drop') return { kind: 'drop', label: '' };
  if (fromUnit === 'psi' || (fromUnit !== 'bar' && fromMethod === 'psi')) return { kind: 'psi', label: '' };
  return { kind: 'bar', label: fromMethod === 'label' ? method : '' };
}

function joinParts(parts) {
  return parts.map((part) => String(part || '').trim()).filter(Boolean).join(' ');
}

function grainsFromGrams(grams) {
  return grams == null ? null : grams / GRAMS_PER_GRAIN;
}

/** Mittelwert, Stichproben-Standardabweichung (n−1) und Extremstreuung der gemessenen Schüsse. 0 und negative Werte zählen nicht. */
export function seriesStats(values) {
  const measured = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!measured.length) return null;
  const n = measured.length;
  const mean = measured.reduce((sum, value) => sum + value, 0) / n;
  if (n < 2) return { n, mean, sd: null, es: null };
  const variance = measured.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1);
  return {
    n,
    mean,
    sd: Math.sqrt(variance),
    es: Math.max(...measured) - Math.min(...measured),
  };
}

function parseCharge(node) {
  const kilograms = readNumber(node.getAttribute('value'));
  const grams = kilograms == null ? null : kilograms * 1000;
  const velocitiesMs = [];
  const bars = [];
  for (const shot of directChildren(node, 'shot')) {
    const velocity = readNumber(shot.getAttribute('velocity'));
    if (velocity != null && velocity > 0) velocitiesMs.push(velocity);
    const mpa = readNumber(shot.getAttribute('pressure'));
    if (mpa != null && mpa > 0) bars.push(mpaToBar(mpa));
  }
  return {
    name: decodeGrtValue(node.getAttribute('name')).trim(),
    note: decodeGrtValue(node.getAttribute('note')).trim(),
    kilograms,
    grams,
    grains: grainsFromGrams(grams),
    velocitiesMs,
    stats: seriesStats(velocitiesMs),
    bars,
    barOrigin: bars.length ? 'berechnet (GRT)' : '',
  };
}

/**
 * @param {string} xmlText
 * @returns {object} Anzeigedatensatz ohne Pulvermodell-Parameter
 */
export function parseGrtLoad(xmlText) {
  const Parser = globalThis.DOMParser;
  if (typeof Parser !== 'function') throw new Error('DOMParser nicht verfügbar.');
  const doc = new Parser().parseFromString(String(xmlText), 'application/xml');
  if (!doc || doc.getElementsByTagName('parsererror').length) {
    throw new Error('Die Datei ist kein gültiges XML.');
  }
  const root = doc.documentElement;
  if (!root || root.tagName !== 'GordonsReloadingTool') throw new Error('Keine GRT-Projektdatei.');
  const body = firstChild(root, 'InnerBallistikInput');
  if (!body) throw new Error('Keine GRT-Projektdatei.');

  const titleNode = firstChild(body, 'title');
  const caliber = firstChild(body, 'caliber');
  const projectile = firstChild(body, 'projectile');
  const propellant = firstChild(body, 'propellant');
  const weightG = inputNumber(projectile, 'mp');
  const charges = [];
  for (const measurement of directChildren(firstChild(body, 'appendix'), 'Measurement')) {
    for (const charge of directChildren(measurement, 'charge')) charges.push(parseCharge(charge));
  }

  const projectileName = inputValue(projectile, 'ProjectileName')
    || joinParts([inputValue(projectile, 'mname'), inputValue(projectile, 'pname')]);
  const pmaxNode = matchingInput(caliber, 'pMaxZul');
  const rawMax = pmaxNode ? parsePressureNumber(decodeGrtValue(pmaxNode.getAttribute('value'))) : null;
  const unitAttr = pmaxNode ? decodeGrtValue(pmaxNode.getAttribute('unit')).trim() : '';
  const method = inputValue(caliber, 'method');
  const pressure = classifyPressure(unitAttr, method);
  const dropped = pressure.kind === 'drop';
  const kept = dropped ? [] : charges;

  return {
    title: decodeGrtValue(titleNode ? titleNode.textContent : '').trim(),
    caliberName: inputValue(caliber, 'CaliberName'),
    caseVolumeCm3: inputNumber(caliber, 'casevol'),
    pMaxBar: dropped ? null : (pressure.kind === 'psi' && rawMax != null ? psiToBar(rawMax) : rawMax),
    pressureMethod: dropped ? '' : pressure.label,
    pressureNote: !dropped && pressure.kind === 'psi' && rawMax != null ? psiNote() : '',
    droppedUnit: dropped ? Math.max(charges.length, 1) : 0,
    summary: dropped ? `${Math.max(charges.length, 1)} Zeilen verworfen (Druckeinheit nicht unterstützt)` : '',
    charges: kept,
    projectileName,
    projectileWeightG: weightG,
    projectileWeightGr: grainsFromGrams(weightG),
    projectileLengthMm: inputNumber(projectile, 'glen'),
    propellantName: joinParts([inputValue(propellant, 'mname'), inputValue(propellant, 'pname')]),
  };
}
