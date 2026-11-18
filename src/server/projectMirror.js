/**
 * Storage mirror.
 *
 * Problem: the Node backend runs inside Alpine (proot) and can only serve what Alpine can
 * read. Files that live on the SD card, in a SAF folder (content://...) or anywhere else
 * Alpine cannot see were answered with "not found".
 *
 * Solution (all copying is done by Acode's own fsOperation, which CAN read any storage):
 *   1. read the entry HTML through fsOperation (binary safe)
 *   2. parse it (and every CSS / JS / HTML it pulls in) for the exact files it depends on
 *   3. copy only those files into a cache dir that Alpine can serve:
 *        /root/.acode_liveserver/cache/<id>/<same relative paths>
 *   4. watch the originals: whenever size / mtime of a source file no longer matches the
 *      mirrored copy it is copied again (new dependencies are picked up automatically),
 *      then connected browsers get a live-reload signal.
 *
 * Writing into Alpine:
 *   - "direct": Acode can write straight into the Alpine rootfs
 *     (<app files dir>/alpine/root/...). Detected at runtime with a probe file, so it is
 *     only used when it is proven to work. Fast and binary safe.
 *   - "shell": fallback. Bytes go through base64 chunks piped to `base64 -d` inside Alpine.
 */
import { getSettings, updateSetting } from '../core/settings.js';
import { getActiveFile } from '../utils/paths.js';
import { silentExec } from '../utils/alpineExec.js';

const toast = (...a) => {
  try {
    acode.require('toast')(...a);
  } catch (_) {}
};

const CACHE_HOST = '/root/.acode_liveserver/cache';
const POLL_MS = 2000;
const READ_PARALLEL = 4;
const SHELL_CHUNK_B64 = 44000; // multiple of 4, keeps each command < ~46 KB
const LIMITS = {
  direct: { files: 800, file: 96 * 1024 * 1024, total: 400 * 1024 * 1024 },
  shell: { files: 400, file: 8 * 1024 * 1024, total: 40 * 1024 * 1024 },
};

const TEXT_EXT = /\.(html?|css|m?js)$/i;
const JS_LITERAL_EXT =
  'js|mjs|json|css|html?|svg|png|jpe?g|gif|webp|avif|ico|bmp|woff2?|ttf|otf|eot|mp3|mp4|webm|ogg|wav|m4a|glb|gltf|wasm|txt|xml|csv|webmanifest|map';

/* ------------------------------------------------------------------ state */

let state = null;
/*
  state = {
    id, aroot, rootPath, baseUri, entryRel, entries:Set,
    files: Map<rel, { uri, sig, size, deps:Set }>,
    total, missing:Set,
  }
*/
let transport = null; // { mode:'direct'|'shell', androidCache?:string }
let pollTimer = null;
let polling = false;
let busy = Promise.resolve();
let saveHandler = null;
let reloadTimer = null;

export function getMirrorState() {
  return state
    ? {
        id: state.id,
        alpineRoot: state.aroot,
        sourceRoot: state.rootPath,
        sourceUri: state.baseUri,
        entryRel: state.entryRel,
        files: state.files.size,
        mode: transport?.mode || null,
      }
    : null;
}

/* ------------------------------------------------------------------ small helpers */

function fsOp() {
  try {
    return acode.require('fsOperation') || window.fsOperation;
  } catch (_) {
    return window.fsOperation;
  }
}

function hashId(s) {
  let h = 5381;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return 'p' + (h >>> 0).toString(36);
}

function q(x) {
  return "'" + String(x).replace(/'/g, "'\\''") + "'";
}

function dec(s) {
  try {
    return decodeURIComponent(s);
  } catch (_) {
    return s;
  }
}

function dirOf(rel) {
  const i = rel.lastIndexOf('/');
  return i < 0 ? '' : rel.slice(0, i);
}

function toBytes(data) {
  if (data == null) return null;
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (typeof data === 'string') return new TextEncoder().encode(data);
  if (typeof data === 'object' && typeof data.byteLength === 'number') return new Uint8Array(data);
  return null;
}

function bytesToB64(bytes) {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(bin);
}

function quickHash(bytes) {
  let h = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36) + ':' + bytes.length;
}

async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await worker(items[idx], idx);
      } catch (e) {
        out[idx] = undefined;
      }
    }
  });
  await Promise.all(runners);
  return out;
}

