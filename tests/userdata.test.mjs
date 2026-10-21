// Tests für Import/Zuordnung eigener Daten. Aufruf: node tests/userdata.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCSV, parseInput } from '../js/userdata/csv.js';
import { suggestMapping, applyMapping, parseNumber } from '../js/userdata/mapping.js';

// Generisches Schema (Semikolon, deutsches Dezimalkomma, Anführungszeichen)
const generic = 'cartridge;powder;bullet;bullet_weight;charge;coal;measured_velocity;notes;source\n"Test-Patrone";Pulver X;Geschoss Y;10,0;5,5;70,1;800;"Notiz; mit Semikolon";Eigene Messung\n';
const g = parseInput(generic);
assert.equal(g.format, 'csv');
const gm = suggestMapping(g.headers);
assert.ok(Object.values(gm).every((i) => i >= 0), 'alle Felder generisch zugeordnet');
const [rec] = applyMapping(g.rows, gm, { fileName: 'test.csv' });
assert.equal(rec.charge, 5.5); assert.equal(rec.notes, 'Notiz; mit Semikolon');
assert.equal(rec.origin, 'Eigene Daten / Import: test.csv');

// GRT/QuickLOAD-artige Kopfzeilen: berechnete Spalten werden NICHT automatisch übernommen
const ql = parseCSV('Cartridge,Powder,Projectile,Projectile Mass [gr],Charge [gr],COAL [in],Velocity [fps],Pmax [psi],v predicted\nA,B,C,1,2,3,4,5,6\n');
const qm = suggestMapping(ql.headers);
assert.equal(ql.headers[qm.cartridge], 'Cartridge');
assert.equal(ql.headers[qm.charge], 'Charge [gr]');
assert.equal(ql.headers[qm.bullet_weight], 'Projectile Mass [gr]');
assert.equal(ql.headers[qm.coal], 'COAL [in]');
assert.equal(qm.measured_velocity, -1, 'berechnete Velocity nie automatisch als gemessen');
assert.equal(qm.notes, -1, 'Pmax nicht automatisch übernommen');

// JSON-Backup re-import
const j = parseInput(JSON.stringify({ records: [{ cartridge: 'A', charge: 1 }] }));
assert.deepEqual(j.headers, ['cartridge', 'charge']);
assert.equal(parseNumber('1.234,5'), 1234.5); assert.equal(parseNumber('42.5 gr'), 42.5); assert.equal(parseNumber(''), null);

// Trennung: Modell und Demo-Views importieren keine Nutzerdaten
for (const f of ['js/model.js', 'js/views/simulation.js', 'js/views/optimization.js']) {
  assert.ok(!/userdata|localStorage/.test(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')), `${f} ist von Nutzerdaten getrennt`);
}
console.log('OK – alle Import-Tests bestanden.');
