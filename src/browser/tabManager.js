/**
 * Multi-tab state for the in-app browser (Chrome-style tabs)
 */
import { icon, I } from './icons.js';
import { loadDevtoolCode } from './devtool.js';
import { getSettings } from '../core/settings.js';

const toast = acode.require('toast');

let tabs = [];
let activeTabId = null;
let nextId = 1;
let listeners = [];
let visited = []; // [{url,title,ts}] newest first (session history)

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
  if (!url || url === 'about:blank' || url.startsWith('blob:')) return;
  visited = visited.filter((v) => v.url !== url);
  visited.unshift({ url, title: title || url.replace(/^https?:\/\//i, ''), ts: Date.now() });
  if (visited.length > 50) visited.length = 50;
}

export function isLocalUrl(url) {
  return /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0|192\.168\.|10\.)/i.test(String(url || ''));
}

export function normalizeUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return 'about:blank';
  if (/^(about:|blob:|data:|https?:\/\/)/i.test(u)) return u;

  // localhost or IP address (e.g. 127.0.0.1:8080, localhost:3000)
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/.*)?$/i.test(u)) {
    return 'http://' + u;
  }

  // Domain-like input without spaces (e.g. google.com, github.com/user)
  if (!/\s/.test(u) && /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(u)) {
    return 'https://' + u;
  }

  // Otherwise treat as search query (e.g. "google", "css grid")
  const engine = getSettings().browserSearchEngine || 'google';
  const q = encodeURIComponent(u);
  if (engine === 'duckduckgo') return `https://duckduckgo.com/?q=${q}`;
  if (engine === 'bing') return `https://www.bing.com/search?q=${q}`;
  if (engine === 'brave') return `https://search.brave.com/search?q=${q}`;
  return `https://www.google.com/search?q=${q}`;
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

function onBridgeMessage(ev) {
  const d = ev.data;
  if (!d || d.ls !== 1) return;
  const tab = findTab(ev.source);
  if (!tab) return;
  tab.bridge = true;

  if (d.type === 'meta') {
    tab.loading = false;
    if (d.href && d.href !== 'about:blank') tab.url = d.href;
    if (!tab.pinTitle) tab.title = String(d.title || tab.url.replace(/^https?:\/\//, '')).slice(0, 60);
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
  window.removeEventListener('message', onBridgeMessage);
}

function applyFramePolicy(iframe, url) {
  // Apply sandbox only for local Live Server pages; external sites like Google break under sandbox
  if (isLocalUrl(url) || url === 'about:blank' || url.startsWith('blob:')) {
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads'
    );
  } else {
    iframe.removeAttribute('sandbox');
  }
}

export function addTab(container, url, title) {
  const id = nextId++;
  const iframe = document.createElement('iframe');
  iframe.className = 'ls-browser-frame';
  iframe.setAttribute('allow', 'fullscreen; clipboard-read; clipboard-write; geolocation; camera; microphone');

  const startUrl = url ? normalizeUrl(url) : 'about:blank';
  applyFramePolicy(iframe, startUrl);
  iframe.src = startUrl;
  container.appendChild(iframe);

  const tab = {
    id,
    url: startUrl,
    title: title || (startUrl === 'about:blank' ? 'New tab' : startUrl.replace(/^https?:\/\//i, '')),
    iframe,
    loading: startUrl !== 'about:blank',
    favicon: null,
    zoom: 100,
    pinTitle: !!title,
  };
  tabs.push(tab);
  tabs.forEach((t) => {
    if (t.iframe) t.iframe.style.display = t.id === id ? 'block' : 'none';
  });
  activeTabId = id;

  if (startUrl !== 'about:blank') {
    remember(startUrl, tab.title);
  }

  iframe.addEventListener('load', () => {
    tab.loading = false;
    tab.devtools = false;
    const w = directWin(tab);
    if (w) {
      try {
        const loc = w.location.href;
        if (loc && loc !== 'about:blank') tab.url = loc;
        if (!tab.pinTitle) {
          if (w.document.title) tab.title = w.document.title.slice(0, 60);
          else if (tab.url !== 'about:blank') tab.title = tab.url.replace(/^https?:\/\//, '');
        }
        const link = w.document.querySelector('link[rel~="icon"]');
        if (link?.href) tab.favicon = link.href;
      } catch (_) {}
    } else if (!tab.pinTitle && tab.url !== 'about:blank' && (!tab.title || tab.title === startUrl)) {
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

  emit();
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
  tabs.forEach((t) => {
    try {
      t.iframe?.remove();
    } catch (_) {}
  });
  tabs = [];
  activeTabId = null;
  emit();
}

export function navigateActive(url) {
  const t = getActiveTab();
  if (!t?.iframe) return;
  const u = normalizeUrl(url);
  t.url = u;
  t.loading = u !== 'about:blank';
  t.title = u === 'about:blank' ? 'New tab' : u.replace(/^https?:\/\//i, '');
  applyFramePolicy(t.iframe, u);
  t.iframe.src = u;
  if (u !== 'about:blank') remember(u, t.title);
  emit();
}

export function reloadActive() {
  const t = getActiveTab();
  if (!t?.iframe) return;
  t.loading = true;
  const w = directWin(t);
  let done = false;
  if (w) {
    try {
      w.location.reload();
      done = true;
    } catch (_) {}
  }
  if (!done && !(t.bridge && sendToTab(t, 'reload'))) t.iframe.src = t.url || t.iframe.src;
  emit();
}

export function stopActive() {
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
  const w = directWin(t);
  if (w) {
    try {
      dir < 0 ? w.history.back() : w.history.forward();
      return;
    } catch (_) {}
  }
  sendToTab(t, 'history', { dir });
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