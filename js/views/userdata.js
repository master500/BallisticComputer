/**
 * View: Meine Daten – Import, Liste, Filter und Vergleich EIGENER Datensätze
 * sowie Links zu offiziellen Quellen.
 *
 * Strikte Trennung: Diese Ansicht nutzt weder js/model.js noch db.json.
 * Keine Druckprognose und keine Extrapolation. Eine .grtload wird nur angezeigt;
 * Mittelwert, SD und ES fassen die gemessenen Schüsse dieser Datei zusammen.
 */
import { el, fmt, fmtTime } from '../util.js';
import { drawLineChart } from '../chart.js';
import { parseInput } from '../userdata/csv.js';
import { isGrtLoad, parseGrtLoad } from '../userdata/grtload.js';
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
      el('p', { class: 'small' }, 'Diese Daten werden nur angezeigt – ohne Extrapolation oder Druckprognose. Sie bleiben lokal auf diesem Gerät und werden nicht in Simulation/Optimierung verwendet (dort nur fiktive Demo-Werte).')),
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
  const fileInput = el('input', { type: 'file', accept: '.csv,.json,.txt,.grtload,.xml,text/csv,application/json,text/xml,application/xml', class: 'file' });
  const textArea = el('textarea', { rows: 4, placeholder: 'CSV oder JSON hier einfügen …\ncartridge;powder;bullet;bullet_weight;charge;coal;measured_velocity;notes;source' });

  const start = (text, fileName) => {
    try {
      if (isGrtLoad(text, fileName)) {
        const project = parseGrtLoad(text);
        ui.pending = { mode: 'grt', fileName, project };
        status.textContent = `GRT-Projekt „${project.title || fileName}“ gelesen. Nur Anzeige – bitte die Ladungsnotiz prüfen.`;
      } else {
        const parsed = parseInput(text);
        if (parsed.format === 'backup') {
          ui.pending = { mode: 'backup', fileName, records: parsed.records };
          status.textContent = `${parsed.records.length} Datensatz/Datensätze aus dem Backup. Verschachtelte Angaben bleiben erhalten.`;
        } else {
          if (!parsed.rows.length) throw new Error('Keine Datenzeilen gefunden.');
          ui.pending = { mode: 'table', ...parsed, fileName, mapping: suggestMapping(parsed.headers) };
          status.textContent = `${parsed.rows.length} Zeile(n) aus „${fileName}“ erkannt (${parsed.format.toUpperCase()}). Bitte Zuordnung prüfen.`;
        }
      }
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
    el('label', {}, 'Datei wählen (CSV / JSON / .grtload)', fileInput),
    el('p', { class: 'muted small' }, 'Eine eigene GRT-Projektdatei (.grtload, XML) wird im Browser gelesen und nur angezeigt. Die Ladungsnotiz aus der Datei steht über der Ladung.'),
    el('label', {}, 'oder Text einfügen', textArea),
    el('button', { class: 'btn', type: 'button', onclick: () => textArea.value.trim() && start(textArea.value, 'Eingefügter Text') }, 'Text übernehmen'),
    status,
    pendingBox);
}

