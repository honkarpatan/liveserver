/**
 * When Alpine cannot read external SD / SAF paths, mirror the project into
 * internal storage (/sdcard/Acode/liveserver_cache/...) and serve from there.
 * Re-syncs on save and on a light poll so live content stays updated.
 */
import { getSettings, updateSetting } from '../core/settings.js';
import { uriToFsPath, dirnamePath, getActiveFile } from '../utils/paths.js';
import { silentExec } from '../utils/alpineExec.js';

const toast = acode.require('toast');

const MIRROR_HOST = '/sdcard/Acode/liveserver_cache';
const MAX_FILES = 250;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;

let pollTimer = null;
let lastManifest = null; // { id, files: { rel: sizeOrHash } }
let mirrorActive = null; // { id, alpineRoot, sourceRoot, sourceUri }

function fsOp() {
  try {
    return acode.require('fsOperation') || window.fsOperation;
  } catch (_) {
    return window.fsOperation;
  }
}

function hashId(s) {
  let h = 0;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return 'p' + Math.abs(h).toString(36);
}

function isRemoteRef(ref) {
  return /^(https?:|data:|blob:|\/\/|#|mailto:|tel:)/i.test(String(ref || '').trim());
}

function collectRefsFromHtml(html) {
  const refs = new Set();
  const re =
    /(?:src|href|data-src|poster)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    if (!isRemoteRef(m[1])) refs.add(m[1].split('?')[0].split('#')[0]);
  }
  // url(...) in inline styles
  const reUrl = /url\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;
  while ((m = reUrl.exec(html))) {
    if (!isRemoteRef(m[1])) refs.add(m[1].split('?')[0].split('#')[0]);
  }
  return [...refs];
}

function collectRefsFromCss(css) {
  const refs = new Set();
  const reUrl = /url\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;
  let m;
  while ((m = reUrl.exec(css))) {
    if (!isRemoteRef(m[1])) refs.add(m[1].split('?')[0].split('#')[0]);
  }
  const reImp = /@import\s+['"]([^'"]+)['"]/gi;
  while ((m = reImp.exec(css))) {
    if (!isRemoteRef(m[1])) refs.add(m[1].split('?')[0].split('#')[0]);
  }
  return [...refs];
}

