/**
 * Start / stop Node acodels backend without opening a terminal UI.
 *
 * IMPORTANT: Executor spawns a fresh proot per call and proot runs with
 * --kill-on-exit, so a `nohup node &` is killed the moment the command ends.
 * Fix: run node in the FOREGROUND of an un-awaited Executor.execute() call.
 * That promise stays pending while the server lives, which keeps proot alive.
 */
import { getSettings, updateSetting } from '../core/settings.js';
import { silentExec, wrapSh, getExecutor } from '../utils/alpineExec.js';
import { resolveAcodelsPath, ensureLiveServerDeps } from '../deps/dependencyChecker.js';
import { ensureFullAcodelsIndex } from './ensureAcodelsIndex.js';
import { getEffectiveRoot } from './rootFolder.js';
import { getConfiguredPort, buildServerUrl } from './port.js';
import { getServerStatus, setServerStatus, refreshStatusFromBackend } from './status.js';
import { getActiveFile, uriToFsPath } from '../utils/paths.js';

const toast = acode.require('toast');

let baseUrlRef = '';
let inactivityTimer = null;
/** token of the currently running foreground node call (null = none) */
let serverProc = null;

export function setProcessBaseUrl(url) {
  baseUrlRef = url || '';
}

/** Fast check via WebView fetch */
async function fetchAlive(port) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch('http://127.0.0.1:' + port + '/check', { signal: ctrl.signal });
    clearTimeout(to);
    return !!(res && res.ok);
  } catch (_) {
    return false;
  }
}

/** Slow check via wget/curl inside Alpine (spawns proot — use sparingly) */
async function shellAlive(port) {
  try {
    const out = await silentExec(
      'if command -v wget >/dev/null 2>&1; then wget -qO- -T 2 http://127.0.0.1:' +
        port +
        '/check 2>/dev/null; elif command -v curl >/dev/null 2>&1; then curl -s --max-time 2 http://127.0.0.1:' +
        port +
        '/check 2>/dev/null; else echo NOCLIENT; fi',
      { timeoutMs: 8000 }
    );
    return /Ready|AcodeLiveServer|"port"/i.test(String(out || ''));
  } catch (_) {
    return false;
  }
}

async function isPortAlive(port, opts = {}) {
  const p = String(parseInt(port, 10) || 8080);
  if (await fetchAlive(p)) return true;
  if (opts.deep) return shellAlive(p);
  return false;
}

function parseCustomHeaders(text) {
  const out = {};
  String(text || '')
    .split('\n')
    .forEach((line) => {
      const i = line.indexOf(':');
      if (i > 0) {
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim();
        if (k) out[k] = v;
      }
    });
  return out;
}

function activeHtmlName() {
  const f = getActiveFile();
  const name = f?.filename || f?.name || '';
  if (/\.html?$/i.test(name)) return name;
  return 'index.html';
}

/** Relative path of active file under root, for browser open */
function relativeFileUnderRoot(root) {
  try {
    const f = getActiveFile();
    const fsPath = uriToFsPath(f?.uri || f?.url || '');
    if (!fsPath || !root) return activeHtmlName();
    const normRoot = root.replace(/\/+$/, '');
    if (fsPath.startsWith(normRoot + '/') || fsPath.startsWith(normRoot + '\\')) {
      return fsPath.slice(normRoot.length).replace(/^[/\\]+/, '').replace(/\\/g, '/');
    }
  } catch (_) {}
  return activeHtmlName();
}

