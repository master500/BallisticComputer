// Freitext-Zündhütchen: Hinweis bei Änderung, keine Leistungswerte. Aufruf: node tests/primer.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRIMER_HINT, primerChangeHint, primerHintFor } from '../js/userdata/primer.js';

assert.equal(primerChangeHint('Boxer klein', 'Magnum groß'), PRIMER_HINT);
assert.equal(primerChangeHint('Boxer', '  Boxer '), '');
assert.equal(primerChangeHint('', 'Boxer'), '');
assert.equal(primerChangeHint('Boxer', ''), PRIMER_HINT);

const records = [
  { id: 'a', primer: 'Boxer Büchse Standard' },
  { id: 'b', primer: '' },
];
assert.equal(primerHintFor(records, records[1], 'Berdan Pistole Magnum'), PRIMER_HINT);
assert.equal(primerHintFor(records, records[1], 'Boxer Büchse Standard'), '');
assert.equal(primerHintFor(records, records[0], 'Boxer Büchse Standard'), '');
assert.equal(primerHintFor(records, records[0], 'Marke Beispiel'), PRIMER_HINT);

const source = readFileSync(new URL('../js/userdata/primer.js', import.meta.url), 'utf8')
  + readFileSync(new URL('../js/views/userdata.js', import.meta.url), 'utf8');
assert.match(source, /Boxer\/Berdan, klein\/groß, Büchse\/Pistole, Standard\/Magnum, Marke/);
assert.match(source, /keine Leistungswerte/);
assert.equal(/sim_ignition|Zündfaktor/.test(readFileSync(new URL('../js/views/userdata.js', import.meta.url), 'utf8')), false);

console.log('OK – Zündhütchen-Hinweis.');
