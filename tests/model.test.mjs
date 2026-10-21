// Einfache Plausibilitätstests für das Spielzeugmodell. Aufruf: node tests/model.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate, sweep } from '../js/model.js';

const db = JSON.parse(readFileSync(new URL('../data/db.json', import.meta.url)));
const [fast, , slow] = db.powders;
const bullet = db.bullets[0];

const a = simulate({ powder: fast, bullet, charge: 4 });
const b = simulate({ powder: fast, bullet, charge: 6 });
assert.ok(a.exited && b.exited, 'Geschoss verlässt den Lauf');
assert.ok(b.peakPressure > a.peakPressure, 'mehr Ladung -> mehr Druck');
assert.ok(b.muzzleVelocity > a.muzzleVelocity, 'mehr Ladung -> mehr Geschwindigkeit');
assert.ok(simulate({ powder: slow, bullet, charge: 6 }).peakPressure < b.peakPressure, 'langsames Pulver -> weniger Druck');

const limit = db.pressure_limits[0].max_mpa_sim;
const { best, results } = sweep({ powders: db.powders, bullets: db.bullets, limit });
assert.ok(best && best.peakPressure <= limit, 'Bestes Ergebnis unter Limit');
assert.ok(results.every((r) => r.underLimit === (r.peakPressure <= limit)));
console.log('OK – alle Modelltests bestanden. Bestes:', best.powderName, best.bulletName, best.charge, 'LE',
  Math.round(best.muzzleVelocity), 'sim-m/s @', Math.round(best.peakPressure), 'sim-MPa');
