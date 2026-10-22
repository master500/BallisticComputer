/**
 * CIP-Nachschlagewerte (Pmax in bar, L6 in mm).
 * Wird nur von der CIP-Tabelle und von Meine Daten gelesen, nie vom Spielzeugmodell.
 */
import { aliasCartridge, normalizeCipKey } from './aliases.js';

const PMAX_URLS = ['data/cip/cip_pmax_bar_tab1.json', 'data/cip/cip_pmax_bar_tab2-5.json'];
const L6_URLS = ['data/cip/cip_l6.json', 'data/cip/cip_l6_tab2-5.json'];

export function buildCipIndex(pmaxEntries, l6Entries) {
  const byKey = new Map();
  const rows = [];
  for (const entry of pmaxEntries) {
    const row = {
      cartridge: entry.cartridge,
      pmaxBar: Number(entry.pmax_bar),
      l6Mm: null,
      source: entry.source,
      retrieved: entry.retrieved,
    };
    byKey.set(normalizeCipKey(entry.cartridge), row);
    rows.push(row);
  }
  for (const entry of l6Entries) {
    const row = byKey.get(normalizeCipKey(entry.cartridge));
    if (row) row.l6Mm = Number(entry.l6_mm);
  }
  rows.sort((a, b) => a.cartridge.localeCompare(b.cartridge, 'de'));
  return { byKey, rows };
}

/**
 * Leere Eingabe, exakter Patronenname oder exakter Alias.
 * status: 'empty' | 'exact' | 'alias' | 'none'
 */
export function resolveCipQuery(index, query) {
  const key = normalizeCipKey(query);
  if (!key) return { status: 'empty', entry: null };
  const exact = index.byKey.get(key);
  if (exact) return { status: 'exact', entry: exact };
  const alias = aliasCartridge(query);
  if (alias) {
    const entry = index.byKey.get(normalizeCipKey(alias)) || null;
    return { status: 'alias', entry, aliasOf: alias };
  }
  return { status: 'none', entry: null };
}

/** Leere Suche zeigt die ganze Tabelle. Sonst nur der eine exakte Treffer – nie ein Teilstring. */
export function filterCipRows(index, query) {
  const resolved = resolveCipQuery(index, query);
  if (resolved.status === 'empty') return index.rows;
  if (resolved.entry) return [resolved.entry];
  return [];
}

export async function loadCipIndex(fetchImpl = globalThis.fetch) {
  const load = async (url) => {
    const res = await fetchImpl(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.json();
  };
  const [tab1, tab2, l6, l6rest] = await Promise.all([...PMAX_URLS, ...L6_URLS].map(load));
  return buildCipIndex(
    [...(tab1.entries || []), ...(tab2.entries || [])],
    [...(l6.entries || []), ...(l6rest.entries || [])],
  );
}
