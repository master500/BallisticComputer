/**
 * Gordon's Reloading Tool Projektdatei (*.grtload, XML) – nur zur Anzeige.
 *
 * Geparst wird im Browser mit DOMParser. Textwerte sind URL-kodiert
 * (decodeURIComponent). Die Ladung steht in der Datei in Kilogramm.
 *
 * Übernommen werden ausschließlich Anzeigefelder: Titel, Kalibername,
 * Hülsenvolumen, pMaxZul und Verfahren, Geschoss (Name, Gewicht, Länge),
 * Pulvername, Ladungen mit Notiz und gemessene Schussgeschwindigkeiten.
 * Interne Pulvermodell-Parameter (Ba, Qex, a0, …) und CIP-Zeichnungsdaten
 * werden nicht gelesen und nicht gespeichert.
 */

/** Avoirdupois-Grain: 1 gr = 0.06479891 g. Nur zur Anzeige, keine Umrechnung von Drücken. */
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

function joinParts(parts) {
  return parts.map((part) => String(part || '').trim()).filter(Boolean).join(' ');
}

function grainsFromGrams(grams) {
  return grams == null ? null : grams / GRAMS_PER_GRAIN;
}

/** Mittelwert, Stichproben-Standardabweichung (n−1) und Extremstreuung der gemessenen Schüsse. */
export function seriesStats(values) {
  if (!values.length) return null;
  const n = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  if (n < 2) return { n, mean, sd: null, es: null };
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1);
  return {
    n,
    mean,
    sd: Math.sqrt(variance),
    es: Math.max(...values) - Math.min(...values),
  };
}

function parseCharge(node) {
  const kilograms = readNumber(node.getAttribute('value'));
  const grams = kilograms == null ? null : kilograms * 1000;
  const velocitiesMs = [];
  for (const shot of directChildren(node, 'shot')) {
    const velocity = readNumber(shot.getAttribute('velocity'));
    if (velocity != null) velocitiesMs.push(velocity);
  }
  return {
    name: decodeGrtValue(node.getAttribute('name')).trim(),
    note: decodeGrtValue(node.getAttribute('note')).trim(),
    kilograms,
    grams,
    grains: grainsFromGrams(grams),
    velocitiesMs,
    stats: seriesStats(velocitiesMs),
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

  return {
    title: decodeGrtValue(titleNode ? titleNode.textContent : '').trim(),
    caliberName: inputValue(caliber, 'CaliberName'),
    caseVolumeCm3: inputNumber(caliber, 'casevol'),
    pMaxBar: inputNumber(caliber, 'pMaxZul'),
    pressureMethod: inputValue(caliber, 'method'),
    projectileName,
    projectileWeightG: weightG,
    projectileWeightGr: grainsFromGrams(weightG),
    projectileLengthMm: inputNumber(projectile, 'glen'),
    propellantName: joinParts([inputValue(propellant, 'mname'), inputValue(propellant, 'pname')]),
    charges,
  };
}
