/**
 * Start / stop Node acodels backend without opening a terminal UI.
 * Automatically upgrades/restarts older backend instances lacking /__proxy support.
 */
import { getSettings, updateSetting } from '../core/settings.js';
import { silentExec, wrapSh, getExecutor } from '../utils/alpineExec.js';
import { resolveAcodelsPath, ensureLiveServerDeps } from '../deps/dependencyChecker.js';
import { ensureFullAcodelsIndex } from './ensureAcodelsIndex.js';
import { getEffectiveRoot } from './rootFolder.js';
import { getConfiguredPort, buildServerUrl } from './port.js';
import { getServerStatus, setServerStatus, refreshStatusFromBackend } from './status.js';
import { getActiveFile, uriToFsPath } from '../utils/paths.js';
import { showStatusPill, hideStatusPill, setGreenLoader } from '../ui/statusPill.js';

const toast = acode.require('toast');
let baseUrlRef = '';
let inactivityTimer = null;
let serverProc = null;

export function setProcessBaseUrl(url) {
  baseUrlRef = url || '';
}

/** Check if server is alive AND whether it includes the /__proxy route */
async function checkServerCapabilities(port, timeoutMs = 900) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch('http://127.0.0.1:' + port + '/check', { signal: ctrl.signal });
    clearTimeout(to);
    if (!res || !res.ok) return { alive: false, proxy: false };
    const data = await res.json().catch(() => ({}));
    return { alive: true, proxy: data?.proxy === true };
  } catch (_) {
    return { alive: false, proxy: false };
  }
}

async function fetchAlive(port, timeoutMs = 800) {
  const cap = await checkServerCapabilities(port, timeoutMs);
  return cap.alive;
}

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

/** BusyBox / Alpine / Termux compatible process killer */
async function killNodeOnPort(port) {
  const p = String(parseInt(port, 10) || 8080);
  serverProc = null;
  const cmd =
    `for pid in $(ps -o pid,args 2>/dev/null | grep "node index.js ${p}" | grep -v grep | awk '{print $1}'); do kill -9 "$pid" 2>/dev/null; done; ` +
    `for pid in $(ps 2>/dev/null | grep "node index.js ${p}" | grep -v grep | awk '{print $1}'); do kill -9 "$pid" 2>/dev/null; done; ` +
    `pkill -9 -f "node index.js ${p}" 2>/dev/null || true; ` +
    `fuser -k ${p}/tcp 2>/dev/null || true`;
  try {
    await silentExec(cmd, { timeoutMs: 12000 });
  } catch (_) {}

  for (let i = 0; i < 10; i++) {
    if (!(await fetchAlive(p, 400))) break;
    await new Promise((r) => setTimeout(r, 200));
  }
}

function mapRootFast(root) {
  const r = String(root || '').replace(/\/+$/, '') || '/';
  const m = r.match(/^\/storage\/emulated\/0(\/.*)?$/);
  if (m) return '/sdcard' + (m[1] || '');
  return r;
}

