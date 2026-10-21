/**
 * View: KI-Squad – Statuskarten für sechs simulierte Agenten, gespeist aus log.jsonl.
 * Zuordnung: Ein Log-Eintrag gehört zu einem Agenten, wenn `agent` passt oder
 * (Fallback) eines seiner Stichwörter im Feld `event` vorkommt. Empfohlen: Die
 * Status-Routine schreibt ein Feld `agent` (z. B. "database") in jede Zeile.
 */
import { el, fmtTime } from '../util.js';

export const AGENTS = [
  { id: 'ballistics', name: 'Ballistik', icon: '🎯', role: 'Rechnet Spielzeug-Simulationen', keys: ['ballist', 'sim_run', 'velocity'] },
  { id: 'database', name: 'Datenbank', icon: '🗄️', role: 'Prüft & aktualisiert db.json', keys: ['seed', 'db_', 'database', 'datenbank', 'update', 'check'] },
  { id: 'optimization', name: 'Optimierung', icon: '📈', role: 'Parameter-Sweeps', keys: ['optim', 'sweep'] },
  { id: 'validation', name: 'Validierung', icon: '✅', role: 'Sucht Widersprüche & Ausreißer', keys: ['valid', 'outlier', 'ausreiß'] },
  { id: 'safety', name: 'Sicherheitsmonitor', icon: '🛡️', role: 'Vergleicht Drücke mit Limits', keys: ['safety', 'pressure_alert', 'alarm', 'warn'] },
  { id: 'reporting', name: 'Reporting', icon: '📝', role: 'Fasst Änderungen zusammen', keys: ['report', 'status', 'bericht'] },
];

function eventsFor(agent, log) {
  return log.filter((e) => {
    if (e.agent) return String(e.agent).toLowerCase().includes(agent.id) || String(e.agent).toLowerCase().includes(agent.name.toLowerCase());
    const hay = String(e.event ?? '').toLowerCase();
    return agent.keys.some((k) => hay.includes(k));
  });
}

function statusOf(events) {
  const last = events.at(-1);
  if (!last) return { label: 'Bereit', tone: 'idle' };
  if (/alarm|error|fehler|exceed|über/i.test(`${last.event} ${last.note} ${last.status ?? ''}`)) return { label: 'Warnung', tone: 'bad' };
  const ageMin = (Date.now() - new Date(last.ts).getTime()) / 60000;
  return ageMin < 45 ? { label: 'Aktiv', tone: 'good' } : { label: 'Ruhend', tone: 'idle' };
}

export function renderSquad(root, { log }) {
  root.replaceChildren(
    el('p', { class: 'muted small' }, `${log.length} Ereignis(se) in log.jsonl · alle Agenten simuliert`),
    el('div', { class: 'grid' }, AGENTS.map((a) => {
      const ev = eventsFor(a, log);
      const st = statusOf(ev);
      const last = ev.at(-1);
      return el('article', { class: 'card agent' },
        el('header', {}, el('span', { class: 'agent-icon' }, a.icon),
          el('div', {}, el('h3', {}, a.name), el('div', { class: 'muted small' }, a.role)),
          el('span', { class: `status ${st.tone}` }, st.label)),
        el('p', { class: 'small' }, last ? (last.note || last.event) : 'Noch keine Einträge.'),
        el('div', { class: 'muted small' }, last ? `Zuletzt: ${fmtTime(last.ts)} · ${ev.length} Ereignis(se)` : '—'));
    })),
    el('section', { class: 'card' }, el('h2', {}, 'Letzte Ereignisse'),
      el('ul', { class: 'list' }, log.slice(-10).reverse().map((e) =>
        el('li', {}, el('div', {}, el('strong', {}, e.event ?? '—'), el('div', { class: 'muted small' }, e.note ?? '')),
          el('span', { class: 'muted small' }, fmtTime(e.ts)))))),
  );
}
