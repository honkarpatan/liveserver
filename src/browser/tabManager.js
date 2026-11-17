/**
 * Multi-tab state for the in-app browser with per-tab Back/Forward history stack,
 * Local Node.js Reverse Proxy routing, and 10-second slow-load Chromium installer offer.
 */
import { icon, I } from './icons.js';
import { loadDevtoolCode } from './devtool.js';
import { getSettings } from '../core/settings.js';
import { ensureProxyServer } from '../server/process.js';
import { getServerStatus } from '../server/status.js';
import { isChromiumInstalled } from '../deps/dependencyChecker.js';
import { showChromiumInstallerPopup, isChromiumInstallerOpen } from '../ui/chromiumInstaller.js';
import { showStatusPill } from '../ui/statusPill.js';

const toast = acode.require('toast');

const SLOW_LOAD_TIMEOUT_MS = 10000;

let tabs = [];
let activeTabId = null;
let nextId = 1;
let listeners = [];
let visited = [];
let slowLoadTimer = null;
let chromiumPromptDismissed = false;

export function getTabs() {
  return tabs.slice();
}

export function getActiveTab() {
  return tabs.find((t) => t.id === activeTabId) || null;
}

export function getVisited() {
  return visited.slice();
}

export function clearVisited() {
  visited = [];
  emit();
}

export function canGoBack() {
  const t = getActiveTab();
  return !!(t && t.historyIndex > 0);
}

export function canGoForward() {
  const t = getActiveTab();
  return !!(t && t.historyIndex < t.history.length - 1);
}

export function onTabsChange(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((f) => f !== fn);
  };
}

function emit() {
  listeners.forEach((fn) => {
    try {
      fn(getTabs(), getActiveTab());
    } catch (_) {}
  });
}

function remember(url, title) {
  const clean = toDisplayUrl(url);
  if (!clean || clean === 'about:blank' || clean.startsWith('blob:')) return;
  visited = visited.filter((v) => v.url !== clean);
  visited.unshift({ url: clean, title: title || clean.replace(/^https?:\/\//i, ''), ts: Date.now() });
  if (visited.length > 50) visited.length = 50;
}

export function isLocalUrl(url) {
  const clean = toDisplayUrl(url);
  return /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0|192\.168\.|10\.)/i.test(String(clean || ''));
}

export function toDisplayUrl(rawUrl) {
  const s = String(rawUrl || '').trim();
  if (!s) return 'about:blank';
  const marker = '/__proxy?url=';
  const idx = s.indexOf(marker);
  if (idx !== -1) {
    try {
      const encoded = s.slice(idx + marker.length).split('&')[0];
      return decodeURIComponent(encoded);
    } catch (_) {}
  }
  return s;
}

export function normalizeUrl(raw) {
  let u = toDisplayUrl(raw);
  if (!u || u === 'about:blank') return 'about:blank';
  if (/^(about:|blob:|data:|https?:\/\/)/i.test(u)) return u;

  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/.*)?$/i.test(u)) {
    return 'http://' + u;
  }

  if (!/\s/.test(u) && /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(u)) {
    return 'https://' + u;
  }

  const engine = getSettings().browserSearchEngine || 'google';
  const q = encodeURIComponent(u);
  if (engine === 'duckduckgo') return `https://duckduckgo.com/?q=${q}`;
  if (engine === 'bing') return `https://www.bing.com/search?q=${q}`;
  if (engine === 'brave') return `https://search.brave.com/search?q=${q}`;
  return `https://www.google.com/search?q=${q}`;
}

async function resolveFrameSrc(displayUrl, opts = {}) {
  if (!displayUrl || displayUrl === 'about:blank' || displayUrl.startsWith('blob:')) {
    return displayUrl || 'about:blank';
  }
  if (isLocalUrl(displayUrl)) {
    return displayUrl;
  }

const extMode = getSettings().externalSiteMode || 'proxy';
if (extMode === 'proxy' || extMode === 'chromium') {
  const st = getServerStatus();
  const port = st.running && st.port ? st.port : await ensureProxyServer();
  if (port) {
    const useChromium = extMode === 'chromium' || !!opts.useChromium;
    const engineParam = useChromium ? '&engine=chromium' : '';
    return `http://127.0.0.1:${port}/__proxy?url=${encodeURIComponent(displayUrl)}${engineParam}`;
  }
}
  
  return displayUrl;
}

function clearSlowLoadTimer() {
  if (slowLoadTimer) {
    clearTimeout(slowLoadTimer);
    slowLoadTimer = null;
  }
}

