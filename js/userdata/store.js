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

export const userStore = {
  all: () => read(),
  add(records) {
    const list = read();
    const added = records.map((r) => ({ id: newId(), ...r }));
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
