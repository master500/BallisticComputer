/**
 * Minimaler CSV-Parser (RFC-4180-artig) mit automatischer Trennzeichen-Erkennung
 * (`;`, `,`, Tab). Liefert { headers: string[], rows: string[][] }.
 */
export function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) || '';
  const counts = [';', ',', '\t'].map((d) => [d, firstLine.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

export function parseCSV(text, delimiter = detectDelimiter(text)) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  const [headers = [], ...body] = nonEmpty;
  return { headers: headers.map((h) => h.trim()), rows: body, delimiter };
}

function isBackupRecord(record) {
  return !!record && typeof record === 'object' && !Array.isArray(record);
}

/** Backup-Datensätze tief kopieren, ohne sie zu Text zu machen. `id` wird neu vergeben. */
export function restoreBackupRecords(records) {
  return records.filter(isBackupRecord).map((record) => {
    const copy = structuredClone(record);
    delete copy.id;
    return copy;
  });
}

/**
 * Wandelt Text (CSV oder JSON) in { headers, rows } um.
 * JSON: Array von Objekten oder { records: [...] }.
 * Ein BallisticComputer-Backup (`kind: "user-data-backup"`) bleibt strukturiert,
 * damit verschachtelte Felder (z. B. `charges` einer .grtload) erhalten bleiben.
 */
export function parseInput(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const data = JSON.parse(trimmed);
    if (data && !Array.isArray(data) && data.kind === 'user-data-backup' && Array.isArray(data.records)) {
      const records = restoreBackupRecords(data.records);
      if (!records.length) throw new Error('JSON enthält keine Datensätze.');
      return { format: 'backup', records };
    }
    const list = Array.isArray(data) ? data : (data.records || data.data || []);
    if (!Array.isArray(list) || !list.length) throw new Error('JSON enthält keine Datensätze.');
    const headers = [...new Set(list.flatMap((o) => (o && typeof o === 'object' ? Object.keys(o) : [])))];
    return {
      headers,
      rows: list.map((o) => headers.map((h) => {
        const value = o?.[h];
        return value == null ? '' : String(value);
      })),
      format: 'json',
    };
  }
  return { ...parseCSV(text), format: 'csv' };
}
