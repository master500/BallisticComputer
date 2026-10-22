/**
 * Geschwindigkeit über Entfernung, Punktmasse.
 * Cd(Mach) der Standardprojektile G1 und G7: US Army Ballistic Research Laboratory,
 * tabelliert wie bei JBM Ballistics, „More Drag Functions“.
 * Sport-BC in lb/in²: BC = Masse / (Durchmesser² · i), i = Cd / Cd_Standard.
 * Widerstand: a = ½ ρ v² Cd A / m. ICAO-Meereshöhe, falls nichts anderes gesetzt ist.
 */

export const GRAMS_PER_GRAIN = 0.06479891;
export const NO_BC = 'Kein BC hinterlegt – keine Flugbahnwerte';
export const DEMO_BC_HINT = 'fiktiver Demo-BC, Rechenwert';

/** π d² / 4 mit d in Zoll, Masse in Pfund, Ergebnis in m²/kg. */
export const BC_DRAG_FACTOR = Math.PI * (0.0254 ** 2) / (4 * 0.45359237);
const R_AIR = 287.05287;

const G1 = table([
  0, 0.2629, 0.05, 0.2558, 0.1, 0.2487, 0.15, 0.2413, 0.2, 0.2344, 0.25, 0.2278,
  0.3, 0.2214, 0.35, 0.2155, 0.4, 0.2104, 0.45, 0.2061, 0.5, 0.2032, 0.55, 0.202,
  0.6, 0.2034, 0.7, 0.2165, 0.725, 0.223, 0.75, 0.2313, 0.775, 0.2417, 0.8, 0.2546,
  0.825, 0.2706, 0.85, 0.2901, 0.875, 0.3136, 0.9, 0.3415, 0.925, 0.3734, 0.95, 0.4084,
  0.975, 0.4448, 1, 0.4805, 1.025, 0.5136, 1.05, 0.5427, 1.075, 0.5677, 1.1, 0.5883,
  1.125, 0.6053, 1.15, 0.6191, 1.2, 0.6393, 1.25, 0.6518, 1.3, 0.6589, 1.35, 0.6621,
  1.4, 0.6625, 1.45, 0.6607, 1.5, 0.6573, 1.55, 0.6528, 1.6, 0.6474, 1.65, 0.6413,
  1.7, 0.6347, 1.75, 0.628, 1.8, 0.621, 1.85, 0.6141, 1.9, 0.6072, 1.95, 0.6003,
  2, 0.5934, 2.05, 0.5867, 2.1, 0.5804, 2.15, 0.5743, 2.2, 0.5685, 2.25, 0.563,
  2.3, 0.5577, 2.35, 0.5527, 2.4, 0.5481, 2.45, 0.5438, 2.5, 0.5397, 2.6, 0.5325,
  2.7, 0.5264, 2.8, 0.5211, 2.9, 0.5168, 3, 0.5133, 3.1, 0.5105, 3.2, 0.5084,
  3.3, 0.5067, 3.4, 0.5054, 3.5, 0.504, 3.6, 0.503, 3.7, 0.5022, 3.8, 0.5016,
  3.9, 0.501, 4, 0.5006, 4.2, 0.4998, 4.4, 0.4995, 4.6, 0.4992, 4.8, 0.499, 5, 0.4988,
]);

const G7 = table([
  0, 0.1198, 0.05, 0.1197, 0.1, 0.1196, 0.15, 0.1194, 0.2, 0.1193, 0.25, 0.1194,
  0.3, 0.1194, 0.35, 0.1194, 0.4, 0.1193, 0.45, 0.1193, 0.5, 0.1194, 0.55, 0.1193,
  0.6, 0.1194, 0.65, 0.1197, 0.7, 0.1202, 0.725, 0.1207, 0.75, 0.1215, 0.775, 0.1226,
  0.8, 0.1242, 0.825, 0.1266, 0.85, 0.1306, 0.875, 0.1368, 0.9, 0.1464, 0.925, 0.166,
  0.95, 0.2054, 0.975, 0.2993, 1, 0.3803, 1.025, 0.4015, 1.05, 0.4043, 1.075, 0.4034,
  1.1, 0.4014, 1.125, 0.3987, 1.15, 0.3955, 1.2, 0.3884, 1.25, 0.381, 1.3, 0.3732,
  1.35, 0.3657, 1.4, 0.358, 1.5, 0.344, 1.55, 0.3376, 1.6, 0.3315, 1.65, 0.326,
  1.7, 0.3209, 1.75, 0.316, 1.8, 0.3117, 1.85, 0.3078, 1.9, 0.3042, 1.95, 0.301,
  2, 0.298, 2.05, 0.2951, 2.1, 0.2922, 2.15, 0.2892, 2.2, 0.2864, 2.25, 0.2835,
  2.3, 0.2807, 2.35, 0.2779, 2.4, 0.2752, 2.45, 0.2725, 2.5, 0.2697, 2.55, 0.267,
  2.6, 0.2643, 2.65, 0.2615, 2.7, 0.2588, 2.75, 0.2561, 2.8, 0.2533, 2.85, 0.2506,
  2.9, 0.2479, 2.95, 0.2451, 3, 0.2424, 3.1, 0.2368, 3.2, 0.2313, 3.3, 0.2258,
  3.4, 0.2205, 3.5, 0.2154, 3.6, 0.2106, 3.7, 0.206, 3.8, 0.2017, 3.9, 0.1975,
  4, 0.1935, 4.2, 0.1861, 4.4, 0.1793, 4.6, 0.173, 4.8, 0.1672, 5, 0.1618,
]);

