/**
 * Datenzugriff. Lädt die simulierte Demo-Datenbank und das Ereignisprotokoll.
 * Lokal liefert server.py die Live-Dateien der Status-Routine unter /data/ aus;
 * bei statischem Hosting liegen Kopien in ./data/ (siehe scripts/sync-data.sh).
 */
const DB_URL = 'data/db.json';
const LOG_URL = 'data/log.jsonl';

/** @returns {Promise<object>} db.json (Format unverändert) */
export async function loadDb() {
  const res = await fetch(DB_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`db.json: HTTP ${res.status}`);
  const db = await res.json();
  db.powders ??= [];
  db.bullets ??= [];
  db.primers ??= [];
  db.pressure_limits ??= [];
  return db;
}

/** @returns {Promise<Array<object>>} Ereignisse aus log.jsonl (älteste zuerst) */
export async function loadLog() {
  const res = await fetch(LOG_URL, { cache: 'no-store' });
  if (!res.ok) return [];
  const text = await res.text();
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

/** Demo-Druckgrenze aus `pmax_bar`. `max` bleibt die interne Modelleinheit (bar / 10). */
export function limitFor(db, cartridge) {
  const limits = db?.pressure_limits || [];
  const found = limits.find((l) => l.cartridge === cartridge) || limits[0];
  const bar = Number(found?.pmax_bar);
  const known = Number.isFinite(bar);
  return {
    cartridge: found?.cartridge || '—',
    max: known ? bar / 10 : 380,
    bar: known ? bar : 3800,
  };
}

/** Erstes Demo-Drucklimit oder Fallback. `bar` ist die Anzeige in bar. */
export function primaryLimit(db) {
  return limitFor(db, db?.pressure_limits?.[0]?.cartridge);
}
