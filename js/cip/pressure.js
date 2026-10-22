/**
 * CIP-Druck- und L6-Prüfung für Meine Daten.
 * Pmax liegt in bar vor. PK wird nur gerechnet (1,15 × Pmax), nie gespeichert.
 * Die Bewertung ist nie grün und sagt nie „sicher“.
 */

export const PRESSURE_SOURCES = Object.freeze(['berechnet (GRT)', 'gemessen', 'unbekannt']);

export function pkBar(pmaxBar) {
  return pmaxBar * 115 / 100;
}

export function pkBarDisplay(pmaxBar) {
  return Math.round(pkBar(pmaxBar));
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

export function ratePressure({ pmaxBar, meanBar = null, shotsBar = [] } = {}) {
  if (!Number.isFinite(pmaxBar)) {
    return { tone: 'none', text: 'kein CIP-Grenzwert hinterlegt', pkBar: null, pkDisplay: null, pkText: 'PK ≈ 1,15 × Pmax' };
  }
  const summary = {
    pkBar: pkBar(pmaxBar),
    pkDisplay: pkBarDisplay(pmaxBar),
    pkText: 'PK ≈ 1,15 × Pmax',
  };
  if ((Number.isFinite(meanBar) && meanBar > pmaxBar) || shotsBar.some((shot) => shotExceedsPk(pmaxBar, shot))) {
    return { ...summary, tone: 'red', text: 'Überdruck – nicht zulässig' };
  }
  if (Number.isFinite(meanBar)) return { ...summary, ...rateMeanBar(pmaxBar, meanBar) };
  return { ...summary, tone: 'under', text: 'unter CIP-Pmax – Rechenwert, keine Freigabe' };
}

export function psiNote() {
  return 'nicht mit CIP vergleichbar';
}

export function l6Hint(oalMm, l6Mm) {
  if (!Number.isFinite(oalMm) || !Number.isFinite(l6Mm) || !(oalMm > l6Mm)) return null;
  return 'Über CIP-L6 – evtl. zu lang fürs Magazin, Abstand zu den Feldern prüfen';
}
