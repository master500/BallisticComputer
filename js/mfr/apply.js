/**
 * Herstellerleiter nur bei exakter Kombination. Sonst keine Schritte und kein Wert über der Maximalladung.
 */
import { combinationMatches } from './parse.js';
import { ladderCharges } from './ladder.js';
import { rateStated } from './check.js';

export const MISMATCH = 'Herstellerdaten gelten nicht für diese Kombination';

export function describeManufacturer(rows, selection, { pmaxBar = null } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return { status: 'empty', warning: '', steps: [], row: null, rating: null };
  const row = list.find((item) => combinationMatches(item, selection)) || null;
  if (!row) return { status: 'mismatch', warning: MISMATCH, steps: [], row: null, rating: null };
  return {
    status: 'match',
    warning: '',
    steps: ladderCharges({ startGrain: row.startChargeGrain, maxGrain: row.maxChargeGrain }),
    row,
    rating: rateStated({ pmaxBar, pressureBar: row.pressureBar, origin: row.pressureOrigin }),
  };
}
