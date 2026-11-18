/**
 * Full acodels/index.js source + dynamic base64 encoder (marker: ls-proxy-v10).
 * Features:
 *  - In-memory HTML cache for instant back/repeat page loads
 *  - Top-frame click & form navigation bridge to tabManager (preserves step-by-step history & BFCache)
 *  - Full /__proxy rewriting for HTML, CSS, nested <iframe>, <video>, <source>, and lazy-loaded thumbnails
 *  - HLS (.m3u8) playlist rewriter + HTTP 206 Range streaming for adult & media video players
 */
import { toBase64 } from '../utils/alpineExec.js';

export const ACODELS_INDEX_CODE = `/**
 * acodels — Live Server + Hybrid Turbo Streaming Reverse Proxy Node backend (ls-proxy-v10, ls-bridge-v1)
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

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 128, maxFreeSockets: 32, timeout: 30000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 128, maxFreeSockets: 32, timeout: 30000, rejectUnauthorized: false });

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
const cookieJar = new Map();
const htmlPageCache = new Map(); // url -> { status, html, finalUrl, ts }
const PAGE_CACHE_TTL = 4 * 60 * 1000;

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

function storeUpstreamCookies(hostname, setCookieHeader) {
  if (!hostname || !setCookieHeader) return;
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [String(setCookieHeader)];
  let hostMap = cookieJar.get(hostname);
  if (!hostMap) {
    hostMap = new Map();
    cookieJar.set(hostname, hostMap);
  }
  list.forEach((raw) => {
    const firstPart = String(raw || '').split(';')[0].trim();
    const eq = firstPart.indexOf('=');
    if (eq > 0) {
      hostMap.set(firstPart.slice(0, eq).trim(), firstPart.slice(eq + 1).trim());
    }
  });
}

function getStoredCookies(hostname, incomingCookieHeader) {
  const merged = new Map();
  if (incomingCookieHeader) {
    String(incomingCookieHeader)
      .split(';')
      .forEach((pair) => {
        const eq = pair.indexOf('=');
        if (eq > 0) merged.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      });
  }
  const parts = String(hostname || '').split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const sub = parts.slice(i).join('.');
    const hostMap = cookieJar.get(sub);
    if (hostMap) {
      hostMap.forEach((v, k) => merged.set(k, v));
    }
  }
  if (!merged.size) return '';
  const out = [];
  merged.forEach((v, k) => out.push(k + '=' + v));
  return out.join('; ');
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
    if (window.parent !== window.top) return; // Only top-level tab iframe reports tab meta
    post({ type: 'meta', href: currentHref(), title: document.title || '', favicon: fav() });
  }
  window.__lsPostMeta = meta;
  document.addEventListener('DOMContentLoaded', meta);
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

app.use((req, res, next) => {
  if (jsonData.enableCors !== false) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, X-LS-Final-Url');
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
    proxyVersion: 10,
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
    proxyVersion: 10,
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
// HYBRID TURBO STREAMING REVERSE PROXY (/__proxy?url=...)
// ============================================================================

function buildProxyRuntimeScript(targetUrl) {
  let origin = '';
  try { origin = new URL(targetUrl).origin; } catch (_) {}
  return \`<script>
(function() {
  var isTopTabFrame = (window.parent === window.top);
  var P = window.parent;
  window.__LS_PROXY_TARGET__ = \${JSON.stringify(targetUrl)};
  window.__LS_PROXY_ORIGIN__ = \${JSON.stringify(origin)};
  var proxyBase = location.origin + '/__proxy?url=';

  function unwrapUrl(u) {
    var s = String(u || '');
    var idx = s.indexOf('/__proxy?url=');
    if (idx !== -1) {
      try {
        s = decodeURIComponent(s.slice(idx + '/__proxy?url='.length).split('&')[0]);
      } catch (e) {}
    }
    try {
      var parsed = new URL(s, window.__LS_PROXY_TARGET__);
      if (/^(www\\.|m\\.|images\\.|encrypted\\.)?google\\.[a-z.]+$/i.test(parsed.hostname)) {
        if (parsed.pathname === '/url') {
          var q = parsed.searchParams.get('q') || parsed.searchParams.get('url');
          if (q && /^https?:\\/\\//i.test(q)) return q;
        }
        if (parsed.pathname === '/imgres') {
          var r = parsed.searchParams.get('imgrefurl') || parsed.searchParams.get('imgurl');
          if (r && /^https?:\\/\\//i.test(r)) return r;
        }
      }
      return parsed.href;
    } catch (e) {
      return s;
    }
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

  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = function() {
        return Promise.resolve({ scope: '/' });
      };
    }
  } catch (e) {}

  try {
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function(state, title, url) {
      if (url != null) {
        var realTarget = unwrapUrl(String(url));
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
        window.__LS_PROXY_TARGET__ = realTarget;
        url = proxyBase + encodeURIComponent(realTarget);
      }
      var r = origReplace.call(this, state, title, url);
      if (window.__lsPostMeta) setTimeout(window.__lsPostMeta, 0);
      return r;
    };
  } catch (e) {}

  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        input = wrapUrl(input);
      } else if (input && typeof URL !== 'undefined' && input instanceof URL) {
        input = wrapUrl(input.href);
      } else if (input && typeof input.url === 'string') {
        try {
          input = new Request(wrapUrl(input.url), input);
        } catch (e) {}
      }
      return origFetch.call(this, input, init);
    };
  }

  if (window.XMLHttpRequest) {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      var args = Array.prototype.slice.call(arguments);
      if (typeof url === 'string') {
        args[1] = wrapUrl(url);
      } else if (url && typeof url.href === 'string') {
        args[1] = wrapUrl(url.href);
      }
      return origOpen.apply(this, args);
    };
  }

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
    patchProp(window.HTMLMediaElement && HTMLMediaElement.prototype, 'src');
    patchProp(window.HTMLSourceElement && HTMLSourceElement.prototype, 'src');
    patchProp(window.HTMLVideoElement && HTMLVideoElement.prototype, 'poster');

    var origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, val) {
      var lower = String(name || '').toLowerCase();
      if ((lower === 'src' || lower === 'href' || lower === 'action' || lower === 'poster' || lower === 'data-src') && typeof val === 'string') {
        val = wrapUrl(val);
      }
      if (lower === 'sandbox' && this.tagName === 'IFRAME') {
        return;
      }
      return origSetAttr.call(this, name, val);
    };
  } catch (e) {}

  function navigateToTarget(realUrl) {
    if (isTopTabFrame && P && P !== window) {
      try {
        P.postMessage({ ls: 1, type: 'navigate', href: realUrl }, '*');
        return;
      } catch (e) {}
    }
    location.href = wrapUrl(realUrl);
  }

  // Intercept anchor clicks -> send to tabManager so BFCache & step-by-step history work!
  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
    var realTarget = unwrapUrl(href);
    if (/^https?:\\/\\//i.test(realTarget)) {
      e.preventDefault();
      navigateToTarget(realTarget);
    }
  }, true);

  function submitProxiedForm(form) {
    var rawAction = form.getAttribute('action') || window.__LS_PROXY_TARGET__;
    var targetAction = unwrapUrl(rawAction);
    var method = (form.getAttribute('method') || form.method || 'GET').toUpperCase();
    if (method === 'GET') {
      var u = new URL(targetAction);
      var fd = new FormData(form);
      fd.forEach(function(v, k) {
        if (typeof v === 'string') u.searchParams.set(k, v);
      });
      navigateToTarget(u.href);
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

  try {
    var origFormSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
      if (submitProxiedForm(this)) return;
      return origFormSubmit.apply(this, arguments);
    };
  } catch (e) {}

  window.open = function(url) {
    if (url) navigateToTarget(unwrapUrl(String(url)));
    return window;
  };
})();
</script>\`;
}

function rewriteCssForProxy(css, targetUrl) {
  let out = String(css || '');
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

function rewriteM3u8ForProxy(m3u8Text, targetUrl) {
  const wrapLineUrl = (raw) => {
    const s = String(raw || '').trim();
    if (!s || s.startsWith('data:') || s.includes('/__proxy?url=')) return raw;
    try {
      const abs = new URL(s, targetUrl).href;
      return '/__proxy?url=' + encodeURIComponent(abs);
    } catch (_) {
      return raw;
    }
  };

  return String(m3u8Text || '')
    .split(/\\r?\\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        return line.replace(/URI\\s*=\\s*(["'])([^"']+)\\1/gi, (m, q, u) => {
          return 'URI=' + q + wrapLineUrl(u) + q;
        });
      }
      return wrapLineUrl(trimmed);
    })
    .join('\\n');
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

  let out = String(html || '').replace(
    /\\b(href|src|action|poster|data-src|data-original|data-lazy-src|data-hls|data-video|data-mp4)\\s*=\\s*(["'])([^"']+)\\2/gi,
    (match, attr, quote, val) => {
      return attr + '=' + quote + toProxy(val) + quote;
    }
  );

  out = out.replace(
    /\\b(srcset|imagesrcset|data-srcset)\\s*=\\s*(["'])([^"']+)\\2/gi,
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

  out = out.replace(
    /(<style[^>]*>)([\\s\\S]*?)(<\\/style>)/gi,
    (match, openTag, cssBody, closeTag) => openTag + rewriteCssForProxy(cssBody, targetUrl) + closeTag
  );

  out = out.replace(/\\b(?:window\\.)?top\\.location\\b/g, 'window.location');
  out = out.replace(/\\b(?:window\\.)?parent\\.location\\b/g, 'window.location');

  out = out.replace(/\\s+(?:integrity|nonce|sandbox)\\s*=\\s*(["'])[^"']*\\1/gi, '');
  out = out.replace(/<meta[^>]+http-equiv\\s*=\\s*["']?(?:Content-Security-Policy|X-Frame-Options)["']?[^>]*>/gi, '');

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

function handleProxyRequest(req, res, targetUrl, redirectsLeft = 7) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch (e) {
    return res.status(400).send('Invalid target URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).send('Only HTTP/HTTPS URLs are supported');
  }

  const upperMethod = (req.method || 'GET').toUpperCase();
  const bypassCache = Boolean(req.query._t);

  // Serve from in-memory HTML cache if available
  if (upperMethod === 'GET' && !bypassCache && !req.headers['range'] && htmlPageCache.has(parsed.href)) {
    const cached = htmlPageCache.get(parsed.href);
    if (Date.now() - cached.ts < PAGE_CACHE_TTL) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-LS-Final-Url', cached.finalUrl);
      res.setHeader('X-LS-Cache', 'HIT');
      return res.status(cached.status).send(cached.html);
    }
    htmlPageCache.delete(parsed.href);
  }

  const isHttps = parsed.protocol === 'https:';
  const client = isHttps ? https : http;
  const agent = isHttps ? httpsAgent : httpAgent;
  const bodyBuf = req.rawBody || null;

  const headers = {
    'User-Agent':
      req.headers['user-agent'] ||
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    'Accept':
      req.headers['accept'] ||
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,video/webm,video/mp4,*/*;q=0.8',
    'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
    'Accept-Encoding': req.headers['range'] ? 'identity' : 'gzip, deflate, br',
    'Referer': parsed.origin + '/',
    'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?1',
    'Sec-Ch-Ua-Platform': '"Android"',
    'Upgrade-Insecure-Requests': '1',
  };

  if (req.headers['range']) headers['Range'] = req.headers['range'];
  if (req.headers['if-range']) headers['If-Range'] = req.headers['if-range'];
  if (upperMethod !== 'GET' && upperMethod !== 'HEAD') {
    headers['Origin'] = parsed.origin;
  }
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

  const cookieStr = getStoredCookies(parsed.hostname, req.headers['cookie']);
  if (cookieStr) headers['Cookie'] = cookieStr;
  if (bodyBuf && bodyBuf.length) headers['Content-Length'] = bodyBuf.length;

  const upstreamReq = client.request(
    {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: upperMethod,
      headers,
      agent,
      timeout: 25000,
    },
    (upstreamRes) => {
      const status = upstreamRes.statusCode || 200;
      if (upstreamRes.headers['set-cookie']) {
        storeUpstreamCookies(parsed.hostname, upstreamRes.headers['set-cookie']);
      }

      const loc = upstreamRes.headers['location'];
      if ([301, 302, 303, 307, 308].includes(status) && loc && redirectsLeft > 0) {
        upstreamRes.resume();
        try {
          const nextUrl = new URL(loc, parsed.href).href;
          if (status === 303 || ((status === 301 || status === 302) && upperMethod === 'POST')) {
            req.method = 'GET';
            req.rawBody = null;
          }
          return handleProxyRequest(req, res, nextUrl, redirectsLeft - 1);
        } catch (_) {}
      }

      const contentType = String(upstreamRes.headers['content-type'] || '').toLowerCase();
      const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
      const isCss = contentType.includes('text/css');
      const isM3u8 =
        contentType.includes('mpegurl') ||
        /\\.m3u8(\\?|$)/i.test(parsed.pathname + parsed.search);

      const needsRewrite = isHtml || isCss || isM3u8;

      const blockedHeaders = new Set([
        'x-frame-options',
        'content-security-policy',
        'content-security-policy-report-only',
        'cross-origin-opener-policy',
        'cross-origin-embedder-policy',
        'cross-origin-resource-policy',
        'x-content-type-options',
        'strict-transport-security',
        'alt-svc',
        'connection',
        'transfer-encoding',
      ]);

      Object.entries(upstreamRes.headers || {}).forEach(([k, v]) => {
        const lower = k.toLowerCase();
        if (blockedHeaders.has(lower)) return;
        if (needsRewrite && (lower === 'content-length' || lower === 'content-encoding')) return;
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
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('X-LS-Final-Url', parsed.href);

      if (!needsRewrite) {
        if (upperMethod === 'GET' && status === 200 && !res.getHeader('Cache-Control')) {
          res.setHeader('Cache-Control', 'public, max-age=600');
        }
        res.status(status);
        upstreamRes.pipe(res);
        req.on('close', () => {
          try { upstreamRes.destroy(); } catch (_) {}
        });
        return;
      }

      const chunks = [];
      upstreamRes.on('data', (c) => chunks.push(c));
      upstreamRes.on('end', () => {
        try {
          const rawBuf = decompressBuffer(Buffer.concat(chunks), upstreamRes.headers['content-encoding']);
          const text = rawBuf.toString('utf8');

          if (isHtml) {
            const rewritten = rewriteHtmlForProxy(text, parsed.href);
            if (upperMethod === 'GET' && status === 200) {
              htmlPageCache.set(parsed.href, {
                status,
                html: rewritten,
                finalUrl: parsed.href,
                ts: Date.now(),
              });
              if (htmlPageCache.size > 40) {
                const oldestKey = htmlPageCache.keys().next().value;
                htmlPageCache.delete(oldestKey);
              }
            }
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.status(status).send(rewritten);
          }
          if (isCss) {
            const rewrittenCss = rewriteCssForProxy(text, parsed.href);
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=600');
            return res.status(status).send(rewrittenCss);
          }
          if (isM3u8) {
            const rewrittenM3u8 = rewriteM3u8ForProxy(text, parsed.href);
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
            return res.status(status).send(rewrittenM3u8);
          }
          res.status(status).send(rawBuf);
        } catch (err) {
          res.status(500).send('Proxy decode error');
        }
      });
    }
  );

  upstreamReq.on('timeout', () => {
    upstreamReq.destroy(new Error('Upstream request timed out'));
  });

  upstreamReq.on('error', (err) => {
    if (res.headersSent) return;
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
  });

  if (bodyBuf && bodyBuf.length) upstreamReq.write(bodyBuf);
  upstreamReq.end();
}

app.all(['/__proxy', '/_proxy'], (req, res) => {
  if (req.query.url) {
    return handleProxyRequest(req, res, String(req.query.url));
  }
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

function safeJoinRoot(root, reqPath) {
  const base = path.resolve(String(root || '/'));
  let rel = decodeURIComponent(String(reqPath || ''));
  rel = rel.split('?')[0].split('#')[0];
  while (rel.charAt(0) === '/') rel = rel.slice(1);
  if (!rel || rel === '.') return base;
  const full = path.resolve(base, rel);
  const prefix = base.endsWith(path.sep) ? base : base + path.sep;
  if (full !== base && !full.startsWith(prefix)) return null;
  return full;
}

app.get('/', (req, res) => {
  if (!BASE_DIR) return res.status(400).send('Not configured. PATCH /setup first.');
  const fileName = String(jsonData.fileName || 'index.html').split('/').filter(Boolean).join('/');
  const fullPath = safeJoinRoot(BASE_DIR, fileName);
  if (fullPath && fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    return sendHtmlFile(res, fullPath);
  }
  const indexPath = safeJoinRoot(BASE_DIR, 'index.html');
  if (indexPath && fs.existsSync(indexPath)) return sendHtmlFile(res, indexPath);
  if (directoryListing) return listDir(res, BASE_DIR, '/');
  return res.status(404).send('No index.html in ' + BASE_DIR + ' (wanted ' + fileName + ')');
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
  if (rel === '/' || rel === '') return next();
  const full = safeJoinRoot(BASE_DIR, rel);
  if (!full) return res.status(403).send('Forbidden path');
  fs.stat(full, (err, st) => {
    if (err) {
      return res.status(404).send('Cannot get ' + rel.replace(/^[/]+/, '') + ' (root ' + BASE_DIR + ')');
    }
    if (st.isDirectory()) {
      if (directoryListing) return listDir(res, full, rel.endsWith('/') ? rel : rel + '/');
      const idx = safeJoinRoot(full, 'index.html');
      if (idx && fs.existsSync(idx)) return sendHtmlFile(res, idx);
      return res.status(404).end();
    }
    if (/\\.html?$/i.test(full)) return sendHtmlFile(res, full);
    res.sendFile(full, (e) => {
      if (e) res.status(404).send('Cannot get ' + rel.replace(/^[/]+/, ''));
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