// Lokale Herstellerzeilen. Aufruf: node tests/mfr.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { psiNote } from '../js/cip/pressure.js';
import { describeManufacturer, MISMATCH } from '../js/mfr/apply.js';
import { ladderCharges } from '../js/mfr/ladder.js';
import { PSI_NOTE, combinationMatches, parseManufacturer, psiToBar } from '../js/mfr/parse.js';
import { mfrStore } from '../js/mfr/store.js';
import { userStore } from '../js/userdata/store.js';

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};

assert.equal(psiToBar(50000), 3447.4);
assert.equal(PSI_NOTE, psiNote());
assert.equal(PSI_NOTE, 'umgerechnet aus PSI (SAAMI-Messverfahren) – Vergleich mit CIP nur ungefähr');

const bounded = ladderCharges({ startGrain: 10, maxGrain: 12 });
assert.equal(bounded[0], 10);
assert.equal(bounded.at(-1), 12);
assert.equal(bounded.includes(11.9), true);
assert.equal(bounded.includes(12), true);
assert.equal(bounded.includes(12.1), false);
assert.ok(bounded.every((step) => step <= 12));
assert.equal(ladderCharges({ startGrain: 10.19, maxGrain: 12 })[0], 10.1);
assert.equal(ladderCharges({ startGrain: 13, maxGrain: 12 }).at(-1), 12);
assert.ok(ladderCharges({ startGrain: 13, maxGrain: 12 }).every((step) => step <= 12));

const flooredMax = ladderCharges({ startGrain: 10, maxGrain: 12.06 });
assert.equal(flooredMax.at(-1), 12);
assert.equal(flooredMax.includes(12.1), false);
assert.ok(flooredMax.every((step) => step <= 12.06));

const fromPercent = ladderCharges({ maxGrain: 42.5 });
assert.equal(fromPercent[0], 38.2);
assert.equal(fromPercent.at(-1), 42.5);
assert.ok(fromPercent.every((step) => step <= 42.5));

const sample = readFileSync(new URL('../samples/fictional-manufacturer-loads.json', import.meta.url), 'utf8');
const parsedSample = parseManufacturer(sample);
assert.equal(parsedSample.rows.length, 1);
assert.equal(parsedSample.rows[0].startChargeGrain, 10);
assert.equal(parsedSample.rows[0].maxChargeGrain, 12);
assert.equal(parsedSample.rows[0].source, 'Fiktive Beispielquelle');
assert.equal(parsedSample.rows[0].date, '2026-01-01');
assert.equal(sample.includes('data/'), false);

const grams = parseManufacturer(JSON.stringify({
  rows: [{
    cartridge: 'Fiktiv-Patrone Alpha', powder: 'FiktivPulver Blau', bulletWeight: 2.85, weightUnit: 'g',
    bulletType: 'Fiktiv FMJ', primer: 'Fiktiv Klein', coalMm: 50, startChargeGrain: 10, maxChargeGrain: 12,
    pressureBar: 1000, source: 'Fiktive Beispielquelle', date: '2026-01-01',
  }],
}));
assert.equal(grams.rows[0].bulletWeightGrain, 44);
assert.equal(grams.rows[0].bulletWeightNote, 'aus Gramm umgerechnet');

const psi = parseManufacturer(JSON.stringify({
  rows: [{
    cartridge: 'Fiktiv-Patrone Alpha', powder: 'FiktivPulver Blau', bulletWeightGrain: 100,
    bulletType: 'Fiktiv FMJ', primer: 'Fiktiv Klein', coalMm: 50, startChargeGrain: 10, maxChargeGrain: 12,
    pressurePsi: 50000, source: 'Fiktive Beispielquelle', date: '2026-01-01',
  }],
}));
assert.equal(psi.rows[0].pressureBar, 3447.4);
assert.equal(psi.rows[0].pressureOrigin, 'psi');

const unsupportedUnit = 'CUP';
const otherUnsupportedUnit = 'LUP';
const skipped = parseManufacturer(JSON.stringify({
  rows: [
    baseRow({ pressure: 1000, pressureUnit: unsupportedUnit }),
    baseRow({ pressure: 1000, pressureUnit: otherUnsupportedUnit }),
  ],
}));
assert.equal(skipped.rows.length, 2);
assert.equal(skipped.rows[0].maxChargeGrain, 12);
assert.equal(skipped.rows[0].pressureBar, null);
assert.equal(skipped.rows[1].pressureBar, null);
assert.equal(skipped.skippedPressure, 2);
assert.equal(skipped.summary, '2 Druckwerte übersprungen (Druckeinheit nicht unterstützt)');
assert.equal(skipped.summary.includes(unsupportedUnit), false);
assert.equal(skipped.summary.includes(otherUnsupportedUnit), false);
assert.equal(JSON.stringify(skipped.rows).includes(unsupportedUnit), false);
const skippedCsv = parseManufacturer(`Patrone;Pulver;Geschossgewicht [grain];Maximalladung [grain];Druck [${unsupportedUnit}]\nFiktiv-Patrone Alpha;FiktivPulver Blau;100;12;1000\n`);
assert.equal(skippedCsv.rows.length, 1);
assert.equal(skippedCsv.rows[0].pressureBar, null);
assert.equal(skippedCsv.rows[0].maxChargeGrain, 12);
assert.equal(skippedCsv.summary.includes(unsupportedUnit), false);
const kept = describeManufacturer(skipped.rows, skipped.rows[0], { pmaxBar: 2350 });
assert.equal(kept.status, 'match');
assert.equal(kept.steps.at(-1), 12);
assert.equal(kept.rating.tone, 'none');
assert.equal(kept.rating.text, '');
const near = describeManufacturer([{ ...rowPlaceholder(), pressureBar: 2115 }], rowPlaceholder(), { pmaxBar: 2350 });
assert.equal(near.rating.tone, 'yellow');
const below = describeManufacturer([{ ...rowPlaceholder(), pressureBar: 2114 }], rowPlaceholder(), { pmaxBar: 2350 });
assert.equal(below.rating.tone, 'under');

