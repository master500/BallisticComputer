/**
 * Generisches Schema für eigene Daten + Best-Effort-Zuordnung von Spalten.
 * Die Zuordnung erfolgt nur über Spaltennamen (inkl. typischer Bezeichnungen
 * aus GRT-/QuickLOAD-CSV-Exporten). Maßspalten werden nur bei erkennbarer Einheit umgerechnet.
 *
 * Wichtig: Generische Spalten wie "Velocity", "v0" oder "Pmax" in GRT-/QuickLOAD-
 * Exporten sind meist BERECHNETE Prognosen. Sie werden deshalb nie automatisch
 * als "gemessene v" übernommen; der Nutzer kann sie nur bewusst manuell zuordnen.
 * Spalten mit "pred", "calc", "berechn", "sim", "prognose" werden nie automatisch zugeordnet.
 */
export const PREDICTED_HINT = /(pred|calc|berechn|sim|prognos|estimat)/;
/** Spaltennamen, die typischerweise berechnete Werte enthalten (Warnhinweis in der Vorschau). */
export const LIKELY_PREDICTED = /^(velocity|geschwindigkeit|v0|muzzlevelocity|mundungsgeschwindigkeit|pmax|pressure|druck|maxpressure|gasdruck)/;
export const FIELDS = [
  { key: 'cartridge', label: 'Patrone', type: 'text', aliases: ['cartridge', 'patrone', 'kaliber', 'caliber', 'calibre', 'cart', 'cartridgename'] },
  { key: 'powder', label: 'Pulver', type: 'text', aliases: ['powder', 'pulver', 'propellant', 'treibladungspulver', 'powdername', 'pulvername'] },
  { key: 'bullet', label: 'Geschoss', type: 'text', aliases: ['bullet', 'geschoss', 'projectile', 'projektil', 'bulletname', 'geschossname', 'projectilename'] },
  { key: 'bullet_weight', label: 'Geschossgewicht (grain)', type: 'number', aliases: ['bulletweight', 'geschossgewicht', 'bulletmass', 'geschossmasse', 'projectilemass', 'projectileweight', 'weight', 'gewicht', 'masse', 'mprojectile'] },
  { key: 'charge', label: 'Ladung (grain)', type: 'number', aliases: ['charge', 'ladung', 'pulverladung', 'ladungsmasse', 'chargeweight', 'chargemass', 'powdercharge', 'mcharge'] },
  { key: 'coal', label: 'COAL (mm)', type: 'number', aliases: ['coal', 'col', 'oal', 'cartridgeoveralllength', 'overalllength', 'patronenlange', 'patronenlaenge', 'gesamtlange', 'gesamtlaenge'] },
  { key: 'measured_velocity', label: 'Gemessene v', type: 'number', aliases: ['measuredvelocity', 'gemessenev', 'gemessenegeschwindigkeit', 'velocitymeasured', 'vmeasured', 'vmess', 'v0gemessen', 'chronograph', 'chrono', 'vchrono', 'vgemessen'] },
  { key: 'notes', label: 'Druckquelle/Notizen', type: 'text', aliases: ['pressuresource', 'notes', 'notizen', 'bemerkung', 'bemerkungen', 'kommentar', 'comment', 'comments', 'druckquelle', 'remarks'] },
  { key: 'source', label: 'Quelle', type: 'text', aliases: ['source', 'quelle', 'herkunft', 'reference', 'referenz'] },
];

