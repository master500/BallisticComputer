/**
 * View: Meine Daten – Import, Liste, Filter und Vergleich EIGENER Datensätze
 * sowie Links zu offiziellen Quellen.
 *
 * Strikte Trennung: Diese Ansicht nutzt weder js/model.js noch db.json.
 * Es wird nichts berechnet, extrapoliert oder prognostiziert – nur angezeigt.
 */
import { el, fmt, fmtTime } from '../util.js';
import { drawLineChart } from '../chart.js';
import { parseInput } from '../userdata/csv.js';
import { FIELDS, suggestMapping, applyMapping, normalizeHeader, LIKELY_PREDICTED } from '../userdata/mapping.js';
import { userStore } from '../userdata/store.js';
import { OFFICIAL_SOURCES } from '../userdata/sources.js';

const COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#bf5af2', '#64d2ff', '#ff375f', '#ffd60a', '#ac8e68'];
const ui = { filter: '', pending: null };

export function renderUserData(root) {
  const importBox = el('div');
  const listBox = el('div');
  const compareBox = el('div');

  root.replaceChildren(
    el('section', { class: 'card notice', role: 'note' },
      el('strong', {}, 'Eigene Daten – Verantwortung beim Nutzer. Immer mit aktuellen Herstellerangaben abgleichen.'),
      el('p', { class: 'small' }, 'Diese Daten werden nur angezeigt – ohne Berechnung, Extrapolation oder Druckprognose. Sie bleiben lokal auf diesem Gerät und werden nicht in Simulation/Optimierung verwendet (dort nur fiktive Demo-Werte).')),
    importSection(importBox, refresh),
    listBox,
    compareBox,
    sourcesSection(),
  );

  function refresh() {
    renderPending(importBox, refresh);
    renderList(listBox, refresh);
    renderCompare(compareBox);
  }
  refresh();
}

/* ---------- Import ---------- */

function importSection(pendingBox, refresh) {
  const status = el('p', { class: 'muted small' });
  const fileInput = el('input', { type: 'file', accept: '.csv,.json,.txt,text/csv,application/json', class: 'file' });
  const textArea = el('textarea', { rows: 4, placeholder: 'CSV oder JSON hier einfügen …\ncartridge;powder;bullet;bullet_weight;charge;coal;measured_velocity;notes;source' });

  const start = (text, fileName) => {
    try {
      const parsed = parseInput(text);
      if (!parsed.rows.length) throw new Error('Keine Datenzeilen gefunden.');
      ui.pending = { ...parsed, fileName, mapping: suggestMapping(parsed.headers) };
      status.textContent = `${parsed.rows.length} Zeile(n) aus „${fileName}“ erkannt (${parsed.format.toUpperCase()}). Bitte Zuordnung prüfen.`;
    } catch (err) {
      ui.pending = null;
      status.textContent = `Fehler: ${err.message}`;
    }
    refresh();
  };

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (f) start(await f.text(), f.name);
    fileInput.value = '';
  });

  return el('section', { class: 'card' },
    el('h2', {}, 'Importieren'),
    el('label', {}, 'Datei wählen (CSV / JSON)', fileInput),
    el('label', {}, 'oder Text einfügen', textArea),
    el('button', { class: 'btn', type: 'button', onclick: () => textArea.value.trim() && start(textArea.value, 'Eingefügter Text') }, 'Text übernehmen'),
    status,
    pendingBox);
}