function serial(fn) {
  const run = busy.then(fn, fn);
  busy = run.catch(() => {});
  return run;
}

/* ------------------------------------------------------------------ source fs (Acode fsOperation) */

async function statUri(uri) {
  try {
    const st = await fsOp()(uri).stat();
    if (!st) return null;
    return st;
  } catch (_) {
    return null;
  }
}

function isDirStat(st) {
  return !!(st && (st.isDirectory === true || st.type === 'dir' || st.type === 'directory'));
}

function sigOfStat(st) {
  if (!st) return null;
  const len = st.length != null ? st.length : st.size;
  const mt = st.lastModified != null ? st.lastModified : st.mtime != null ? st.mtime : st.modified;
  if (len == null && mt == null) return null;
  return String(len) + '|' + String(mt instanceof Date ? mt.getTime() : mt);
}

async function readBytes(uri) {
  const data = await fsOp()(uri).readFile();
  const b = toBytes(data);
  if (!b) throw new Error('unreadable');
  return b;
}

function joinUri(base, rel) {
  const b = String(base || '').replace(/\/+$/, '');
  const r = String(rel || '').replace(/^\/+/, '');
  return r ? b + '/' + r : b;
}

/** raw join first, then a percent-encoded variant (file:// uris want encoded segments) */
function uriVariants(base, rel) {
  const raw = joinUri(base, rel);
  const enc = joinUri(
    base,
    rel
      .split('/')
      .map((s) => encodeURIComponent(s))
      .join('/')
  );
  return raw === enc ? [raw] : [raw, enc];
}

/** walk a directory tree through lsDir (works for SAF where uri joining is unreliable) */
async function walkResolve(baseUri, rel, lsCache) {
  let cur = baseUri;
  const parts = rel.split('/').filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    let list = lsCache.get(cur);
    if (!list) {
      try {
        list = (await fsOp()(cur).lsDir()) || [];
      } catch (_) {
        return null;
      }
      lsCache.set(cur, list);
    }
    const want = parts[i];
    const lower = want.toLowerCase();
    const ent =
      list.find((e) => (e.name || '') === want) ||
      list.find((e) => dec(e.name || '') === want) ||
      list.find((e) => (e.name || '').toLowerCase() === lower);
    if (!ent) return null;
    cur = ent.url || ent.uri || null;
    if (!cur) return null;
  }
  const st = await statUri(cur);
  if (!st || isDirStat(st)) return null;
  return { uri: cur, st };
}

async function resolveSource(rel, lsCache) {
  if (!state) return null;
  for (const u of uriVariants(state.baseUri, rel)) {
    const st = await statUri(u);
    if (st && !isDirStat(st)) return { uri: u, st };
    if (st && isDirStat(st)) return null;
  }
  return walkResolve(state.baseUri, rel, lsCache);
}

/* ------------------------------------------------------------------ base uri detection */

function rootPathToFileUris(rootPath) {
  const out = [];
  const p = String(rootPath || '').replace(/\/+$/, '');
  if (!p.startsWith('/')) return out;
  let abs = p;
  let m = p.match(/^\/sdcard(\/.*)?$/);
  if (m) abs = '/storage/emulated/0' + (m[1] || '');
  m = p.match(/^\/storage\/self\/primary(\/.*)?$/);
  if (m) abs = '/storage/emulated/0' + (m[1] || '');
  const enc = abs
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  out.push('file://' + enc, 'file://' + abs);
  if (abs !== p) out.push('file://' + p);
  return out;
}

function tryStripEntry(uri, entryRel) {
  const variants = [entryRel, encodeURI(entryRel), entryRel.split('/').map(encodeURIComponent).join('/')];
  for (const v of variants) {
    if (uri.endsWith('/' + v)) return uri.slice(0, uri.length - v.length - 1);
  }
  // SAF document uri with %2F separators
  const encAll = encodeURIComponent(entryRel);
  if (uri.endsWith('%2F' + encAll)) return uri.slice(0, uri.length - encAll.length - 3);
  return null;
}

function treeVariants(u) {
  const out = [u];
  const m = u.match(/\/tree\/([^/:]+)$/);
  if (m) out.push(u + '::' + dec(m[1]));
  return out;
}

