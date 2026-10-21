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

/** Erstes Druck-Limit (sim-MPa) oder Fallback. */
export function primaryLimit(db) {
  const l = db.pressure_limits[0];
  return l ? { cartridge: l.cartridge, max: Number(l.max_mpa_sim) } : { cartridge: '—', max: 380 };
}
