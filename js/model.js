/**
 * BallisticComputer – Spielzeug-Innenballistikmodell (DEMO).
 *
 * Vereinfachtes, lehrbuchartiges "Lumped-Parameter"-Modell mit
 * Lagrange-artiger Massenkorrektur. ALLE Konstanten sind frei erfunden und
 * NICHT kalibriert. Die Einheiten sind Pseudo-Einheiten ("sim-MPa",
 * "sim-m/s", Ladung in abstrakten "Ladungseinheiten" LE). Die Ergebnisse
 * haben keinen Bezug zu realen Waffen, Pulvern oder Ladedaten.
 *
 * Zustandsgrößen: z (verbrannter Anteil 0..1), x (Weg), v (Geschwindigkeit).
 *   p      = K * c * z / (V0 + x) - Verlust      (Gasdruck, Pseudo-Einheiten)
 *   dz/dt  = beta * p^n * (1 - z)^(2/3)          (Abbrandgesetz, Spielzeug)
 *   dv/dt  = A * p / (m + c * mc / 3)            (Lagrange-Korrektur m + C/3)
 *   dx/dt  = v
 * Integration: explizites Euler-Verfahren mit fester Schrittweite.
 */

/** Erfundene Modellkonstanten – bewusst unkalibriert. */
export const MODEL_CONSTANTS = Object.freeze({
  K: 140,          // "Gaskonstante" (Pseudo)
  V0: 1.0,         // Anfangsvolumen (Pseudo)
  A: 9.0,          // "Querschnitt" (Pseudo)
  mc: 0.12,        // Ladungsmassenfaktor für Lagrange-Korrektur (Pseudo)
  n: 0.85,         // Druckexponent im Abbrandgesetz
  p0: 5,           // Zündimpuls (sim-MPa)
  barrelLength: 6, // Lauflänge (Pseudo-Wegeinheiten)
  dt: 2e-4,        // Zeitschritt (Pseudo-Zeit)
  maxSteps: 200000,
  vScale: 5,       // Anzeige-Skalierung für sim-m/s (Pseudo)
});

/**
 * Erfundene Abbrandkoeffizienten je burn_rate_rank.
 * Rang 1 ist am schnellsten; jeder höhere Rang brennt langsamer.
 * Dieselbe Reihenfolge steht in data/db.json. `sim_beta` überschreibt den Rang.
 */
const BURN_BETA_BY_RANK = {
  1: 0.40, // extrafast
  2: 0.30, // fast
  3: 0.24, // mediumfast
  4: 0.20, // plateau
  5: 0.17, // medium
  6: 0.14, // mediumslow
  7: 0.10, // slow
  8: 0.06, // extraslow
};

/** Liefert den Abbrandkoeffizienten für ein Demo-Pulver. */
export function powderBeta(powder) {
  if (powder && typeof powder.sim_beta === 'number') return powder.sim_beta;
  const rank = powder && powder.burn_rate_rank;
  return BURN_BETA_BY_RANK[rank] ?? 0.17;
}

/**
 * Erfundener Zündfaktor eines Demo-Zündhütchens. Wirkt nur auf das Spielzeugmodell
 * (p0 und beta). Ohne Angabe bleibt der Faktor 1.
 */
export function ignitionFactor(primer) {
  if (primer && typeof primer.sim_ignition === 'number') return primer.sim_ignition;
  return 1;
}

/**
 * Pseudo-Masse eines Demo-Geschosses. Nutzt optional `sim_mass`, sonst wird
 * eine Zahl mit "g" aus dem Namen gelesen (z. B. "Demo FMJ 9.5g"), sonst 10.
 * Der Wert wird nur als dimensionslose Modellgröße verwendet.
 */
export function bulletMass(bullet) {
  if (bullet && typeof bullet.sim_mass === 'number') return bullet.sim_mass;
  const m = bullet && /([\d.]+)\s*g\b/i.exec(bullet.name || '');
  return m ? parseFloat(m[1]) : 10;
}

/**
 * Führt eine Simulation aus.
 * @param {{powder: object, bullet: object, charge: number, primer?: object, constants?: object}} input
 *        charge in Ladungseinheiten (LE, abstrakt, sinnvoll ca. 1–10).
 *        primer.sim_ignition ist ein erfundener Faktor, Standard 1.
 * @returns {{samples: Array<{t:number,x:number,v:number,p:number,z:number}>,
 *            peakPressure:number, muzzleVelocity:number, exitTime:number,
 *            burnedAtExit:number, exited:boolean}}
 */
export function simulate({ powder, bullet, charge, primer, constants = {} }) {
  const C = { ...MODEL_CONSTANTS, ...constants };
  const ignite = ignitionFactor(primer);
  const beta = powderBeta(powder) * ignite;
  const p0 = C.p0 * ignite;
  const m = bulletMass(bullet) / 10; // normiert
  const c = Math.max(0, Number(charge) || 0);
  const effMass = m + (c * C.mc) / 3;

  let t = 0, x = 0, v = 0, z = 0.001;
  let peak = 0;
  const samples = [];
  const sampleEvery = 10;

  for (let i = 0; i < C.maxSteps && x < C.barrelLength; i++) {
    // Druck: Gas aus verbranntem Anteil, verdünnt durch Expansionsvolumen.
    const p = Math.max(p0, (C.K * c * z) / (C.V0 + x));
    if (p > peak) peak = p;
    if (i % sampleEvery === 0) samples.push({ t, x, v: v * C.vScale, p, z });

    const dz = beta * Math.pow(p, C.n) * Math.pow(Math.max(0, 1 - z), 2 / 3);
    const a = (C.A * p) / effMass;
    z = Math.min(1, z + dz * C.dt);
    v += a * C.dt;
    x += v * C.dt;
    t += C.dt;
  }
  const exited = x >= C.barrelLength;
  const lastP = Math.max(p0, (C.K * c * z) / (C.V0 + x));
  samples.push({ t, x: Math.min(x, C.barrelLength), v: v * C.vScale, p: lastP, z });

  return {
    samples,
    peakPressure: peak,
    muzzleVelocity: v * C.vScale,
    exitTime: t,
    burnedAtExit: z,
    exited,
  };
}

/**
 * Einfacher Parameter-Sweep über Pulver × Geschoss × Ladung.
 * @returns {{results: Array, best: object|null}} best = höchste v unter Limit
 */
export function sweep({ powders, bullets, limit, primer, chargeMin = 1, chargeMax = 10, chargeStep = 0.25 }) {
  const results = [];
  for (const powder of powders) {
    for (const bullet of bullets) {
      for (let c = chargeMin; c <= chargeMax + 1e-9; c += chargeStep) {
        const charge = Math.round(c * 100) / 100;
        const r = simulate({ powder, bullet, primer, charge });
        results.push({
          powderId: powder.id, powderName: powder.name,
          bulletId: bullet.id, bulletName: bullet.name,
          charge,
          peakPressure: r.peakPressure,
          muzzleVelocity: r.muzzleVelocity,
          underLimit: r.peakPressure <= limit,
        });
      }
    }
  }
  const ok = results.filter((r) => r.underLimit);
  const best = ok.length ? ok.reduce((a, b) => (b.muzzleVelocity > a.muzzleVelocity ? b : a)) : null;
  return { results, best };
}
