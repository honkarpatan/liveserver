/**
 * acodels — Live Server Node backend (vendored)
 * argv: node index.js <port> [bindHost]
 * Configure root via PATCH /setup
 */
const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { Server: WebSocketServer } = require('ws');
const chokidar = require('chokidar');

let BASE_DIR = null;
let jsonData = {};
let erudaEnabled = false;
let consoleType = 'suger';
let zoomEnabled = false;
let liveReloadEnabled = true;
let directoryListing = true;
let fileWatcher = null;
let connectedSockets = [];
let customHeaders = {};
let charset = 'utf-8';
let ipWhitelist = []; // empty = allow all
let basicAuth = null; // { user, pass } | null
let lastActivity = Date.now();

const args = process.argv.slice(2);
let currentPort = args[0] ? parseInt(args[0], 10) : 8080;
if (!Number.isFinite(currentPort) || currentPort < 1) currentPort = 8080;
const bindHost = args[1] || '0.0.0.0';

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen(port, bindHost === '0.0.0.0' ? undefined : bindHost);
  });
}

const webSocketScript = `
<script>
  (function() {
    try {
      var wsUrl = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
      var ws = new WebSocket(wsUrl);
      ws.onmessage = function (event) {
        if (event.data === 'reload') location.reload();
      };
    } catch (e) {}
  })();
</script>`;

