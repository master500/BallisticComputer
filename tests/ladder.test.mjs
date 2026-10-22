// Demo-Leiter in grain, Setztiefe in mm, Grenze nur aus der Demo. Aufruf: node tests/ladder.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLadder, demoBar, ladderGrainSteps, ladderNeedsRestart, ocwSelection, roundStepGrain, seatingChargeGrain, seatingDepthsMm } from '../js/ladder.js';
import { simulate } from '../js/model.js';

assert.equal(roundStepGrain(10.05, 10.06), 10);
assert.equal(roundStepGrain(42.5, 42.5), 42.5);
assert.equal(roundStepGrain(42.56, 42.56), 42.5);

for (const limit of [42.5, 42.56, 10.06, 100]) {
  const steps = ladderGrainSteps(limit);
  assert.ok(steps.length > 2, String(limit));
  assert.ok(steps.every((step) => step <= limit + 1e-9), String(limit));
  assert.ok(steps.every((step) => Math.abs(step * 10 - Math.round(step * 10)) < 1e-6));
  assert.ok(steps[0] >= limit * 0.9 - 0.05);
  assert.equal(steps.at(-1), Math.floor((limit + 1e-9) * 10) / 10);
  assert.equal(steps.includes(0), false);
}

assert.equal(seatingChargeGrain(42.5), 41.2);
assert.ok(seatingChargeGrain(42.5) <= 42.5 * 0.97);
assert.deepEqual(seatingDepthsMm('none'), []);
assert.deepEqual(seatingDepthsMm(undefined), []);
const secant = seatingDepthsMm('secant');
const tangent = seatingDepthsMm('tangent');
assert.deepEqual(secant.slice(0, 4), [0.25, 1, 2, 3]);
assert.equal(secant[4], 3.05);
assert.equal(tangent[4], 3.13);
assert.equal(tangent.includes(3.05), false);
assert.deepEqual(seatingDepthsMm('hybrid').slice(4), seatingDepthsMm('tangent').slice(4));

const picked = ocwSelection([
  { grain: 1, poi: 0, over: false },
  { grain: 2, poi: 5, over: false },
  { grain: 3, poi: 6, over: false },
  { grain: 4, poi: 6.2, over: false },
  { grain: 5, poi: 9, over: true },
]);
assert.equal(picked.grain, 3);

assert.equal(ladderNeedsRestart({ powderId: 'a', bulletId: 'b', primerId: 'c' }, { powderId: 'a', bulletId: 'b', primerId: 'c' }), false);
assert.equal(ladderNeedsRestart({ powderId: 'a', bulletId: 'b', primerId: 'c' }, { powderId: 'a', bulletId: 'b', primerId: 'd' }), true);
assert.equal(ladderNeedsRestart({ powderId: 'a', bulletId: 'b', primerId: 'c' }, { powderId: 'z', bulletId: 'b', primerId: 'c' }), true);
assert.equal(ladderNeedsRestart({ powderId: 'a', bulletId: 'b', primerId: 'c' }, { powderId: 'a', bulletId: 'y', primerId: 'c' }), true);

const db = JSON.parse(readFileSync(new URL('../data/db.json', import.meta.url)));
const powder = db.powders[0];
const bullet = db.bullets[0];
const plain = db.bullets.find((item) => item.sim_ogive === 'none');
const limit = db.pressure_limits[0].max_mpa_sim;
const ladder = buildLadder({ powder, bullet, primer: db.primers[0], limitPressure: limit, run: simulate });
assert.ok(ladder.steps.length >= 3);
assert.ok(ladder.steps.every((step) => step.grain <= ladder.limitGrain + 1e-9));
assert.ok(ladder.steps.filter((step) => !step.over).every((step) => step.pressure <= limit));
assert.ok(ladder.steps.every((step) => step.over === (step.pressure > limit)));
assert.ok(ladder.steps.every((step) => step.yellow === (!step.over && step.pressure >= limit * 0.9)));
assert.equal(ladder.steps.at(-1).over || ladder.steps.at(-1).pressure <= limit, true);
assert.ok(ladder.selection);
assert.ok(ladder.seating.length > 0);
assert.ok(ladder.seatingChargeGrain <= ladder.steps.filter((step) => !step.over).at(-1).grain * 0.97 + 1e-9);
assert.equal(buildLadder({ powder, bullet: plain, limitPressure: limit, run: simulate }).seating.length, 0);
assert.equal(demoBar(380), 3800);
assert.equal(demoBar(265), 2650);

const view = readFileSync(new URL('../js/views/optimization.js', import.meta.url), 'utf8');
assert.match(view, /Maximalladung = Demo-Grenze/);
assert.match(view, /Rechenwert – keine Freigabe/);
assert.match(view, /Startladung des Herstellers/);
assert.equal(/cip\//.test(view), false);
assert.equal(/data\/cip|js\/cip/.test(readFileSync(new URL('../js/ladder.js', import.meta.url), 'utf8')), false);

console.log('OK – Demo-Leiter.', ladder.steps.length, 'Schritte, Auswahl', ladder.selection.grain, 'grain');