function baseCandidates(rootPath, entryRel, rootUri) {
  const out = [];
  const push = (x) => {
    if (x && !out.includes(x)) out.push(x);
  };

  const f = getActiveFile();
  const au = f?.uri || f?.url || '';
  const activeName = String(au).split('/').pop();
  const entryName = entryRel.split('/').pop();
  if (au && (dec(activeName) === entryName || activeName === entryName)) {
    const b = tryStripEntry(au, entryRel);
    if (b) treeVariants(b).forEach(push);
  }

  if (rootUri) treeVariants(String(rootUri).replace(/\/+$/, '')).forEach(push);
  rootPathToFileUris(rootPath).forEach(push);
  if (String(rootPath || '').startsWith('/')) push(String(rootPath).replace(/\/+$/, ''));
  return out;
}

async function pickBase(rootPath, entryRel, rootUri) {
  const lsCache = new Map();
  for (const base of baseCandidates(rootPath, entryRel, rootUri)) {
    for (const u of uriVariants(base, entryRel)) {
      const st = await statUri(u);
      if (st && !isDirStat(st)) return { base, uri: u, st };
    }
    const hit = await walkResolve(base, entryRel, lsCache);
    if (hit) return { base, uri: hit.uri, st: hit.st };
  }
  return null;
}

/* ------------------------------------------------------------------ dependency parsing */

function isRemoteRef(ref) {
  return /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(String(ref || '').trim());
}

function cleanRef(ref) {
  let r = String(ref || '').trim();
  if (!r || isRemoteRef(r)) return null;
  r = r.split('#')[0].split('?')[0];
  if (!r || r.endsWith('/')) return null;
  return dec(r);
}

/** resolve a reference to a normalized path relative to the served root (or null) */
function resolveRef(fromRel, ref, absBase) {
  const r = cleanRef(ref);
  if (!r) return null;
  let parts = [];
  if (r.startsWith('/')) parts = r.slice(1).split('/');
  else parts = (absBase != null ? absBase : dirOf(fromRel)).split('/').filter(Boolean).concat(r.split('/'));
  const stack = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') {
      if (!stack.length) return null; // escapes the root, the server could not serve it either
      stack.pop();
    } else stack.push(p);
  }
  return stack.length ? stack.join('/') : null;
}

function cssRefs(css) {
  const refs = [];
  const text = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
  let m;
  const reUrl = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s][^)]*?))\s*\)/gi;
  while ((m = reUrl.exec(text))) refs.push(m[1] || m[2] || m[3]);
  const reImp = /@import\s+(?:"([^"]+)"|'([^']+)')/gi;
  while ((m = reImp.exec(text))) refs.push(m[1] || m[2]);
  return refs;
}