const sugerScript = `<script src="/dt/suger-dev.js"></script>`;
const erudaRealScript = `
<script src="/eruda.min.js"></script>
<script>if (typeof eruda !== 'undefined') eruda.init();</script>
`;
const inspectorScript = `<script src="/inspector.js"></script>`;
/* ls-bridge-v1: page <-> Acode browser bridge + embedded Suger DevTool service worker (WebView-safe) */
const LS_BRIDGE_JS = "/* Live Server page bridge: lets the Acode browser talk to a page served from another origin (postMessage). */\n(function () {\n  var P = window.__lsParent || window.parent;\n  if (window.__lsBridge || !P || P === window) return;\n  window.__lsBridge = 1;\n  function post(m) {\n    try { m.ls = 1; P.postMessage(m, '*'); } catch (e) {}\n  }\n  function fav() {\n    var l = document.querySelector('link[rel~=\"icon\"]');\n    return (l && l.href) || (location.origin + '/favicon.ico');\n  }\n  function meta() {\n    post({ type: 'meta', href: location.href, title: document.title || '', favicon: fav() });\n  }\n  if (document.readyState === 'complete') meta(); else window.addEventListener('load', meta);\n  window.addEventListener('popstate', function () { setTimeout(meta, 0); });\n  window.addEventListener('hashchange', function () { setTimeout(meta, 0); });\n  ['pushState', 'replaceState'].forEach(function (k) {\n    var o = history[k];\n    history[k] = function () { var r = o.apply(this, arguments); setTimeout(meta, 0); return r; };\n  });\n  try {\n    var t = document.querySelector('title');\n    if (t) new MutationObserver(meta).observe(t, { childList: true, characterData: true, subtree: true });\n  } catch (e) {}\n\n  var dtOn = false;\n  function devtools(d) {\n    try {\n      if (d.on) {\n        if (!window.suger) {\n          if (!d.code) { post({ type: 'need-devtools' }); return; }\n          var s = document.createElement('script');\n          s.textContent = d.code;\n          (document.head || document.documentElement).appendChild(s);\n        }\n        if (window.suger) {\n          if (!window.__lsDtInit) { window.__lsDtInit = 1; window.suger.init(); } else window.suger.show();\n          dtOn = true;\n        }\n      } else if (window.suger) {\n        window.suger.hide();\n        dtOn = false;\n      }\n    } catch (e) {\n      post({ type: 'devtools-error', message: String(e && e.message || e) });\n    }\n    post({ type: 'devtools', on: dtOn });\n  }\n\n  window.addEventListener('message', function (e) {\n    var d = e.data;\n    if (!d || d.ls !== 1 || e.source !== P) return;\n    try {\n      if (d.cmd === 'history') history.go(d.dir < 0 ? -1 : 1);\n      else if (d.cmd === 'reload') location.reload();\n      else if (d.cmd === 'stop') window.stop();\n      else if (d.cmd === 'zoom') document.documentElement.style.zoom = String((d.pct || 100) / 100);\n      else if (d.cmd === 'print') window.print();\n      else if (d.cmd === 'find') post({ type: 'found', ok: !!window.find(d.q, false, !!d.back, true, false, false, false) });\n      else if (d.cmd === 'devtools') devtools(d);\n      else if (d.cmd === 'ping') meta();\n    } catch (err) {}\n  });\n})();\n";
const LS_DEVTOOL_SW = "// devtool-sw.js (WebViews Safe - JS Only)\n// HTML/Navigation requests are BYPASSED to prevent Deadlock within WebViews\n\nlet instrumentationEnabled = false;\nlet instrumentedCache = new Map();\nlet pendingInstrumentation = new Map();\n\nself.addEventListener('install', (event) => {\n  self.skipWaiting();\n});\n\nself.addEventListener('activate', (event) => {\n  event.waitUntil(self.clients.claim());\n});\n\nself.addEventListener('message', async (event) => {\n  if (!event.data) return;\n  const { type, enabled, url, code } = event.data;\n  \n  switch (type) {\n    case 'SET_INSTRUMENTATION':\n      instrumentationEnabled = enabled;\n      if (!enabled) {\n        instrumentedCache.clear();\n        pendingInstrumentation.clear();\n      }\n      break;\n\n    case 'CACHE_INSTRUMENTED':\n      if (url && code) {\n          instrumentedCache.set(url, code);\n          if (pendingInstrumentation.has(url)) {\n            const resolve = pendingInstrumentation.get(url);\n            pendingInstrumentation.delete(url);\n            resolve(code);\n          }\n      }\n      break;\n      \n    case 'CLEAR_CACHE':\n      instrumentedCache.clear();\n      pendingInstrumentation.clear();\n      break;\n  }\n});\n\nself.addEventListener('fetch', (event) => {\n  const url = new URL(event.request.url);\n  if (event.request.mode === 'navigate' || event.request.destination === 'document') {\n      return; \n  }\n  \n  if (url.origin !== self.location.origin) return;\n  if (event.request.headers.has('X-DevTool-Request')) return;\n  if (url.pathname.includes('devtool-sw.js') || \n      url.pathname.includes('suger-dev') ||\n      url.pathname.includes('socket')) {\n    return;\n  }\n\n  if (!instrumentationEnabled) return;\n  if (url.pathname.endsWith('.js')) {\n    event.respondWith(handleJSRequest(event.request, url));\n    return;\n  }\n});\n\nasync function handleJSRequest(request, url) {\n  try {\n    // Cache Check\n    if (instrumentedCache.has(url.href)) {\n      return new Response(instrumentedCache.get(url.href), {\n        headers: { 'Content-Type': 'application/javascript' }\n      });\n    }\n\n    // Fetching origin file\n    const response = await fetch(request);\n    if (!response.ok) return response;\n\n    const originalCode = await response.text();\n\n    // Req for instrumentation \n    // take 5sec Otherwise give original\n    const instrumentedCode = await requestInstrumentation(url.href, originalCode);\n\n    return new Response(instrumentedCode, {\n      headers: { 'Content-Type': 'application/javascript' }\n    });\n\n  } catch (error) {\n    // if error then release original req\n    return fetch(request);\n  }\n}\n\nasync function requestInstrumentation(url, code) {\n  const instrumentationPromise = new Promise((resolve) => {\n    pendingInstrumentation.set(url, resolve);\n  });\n\n  // message to main thrrad\n  const clientSent = await sendToMainThread({\n    type: 'INSTRUMENT_REQUEST',\n    data: { url, code }\n  });\n\n  if (!clientSent) {\n      pendingInstrumentation.delete(url);\n      return code;\n  }\n\n  // extra safety\n  const timeoutPromise = new Promise((resolve) => {\n    setTimeout(() => {\n      if (pendingInstrumentation.has(url)) {\n          pendingInstrumentation.delete(url);\n          // console.warn('[SW] Instrumentation timed out for:', url);\n          resolve(code); // Fallback to original\n      }\n    }, 2000);\n  });\n\n  return Promise.race([instrumentationPromise, timeoutPromise]);\n}\n\nasync function sendToMainThread(message) {\n  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });\n  \n  let targetClient = clients.find(c => c.visibilityState === 'visible') || clients[0];\n\n  if (targetClient) {\n    targetClient.postMessage(message);\n    return true;\n  }\n  return false;\n}";
const lsBridgeScript = '<script src="/__ls/bridge.js"></script>';
const zoomScript = `
<script src="/zoom-handler.js"></script>
<script>try { new ZoomHandler(document.body); } catch (e) {}</script>`;

const app = express();
app.use(express.json({ limit: '2mb' }));

