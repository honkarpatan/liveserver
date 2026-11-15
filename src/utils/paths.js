/**
 * Normalize Acode / Termux / SD card paths for server root & file URLs.
 */
export function isHtmlFileName(name) {
  return /\.(html?|xhtml)$/i.test(String(name || ''));
}

export function isHtmlFile(file) {
  return !!(file && isHtmlFileName(file.filename || file.name));
}

export function getActiveFile() {
  try {
    return editorManager?.activeFile || null;
  } catch (_) {
    return null;
  }
}

/** Best-effort filesystem path from Acode file uri */
export function uriToFsPath(uri) {
  if (!uri || typeof uri !== 'string') return null;
  let u = uri;
  // content://... or file://
  if (u.startsWith('file://')) {
    try {
      u = decodeURIComponent(u.replace(/^file:\/\//, ''));
    } catch (_) {
      u = u.replace(/^file:\/\//, '');
    }
  }
  // Termux-style
  if (u.includes('/data/data/com.termux/files/home')) {
    return u.includes('::') ? u.split('::').pop() : u;
  }
  if (u.includes('::')) {
    const tail = u.split('::').pop();
    if (tail && tail.startsWith('/')) return tail;
  }
  // sdcard
  if (/\/(storage|sdcard|emulated)\//i.test(u)) {
    const m = u.match(/(\/(?:storage|sdcard|emulated)\/[^\s?]*)/i);
    if (m) return m[1];
  }
  if (u.startsWith('/')) return u;
  return null;
}

export function dirnamePath(p) {
  if (!p) return null;
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return i <= 0 ? p : p.slice(0, i);
}

export function joinUrl(base, rel) {
  const b = String(base || '').replace(/\/+$/, '');
  const r = String(rel || '').replace(/^\/+/, '');
  return r ? `${b}/${r}` : b;
}