function resolveRel(fromDir, ref) {
  if (!ref) return null;
  if (ref.startsWith('/')) return ref.replace(/^\/+/, '');
  const base = String(fromDir || '').replace(/\/+$/, '');
  const parts = (base ? base.split('/') : []).concat(String(ref).split('/'));
  const out = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

async function readText(uriOrPath) {
  const fs = fsOp();
  if (!fs) throw new Error('fsOperation missing');
  try {
    const data = await fs(uriOrPath).readFile('utf-8');
    if (typeof data === 'string') return data;
    if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
    return String(data || '');
  } catch (e) {
    // try plain path
    const data = await fs(uriOrPath).readFile();
    if (typeof data === 'string') return data;
    if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
    return String(data || '');
  }
}

async function writeText(path, text) {
  const fs = fsOp();
  if (!fs) throw new Error('fsOperation missing');
  const parent = dirnamePath(path);
  try {
    if (parent && !(await fs(parent).exists())) {
      await ensureDir(parent);
    }
  } catch (_) {}
  try {
    if (await fs(path).exists()) {
      await fs(path).writeFile(text);
    } else {
      const name = path.slice(path.lastIndexOf('/') + 1);
      const dir = dirnamePath(path);
      await fs(dir).createFile(name, text);
    }
  } catch (e) {
    // alpine fallback write via printf/base64 for small files
    const b64 = btoa(unescape(encodeURIComponent(text)));
    const q = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
    await silentExec(
      `mkdir -p ${q(dirnamePath(path))} && echo ${q(b64)} | base64 -d > ${q(path)}`,
      { timeoutMs: 20000 }
    );
  }
}

async function ensureDir(path) {
  const fs = fsOp();
  const q = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
  try {
    if (fs) {
      const parts = String(path).split('/').filter(Boolean);
      let cur = path.startsWith('/') ? '' : '';
      // Prefer alpine mkdir — more reliable on /sdcard
    }
  } catch (_) {}
  await silentExec(`mkdir -p ${q(path)}`, { timeoutMs: 10000 });
}

function joinUri(folderUri, rel) {
  if (!folderUri) return null;
  const r = String(rel || '').replace(/^\/+/, '');
  if (folderUri.includes('::')) {
    return folderUri; // can't always append; caller uses path
  }
  if (folderUri.startsWith('content://')) {
    // document path append is unreliable; return null to use path API
    return null;
  }
  return folderUri.replace(/\/+$/, '') + '/' + r;
}

/**
 * Build list of relative files to mirror starting from entry HTML under root.
 */
async function discoverFiles(sourceRoot, entryRel, sourceRootUri) {
  const files = new Map(); // rel -> content string | null (binary skip marker)
  const queue = [entryRel.replace(/^\/+/, '')];
  let total = 0;

  while (queue.length && files.size < MAX_FILES && total < MAX_TOTAL_BYTES) {
    const rel = queue.shift();
    if (!rel || files.has(rel)) continue;
    const absPath = sourceRoot.replace(/\/+$/, '') + '/' + rel;
    let text = null;
    try {
      const uri = joinUri(sourceRootUri, rel) || absPath;
      text = await readText(uri.startsWith('content:') ? uri : absPath);
    } catch (_) {
      try {
        text = await readText(absPath);
      } catch (e2) {
        console.warn('[LiveServer:mirror] skip', rel, e2?.message || e2);
        files.set(rel, null);
        continue;
      }
    }
    if (text == null) {
      files.set(rel, null);
      continue;
    }
    if (text.length > MAX_FILE_BYTES) {
      console.warn('[LiveServer:mirror] too large', rel);
      files.set(rel, null);
      continue;
    }
    files.set(rel, text);
    total += text.length;

    const dir = dirnamePath(rel) || '';
    const lower = rel.toLowerCase();
    let refs = [];
    if (/\.html?$/.test(lower)) refs = collectRefsFromHtml(text);
    else if (/\.css$/.test(lower)) refs = collectRefsFromCss(text);
    else continue;

    for (const ref of refs) {
      const next = resolveRel(dir, ref);
      if (next && !files.has(next) && !next.includes('..')) queue.push(next);
    }
  }
  return files;
}

export function getMirrorState() {
  return mirrorActive;
}

export function stopMirrorWatch() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * Mirror project to internal path. Returns alpine-served root path.
 */
export async function ensureProjectMirror(opts = {}) {
  const sourceRoot = String(opts.sourceRoot || '').replace(/\/+$/, '');
  if (!sourceRoot) throw new Error('No source root to mirror');

  const entryRel = String(opts.entryRel || 'index.html').replace(/^\/+/, '');
  const sourceRootUri = opts.sourceRootUri || getSettings().rootFolderUri || '';
  const id = hashId(sourceRoot + '|' + entryRel);
  const alpineRoot = `${MIRROR_HOST}/${id}`;

  toast('Mirroring project to internal storage…', 2000);
  await ensureDir(alpineRoot);

  const files = await discoverFiles(sourceRoot, entryRel, sourceRootUri);
  let written = 0;
  for (const [rel, content] of files) {
    if (content == null) continue;
    const dest = alpineRoot + '/' + rel;
    await ensureDir(dirnamePath(dest));
    await writeText(dest, content);
    written++;
  }

  if (written === 0) {
    throw new Error('Could not read any project files for mirror');
  }

  const manifest = {};
  for (const [rel, content] of files) {
    if (content != null) manifest[rel] = content.length + ':' + content.slice(0, 32);
  }
  lastManifest = { id, files: manifest };
  mirrorActive = { id, alpineRoot, sourceRoot, sourceRootUri, entryRel };

  try {
    updateSetting('lastMirrorRoot', alpineRoot);
  } catch (_) {}

  startMirrorWatch();
  console.log('[LiveServer:mirror] ready', alpineRoot, 'files=', written);
  toast(`Mirrored ${written} file(s) → internal cache`, 2500);
  return alpineRoot;
}

async function syncOne(rel) {
  if (!mirrorActive) return false;
  const { sourceRoot, sourceRootUri, alpineRoot } = mirrorActive;
  const absPath = sourceRoot.replace(/\/+$/, '') + '/' + rel;
  let text;
  try {
    const uri = joinUri(sourceRootUri, rel) || absPath;
    text = await readText(uri.startsWith('content:') ? uri : absPath);
  } catch (_) {
    try {
      text = await readText(absPath);
    } catch {
      return false;
    }
  }
  if (text == null) return false;
  const key = text.length + ':' + text.slice(0, 32);
  if (lastManifest?.files?.[rel] === key) return false;
  await ensureDir(dirnamePath(alpineRoot + '/' + rel));
  await writeText(alpineRoot + '/' + rel, text);
  if (!lastManifest) lastManifest = { id: mirrorActive.id, files: {} };
  lastManifest.files[rel] = key;
  console.log('[LiveServer:mirror] updated', rel);
  return true;
}

export function startMirrorWatch() {
  stopMirrorWatch();
  if (!mirrorActive) return;

  // Acode save → sync
  try {
    editorManager?.on?.('save-file', onEditorSave);
    document.addEventListener('liveserver-file-saved', onEditorSave);
  } catch (_) {}

  pollTimer = setInterval(async () => {
    if (!mirrorActive || !lastManifest) return;
    const rels = Object.keys(lastManifest.files || {});
    let changed = false;
    for (const rel of rels.slice(0, 40)) {
      try {
        if (await syncOne(rel)) changed = true;
      } catch (_) {}
    }
    if (changed) {
      try {
        document.dispatchEvent(new CustomEvent('liveserver-mirror-updated'));
      } catch (_) {}
    }
  }, 2500);
}

function onEditorSave(e) {
  try {
    if (!mirrorActive) return;
    const f = e?.target || e?.file || getActiveFile();
    const uri = f?.uri || f?.url || '';
    const fs = uriToFsPath(uri);
    if (!fs) return;
    const root = mirrorActive.sourceRoot;
    if (!fs.startsWith(root)) return;
    const rel = fs.slice(root.length).replace(/^\/+/, '');
    if (rel) syncOne(rel);
  } catch (_) {}
}

export async function mirrorIfNeeded(sourceRoot, entryRel, sourceRootUri) {
  return ensureProjectMirror({ sourceRoot, entryRel, sourceRootUri });
}