function jsRefs(js) {
  const refs = [];
  const text = String(js || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
  let m;
  const reImport = /(?:\bfrom|\bimport)\s*\(?\s*(?:"([^"]+)"|'([^']+)'|`([^`$]+)`)/g;
  while ((m = reImport.exec(text))) refs.push(m[1] || m[2] || m[3]);
  const reScripts = /importScripts\s*\(([^)]*)\)/g;
  while ((m = reScripts.exec(text))) {
    const reS = /["'`]([^"'`]+)["'`]/g;
    let s;
    while ((s = reS.exec(m[1]))) refs.push(s[1]);
  }
  const reUrl = /new\s+URL\(\s*(?:"([^"]+)"|'([^']+)')/g;
  while ((m = reUrl.exec(text))) refs.push(m[1] || m[2]);
  const reLit = new RegExp(
    '["\'`]((?:\\.{1,2}/|/)?[A-Za-z0-9_@%~+\\-./]+\\.(?:' + JS_LITERAL_EXT + '))(?:[?#][^"\'`]*)?["\'`]',
    'gi'
  );
  while ((m = reLit.exec(text))) refs.push(m[1]);
  const reRel = /["'`](\.{1,2}\/[^"'`\s]+)["'`]/g;
  while ((m = reRel.exec(text))) refs.push(m[1]);
  return refs;
}

const HTML_ATTRS = new Set([
  'src', 'href', 'poster', 'data', 'data-src', 'data-href', 'data-background', 'data-bg', 'manifest', 'background', 'srcset', 'data-srcset',
]);

function htmlRefs(html) {
  const refs = [];
  const text = String(html || '').replace(/<!--[\s\S]*?-->/g, '');
  const reTag = /<([a-zA-Z][\w:-]*)\b([^>]*)>/g;
  let t;
  while ((t = reTag.exec(text))) {
    const tag = t[1].toLowerCase();
    const attrs = t[2];
    const reAttr = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let a;
    while ((a = reAttr.exec(attrs))) {
      const name = a[1].toLowerCase();
      const val = a[2] != null ? a[2] : a[3] != null ? a[3] : a[4];
      if (name === 'style') {
        cssRefs('x{' + val + '}').forEach((r) => refs.push(r));
        continue;
      }
      if (!HTML_ATTRS.has(name)) continue;
      if (name === 'srcset' || name === 'data-srcset') {
        String(val)
          .split(',')
          .forEach((part) => {
            const u = part.trim().split(/\s+/)[0];
            if (u) refs.push(u);
          });
        continue;
      }
      if (name === 'href' && (tag === 'a' || tag === 'area')) {
        // only navigation to other local pages is a dependency
        if (/\.html?([?#].*)?$/i.test(val)) refs.push(val);
        continue;
      }
      if (name === 'action') continue;
      refs.push(val);
    }
  }
  const reStyle = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = reStyle.exec(text))) cssRefs(m[1]).forEach((r) => refs.push(r));
  const reScript = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  while ((m = reScript.exec(text))) {
    if (/\bsrc\s*=/.test(m[1])) continue;
    if (/type\s*=\s*["']?(?:application\/(?:ld\+)?json|importmap)/i.test(m[1]) && !/importmap/i.test(m[1])) continue;
    jsRefs(m[2]).forEach((r) => refs.push(r));
  }
  return refs;
}

function kindOf(rel) {
  if (/\.html?$/i.test(rel)) return 'html';
  if (/\.css$/i.test(rel)) return 'css';
  if (/\.m?js$/i.test(rel)) return 'js';
  return 'bin';
}

/** returns candidate rel paths (ordered) for every reference found in a text file */
function extractDeps(rel, kind, bytes, entryRel) {
  let text;
  try {
    text = new TextDecoder('utf-8').decode(bytes);
  } catch (_) {
    return [];
  }
  let refs = [];
  if (kind === 'html') refs = htmlRefs(text);
  else if (kind === 'css') refs = cssRefs(text);
  else if (kind === 'js') refs = jsRefs(text);

  const out = [];
  const seen = new Set();
  for (const ref of refs) {
    const cands = [];
    const a = resolveRef(rel, ref);
    if (a) cands.push(a);
    if (kind === 'js') {
      // classic scripts / workers resolve relative to the page, not the script
      const b = resolveRef(rel, ref, dirOf(entryRel));
      if (b) cands.push(b);
      const c = resolveRef(rel, '/' + String(ref).replace(/^\.{0,2}\/+/, ''));
      if (c) cands.push(c);
    }
    cands.forEach((c) => {
      if (!seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    });
  }
  return out;
}

/* ------------------------------------------------------------------ Alpine side (write transport) */

function shellOut(cmd, ms) {
  return silentExec(cmd, { timeoutMs: ms || 20000 });
}

function androidFilesDirs() {
  const out = [];
  const push = (x) => {
    if (!x) return;
    const v = String(x).replace(/\/+$/, '');
    if (!out.includes(v)) out.push(v);
  };
  try {
    push(window.cordova?.file?.dataDirectory);
  } catch (_) {}
  const pkgs = [];
  try {
    if (window.BuildInfo?.packageName) pkgs.push(window.BuildInfo.packageName);
  } catch (_) {}
  pkgs.push('com.foxdebug.acode', 'com.foxdebug.acodefree');
  pkgs.forEach((p) => {
    push('file:///data/user/0/' + p + '/files');
    push('file:///data/data/' + p + '/files');
  });
  return out;
}

async function initTransport() {
  if (transport) return transport;
  const tag = '.probe_' + Math.random().toString(36).slice(2, 8);
  const out = await shellOut(
    'mkdir -p ' + q(CACHE_HOST) + ' && echo ok > ' + q(CACHE_HOST + '/' + tag) + ' && echo PROBE_OK',
    20000
  );
  if (!String(out || '').includes('PROBE_OK')) {
    throw new Error('Alpine shell cannot write its cache dir (open the Acode terminal once)');
  }

  let found = null;
  for (const files of androidFilesDirs()) {
    for (const rootDir of ['/alpine/root', '/alpine/home/root']) {
      const cache = files + rootDir + '/.acode_liveserver/cache';
      const st = await statUri(cache + '/' + tag);
      if (st) {
        found = cache;
        break;
      }
    }
    if (found) break;
  }
  shellOut('rm -f ' + q(CACHE_HOST + '/' + tag), 8000).catch(() => {});

  transport = found ? { mode: 'direct', androidCache: found, verified: false } : { mode: 'shell' };
  console.log('[LiveServer:mirror] transport', transport.mode, found || '');
  return transport;
}

async function alpineMkdirs(dirs) {
  const list = [...new Set(dirs.filter(Boolean))];
  if (!list.length) return;
  let script = '';
  for (const d of list) {
    const add = 'mkdir -p ' + q(d) + '; ';
    if (script.length + add.length > 40000) {
      await shellOut(script, 20000);
      script = '';
    }
    script += add;
  }
  if (script) await shellOut(script, 20000);
}

async function shellWriteBatch(items) {
  // items: [{ dest, bytes }]
  let script = '';
  const flush = async () => {
    if (!script) return;
    await shellOut(script, 60000);
    script = '';
  };
  for (const it of items) {
    const b64 = bytesToB64(it.bytes);
    if (!b64.length) {
      const c = ': > ' + q(it.dest) + '; ';
      if (script.length + c.length > 46000) await flush();
      script += c;
      continue;
    }
    for (let off = 0, first = true; off < b64.length; off += SHELL_CHUNK_B64, first = false) {
      const piece = b64.slice(off, off + SHELL_CHUNK_B64);
      const c = 'printf %s ' + q(piece) + ' | base64 -d ' + (first ? '>' : '>>') + ' ' + q(it.dest) + '; ';
      if (script.length + c.length > 46000) await flush();
      script += c;
    }
  }
  await flush();
}

async function directWrite(rel, bytes, exists) {
  const dest = transport.androidCache + '/' + state.id + '/' + rel;
  if (exists) {
    await fsOp()(dest).writeFile(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  } else {
    const dir = transport.androidCache + '/' + state.id + (dirOf(rel) ? '/' + dirOf(rel) : '');
    const name = rel.split('/').pop();
    await fsOp()(dir).createFile(name, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }
}

async function alpineSize(rel) {
  const out = await shellOut('wc -c < ' + q(state.aroot + '/' + rel) + ' 2>/dev/null || echo NONE', 10000);
  const m = String(out || '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : -1;
}

/** write a set of files into the Alpine cache. items: [{ rel, bytes }] */
async function writeToAlpine(items) {
  if (!items.length) return;
  await alpineMkdirs(items.map((i) => state.aroot + (dirOf(i.rel) ? '/' + dirOf(i.rel) : '')));

  if (transport.mode === 'direct') {
    try {
      for (const it of items) {
        await directWrite(it.rel, it.bytes, state.written.has(it.rel));
        state.written.add(it.rel);
      }
      if (!transport.verified) {
        // first use: prove that Alpine really sees what Acode wrote
        const probe = items.find((i) => i.bytes.length > 0) || items[0];
        const size = await alpineSize(probe.rel);
        if (size !== probe.bytes.length) throw new Error('direct write not visible in Alpine');
        transport.verified = true;
      }
      return;
    } catch (e) {
      console.warn('[LiveServer:mirror] direct write failed, using shell transport', e?.message || e);
      transport = { mode: 'shell' };
    }
  }
  await shellWriteBatch(items.map((i) => ({ dest: state.aroot + '/' + i.rel, bytes: i.bytes })));
  items.forEach((i) => state.written.add(i.rel));
}

/* ------------------------------------------------------------------ discovery / copy */

/**
 * read + copy + parse a list of rels, following dependencies breadth first.
 * Returns number of files (re)written.
 */
async function ingest(startRels, opts = {}) {
  const limits = LIMITS[transport.mode] || LIMITS.shell;
  const lsCache = new Map();
  let level = startRels.filter((r) => r);
  let written = 0;
  const skipped = [];

  while (level.length) {
    const results = await pool(level, READ_PARALLEL, async (rel) => {
      const known = state.files.get(rel);
      const src = await resolveSource(rel, lsCache);
      if (!src) {
        state.missing.add(rel);
        return null;
      }
      const sig = sigOfStat(src.st);
      const size = src.st.length != null ? src.st.length : src.st.size;
      if (size != null && size > limits.file) {
        skipped.push(rel + ' (' + Math.round(size / 1048576) + ' MB)');
        return null;
      }
      if (!opts.force && known && sig && known.sig === sig && known.uri === src.uri) {
        return { rel, unchanged: true, known };
      }
      const bytes = await readBytes(src.uri);
      const effSig = sig || quickHash(bytes);
      if (!opts.force && known && known.sig === effSig && state.written.has(rel)) {
        return { rel, unchanged: true, known };
      }
      return { rel, src, bytes, sig: effSig };
    });

    const todo = results.filter((r) => r && !r.unchanged);
    const next = new Set();

    // total size guard
    for (const r of todo) {
      const prev = state.files.get(r.rel);
      const oldLen = prev ? prev.size || 0 : 0;
      if (state.total - oldLen + r.bytes.length > limits.total) {
        skipped.push(r.rel + ' (total limit)');
        r.skip = true;
      } else if (!prev && state.files.size >= limits.files) {
        skipped.push(r.rel + ' (file count limit)');
        r.skip = true;
      }
    }
    const items = todo.filter((r) => !r.skip).map((r) => ({ rel: r.rel, bytes: r.bytes }));
    await writeToAlpine(items);

    for (const r of todo) {
      if (r.skip) continue;
      const prev = state.files.get(r.rel);
      state.total += r.bytes.length - (prev ? prev.size || 0 : 0);
      const kind = kindOf(r.rel);
      const deps = TEXT_EXT.test(r.rel) ? extractDeps(r.rel, kind, r.bytes, state.entryRel) : [];
      state.files.set(r.rel, {
        uri: r.src.uri,
        sig: r.sig,
        size: r.bytes.length,
        deps: new Set(deps),
      });
      state.missing.delete(r.rel);
      written++;
      deps.forEach((d) => {
        if (!state.files.has(d) && !state.missing.has(d)) next.add(d);
      });
    }
    // dependencies of unchanged text files that were never resolved before
    results.forEach((r) => {
      if (r && r.unchanged && r.known) {
        r.known.deps.forEach((d) => {
          if (!state.files.has(d) && !state.missing.has(d)) next.add(d);
        });
      }
    });
    level = [...next];
  }

  if (skipped.length) {
    console.warn('[LiveServer:mirror] skipped', skipped.slice(0, 6).join(', '));
    toast('Mirror skipped large file: ' + skipped[0], 3500);
  }
  return written;
}

/* ------------------------------------------------------------------ change watcher */

function notifyReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(async () => {
    try {
      if (getSettings().liveReload === false) return;
      const { getServerStatus } = await import('./status.js');
      const st = getServerStatus();
      if (!st.running || !st.port) return;
      await fetch('http://127.0.0.1:' + st.port + '/reload', { method: 'POST' }).catch(() => {});
    } catch (_) {}
    try {
      window.dispatchEvent(new CustomEvent('liveserver-mirror-updated'));
    } catch (_) {}
  }, 120);
}

/** compare every tracked source with its copy, re-copy what differs. */
async function syncAll(opts = {}) {
  if (!state || !transport) return 0;
  const lsCache = new Map();
  const rels = [...state.files.keys()];
  const stale = [];

  await pool(rels, READ_PARALLEL, async (rel) => {
    const known = state.files.get(rel);
    const st = await statUri(known.uri);
    if (!st) {
      // moved / renamed / case changes: try resolving again
      const src = await resolveSource(rel, lsCache);
      if (src) stale.push(rel);
      return;
    }
    const sig = sigOfStat(st);
    if (sig == null) {
      stale.push(rel); // no stat info: content hash decides inside ingest
    } else if (sig !== known.sig) {
      stale.push(rel);
    }
  });

  // retry files that were missing before (user created them meanwhile) - not on every tick
  state.tick = (state.tick || 0) + 1;
  let retry = [];
  if (opts.retryMissing || state.tick % 5 === 0) {
    retry = [...state.missing];
    state.missing.clear();
  }

  const n = await ingest([...stale, ...retry], { force: false });
  if (n > 0 && !opts.silent) notifyReload();
  return n;
}

function startPolling() {
  stopPolling();
  const tick = async () => {
    if (!state) return;
    if (!polling) {
      polling = true;
      const t0 = Date.now();
      try {
        await serial(() => syncAll());
      } catch (e) {
        console.warn('[LiveServer:mirror] poll', e?.message || e);
      }
      polling = false;
      const took = Date.now() - t0;
      pollTimer = setTimeout(tick, Math.max(POLL_MS, took * 1.5));
    }
  };
  pollTimer = setTimeout(tick, POLL_MS);

  if (!saveHandler) {
    saveHandler = () => {
      if (!state) return;
      // Acode finished writing the file; compare right away instead of waiting for the poll
      setTimeout(() => serial(() => syncAll({ retryMissing: true })).catch(() => {}), 150);
    };
    try {
      editorManager?.on?.('save-file', saveHandler);
    } catch (_) {}
  }
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  polling = false;
}

export function stopMirrorWatch() {
  stopPolling();
  try {
    if (saveHandler) editorManager?.off?.('save-file', saveHandler);
  } catch (_) {}
  saveHandler = null;
}

export function startMirrorWatch() {
  if (state) startPolling();
}

/* ------------------------------------------------------------------ public API */

/**
 * Mirror the entry file + its exact dependencies into the Alpine cache and keep them in sync.
 * Returns the Alpine path that the server should use as its root.
 */
export function ensureProjectMirror(opts = {}) {
  return serial(async () => {
    const rootPath = String(opts.sourceRoot || '').replace(/\/+$/, '');
    const entryRel = String(opts.entryRel || 'index.html').replace(/^\/+/, '');
    if (!rootPath && !opts.sourceRootUri) throw new Error('No source root to mirror');

    const tp = await initTransport();
    const id = hashId(rootPath || String(opts.sourceRootUri));
    const aroot = CACHE_HOST + '/' + id;

    // reuse the running mirror when it is the same project
    if (state && state.id === id) {
      state.entries.add(entryRel);
      state.entryRel = entryRel;
      const found = state.files.has(entryRel) ? true : !!(await resolveSource(entryRel, new Map()));
      if (!found) throw new Error('Cannot read ' + entryRel + ' from storage');
      await syncAll({ silent: true });
      await ingest([entryRel]);
      startPolling();
      return aroot;
    }

    stopPolling();
    const pick = await pickBase(rootPath, entryRel, opts.sourceRootUri || getSettings().rootFolderUri || '');
    if (!pick) {
      throw new Error('Acode cannot read ' + entryRel + ' under ' + (rootPath || opts.sourceRootUri));
    }

    state = {
      id,
      aroot,
      rootPath,
      baseUri: pick.base,
      entryRel,
      entries: new Set([entryRel]),
      files: new Map(),
      written: new Set(),
      missing: new Set(),
      total: 0,
    };

    // fresh cache dir for this project
    await shellOut('rm -rf ' + q(aroot) + ' && mkdir -p ' + q(aroot), 20000);

    toast('Copying project files from storage…', 1800);
    const n = await ingest([entryRel]);
    if (!state.files.has(entryRel) || n === 0) {
      const why = 'Could not copy ' + entryRel + ' (' + (tp.mode || '') + ')';
      state = null;
      throw new Error(why);
    }

    try {
      updateSetting('lastMirrorRoot', aroot);
    } catch (_) {}

    startPolling();
    console.log('[LiveServer:mirror] ready', aroot, 'files=', state.files.size, 'mode=', transport.mode);
    toast('Mirrored ' + state.files.size + ' file(s) · auto-sync on', 2200);
    return aroot;
  });
}

export async function mirrorIfNeeded(sourceRoot, entryRel, sourceRootUri) {
  return ensureProjectMirror({ sourceRoot, entryRel, sourceRootUri });
}

/** manual "sync now" (menu / command) */
export function syncMirrorNow() {
  return serial(() => syncAll());
}

/** test hook */
export function __resetMirrorForTests() {
  stopMirrorWatch();
  state = null;
  transport = null;
}
