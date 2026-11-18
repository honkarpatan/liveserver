/**
 * Multi-tab state for the in-app browser:
 *  - Per-tab BFCache Frame Deck (up to 6 live cached iframes per tab) so Back/Forward is 0ms instant without reloading!
 *  - Step-by-step history tracking (Google Home -> Google Search -> External Site -> Internal Links)
 *  - Hybrid Routing:
 *      1. Google / Google Search / Google Images -> Turbo Engine (fetchViaCordovaTurbo)
 *      2. YouTube / Vimeo / Dailymotion / Official Embeds -> Turbo Embed Player
 *      3. All other external websites (e.g. clicked from Google results, adult sites, blogs) -> Node Reverse Proxy (/__proxy)
 */
import { icon, I } from './icons.js';
import { loadDevtoolCode } from './devtool.js';
import { getSettings } from '../core/settings.js';
import { ensureProxyServer } from '../server/process.js';
import { getServerStatus } from '../server/status.js';
import { ZoomHandler } from './zoomHandler.js';
import {
  TURBO_IFRAME_ALLOW,
  isGoogleUrl,
  unwrapGoogleRedirectUrl,
  generateEmbedUrl,
  fetchViaCordovaTurbo,
  destroyTurboWebview,
} from './turboProxy.js';

const toast = acode.require('toast');

const MAX_BFCACHE_FRAMES_PER_TAB = 6;

let tabs = [];
let activeTabId = null;
let nextId = 1;
let listeners = [];
let visited = [];
let loadGuardTimer = null;

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
  if (!clean || clean === 'about:blank' || clean.startsWith('blob:') || clean.startsWith('view-source:')) return;
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
  if (!s || s === 'about:srcdoc') return 'about:blank';
  const marker = '/__proxy?url=';
  const idx = s.indexOf(marker);
  if (idx !== -1) {
    try {
      const encoded = s.slice(idx + marker.length).split('&')[0];
      return unwrapGoogleRedirectUrl(decodeURIComponent(encoded));
    } catch (_) {}
  }
  return unwrapGoogleRedirectUrl(s);
}