const TABLES = { G1, G7 };

function table(pairs) {
  const mach = [];
  const cd = [];
  for (let i = 0; i < pairs.length; i += 2) {
    mach.push(pairs[i]);
    cd.push(pairs[i + 1]);
  }
  return { mach, cd };
}

export function cdOf(drag, mach) {
  const series = TABLES[drag] || G1;
  const x = Math.min(series.mach.at(-1), Math.max(series.mach[0], Number(mach)));
  let hi = 1;
  while (hi < series.mach.length && series.mach[hi] < x) hi += 1;
  if (hi >= series.mach.length) return series.cd.at(-1);
  const lo = hi - 1;
  const span = series.mach[hi] - series.mach[lo];
  if (!(span > 0)) return series.cd[hi];
  const t = (x - series.mach[lo]) / span;
  return series.cd[lo] + t * (series.cd[hi] - series.cd[lo]);
}

export function atmosphere({ temperatureC = 15, pressureHpa = 1013.25 } = {}) {
  const kelvin = Number(temperatureC) + 273.15;
  const pascal = Number(pressureHpa) * 100;
  const rho = pascal / (R_AIR * kelvin);
  const sound = Math.sqrt(1.4 * R_AIR * kelvin);
  return { rho, sound, temperatureC: Number(temperatureC), pressureHpa: Number(pressureHpa) };
}

export function energyJoule(massGrain, velocity) {
  if (!(massGrain > 0) || !Number.isFinite(velocity)) return null;
  const kg = massGrain * GRAMS_PER_GRAIN / 1000;
  return 0.5 * kg * velocity * velocity;
}

function positive(value) {
  const n = Number(value);
  return n > 0 ? n : null;
}

/** Ladeschritte der Demo-Ansicht: 1 LE bis 10 LE in 0,25-LE-Schritten, Stufe 1…37. */
export function demoLadderStep(charge) {
  const n = Math.round((Number(charge) - 1) / 0.25) + 1;
  const step = Math.min(37, Math.max(1, n));
  return { step, charge: Math.round((1 + (step - 1) * 0.25) * 100) / 100 };
}

export function v0SourceText({ measured = false, step = null, chargeText = '' } = {}) {
  if (measured) return 'Meine Daten';
  return `aus Demo-Leiter, Stufe ${step} · ${chargeText}`;
}

export function velocityTable({
  v0, bc, drag = 'G1', massGrain = null, temperatureC = 15, pressureHpa = 1013.25,
  stepM = 25, maxM = 300, substepM = 0.25,
} = {}) {
  const air = atmosphere({ temperatureC, pressureHpa });
  const dvds = (speed) => {
    if (!(speed > 0) || !(bc > 0)) return 0;
    const cd = cdOf(drag, speed / air.sound);
    return -0.5 * air.rho * speed * BC_DRAG_FACTOR * cd / bc;
  };
  const advance = (speed, ds) => {
    const k1 = dvds(speed);
    const k2 = dvds(speed + 0.5 * ds * k1);
    const k3 = dvds(speed + 0.5 * ds * k2);
    const k4 = dvds(speed + ds * k3);
    return Math.max(0, speed + (ds / 6) * (k1 + 2 * k2 + 2 * k3 + k4));
  };
  const rows = [];
  let velocity = Number(v0);
  let distance = 0;
  const end = Number(maxM);
  while (distance < end - 1e-9) {
    rows.push(row(distance, velocity, massGrain));
    const next = Math.min(end, distance + stepM);
    let cursor = distance;
    while (cursor < next - 1e-9) {
      const ds = Math.min(substepM, next - cursor);
      velocity = advance(velocity, ds);
      cursor += ds;
    }
    distance = next;
  }
  rows.push(row(distance, velocity, massGrain));
  return { rows, drag, bc, v0: Number(v0), sound: air.sound, rho: air.rho, massGrain };
}

function row(distanceM, velocity, massGrain) {
  return { distanceM, velocity, energyJ: energyJoule(massGrain, velocity) };
}

export function flightSolution({
  bcG1 = null, bcG7 = null, user = null, v0Simulated = null, massGrain = null,
  temperatureC = 15, pressureHpa = 1013.25,
} = {}) {
  const userG1 = positive(user?.bcG1);
  const userG7 = positive(user?.bcG7);
  const hasUserBc = userG1 != null || userG7 != null;
  const g7 = hasUserBc ? userG7 : positive(bcG7);
  const g1 = hasUserBc ? userG1 : positive(bcG1);
  if (g7 == null && g1 == null) return { status: 'missing', text: NO_BC, rows: [] };
  const drag = g7 != null ? 'G7' : 'G1';
  const bc = g7 != null ? g7 : g1;
  const measured = positive(user?.v0) != null;
  const v0 = measured ? Number(user.v0) : Number(v0Simulated);
  if (!(v0 > 0)) return { status: 'missing', text: NO_BC, rows: [] };
  const table = velocityTable({ v0, bc, drag, massGrain, temperatureC, pressureHpa });
  return {
    status: 'ok',
    text: '',
    demoNote: hasUserBc ? '' : DEMO_BC_HINT,
    measured,
    ...table,
  };
}