const ambiguous = parseManufacturer('Patrone;Pulver;Geschossgewicht;Startladung [gr];Maximalladung [grain]\nA;B;100;10;12\n');
assert.equal(ambiguous.error, 'Gewichtseinheit nicht eindeutig.');
assert.equal(ambiguous.rows.length, 0);

const unlabeled = parseManufacturer('Patrone;Pulver;Geschossgewicht;Maximalladung [grain];Geschossart;Zündhütchen;COAL [mm]\nA;B;100;12;FMJ;P;50\n');
assert.equal(unlabeled.error, 'Gewichtseinheit nicht eindeutig.');
assert.equal(unlabeled.rows.length, 0);

const row = parsedSample.rows[0];
assert.equal(combinationMatches(row, { ...row }), true);
assert.equal(combinationMatches(row, { ...row, primer: 'Fiktiv Andere' }), false);
const matched = describeManufacturer([row], row, { pmaxBar: 2350 });
assert.equal(matched.status, 'match');
assert.equal(matched.steps[0], 10);
assert.equal(matched.steps.at(-1), 12);
assert.equal(matched.rating.tone, 'under');
assert.equal(Object.hasOwn(matched, 'peakPressure'), false);
const hot = describeManufacturer([{ ...row, pressureBar: 4000, pressureOrigin: '' }], row, { pmaxBar: 2350 });
assert.equal(hot.rating.tone, 'red');
assert.equal(hot.rating.text, 'Überdruck – nicht zulässig');
assert.equal(hot.steps.includes(10), true);
assert.ok(hot.steps.every((step) => step < row.maxChargeGrain || step === row.maxChargeGrain));
const missed = describeManufacturer([row], { ...row, powder: 'FiktivPulver Rot' }, { pmaxBar: 2350 });
assert.equal(missed.status, 'mismatch');
assert.equal(missed.warning, MISMATCH);
assert.deepEqual(missed.steps, []);
const psiRated = describeManufacturer(psi.rows, psi.rows[0], { pmaxBar: 2350 });
assert.equal(psiRated.rating.psiNote, PSI_NOTE);
assert.equal(psiRated.rating.tone, 'red');

mfrStore.clear();
userStore.clear();
assert.equal(mfrStore.add(parsedSample.rows), 1);
assert.equal(userStore.all().length, 0);
const backup = userStore.exportJSON();
assert.equal(backup.includes('Fiktiv-Patrone Alpha'), false);
assert.equal(backup.includes(mfrStore.key), false);
assert.equal(JSON.parse(backup).kind, 'user-data-backup');
userStore.clear();
assert.equal(mfrStore.all().length, 1);
mfrStore.clear();
assert.equal(mfrStore.all().length, 0);

const product = ['js/mfr/parse.js', 'js/mfr/ladder.js', 'js/mfr/check.js', 'js/mfr/store.js', 'js/mfr/apply.js', 'js/mfr/panel.js']
  .map((file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')).join('\n');
assert.equal(/\b(?:CUP|LUP)\b/.test(product), false);
assert.equal(/simulate\(|model\.js|peakPressure/.test(readFileSync(new URL('../js/mfr/panel.js', import.meta.url), 'utf8')), false);
assert.match(readFileSync(new URL('../js/mfr/apply.js', import.meta.url), 'utf8'), /Herstellerdaten gelten nicht für diese Kombination/);
assert.match(readFileSync(new URL('../js/mfr/panel.js', import.meta.url), 'utf8'), /described\.warning/);
assert.match(readFileSync(new URL('../js/mfr/panel.js', import.meta.url), 'utf8'), /grain/);
assert.match(readFileSync(new URL('../js/mfr/panel.js', import.meta.url), 'utf8'), /Quelle/);
assert.match(readFileSync(new URL('../js/mfr/panel.js', import.meta.url), 'utf8'), /Datum/);
assert.match(readFileSync(new URL('../js/mfr/panel.js', import.meta.url), 'utf8'), /kein Druck angegeben/);
for (const file of ['js/views/simulation.js', 'js/views/optimization.js', 'js/views/userdata.js']) {
  assert.match(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), /mountManufacturer/);
}
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
assert.equal(sw.includes('samples/fictional-manufacturer-loads.json'), false);
assert.equal(sw.includes('fictional-manufacturer-loads'), false);

function rowPlaceholder() {
  return baseRow({ pressureBar: 1000 });
}

function baseRow(extra) {
  return {
    cartridge: 'Fiktiv-Patrone Alpha', powder: 'FiktivPulver Blau', bulletWeightGrain: 100,
    bulletType: 'Fiktiv FMJ', primer: 'Fiktiv Klein', coalMm: 50, startChargeGrain: 10, maxChargeGrain: 12,
    source: 'Fiktive Beispielquelle', date: '2026-01-01', ...extra,
  };
}

console.log('OK – lokale Herstellerzeilen.');
