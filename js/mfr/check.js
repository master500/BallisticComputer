/**
 * CIP-Bewertung des angegebenen Herstellerdrucks. Kein Spielzeugdruck.
 */
import { psiNote, rateMeanBar } from '../cip/pressure.js';

export function rateStated({ pmaxBar = null, pressureBar = null, origin = '' } = {}) {
  if (pressureBar == null || pressureBar === '' || !Number.isFinite(Number(pressureBar))) {
    return { tone: 'none', text: '', psiNote: '' };
  }
  const rated = rateMeanBar(Number.isFinite(Number(pmaxBar)) ? Number(pmaxBar) : NaN, Number(pressureBar));
  return {
    tone: rated.tone,
    text: rated.text,
    psiNote: origin === 'psi' ? psiNote() : '',
  };
}
