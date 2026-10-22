/**
 * Demo-Leiter und Setztiefe. Nur fiktive Demo-Grenzen, nie CIP.
 *
 * Anzeigeskala: 1 abstrakte Modelleinheit = 5 grain. Das ist keine echte
 * Grain-Umrechnung, nur damit die Demo-Ladung wie „42,5 grain“ aussieht.
 */
import { simulate as defaultSimulate } from './model.js';

export const GRAIN_PER_LE = 5;

/** Interner Demo-Druck → bar (Anzeige, ganze Zahlen erst beim Formatieren). */
export function demoBar(internal) {
  return Number(internal) * 10;
}

/** Jede Stufe auf 0,1 grain abgerundet. 1e-9 fängt Binärfehler ab; nie über die Grenze. */
export function roundStepGrain(value, limitGrain) {
  const top = Math.floor((limitGrain + 1e-9) * 10) / 10;
  let rounded = Math.floor(value * 10 + 1e-9) / 10;
  if (rounded - limitGrain > 1e-9) rounded = top;
  return rounded;
}

/** Start bei 90 % der Grenzladung, Schritte 0,8 % davon, Ende an der Grenze, nie darüber. */
export function ladderGrainSteps(limitGrain) {
  if (!(limitGrain > 0)) return [];
  const start = limitGrain * 0.9;
  const step = limitGrain * 0.008;
  const out = [];
  const seen = new Set();
  const push = (grain) => {
    const rounded = roundStepGrain(grain, limitGrain);
    if (!(rounded > 0) || rounded - limitGrain > 1e-9) return;
    const key = rounded.toFixed(1);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(Number(key));
  };
  if (step > 0) {
    for (let grain = start; grain < limitGrain - 1e-9; grain += step) push(grain);
  }
  push(limitGrain);
  out.sort((a, b) => a - b);
  return out;
}

export function limitChargeLe(run, input, maxPressure) {
  const pressureAt = (charge) => run({ ...input, charge }).peakPressure;
  if (pressureAt(0) > maxPressure) return 0;
  let hi = 10;
  while (pressureAt(hi) <= maxPressure && hi < 80) hi *= 1.5;
  let lo = 0;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    if (pressureAt(mid) <= maxPressure) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** −0,25 mm liegt in den Feldern, danach 0,25 / 1 / 2 / 3 mm und feine Schritte. Ohne Ogive: kein Test. */
export function seatingDepthsMm(ogive) {
  if (!ogive || ogive === 'none') return [];
  const fine = ogive === 'tangent' || ogive === 'hybrid' ? 0.13 : 0.05;
  const depths = [-0.25, 0.25, 1, 2, 3];
  for (let extra = 1; extra <= 3; extra += 1) depths.push(Math.round((3 + fine * extra) * 1000) / 1000);
  return depths;
}

/** Negativer Sprung: „0,25 mm in den Feldern“. Sonst „1 mm Sprung“. */
export function seatingJumpLabel(mm) {
  const text = Math.abs(Number(mm)).toLocaleString('de-DE', { maximumFractionDigits: 2 });
  return mm < 0 ? `${text} mm in den Feldern` : `${text} mm Sprung`;
}

/** Gelb ab 90 % der Demo-Grenze, rot darüber. Liegt eine Zeile darüber, gibt es keine Empfehlung. */
export function assessSeating(rows, limitPressure) {
  const seating = rows.map((row) => {
    const over = row.pressure > limitPressure;
    const yellow = !over && row.pressure >= limitPressure * 0.9;
    return { ...row, over, yellow, label: seatingJumpLabel(row.depthMm) };
  });
  const recommendation = seating.some((row) => row.over) || !seating.length
    ? null
    : seating.reduce((best, row) => (row.pressure < best.pressure ? row : best));
  return { seating, recommendation };
}

/** Mindestens 3 % unter dem obersten Leiter-Schritt, auf 0,1 grain abgerundet. */
export function seatingChargeGrain(topLadderGrain) {
  if (!(topLadderGrain > 0)) return 0;
  return Math.floor((topLadderGrain * 0.97 + 1e-9) * 10) / 10;
}

export function poiOf(velocity) {
  return velocity * 0.015;
}

/** Mitte der drei benachbarten Schritte mit der kleinsten simulierten Treffpunkt-Lageänderung. */
export function ocwSelection(steps) {
  const usable = steps.filter((step) => !step.over);
  if (usable.length < 3) return null;
  let best = null;
  for (let i = 0; i <= usable.length - 3; i += 1) {
    const group = usable.slice(i, i + 3);
    const shift = Math.abs(group[1].poi - group[0].poi) + Math.abs(group[2].poi - group[1].poi);
    if (!best || shift < best.shift - 1e-12) best = { shift, grain: group[1].grain, step: group[1] };
  }
  return best;
}

/** Pulver, Geschoss oder Zündhütchen: die Leiter beginnt wieder unten. */
export function ladderNeedsRestart(previous, next) {
  if (!previous || !next) return true;
  return previous.powderId !== next.powderId
    || previous.bulletId !== next.bulletId
    || previous.primerId !== next.primerId;
}

export function buildLadder({ powder, bullet, primer, limitPressure, run = defaultSimulate }) {
  const limitLe = limitChargeLe(run, { powder, bullet, primer }, limitPressure);
  const limitGrain = limitLe * GRAIN_PER_LE;
  const steps = [];
  for (const grain of ladderGrainSteps(limitGrain)) {
    const result = run({ powder, bullet, primer, charge: grain / GRAIN_PER_LE });
    const over = result.peakPressure > limitPressure;
    steps.push({
      grain,
      pressure: result.peakPressure,
      velocity: result.muzzleVelocity,
      poi: poiOf(result.muzzleVelocity),
      over,
      yellow: !over && result.peakPressure >= limitPressure * 0.9,
    });
    if (over) break;
  }
  const safe = steps.filter((step) => !step.over);
  const top = safe.length ? safe[safe.length - 1].grain : 0;
  const seatingCharge = seatingChargeGrain(top);
  const seatingInput = seatingDepthsMm(bullet?.ogive_form).map((depthMm) => {
    const result = run({
      powder, bullet, primer, seatingMm: depthMm, charge: seatingCharge / GRAIN_PER_LE,
    });
    return { depthMm, pressure: result.peakPressure };
  });
  const assessed = assessSeating(seatingInput, limitPressure);
  return {
    limitGrain,
    steps,
    selection: ocwSelection(steps),
    seatingChargeGrain: seatingCharge,
    seating: assessed.seating,
    seatingRecommendation: assessed.recommendation,
  };
}
