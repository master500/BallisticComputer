/**
 * CIP-Druck- und L6-Prüfung für Meine Daten.
 * Pmax liegt in bar vor. PK wird nur gerechnet (1,15 × Pmax), nie gespeichert.
 * Die Bewertung ist nie grün und sagt nie „sicher“.
 */

export const PRESSURE_SOURCES = Object.freeze(['berechnet (GRT)', 'gemessen', 'unbekannt']);

export function pkBar(pmaxBar) {
  return pmaxBar * 115 / 100;
}

/** Eine Nachkommastelle, 2350 bar → 2702,5. Nicht auf 2703 runden. */
export function pkBarDisplay(pmaxBar) {
  return Math.round(pkBar(pmaxBar) * 10) / 10;
}

/** 1 psi = 0,0689476 bar, Anzeige auf eine Nachkommastelle. */
export const BAR_PER_PSI = 0.0689476;

export function psiToBar(psi) {
  return Math.round(Number(psi) * BAR_PER_PSI * 10) / 10;
}

/** GRT-Schussdruck steht in der Datei in MPa und wird beim Import ×10 in bar. */
export function mpaToBar(mpa) {
  return Number(mpa) * 10;
}

export function yellowFloorBar(pmaxBar) {
  return pmaxBar * 9 / 10;
}

export function shotExceedsPk(pmaxBar, shotBar) {
  return Number.isFinite(pmaxBar) && Number.isFinite(shotBar) && shotBar > pkBar(pmaxBar);
}

export function rateMeanBar(pmaxBar, valueBar) {
  if (!Number.isFinite(pmaxBar)) return { tone: 'none', text: 'kein CIP-Grenzwert hinterlegt' };
  if (!Number.isFinite(valueBar)) return { tone: 'none', text: '' };
  if (valueBar > pmaxBar) return { tone: 'red', text: 'Überdruck – nicht zulässig' };
  if (valueBar >= yellowFloorBar(pmaxBar) && valueBar <= pmaxBar) return { tone: 'yellow', text: 'Grenzbereich' };
  return { tone: 'under', text: 'unter CIP-Pmax – Rechenwert, keine Freigabe' };
}

function rateShotBar(pmaxBar, shotBar) {
  const shot = Number(shotBar);
  if (!Number.isFinite(shot)) return null;
  if (shotExceedsPk(pmaxBar, shot)) return { tone: 'red', text: 'Überdruck – nicht zulässig' };
  if (shot > pmaxBar) return { tone: 'yellow', text: 'Grenzbereich' };
  return rateMeanBar(pmaxBar, shot);
}

const TONE_RANK = { none: 0, under: 1, yellow: 2, red: 3 };

export function ratePressure({ pmaxBar, meanBar = null, shotsBar = [] } = {}) {
  if (!Number.isFinite(pmaxBar)) {
    return { tone: 'none', text: 'kein CIP-Grenzwert hinterlegt', pkBar: null, pkDisplay: null, pkText: 'PK ≈ 1,15 × Pmax' };
  }
  const summary = {
    pkBar: pkBar(pmaxBar),
    pkDisplay: pkBarDisplay(pmaxBar),
    pkText: 'PK ≈ 1,15 × Pmax',
  };
  const parts = [];
  if (Number.isFinite(meanBar)) parts.push(rateMeanBar(pmaxBar, meanBar));
  for (const shot of shotsBar) {
    const rated = rateShotBar(pmaxBar, shot);
    if (rated && rated.tone !== 'none') parts.push(rated);
  }
  if (!parts.length) {
    return { ...summary, tone: 'under', text: 'unter CIP-Pmax – Rechenwert, keine Freigabe' };
  }
  const worst = parts.reduce((best, part) => (TONE_RANK[part.tone] > TONE_RANK[best.tone] ? part : best));
  return { ...summary, tone: worst.tone, text: worst.text };
}

export function psiNote() {
  return 'umgerechnet aus PSI (SAAMI-Messverfahren) – Vergleich mit CIP nur ungefähr';
}

export function l6Hint(oalMm, l6Mm) {
  if (!Number.isFinite(oalMm) || !Number.isFinite(l6Mm) || !(oalMm > l6Mm)) return null;
  return 'Über CIP-L6 – evtl. zu lang fürs Magazin, Abstand zu den Feldern prüfen';
}
