// Jede Gewichtsanzeige sagt grain. Die Oberfläche zeigt kein Gramm, kein MPa, kein Inch.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
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
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split('aus Gramm umgerechnet').join('');
  assert.equal(/MPa/.test(source), false, file);
  assert.equal(/inch/i.test(source), false, file);
  assert.equal(/gramm/i.test(source), false, file);
  assert.equal(/\bgr\b/i.test(source), false, file);
  assert.equal(/\bg\b/i.test(source), false, file);
}

assert.equal(GRAMS_PER_GRAIN, 0.06479891);
assert.equal(MODEL_FACTOR, 0.06479891);
assert.equal(1.5 / GRAMS_PER_GRAIN, 1.5 / 0.06479891);

const unitToken = /\b(?:CUP|LUP)\b/i;
const skipDirs = new Set(['.git', 'node_modules', 'tests']);
const filterFile = /(?:^|\/)js\/userdata\/grtload\.js$/;
const textFile = /\.(js|mjs|html|css|md|json|csv|txt)$/;
const hits = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (filterFile.test(path)) continue;
    else if (textFile.test(name) && unitToken.test(readFileSync(path, 'utf8'))) hits.push(path);
  }
}
walk(new URL('..', import.meta.url).pathname);
assert.deepEqual(hits, []);

const simToken = /\bsim[-_. ]/i;
const simHits = [];
const visibleRoots = ['README.md', 'CHANGELOG.md', 'SAFETY.md', 'index.html', 'js/views', 'data'];
function walkVisible(target) {
  const stat = statSync(target);
  if (stat.isDirectory()) {
    for (const name of readdirSync(target)) walkVisible(join(target, name));
    return;
  }
  if (!/\.(js|mjs|html|md|json|jsonl)$/.test(target)) return;
  const source = readFileSync(target, 'utf8');
  if (simToken.test(source) || source.includes('sim-')) simHits.push(target);
  if (/\bMPa\b|pmax_mpa/.test(source)) simHits.push(`${target} (MPa)`);
}
const root = new URL('..', import.meta.url).pathname;
for (const rel of visibleRoots) walkVisible(join(root, rel));
assert.deepEqual(simHits, []);
assert.equal(readFileSync(join(root, 'data/cip/cip_pmax_bar_tab1.json'), 'utf8').includes('pmax_bar'), true);
assert.equal(readFileSync(join(root, 'data/cip/cip_pmax_bar_tab2-5.json'), 'utf8').includes('pmax_bar'), true);

console.log('OK – Einheiten grain und bar.');
