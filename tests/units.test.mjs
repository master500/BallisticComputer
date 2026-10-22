// Jede Gewichtsanzeige sagt grain. Die Oberfläche zeigt kein Gramm, kein MPa, kein Inch.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GRAMS_PER_GRAIN } from '../js/userdata/grtload.js';
import { GRAMS_PER_GRAIN as MODEL_FACTOR } from '../js/model.js';

const files = [
  'js/views/database.js',
  'js/views/simulation.js',
  'js/views/optimization.js',
  'js/views/userdata.js',
  'js/views/cip.js',
  'js/userdata/cipcheck.js',
  'index.html',
];
const weightViews = ['js/views/database.js', 'js/views/simulation.js', 'js/views/optimization.js', 'js/views/userdata.js'];

for (const file of weightViews) {
  assert.match(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), /grain/);
}

for (const file of files) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replaceAll('aus Gramm umgerechnet', '');
  assert.equal(/MPa/.test(source), false, file);
  assert.equal(/inch/i.test(source), false, file);
  assert.equal(/gramm/i.test(source), false, file);
  assert.equal(/\bgr\b/i.test(source), false, file);
}

assert.equal(GRAMS_PER_GRAIN, 0.06479891);
assert.equal(MODEL_FACTOR, 0.06479891);
assert.equal(1.5 / GRAMS_PER_GRAIN, 1.5 / 0.06479891);

console.log('OK – Einheiten grain und bar.');
