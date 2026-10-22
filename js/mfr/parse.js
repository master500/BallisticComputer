/**
 * Herstellerladungen aus lokalem CSV oder JSON.
 * Druck nur in bar oder PSI. Jede andere Druckeinheit lässt die Zeile stehen und verwirft nur den Druck.
 * Fehlende oder „gr“-Gewichtseinheit ist nicht eindeutig.
 */
import { parseCSV } from '../userdata/csv.js';
import { parseNumber } from '../userdata/mapping.js';
import { floorTenth } from './ladder.js';

export const BAR_PER_PSI = 0.0689476;
export const GRAMS_PER_GRAIN = 0.06479891;
export const PSI_NOTE = 'umgerechnet aus PSI (SAAMI-Messverfahren) – Vergleich mit CIP nur ungefähr';
export const GRAM_NOTE = 'aus Gramm umgerechnet';

const FIELDS = [
  ['pressureUnit', ['pressureunit', 'druckeinheit']],
  ['weightUnit', ['weightunit', 'gewichtseinheit']],
  ['bulletWeight', ['bulletweightgrain', 'geschossgewichtgrain', 'bulletweightgrn', 'bulletweight', 'geschossgewicht']],
  ['startCharge', ['startchargegrain', 'startladunggrain', 'startchargegrn', 'startcharge', 'startladung']],
  ['maxCharge', ['maxchargegrain', 'maximalladunggrain', 'maxchargegrn', 'maxcharge', 'maximalladung', 'maxladung']],
  ['coal', ['coalmm', 'coal', 'patronenlaengemm', 'patronenlaenge', 'oal']],
  ['pressure', ['pressurebar', 'druckbar', 'pressurepsi', 'druckpsi', 'pressure', 'druck']],
  ['velocity', ['velocityms', 'geschwindigkeitms', 'velocity', 'geschwindigkeit']],
  ['bulletType', ['bullettype', 'geschossart']],
  ['primer', ['primer', 'zuendhuetchen']],
  ['cartridge', ['cartridge', 'patrone']],
  ['powder', ['powder', 'pulver']],
  ['source', ['sourceurl', 'sourcename', 'source', 'quelle']],
  ['edition', ['sourceedition', 'edition', 'ausgabe']],
  ['date', ['retrieved', 'datum', 'date']],
];

export function psiToBar(psi) {
  return Math.round(Number(psi) * BAR_PER_PSI * 10) / 10;
}

function normKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .replace(/[^a-z0-9]+/g, '');
}

function unitFromRest(rest) {
  if (!rest) return '';
  if (rest === 'grain' || rest === 'grn') return 'grain';
  if (rest === 'gramm' || rest === 'gram' || rest === 'g') return 'gram';
  if (rest === 'gr') return 'ambiguous';
  if (rest === 'bar' || rest === 'psi' || rest === 'mm' || rest === 'ms') return rest;
  return 'other';
}

function unitInAlias(alias) {
  for (const suffix of ['grain', 'grn', 'gramm', 'gram', 'psi', 'bar', 'mm', 'ms']) {
    if (alias.endsWith(suffix) && alias.length > suffix.length) {
      if (suffix === 'grn' || suffix === 'grain') return 'grain';
      if (suffix === 'gramm' || suffix === 'gram') return 'gram';
      return suffix;
    }
  }
  return '';
}

function classifyHeader(header) {
  const key = normKey(header);
  for (const [field, aliases] of FIELDS) {
    for (const alias of aliases) {
      if (key === alias) return { field, unit: unitInAlias(alias) };
      if (key.startsWith(alias)) {
        const unit = unitFromRest(key.slice(alias.length));
        if (unit) return { field, unit };
      }
    }
  }
  return null;
}

function asWeightUnit(unit) {
  const token = normKey(unit);
  if (!token) return 'ambiguous';
  if (token === 'grain' || token === 'grn') return 'grain';
  if (token === 'g' || token === 'gram' || token === 'gramm') return 'gram';
  if (token === 'gr') return 'ambiguous';
  return 'ambiguous';
}

