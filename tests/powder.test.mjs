// Pulvernamen: nur Textauswahl, nie in Simulation oder Optimierung. Aufruf: node tests/powder.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APPLICATION_LABELS, APPLICATIONS, filterPowderNames, loadSelectedPowderName, saveSelectedPowderName } from '../js/userdata/powders.js';

const catalog = JSON.parse(readFileSync(new URL('../data/powders/powder_catalog.json', import.meta.url), 'utf8'));
const entries = catalog.entries;
assert.equal(entries.length, 267);
assert.deepEqual(APPLICATIONS, ['rifle', 'handgun', 'shotshell', 'unbekannt']);

const allowed = new Set(['name', 'manufacturer', 'form', 'application', 'source', 'retrieved']);
const loadKey = /charge|pressure|velocity|burn|load|pmax|grain|beta/i;
for (const entry of entries) {
  assert.deepEqual(Object.keys(entry).filter((key) => !allowed.has(key)), []);
  assert.equal(loadKey.test(Object.keys(entry).join(',')), false, entry.name);
  for (const app of entry.application) assert.equal(APPLICATIONS.includes(app), true, entry.name);
}

assert.equal(filterPowderNames(entries, { application: 'rifle' }).length, 157);
assert.equal(filterPowderNames(entries, { application: 'unbekannt' }).length, 10);
assert.equal(filterPowderNames(entries, { application: 'unbekannt' }).includes('Norma URP'), true);
assert.equal(filterPowderNames(entries, { application: 'handgun' }).includes('Hodgdon Titegroup'), true);
assert.equal(filterPowderNames(entries, { application: 'rifle' }).includes('Hodgdon Titegroup'), false);
assert.deepEqual(filterPowderNames(entries, { query: 'varget' }), ['Hodgdon VARGET']);
assert.equal(filterPowderNames(entries, { application: 'unbekannt', query: 'norma urp' })[0], 'Norma URP');

const forbidden = /powder_catalog|userdata\/powders/;
for (const file of ['js/model.js', 'js/ladder.js', 'js/views/simulation.js', 'js/views/optimization.js']) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.equal(forbidden.test(source), false, `${file} lädt den Pulverkatalog nicht`);
}

const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
assert.match(sw, /ballisticcomputer-v1\.5\.3/);
assert.equal(sw.includes('data/powders/powder_catalog.json'), true);
assert.equal(sw.includes('js/userdata/powders.js'), true);

const view = readFileSync(new URL('../js/views/userdata.js', import.meta.url), 'utf8');
const powders = readFileSync(new URL('../js/userdata/powders.js', import.meta.url), 'utf8');
assert.match(powders, /'unbekannt'/);
assert.equal(APPLICATION_LABELS.unbekannt, 'unbekannt');
assert.equal(APPLICATION_LABELS.rifle, 'Büchse');
assert.equal(APPLICATION_LABELS.handgun, 'Kurzwaffe');
assert.equal(APPLICATION_LABELS.shotshell, 'Flinte');
assert.match(view, /APPLICATION_LABELS\[value\]/);
assert.match(view, /saveSelectedPowderName/);
assert.match(view, /Nur Namen zur Auswahl/);
assert.equal(/\bunknown\b|burn rate/i.test(view + powders), false);
assert.equal(/from ['"][^'"]*model\.js['"]|simulate\(/.test(view), false);

const safety = readFileSync(new URL('../SAFETY.md', import.meta.url), 'utf8');
assert.match(safety, /names only: no burn rates and no loads/);
assert.match(safety, /nur Namen, keine Abbrandgeschwindigkeit und keine Ladungen/);
assert.match(safety, /Leiter/);

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};
saveSelectedPowderName('Hodgdon VARGET');
assert.equal(loadSelectedPowderName(), 'Hodgdon VARGET');
assert.equal(memory.has('bc.userdata.v1'), false);
assert.equal([...memory.keys()].includes('bc.powdername.v1'), true);
saveSelectedPowderName('');
assert.equal(loadSelectedPowderName(), '');
assert.equal(memory.has('bc.powdername.v1'), false);

console.log('OK – Pulvernamen bleiben aus der Simulation.');
