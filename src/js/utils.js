// utils.js - Funciones utilitarias

export function uid(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}

export function escapeHtml(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function placeholderCrest(name) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' rx='12' fill='#0b2035'/><text x='50%' y='50%' font-family='Arial' font-size='48' fill='#9fd6b6' dominant-baseline='middle' text-anchor='middle'>${initials}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function placeholderDataURI() {
  return placeholderCrest("EQ");
}