function weightToGrain(value, unit, { floor = false } = {}) {
  if (value == null || value === '') return { grain: null, note: '' };
  const kind = asWeightUnit(unit);
  if (kind === 'ambiguous') return { error: 'ambiguous' };
  const n = typeof value === 'number' ? value : parseNumber(value);
  if (!Number.isFinite(n)) return { grain: null, note: '' };
  const grain = kind === 'gram'
    ? (floor ? floorTenth(n / GRAMS_PER_GRAIN) : Math.round((n / GRAMS_PER_GRAIN) * 10) / 10)
    : (floor ? floorTenth(n) : Math.round(n * 10) / 10);
  return { grain, note: kind === 'gram' ? GRAM_NOTE : '' };
}

function pressureOf(value, unit) {
  if (value == null || value === '') return { bar: null, origin: '' };
  const n = typeof value === 'number' ? value : parseNumber(value);
  if (!Number.isFinite(n)) return { bar: null, origin: '' };
  const token = normKey(unit);
  if (!token || token === 'bar') return { bar: n, origin: '' };
  if (token === 'psi') return { bar: psiToBar(n), origin: 'psi' };
  return { bar: null, origin: '', skipped: true };
}

function num(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  return parseNumber(value);
}

function normalizeRecord(raw, headerUnits) {
  const pick = (field) => raw[field];
  const weightUnit = headerUnits.bulletWeight || pick('weightUnit') || '';
  const startUnit = headerUnits.startCharge || pick('startUnit') || '';
  const maxUnit = headerUnits.maxCharge || pick('maxUnit') || '';
  const pressureUnit = pick('pressureUnit') || headerUnits.pressure || '';
  const bullet = weightToGrain(pick('bulletWeight'), weightUnit);
  const start = weightToGrain(pick('startCharge'), startUnit, { floor: true });
  const max = weightToGrain(pick('maxCharge'), maxUnit, { floor: true });
  if (bullet.error || start.error || max.error) return { error: 'ambiguous' };
  const pressure = pressureOf(pick('pressure'), pressureUnit);
  if (!String(pick('cartridge') || '').trim() || !String(pick('powder') || '').trim()) return { invalid: true };
  if (!Number.isFinite(max.grain) || !(max.grain > 0)) return { invalid: true };
  const importedAt = raw.importedAt || new Date().toISOString();
  return {
    skippedPressure: Boolean(pressure.skipped),
    row: {
      cartridge: String(pick('cartridge')).trim(),
      powder: String(pick('powder')).trim(),
      bulletWeightGrain: bullet.grain,
      bulletWeightNote: bullet.note,
      bulletType: String(pick('bulletType') || '').trim(),
      primer: String(pick('primer') || '').trim(),
      coalMm: num(pick('coal')),
      startChargeGrain: start.grain,
      maxChargeGrain: max.grain,
      chargeNote: start.note || max.note,
      pressureBar: pressure.bar,
      pressureOrigin: pressure.origin,
      velocityMs: num(pick('velocity')),
      source: String(pick('source') || '').trim(),
      edition: String(pick('edition') || '').trim(),
      date: String(pick('date') || '').trim(),
      importedAt,
    },
  };
}

function finish(rows, skippedPressure, ambiguous) {
  if (ambiguous) return { rows: [], skippedPressure: 0, summary: '', error: 'Gewichtseinheit nicht eindeutig.' };
  const summary = skippedPressure ? `${skippedPressure} Druckwerte übersprungen (Druckeinheit nicht unterstützt)` : '';
  return { rows, skippedPressure, summary, error: '' };
}

