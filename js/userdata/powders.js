/**
 * Pulvernamen nur als Textauswahl unter Meine Daten.
 * Keine Abbranddaten, keine Ladungen, kein Import in die Simulation.
 */
export const APPLICATIONS = Object.freeze(['rifle', 'handgun', 'shotshell', 'unbekannt']);

/** Anzeige der Filter. Die gespeicherten Werte bleiben die englischen Tokens; unbekannt bleibt unbekannt. */
export const APPLICATION_LABELS = Object.freeze({
  rifle: 'Büchse',
  handgun: 'Kurzwaffe',
  shotshell: 'Flinte',
  unbekannt: 'unbekannt',
});

const SELECTED_NAME_KEY = 'bc.powdername.v1';

export function loadSelectedPowderName() {
  try { return localStorage.getItem(SELECTED_NAME_KEY) || ''; }
  catch { return ''; }
}

export function saveSelectedPowderName(name) {
  try {
    const text = String(name ?? '');
    if (text) localStorage.setItem(SELECTED_NAME_KEY, text);
    else localStorage.removeItem(SELECTED_NAME_KEY);
  } catch { /* privater Modus */ }
}

export function filterPowderNames(entries, { application = '', query = '' } = {}) {
  const q = String(query ?? '').trim().toLowerCase();
  const names = [];
  for (const entry of entries || []) {
    const apps = Array.isArray(entry.application) ? entry.application : [];
    if (application && !apps.includes(application)) continue;
    if (q && !String(entry.name ?? '').toLowerCase().includes(q)) continue;
    names.push(entry.name);
  }
  return names;
}

export async function loadPowderCatalog(fetchImpl = globalThis.fetch) {
  const res = await fetchImpl('data/powders/powder_catalog.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`data/powders/powder_catalog.json: HTTP ${res.status}`);
  const data = await res.json();
  return data.entries || [];
}
