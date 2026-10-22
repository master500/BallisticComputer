// Druck- und L6-Hinweise in bar. Aufruf: node tests/pressure.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCipIndex, resolveCipQuery } from '../js/cip/lookup.js';
import {
  l6Hint, mpaToBar, pkBar, pkBarDisplay, psiNote, psiToBar, rateMeanBar, ratePressure, shotExceedsPk, yellowFloorBar,
} from '../js/cip/pressure.js';
import { parseBarList } from '../js/userdata/cipcheck.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../data/cip/${name}`, import.meta.url)));
const index = buildCipIndex(
  [...read('cip_pmax_bar_tab1.json').entries, ...read('cip_pmax_bar_tab2-5.json').entries],
  [...read('cip_l6.json').entries, ...read('cip_l6_tab2-5.json').entries],
);
const luger = resolveCipQuery(index, '9 mm Luger').entry.pmaxBar;
const win = resolveCipQuery(index, '308 Win.').entry;
assert.equal(luger, 2350);
assert.equal(win.pmaxBar, 4150);
assert.equal(win.l6Mm, 71.12);

assert.equal(pkBar(luger), 2702.5);
assert.equal(pkBarDisplay(luger), 2702.5);
assert.equal(yellowFloorBar(luger), 2115);
assert.equal(pkBar(4150), 4772.5);
assert.equal(pkBarDisplay(4150), 4772.5);
assert.equal(psiToBar(50000), 3447.4);
assert.equal(mpaToBar(12.5), 125);

assert.equal(rateMeanBar(luger, 2115 - 0.01).text, 'unter CIP-Pmax – Rechenwert, keine Freigabe');
assert.equal(rateMeanBar(luger, 2115).text, 'Grenzbereich');
assert.equal(rateMeanBar(luger, 2115 + 0.01).tone, 'yellow');
assert.equal(rateMeanBar(luger, luger - 0.01).tone, 'yellow');
assert.equal(rateMeanBar(luger, luger).tone, 'yellow');
assert.equal(rateMeanBar(luger, luger + 0.01).text, 'Überdruck – nicht zulässig');

assert.equal(shotExceedsPk(luger, 2702.5), false);
assert.equal(shotExceedsPk(luger, pkBar(luger)), false);
assert.equal(shotExceedsPk(luger, pkBar(luger) + 0.01), true);
assert.equal(ratePressure({ pmaxBar: luger, meanBar: 2200, shotsBar: [2702.5] }).tone, 'yellow');
assert.equal(ratePressure({ pmaxBar: luger, meanBar: 2200, shotsBar: [pkBar(luger) + 0.01] }).tone, 'red');
assert.equal(ratePressure({ pmaxBar: luger, shotsBar: [pkBar(luger) - 0.01] }).tone === 'red', false);
assert.equal(ratePressure({ pmaxBar: luger, shotsBar: [pkBar(luger)] }).tone === 'red', false);
assert.equal(ratePressure({ pmaxBar: luger, shotsBar: [pkBar(luger) + 0.01] }).text, 'Überdruck – nicht zulässig');
assert.equal(ratePressure({ pmaxBar: luger, shotsBar: [2500] }).tone, 'yellow');
assert.notEqual(ratePressure({ pmaxBar: luger, shotsBar: [2500] }).text, 'unter CIP-Pmax – Rechenwert, keine Freigabe');
assert.equal(ratePressure({ pmaxBar: luger, shotsBar: [2702.5] }).tone, 'yellow');
assert.equal(ratePressure({ pmaxBar: luger, meanBar: 1000, shotsBar: [2500] }).tone, 'yellow');
assert.equal(ratePressure({ pmaxBar: luger, shotsBar: [1000] }).text, 'unter CIP-Pmax – Rechenwert, keine Freigabe');
assert.equal(ratePressure({ pmaxBar: luger, meanBar: psiToBar(50000) }).tone, 'red');
assert.deepEqual(parseBarList('2700,2710'), [2700, 2710]);
assert.deepEqual(parseBarList('2702,5'), [2702.5]);
assert.deepEqual(parseBarList('2700;2710'), [2700, 2710]);
assert.deepEqual(parseBarList('2700 2710'), [2700, 2710]);
assert.equal(ratePressure({ pmaxBar: luger, meanBar: pkBar(luger) - 0.01 }).tone, 'red');
assert.equal(ratePressure({ pmaxBar: luger, meanBar: pkBar(luger) }).tone, 'red');
assert.equal(ratePressure({ pmaxBar: luger, meanBar: luger }).pkText, 'PK ≈ 1,15 × Pmax');
assert.equal(ratePressure({}).text, 'kein CIP-Grenzwert hinterlegt');
assert.equal(psiNote(), 'umgerechnet aus PSI (SAAMI-Messverfahren) – Vergleich mit CIP nur ungefähr');

assert.equal(l6Hint(71.12, 71.12), null);
assert.equal(l6Hint(71.13, 71.12), 'Über CIP-L6 – evtl. zu lang fürs Magazin, Abstand zu den Feldern prüfen');
assert.equal(l6Hint(40, null), null);
assert.equal(rateMeanBar(4150, 4150).tone, 'yellow');
assert.equal(rateMeanBar(4150, 4150 * 0.9).tone, 'yellow');
assert.equal(rateMeanBar(4150, 4150 * 0.9 - 0.01).tone, 'under');

const ui = readFileSync(new URL('../js/userdata/cipcheck.js', import.meta.url), 'utf8')
  + readFileSync(new URL('../js/cip/pressure.js', import.meta.url), 'utf8');
for (const text of [
  'Überdruck – nicht zulässig',
  'Grenzbereich',
  'unter CIP-Pmax – Rechenwert, keine Freigabe',
  'kein CIP-Grenzwert hinterlegt',
  'umgerechnet aus PSI (SAAMI-Messverfahren) – Vergleich mit CIP nur ungefähr',
  'PK ≈ 1,15 × Pmax',
  'berechnet (GRT)',
  'gemessen',
  'unbekannt',
  'Über CIP-L6 – evtl. zu lang fürs Magazin, Abstand zu den Feldern prüfen',
]) {
  assert.equal(ui.includes(text), true, text);
}
assert.equal(/sicher|MPa|inch/i.test(readFileSync(new URL('../js/userdata/cipcheck.js', import.meta.url), 'utf8')), false);
assert.match(readFileSync(new URL('../js/userdata/cipcheck.js', import.meta.url), 'utf8'), /fmt\(rated\.pkDisplay, 1\)/);
assert.equal(/status === 'exact' \|\| resolved\.status === 'alias'/.test(readFileSync(new URL('../js/userdata/cipcheck.js', import.meta.url), 'utf8')), false);
assert.equal(/class: 'good'|hint-good/.test(readFileSync(new URL('../js/userdata/cipcheck.js', import.meta.url), 'utf8')), false);

console.log('OK – Druck- und L6-Hinweise.');
