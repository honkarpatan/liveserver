/** Chrome light / dark, picked from the active Acode theme */
function lum(css) {
  let m = String(css || '').trim().match(/^#([0-9a-f]{3,8})$/i);
  let r;
  let g;
  let b;
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    m = String(css || '').match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i);
    if (!m) return null;
    r = +m[1];
    g = +m[2];
    b = +m[3];
  }
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function detectTheme() {
  try {
    const cs = getComputedStyle(document.documentElement);
    const v = cs.getPropertyValue('--primary-color') || cs.getPropertyValue('--secondary-color');
    const l = lum(v);
    if (l != null) return l > 0.6 ? 'light' : 'dark';
  } catch (_) {}
  return 'dark';
}
