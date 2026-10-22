/**
 * Lokale Herstellerladung. Der Spielzeugdruck wird hier nicht berechnet.
 */
import { el, fmt, setChildren } from '../util.js';
import { loadCipIndex, resolveCipQuery } from '../cip/lookup.js';
import { parseManufacturer, sourceLabel } from './parse.js';
import { mfrStore } from './store.js';
import { MISMATCH, describeManufacturer } from './apply.js';

export function mountManufacturer(box, { allowImport = false } = {}) {
  const form = {
    cartridge: '', powder: '', bulletWeightGrain: '', bulletType: '', primer: '', coalMm: '',
  };
  let index = null;
  const status = el('p', { class: 'muted small', role: 'status' });
  const list = el('div');
  const result = el('div');
  const fields = [
    ['cartridge', 'Patrone', 'text'],
    ['powder', 'Pulver', 'text'],
    ['bulletWeightGrain', 'Geschossgewicht (grain)', 'decimal'],
    ['bulletType', 'Geschossart', 'text'],
    ['primer', 'Zündhütchen', 'text'],
    ['coalMm', 'COAL (mm)', 'decimal'],
  ];
  const inputs = {};
  const formNodes = fields.map(([key, label, kind]) => {
    const input = el('input', {
      type: 'text',
      inputmode: kind === 'decimal' ? 'decimal' : 'text',
      'aria-label': label,
      oninput: (e) => { form[key] = e.target.value; draw(); },
    });
    inputs[key] = input;
    return el('label', {}, label, input);
  });
  const children = [
    el('section', { class: 'card' },
      el('h2', {}, 'Herstellerladung'),
      el('p', { class: 'muted small' }, 'Nur eine lokal importierte Zeile. Die Leiter endet an der Maximalladung. Der Spielzeugdruck wird dafür nicht angezeigt.'),
      allowImport ? importBox(status, () => { draw(); }) : null,
      status,
      list,
      el('h3', {}, 'Kombination'),
      ...formNodes,
      result),
  ];
  box.replaceChildren(...children.filter(Boolean));
  loadCipIndex().then((loaded) => { index = loaded; if (box.isConnected) draw(); }).catch(() => { index = null; });
  draw();

  function selection() {
    return {
      cartridge: form.cartridge,
      powder: form.powder,
      bulletType: form.bulletType,
      primer: form.primer,
      bulletWeightGrain: form.bulletWeightGrain,
      coalMm: form.coalMm,
    };
  }

  function applyRow(row) {
    form.cartridge = row.cartridge;
    form.powder = row.powder;
    form.bulletType = row.bulletType;
    form.primer = row.primer;
    form.bulletWeightGrain = row.bulletWeightGrain ?? '';
    form.coalMm = row.coalMm ?? '';
    for (const [key, input] of Object.entries(inputs)) input.value = form[key] ?? '';
    draw();
  }

  function draw() {
    const rows = mfrStore.all();
    setChildren(list, rows.length
      ? el('ul', { class: 'list' }, rows.map((row) => el('li', {},
        el('div', {},
          el('strong', {}, `${row.cartridge} · ${row.powder}`),
          el('div', { class: 'small' }, chargeLine(row)),
          el('div', { class: 'small' }, `Quelle: ${sourceLabel(row)}`),
          el('div', { class: 'small' }, `Datum: ${row.date || 'nicht angegeben'}`)),
        el('button', { type: 'button', class: 'btn', onclick: () => applyRow(row) }, 'Kombination übernehmen'),
        allowImport ? el('button', { type: 'button', class: 'btn', onclick: () => { mfrStore.remove(row.id); draw(); } }, 'Löschen') : null)))
      : el('p', { class: 'muted small' }, 'Keine Herstellerladung auf diesem Gerät.'));
    const described = describeManufacturer(rows, selection(), { pmaxBar: pmaxOf(form.cartridge) });
    setChildren(result, renderDescribed(described));
  }

  function pmaxOf(name) {
    if (!index || !String(name || '').trim()) return null;
    const hit = resolveCipQuery(index, name);
    return hit.status === 'exact' || hit.status === 'alias' ? hit.entry?.pmaxBar ?? null : null;
  }
}

function importBox(status, done) {
  const file = el('input', {
    type: 'file', class: 'file', accept: '.csv,.json,.txt,text/csv,application/json',
  });
  const text = el('textarea', { rows: 4, placeholder: 'CSV oder JSON der Herstellerzeilen' });
  file.addEventListener('change', async () => {
    const picked = file.files?.[0];
    if (picked) take(await picked.text(), status, done);
    file.value = '';
  });
  return el('div', {},
    file,
    text,
    el('div', { class: 'row-btns' },
      el('button', { type: 'button', class: 'btn primary', onclick: () => take(text.value, status, done) }, 'Herstellerzeilen lesen'),
      el('button', { type: 'button', class: 'btn', onclick: () => { mfrStore.clear(); status.textContent = 'Herstellerladungen auf diesem Gerät gelöscht.'; done(); } }, 'Alle Herstellerladungen löschen')));
}

function take(raw, status, done) {
  let parsed;
  try { parsed = parseManufacturer(raw); }
  catch (err) { status.textContent = `Fehler: ${err.message || err}`; return; }
  if (parsed.error) { status.textContent = parsed.error; return; }
  const n = parsed.rows.length ? mfrStore.add(parsed.rows) : 0;
  status.textContent = [n ? `${n} Zeile(n) nur auf diesem Gerät gespeichert.` : 'Keine Zeile gespeichert.', parsed.summary].filter(Boolean).join(' ');
  done();
}

function chargeLine(row) {
  const start = Number.isFinite(row.startChargeGrain) ? `${fmt(row.startChargeGrain, 1)} grain` : 'keine Startladung';
  const note = [row.chargeNote, row.bulletWeightNote].filter(Boolean).join(' · ');
  return `Start ${start} · maximal ${fmt(row.maxChargeGrain, 1)} grain${note ? ` · ${note}` : ''}`;
}

function renderDescribed(described) {
  if (described.status === 'empty') return null;
  if (described.status === 'mismatch') {
    return el('p', { class: 'hint-yellow', role: 'status' }, described.warning || MISMATCH);
  }
  const row = described.row;
  const rating = described.rating;
  const tone = rating?.tone === 'red' ? 'red' : rating?.tone === 'yellow' ? 'yellow' : 'under';
  return el('div', {},
    el('p', { class: 'small' }, chargeLine(row)),
    el('p', { class: 'small' }, `Quelle: ${sourceLabel(row)}`),
    el('p', { class: 'small' }, `Datum: ${row.date || 'nicht angegeben'}`),
    Number.isFinite(row.pressureBar)
      ? el('p', {}, `Angegeben ${fmt(row.pressureBar, row.pressureOrigin === 'psi' ? 1 : 0)} bar`)
      : el('p', {}, 'kein Druck angegeben'),
    rating?.psiNote ? el('p', { class: 'hint-yellow', role: 'status' }, rating.psiNote) : null,
    rating?.text ? el('p', { class: `cip-rating hint-${tone}`, role: 'status' }, rating.text) : null,
    Number.isFinite(row.velocityMs) ? el('p', { class: 'small' }, `v angegeben ${fmt(row.velocityMs, 0)} m/s`) : null,
    el('ul', { class: 'list' }, described.steps.map((step) => el('li', {}, el('strong', {}, `${fmt(step, 1)} grain`)))));
}
