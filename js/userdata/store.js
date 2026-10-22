/**
 * Speicherung eigener Datensätze im localStorage des Geräts.
 * Strikt getrennt von der Demo-Datenbank (db.json) und vom Simulationsmodell.
 */
const KEY = 'bc.userdata.v1';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

/** Vergleich ohne id, damit dasselbe Backup kein zweites Mal anlegt. */
export function withoutId(record) {
  const copy = structuredClone(record);
  delete copy.id;
  return copy;
}

export function dedupeRecords(existing, incoming) {
  const seen = new Set((existing || []).map((record) => JSON.stringify(withoutId(record))));
  const unique = [];
  for (const record of incoming || []) {
    const copy = withoutId(record);
    const key = JSON.stringify(copy);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(copy);
  }
  return unique;
}

export const userStore = {
  all: () => read(),
  add(records) {
    const list = read();
    const added = dedupeRecords(list, records).map((record) => ({ id: newId(), ...record }));
    write(list.concat(added));
    return added.length;
  },
  remove(id) { write(read().filter((r) => r.id !== id)); },
  update(id, patch) {
    write(read().map((record) => (record.id === id ? { ...record, ...patch } : record)));
  },
  clear() { localStorage.removeItem(KEY); },
  /** Backup als JSON-Text (wieder importierbar). */
  exportJSON() {
    return JSON.stringify({ app: 'BallisticComputer', kind: 'user-data-backup', exportedAt: new Date().toISOString(), records: read() }, null, 2);
  },
};
