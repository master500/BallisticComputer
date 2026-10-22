// Tests für den lokalen .grtload-Import. Aufruf: node tests/grtload.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { psiNote } from '../js/cip/pressure.js';
import { GRAMS_PER_GRAIN, decodeGrtValue, isGrtLoad, parseGrtLoad, seriesStats } from '../js/userdata/grtload.js';

class XmlNode {
  constructor(tag) {
    this.tagName = tag;
    this.attributes = {};
    this.children = [];
    this.text = '';
  }
  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }
  get textContent() {
    return this.text + this.children.map((child) => child.textContent).join('');
  }
  getElementsByTagName(tag) {
    const out = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.tagName === tag) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }
}

function decodeEntities(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

class TestDOMParser {
  parseFromString(xml) {
    const source = String(xml).replace(/<\?xml[^?]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
    const doc = new XmlNode('#document');
    let index = 0;
    const skip = () => { while (index < source.length && /\s/.test(source[index])) index += 1; };
    const parseChildren = (parent) => {
      while (index < source.length) {
        skip();
        if (index >= source.length || source.startsWith('</', index)) return;
        if (source[index] !== '<') {
          const next = source.indexOf('<', index);
          parent.text += decodeEntities(source.slice(index, next === -1 ? source.length : next));
          index = next === -1 ? source.length : next;
          continue;
        }
        const end = source.indexOf('>', index);
        if (end < 0) throw new Error('unclosed tag');
        const raw = source.slice(index + 1, end);
        const selfClosing = /\/\s*$/.test(raw);
        const body = selfClosing ? raw.replace(/\/\s*$/, '') : raw;
        const name = /^([A-Za-z_:][\w:.-]*)/.exec(body.trim());
        if (!name) throw new Error('bad tag');
        const node = new XmlNode(name[1]);
        const attrRe = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
        let attr = attrRe.exec(body);
        while (attr) {
          node.attributes[attr[1]] = decodeEntities(attr[2]);
          attr = attrRe.exec(body);
        }
        parent.children.push(node);
        index = end + 1;
        if (!selfClosing) {
          parseChildren(node);
          skip();
          const closer = `</${name[1]}>`;
          if (!source.startsWith(closer, index)) throw new Error(`missing ${closer}`);
          index += closer.length;
        }
      }
    };
    try {
      parseChildren(doc);
    } catch (error) {
      const failure = new XmlNode('parsererror');
      failure.text = String(error.message || error);
      doc.children = [failure];
    }
    doc.documentElement = doc.children[0] || null;
    doc.getElementsByTagName = (tag) => {
      if (!doc.documentElement) return [];
      const nested = doc.documentElement.getElementsByTagName(tag);
      return doc.documentElement.tagName === tag ? [doc.documentElement, ...nested] : nested;
    };
    return doc;
  }
}

globalThis.DOMParser = TestDOMParser;

const fixtureUrl = new URL('./fixtures/fictional.grtload', import.meta.url);
const xml = readFileSync(fixtureUrl, 'utf8');
assert.equal(isGrtLoad(xml, 'fictional.grtload'), true);
assert.equal(isGrtLoad('a,b\n1,2\n', 'notes.csv'), false);
assert.equal(decodeGrtValue('A%20B'), 'A B');

const project = parseGrtLoad(xml);
assert.equal(project.title, 'Demo Fiktivprojekt');
assert.equal(project.caliberName, 'Fiktiv-Kaliber 7');
assert.equal(project.caseVolumeCm3, 1.25);
assert.equal(project.pMaxBar, 1111);
assert.equal(project.pressureMethod, 'Demo-Verfahren');
assert.equal(project.projectileName, 'Fiktivgeschoss Alpha');
assert.equal(project.projectileWeightG, 4.5);
assert.ok(Math.abs(project.projectileWeightGr - (4.5 / GRAMS_PER_GRAIN)) < 1e-9);
assert.equal(project.projectileLengthMm, 12);
assert.equal(project.propellantName, 'DemoChemie Pulver Zeta');

assert.equal(project.charges.length, 2);
const [first, second] = project.charges;
assert.equal(first.name, 'Serie A');
assert.equal(first.note, 'FIKTIV! KEINE LADEANGABE');
assert.ok(Math.abs(first.kilograms - 0.0015) < 1e-12);
assert.ok(Math.abs(first.grams - 1.5) < 1e-9);
assert.ok(Math.abs(first.grains - (1.5 / GRAMS_PER_GRAIN)) < 1e-9);
assert.deepEqual(first.velocitiesMs, [10, 20, 30]);
assert.equal(first.velocitiesMs.includes(0), false);
const ignored = seriesStats([10, 0, -4, 20, Number.NaN]);
assert.equal(ignored.n, 2);
assert.equal(ignored.mean, 15);
assert.equal(ignored.es, 10);
assert.equal(seriesStats([0, -1]), null);
assert.equal(first.stats.n, 3);
assert.equal(first.stats.mean, 20);
assert.equal(first.stats.sd, 10);
assert.equal(first.stats.es, 20);

assert.equal(second.name, 'Serie B');
assert.equal(second.note, '');
assert.ok(Math.abs(second.grams - 1) < 1e-9);
assert.deepEqual(second.velocitiesMs, []);
assert.equal(second.stats, null);

const dumped = JSON.stringify(project);
for (const secret of ['SENTINEL-CIP-9', 'SENTINEL-BA-9', 'SENTINEL-QEX-9', 'SENTINEL-A0-9', 'SENTINEL-P-9']) {
  assert.equal(dumped.includes(secret), false, `${secret} darf nicht übernommen werden`);
}
assert.equal(JSON.stringify(project.charges).includes('pressure'), false);

const pressureXml = `<?xml version="1.0"?>
<GordonsReloadingTool>
  <InnerBallistikInput>
    <title>Druck</title>
    <caliber>
      <input name="CaliberName" value="Fiktiv"/>
      <input name="pMaxZul" value="1111"/>
    </caliber>
    <projectile><input name="mp" value="1"/></projectile>
    <propellant></propellant>
    <appendix><Measurement>
      <charge name="S" value="0.000125">
        <shot pressure="12.5" velocity="10"/>
        <shot pressure="SENTINEL-P-9" velocity="11"/>
        <shot pressure="0" velocity="12"/>
      </charge>
    </Measurement></appendix>
  </InnerBallistikInput>
</GordonsReloadingTool>`;
const withBars = parseGrtLoad(pressureXml);
assert.deepEqual(withBars.charges[0].bars, [125]);
assert.equal(withBars.charges[0].barOrigin, 'berechnet (GRT)');
assert.equal(withBars.pMaxBar, 1111);
assert.equal(JSON.stringify(withBars).includes('SENTINEL-P-9'), false);
assert.equal(JSON.stringify(withBars.charges).includes('pressure'), false);
assert.equal(project.charges[0].bars.length, 0);

const unitToken = /\b(?:CUP|LUP)\b/;
const droppedCup = parseGrtLoad(pressureFile('52000', 'CUP'));
const droppedLup = parseGrtLoad(pressureFile('1000', 'LUP'));
assert.equal(droppedCup.charges.length, 0);
assert.equal(droppedLup.charges.length, 0);
assert.equal(droppedCup.pMaxBar, null);
assert.equal(droppedLup.pMaxBar, null);
assert.equal(droppedCup.droppedUnit, 1);
assert.equal(droppedLup.droppedUnit, 1);
assert.equal(droppedCup.droppedUnit + droppedLup.droppedUnit, 2);
assert.equal(droppedCup.summary, '1 Zeilen verworfen (Druckeinheit nicht unterstützt)');
assert.equal(droppedLup.summary, '1 Zeilen verworfen (Druckeinheit nicht unterstützt)');
assert.equal(unitToken.test(JSON.stringify(droppedCup)), false);
assert.equal(unitToken.test(JSON.stringify(droppedLup)), false);
assert.equal(unitToken.test(readFileSync(new URL('../js/views/userdata.js', import.meta.url), 'utf8')), false);

const psiProject = parseGrtLoad(pressureFile('62000', 'psi'));
assert.equal(psiProject.pMaxBar, 4274.8);
assert.equal(psiProject.pressureNote, psiNote());
assert.equal(psiProject.pressureNote, 'umgerechnet aus PSI (SAAMI-Messverfahren) – Vergleich mit CIP nur ungefähr');
assert.equal(psiProject.charges.length, 1);
assert.equal(psiProject.droppedUnit, 0);

const methodCup = parseGrtLoad(pressureFile('52.000', '', 'CUP'));
assert.equal(methodCup.charges.length, 0);
assert.equal(methodCup.pMaxBar, null);
assert.equal(methodCup.summary, '1 Zeilen verworfen (Druckeinheit nicht unterstützt)');
assert.equal(unitToken.test(JSON.stringify(methodCup)), false);
const barThousands = parseGrtLoad(pressureFile('4.150', 'bar'));
assert.equal(barThousands.pMaxBar, 4150);
assert.equal(barThousands.charges.length, 1);

assert.throws(() => parseGrtLoad('<not-a-project/>'), /Keine GRT-Projektdatei/);
assert.throws(() => parseGrtLoad('<GordonsReloadingTool><InnerBallistikInput>'), /kein gültiges XML/);

for (const file of ['js/model.js', 'js/views/simulation.js', 'js/views/optimization.js']) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.equal(/grtload|parseGrtLoad|localStorage/.test(source), false, `${file} bleibt von GRT-Importdaten getrennt`);
}

function pressureFile(value, unit, method = '') {
  return `<?xml version="1.0"?>
<GordonsReloadingTool>
  <InnerBallistikInput>
    <title>Einheit</title>
    <caliber>
      <input name="CaliberName" value="Fiktiv"/>
      <input name="pMaxZul" value="${value}" unit="${unit}"/>
      <input name="method" value="${method}"/>
    </caliber>
    <projectile><input name="mp" value="1"/></projectile>
    <propellant></propellant>
    <appendix><Measurement>
      <charge name="S" value="0.000125">
        <shot pressure="12.5" velocity="10"/>
      </charge>
    </Measurement></appendix>
  </InnerBallistikInput>
</GordonsReloadingTool>`;
}

console.log('OK – grtload-Importtests bestanden.');