export function normalizeUrl(raw) {
  let u = toDisplayUrl(raw);
  if (!u || u === 'about:blank') return 'about:blank';
  if (/^(about:|blob:|data:|view-source:|https?:\/\/)/i.test(u)) return u;

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

export function sendToTab(tab, cmd, extra) {
  try {
    tab?.iframe?.contentWindow?.postMessage({ ls: 1, cmd, ...(extra || {}) }, '*');
    return true;
  } catch (_) {
    return false;
  }
}

function directWin(tab) {
  try {
    const w = tab?.iframe?.contentWindow;
    void w.document;
    return w;
  } catch (_) {
    return null;
  }
}

export function applyZoom(tab) {
  if (!tab) return;
  const pct = tab.zoom || 100;
  const factor = pct / 100;
  try {
    if (tab.iframe) {
      tab.iframe.style.zoom = String(factor);
      tab.iframe.style.transformOrigin = '0 0';
    }
  } catch (_) {}
  const w = directWin(tab);
  if (w) {
    try {
      w.document.documentElement.style.zoom = String(factor);
    } catch (_) {}
  }
  sendToTab(tab, 'zoom', { pct });
}

function findTabAndEntryBySource(source) {
  for (const t of tabs) {
    for (let i = 0; i < t.history.length; i++) {
      const entry = t.history[i];
      try {
        if (entry?.iframe?.contentWindow === source) {
          return { tab: t, entry, index: i };
        }
      } catch (_) {}
    }
  }
  return null;
}

function clearLoadGuard() {
  if (loadGuardTimer) {
    clearTimeout(loadGuardTimer);
    loadGuardTimer = null;
  }
}

function applyFramePolicy(iframe) {
  const s = getSettings();
  if (s.frameSandboxing === true) {
    iframe.setAttribute(
      'sandbox',
      'allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts'
    );
  } else {
    iframe.removeAttribute('sandbox');
  }
}

function createHistoryFrame(tab, entry) {
  const iframe = document.createElement('iframe');
  iframe.className = 'ls-browser-frame';
  iframe.setAttribute('allow', TURBO_IFRAME_ALLOW);
  iframe.allowFullscreen = true;
  applyFramePolicy(iframe);

  entry.iframe = iframe;
  try {
    entry.zoomHandler?.destroy?.();
    entry.zoomHandler = new ZoomHandler(iframe);
  } catch (_) {}

  tab.container.appendChild(iframe);

  iframe.addEventListener('load', () => {
    if (tab.history[tab.historyIndex] === entry) {
      clearLoadGuard();
      tab.loading = false;
    }
    entry.loaded = true;
    const w = (() => {
      try {
        const win = iframe.contentWindow;
        void win.document;
        return win;
      } catch (_) {
        return null;
      }
    })();

    if (w) {
      try {
        const winTarget = w.__LS_PROXY_TARGET__;
        const rawHref = w.location.href;
        const loc = winTarget || (rawHref !== 'about:srcdoc' ? toDisplayUrl(rawHref) : entry.url);
        if (loc && loc !== 'about:blank' && loc !== 'about:srcdoc') {
          entry.url = loc;
          if (tab.history[tab.historyIndex] === entry) {
            tab.url = loc;
          }
        }
        if (!tab.pinTitle) {
          if (w.document.title) {
            entry.title = w.document.title.slice(0, 60);
          } else if (entry.url !== 'about:blank') {
            entry.title = entry.url.replace(/^https?:\/\//, '');
          }
          if (tab.history[tab.historyIndex] === entry) {
            tab.title = entry.title;
          }
        }
        const link = w.document.querySelector('link[rel~="icon"]');
        if (link?.href) {
          entry.favicon = link.href;
          if (tab.history[tab.historyIndex] === entry) tab.favicon = link.href;
        }
      } catch (_) {}
    }

    if (!entry.favicon && /^https?:/i.test(entry.url)) {
      try {
        const host = new URL(entry.url).hostname;
        entry.favicon = isLocalUrl(entry.url)
          ? new URL('/favicon.ico', entry.url).href
          : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
        if (tab.history[tab.historyIndex] === entry) tab.favicon = entry.favicon;
      } catch (_) {}
    }

    if (tab.history[tab.historyIndex] === entry) {
      applyZoom(tab);
      remember(entry.url, entry.title);
      emit();
    }
  });

  return iframe;
}

/**
 * Syncs visibility across all tabs and their BFCache history frames,
 * and prunes frames far from historyIndex so memory stays light.
 */
function syncVisibleFrames() {
  tabs.forEach((t) => {
    const isTabActive = t.id === activeTabId;
    t.history.forEach((entry, idx) => {
      const isCurrentEntry = idx === t.historyIndex;
      if (isCurrentEntry && entry.iframe) {
        t.iframe = entry.iframe;
      }
      // Prune distant frames beyond BFCache window (keep entry metadata for re-creation if needed)
      if (!isCurrentEntry && Math.abs(idx - t.historyIndex) >= MAX_BFCACHE_FRAMES_PER_TAB && entry.iframe) {
        try {
          entry.zoomHandler?.destroy?.();
          entry.iframe.remove();
        } catch (_) {}
        entry.iframe = null;
        entry.loaded = false;
      }
      if (entry.iframe) {
        entry.iframe.style.display = isTabActive && isCurrentEntry ? 'block' : 'none';
      }
    });
  });
}

function onBridgeMessage(ev) {
  const d = ev.data;
  if (!d || d.ls !== 1) return;
  const hit = findTabAndEntryBySource(ev.source);
  if (!hit) return;
  const { tab, entry, index } = hit;
  tab.bridge = true;

  // Link click or form submit inside Turbo or Node Proxy page -> push new history step!
  if (d.type === 'navigate' && d.href) {
    if (d.reload) {
      loadEntryContent(tab, entry, d.href, { forceReload: true });
    } else {
      navigateTabTo(tab, d.href);
    }
    return;
  }

  if (d.type === 'meta') {
    const isCurrent = index === tab.historyIndex;
    if (isCurrent) {
      clearLoadGuard();
      tab.loading = false;
    }
    entry.loaded = true;

    if (d.href && d.href !== 'about:blank' && d.href !== 'about:srcdoc') {
      const cleanHref = toDisplayUrl(d.href);
      // If an in-frame redirect or SPA pushState changed the URL inside the current frame
      if (cleanHref && cleanHref !== entry.url) {
        entry.url = cleanHref;
        if (isCurrent) tab.url = cleanHref;
      }
    }
    if (!tab.pinTitle && d.title) {
      entry.title = String(d.title).slice(0, 60);
      if (isCurrent) tab.title = entry.title;
    }
    if (d.favicon) {
      entry.favicon = d.favicon;
      if (isCurrent) tab.favicon = d.favicon;
    }
    if (isCurrent) {
      if ((tab.zoom || 100) !== 100) sendToTab(tab, 'zoom', { pct: tab.zoom });
      remember(entry.url, entry.title);
      emit();
    }
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
  clearLoadGuard();
  window.removeEventListener('message', onBridgeMessage);
  destroyTurboWebview();
}

function clearIframeSrcdoc(iframe) {
  try {
    if (iframe.hasAttribute('srcdoc')) {
      iframe.removeAttribute('srcdoc');
    }
  } catch (_) {}
}

/**
 * Loads `displayUrl` into a specific history `entry` (creating its iframe if needed).
 * Routing rules:
 *  - Local Live Server files -> direct iframe
 *  - Official video/code embeds (YouTube, Vimeo, Dailymotion, CodePen, etc.) -> direct embed URL
 *  - Google / Google Search / Google Images -> Turbo Engine (Cordova Native HTTP Scraper)
 *  - All other websites (e.g. PokemonDB clicked from Google, adult sites, blogs) -> Node Reverse Proxy (/__proxy)
 */
async function loadEntryContent(tab, entry, rawUrl, opts = {}) {
  clearLoadGuard();
  const displayUrl = normalizeUrl(rawUrl);
  entry.url = displayUrl;
  entry.title = displayUrl === 'about:blank' ? 'New tab' : displayUrl.replace(/^https?:\/\//i, '');

  const iframe = entry.iframe || createHistoryFrame(tab, entry);
  tab.iframe = iframe;
  tab.url = displayUrl;
  tab.title = entry.title;
  tab.devtools = false;
  syncVisibleFrames();

  if (displayUrl === 'about:blank') {
    tab.loading = false;
    tab.favicon = null;
    entry.loaded = true;
    clearIframeSrcdoc(iframe);
    iframe.src = 'about:blank';
    emit();
    return;
  }

  tab.loading = true;
  try {
    const host = new URL(displayUrl).hostname;
    if (host && !isLocalUrl(displayUrl)) {
      entry.favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
      tab.favicon = entry.favicon;
    }
  } catch (_) {}
  emit();

  loadGuardTimer = setTimeout(() => {
    if (tab.loading) {
      tab.loading = false;
      emit();
    }
  }, 9000);

  // 1. Local Live Server files (127.0.0.1 / localhost)
  if (isLocalUrl(displayUrl) || displayUrl.startsWith('blob:')) {
    clearIframeSrcdoc(iframe);
    iframe.src = displayUrl;
    remember(displayUrl, tab.title);
    emit();
    return;
  }

  const extMode = getSettings().externalSiteMode || 'proxy';
  if (extMode === 'inApp') {
    clearIframeSrcdoc(iframe);
    iframe.src = displayUrl;
    remember(displayUrl, tab.title);
    emit();
    return;
  }

  // 2. Official Video / Code Playground Embeds (YouTube, Shorts, Vimeo, Dailymotion, CodePen, TikTok, Spotify)
  const embedUrl = generateEmbedUrl(displayUrl);
  if (embedUrl) {
    clearIframeSrcdoc(iframe);
    iframe.src = embedUrl;
    remember(displayUrl, tab.title);
    emit();
    return;
  }

  // 3. Google / Google Search / Google Images -> Run via TURBO Engine!
  if (isGoogleUrl(displayUrl)) {
    const turboRes = await fetchViaCordovaTurbo(displayUrl, { forceReload: !!opts.forceReload });
    if (turboRes.ok && turboRes.html) {
      if (turboRes.finalUrl) {
        entry.url = toDisplayUrl(turboRes.finalUrl);
        tab.url = entry.url;
      }
      iframe.removeAttribute('src');
      iframe.srcdoc = turboRes.html;
      remember(tab.url, tab.title);
      emit();
      return;
    }
  }

  // 4. All other websites (PokemonDB, external sites clicked from Google, adult sites, etc.) -> Node Reverse Proxy (/__proxy)
  const st = getServerStatus();
  const port = st.running && st.port ? st.port : await ensureProxyServer();
  clearIframeSrcdoc(iframe);
  if (port) {
    const cacheBust = opts.forceReload ? `&_t=${Date.now()}` : '';
    iframe.src = `http://127.0.0.1:${port}/__proxy?url=${encodeURIComponent(displayUrl)}${cacheBust}`;
  } else {
    iframe.src = displayUrl;
  }
  remember(displayUrl, tab.title);
  emit();
}

/**
 * Navigates `tab` to a new URL, pushing a new entry onto `tab.history`
 * while keeping the previous entry's iframe alive in the BFCache deck!
 */
function navigateTabTo(tab, rawUrl, opts = {}) {
  const displayUrl = normalizeUrl(rawUrl);
  const currentEntry = tab.history[tab.historyIndex];

  // If currently on an empty about:blank tab and navigating to the first real URL, replace the blank slot
  if (
    currentEntry &&
    currentEntry.url === 'about:blank' &&
    displayUrl !== 'about:blank' &&
    tab.history.length === 1
  ) {
    return loadEntryContent(tab, currentEntry, displayUrl, opts);
  }

  // If navigating to the exact same URL as current entry, just reload or ignore
  if (currentEntry && currentEntry.url === displayUrl) {
    if (opts.forceReload) {
      return loadEntryContent(tab, currentEntry, displayUrl, { forceReload: true });
    }
    return;
  }

  // Remove any forward history entries beyond historyIndex and dispose their iframes
  if (tab.historyIndex < tab.history.length - 1) {
    const discarded = tab.history.splice(tab.historyIndex + 1);
    discarded.forEach((old) => {
      try {
        old.zoomHandler?.destroy?.();
        old.iframe?.remove();
      } catch (_) {}
    });
  }

  const newEntry = {
    url: displayUrl,
    title: displayUrl === 'about:blank' ? 'New tab' : displayUrl.replace(/^https?:\/\//i, ''),
    favicon: null,
    iframe: null,
    zoomHandler: null,
    loaded: false,
  };

  tab.history.push(newEntry);
  tab.historyIndex = tab.history.length - 1;

  loadEntryContent(tab, newEntry, displayUrl, opts);
}

export function addTab(container, url, title) {
  const id = nextId++;
  const initialDisplay = url ? normalizeUrl(url) : 'about:blank';

  const initialEntry = {
    url: initialDisplay,
    title: title || (initialDisplay === 'about:blank' ? 'New tab' : initialDisplay.replace(/^https?:\/\//i, '')),
    favicon: null,
    iframe: null,
    zoomHandler: null,
    loaded: false,
  };

  const tab = {
    id,
    container,
    url: initialDisplay,
    title: initialEntry.title,
    iframe: null,
    loading: initialDisplay !== 'about:blank',
    favicon: null,
    zoom: 100,
    pinTitle: !!title,
    history: [initialEntry],
    historyIndex: 0,
  };

  tabs.push(tab);
  activeTabId = id;

  createHistoryFrame(tab, initialEntry);
  loadEntryContent(tab, initialEntry, initialDisplay);

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
  syncVisibleFrames();
  emit();
}

export function closeTab(id) {
  const idx = tabs.findIndex((t) => t.id === id);
  if (idx < 0) return tabs.length;
  const [t] = tabs.splice(idx, 1);
  if (t.id === activeTabId) clearLoadGuard();
  t.history.forEach((entry) => {
    try {
      entry.zoomHandler?.destroy?.();
      entry.iframe?.remove();
    } catch (_) {}
  });
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
  clearLoadGuard();
  tabs.forEach((t) => {
    t.history.forEach((entry) => {
      try {
        entry.zoomHandler?.destroy?.();
        entry.iframe?.remove();
      } catch (_) {}
    });
  });
  tabs = [];
  activeTabId = null;
  emit();
}

export function navigateActive(url, opts = {}) {
  const t = getActiveTab();
  if (!t) return;
  navigateTabTo(t, url, opts);
}

export function reloadActive() {
  const t = getActiveTab();
  if (!t) return;
  const currentEntry = t.history[t.historyIndex];
  if (!currentEntry || currentEntry.url === 'about:blank') {
    emit();
    return;
  }
  loadEntryContent(t, currentEntry, currentEntry.url, { forceReload: true });
}

export function stopActive() {
  clearLoadGuard();
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

/**
 * Step-by-step Back / Forward with Instant BFCache Frame Restoration!
 * If the target history entry still has its cached iframe in the deck, it switches
 * visibility in 0ms without any network reload!
 */
export function historyActive(dir) {
  const t = getActiveTab();
  if (!t) return;

  let nextIdx = t.historyIndex;
  if (dir < 0 && t.historyIndex > 0) {
    nextIdx = t.historyIndex - 1;
  } else if (dir > 0 && t.historyIndex < t.history.length - 1) {
    nextIdx = t.historyIndex + 1;
  } else {
    return;
  }

  clearLoadGuard();
  t.historyIndex = nextIdx;
  const targetEntry = t.history[nextIdx];

  t.url = targetEntry.url;
  t.title = targetEntry.title || (targetEntry.url === 'about:blank' ? 'New tab' : targetEntry.url);
  t.favicon = targetEntry.favicon || null;
  t.loading = false;

  // Instant BFCache hit: iframe is already alive in DOM!
  if (targetEntry.iframe && targetEntry.loaded) {
    t.iframe = targetEntry.iframe;
    syncVisibleFrames();
    applyZoom(t);
    emit();
    return;
  }

  // Fallback if frame was pruned after 6+ steps: recreate & load from cache
  loadEntryContent(t, targetEntry, targetEntry.url, { forceReload: false });
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

/** Open a static HTML srcdoc tab (e.g. view-source) without network load hang */
export function addSourceTab(container, title, htmlSrcdoc) {
  const tab = addTab(container, 'about:blank', title || 'view-source');
  const entry = tab.history[tab.historyIndex];
  tab.pinTitle = true;
  tab.loading = false;
  tab.url = title || 'view-source';
  entry.url = tab.url;
  entry.title = tab.title;
  entry.loaded = true;
  try {
    tab.iframe.removeAttribute('sandbox');
  } catch (_) {}
  try {
    tab.iframe.srcdoc = htmlSrcdoc;
  } catch (e) {
    const blob = new Blob([htmlSrcdoc], { type: 'text/html;charset=utf-8' });
    tab.iframe.src = URL.createObjectURL(blob);
  }
  tab.loading = false;
  emit();
  return tab;
}