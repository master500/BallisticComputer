// CIP-Nachschlagewerte: exakter Name, Alias, keine Teilstrings. Aufruf: node tests/cip.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aliasCartridge, normalizeCipKey } from '../js/cip/aliases.js';
import { buildCipIndex, filterCipRows, resolveCipQuery } from '../js/cip/lookup.js';
import { setChildren } from '../js/util.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../data/cip/${name}`, import.meta.url)));
const tab1 = read('cip_pmax_tab1.json');
const tab2 = read('cip_pmax_tab2-5.json');
const l6 = read('cip_l6.json');

for (const file of [tab1, tab2, l6]) {
  assert.equal(JSON.stringify(file).includes('pmax_mpa'), false);
}
assert.equal(tab1.entries.length, 214);
assert.equal(tab2.entries.length, 279);
assert.equal(l6.entries.length, 214);
assert.equal(tab1.entries.every((row) => Number.isInteger(row.pmax_bar)), true);
assert.equal(tab2.entries.every((row) => Number.isInteger(row.pmax_bar)), true);

const names1 = new Set(tab1.entries.map((row) => row.cartridge));
const names2 = new Set(tab2.entries.map((row) => row.cartridge));
assert.equal([...names1].some((name) => names2.has(name)), false);

const index = buildCipIndex([...tab1.entries, ...tab2.entries], l6.entries);
assert.equal(index.rows.length, 493);

const win = resolveCipQuery(index, '308 Win.');
assert.equal(win.status, 'exact');
assert.equal(win.entry.pmaxBar, 4150);
assert.equal(win.entry.l6Mm, 71.12);
assert.equal(resolveCipQuery(index, '308 win.').entry.cartridge, '308 Win.');

const aliases = ['9mm', '9 mm', '9x19', '9 x 19', '9 mm Para', '9 mm Parabellum', '9  mm', '9 MM PARA'];
for (const query of aliases) {
  const hit = resolveCipQuery(index, query);
  assert.equal(hit.status, 'alias', query);
  assert.equal(hit.entry.cartridge, '9 mm Luger', query);
  assert.equal(hit.entry.pmaxBar, 2350, query);
  assert.equal(aliasCartridge(query), '9 mm Luger', query);
}

const luger = resolveCipQuery(index, '9 mm Luger');
assert.equal(luger.status, 'exact');
assert.equal(luger.entry.pmaxBar, 2350);
assert.equal(luger.entry.l6Mm, null);

for (const query of ['9 mm Makarov', '9 mm Luger Extra', 'Lug', '9', 'Luger', '308', 'Win']) {
  const hit = resolveCipQuery(index, query);
  assert.notEqual(hit.entry?.cartridge, '9 mm Luger', query);
  assert.notEqual(hit.status, 'alias', query);
}
assert.equal(resolveCipQuery(index, '9 mm Makarov').entry.cartridge, '9 mm Makarov');
assert.equal(resolveCipQuery(index, '9 mm Makarov').entry.pmaxBar, 1600);
assert.equal(normalizeCipKey('9 mm'), normalizeCipKey('9mm'));
assert.notEqual(normalizeCipKey('9 mm Makarov'), normalizeCipKey('9 mm Luger'));

assert.equal(filterCipRows(index, '').length, 493);
assert.equal(filterCipRows(index, '9 mm').length, 1);
assert.equal(filterCipRows(index, '9 mm')[0].cartridge, '9 mm Luger');
assert.equal(filterCipRows(index, 'Lug').length, 0);
assert.equal(filterCipRows(index, '9 mm Luger Extra').length, 0);

const view = readFileSync(new URL('../js/views/cip.js', import.meta.url), 'utf8');
assert.match(view, /Quelle: C\.I\.P\., abgerufen 21\.10\.2026/);
assert.match(view, /bar/);
assert.equal(/MPa|pmax_mpa|inch/i.test(view), false);
assert.equal(/model\.js|simulate\(/.test(view), false);

const placed = [];
setChildren({ replaceChildren: (...nodes) => placed.push(nodes) }, null, false);
assert.deepEqual(placed, [[]]);

console.log('OK – CIP-Nachschlagewerte.');
