// Headless-Screenshots des Tabs "Meine Daten" (390x844 @2x) nach /workspace/shots.
// Benötigt puppeteer-core (z. B. in /workspace/tools/shot: npm i puppeteer-core) und google-chrome.
// Aufruf: NODE_PATH=/workspace/tools/shot/node_modules node scripts/shots-daten.mjs  (Server muss laufen)
import puppeteer from 'puppeteer-core';
const BASE = 'http://127.0.0.1:8080/';
const OUT = '/workspace/shots';
// Rein FIKTIVE Testdaten (keine realen Ladedaten)
const CSV = `Cartridge;Powder;Projectile;Projectile Mass [gr];Charge [gr];COAL [mm];Velocity [fps];Notes;Source
Test-Patrone A;Testpulver 1;Testgeschoss X;10;5,0;70,0;;Fiktiver Testwert;Screenshot-Test
Test-Patrone A;Testpulver 1;Testgeschoss X;10;5,2;70,0;;Fiktiver Testwert;Screenshot-Test`;
const GEN = `cartridge;powder;bullet;bullet_weight;charge;coal;measured_velocity;notes;source
Test-Patrone A;Testpulver 1;Testgeschoss X;10;5,0;70,0;700;fiktiv;Screenshot-Test
Test-Patrone A;Testpulver 1;Testgeschoss X;10;5,2;70,0;712;fiktiv;Screenshot-Test
Test-Patrone A;Testpulver 1;Testgeschoss X;10;5,4;70,0;726;fiktiv;Screenshot-Test
Test-Patrone A;Testpulver 2;Testgeschoss X;10;5,1;70,0;690;fiktiv;Screenshot-Test
Test-Patrone A;Testpulver 2;Testgeschoss X;10;5,3;70,0;703;fiktiv;Screenshot-Test`;

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
page.on('dialog', (d) => d.accept());
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE + '#/daten', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await page.screenshot({ path: `${OUT}/daten-1-leer.png` });

const paste = async (text) => {
  await page.$eval('textarea', (t, v) => { t.value = v; }, text);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Text übernehmen').click());
  await new Promise((r) => setTimeout(r, 300));
};
// GRT/QuickLOAD-artiger Header -> Zuordnungsvorschau
await paste(CSV);
await page.evaluate(() => document.querySelector('.mapping').scrollIntoView());
await page.screenshot({ path: `${OUT}/daten-2-zuordnung.png` });
const mapping = await page.$$eval('.map-row', (rows) => rows.map((r) => `${r.querySelector('span').textContent} -> ${r.querySelector('select').selectedOptions[0].textContent}`));
console.log(mapping.join('\n'));
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Abbrechen').click());

// Generisches Schema speichern -> Liste + Vergleich
await paste(GEN);
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /speichern$/.test(b.textContent)).click());
await new Promise((r) => setTimeout(r, 2800));
await page.evaluate(() => [...document.querySelectorAll('h2')].find((h) => h.textContent.startsWith('Meine Datensätze')).scrollIntoView());
await page.screenshot({ path: `${OUT}/daten-3-liste.png` });
await page.evaluate(() => [...document.querySelectorAll('h2')].find((h) => h.textContent.startsWith('Vergleich')).scrollIntoView());
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}/daten-4-vergleich.png` });
// Suche
await page.evaluate(() => document.querySelector('input[type=search]').scrollIntoView());
await page.type('input[type=search]', 'Testpulver 2');
console.log('Filter:', await page.$eval('.records', (u) => u.children.length), 'Einträge sichtbar');
await page.evaluate(() => [...document.querySelectorAll('h2')].find((h) => h.textContent === 'Offizielle Quellen').scrollIntoView());
await page.screenshot({ path: `${OUT}/daten-5-quellen.png` });
// Trennung: Simulation zeigt nur Demo-Pulver
await page.goto(BASE + '#/simulation', { waitUntil: 'networkidle0' });
console.log('Simulation-Pulver:', await page.$$eval('select option', (o) => o.map((x) => x.textContent).join(' | ')));
console.log('localStorage records:', await page.evaluate(() => JSON.parse(localStorage.getItem('bc.userdata.v1') || '[]').length));
await page.evaluate(() => localStorage.clear());
await browser.close();