async function patchSetup(port, root, fileName) {
  const s = getSettings();
  const body = {
    path: root,
    fileName: fileName || 'index.html',
    port,
    liveReload: s.liveReload !== false,
    directoryListing: s.directoryListing !== false,
    enableCors: s.enableCors !== false,
    charset: s.customCharset || 'utf-8',
    customHeaders: parseCustomHeaders(s.customHeaders),
    ipWhitelist: s.ipWhitelist || '',
    basicAuthUser: s.basicAuthUser || '',
    basicAuthPass: s.basicAuthPass || '',
  };
  try {
    const res = await fetch(`http://127.0.0.1:${port}/setup`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return !!(res && (res.ok || res.status === 201));
  } catch (e) {
    console.warn('[LiveServer] setup', e);
    return false;
  }
}

function clearInactivityTimer() {
  if (inactivityTimer) {
    clearInterval(inactivityTimer);
    inactivityTimer = null;
  }
}

function armInactivityTimer() {
  clearInactivityTimer();
  const mins = parseInt(getSettings().autoShutdownMinutes, 10) || 0;
  if (mins <= 0) return;
  const ms = mins * 60 * 1000;
  const started = Date.now();
  inactivityTimer = setInterval(async () => {
    const st = getServerStatus();
    if (!st.running) {
      clearInactivityTimer();
      return;
    }
    if (Date.now() - (st.startedAt || started) > ms) {
      try {
        const res = await fetch(`http://127.0.0.1:${st.port}/status`);
        const data = await res.json();
        if (data.lastActivity && Date.now() - data.lastActivity < ms) return;
      } catch (_) {}
      toast('Live Server auto-stopped (inactivity)', 2500);
      stopServer();
    }
  }, 30000);
}

/**
 * Launch node in the foreground of a long-lived Executor call.
 * Returns immediately (does NOT await node).
 */
function launchNodeForeground(port, acodelsPath) {
  const ex = getExecutor();
  if (!ex?.execute) throw new Error('Executor not available. Open Acode Terminal once, then retry.');

  const startCmd =
    'ACODIR=""; ' +
    'for d in "' + String(acodelsPath || '').replace(/"/g, '') + '" /root/.acode_liveserver/acodels /home/root/.acode_liveserver/acodels; do ' +
    '[ -n "$d" ] || continue; ' +
    'if [ -f "$d/index.js" ] && [ -d "$d/node_modules" ]; then ACODIR="$d"; break; fi; done; ' +
    '[ -z "$ACODIR" ] && { echo acodels_not_found; exit 1; }; ' +
    'cd "$ACODIR" || exit 1; ' +
    'NODE_PATH="$ACODIR/node_modules" exec node index.js ' + String(port) + ' 0.0.0.0 >liveserver.log 2>&1';

  const token = {};
  serverProc = token;

  // Do NOT await: stays pending while node runs, which keeps proot alive.
  ex.execute(wrapSh(startCmd), true)
    .then((out) => console.log('[LiveServer] node exited', String(out || '').slice(0, 200)))
    .catch((e) => console.warn('[LiveServer] node exited', String(e?.message || e).slice(0, 200)))
    .finally(() => {
      if (serverProc !== token) return; // stopped/restarted on purpose
      serverProc = null;
      if (getServerStatus().running) {
        setServerStatus({ running: false, lastError: 'server process exited' });
        try {
          window.dispatchEvent(new CustomEvent('liveserver-stopped'));
        } catch (_) {}
      }
    });
}

export async function startServer(opts = {}) {
  const depsOk = await ensureLiveServerDeps({ baseUrl: baseUrlRef, force: !!opts.forceDeps });
  if (!depsOk) {
    toast('Dependencies required', 2000);
    return false;
  }

  const port = opts.port || getConfiguredPort();
  const root = opts.root || getEffectiveRoot();
  if (!root) {
    toast('Set a root folder or open an HTML file', 2500);
    return false;
  }

  const fileName = opts.fileName || relativeFileUnderRoot(root);
  const s = getSettings();
  const nodeBind = '0.0.0.0';

  if (!(await isPortAlive(port, { deep: true }))) {
    const acodels = await resolveAcodelsPath(baseUrlRef);
    try {
      await ensureFullAcodelsIndex(acodels);
    } catch (e) {
      console.warn('[LiveServer] ensure index', e);
    }

    toast('Starting server…', 1200);
    try {
      launchNodeForeground(port, acodels);
    } catch (e) {
      setServerStatus({ running: false, lastError: String(e?.message || e) });
      toast('Start failed: ' + (e?.message || e), 3000);
      return false;
    }

    let up = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 400));
      if (await isPortAlive(port)) {
        up = true;
        break;
      }
      // node already died? (token cleared by .finally)
      if (!serverProc) break;
    }
    if (!up && serverProc) up = await isPortAlive(port, { deep: true });

    if (!up) {
      try {
        const log = await silentExec(
          'tail -n 40 /root/.acode_liveserver/acodels/liveserver.log 2>/dev/null',
          { timeoutMs: 8000 }
        );
        console.warn('[LiveServer] start failed, log:', log);
      } catch (_) {}
      toast('Server failed to start — see console log', 3500);
      setServerStatus({ running: false, lastError: 'start failed' });
      serverProc = null;
      return false;
    }
  }

  const configured = await patchSetup(port, root, fileName);
  if (!configured) {
    console.warn('[LiveServer] /setup patch failed');
  }

  const urlBase = buildServerUrl(port, '127.0.0.1');
  const pageUrl =
    fileName && fileName !== 'index.html'
      ? urlBase.replace(/\/$/, '/') + encodeURI(fileName)
      : urlBase;

  setServerStatus({
    running: true,
    port,
    root,
    url: pageUrl,
    fileName,
    bind: nodeBind,
    startedAt: Date.now(),
    lastError: null,
  });
  updateSetting('port', port);
  armInactivityTimer();
  toast('Live on ' + pageUrl, 2500);
  try {
    window.dispatchEvent(
      new CustomEvent('liveserver-started', { detail: { url: pageUrl, port, root, fileName } })
    );
  } catch (_) {}

  if (opts.openBrowser !== false && s.openBrowserOnStart !== false) {
    try {
      const { openBrowser } = await import('../browser/index.js');
      openBrowser(pageUrl);
    } catch (e) {
      console.warn('[LiveServer] open browser', e);
    }
  }
  return true;
}

