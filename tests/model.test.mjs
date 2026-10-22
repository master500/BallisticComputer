// Einfache Plausibilitätstests für das Spielzeugmodell. Aufruf: node tests/model.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GRAMS_PER_GRAIN, bulletMass, powderBeta, simulate, sweep } from '../js/model.js';

const db = JSON.parse(readFileSync(new URL('../data/db.json', import.meta.url)));
const fast = db.powders.find((p) => p.burn_class === 'fast');
const slow = db.powders.find((p) => p.burn_class === 'slow');
const bullet = db.bullets[0];

const a = simulate({ powder: fast, bullet, charge: 4 });
const b = simulate({ powder: fast, bullet, charge: 6 });
assert.ok(a.exited && b.exited, 'Geschoss verlässt den Lauf');
assert.ok(b.peakPressure > a.peakPressure, 'mehr Ladung -> mehr Druck');
assert.ok(b.muzzleVelocity > a.muzzleVelocity, 'mehr Ladung -> mehr Geschwindigkeit');
assert.ok(simulate({ powder: slow, bullet, charge: 6 }).peakPressure < b.peakPressure, 'langsames Pulver -> weniger Druck');

assert.equal(db.powders.length, 8);
assert.equal(db.bullets.length, 8);
assert.deepEqual(db.pressure_limits.map((l) => l.cartridge), ['Demo-Cartridge-1', 'Demo-Cartridge-2', 'Demo-Cartridge-3', 'Demo-Cartridge-4']);
for (const powder of db.powders) assert.match(powder.name, /^DemoPowder /);
for (const item of db.bullets) assert.match(item.name, /^Demo /);
for (const limitRow of db.pressure_limits) {
  assert.match(limitRow.cartridge, /^Demo-Cartridge-/);
  assert.equal(typeof limitRow.pmax_bar, 'number');
  assert.equal(limitRow.pmax_bar % 10, 0);
}
assert.ok(Math.abs(bulletMass({ mass_grain: 4 / GRAMS_PER_GRAIN }) - 4) < 1e-9);
assert.equal(bulletMass({ name: 'Demo X 1g' }), 1);
assert.equal(powderBeta(db.powders.find((p) => p.burn_class === 'extrafast')), 0.40);
const byRank = [...db.powders].sort((a, b) => a.burn_rate_rank - b.burn_rate_rank);
assert.deepEqual(db.powders.map((p) => p.burn_rate_rank), byRank.map((p) => p.burn_rate_rank), 'db.json folgt der Rangfolge');
for (let i = 1; i < byRank.length; i++) {
  assert.ok(powderBeta({ burn_rate_rank: byRank[i].burn_rate_rank }) < powderBeta({ burn_rate_rank: byRank[i - 1].burn_rate_rank }), 'höherer Rang brennt langsamer');
}
assert.ok(simulate({ powder: db.powders.find((p) => p.burn_class === 'extrafast'), bullet, charge: 6 }).peakPressure
  > simulate({ powder: db.powders.find((p) => p.burn_class === 'extraslow'), bullet, charge: 6 }).peakPressure);

const limit = db.pressure_limits[0].pmax_bar / 10;
const { best, results } = sweep({ powders: db.powders, bullets: db.bullets, limit });
assert.ok(best && best.peakPressure <= limit, 'Bestes Ergebnis unter Limit');
assert.ok(results.every((r) => r.underLimit === (r.peakPressure <= limit)));
console.log('OK – alle Modelltests bestanden. Bestes:', best.powderName, best.bulletName, best.charge, 'LE',
  Math.round(best.muzzleVelocity), 'm/s @', Math.round(best.peakPressure * 10), 'bar');
