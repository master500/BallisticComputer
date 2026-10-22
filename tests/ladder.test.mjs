// Demo-Leiter in grain, Setztiefe in mm, Grenze nur aus der Demo. Aufruf: node tests/ladder.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessSeating, buildLadder, demoBar, ladderGrainSteps, ladderNeedsRestart, ocwSelection, roundStepGrain, seatingChargeGrain, seatingDepthsMm, seatingJumpLabel } from '../js/ladder.js';
import { simulate } from '../js/model.js';

assert.equal(roundStepGrain(10.05, 10.06), 10);
assert.equal(roundStepGrain(42.5, 42.5), 42.5);
assert.equal(roundStepGrain(42.56, 42.56), 42.5);
assert.equal(roundStepGrain(38.3, 42.5), 38.3);

for (const limit of [42.5, 42.56, 10.06, 100]) {
  const steps = ladderGrainSteps(limit);
  assert.ok(steps.length > 2, String(limit));
  assert.ok(steps.every((step) => step <= limit + 1e-9), String(limit));
  assert.ok(steps.every((step) => Math.abs(step * 10 - Math.round(step * 10)) < 1e-6));
  assert.ok(steps[0] <= limit * 0.9);
  assert.equal(steps.at(-1), Math.floor((limit + 1e-9) * 10) / 10);
  assert.equal(steps.includes(0), false);
}

assert.equal(ladderGrainSteps(42.5)[0], 38.2);
assert.equal(seatingJumpLabel(-0.25), '0,25 mm in den Feldern');
assert.equal(seatingJumpLabel(1), '1 mm Sprung');
assert.equal(seatingChargeGrain(42.5), 41.2);
assert.ok(seatingChargeGrain(42.5) <= 42.5 * 0.97);
assert.deepEqual(seatingDepthsMm('none'), []);
assert.deepEqual(seatingDepthsMm(undefined), []);
const secant = seatingDepthsMm('secant');
const tangent = seatingDepthsMm('tangent');
assert.deepEqual(secant.slice(0, 5), [-0.25, 0.25, 1, 2, 3]);
assert.equal(secant[5], 3.05);
assert.equal(tangent[5], 3.13);
assert.equal(tangent.includes(3.05), false);
assert.deepEqual(seatingDepthsMm('hybrid').slice(5), seatingDepthsMm('tangent').slice(5));
const blocked = assessSeating([{ depthMm: -0.25, pressure: 120 }, { depthMm: 1, pressure: 50 }], 100);
assert.equal(blocked.seating[0].over, true);
assert.equal(blocked.seating[0].label, '0,25 mm in den Feldern');
assert.equal(blocked.seating[1].yellow, false);
assert.equal(blocked.recommendation, null);
const open = assessSeating([{ depthMm: -0.25, pressure: 95 }, { depthMm: 1, pressure: 40 }], 100);
assert.equal(open.seating[0].yellow, true);
assert.equal(open.seating[0].over, false);
assert.equal(open.recommendation.depthMm, 1);

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
const plain = db.bullets.find((item) => item.ogive_form === 'none');
const secantBullet = db.bullets.find((item) => item.ogive_form === 'secant');
const limit = db.pressure_limits[0].pmax_bar / 10;
const ladder = buildLadder({ powder, bullet, primer: db.primers[0], limitPressure: limit, run: simulate });
assert.ok(ladder.steps.length >= 3);
assert.ok(ladder.steps.every((step) => step.grain <= ladder.limitGrain + 1e-9));
assert.ok(ladder.steps.filter((step) => !step.over).every((step) => step.pressure <= limit));
assert.ok(ladder.steps.every((step) => step.over === (step.pressure > limit)));
assert.ok(ladder.steps.every((step) => step.yellow === (!step.over && step.pressure >= limit * 0.9)));
assert.equal(ladder.steps.at(-1).over || ladder.steps.at(-1).pressure <= limit, true);
assert.ok(ladder.selection);
assert.ok(ladder.seating.length > 0);
assert.equal(ladder.seating[0].label, '0,25 mm in den Feldern');
assert.equal(ladder.seating[0].depthMm, -0.25);
for (let i = 1; i < ladder.seating.length; i += 1) {
  assert.ok(ladder.seating[i].pressure < ladder.seating[i - 1].pressure, String(ladder.seating[i].depthMm));
}
assert.ok(ladder.seating.every((row) => row.over === (row.pressure > limit)));
assert.ok(ladder.seating.every((row) => row.yellow === (!row.over && row.pressure >= limit * 0.9)));
if (ladder.seating.some((row) => row.over)) assert.equal(ladder.seatingRecommendation, null);
else assert.equal(ladder.seatingRecommendation.pressure, Math.min(...ladder.seating.map((row) => row.pressure)));
assert.ok(ladder.seatingChargeGrain <= ladder.steps.filter((step) => !step.over).at(-1).grain * 0.97 + 1e-9);
assert.equal(buildLadder({ powder, bullet: plain, limitPressure: limit, run: simulate }).seating.length, 0);
assert.equal(secantBullet.ogive_form, 'secant');
assert.equal(seatingDepthsMm(secantBullet.ogive_form)[0], -0.25);
assert.equal(db.bullets.every((item) => typeof item.ogive_form === 'string' && item.ogive_form.length > 0), true);
const secantLadder = buildLadder({ powder, bullet: secantBullet, primer: db.primers[0], limitPressure: limit, run: simulate });
assert.ok(secantLadder.seating.length > 0, 'Sekanten-Geschoss führt den Setztiefentest aus');
assert.equal(secantLadder.seating[0].depthMm, -0.25);
assert.equal(secantLadder.seating[0].label, '0,25 mm in den Feldern');
assert.equal(demoBar(380), 3800);
assert.equal(demoBar(265), 2650);

const view = readFileSync(new URL('../js/views/optimization.js', import.meta.url), 'utf8');
assert.match(view, /Maximalladung = Demo-Grenze/);
const notice = 'Rechenwert – keine echten Ladedaten, keine Freigabe';
assert.equal(view.split(notice).length - 1, 2);
assert.equal(readFileSync(new URL('../js/views/simulation.js', import.meta.url), 'utf8').split(notice).length - 1, 1);
assert.equal(readFileSync(new URL('../js/views/database.js', import.meta.url), 'utf8').split(notice).length - 1, 1);
assert.equal(readFileSync(new URL('../js/views/cip.js', import.meta.url), 'utf8').includes('Rechenwert'), false);
assert.equal(/· Demo-Wert/.test(view), false);
assert.match(view, /Startladung des Herstellers/);
assert.match(view, /row\.label/);
assert.match(view, /Keine Empfehlung/);
assert.match(view, /hint-red/);
assert.match(view, /hint-yellow/);
assert.match(view, /primerChangeHint/);
assert.match(view, /magnumStandardHint/);
const ladderSource = readFileSync(new URL('../js/ladder.js', import.meta.url), 'utf8');
assert.match(ladderSource, /in den Feldern/);
assert.match(ladderSource, /mm Sprung/);
assert.equal(/cip\//.test(view), false);
assert.equal(/data\/cip|js\/cip/.test(readFileSync(new URL('../js/ladder.js', import.meta.url), 'utf8')), false);

console.log('OK – Demo-Leiter.', ladder.steps.length, 'Schritte, Auswahl', ladder.selection.grain, 'grain');
