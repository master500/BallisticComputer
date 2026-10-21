/**
 * ChamberSim – Einstiegspunkt. Einfacher Hash-Router mit vier Views und
 * unterer Tab-Leiste. Daten werden bei jedem View-Wechsel neu geladen.
 */
import { loadDb, loadLog } from './api.js';
import { el } from './util.js';
import { renderDatabase } from './views/database.js';
import { renderSimulation } from './views/simulation.js';
import { renderOptimization } from './views/optimization.js';
import { renderSquad } from './views/squad.js';

export const VIEWS = {
  datenbank: { title: 'Datenbank', render: renderDatabase },
  simulation: { title: 'Simulation', render: renderSimulation },
  optimierung: { title: 'Optimierung', render: renderOptimization },
  squad: { title: 'KI-Squad', render: renderSquad },
};

const main = document.getElementById('view');
const titleEl = document.getElementById('view-title');

async function route() {
  const key = (location.hash.slice(2) || 'simulation');
  const view = VIEWS[key] ?? VIEWS.simulation;
  titleEl.textContent = view.title;
  document.querySelectorAll('.tabbar a').forEach((a) => a.setAttribute('aria-current', a.dataset.view === key ? 'page' : 'false'));
  try {
    const [db, log] = await Promise.all([loadDb(), loadLog()]);
    view.render(main, { db, log });
  } catch (err) {
    main.replaceChildren(el('section', { class: 'card' }, el('h2', {}, 'Daten nicht verfügbar'), el('p', { class: 'muted' }, String(err.message || err))));
  }
  main.scrollTo?.(0, 0);
}

window.addEventListener('hashchange', route);
document.getElementById('reload').addEventListener('click', route);
route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
