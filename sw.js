/**
 * BallisticComputer Service Worker – Offline-Caching.
 * App-Shell: cache-first. Daten (data/*): network-first mit Cache-Fallback.
 * Bei Änderungen an der App-Shell CACHE_VERSION erhöhen.
 */
const CACHE_VERSION = 'ballisticcomputer-v1.5.4';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/api.js', 'js/util.js', 'js/chart.js', 'js/model.js', 'js/ladder.js',
  'js/views/database.js', 'js/views/simulation.js', 'js/views/optimization.js', 'js/views/cip.js', 'js/views/squad.js', 'js/views/userdata.js',
  'js/userdata/csv.js', 'js/userdata/mapping.js', 'js/userdata/store.js', 'js/userdata/sources.js', 'js/userdata/grtload.js', 'js/userdata/cipcheck.js', 'js/userdata/primer.js', 'js/userdata/powders.js',
  'js/cip/aliases.js', 'js/cip/lookup.js', 'js/cip/pressure.js',
  'js/mfr/parse.js', 'js/mfr/ladder.js', 'js/mfr/check.js', 'js/mfr/store.js', 'js/mfr/apply.js', 'js/mfr/panel.js',
  'data/cip/cip_pmax_tab1.json', 'data/cip/cip_pmax_tab2-5.json', 'data/cip/cip_l6.json', 'data/cip/cip_l6_tab2-5.json',
  'data/powders/powder_catalog.json',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/data/')) {
    e.respondWith(fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_VERSION).then((c) => c.put(url.pathname, copy));
      return res;
    }).catch(() => caches.match(url.pathname)));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
