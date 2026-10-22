// Sichtbare Texte nennen keine sim-Abkürzung und kein MPa. Aufruf: node tests/units.test.mjs
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const simToken = /\bsim[-_. ]/i;
const hits = [];
const visibleRoots = ['README.md', 'CHANGELOG.md', 'SAFETY.md', 'index.html', 'js/views', 'data'];

function walk(target) {
  const stat = statSync(target);
  if (stat.isDirectory()) {
    for (const name of readdirSync(target)) walk(join(target, name));
    return;
  }
  if (!/\.(js|mjs|html|md|json|jsonl)$/.test(target)) return;
  const source = readFileSync(target, 'utf8');
  if (simToken.test(source) || source.includes('sim-')) hits.push(target);
  if (/\bMPa\b|pmax_mpa/.test(source)) hits.push(`${target} (MPa)`);
}

const root = new URL('..', import.meta.url).pathname;
for (const rel of visibleRoots) walk(join(root, rel));
assert.deepEqual(hits, []);

const db = JSON.parse(readFileSync(join(root, 'data/db.json'), 'utf8'));
for (const bullet of db.bullets) {
  assert.equal(typeof bullet.bc_g1, 'number');
  assert.equal(typeof bullet.bc_g7, 'number');
  assert.equal(typeof bullet.mass_grain, 'number');
}
for (const limit of db.pressure_limits) assert.equal(typeof limit.pmax_bar, 'number');

const notice = 'Rechenwert – keine echten Ladedaten, keine Freigabe';
const readView = (name) => readFileSync(join(root, 'js/views', name), 'utf8');
const simulation = readView('simulation.js');
const optimization = readView('optimization.js');
const database = readView('database.js');
assert.equal(simulation.split(notice).length - 1, 2);
assert.equal(optimization.split(notice).length - 1, 1);
assert.equal(database.split(notice).length - 1, 1);
assert.equal(/· Demo-Wert/.test(simulation + optimization + database), false);

console.log('OK – keine sim-Abkürzung in Oberfläche, README oder Datenfeldern.');
