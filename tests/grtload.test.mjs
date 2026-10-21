// Tests für den lokalen .grtload-Import. Aufruf: node tests/grtload.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GRAMS_PER_GRAIN, decodeGrtValue, isGrtLoad, parseGrtLoad } from '../js/userdata/grtload.js';

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

assert.throws(() => parseGrtLoad('<not-a-project/>'), /Keine GRT-Projektdatei/);
assert.throws(() => parseGrtLoad('<GordonsReloadingTool><InnerBallistikInput>'), /kein gültiges XML/);

for (const file of ['js/model.js', 'js/views/simulation.js', 'js/views/optimization.js']) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.equal(/grtload|parseGrtLoad|localStorage/.test(source), false, `${file} bleibt von GRT-Importdaten getrennt`);
}

console.log('OK – grtload-Importtests bestanden.');
