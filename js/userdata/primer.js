/** Freitext-Hinweis, wenn sich das Zündhütchen gegenüber einem früheren Eintrag ändert. */
export const PRIMER_HINT = 'Zündhütchen geändert – Ladung neu von unten aufbauen';

export function primerChangeHint(previous, next) {
  const before = String(previous ?? '').trim();
  const after = String(next ?? '').trim();
  if (!before || before === after) return '';
  return PRIMER_HINT;
}

/** Vergleicht den Entwurf mit dem gespeicherten Text oder, falls leer, mit einem früheren Eintrag. */
export function primerHintFor(records, record, draft) {
  const own = String(record?.primer ?? '').trim();
  if (own) return primerChangeHint(own, draft);
  const previous = [...(records || [])].reverse().find((item) => item && item.id !== record?.id && String(item.primer || '').trim());
  return primerChangeHint(previous?.primer, draft);
}
