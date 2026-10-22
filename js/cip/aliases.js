/**
 * Exakte Alias-Namen für die CIP-Suche.
 * Nur Groß-/Kleinschreibung und Leerzeichen werden angeglichen – kein Teilstring.
 * Ein Treffer darf „9 mm Luger“ direkt zuordnen. Alles andere braucht eine ausdrückliche Wahl.
 */
export const CIP_ALIASES = Object.freeze({
  '9mm': '9 mm Luger',
  '9 mm': '9 mm Luger',
  '9x19': '9 mm Luger',
  '9 x 19': '9 mm Luger',
  '9 mm Para': '9 mm Luger',
  '9 mm Parabellum': '9 mm Luger',
});

/** Kleinbuchstaben, Leerzeichen entfernt. „9 mm“ und „9mm“ teilen sich denselben Schlüssel. */
export function normalizeCipKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

/** Zielpatrone oder null. Niemals ein Präfix- oder Teiltreffer. */
export function aliasCartridge(query) {
  const key = normalizeCipKey(query);
  if (!key) return null;
  for (const [alias, target] of Object.entries(CIP_ALIASES)) {
    if (normalizeCipKey(alias) === key) return target;
  }
  return null;
}