function renderPending(box, refresh) {
  const p = ui.pending;
  if (!p) { box.replaceChildren(); return; }

  const selects = FIELDS.map((f) => {
    const sel = el('select', { onchange: (e) => { p.mapping[f.key] = Number(e.target.value); refresh(); } },
      el('option', { value: -1 }, '— nicht zuordnen —'),
      p.headers.map((h, i) => el('option', { value: i, selected: p.mapping[f.key] === i }, h || `Spalte ${i + 1}`)));
    const idx = p.mapping[f.key];
    const warn = idx >= 0 && (f.key === 'measured_velocity' || f.key === 'notes') && LIKELY_PREDICTED.test(normalizeHeader(p.headers[idx]))
      ? el('div', { class: 'warn-text small' }, '⚠️ Diese Spalte enthält in GRT/QuickLOAD-Exporten oft berechnete Werte. Nur zuordnen, wenn wirklich gemessen.')
      : null;
    return el('div', { class: 'map-row' }, el('span', { class: 'small' }, f.label), sel, warn);
  });

  const preview = applyMapping(p.rows.slice(0, 5), p.mapping, { fileName: p.fileName });
  box.replaceChildren(
    el('div', { class: 'mapping' },
      el('h3', {}, 'Spaltenzuordnung'),
      el('p', { class: 'muted small' }, `Erkannte Spalten: ${p.headers.join(' · ')}`),
      selects,
      el('h3', {}, 'Vorschau (erste 5)'),
      recordTable(preview, { compact: true }),
      el('div', { class: 'row-btns' },
        el('button', { class: 'btn primary', type: 'button', onclick: () => {
          const recs = applyMapping(p.rows, p.mapping, { fileName: p.fileName });
          const n = userStore.add(recs);
          ui.pending = null;
          refresh();
          toast(`${n} Datensatz/Datensätze gespeichert.`);
        } }, `${p.rows.length} speichern`),
        el('button', { class: 'btn', type: 'button', onclick: () => { ui.pending = null; refresh(); } }, 'Abbrechen'))));
}

/* ---------- Liste ---------- */

