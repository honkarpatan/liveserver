/**
 * Suger DevTool (https://github.com/Sou6900/suger-devtool) loader.
 *
 * The engine is downloaded once from GitHub (see devtoolSource.js), verified against a pinned
 * SHA-256, cached in IndexedDB, and then handed to the previewed page through the page bridge
 * (postMessage). The plugin never evaluates it itself.
 */
import { DEVTOOL_URL, DEVTOOL_SHA256, DEVTOOL_REPO, DEVTOOL_SIZE_MB } from './devtoolSource.js';
import { getSettings, updateSetting } from '../core/settings.js';

const toast = (...a) => {
  try {
    acode.require('toast')(...a);
  } catch (_) {}
};

const DB_NAME = 'liveserver-devtool';
const STORE = 'engine';
let cached = null;
let inflight = null;

function idb() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

async function cacheGet() {
  try {
    const db = await idb();
    return await new Promise((resolve) => {
      const r = db.transaction(STORE).objectStore(STORE).get(DEVTOOL_SHA256);
      r.onsuccess = () => resolve(typeof r.result === 'string' ? r.result : null);
      r.onerror = () => resolve(null);
    });
  } catch (_) {
    return null;
  }
}

async function cachePut(text) {
  try {
    const db = await idb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.objectStore(STORE).put(text, DEVTOOL_SHA256);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch (_) {}
}

async function sha256Hex(buf) {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function askConsent() {
  if (getSettings().devtoolDownloadOk === true) return true;
  let ok = false;
  try {
    ok = await acode.require('confirm')(
      'Download Developer Tools?',
      'Suger DevTool (' + DEVTOOL_SIZE_MB + ' MB) will be downloaded once from ' + DEVTOOL_REPO +
        ', checked against a fixed SHA-256 and saved on this device. It runs only inside the page ' +
        'you are previewing and sends nothing anywhere.'
    );
  } catch (_) {}
  if (ok) {
    try {
      updateSetting('devtoolDownloadOk', true);
    } catch (_) {}
  }
  return !!ok;
}

async function download() {
  toast('Downloading Suger DevTool…', 2500);
  let res;
  try {
    res = await fetch(DEVTOOL_URL, { cache: 'no-store' });
  } catch (_) {
    toast('DevTool download failed: no internet connection', 3500);
    return null;
  }
  if (!res.ok) {
    toast('DevTool download failed (HTTP ' + res.status + ')', 3500);
    return null;
  }
  const buf = await res.arrayBuffer();
  const got = await sha256Hex(buf);
  if (got !== DEVTOOL_SHA256) {
    console.warn('[LiveServer] DevTool hash mismatch', got);
    toast('DevTool file does not match the pinned SHA-256. Not used. Update the plugin.', 4500);
    return null;
  }
  const text = new TextDecoder('utf-8').decode(buf);
  await cachePut(text);
  toast('Developer tools ready', 1800);
  return text;
}

/** Engine source or null (declined / offline / hash mismatch - the user was told why). */
export async function loadDevtoolCode() {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const fromCache = await cacheGet();
      if (fromCache && fromCache.length > 1000) return (cached = fromCache);
      if (!(await askConsent())) return null;
      const text = await download();
      return text ? (cached = text) : null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function resetDevtoolCache() {
  cached = null;
}