// Activity + security middleware
app.use((req, res, next) => {
  lastActivity = Date.now();
  // IP whitelist
  if (ipWhitelist.length) {
    const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    if (!ipWhitelist.includes(ip) && ip !== '127.0.0.1' && ip !== '::1') {
      return res.status(403).send('Forbidden');
    }
  }
  // Basic auth
  if (basicAuth && basicAuth.user) {
    const hdr = req.headers.authorization || '';
    const ok = (() => {
      if (!hdr.startsWith('Basic ')) return false;
      try {
        const decoded = Buffer.from(hdr.slice(6), 'base64').toString('utf8');
        const i = decoded.indexOf(':');
        const u = decoded.slice(0, i);
        const p = decoded.slice(i + 1);
        return u === basicAuth.user && p === (basicAuth.pass || '');
      } catch (_) {
        return false;
      }
    })();
    if (!ok) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Live Server"');
      return res.status(401).send('Unauthorized');
    }
  }
  // Custom headers
  Object.keys(customHeaders).forEach((k) => {
    try {
      res.setHeader(k, customHeaders[k]);
    } catch (_) {}
  });
  if (charset) {
    // only for text responses later
  }
  next();
});

// CORS
app.use((req, res, next) => {
  if (jsonData.enableCors !== false) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.get('/check', (req, res) => {
  res.status(200).json({
    message: 'Ready',
    key: 'AcodeLiveServer_NodeJS',
    port: currentPort,
    root: BASE_DIR,
    fileName: jsonData.fileName || null,
    liveReload: liveReloadEnabled,
  });
});

app.get('/status', (req, res) => {
  res.json({
    port: currentPort,
    bind: bindHost,
    root: BASE_DIR,
    fileName: jsonData.fileName || null,
    liveReload: liveReloadEnabled,
    directoryListing,
    clients: connectedSockets.length,
    lastActivity,
    uptime: process.uptime(),
  });
});

/** Force reload all WS clients (plugin can call on save if watcher misses) */
app.post('/reload', (req, res) => {
  broadcastReload();
  res.json({ ok: true, clients: connectedSockets.length });
});

app.patch('/setup', (req, res) => {
  const data = req.body || {};
  if (!data.path) return res.status(400).json({ error: 'Missing path' });

  BASE_DIR = data.path;
  jsonData = data;
  erudaEnabled = data.eruda === true;
  if (data.consoleType) consoleType = data.consoleType;
  zoomEnabled = data.zoom === true;
  liveReloadEnabled = data.liveReload !== false;
  directoryListing = data.directoryListing !== false;

  if (typeof data.charset === 'string' && data.charset) charset = data.charset;
  customHeaders = {};
  if (data.customHeaders && typeof data.customHeaders === 'object') {
    customHeaders = data.customHeaders;
  } else if (typeof data.customHeaders === 'string') {
    String(data.customHeaders)
      .split('\n')
      .forEach((line) => {
        const i = line.indexOf(':');
        if (i > 0) {
          const k = line.slice(0, i).trim();
          const v = line.slice(i + 1).trim();
          if (k) customHeaders[k] = v;
        }
      });
  }

  ipWhitelist = [];
  if (data.ipWhitelist) {
    const raw = Array.isArray(data.ipWhitelist)
      ? data.ipWhitelist
      : String(data.ipWhitelist).split(/[\n,]+/);
    ipWhitelist = raw.map((s) => String(s).trim()).filter(Boolean);
  }

  if (data.basicAuthUser) {
    basicAuth = { user: String(data.basicAuthUser), pass: String(data.basicAuthPass || '') };
  } else {
    basicAuth = null;
  }

  console.log('[acodels] base=', BASE_DIR, 'file=', data.fileName || '', 'reload=', liveReloadEnabled);
  if (liveReloadEnabled) startFileWatcher(res);
  else {
    if (fileWatcher) {
      try {
        fileWatcher.close();
      } catch (_) {}
      fileWatcher = null;
    }
    res.status(201).json({ message: 'OK', liveReload: false });
  }
});

app.get('/__ls/bridge.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(LS_BRIDGE_JS);
});

app.get('/devtool-sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  const swPath = path.join(__dirname, 'devtool-sw.js');
  if (fs.existsSync(swPath)) res.sendFile(swPath);
  else res.send(LS_DEVTOOL_SW);
});

app.get('/dt/suger-dev.js', (req, res) => {
  const p = path.join(__dirname, 'suger-dev.js');
  if (fs.existsSync(p)) res.sendFile(p);
  else res.status(404).end();
});
app.get('/zoom-handler.js', (req, res) => res.sendFile(path.join(__dirname, 'zoom-handler.js')));
app.get('/inspector.js', (req, res) => res.sendFile(path.join(__dirname, 'inspector.js')));
app.get('/eruda.min.js', (req, res) => {
  const erudaPath = path.join(__dirname, 'eruda.min.js');
  if (fs.existsSync(erudaPath)) res.sendFile(erudaPath);
  else res.status(404).send('Eruda not found');
});