function armSlowLoadWatcher(tab, displayUrl, useChromium) {
  clearSlowLoadTimer();
  if (!tab || !displayUrl || displayUrl === 'about:blank' || isLocalUrl(displayUrl)) return;

  slowLoadTimer = setTimeout(async () => {
    if (!tab.loading || tab.id !== activeTabId) return;

    const installed = getSettings().chromiumInstalled === true || (await isChromiumInstalled());

    if (installed) {
      if (!useChromium) {
        showStatusPill('Switching slow page to Chromium renderer...', { spin: true, autoHideMs: 3500 });
        loadUrlIntoTab(tab, displayUrl, { pushHistory: false, useChromium: true });
      }
      return;
    }

    if (chromiumPromptDismissed || isChromiumInstallerOpen()) return;

    showChromiumInstallerPopup({
      url: displayUrl,
      onInstalled: () => {
        loadUrlIntoTab(tab, displayUrl, { pushHistory: false, useChromium: true });
      },
      onDismiss: () => {
        chromiumPromptDismissed = true;
      },
    });
  }, SLOW_LOAD_TIMEOUT_MS);
}

export function sendToTab(tab, cmd, extra) {
  try {
    tab.iframe.contentWindow.postMessage({ ls: 1, cmd, ...(extra || {}) }, '*');
    return true;
  } catch (_) {
    return false;
  }
}

function directWin(tab) {
  try {
    const w = tab.iframe?.contentWindow;
    void w.document;
    return w;
  } catch (_) {
    return null;
  }
}

export function applyZoom(tab) {
  const w = directWin(tab);
  if (w) {
    try {
      w.document.documentElement.style.zoom = String((tab.zoom || 100) / 100);
      return;
    } catch (_) {}
  }
  sendToTab(tab, 'zoom', { pct: tab.zoom || 100 });
}

function findTab(source) {
  return tabs.find((t) => {
    try {
      return t.iframe.contentWindow === source;
    } catch (_) {
      return false;
    }
  });
}

function pushTabHistory(tab, displayUrl) {
  if (!tab || !displayUrl) return;
  const currentEntry = tab.history[tab.historyIndex];
  if (currentEntry === displayUrl) return;
  tab.history = tab.history.slice(0, tab.historyIndex + 1);
  tab.history.push(displayUrl);
  tab.historyIndex = tab.history.length - 1;
}

