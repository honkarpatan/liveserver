/**
 * Multi-tab state for the in-app browser
 */
import { svgIcon, ICONS } from '../utils/svg.js';

let tabs = [];
let activeTabId = null;
let nextId = 1;
let listeners = [];

export function getTabs() {
  return tabs.slice();
}

export function getActiveTab() {
  return tabs.find((t) => t.id === activeTabId) || null;
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

/**
 * @param {HTMLElement} viewsEl
 * @param {string} url
 */
export function addTab(viewsEl, url, title) {
  const id = nextId++;
  const iframe = document.createElement('iframe');
  iframe.className = 'ls-browser-frame';
  iframe.setAttribute(
    'sandbox',
    'allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox'
  );
  iframe.setAttribute('allow', 'fullscreen');
  iframe.src = url || 'about:blank';
  viewsEl.appendChild(iframe);

  const tab = {
    id,
    url: url || 'about:blank',
    title: title || 'New tab',
    iframe,
    loading: true,
  };
  tabs.push(tab);
  activeTabId = id;

  iframe.addEventListener('load', () => {
    tab.loading = false;
    try {
      const docTitle = iframe.contentDocument?.title;
      if (docTitle) tab.title = docTitle.slice(0, 40);
      const loc = iframe.contentWindow?.location?.href;
      if (loc && loc !== 'about:blank') tab.url = loc;
    } catch (_) {
      /* cross-origin */
    }
    emit();
  });

  emit();
  return tab;
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
  let u = String(url || '').trim();
  if (u && !/^https?:\/\//i.test(u) && u !== 'about:blank') u = 'http://' + u;
  t.url = u;
  t.loading = true;
  t.iframe.src = u;
  emit();
}

export function reloadActive() {
  const t = getActiveTab();
  if (!t?.iframe) return;
  t.loading = true;
  try {
    t.iframe.contentWindow?.location?.reload();
  } catch (_) {
    t.iframe.src = t.iframe.src;
  }
  emit();
}

export function historyActive(dir) {
  const t = getActiveTab();
  try {
    if (dir < 0) t?.iframe?.contentWindow?.history.back();
    else t?.iframe?.contentWindow?.history.forward();
  } catch (_) {}
}

/** Render tab strip into container */
export function renderTabStrip(tabsEl) {
  if (!tabsEl) return;
  tabsEl.innerHTML = '';
  tabs.forEach((t) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ls-tab' + (t.id === activeTabId ? ' is-active' : '') + (t.loading ? ' is-loading' : '');
    const label = document.createElement('span');
    label.className = 'ls-tab-label';
    label.textContent = t.title || 'Tab';
    el.appendChild(label);
    const x = document.createElement('span');
    x.className = 'ls-tab-x';
    x.setAttribute('role', 'button');
    x.innerHTML = svgIcon(ICONS.close, 12);
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(t.id);
    });
    el.appendChild(x);
    el.addEventListener('click', () => activateTab(t.id));
    tabsEl.appendChild(el);
  });
}