function matches(r, q) {
  if (!q) return true;
  const hay = `${r.cartridge} ${r.powder} ${r.bullet} ${r.source} ${r.notes} ${r.origin}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).every((t) => hay.includes(t));
}

function renderList(box, refresh) {
  const all = userStore.all();
  const count = el('p', { class: 'muted small' });
  const ul = el('ul', { class: 'list records' });
  const fill = () => {
    const shown = all.filter((r) => matches(r, ui.filter));
    count.textContent = all.length ? `${shown.length} von ${all.length} angezeigt` : 'Noch keine eigenen Daten importiert.';
    ul.replaceChildren(...shown.map((r) => recordItem(r, refresh)));
  };
  const search = el('input', { type: 'search', placeholder: 'Suchen: Patrone, Pulver, Geschoss, Quelle …', value: ui.filter,
    oninput: (e) => { ui.filter = e.target.value; fill(); renderCompareFromBox(); } });
  fill();

  box.replaceChildren(el('section', { class: 'card' },
    el('h2', {}, 'Meine Datensätze ', el('span', { class: 'badge' }, all.length)),
    all.length ? search : null,
    count,
    ul,
    all.length ? el('div', { class: 'row-btns' },
      el('button', { class: 'btn', type: 'button', onclick: exportBackup }, 'Backup (JSON) exportieren'),
      el('button', { class: 'btn danger', type: 'button', onclick: () => { if (confirm('Alle eigenen Daten auf diesem Gerät löschen?')) { userStore.clear(); refresh(); } } }, 'Alle löschen')) : null));
}

function recordItem(r, refresh) {
  return el('li', {},
    el('div', { class: 'rec' },
      el('strong', {}, [r.cartridge, r.powder].filter(Boolean).join(' · ') || '—'),
      el('div', { class: 'small' }, [r.bullet, r.bullet_weight != null ? `${fmt(r.bullet_weight, 1)} (Gew.)` : null].filter(Boolean).join(' · ')),
      el('div', { class: 'small' },
        `Ladung ${r.charge != null ? fmt(r.charge, 2) : '—'} · COAL ${r.coal != null ? fmt(r.coal, 2) : '—'} · v gemessen ${r.measured_velocity != null ? fmt(r.measured_velocity) : '—'}`),
      r.notes ? el('div', { class: 'muted small' }, r.notes) : null,
      el('div', { class: 'origin small' }, r.origin, r.source ? ` · Quelle: ${r.source}` : '', ` · ${fmtTime(r.importedAt)}`)),
    el('button', { class: 'icon-btn small-btn', type: 'button', 'aria-label': 'Löschen',
      onclick: () => { if (confirm('Datensatz löschen?')) { userStore.remove(r.id); refresh(); } } }, '🗑'));
}

let compareBoxRef = null;
const renderCompareFromBox = () => compareBoxRef && renderCompare(compareBoxRef);

function exportBackup() {
  const blob = new Blob([userStore.exportJSON()], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `ballisticcomputer-eigene-daten-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Vergleich ---------- */

function renderCompare(box) {
  compareBoxRef = box;
  const recs = userStore.all().filter((r) => matches(r, ui.filter) && r.charge != null && r.measured_velocity != null);
  if (!recs.length) { box.replaceChildren(); return; }
  const groups = new Map();
  for (const r of recs) {
    const k = [r.cartridge, r.powder, r.bullet].filter(Boolean).join(' / ') || 'ohne Angabe';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const canvas = el('canvas', { class: 'chart' });
  const keys = [...groups.keys()];
  box.replaceChildren(el('section', { class: 'card' },
    el('h2', {}, 'Vergleich: gemessene v über Ladung'),
    el('p', { class: 'muted small' }, 'Nur deine Messpunkte – keine Verbindungslinien, keine Extrapolation.'),
    canvas,
    el('div', { class: 'legend' }, keys.map((k, i) => el('span', {}, el('i', { style: `background:${COLORS[i % COLORS.length]}` }), k))),
    el('h3', {}, 'Tabelle'),
    recordTable([...recs].sort((a, b) => (a.cartridge || '').localeCompare(b.cartridge || '') || a.charge - b.charge), { compare: true })));
  requestAnimationFrame(() => drawLineChart(canvas, {
    series: keys.map((k, i) => ({ color: COLORS[i % COLORS.length], dots: true, points: groups.get(k).map((r) => [r.charge, r.measured_velocity]) })),
    xLabel: 'Ladung (wie importiert)', yLabel: 'gemessene v (wie importiert)', fitToData: true,
  }));
}

function recordTable(recs, { compact = false, compare = false } = {}) {
  const cols = compare
    ? [['cartridge', 'Patrone'], ['powder', 'Pulver'], ['bullet', 'Geschoss'], ['charge', 'Ladung'], ['measured_velocity', 'v gem.']]
    : FIELDS.map((f) => [f.key, f.label]);
  return el('div', { class: 'table-wrap' }, el('table', { class: compact ? 'compact' : '' },
    el('thead', {}, el('tr', {}, cols.map(([, l]) => el('th', {}, l)))),
    el('tbody', {}, recs.map((r) => el('tr', {}, cols.map(([k]) => el('td', {}, r[k] == null || r[k] === '' ? '—' : (typeof r[k] === 'number' ? fmt(r[k], 2) : r[k]))))))));
}

/* ---------- Offizielle Quellen ---------- */

function sourcesSection() {
  return el('section', { class: 'card' },
    el('h2', {}, 'Offizielle Quellen'),
    el('p', { class: 'muted small' }, 'Aktuelle Ladedaten nur direkt beim Hersteller. Links öffnen die offiziellen Seiten in einem neuen Fenster.'),
    OFFICIAL_SOURCES.map((g) => el('div', {},
      el('h3', { class: 'group-title' }, g.group),
      el('ul', { class: 'list' }, g.items.map((s) => el('li', {},
        el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer', class: 'ext' },
          el('strong', {}, s.name),
          el('div', { class: 'muted small' }, [s.note, new URL(s.url).hostname].filter(Boolean).join(' · '))),
        el('span', { class: 'muted' }, '↗')))))));
}

function toast(msg) {
  const t = el('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2500);
}