function onBridgeMessage(ev) {
  const d = ev.data;
  if (!d || d.ls !== 1) return;
  const tab = findTab(ev.source);
  if (!tab) return;
  tab.bridge = true;

  if (d.type === 'meta') {
    clearSlowLoadTimer();
    tab.loading = false;
    if (d.href && d.href !== 'about:blank') {
      const cleanHref = toDisplayUrl(d.href);
      if (cleanHref !== tab.url) {
        tab.url = cleanHref;
        pushTabHistory(tab, cleanHref);
      }
    }
    if (!tab.pinTitle) {
      tab.title = String(d.title || tab.url.replace(/^https?:\/\//, '')).slice(0, 60);
    }
    if (d.favicon) tab.favicon = d.favicon;
    if ((tab.zoom || 100) !== 100) sendToTab(tab, 'zoom', { pct: tab.zoom });
    remember(tab.url, tab.title);
    emit();
  } else if (d.type === 'devtools') {
    tab.devtools = !!d.on;
    emit();
  } else if (d.type === 'need-devtools') {
    loadDevtoolCode().then((code) => {
      if (!code) return toast('Suger DevTool file missing (devtool/suger-dev.js). Reinstall the plugin.', 3500);
      sendToTab(tab, 'devtools', { on: true, code });
    });
  } else if (d.type === 'devtools-error') {
    toast('DevTool: ' + d.message, 3000);
  }
}

export function initBridge() {
  window.addEventListener('message', onBridgeMessage);
}

export function disposeBridge() {
  clearSlowLoadTimer();
  window.removeEventListener('message', onBridgeMessage);
}

function applyFramePolicy(iframe, frameSrc) {
  const isProxied = String(frameSrc || '').includes('/__proxy?url=');
  if (!isProxied && (isLocalUrl(frameSrc) || frameSrc === 'about:blank' || frameSrc.startsWith('blob:'))) {
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads'
    );
  } else {
    iframe.removeAttribute('sandbox');
  }
}

async function loadUrlIntoTab(tab, rawUrl, opts = {}) {
  clearSlowLoadTimer();

  const extMode = getSettings().externalSiteMode || 'proxy';
tab.useChromium = extMode === 'chromium' || !!opts.useChromium;

  
  const displayUrl = normalizeUrl(rawUrl);
  if (opts.pushHistory !== false) {
    pushTabHistory(tab, displayUrl);
  }

  tab.url = displayUrl;
  tab.devtools = false;
  tab.useChromium = !!opts.useChromium;

  if (displayUrl === 'about:blank') {
    tab.loading = false;
    tab.title = 'New tab';
    tab.favicon = null;
    applyFramePolicy(tab.iframe, 'about:blank');
    tab.iframe.src = 'about:blank';
    emit();
    return;
  }

  tab.loading = true;
  if (!tab.pinTitle) tab.title = displayUrl.replace(/^https?:\/\//i, '');
  emit();

  // Start 10-second slow-load timer for external URLs
  armSlowLoadWatcher(tab, displayUrl, tab.useChromium);

  const frameSrc = await resolveFrameSrc(displayUrl, { useChromium: tab.useChromium });
  applyFramePolicy(tab.iframe, frameSrc);
  tab.iframe.src = frameSrc;
  remember(displayUrl, tab.title);
  emit();
}

export function addTab(container, url, title) {
  const id = nextId++;
  const iframe = document.createElement('iframe');
  iframe.className = 'ls-browser-frame';
  iframe.setAttribute('allow', 'fullscreen; clipboard-read; clipboard-write');

  const initialDisplay = url ? normalizeUrl(url) : 'about:blank';

  const tab = {
    id,
    url: initialDisplay,
    title: title || (initialDisplay === 'about:blank' ? 'New tab' : initialDisplay.replace(/^https?:\/\//i, '')),
    iframe,
    loading: initialDisplay !== 'about:blank',
    favicon: null,
    zoom: 100,
    pinTitle: !!title,
    useChromium: false,
    history: [initialDisplay],
    historyIndex: 0,
  };

  container.appendChild(iframe);
  tabs.push(tab);
  tabs.forEach((t) => {
    if (t.iframe) t.iframe.style.display = t.id === id ? 'block' : 'none';
  });
  activeTabId = id;

  iframe.addEventListener('load', () => {
    clearSlowLoadTimer();
    tab.loading = false;
    tab.devtools = false;
    const w = directWin(tab);
    if (w) {
      try {
        const winTarget = w.__LS_PROXY_TARGET__;
        const loc = winTarget || toDisplayUrl(w.location.href);
        if (loc && loc !== 'about:blank') {
          if (loc !== tab.url) {
            tab.url = loc;
            pushTabHistory(tab, loc);
          }
        }
        if (!tab.pinTitle) {
          if (w.document.title) tab.title = w.document.title.slice(0, 60);
          else if (tab.url !== 'about:blank') tab.title = tab.url.replace(/^https?:\/\//, '');
        }
        const link = w.document.querySelector('link[rel~="icon"]');
        if (link?.href) tab.favicon = link.href;
      } catch (_) {}
    } else if (!tab.pinTitle && tab.url !== 'about:blank') {
      tab.title = tab.url.replace(/^https?:\/\//, '');
    }

    if (!tab.favicon && /^https?:/i.test(tab.url)) {
      try {
        tab.favicon = new URL('/favicon.ico', tab.url).href;
      } catch (_) {}
    }
    applyZoom(tab);
    remember(tab.url, tab.title);
    emit();
  });

  if (initialDisplay === 'about:blank') {
    applyFramePolicy(iframe, 'about:blank');
    iframe.src = 'about:blank';
    emit();
  } else {
    loadUrlIntoTab(tab, initialDisplay, { pushHistory: false });
  }

  return tab;
}

export function duplicateActive(container) {
  const t = getActiveTab();
  if (!t) return null;
  return addTab(container, t.url, t.title);
}

export function activateTab(id) {
  if (!tabs.some((t) => t.id === id)) return;
  activeTabId = id;
  tabs.forEach((t) => {
    if (t.iframe) t.iframe.style.display = t.id === id ? 'block' : 'none';
  });
  emit();
}

export function closeTab(id) {
  const idx = tabs.findIndex((t) => t.id === id);
  if (idx < 0) return tabs.length;
  const [t] = tabs.splice(idx, 1);
  if (t.id === activeTabId) clearSlowLoadTimer();
  try {
    t.iframe?.remove();
  } catch (_) {}
  if (activeTabId === id) {
    if (tabs.length) {
      const next = tabs[Math.min(idx, tabs.length - 1)];
      activateTab(next.id);
    } else {
      activeTabId = null;
      emit();
    }
  } else {
    emit();
  }
  return tabs.length;
}

export function closeAllTabs() {
  clearSlowLoadTimer();
  tabs.forEach((t) => {
    try {
      t.iframe?.remove();
    } catch (_) {}
  });
  tabs = [];
  activeTabId = null;
  emit();
}

export function navigateActive(url, opts = {}) {
  const t = getActiveTab();
  if (!t?.iframe) return;
  loadUrlIntoTab(t, url, { pushHistory: true, useChromium: !!opts.useChromium });
}

export function reloadActive() {
  const t = getActiveTab();
  if (!t?.iframe) return;
  if (t.url === 'about:blank') {
    emit();
    return;
  }
  t.loading = true;
  armSlowLoadWatcher(t, t.url, t.useChromium);
  const w = directWin(t);
  let done = false;
  if (w) {
    try {
      w.location.reload();
      done = true;
    } catch (_) {}
  }
  if (!done && !(t.bridge && sendToTab(t, 'reload'))) {
    t.iframe.src = t.iframe.src;
  }
  emit();
}

export function stopActive() {
  clearSlowLoadTimer();
  const t = getActiveTab();
  if (!t?.iframe) return;
  const w = directWin(t);
  if (w) {
    try {
      w.stop();
    } catch (_) {}
  } else sendToTab(t, 'stop');
  t.loading = false;
  emit();
}

export function historyActive(dir) {
  const t = getActiveTab();
  if (!t) return;

  if (dir < 0 && t.historyIndex > 0) {
    t.historyIndex -= 1;
    const prevUrl = t.history[t.historyIndex];
    loadUrlIntoTab(t, prevUrl, { pushHistory: false });
    return;
  }

  if (dir > 0 && t.historyIndex < t.history.length - 1) {
    t.historyIndex += 1;
    const nextUrl = t.history[t.historyIndex];
    loadUrlIntoTab(t, nextUrl, { pushHistory: false });
    return;
  }
}

export function findInActive(q, back) {
  const t = getActiveTab();
  if (!t || !q) return;
  const w = directWin(t);
  if (w) {
    try {
      w.find?.(q, false, !!back, true, false, false, false);
      return;
    } catch (_) {}
  }
  sendToTab(t, 'find', { q, back: !!back });
}

export function printActive() {
  const t = getActiveTab();
  if (!t) return false;
  const w = directWin(t);
  if (w) {
    try {
      w.print();
      return true;
    } catch (_) {}
  }
  return sendToTab(t, 'print');
}

export function toggleDevtoolsActive() {
  const t = getActiveTab();
  if (!t || !t.bridge) return false;
  return sendToTab(t, 'devtools', { on: !t.devtools });
}

export function setZoomActive(pct) {
  const t = getActiveTab();
  if (!t) return 100;
  t.zoom = Math.min(500, Math.max(25, Math.round(pct)));
  applyZoom(t);
  emit();
  return t.zoom;
}

export function renderTabStrip(tabsEl) {
  if (!tabsEl) return;
  tabsEl.innerHTML = '';
  tabs.forEach((t) => {
    const el = document.createElement('div');
    el.className = 'ls-tab' + (t.id === activeTabId ? ' is-active' : '') + (t.loading ? ' is-loading' : '');
    el.setAttribute('role', 'tab');
    el.title = t.title || '';

    const fav = document.createElement('span');
    fav.className = 'ls-fav';
    if (t.loading) {
      fav.classList.add('is-spin');
    } else if (t.favicon) {
      const img = document.createElement('img');
      img.src = t.favicon;
      img.alt = '';
      img.addEventListener('error', () => {
        fav.innerHTML = icon(I.globe, 14);
      });
      fav.appendChild(img);
    } else {
      fav.innerHTML = icon(I.globe, 14);
    }
    el.appendChild(fav);

    const label = document.createElement('span');
    label.className = 'ls-tab-label';
    label.textContent = t.title || 'Tab';
    el.appendChild(label);

    const x = document.createElement('span');
    x.className = 'ls-tab-x';
    x.setAttribute('role', 'button');
    x.title = 'Close tab';
    x.innerHTML = icon(I.close, 12);
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(t.id);
    });
    el.appendChild(x);

    el.addEventListener('click', () => activateTab(t.id));
    tabsEl.appendChild(el);
  });
}