function injectHtml(html) {
  let injected = html;
  if (liveReloadEnabled) {
    injected = injected.replace(/<\/body>/i, webSocketScript + '</body>');
    if (!/<\/body>/i.test(html)) injected = injected + webSocketScript;
  }
  if (erudaEnabled) {
    const extra =
      consoleType === 'eruda' ? erudaRealScript + '\n' + inspectorScript : sugerScript + '\n' + inspectorScript;
    injected = injected.replace(/<\/body>/i, extra + '</body>');
  }
  if (zoomEnabled) {
    injected = injected.replace(/<\/body>/i, zoomScript + '</body>');
  }
  // page <-> browser bridge (always)
  if (/<\/body>/i.test(injected)) injected = injected.replace(/<\/body>/i, lsBridgeScript + '</body>');
  else injected += lsBridgeScript;
  return injected;
}

function sendHtmlFile(res, fullPath) {
  fs.readFile(fullPath, 'utf8', (err, html_content) => {
    if (err) return res.status(404).send('Not found');
    res.setHeader('Content-Type', 'text/html; charset=' + charset);
    res.send(injectHtml(html_content));
  });
}

app.get('/', (req, res) => {
  if (!BASE_DIR) return res.status(400).send('Not configured. PATCH /setup first.');
  const fileName = jsonData.fileName || 'index.html';
  const fullPath = path.join(BASE_DIR, fileName);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    return sendHtmlFile(res, fullPath);
  }
  // directory listing or index fallback
  const indexPath = path.join(BASE_DIR, 'index.html');
  if (fs.existsSync(indexPath)) return sendHtmlFile(res, indexPath);
  if (directoryListing) return listDir(res, BASE_DIR, '/');
  return res.status(404).send('No index.html');
});

function listDir(res, dirPath, urlPath) {
  fs.readdir(dirPath, { withFileTypes: true }, (err, entries) => {
    if (err) return res.status(500).send('Cannot list directory');
    const rows = entries
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => {
        const href = path.posix.join(urlPath, e.name) + (e.isDirectory() ? '/' : '');
        return `<li><a href="${href}">${e.name}${e.isDirectory() ? '/' : ''}</a></li>`;
      })
      .join('\n');
    res.setHeader('Content-Type', 'text/html; charset=' + charset);
    res.send(
      `<!DOCTYPE html><html><head><meta charset="${charset}"/><title>Index of ${urlPath}</title></head><body><h1>Index of ${urlPath}</h1><ul>${rows}</ul></body></html>`
    );
  });
}

// Static + HTML injection for .html under root
app.use((req, res, next) => {
  if (!BASE_DIR) return next();
  const rel = decodeURIComponent(req.path || '/');
  const full = path.join(BASE_DIR, rel);
  if (!full.startsWith(path.resolve(BASE_DIR))) return res.status(403).end();
  fs.stat(full, (err, st) => {
    if (err) return next();
    if (st.isDirectory()) {
      if (directoryListing) return listDir(res, full, rel.endsWith('/') ? rel : rel + '/');
      const idx = path.join(full, 'index.html');
      if (fs.existsSync(idx)) return sendHtmlFile(res, idx);
      return res.status(404).end();
    }
    if (/\.html?$/i.test(full)) return sendHtmlFile(res, full);
    // other static
    res.sendFile(full, (e) => {
      if (e) next();
    });
  });
});

app.use(express.static(__dirname));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  connectedSockets.push(ws);
  lastActivity = Date.now();
  ws.on('close', () => {
    connectedSockets = connectedSockets.filter((s) => s !== ws);
  });
});

function broadcastReload() {
  for (const ws of connectedSockets) {
    try {
      ws.send('reload');
    } catch (_) {}
  }
}

function startFileWatcher(res) {
  if (fileWatcher) {
    try {
      fileWatcher.close();
    } catch (_) {}
    fileWatcher = null;
  }
  if (!BASE_DIR || !liveReloadEnabled) {
    if (res) res.status(201).json({ message: 'OK' });
    return;
  }
  fileWatcher = chokidar.watch(BASE_DIR, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });
  fileWatcher.on('change', () => {
    lastActivity = Date.now();
    broadcastReload();
  });
  let responseSent = false;
  const done = (code, body) => {
    if (responseSent || !res) return;
    responseSent = true;
    res.status(code).json(body);
  };
  fileWatcher.on('ready', () => done(201, { message: 'OK', liveReload: true }));
  fileWatcher.on('error', (error) => {
    console.error('Watcher Error:', error.message);
    done(500, { error: error.message });
  });
  // fallback if ready is slow
  setTimeout(() => done(201, { message: 'OK', liveReload: true }), 3000);
}

async function main() {
  const ok = await isPortAvailable(currentPort);
  if (!ok) {
    console.error('[acodels] port busy', currentPort);
    process.exit(1);
  }
  server.listen(currentPort, bindHost, () => {
    console.log('[acodels] listening', bindHost + ':' + currentPort);
  });
}

main();