function renderPending(box, refresh) {
  const p = ui.pending;
  if (!p) { box.replaceChildren(); return; }
  if (p.mode === 'backup') {
    const grt = p.records.filter((r) => r.kind === 'grtload');
    const flat = p.records.filter((r) => r.kind !== 'grtload');
    box.replaceChildren(el('div', { class: 'mapping' },
      el('h3', {}, 'Backup'),
      el('p', { class: 'muted small' }, `${p.records.length} Datensätze, davon ${grt.length} GRT-Projekt(e). Ladungen und andere verschachtelte Felder werden mit gespeichert.`),
      grt.map((project) => grtDetails(project)),
      flat.length ? recordTable(flat, { compact: true }) : null,
      el('div', { class: 'row-btns' },
        el('button', { class: 'btn primary', type: 'button', onclick: () => {
          const n = userStore.add(p.records);
          ui.pending = null;
          refresh();
          toast(`${n} Datensatz/Datensätze aus dem Backup gespeichert.`);
        } }, `${p.records.length} speichern`),
        el('button', { class: 'btn', type: 'button', onclick: () => { ui.pending = null; refresh(); } }, 'Abbrechen'))));
    return;
  }
  if (p.mode === 'grt') {
    box.replaceChildren(el('div', { class: 'mapping' },
      grtDetails(p.project),
      el('div', { class: 'row-btns' },
        el('button', { class: 'btn primary', type: 'button', onclick: () => {
          userStore.add([stampGrt(p.project, p.fileName)]);
          ui.pending = null;
          refresh();
          toast('GRT-Projekt gespeichert (nur auf diesem Gerät).');
        } }, 'Speichern'),
        el('button', { class: 'btn', type: 'button', onclick: () => { ui.pending = null; refresh(); } }, 'Abbrechen'))));
    return;
  }

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
  const charges = Array.isArray(r.charges) ? r.charges.map((c) => `${c.name} ${c.note}`).join(' ') : '';
  const hay = `${r.cartridge || ''} ${r.powder || ''} ${r.bullet || ''} ${r.source || ''} ${r.notes || ''} ${r.origin || ''} ${r.title || ''} ${r.caliberName || ''} ${r.propellantName || ''} ${r.projectileName || ''} ${charges}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
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
  if (r.kind === 'grtload') return grtRecordItem(r, refresh);
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

function stampGrt(project, fileName) {
  return {
    kind: 'grtload',
    ...project,
    origin: `Eigene Daten / Import: ${fileName}`,
    importedAt: new Date().toISOString(),
  };
}

function flex(n, digits) {
  return Number.isFinite(n) ? n.toLocaleString('de-DE', { maximumFractionDigits: digits }) : '—';
}

function fact(label, value) {
  return el('div', {}, el('dt', {}, label), el('dd', {}, value));
}

function grtDetails(project) {
  const charges = Array.isArray(project.charges) ? project.charges : [];
  const notes = charges.filter((charge) => charge.note);
  return el('div', { class: 'grt' },
    el('h3', {}, project.title || 'GRT-Projekt'),
    notes.map((charge) => el('p', { class: 'charge-note', role: 'note' },
      el('span', { class: 'charge-note-label' }, `Ladungsnotiz${charge.name ? ` · ${charge.name}` : ''}`),
      charge.note)),
    el('p', { class: 'muted small' }, 'Nur Anzeige der eigenen Datei. Keine Simulation und keine Extrapolation. Pulvermodell-Parameter werden nicht übernommen.'),
    el('dl', { class: 'facts' },
      fact('Kaliber', project.caliberName || '—'),
      fact('Hülsenvolumen', Number.isFinite(project.caseVolumeCm3) ? `${flex(project.caseVolumeCm3, 3)} cm³` : '—'),
      fact('pMaxZul', [Number.isFinite(project.pMaxBar) ? `${flex(project.pMaxBar, 1)} bar` : '—', project.pressureMethod].filter(Boolean).join(' · ')),
      fact('Geschoss', project.projectileName || '—'),
      fact('Geschossgewicht', [Number.isFinite(project.projectileWeightG) ? `${flex(project.projectileWeightG, 3)} g` : null, Number.isFinite(project.projectileWeightGr) ? `${flex(project.projectileWeightGr, 1)} gr` : null].filter(Boolean).join(' · ') || '—'),
      fact('Geschosslänge', Number.isFinite(project.projectileLengthMm) ? `${flex(project.projectileLengthMm, 2)} mm` : '—'),
      fact('Pulvername', project.propellantName || '—')),
    el('h3', {}, 'Ladungen'),
    el('p', { class: 'muted small' }, 'Der Ladungswert steht in der Datei in kg und wird hier in g und grain angezeigt.'),
    charges.length ? charges.map((charge) => chargeBlock(charge)) : el('p', { class: 'muted small' }, 'Keine Ladungen in der Datei.'));
}

function chargeBlock(charge) {
  const stats = charge.stats;
  const velocities = Array.isArray(charge.velocitiesMs) ? charge.velocitiesMs : [];
  let summary = 'Keine gemessenen Geschwindigkeiten.';
  if (stats && stats.n >= 2) {
    summary = `Mittel ${flex(stats.mean, 1)} · SD ${flex(stats.sd, 1)} · ES ${flex(stats.es, 1)} m/s (n=${stats.n})`;
  } else if (stats && stats.n === 1) {
    summary = `1 Schuss: ${flex(stats.mean, 1)} m/s`;
  }
  return el('div', { class: 'charge-block' },
    el('strong', {}, charge.name || 'Ladung'),
    charge.note ? el('p', { class: 'charge-note', role: 'note' }, el('span', { class: 'charge-note-label' }, 'Ladungsnotiz'), charge.note) : null,
    el('div', {}, Number.isFinite(charge.grams) ? `${flex(charge.grams, 3)} g · ${flex(charge.grains, 1)} gr` : '—'),
    Number.isFinite(charge.kilograms) ? el('div', { class: 'muted small' }, `in der Datei: ${flex(charge.kilograms, 6)} kg`) : null,
    velocities.length ? el('div', { class: 'small' }, `Schüsse: ${velocities.map((v) => flex(v, 1)).join(', ')} m/s`) : null,
    el('div', { class: 'small' }, summary));
}

function grtRecordItem(r, refresh) {
  return el('li', {},
    el('div', { class: 'rec' },
      grtDetails(r),
      el('div', { class: 'origin small' }, r.origin || '', r.origin ? ' · ' : '', fmtTime(r.importedAt))),
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
  const recs = userStore.all().filter((r) => r.kind !== 'grtload' && matches(r, ui.filter) && r.charge != null && r.measured_velocity != null);
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
