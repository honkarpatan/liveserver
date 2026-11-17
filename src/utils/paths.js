/**
 * Normalize Acode / Termux / SD card paths for server root & file URLs.
 * Acode (Android) hands out several URI shapes:
 *   file:///storage/emulated/0/proj/index.html
 *   content://com.android.externalstorage.documents/tree/primary%3Aproj::primary:proj/index.html   (SAF tree)
 *   content://com.android.externalstorage.documents/document/primary%3Aproj%2Findex.html          (SAF document)
 *   content://com.termux.documents/tree/%2Fdata%2F...%2Fhome::/data/data/com.termux/files/home/x.html
 * The Alpine (proot) side sees internal storage as /sdcard and SD cards as /storage/<VOLUME-ID>.
 */
export function isHtmlFileName(name) {
  return /\.html?$/i.test(String(name || ''));
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

function dec(s) {
  try {
    return decodeURIComponent(s);
  } catch (_) {
    return s;
  }
}

/** "primary:dir/file" | "1A2B-3C4D:dir/file" -> absolute path as seen from Alpine */
export function safSpecToFs(spec) {
  const s = String(spec || '');
  const i = s.indexOf(':');
  if (i < 0) return s.startsWith('/') ? s : null;
  const vol = s.slice(0, i);
  const rest = s.slice(i + 1).replace(/^\/+/, '');
  const tail = rest ? '/' + rest : '';
  if (vol === 'primary') return '/sdcard' + tail;
  if (vol === 'home') return '/sdcard/Documents' + tail;
  if (/^[0-9A-F]{4}-[0-9A-F]{4}$/i.test(vol)) return '/storage/' + vol + tail;
  return null;
}

/** Best-effort filesystem path from Acode file uri */
export function uriToFsPath(uri) {
  if (!uri || typeof uri !== 'string') return null;
  let u = uri;

  if (u.startsWith('content://')) {
    // tree uri + "::" + document id/path (what Acode uses for files under an opened folder)
    if (u.includes('::')) {
      const tail = dec(u.split('::').pop());
      if (tail.startsWith('/')) return tail; // termux style
      const p = safSpecToFs(tail);
      if (p) return p;
    }
    // plain document uri
    const di = u.indexOf('/document/');
    if (di >= 0) {
      const spec = dec(u.slice(di + '/document/'.length).split('?')[0]);
      if (spec.startsWith('/')) return spec;
      const p = safSpecToFs(spec);
      if (p) return p;
    }
    return null;
  }

  if (u.startsWith('file://')) {
    u = dec(u.replace(/^file:\/\//, ''));
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
    const m = u.match(/(\/(?:storage|sdcard|emulated)\/[^?#]*)/i);
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
