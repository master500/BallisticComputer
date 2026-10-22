// V0 bis V300. Aufruf: node tests/trajectory.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { flightStore } from '../js/flight.js';
import { userStore } from '../js/userdata/store.js';
import {
  BC_DRAG_FACTOR, DEMO_BC_HINT, GRAMS_PER_GRAIN, NO_BC, atmosphere, cdOf, demoLadderStep,
  energyJoule, flightSolution, v0SourceText, velocityTable,
} from '../js/trajectory.js';

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};

assert.equal(GRAMS_PER_GRAIN, 0.06479891);
assert.equal(cdOf('G1', 1), 0.4805);
assert.equal(cdOf('G7', 0), 0.1198);

const air = atmosphere();
assert.ok(Math.abs(air.rho - 1.225) < 0.001);
assert.ok(Math.abs(air.sound - 340.29) < 0.05);

// Referenz: bei nahezu konstanter Cd aus der G1-Tabelle (BRL, JBM „More Drag Functions“)
// gilt v(s) = v0 · exp(−½ ρ · BC_DRAG_FACTOR · Cd · s / BC). V0 = 100 m/s, BC = 1, 25 m.
const v0 = 100;
const cd = cdOf('G1', v0 / air.sound);
const expected = v0 * Math.exp(-0.5 * air.rho * BC_DRAG_FACTOR * cd * 25);
const sample = velocityTable({ v0, bc: 1, drag: 'G1', massGrain: 100, maxM: 25, stepM: 25 });
assert.equal(sample.rows.length, 2);
assert.ok(Math.abs(sample.rows[1].velocity - expected) < 0.05, `${sample.rows[1].velocity} vs ${expected}`);
assert.equal(sample.rows[0].energyJ, energyJoule(100, 100));
assert.ok(Math.abs(sample.rows[0].energyJ - 32.399455) < 1e-6);

const table = velocityTable({ v0: 800, bc: 0.45, drag: 'G1', massGrain: 150 });
assert.equal(table.rows.length, 13);
assert.deepEqual(table.rows.map((row) => row.distanceM), [0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300]);
for (let i = 1; i < table.rows.length; i += 1) {
  assert.ok(table.rows[i].velocity < table.rows[i - 1].velocity);
  assert.ok(table.rows[i].energyJ < table.rows[i - 1].energyJ);
}
assert.equal(table.rows[0].velocity, 800);

const db = JSON.parse(readFileSync(new URL('../data/db.json', import.meta.url), 'utf8'));
const b08 = db.bullets.find((bullet) => bullet.id === 'B-08');
assert.equal(b08.bc_g1, 0.06);
const wad = velocityTable({
  v0: 800, bc: b08.bc_g1, drag: 'G1', massGrain: b08.mass_grain,
});
assert.equal(wad.rows.length, 13);
assert.deepEqual(wad.rows.map((row) => row.distanceM), [0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300]);
assert.ok(wad.rows[0].velocity > wad.sound);
assert.ok(wad.rows.at(-1).velocity < wad.sound);
assert.ok(wad.rows.every((row) => row.velocity > 0 && Number.isFinite(row.energyJ)));
for (let i = 1; i < wad.rows.length; i += 1) assert.ok(wad.rows[i].velocity < wad.rows[i - 1].velocity);

const missing = flightSolution({ v0Simulated: 800, massGrain: 100 });
assert.equal(missing.status, 'missing');
assert.equal(missing.text, NO_BC);
assert.equal(missing.rows.length, 0);

const demo = flightSolution({ bcG1: 0.39, bcG7: 0.195, v0Simulated: 700, massGrain: 146 });
assert.equal(demo.drag, 'G7');
assert.equal(demo.demoNote, DEMO_BC_HINT);
assert.equal(demo.rows.length, 13);
assert.equal(demo.measured, false);

const userG1 = flightSolution({
  bcG1: 0.39, bcG7: 0.195, user: { bcG1: 0.5 }, v0Simulated: 700, massGrain: 146,
});
assert.equal(userG1.drag, 'G1');
assert.equal(userG1.bc, 0.5);
assert.equal(userG1.demoNote, '');

const measured = flightSolution({
  bcG1: 0.39, user: { v0: 333 }, v0Simulated: 700, massGrain: 100,
});
assert.equal(measured.measured, true);
assert.equal(measured.rows[0].velocity, 333);
assert.equal(v0SourceText({ measured: true }), 'Meine Daten');
assert.equal(demoLadderStep(5).step, 17);
assert.equal(v0SourceText({ measured: false, step: 17, chargeText: '5,00 LE' }), 'aus Demo-Leiter, Stufe 17 · 5,00 LE');

const expectBc = {
  'B-01': [0.39, 0.195], 'B-02': [0.47, 0.24], 'B-03': [0.25, 0.12], 'B-04': [0.3, 0.15],
  'B-05': [0.455, 0.23], 'B-06': [0.18, 0.09], 'B-07': [0.17, 0.085], 'B-08': [0.06, 0.03],
};
for (const bullet of db.bullets) {
  assert.deepEqual([bullet.bc_g1, bullet.bc_g7], expectBc[bullet.id]);
}
const view = readFileSync(new URL('../js/views/simulation.js', import.meta.url), 'utf8');
const trajectory = readFileSync(new URL('../js/trajectory.js', import.meta.url), 'utf8');
assert.match(view, /V0 \$\{fmt\(solved\.v0, 1\)\} m\/s/);
assert.match(view, /Entfernung \(m\)/);
assert.match(view, /Geschwindigkeit \(m\/s\)/);
assert.match(view, /Energie \(J\)/);
assert.match(view, /solved\.text/);
assert.match(view, /demoNote/);
assert.match(trajectory, /Kein BC hinterlegt – keine Flugbahnwerte/);
assert.match(trajectory, /fiktiver Demo-BC, Rechenwert/);
assert.equal(view.includes('(sim.)'), false);
assert.equal(trajectory.includes('(sim.)'), false);
assert.match(readFileSync(new URL('../js/views/userdata.js', import.meta.url), 'utf8'), /flightStore/);

flightStore.clear();
userStore.clear();
flightStore.save({ bcG1: 0.2, v0: 400 });
const backup = userStore.exportJSON();
assert.equal(backup.includes('bc.flight'), false);
assert.equal(backup.includes('0.2'), false);
assert.equal(flightStore.read().v0, 400);
flightStore.clear();

console.log('OK – Geschwindigkeit über Entfernung.');
