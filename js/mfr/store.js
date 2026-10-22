/**
 * Importierte Herstellerladungen bleiben auf dem Gerät.
 * Eigener Schlüssel, nicht im Backup der übrigen Nutzerdaten.
 */
const KEY = 'bc.mfrloads.v1';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const mfrStore = {
  key: KEY,
  all: () => read(),
  add(rows) {
    const list = read();
    const added = (rows || []).map((row) => ({ id: newId(), ...row }));
    write(list.concat(added));
    return added.length;
  },
  remove(id) { write(read().filter((row) => row.id !== id)); },
  clear() { localStorage.removeItem(KEY); },
};