function consume(list, headerUnits) {
  const rows = [];
  let skippedPressure = 0;
  let ambiguous = false;
  for (const raw of list) {
    const result = normalizeRecord(raw, headerUnits);
    if (result.error === 'ambiguous') ambiguous = true;
    else if (result.row) {
      rows.push(result.row);
      if (result.skippedPressure) skippedPressure += 1;
    }
  }
  return finish(rows, skippedPressure, ambiguous);
}

function canonicalObject(obj) {
  const bulletFromGrain = obj.bulletWeightGrain != null;
  const startFromGrain = obj.startChargeGrain != null;
  const maxFromGrain = obj.maxChargeGrain != null;
  return {
    cartridge: obj.cartridge,
    powder: obj.powder,
    bulletWeight: obj.bulletWeightGrain ?? obj.bulletWeight ?? obj.bullet_weight,
    weightUnit: obj.weightUnit || obj.bulletWeightUnit || (bulletFromGrain ? 'grain' : ''),
    bulletType: obj.bulletType || obj.bullet_type || '',
    primer: obj.primer || '',
    coal: obj.coalMm ?? obj.coal ?? obj.oal,
    startCharge: obj.startChargeGrain ?? obj.startCharge,
    startUnit: obj.startChargeUnit || (startFromGrain ? 'grain' : ''),
    maxCharge: obj.maxChargeGrain ?? obj.maxCharge,
    maxUnit: obj.maxChargeUnit || (maxFromGrain ? 'grain' : ''),
    pressure: obj.pressureBar ?? obj.pressurePsi ?? obj.pressure,
    pressureUnit: obj.pressureUnit || (obj.pressureBar != null ? 'bar' : (obj.pressurePsi != null ? 'psi' : '')),
    velocity: obj.velocityMs ?? obj.velocity,
    source: obj.source || obj.sourceUrl || obj.sourceName || '',
    edition: obj.edition || obj.sourceEdition || '',
    date: obj.date || obj.retrieved || '',
  };
}

export function parseManufacturer(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return { rows: [], skippedPressure: 0, summary: '', error: 'Keine Daten.' };
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let data;
    try { data = JSON.parse(trimmed); }
    catch { return { rows: [], skippedPressure: 0, summary: '', error: 'JSON nicht lesbar.' }; }
    const list = Array.isArray(data) ? data : (data.rows || data.records || data.entries || []);
    if (!Array.isArray(list)) return { rows: [], skippedPressure: 0, summary: '', error: 'JSON enthält keine Zeilen.' };
    return consume(list.map(canonicalObject), {});
  }
  const table = parseCSV(trimmed);
  const classified = table.headers.map(classifyHeader);
  if (classified.some((item) => item && item.unit === 'ambiguous')) {
    return { rows: [], skippedPressure: 0, summary: '', error: 'Gewichtseinheit nicht eindeutig.' };
  }
  const headerUnits = {};
  const fields = classified.map((item) => {
    if (!item) return null;
    if (item.unit) headerUnits[item.field] = item.unit;
    return item.field;
  });
  const list = table.rows.map((cols) => {
    const raw = {};
    fields.forEach((field, index) => { if (field) raw[field] = cols[index]; });
    return raw;
  });
  return consume(list, headerUnits);
}

export function combinationMatches(row, selection) {
  if (!row || !selection) return false;
  const sameText = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();
  const missing = (value) => value == null || value === '';
  const sameNum = (a, b) => {
    if (missing(a) && missing(b)) return true;
    if (missing(a) || missing(b)) return false;
    return Number(a) === Number(b);
  };
  return sameText(row.cartridge, selection.cartridge)
    && sameText(row.powder, selection.powder)
    && sameText(row.bulletType, selection.bulletType)
    && sameText(row.primer, selection.primer)
    && sameNum(row.bulletWeightGrain, selection.bulletWeightGrain)
    && sameNum(row.coalMm, selection.coalMm);
}

export function sourceLabel(row) {
  return [row?.source, row?.edition].map((part) => String(part || '').trim()).filter(Boolean).join(', ') || 'nicht angegeben';
}
