/**
 * Generisches Schema für eigene Daten + Best-Effort-Zuordnung von Spalten.
 * Die Zuordnung erfolgt nur über Spaltennamen (inkl. typischer Bezeichnungen
 * aus GRT-/QuickLOAD-CSV-Exporten). Es werden keine Werte berechnet.
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
  { key: 'bullet_weight', label: 'Geschossgewicht', type: 'number', aliases: ['bulletweight', 'geschossgewicht', 'bulletmass', 'geschossmasse', 'projectilemass', 'projectileweight', 'weight', 'gewicht', 'masse', 'bulletweightgr', 'bulletweightg', 'mprojectile'] },
  { key: 'charge', label: 'Ladung', type: 'number', aliases: ['charge', 'ladung', 'pulverladung', 'ladungsmasse', 'chargeweight', 'chargemass', 'powdercharge', 'chargegr', 'chargeg', 'ladunggr', 'ladungg', 'mcharge'] },
  { key: 'coal', label: 'COAL', type: 'number', aliases: ['coal', 'col', 'oal', 'cartridgeoveralllength', 'overalllength', 'patronenlange', 'patronenlaenge', 'gesamtlange', 'gesamtlaenge', 'coalmm', 'coalin'] },
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

/**
 * Schlägt eine Zuordnung Schemafeld -> Spaltenindex vor (-1 = keine).
 * Exakte Treffer haben Vorrang vor Präfix-Treffern (z. B. "Charge [gr]").
 */
export function suggestMapping(headers) {
  const norm = headers.map(normalizeHeader);
  const used = new Set();
  const mapping = {};
  for (const pass of ['exact', 'prefix']) {
    for (const f of FIELDS) {
      if (mapping[f.key] >= 0) continue;
      let idx = -1;
      for (const alias of f.aliases) {
        idx = norm.findIndex((h, i) => !used.has(i) && !PREDICTED_HINT.test(h) && (pass === 'exact' ? h === alias : h.startsWith(alias) && alias.length >= 3));
        if (idx >= 0) break;
      }
      if (idx >= 0) { mapping[f.key] = idx; used.add(idx); }
    }
  }
  for (const f of FIELDS) if (!(mapping[f.key] >= 0)) mapping[f.key] = -1;
  return mapping;
}

/** Zahl aus Text ("42,5", "42.5 gr", "2.800") – leere/ungültige Werte -> null. */
export function parseNumber(v) {
  if (v == null) return null;
  let s = String(v).trim().replace(/[^\d.,\-]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Wendet eine Zuordnung auf Zeilen an und erzeugt Datensätze. */
export function applyMapping(rows, mapping, { fileName = 'Eingefügter Text' } = {}) {
  const importedAt = new Date().toISOString();
  return rows.map((r) => {
    const rec = {};
    for (const f of FIELDS) {
      const idx = mapping[f.key];
      const raw = idx >= 0 ? r[idx] : '';
      rec[f.key] = f.type === 'number' ? parseNumber(raw) : (raw == null ? '' : String(raw).trim());
    }
    rec.source = rec.source || '';
    rec.origin = `Eigene Daten / Import: ${fileName}`;
    rec.importedAt = importedAt;
    return rec;
  }).filter((rec) => FIELDS.some((f) => rec[f.key] !== '' && rec[f.key] != null));
}