/** Normalisiert einen Spaltennamen: Kleinbuchstaben, Umlaute vereinfacht, nur a–z0–9. */
export function normalizeHeader(h) {
  return String(h).toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

const MEASURE_KEYS = new Set(['bullet_weight', 'charge', 'coal']);

/** 1 grain = 0,06479891 g. 1 zoll = 25,4 mm. Nur intern, die Anzeige bleibt grain und mm. */
export const GRAMS_PER_GRAIN = 0.06479891;
export const MM_PER_ZOLL = 25.4;

function classifyMeasureUnit(token) {
  const t = String(token).toLowerCase();
  if (t === 'g') return 'masse';
  if (t === 'in') return 'zoll';
  if (t === 'mm') return 'mm';
  if (t === 'grain' || t === 'grn') return 'grain';
  return null;
}

/** Einheit am Spaltenkopf: [g], (g), _g, [in], grain, grn, mm. „gr“ zählt nicht. */
export function headerMeasureUnit(header) {
  const raw = String(header ?? '');
  const bracket = raw.match(/[\[(]\s*([A-Za-z]+)\s*[\])]/);
  if (bracket) return classifyMeasureUnit(bracket[1]);
  const trimmed = raw.trim();
  if (/^(grain|grn|mm|g|in)$/i.test(trimmed)) return classifyMeasureUnit(trimmed);
  const suffix = trimmed.match(/(?:^|[\s_])(grain|grn|mm|g|in)$/i);
  return suffix ? classifyMeasureUnit(suffix[1]) : null;
}

function stripMeasureUnit(norm, unit) {
  if (unit === 'masse') return norm.replace(/g$/, '');
  if (unit === 'zoll') return norm.replace(/in$/, '');
  if (unit === 'mm') return norm.replace(/mm$/, '');
  if (unit === 'grain') return norm.replace(/(grain|grn)$/, '');
  return norm;
}

/**
 * Schlägt eine Zuordnung Schemafeld -> Spaltenindex vor (-1 = keine).
 * Gewicht, Ladung und Länge nur mit erkennbarer Einheit. Sonst wählt der Nutzer Einheit und Spalte.
 */
export function suggestMapping(headers) {
  const norm = headers.map(normalizeHeader);
  const detected = headers.map(headerMeasureUnit);
  const fieldNorm = norm.map((h, i) => (detected[i] ? stripMeasureUnit(h, detected[i]) : h));
  const used = new Set();
  const mapping = {};
  for (const pass of ['exact', 'prefix']) {
    for (const f of FIELDS) {
      if (mapping[f.key] >= 0) continue;
      if (MEASURE_KEYS.has(f.key) && pass === 'prefix') continue;
      const names = MEASURE_KEYS.has(f.key) ? fieldNorm : norm;
      let idx = -1;
      for (const alias of f.aliases) {
        idx = names.findIndex((h, i) => {
          if (used.has(i) || PREDICTED_HINT.test(norm[i])) return false;
          if (MEASURE_KEYS.has(f.key) && !detected[i]) return false;
          return pass === 'exact' ? h === alias : h.startsWith(alias) && alias.length >= 3;
        });
        if (idx >= 0) break;
      }
      if (idx >= 0) { mapping[f.key] = idx; used.add(idx); }
    }
  }
  for (const f of FIELDS) if (!(mapping[f.key] >= 0)) mapping[f.key] = -1;
  return mapping;
}

/** Erkannte Einheiten der zugeordneten Maßspalten. Leer, bis eine Einheit feststeht. */
export function unitsForMapping(headers, mapping) {
  const units = { bullet_weight: '', charge: '', coal: '' };
  for (const key of Object.keys(units)) {
    const idx = mapping[key];
    units[key] = idx >= 0 ? (headerMeasureUnit(headers[idx]) || '') : '';
  }
  return units;
}

/** grain und mm bleiben. masse und zoll werden umgerechnet und gekennzeichnet. */
export function convertMeasure(value, unit, field) {
  if (value == null || !unit) return { value: null, note: '' };
  if ((field === 'bullet_weight' || field === 'charge') && unit === 'grain') return { value, note: '' };
  if (field === 'coal' && unit === 'mm') return { value, note: '' };
  if ((field === 'bullet_weight' || field === 'charge') && unit === 'masse') {
    return { value: Math.round((value / GRAMS_PER_GRAIN) * 10) / 10, note: 'aus Gramm umgerechnet' };
  }
  if (field === 'coal' && unit === 'zoll') {
    return { value: Math.round(value * MM_PER_ZOLL * 100) / 100, note: 'umgerechnet' };
  }
  return { value: null, note: '' };
}

/** Zahl aus Text ("42,5", "42.5 gr", "2.800") – leere/ungültige Werte -> null. Punkt bleibt Dezimaltrennzeichen. */
export function parseNumber(v) {
  if (v == null) return null;
  let s = String(v).trim().replace(/[^\d.,\-]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Druck: „4.150“ und „52.000“ sind Tausender, „2702,5“ und „1.234,5“ Dezimalwerte. */
export function parsePressureNumber(v) {
  if (v == null) return null;
  let s = String(v).trim().replace(/[^\d.,\-]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) s = s.replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Wendet eine Zuordnung auf Zeilen an und erzeugt Datensätze. */
export function applyMapping(rows, mapping, { fileName = 'Eingefügter Text', units = {} } = {}) {
  const importedAt = new Date().toISOString();
  return rows.map((r) => {
    const rec = {};
    for (const f of FIELDS) {
      const idx = mapping[f.key];
      const raw = idx >= 0 ? r[idx] : '';
      if (f.type !== 'number') {
        rec[f.key] = raw == null ? '' : String(raw).trim();
        continue;
      }
      const parsed = parseNumber(raw);
      if (MEASURE_KEYS.has(f.key)) {
        const converted = convertMeasure(parsed, units[f.key], f.key);
        rec[f.key] = converted.value;
        if (converted.note) rec[`${f.key}_note`] = converted.note;
      } else rec[f.key] = parsed;
    }
    rec.source = rec.source || '';
    rec.origin = `Eigene Daten / Import: ${fileName}`;
    rec.importedAt = importedAt;
    return rec;
  }).filter((rec) => FIELDS.some((f) => rec[f.key] !== '' && rec[f.key] != null));
}
