/**
 * Reusable in-app browser shell (Chromium-like).
 * Modes: inPage (default) | editorTab
 */
import { getSettings } from '../core/settings.js';
import { ICONS, svgIcon } from '../utils/svg.js';
import { injectBrowserStyles } from './styles.js';
import {
  addTab,
  activateTab,
  closeTab,
  closeAllTabs,
  navigateActive,
  reloadActive,
  historyActive,
  renderTabStrip,
  getActiveTab,
  getTabs,
  onTabsChange,
} from './tabManager.js';
import { openBrowserMenu } from './menu.js';
import { setFullscreen, exitFullscreen } from './fullscreen.js';
import { openEditorTabHost, closeEditorTabHost, getEditorTabBody } from './editorTab.js';

let shellEl = null;
let unsubTabs = null;

function mode() {
  return getSettings().browserDisplayMode === 'editorTab' ? 'editorTab' : 'inPage';
}

function wireChrome(wrap) {
  const tabsEl = wrap.querySelector('.ls-browser-tabs');
  const viewsEl = wrap.querySelector('.ls-browser-views');
  const urlInput = wrap.querySelector('.ls-browser-url');

  const syncUrl = () => {
    const t = getActiveTab();
    if (urlInput) urlInput.value = t?.url || '';
  };

  unsubTabs?.();
  unsubTabs = onTabsChange(() => {
    renderTabStrip(tabsEl);
    syncUrl();
    // hide shell if no tabs (in-page only)
    if (!getTabs().length && mode() === 'inPage') {
      hideBrowser();
    }
  });

  wrap.querySelector('.ls-tab-new')?.addEventListener('click', () => {
    const u = urlInput?.value?.trim() || 'about:blank';
    addTab(viewsEl, u);
    activateTab(getActiveTab()?.id);
  });
  wrap.querySelector('.ls-close-btn')?.addEventListener('click', () => hideBrowser());
  wrap.querySelector('.ls-reload')?.addEventListener('click', () => reloadActive());
  wrap.querySelector('.ls-back')?.addEventListener('click', () => historyActive(-1));
  wrap.querySelector('.ls-fwd')?.addEventListener('click', () => historyActive(1));
  wrap.querySelector('.ls-fs-btn')?.addEventListener('click', () => setFullscreen(wrap));
  wrap.querySelector('.ls-menu-btn')?.addEventListener('click', () => {
    openBrowserMenu({
      reload: () => reloadActive(),
      back: () => historyActive(-1),
      forward: () => historyActive(1),
      newTab: () => {
        addTab(viewsEl, urlInput?.value || 'about:blank');
      },
      closeTab: () => {
        const t = getActiveTab();
        if (t) closeTab(t.id);
      },
      closeOtherTabs: () => {
        const cur = getActiveTab();
        getTabs()
          .filter((t) => t.id !== cur?.id)
          .forEach((t) => closeTab(t.id));
      },
      toggleFullscreen: () => setFullscreen(wrap),
      closeBrowser: () => hideBrowser(),
      getUrl: () => getActiveTab()?.url || '',
      navigate: (u) => navigateActive(u),
      setViewport: (kind) => {
        viewsEl?.classList.toggle('is-mobile', kind === 'mobile');
      },
    });
  });

  urlInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      navigateActive(urlInput.value);
    }
  });

  wrap._lsViews = viewsEl;
  wrap._lsTabsEl = tabsEl;
  return wrap;
}

function createChrome() {
  injectBrowserStyles();
  const wrap = document.createElement('div');
  wrap.id = 'ls-browser-shell';
  wrap.className = 'ls-browser-shell';
  wrap.innerHTML = `
    <div class="ls-browser-top">
      <div class="ls-browser-tabs"></div>
      <button type="button" class="ls-browser-iconbtn ls-tab-new" title="New tab">${svgIcon(ICONS.globe, 16)}</button>
      <button type="button" class="ls-browser-iconbtn ls-fs-btn" title="Fullscreen">${svgIcon('M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm16 0v6h-6v-2h4v-4h2z', 16)}</button>
      <button type="button" class="ls-browser-iconbtn ls-close-btn" title="Close">${svgIcon(ICONS.close, 16)}</button>
    </div>
    <div class="ls-browser-bar">
      <button type="button" class="ls-browser-iconbtn ls-back" title="Back">${svgIcon('M15 18l-6-6 6-6', 16)}</button>
      <button type="button" class="ls-browser-iconbtn ls-fwd" title="Forward">${svgIcon('M9 18l6-6-6-6', 16)}</button>
      <button type="button" class="ls-browser-iconbtn ls-reload" title="Reload">${svgIcon(ICONS.refresh, 16)}</button>
      <input class="ls-browser-url" type="text" spellcheck="false" placeholder="http://" />
      <button type="button" class="ls-browser-iconbtn ls-menu-btn" title="Menu">${svgIcon(ICONS.settings, 16)}</button>
    </div>
    <div class="ls-browser-views"></div>
  `;
  return wireChrome(wrap);
}

async function mountShell() {
  if (shellEl && document.body.contains(shellEl)) return shellEl;

  if (mode() === 'editorTab') {
    const host = await openEditorTabHost('Live Preview');
    shellEl = createChrome();
    shellEl.classList.add('is-open');
    if (host?.body) {
      host.body.appendChild(shellEl);
    } else {
      // fallback in-page
      closeEditorTabHost();
      document.body.appendChild(shellEl);
    }
  } else {
    closeEditorTabHost();
    shellEl = createChrome();
    document.body.appendChild(shellEl);
  }
  return shellEl;
}

export async function openBrowser(url) {
  const u = url || 'about:blank';
  const shell = await mountShell();
  shell.classList.add('is-open');
  // reuse empty active tab if about:blank only tab
  const existing = getActiveTab();
  if (existing && existing.url === 'about:blank' && getTabs().length === 1) {
    navigateActive(u);
  } else if (!getTabs().length) {
    addTab(shell._lsViews, u);
  } else {
    addTab(shell._lsViews, u);
  }
  requestAnimationFrame(() => shell.classList.add('is-open'));
}

export function hideBrowser() {
  closeAllTabs();
  exitFullscreen(shellEl);
  unsubTabs?.();
  unsubTabs = null;
  try {
    shellEl?.remove();
  } catch (_) {}
  shellEl = null;
  closeEditorTabHost();
  document.body.classList.remove('ls-browser-fs');
}

export function createBrowserShell(options = {}) {
  return {
    open: (url) => openBrowser(url || options.initialUrl),
    addTab: (url) => openBrowser(url),
    setFullscreen: (on) => setFullscreen(shellEl, on),
    dispose: hideBrowser,
    getMode: mode,
  };
}

export { openBrowserMenu };