async function resolveAlpineRoot(root) {
  const r = String(root || '').replace(/\/+$/, '') || '/';
  const cands = [r];
  let m = r.match(/^\/storage\/emulated\/0(\/.*)?$/);
  if (m) cands.push('/sdcard' + (m[1] || ''));
  m = r.match(/^\/sdcard(\/.*)?$/);
  if (m) cands.push('/storage/emulated/0' + (m[1] || ''));
  if (!/^\/(sdcard|storage)(\/|$)/.test(r)) return r;

  const q = (x) => "'" + String(x).replace(/'/g, "'\\''") + "'";
  let out = '';
  try {
    out = await silentExec(
      'for d in ' + cands.map(q).join(' ') + '; do [ -d "$d" ] && { echo "OK:$d"; exit 0; }; done; echo NONE',
      { timeoutMs: 10000 }
    );
  } catch (e) {
    console.warn('[LiveServer] root probe failed, using path as is', e);
    return r;
  }
  const hit = String(out || '').match(/OK:(.+)/);
  if (hit) return hit[1].trim();
  if (/NONE/.test(String(out || ''))) return null;
  return r;
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

/** Detect an already-running backend server (e.g. after Acode restart) */
export async function probeExistingServer() {
  const port = getConfiguredPort();
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch(`http://127.0.0.1:${port}/status`, { signal: ctrl.signal });
    clearTimeout(to);
    if (!res || !res.ok) return false;

    const data = await res.json().catch(() => ({}));
    const activePort = data.port || port;
    const fileName = data.fileName || null;
    const urlBase = buildServerUrl(activePort, '127.0.0.1');
    const pageUrl =
      fileName && fileName !== 'index.html'
        ? urlBase.replace(/\/$/, '/') + encodeURI(fileName)
        : urlBase;

    const prev = getServerStatus();
    setServerStatus({
      running: true,
      port: activePort,
      root: data.root || prev.root || null,
      url: pageUrl,
      fileName,
      bind: data.bind || '0.0.0.0',
      startedAt:
        prev.startedAt ||
        (data.uptime ? Date.now() - Math.round(Number(data.uptime) * 1000) : Date.now()),
      lastError: null,
    });
    armInactivityTimer();

    if (!prev.running) {
      try {
        window.dispatchEvent(
          new CustomEvent('liveserver-started', {
            detail: { url: pageUrl, port: activePort, root: data.root || null, fileName },
          })
        );
      } catch (_) {}
    }
    return true;
  } catch (_) {
    return false;
  }
}

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
  ex.execute(wrapSh(startCmd), true)
    .then((out) => console.log('[LiveServer] node exited', String(out || '').slice(0, 200)))
    .catch((e) => console.warn('[LiveServer] node exited', String(e?.message || e).slice(0, 200)))
    .finally(() => {
      if (serverProc !== token) return;
      serverProc = null;
      if (getServerStatus().running) {
        setServerStatus({ running: false, lastError: 'server process exited' });
        try {
          window.dispatchEvent(new CustomEvent('liveserver-stopped'));
        } catch (_) {}
      }
    });
}

/**
 * Ensures the Node backend with /__proxy support is running and returns its active port.
 */
export async function ensureProxyServer() {
  const port = getConfiguredPort();
  const cap = await checkServerCapabilities(port);

  // Ready and supports /__proxy
  if (cap.alive && cap.proxy) return port;

  const depsOk = await ensureLiveServerDeps({ baseUrl: baseUrlRef });
  if (!depsOk) return null;

  setGreenLoader(true);
  showStatusPill(
    cap.alive
      ? `$ Updating backend on :${port} with Reverse Proxy...`
      : `$ node index.js ${port} (starting local proxy)...`,
    { spin: true }
  );

  try {
    if (cap.alive && !cap.proxy) {
      await killNodeOnPort(port);
    }

    const acodels = await resolveAcodelsPath(baseUrlRef);
    await ensureFullAcodelsIndex(acodels);
    launchNodeForeground(port, acodels);

    let up = false;
    for (let i = 0; i < 35; i++) {
      await new Promise((r) => setTimeout(r, 300));
      const nextCap = await checkServerCapabilities(port, 500);
      if (nextCap.alive && nextCap.proxy) {
        up = true;
        break;
      }
      if (!serverProc) break;
    }

    if (!up) {
      showStatusPill('Proxy server failed to start', { spin: false, autoHideMs: 3000 });
      return null;
    }

    const st = getServerStatus();
    const root = st.root || getEffectiveRoot() || '/sdcard';
    const aroot = mapRootFast(root);
    const fileName = st.fileName || 'index.html';
    await patchSetup(port, aroot, fileName);

    const urlBase = buildServerUrl(port, '127.0.0.1');
    setServerStatus({
      running: true,
      port,
      root: aroot,
      url: urlBase,
      fileName,
      bind: '0.0.0.0',
      startedAt: Date.now(),
      lastError: null,
    });
    armInactivityTimer();
    try {
      window.dispatchEvent(
        new CustomEvent('liveserver-started', { detail: { url: urlBase, port, root: aroot, fileName } })
      );
    } catch (_) {}

    showStatusPill(`✓ Reverse proxy ready on 127.0.0.1:${port}`, { spin: false, autoHideMs: 2000 });
    return port;
  } catch (e) {
    showStatusPill(`Proxy error: ${e?.message || e}`, { spin: false, autoHideMs: 3500 });
    return null;
  } finally {
    setGreenLoader(false);
  }
}

