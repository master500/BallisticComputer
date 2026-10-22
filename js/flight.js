/**
 * Lokal eingegebener BC und gemessene V0. Nicht im Backup der Importdaten.
 */
const KEY = 'bc.flight.v1';

function empty() {
  return { bcG1: null, bcG7: null, v0: null, temperatureC: 15, pressureHpa: 1013.25 };
}

function finiteOrNull(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export const flightStore = {
  key: KEY,
  read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      return {
        bcG1: finiteOrNull(raw.bcG1),
        bcG7: finiteOrNull(raw.bcG7),
        v0: finiteOrNull(raw.v0),
        temperatureC: finiteOrNull(raw.temperatureC) ?? 15,
        pressureHpa: finiteOrNull(raw.pressureHpa) ?? 1013.25,
      };
    } catch {
      return empty();
    }
  },
  save(partial) {
    const next = { ...this.read(), ...partial };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  },
  clear() { localStorage.removeItem(KEY); },
};
