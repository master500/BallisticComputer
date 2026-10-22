/** Kleine DOM-Helfer. */
export function el(tag, attrs = {}, ...children) {
  const node = globalThis.document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof globalThis.Node ? c : globalThis.document.createTextNode(String(c)));
  }
  return node;
}
/** replaceChildren macht aus null den Text "null". Leere Knoten weglassen. */
export function setChildren(parent, ...children) {
  parent.replaceChildren(...children.flat().filter((child) => child != null && child !== false));
}

export const fmt = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: d }) : '—');
export const fmtTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
};