export async function stopServer() {
  clearInactivityTimer();
  const st = getServerStatus();
  const port = st.port || getConfiguredPort();
  serverProc = null; // so the foreground call's .finally() stays quiet
  try {
    await silentExec(
      '(pkill -f "node index.js ' + port + '" 2>/dev/null; fuser -k ' + port + '/tcp 2>/dev/null; true)',
      { timeoutMs: 15000 } // object form — a bare number would disable alpine mode
    );
  } catch (_) {}
  for (let i = 0; i < 8; i++) {
    if (!(await isPortAlive(port))) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  setServerStatus({
    running: false,
    port: null,
    url: null,
    fileName: null,
    startedAt: null,
  });
  toast('Server stopped', 1500);
  try {
    window.dispatchEvent(new CustomEvent('liveserver-stopped'));
  } catch (_) {}
  return true;
}

export async function restartServer() {
  const st = getServerStatus();
  const root = st.root;
  const fileName = st.fileName;
  await stopServer();
  await new Promise((r) => setTimeout(r, 450));
  return startServer({ root: root || undefined, fileName: fileName || undefined });
}

export async function changePortAndRestart() {
  const prompt = acode.require('prompt');
  const cur = String(getConfiguredPort());
  const n = await prompt('Port', cur, 'number');
  if (n == null) return false;
  const port = parseInt(String(n), 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    toast('Invalid port', 1500);
    return false;
  }
  updateSetting('port', port);
  await stopServer();
  return startServer({ port });
}

/** Re-apply settings to a running server without full restart */
export async function reapplySetup() {
  const st = getServerStatus();
  if (!st.running || !st.port || !st.root) return false;
  return patchSetup(st.port, st.root, st.fileName || 'index.html');
}

export { refreshStatusFromBackend };