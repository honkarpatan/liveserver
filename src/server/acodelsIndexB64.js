/**
 * Full acodels/index.js source + dynamic base64 encoder (marker: ls-proxy-v5).
 * Fixes CSS/HTML regex escaping, Google form.submit() 404s, SPA history.pushState crashes,
 * and dynamic stylesheet/script loading through /__proxy.
 */
import { toBase64 } from '../utils/alpineExec.js';

export const ACODELS_INDEX_CODE = `/**
 * acodels — Live Server + Local Reverse Proxy Node backend (ls-proxy-v5, ls-bridge-v1)
 */
const http = require('http');
const https = require('https');
const express = require('express');
const path = require('path');
const fs = require('fs');
const net = require('net');
const zlib = require('zlib');
const { URL } = require('url');
const { Server: WebSocketServer } = require('ws');
const chokidar = require('chokidar');
const { execFile, execSync } = require('child_process');

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
let ipWhitelist = [];
let basicAuth = null;
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

const webSocketScript = \`
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
</script>\`;

const sugerScript = \`<script src="/dt/suger-dev.js"></script>\`;
const erudaRealScript = \`
<script src="/eruda.min.js"></script>
<script>if (typeof eruda !== 'undefined') eruda.init();</script>
\`;
const inspectorScript = \`<script src="/inspector.js"></script>\`;

/* ls-bridge-v1: page <-> Acode browser bridge */
const LS_BRIDGE_JS = \`
(function () {
  var P = window.__lsParent || window.parent;
  if (window.__lsBridge || !P || P === window) return;
  window.__lsBridge = 1;
  function post(m) {
    try { m.ls = 1; P.postMessage(m, '*'); } catch (e) {}
  }
  function currentHref() {
    return window.__LS_PROXY_TARGET__ || location.href;
  }
  function fav() {
    var l = document.querySelector('link[rel~="icon"]');
    if (l && l.href) return l.href;
    try { return new URL('/favicon.ico', currentHref()).href; } catch (e) { return ''; }
  }
  function meta() {
    post({ type: 'meta', href: currentHref(), title: document.title || '', favicon: fav() });
  }
  window.__lsPostMeta = meta;
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(meta, 0);
  window.addEventListener('load', meta);
  window.addEventListener('popstate', function () { setTimeout(meta, 0); });
  window.addEventListener('hashchange', function () { setTimeout(meta, 0); });
  try {
    var t = document.querySelector('title');
    if (t) new MutationObserver(meta).observe(t, { childList: true, characterData: true, subtree: true });
  } catch (e) {}

  var dtOn = false;
  function devtools(d) {
    try {
      if (d.on) {
        if (!window.suger) {
          if (!d.code) { post({ type: 'need-devtools' }); return; }
          var s = document.createElement('script');
          s.textContent = d.code;
          (document.head || document.documentElement).appendChild(s);
        }
        if (window.suger) {
          if (!window.__lsDtInit) { window.__lsDtInit = 1; window.suger.init(); }
          else window.suger.show();
          dtOn = true;
        }
      } else if (window.suger) {
        window.suger.hide();
        dtOn = false;
      }
    } catch (e) {
      post({ type: 'devtools-error', message: String(e && e.message || e) });
    }
    post({ type: 'devtools', on: dtOn });
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.ls !== 1 || e.source !== P) return;
    try {
      if (d.cmd === 'history') history.go(d.dir < 0 ? -1 : 1);
      else if (d.cmd === 'reload') location.reload();
      else if (d.cmd === 'stop') window.stop();
      else if (d.cmd === 'zoom') document.documentElement.style.zoom = String((d.pct || 100) / 100);
      else if (d.cmd === 'print') window.print();
      else if (d.cmd === 'find') post({ type: 'found', ok: !!window.find(d.q, false, !!d.back, true, false, false, false) });
      else if (d.cmd === 'devtools') devtools(d);
      else if (d.cmd === 'ping') meta();
    } catch (err) {}
  });
})();
\`;

const lsBridgeScript = '<script src="/__ls/bridge.js"></script>';
const zoomScript = \`
<script src="/zoom-handler.js"></script>
<script>try { new ZoomHandler(document.body); } catch (e) {}</script>\`;

const app = express();

// Capture raw body for /__proxy while still parsing JSON for /setup
app.use((req, res, next) => {
  if (req.path === '/__proxy' || req.path === '/_proxy') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      req.rawBody = chunks.length ? Buffer.concat(chunks) : null;
      next();
    });
    return;
  }
  express.json({ limit: '2mb' })(req, res, next);
});

// Activity + security middleware
app.use((req, res, next) => {
  lastActivity = Date.now();
  if (ipWhitelist.length) {
    const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    if (!ipWhitelist.includes(ip) && ip !== '127.0.0.1' && ip !== '::1') {
      return res.status(403).send('Forbidden');
    }
  }
  if (basicAuth && basicAuth.user && !req.path.startsWith('/__proxy')) {
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
  Object.keys(customHeaders).forEach((k) => {
    try { res.setHeader(k, customHeaders[k]); } catch (_) {}
  });
  next();
});

// CORS
app.use((req, res, next) => {
  if (jsonData.enableCors !== false) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
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
    proxy: true,
    proxyVersion: 3,
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
    proxy: true,
    proxyVersion: 3,
  });
});

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
    String(data.customHeaders).split('\\n').forEach((line) => {
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
      : String(data.ipWhitelist).split(/[\\n,]+/);
    ipWhitelist = raw.map((s) => String(s).trim()).filter(Boolean);
  }

  if (data.basicAuthUser) {
    basicAuth = { user: String(data.basicAuthUser), pass: String(data.basicAuthPass || '') };
  } else {
    basicAuth = null;
  }

  if (liveReloadEnabled) startFileWatcher(res);
  else {
    if (fileWatcher) {
      try { fileWatcher.close(); } catch (_) {}
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

// ============================================================================
// LOCAL REVERSE PROXY (/__proxy?url=...)
// ============================================================================

function buildProxyRuntimeScript(targetUrl) {
  let origin = '';
  try { origin = new URL(targetUrl).origin; } catch (_) {}
  return \`<script>
(function() {
  window.__LS_PROXY_TARGET__ = \${JSON.stringify(targetUrl)};
  window.__LS_PROXY_ORIGIN__ = \${JSON.stringify(origin)};
  var proxyBase = location.origin + '/__proxy?url=';

  function unwrapUrl(u) {
    var s = String(u || '');
    var idx = s.indexOf('/__proxy?url=');
    if (idx !== -1) {
      try {
        return decodeURIComponent(s.slice(idx + '/__proxy?url='.length).split('&')[0]);
      } catch (e) {}
    }
    return s;
  }

  function wrapUrl(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    var s = raw.trim();
    if (!s || s.charAt(0) === '#' || s.indexOf('data:') === 0 || s.indexOf('blob:') === 0 || s.indexOf('javascript:') === 0 || s.indexOf('mailto:') === 0 || s.indexOf('tel:') === 0) {
      return raw;
    }
    if (s.indexOf('/__proxy?url=') !== -1 || s.indexOf('/__ls/') === 0 || s.indexOf('/dt/') === 0) {
      return raw;
    }
    try {
      var resolved = new URL(s, window.__LS_PROXY_TARGET__);
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        return proxyBase + encodeURIComponent(resolved.href);
      }
    } catch (e) {}
    return raw;
  }

  // Prevent proxied Service Workers from hijacking 127.0.0.1
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = function() {
        return Promise.resolve({ scope: '/' });
      };
    }
  } catch (e) {}

  // Patch history.pushState / replaceState so SPAs don't throw cross-origin SecurityError
  try {
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function(state, title, url) {
      if (url != null) {
        var realTarget = unwrapUrl(String(url));
        try { realTarget = new URL(realTarget, window.__LS_PROXY_TARGET__).href; } catch (e) {}
        window.__LS_PROXY_TARGET__ = realTarget;
        url = proxyBase + encodeURIComponent(realTarget);
      }
      var r = origPush.call(this, state, title, url);
      if (window.__lsPostMeta) setTimeout(window.__lsPostMeta, 0);
      return r;
    };
    history.replaceState = function(state, title, url) {
      if (url != null) {
        var realTarget = unwrapUrl(String(url));
        try { realTarget = new URL(realTarget, window.__LS_PROXY_TARGET__).href; } catch (e) {}
        window.__LS_PROXY_TARGET__ = realTarget;
        url = proxyBase + encodeURIComponent(realTarget);
      }
      var r = origReplace.call(this, state, title, url);
      if (window.__lsPostMeta) setTimeout(window.__lsPostMeta, 0);
      return r;
    };
  } catch (e) {}

  // Patch fetch
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        input = wrapUrl(input);
      } else if (input && typeof input.url === 'string') {
        try {
          input = new Request(wrapUrl(input.url), input);
        } catch (e) {}
      }
      return origFetch.call(this, input, init);
    };
  }

  // Patch XMLHttpRequest
  if (window.XMLHttpRequest) {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      var args = Array.prototype.slice.call(arguments);
      if (typeof url === 'string') args[1] = wrapUrl(url);
      return origOpen.apply(this, args);
    };
  }

  // Patch dynamic DOM element URL setters (fixes dynamically injected CSS <link> and <script>)
  function patchProp(Proto, prop) {
    if (!Proto) return;
    var desc = Object.getOwnPropertyDescriptor(Proto, prop);
    if (!desc || !desc.set) return;
    Object.defineProperty(Proto, prop, {
      get: desc.get,
      set: function(val) {
        return desc.set.call(this, typeof val === 'string' ? wrapUrl(val) : val);
      },
      configurable: true
    });
  }
  try {
    patchProp(window.HTMLScriptElement && HTMLScriptElement.prototype, 'src');
    patchProp(window.HTMLLinkElement && HTMLLinkElement.prototype, 'href');
    patchProp(window.HTMLImageElement && HTMLImageElement.prototype, 'src');
    patchProp(window.HTMLIFrameElement && HTMLIFrameElement.prototype, 'src');
    var origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, val) {
      var lower = String(name || '').toLowerCase();
      if ((lower === 'src' || lower === 'href' || lower === 'action') && typeof val === 'string') {
        val = wrapUrl(val);
      }
      return origSetAttr.call(this, name, val);
    };
  } catch (e) {}

  // Intercept anchor clicks
  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
    e.preventDefault();
    location.href = wrapUrl(href);
  }, true);

  // Helper to submit forms cleanly without losing ?url= on GET forms (fixes Google Search 404)
  function submitProxiedForm(form) {
    var rawAction = form.getAttribute('action') || window.__LS_PROXY_TARGET__;
    var targetAction = unwrapUrl(rawAction);
    try {
      targetAction = new URL(targetAction, window.__LS_PROXY_TARGET__).href;
    } catch (err) {}

    var method = (form.getAttribute('method') || form.method || 'GET').toUpperCase();
    if (method === 'GET') {
      var u = new URL(targetAction);
      var fd = new FormData(form);
      fd.forEach(function(v, k) {
        if (typeof v === 'string') u.searchParams.append(k, v);
      });
      location.href = proxyBase + encodeURIComponent(u.href);
      return true;
    } else {
      origSetAttr.call(form, 'action', proxyBase + encodeURIComponent(targetAction));
      return false;
    }
  }

  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    if (submitProxiedForm(form)) {
      e.preventDefault();
    }
  }, true);

  // Also intercept programmatic form.submit() calls (used by Google Search)
  try {
    var origFormSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
      if (submitProxiedForm(this)) return;
      return origFormSubmit.apply(this, arguments);
    };
  } catch (e) {}

  window.open = function(url) {
    if (url) location.href = wrapUrl(url);
    return window;
  };
})();
</script>\`;
}

function rewriteCssForProxy(css, targetUrl) {
  let out = String(css || '');
  // Rewrite url(...)
  out = out.replace(/url\\(\\s*(["']?)([^"')]+)\\1\\s*\\)/gi, (match, quote, raw) => {
    const s = String(raw || '').trim();
    if (
      !s ||
      s.startsWith('data:') ||
      s.startsWith('#') ||
      s.startsWith('blob:') ||
      s.includes('/__proxy?url=')
    ) {
      return match;
    }
    try {
      const parsed = new URL(s, targetUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return 'url(' + quote + '/__proxy?url=' + encodeURIComponent(parsed.href) + quote + ')';
      }
    } catch (_) {}
    return match;
  });

  // Rewrite @import "..." or @import '...'
  out = out.replace(/@import\\s+(["'])([^"']+)\\1/gi, (match, quote, raw) => {
    const s = String(raw || '').trim();
    if (!s || s.includes('/__proxy?url=')) return match;
    try {
      const parsed = new URL(s, targetUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return '@import ' + quote + '/__proxy?url=' + encodeURIComponent(parsed.href) + quote;
      }
    } catch (_) {}
    return match;
  });

  return out;
}

function rewriteHtmlForProxy(html, targetUrl) {
  const toProxy = (raw) => {
    const s = String(raw || '').trim();
    if (
      !s ||
      s.startsWith('#') ||
      s.startsWith('data:') ||
      s.startsWith('blob:') ||
      s.startsWith('javascript:') ||
      s.startsWith('mailto:') ||
      s.startsWith('tel:') ||
      s.includes('/__proxy?url=')
    ) {
      return raw;
    }
    try {
      const parsed = new URL(s, targetUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return '/__proxy?url=' + encodeURIComponent(parsed.href);
      }
    } catch (_) {}
    return raw;
  };

  // Rewrite href, src, action, poster attributes
  let out = String(html || '').replace(
    /\\b(href|src|action|poster)\\s*=\\s*(["'])([^"']+)\\2/gi,
    (match, attr, quote, val) => {
      return attr + '=' + quote + toProxy(val) + quote;
    }
  );

  // Rewrite srcset / imagesrcset
  out = out.replace(
    /\\b(srcset|imagesrcset)\\s*=\\s*(["'])([^"']+)\\2/gi,
    (match, attr, quote, val) => {
      const rewrittenList = val
        .split(',')
        .map((part) => {
          const trimmed = part.trim();
          if (!trimmed) return part;
          const spaceIdx = trimmed.search(/\\s/);
          if (spaceIdx === -1) return toProxy(trimmed);
          const u = trimmed.slice(0, spaceIdx);
          const descriptor = trimmed.slice(spaceIdx);
          return toProxy(u) + descriptor;
        })
        .join(', ');
      return attr + '=' + quote + rewrittenList + quote;
    }
  );

  // Rewrite inline <style> blocks
  out = out.replace(
    /(<style[^>]*>)([\\s\\S]*?)(<\\/style>)/gi,
    (match, openTag, cssBody, closeTag) => openTag + rewriteCssForProxy(cssBody, targetUrl) + closeTag
  );

  // Strip SRI integrity, CSP nonces, and CSP meta tags
  out = out.replace(/\\s+(?:integrity|nonce)\\s*=\\s*(["'])[^"']*\\1/gi, '');
  out = out.replace(/<meta[^>]+http-equiv\\s*=\\s*["']?Content-Security-Policy["']?[^>]*>/gi, '');

  // Rewrite meta refresh redirects
  out = out.replace(
    /(<meta[^>]+http-equiv\\s*=\\s*["']?refresh["']?[^>]+content\\s*=\\s*["'][^"']*?url=)([^"'>]+)(["'][^>]*>)/gi,
    (match, prefix, urlVal, suffix) => prefix + toProxy(urlVal.trim()) + suffix
  );

  const injectedHead = buildProxyRuntimeScript(targetUrl) + lsBridgeScript;

  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => m + '\\n' + injectedHead);
  } else if (/<html[^>]*>/i.test(out)) {
    out = out.replace(/<html[^>]*>/i, (m) => m + '<head>' + injectedHead + '</head>');
  } else {
    out = injectedHead + '\\n' + out;
  }

  return out;
}

function decompressBuffer(buf, encoding) {
  const enc = String(encoding || '').toLowerCase();
  try {
    if (enc.includes('gzip')) return zlib.gunzipSync(buf);
    if (enc.includes('br') && typeof zlib.brotliDecompressSync === 'function') {
      return zlib.brotliDecompressSync(buf);
    }
    if (enc.includes('deflate')) return zlib.inflateSync(buf);
  } catch (_) {}
  return buf;
}

function fetchUpstream(targetUrl, method, reqHeaders, bodyBuf, redirectsLeft = 6) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch (e) {
      return reject(new Error('Invalid target URL'));
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return reject(new Error('Only HTTP/HTTPS URLs are supported'));
    }

    const client = parsed.protocol === 'https:' ? https : http;
    const upperMethod = (method || 'GET').toUpperCase();
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      'Accept':
        reqHeaders['accept'] ||
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': reqHeaders['accept-language'] || 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': parsed.origin + '/',
    };
    if (upperMethod !== 'GET' && upperMethod !== 'HEAD') {
      headers['Origin'] = parsed.origin;
    }
    if (reqHeaders['content-type']) headers['Content-Type'] = reqHeaders['content-type'];
    if (reqHeaders['cookie']) headers['Cookie'] = reqHeaders['cookie'];
    if (bodyBuf && bodyBuf.length) headers['Content-Length'] = bodyBuf.length;

    const upstreamReq = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: upperMethod,
        headers,
        timeout: 20000,
        rejectUnauthorized: false,
      },
      (upstreamRes) => {
        const status = upstreamRes.statusCode || 200;
        const loc = upstreamRes.headers['location'];
        if ([301, 302, 303, 307, 308].includes(status) && loc && redirectsLeft > 0) {
          upstreamRes.resume();
          const nextUrl = new URL(loc, parsed.href).href;
          const nextMethod =
            status === 303 || ((status === 301 || status === 302) && upperMethod === 'POST')
              ? 'GET'
              : upperMethod;
          return resolve(
            fetchUpstream(
              nextUrl,
              nextMethod,
              reqHeaders,
              nextMethod === 'GET' ? null : bodyBuf,
              redirectsLeft - 1
            )
          );
        }

        const chunks = [];
        upstreamRes.on('data', (c) => chunks.push(c));
        upstreamRes.on('end', () => {
          resolve({
            status,
            headers: upstreamRes.headers,
            body: Buffer.concat(chunks),
            finalUrl: parsed.href,
          });
        });
      }
    );

    upstreamReq.on('timeout', () => {
      upstreamReq.destroy(new Error('Upstream request timed out'));
    });
    upstreamReq.on('error', reject);
    if (bodyBuf && bodyBuf.length) upstreamReq.write(bodyBuf);
    upstreamReq.end();
  });
}

async function handleProxyRequest(req, res, targetUrl) {
  try {
    const bodyBuf = req.rawBody || null;
    const result = await fetchUpstream(targetUrl, req.method, req.headers, bodyBuf);

    const blockedHeaders = new Set([
      'x-frame-options',
      'content-security-policy',
      'content-security-policy-report-only',
      'cross-origin-opener-policy',
      'cross-origin-embedder-policy',
      'cross-origin-resource-policy',
      'content-length',
      'content-encoding',
      'transfer-encoding',
      'connection',
    ]);

    Object.entries(result.headers || {}).forEach(([k, v]) => {
      const lower = k.toLowerCase();
      if (blockedHeaders.has(lower)) return;
      if (lower === 'set-cookie' && Array.isArray(v)) {
        const cleanCookies = v.map((c) =>
          String(c)
            .replace(/;\\s*Domain=[^;]+/gi, '')
            .replace(/;\\s*Secure/gi, '')
            .replace(/SameSite=None/gi, 'SameSite=Lax')
        );
        res.setHeader('Set-Cookie', cleanCookies);
        return;
      }
      try {
        res.setHeader(k, v);
      } catch (_) {}
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-LS-Final-Url', result.finalUrl);

    const contentType = String(result.headers['content-type'] || '');
    const rawBuf = decompressBuffer(result.body, result.headers['content-encoding']);

    if (/text\\/html|application\\/xhtml\\+xml/i.test(contentType)) {
      const htmlText = rawBuf.toString('utf8');
      const rewritten = rewriteHtmlForProxy(htmlText, result.finalUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(result.status).send(rewritten);
    }

    if (/text\\/css/i.test(contentType)) {
      const cssText = rawBuf.toString('utf8');
      const rewrittenCss = rewriteCssForProxy(cssText, result.finalUrl);
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      return res.status(result.status).send(rewrittenCss);
    }

    return res.status(result.status).send(rawBuf);
  } catch (err) {
    const safeUrl = String(targetUrl || '').replace(/</g, '<');
    const safeMsg = String((err && err.message) || err).replace(/</g, '<');
    res.status(502).setHeader('Content-Type', 'text/html; charset=utf-8').send(\`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        body { font-family: system-ui, sans-serif; background: #1e1e1e; color: #e8eaed; padding: 28px 18px; text-align: center; }
        .card { max-width: 420px; margin: 24px auto; padding: 20px; border-radius: 8px; background: #292a2d; border: 1px solid #3c4043; }
        h3 { margin: 0 0 8px; color: #f87171; }
        p { font-size: 13px; color: #9aa0a6; word-break: break-all; }
        button { margin-top: 12px; padding: 8px 16px; border: 0; border-radius: 5px; background: #22c55e; color: #052e16; font-weight: 600; cursor: pointer; }
      </style></head>
      <body>
        <div class="card">
          <h3>Proxy Could Not Load Page</h3>
          <p>\${safeMsg}</p>
          <p>\${safeUrl}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      </body></html>
    \`);
  }
}

function resolveChromiumBin() {
  const candidates = [
    'chromium-browser',
    'chromium',
    'google-chrome',
    'google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/lib/chromium/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  for (const c of candidates) {
    try {
      if (c.startsWith('/')) {
        if (fs.existsSync(c)) return c;
      } else {
        execSync('command -v ' + c, { stdio: 'ignore' });
        return c;
      }
    } catch (_) {}
  }
  return null;
}

function renderWithHeadlessChromium(targetUrl) {
  return new Promise((resolve, reject) => {
    const bin = resolveChromiumBin();
    if (!bin) {
      return reject(new Error('Chromium binary not found in PATH'));
    }
    const args = [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--hide-scrollbars',
      '--mute-audio',
      '--user-agent=Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      '--virtual-time-budget=8000',
      '--timeout=20000',
      '--dump-dom',
      targetUrl,
    ];
    console.log('[acodels] chromium dump-dom bin=' + bin + ' url=' + targetUrl);
    execFile(bin, args, { maxBuffer: 20 * 1024 * 1024, timeout: 30000 }, (err, stdout, stderr) => {
      if (err && !stdout) {
        console.error('[acodels] chromium fail', err && err.message, String(stderr || '').slice(0, 400));
        return reject(err);
      }
      const html = String(stdout || '');
      console.log('[acodels] chromium ok bytes=' + html.length);
      if (html.length < 50) {
        return reject(new Error('Chromium returned empty DOM'));
      }
      resolve(html);
    });
  });
}

app.all(['/__proxy', '/_proxy'], (req, res) => {
  if (req.query.url) {
    const target = String(req.query.url);
    const engine = String(req.query.engine || '');
    console.log('[acodels] proxy request engine=' + (engine || 'node') + ' url=' + target.slice(0, 180));
    if (engine === 'chromium') {
      // Promise form — avoids "await outside async" parse errors
      renderWithHeadlessChromium(target)
        .then((domHtml) => {
          const rewritten = rewriteHtmlForProxy(domHtml, target);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('X-LS-Engine', 'chromium');
          return res.status(200).send(rewritten);
        })
        .catch((e) => {
          console.error('[acodels] chromium path failed, fallback node-proxy:', e && e.message);
          res.setHeader('X-LS-Engine', 'node-fallback');
          return handleProxyRequest(req, res, target);
        });
      return;
    }
    res.setHeader('X-LS-Engine', 'node');
    return handleProxyRequest(req, res, target);
  }
  // Fallback when a GET form (like Google Search) strips ?url= and submits ?q=... directly to /__proxy
  const ref = req.headers.referer || '';
  const idx = ref.indexOf('/__proxy?url=');
  if (idx !== -1) {
    try {
      const encodedBase = ref.slice(idx + '/__proxy?url='.length).split('&')[0];
      const baseTarget = decodeURIComponent(encodedBase);
      const u = new URL('/search', baseTarget);
      Object.entries(req.query || {}).forEach(([k, v]) => {
        if (typeof v === 'string') u.searchParams.set(k, v);
      });
      return handleProxyRequest(req, res, u.href);
    } catch (_) {}
  }
  return res.status(400).send('Missing ?url=');
});

// Referer-based fallback for root-relative assets/APIs requested by proxied pages
app.use((req, res, next) => {
  const ref = req.headers.referer || '';
  const idx = ref.indexOf('/__proxy?url=');
  if (
    idx !== -1 &&
    !req.path.startsWith('/__ls/') &&
    !req.path.startsWith('/dt/') &&
    req.path !== '/__proxy' &&
    req.path !== '/_proxy'
  ) {
    try {
      const encodedBase = ref.slice(idx + '/__proxy?url='.length).split('&')[0];
      const baseTarget = decodeURIComponent(encodedBase);
      const resolved = new URL(req.originalUrl, baseTarget).href;
      return handleProxyRequest(req, res, resolved);
    } catch (_) {}
  }
  next();
});

// ============================================================================
// LOCAL STATIC LIVE SERVER
// ============================================================================

app.get('/dt/suger-dev.js', (req, res) => {
  const p = path.join(__dirname, 'suger-dev.js');
  if (fs.existsSync(p)) res.sendFile(p);
  else res.status(404).end();
});
app.get('/zoom-handler.js', (req, res) => {
  const p = path.join(__dirname, 'zoom-handler.js');
  if (fs.existsSync(p)) res.sendFile(p);
  else res.status(404).end();
});
app.get('/inspector.js', (req, res) => {
  const p = path.join(__dirname, 'inspector.js');
  if (fs.existsSync(p)) res.sendFile(p);
  else res.status(404).end();
});
app.get('/eruda.min.js', (req, res) => {
  const erudaPath = path.join(__dirname, 'eruda.min.js');
  if (fs.existsSync(erudaPath)) res.sendFile(erudaPath);
  else res.status(404).send('Eruda not found');
});

function injectHtml(html) {
  let injected = html;
  if (liveReloadEnabled) {
    injected = injected.replace(/<\\/body>/i, webSocketScript + '</body>');
    if (!/<\\/body>/i.test(html)) injected = injected + webSocketScript;
  }
  if (erudaEnabled) {
    const extra =
      consoleType === 'eruda' ? erudaRealScript + '\\n' + inspectorScript : sugerScript + '\\n' + inspectorScript;
    injected = injected.replace(/<\\/body>/i, extra + '</body>');
  }
  if (zoomEnabled) {
    injected = injected.replace(/<\\/body>/i, zoomScript + '</body>');
  }
  if (/<\\/body>/i.test(injected)) injected = injected.replace(/<\\/body>/i, lsBridgeScript + '</body>');
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
        return \`<li><a href="\${href}">\${e.name}\${e.isDirectory() ? '/' : ''}</a></li>\`;
      })
      .join('\\n');
    res.setHeader('Content-Type', 'text/html; charset=' + charset);
    res.send(
      \`<!DOCTYPE html><html><head><meta charset="\${charset}"/><title>Index of \${urlPath}</title></head><body><h1>Index of \${urlPath}</h1><ul>\${rows}</ul></body></html>\`
    );
  });
}

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
    if (/\\.html?$/i.test(full)) return sendHtmlFile(res, full);
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
    try { fileWatcher.close(); } catch (_) {}
    fileWatcher = null;
  }
  if (!BASE_DIR || !liveReloadEnabled) {
    if (res) res.status(201).json({ message: 'OK' });
    return;
  }
  fileWatcher = chokidar.watch(BASE_DIR, {
    ignored: /(^|[\\/\\\\])\\.\\./,
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
`;

export const ACODELS_INDEX_B64 = toBase64(ACODELS_INDEX_CODE);