export async function startServer(opts = {}) {
  const port = opts.port || getConfiguredPort();
  const root = opts.root || getEffectiveRoot();
  const s = getSettings();

  const cap = !opts.forceDeps ? await checkServerCapabilities(port) : { alive: false, proxy: false };

  // If an outdated server without /__proxy is running, kill it so we boot the updated index.js
  if (cap.alive && !cap.proxy) {
    setGreenLoader(true);
    showStatusPill(`$ Upgrading Live Server on :${port}...`, { spin: true });
    await killNodeOnPort(port);
    setGreenLoader(false);
    hideStatusPill(0);
    cap.alive = false;
  }

  // FAST PATH: updated server is already running
  if (cap.alive && cap.proxy) {
    const st = getServerStatus();
    const effectiveRoot = root || st.root;
    if (!effectiveRoot) {
      toast('Set a root folder or open an HTML file', 2500);
      return false;
    }

    const aroot = mapRootFast(effectiveRoot);
    const fileName = opts.fileName || relativeFileUnderRoot(effectiveRoot);
    const needsSetup = !st.running || st.port !== port || st.root !== aroot || st.fileName !== fileName;

    if (needsSetup) {
      await patchSetup(port, aroot, fileName);
    }

    const urlBase = buildServerUrl(port, '127.0.0.1');
    const pageUrl =
      fileName && fileName !== 'index.html'
        ? urlBase.replace(/\/$/, '/') + encodeURI(fileName)
        : urlBase;

    setServerStatus({
      running: true,
      port,
      root: aroot,
      url: pageUrl,
      fileName,
      bind: '0.0.0.0',
      startedAt: st.startedAt || Date.now(),
      lastError: null,
    });
    armInactivityTimer();

    if (!st.running) {
      try {
        window.dispatchEvent(
          new CustomEvent('liveserver-started', { detail: { url: pageUrl, port, root: aroot, fileName } })
        );
      } catch (_) {}
    }

    if (opts.openBrowser === true || (opts.openBrowser !== false && s.openBrowserOnStart !== false)) {
      try {
        const { openBrowser } = await import('../browser/index.js');
        openBrowser(pageUrl, { reuse: true });
      } catch (e) {
        console.warn('[LiveServer] open browser', e);
      }
    }
    return true;
  }

  // COLD START PATH
  const depsOk = await ensureLiveServerDeps({ baseUrl: baseUrlRef, force: !!opts.forceDeps });
  if (!depsOk) {
    return false;
  }

  if (!root) {
    toast('Set a root folder or open an HTML file', 2500);
    return false;
  }

  const fileName = opts.fileName || relativeFileUnderRoot(root);
  const aroot = await resolveAlpineRoot(root);
  if (!aroot) {
    setServerStatus({ running: false, lastError: 'root not reachable' });
    toast('Folder not reachable from Alpine: ' + root + ' (allow Acode storage permission)', 4500);
    return false;
  }

  const nodeBind = '0.0.0.0';
  if (!(await isPortAlive(port, { deep: true }))) {
    setGreenLoader(true);
    showStatusPill(`$ node index.js ${port} 0.0.0.0`, { spin: true });

    const acodels = await resolveAcodelsPath(baseUrlRef);
    try {
      await ensureFullAcodelsIndex(acodels);
    } catch (e) {
      console.warn('[LiveServer] ensure index', e);
    }
    try {
      launchNodeForeground(port, acodels);
    } catch (e) {
      setGreenLoader(false);
      hideStatusPill(0);
      setServerStatus({ running: false, lastError: String(e?.message || e) });
      toast('Start failed: ' + (e?.message || e), 3000);
      return false;
    }

    let up = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 300));
      if (await isPortAlive(port)) {
        up = true;
        break;
      }
      if (!serverProc) break;
    }
    if (!up && serverProc) up = await isPortAlive(port, { deep: true });
    setGreenLoader(false);

    if (!up) {
      showStatusPill('Server failed to start', { spin: false, autoHideMs: 3500 });
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
    showStatusPill(`✓ Live Server running on :${port}`, { spin: false, autoHideMs: 2200 });
  }

  const configured = await patchSetup(port, aroot, fileName);
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
    root: aroot,
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

  if (opts.openBrowser === true || (opts.openBrowser !== false && s.openBrowserOnStart !== false)) {
    try {
      const { openBrowser } = await import('../browser/index.js');
      openBrowser(pageUrl, { reuse: true });
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
  await killNodeOnPort(port);

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
  await new Promise((r) => setTimeout(r, 350));
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

export async function reapplySetup() {
  const st = getServerStatus();
  if (!st.running || !st.port || !st.root) return false;
  return patchSetup(st.port, st.root, st.fileName || 'index.html');
}

export { refreshStatusFromBackend };