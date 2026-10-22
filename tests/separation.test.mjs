// Simulation und Optimierung dürfen CIP nicht importieren. Aufruf: node tests/separation.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const forbidden = /data\/cip|js\/cip|cip\/lookup|cip\/aliases|cip\/pressure|from ['"]\.\.\/cip|from ['"]\.\/cip/;
for (const file of ['js/model.js', 'js/ladder.js', 'js/views/simulation.js', 'js/views/optimization.js']) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.equal(forbidden.test(source), false, `${file} bleibt ohne CIP`);
}

const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
assert.match(sw, /ballisticcomputer-v1\.5\.4/);
for (const path of [
  'js/ladder.js',
  'js/views/cip.js',
  'js/cip/lookup.js',
  'js/cip/pressure.js',
  'js/cip/aliases.js',
  'js/userdata/cipcheck.js',
  'js/userdata/primer.js',
  'js/mfr/parse.js',
  'js/mfr/ladder.js',
  'js/mfr/panel.js',
  'data/cip/cip_pmax_tab1.json',
  'data/cip/cip_pmax_tab2-5.json',
  'data/cip/cip_l6.json',
  'data/cip/cip_l6_tab2-5.json',
]) {
  assert.equal(sw.includes(path), true, path);
}
assert.equal(sw.includes('pmax_mpa'), false);

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
assert.match(readme, /python3 server\.py --port 8080/);
assert.equal(readme.includes('chambersim/app'), false);

const roadmap = readFileSync(new URL('../ROADMAP.md', import.meta.url), 'utf8');
assert.match(roadmap, /Synthetische GRT-\/QuickLOAD-Fixtures/);
assert.equal(/Echte GRT-\/QuickLOAD-Beispielexporte/.test(roadmap), false);

const safety = readFileSync(new URL('../SAFETY.md', import.meta.url), 'utf8');
assert.match(safety, /CIP-Pmax und CIP-L6 sind nur Nachschlagewerte/);
assert.match(safety, /Simulation und Optimierung dürfen sie nicht lesen/);

console.log('OK – CIP bleibt aus der Simulation.');
