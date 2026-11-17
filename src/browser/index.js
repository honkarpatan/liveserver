/**
 * In-app browser — desktop Chrome look with Mozilla Firefox-inspired Green Fox Homepage.
 */
import { getSettings, updateSetting } from '../core/settings.js';
import { getActiveFile } from '../utils/paths.js';
import { icon, I } from './icons.js';
import { detectTheme } from './theme.js';
import { BROWSER_CSS, injectBrowserStyles } from './styles.js';
import {
  addTab,
  activateTab,
  closeTab,
  closeAllTabs,
  duplicateActive,
  navigateActive,
  reloadActive,
  stopActive,
  historyActive,
  findInActive,
  printActive,
  toggleDevtoolsActive,
  initBridge,
  disposeBridge,
  setZoomActive,
  renderTabStrip,
  getActiveTab,
  getTabs,
  getVisited,
  clearVisited,
  onTabsChange,
  normalizeUrl,
  isLocalUrl,
  canGoBack,
  canGoForward,
} from './tabManager.js';
import { openBrowserMenu } from './menu.js';
import { closeDropdown, isDropdownOpen } from './dropdown.js';
import { openOpacityPanel, clampOpacity } from './appearance.js';
import { createDeviceMode } from './deviceMode.js';
import { setFullscreen, exitFullscreen } from './fullscreen.js';
import { mountInPage } from './pageHost.js';
import { mountInEditorTab } from './editorTab.js';
import { openInAcodeWebview } from './nativeWebview.js';

const toast = acode.require('toast');

const FOX_LOGO_URL = 'https://i.postimg.cc/WpYPQ47b/green-fox.png';
const ZOOM_STOPS = [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500];
const WEB_FILE = /\.(html?|css|js|mjs|json|svg|xml|txt|md)$/i;
const WATCHED_KEYS = ['browserOpacity', 'browserOverlay', 'overlayAutoSave', 'showAddressBar'];

let shellEl = null;
let host = null;
let hostKind = 'page';
let unsubTabs = null;
let mounting = null;
let closing = false;
let deviceMode = null;
let settingsListener = null;
let autoSaveHandler = null;
let autoSaveTimer = null;

function mode() {
  return getSettings().browserDisplayMode === 'editorTab' ? 'editorTab' : 'inPage';
}

function sameOrigin(a, b) {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch (_) {
    return false;
  }
}

function bookmarks() {
  const b = getSettings().browserBookmarks;
  return Array.isArray(b) ? b : [];
}

async function serverRootUrl() {
  const { getServerStatus } = await import('../server/status.js');
  const st = getServerStatus();
  if (st.url) return st.url.replace(/\/[^/]*$/, '/');
  if (st.port) return 'http://127.0.0.1:' + st.port + '/';
  return null;
}

function openUrlInSystemBrowser(u) {
  if (!u || u === 'about:blank') return;
  try {
    if (window.cordova?.InAppBrowser?.open) {
      window.cordova.InAppBrowser.open(u, '_system');
      return;
    }
    if (window.cordova?.exec) {
      window.cordova.exec(null, null, 'System', 'open-in-browser', [u]);
      return;
    }
    window.open(u, '_blank', 'noopener');
  } catch (_) {
    toast(u, 2500);
  }
}

// ---------------------------------------------------------------- appearance
function enableAutoSave() {
  if (autoSaveHandler || typeof editorManager === 'undefined' || !editorManager?.on) return;
  autoSaveHandler = () => {
    if (getSettings().overlayAutoSave === false) return;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      const f = getActiveFile();
      const name = f?.filename || f?.name || '';
      if (f && f.isUnsaved && (f.uri || f.url) && WEB_FILE.test(name)) {
        try {
          await f.save?.();
        } catch (e) {
          console.warn('[LiveServer] overlay auto-save', e);
        }
      }
    }, 700);
  };
  try {
    editorManager.on('update', autoSaveHandler);
  } catch (_) {}
}

function disableAutoSave() {
  clearTimeout(autoSaveTimer);
  if (autoSaveHandler) {
    try {
      editorManager?.off?.('update', autoSaveHandler);
    } catch (_) {}
  }
  autoSaveHandler = null;
}

function overlayOn() {
  return hostKind === 'page' && !!getSettings().browserOverlay;
}

function applyAppearance() {
  if (!shellEl) return;
  const s = getSettings();
  const op = clampOpacity(s.browserOpacity ?? 1);
  const overlay = overlayOn();
  shellEl.classList.toggle('is-overlay', overlay);
  shellEl.classList.toggle('no-url', s.showAddressBar === false);
  shellEl.style.setProperty('--ls-op', String(op));
  if (hostKind === 'page') {
    host?.setAppearance?.({ overlay, opacity: op });
    shellEl.style.opacity = '';
  } else {
    shellEl.style.opacity = op < 1 ? String(op) : '';
  }
  if (overlay) enableAutoSave();
  else disableAutoSave();
  deviceMode?.layout();
}

function patchAppearance(patch) {
  if ('opacity' in patch) updateSetting('browserOpacity', clampOpacity(patch.opacity));
  if ('overlay' in patch) {
    if (patch.overlay && hostKind !== 'page') {
      toast('Overlay needs the Acode page display mode', 2200);
      return;
    }
    updateSetting('browserOverlay', !!patch.overlay);
  }
  if ('autoSave' in patch) updateSetting('overlayAutoSave', !!patch.autoSave);
  applyAppearance();
}

// ---------------------------------------------------------------- chrome
function wireChrome(wrap) {
  const $ = (sel) => wrap.querySelector(sel);
  const tabsEl = $('.ls-browser-tabs');
  const stage = $('.ls-stage');
  const box = $('.ls-box');
  const device = $('.ls-device');
  const ntp = $('.ls-ntp');
  const backBtn = $('.ls-back');
  const fwdBtn = $('.ls-fwd');
  const urlInput = $('.ls-browser-url');
  const reloadBtn = $('.ls-reload');
  const starBtn = $('.ls-star');
  const siteBtn = $('.ls-site');
  const menuBtn = $('.ls-menu-btn');
  const opBtn = $('.ls-op-btn');
  const devBtn = $('.ls-dev-toggle');
  const find = $('.ls-find');
  const findInput = find.querySelector('input');

  let showAllRecent = false;

  deviceMode = createDeviceMode({
    shell: wrap,
    stage,
    box,
    device,
    bar: $('.ls-devbar'),
    onChange: (st) => updateSetting('browserDevice', st),
  });
  const saved = getSettings().browserDevice;
  if (saved && typeof saved === 'object') deviceMode.setState(saved);

  const focused = () => wrap.getRootNode().activeElement === urlInput;

  const openTargetUrl = async (rawUrl) => {
    if (rawUrl === 'about:blank') {
      navigateActive('about:blank');
      return;
    }
    const target = normalizeUrl(rawUrl);
    if (!target || target === 'about:blank') {
      navigateActive('about:blank');
      return;
    }

    if (!isLocalUrl(target)) {
      const extMode = getSettings().externalSiteMode || 'proxy';
      if (extMode === 'acodeWebview') {
        await openInAcodeWebview(target);
        return;
      }
      if (extMode === 'systemBrowser') {
        openUrlInSystemBrowser(target);
        return;
      }
    }

    // Default ('proxy' for external sites, direct for local sites): loads right inside the browser tab
    navigateActive(target);
  };

  const renderNtp = () => {
    ntp.innerHTML = '';

    // 1. Center-Top Large Firefox-style Green Fox Logo
    const hero = document.createElement('div');
    hero.className = 'ls-ntp-hero';

    const logo = document.createElement('img');
    logo.className = 'ls-ntp-logo';
    logo.src = FOX_LOGO_URL;
    logo.alt = 'Live Server';
    logo.onerror = () => {
      logo.style.display = 'none';
    };
    hero.appendChild(logo);

    const brand = document.createElement('div');
    brand.className = 'ls-ntp-title';
    brand.textContent = 'Live Server';
    hero.appendChild(brand);

    // 2. Search Bar + Search Button
    const searchWrap = document.createElement('div');
    searchWrap.className = 'ls-ntp-search';

    const searchIcon = document.createElement('span');
    searchIcon.className = 'ls-ntp-search-ico';
    searchIcon.innerHTML = icon(I.search, 17);

    const ntpInput = document.createElement('input');
    ntpInput.type = 'text';
    ntpInput.placeholder = 'Search or enter web address';
    ntpInput.setAttribute('spellcheck', 'false');
    ntpInput.setAttribute('autocapitalize', 'off');
    ntpInput.setAttribute('autocomplete', 'off');

    const searchBtn = document.createElement('button');
    searchBtn.type = 'button';
    searchBtn.className = 'ls-ntp-search-btn';
    searchBtn.textContent = 'Search';

    const triggerNtpSearch = () => {
      const q = ntpInput.value.trim();
      if (!q) {
        ntpInput.focus();
        return;
      }
      openTargetUrl(q);
    };

    ntpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerNtpSearch();
    });
    searchBtn.addEventListener('click', triggerNtpSearch);

    searchWrap.append(searchIcon, ntpInput, searchBtn);

    // 3. Round Bookmark Circles
    const tiles = document.createElement('div');
    tiles.className = 'ls-ntp-tiles';

    const mkTile = (name, url, letter, faviconUrl) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ls-ntp-tile';
      b.innerHTML = '<span class="ls-ntp-dot"></span><span class="ls-ntp-name"></span>';
      const dot = b.querySelector('.ls-ntp-dot');
      if (faviconUrl && /^https?:/i.test(faviconUrl) && !isLocalUrl(faviconUrl)) {
        const img = document.createElement('img');
        img.src = faviconUrl;
        img.alt = '';
        img.onerror = () => {
          dot.textContent = letter;
        };
        dot.appendChild(img);
      } else {
        dot.textContent = letter;
      }
      b.querySelector('.ls-ntp-name').textContent = name;
      b.addEventListener('click', async () => {
        const u = typeof url === 'function' ? await url() : url;
        if (!u) return toast('Server not running', 2000);
        openTargetUrl(u);
      });
      return b;
    };

    tiles.appendChild(mkTile('Server root', serverRootUrl, 'S', null));

    bookmarks().forEach((m) => {
      let fav = null;
      try {
        const hostName = new URL(m.url).hostname;
        if (hostName && hostName !== '127.0.0.1' && hostName !== 'localhost') {
          fav = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostName)}&sz=64`;
        }
      } catch (_) {}
      const ch = (m.title || m.url || '?').replace(/^https?:\/\//, '')[0]?.toUpperCase() || 'B';
      tiles.appendChild(mkTile(m.title || m.url, m.url, ch, fav));
    });

    const addTile = document.createElement('button');
    addTile.type = 'button';
    addTile.className = 'ls-ntp-tile';
    addTile.innerHTML = `<span class="ls-ntp-dot">${icon(I.plus, 20)}</span><span class="ls-ntp-name">Add shortcut</span>`;
    addTile.addEventListener('click', async () => {
      const prompt = acode.require('prompt');
      const rawUrl = await prompt('Bookmark URL (e.g. https://duckduckgo.com)', 'https://', 'text');
      if (!rawUrl) return;
      const cleanUrl = normalizeUrl(rawUrl);
      const name = (await prompt('Shortcut name', cleanUrl.replace(/^https?:\/\//, ''), 'text')) || cleanUrl;
      const list = bookmarks();
      updateSetting('browserBookmarks', [...list, { title: name.trim(), url: cleanUrl }]);
      renderNtp();
    });
    tiles.appendChild(addTile);

    // 4. Recent List Below Bookmarks (Max 5 + "More" at end right)
    const recentWrap = document.createElement('div');
    recentWrap.className = 'ls-ntp-recent-wrap';

    const allVisited = getVisited();
    const secHead = document.createElement('div');
    secHead.className = 'ls-ntp-sec-head';

    const secTitle = document.createElement('span');
    secTitle.textContent = 'Recent';
    secHead.appendChild(secTitle);

    if (allVisited.length > 0) {
      const moreBtn = document.createElement('button');
      moreBtn.type = 'button';
      moreBtn.className = 'ls-ntp-more';
      moreBtn.textContent = showAllRecent ? 'Less' : 'More';
      moreBtn.addEventListener('click', () => {
        showAllRecent = !showAllRecent;
        renderNtp();
      });
      secHead.appendChild(moreBtn);
    }
    recentWrap.appendChild(secHead);

    const recentList = document.createElement('div');
    recentList.className = 'ls-ntp-recent-list';
    const visibleItems = showAllRecent ? allVisited : allVisited.slice(0, 5);

    if (!visibleItems.length) {
      const empty = document.createElement('div');
      empty.className = 'ls-ntp-empty';
      empty.textContent = 'No recent pages yet';
      recentList.appendChild(empty);
    } else {
      visibleItems.forEach((item) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'ls-ntp-recent-row';
        const initial = (item.title || item.url || '?').replace(/^https?:\/\//, '')[0]?.toUpperCase() || 'W';
        row.innerHTML = `
          <span class="ls-ntp-recent-ico">${initial}</span>
          <span class="ls-ntp-recent-meta">
            <span class="ls-ntp-recent-title"></span>
            <span class="ls-ntp-recent-url"></span>
          </span>
        `;
        row.querySelector('.ls-ntp-recent-title').textContent = item.title || item.url;
        row.querySelector('.ls-ntp-recent-url').textContent = item.url;
        row.addEventListener('click', () => openTargetUrl(item.url));
        recentList.appendChild(row);
      });
    }
    recentWrap.appendChild(recentList);

    ntp.append(hero, searchWrap, tiles, recentWrap);
  };

  const sync = () => {
    const t = getActiveTab();
    renderTabStrip(tabsEl);
    if (urlInput && !focused()) urlInput.value = t && t.url !== 'about:blank' ? t.url : '';
    wrap.classList.toggle('is-loading', !!t?.loading);
    wrap.classList.toggle('is-installing', document.body.classList.contains('ls-green-loading'));
    reloadBtn.innerHTML = icon(t?.loading ? I.close : I.reload, 18);
    reloadBtn.title = t?.loading ? 'Stop loading' : 'Reload';

    if (backBtn) backBtn.disabled = !canGoBack();
    if (fwdBtn) fwdBtn.disabled = !canGoForward();

    const secure = /^https:/i.test(t?.url || '');
    siteBtn.innerHTML = icon(secure ? I.lock : I.info, 16);
    siteBtn.title = secure ? 'Connection is secure' : 'Not secure';
    const marked = !!t && bookmarks().some((b) => b.url === t.url);
    starBtn.classList.toggle('is-on', marked);

    const blank = !t || t.url === 'about:blank';
    if (blank) renderNtp();
    ntp.classList.toggle('is-on', blank);

    if (!getTabs().length) hideBrowser();
  };

  unsubTabs?.();
  unsubTabs = onTabsChange(sync);

  const toggleFs = () => {
    const on = setFullscreen(wrap);
    host?.onFullscreen?.(on);
  };

  const newTab = () => {
    showAllRecent = false;
    addTab(device, 'about:blank');
    activateTab(getActiveTab()?.id);
  };

  const goHome = () => {
    showAllRecent = false;
    const customHome = String(getSettings().browserHomeUrl || '').trim();
    if (customHome) {
      openTargetUrl(customHome);
    } else {
      navigateActive('about:blank');
    }
  };

  const nextZoom = (cur, dir) => {
    if (dir > 0) return ZOOM_STOPS.find((z) => z > cur) ?? cur;
    return [...ZOOM_STOPS].reverse().find((z) => z < cur) ?? cur;
  };

  const doFind = (back) => findInActive(findInput.value, back);

  const toggleBookmark = () => {
    const t = getActiveTab();
    if (!t || t.url === 'about:blank') return toast('Nothing to bookmark', 1500);
    const list = bookmarks();
    const has = list.some((b) => b.url === t.url);
    updateSetting(
      'browserBookmarks',
      has ? list.filter((b) => b.url !== t.url) : [...list, { title: t.title || t.url, url: t.url }]
    );
    sync();
    toast(has ? 'Bookmark removed' : 'Bookmarked', 1200);
  };

  const openOpacity = () =>
    openOpacityPanel({
      host: wrap,
      anchor: opBtn,
      get: () => ({
        opacity: clampOpacity(getSettings().browserOpacity ?? 1),
        overlay: overlayOn(),
        autoSave: getSettings().overlayAutoSave !== false,
        canOverlay: hostKind === 'page',
      }),
      set: patchAppearance,
    });

  const menuApi = () => ({
    newTab,
    duplicateTab: () => duplicateActive(device),
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
    navigate: (u) => openTargetUrl(u),
    getUrl: () => getActiveTab()?.url || '',
    getVisited,
    clearHistory: () => {
      clearVisited();
      renderNtp();
      toast('History cleared', 1500);
    },
    getBookmarks: bookmarks,
    isBookmarked: () => {
      const t = getActiveTab();
      return !!t && bookmarks().some((b) => b.url === t.url);
    },
    toggleBookmark,
    getZoom: () => getActiveTab()?.zoom ?? 100,
    zoom: (delta, reset) => {
      const t = getActiveTab();
      if (!t) return 100;
      return setZoomActive(reset ? 100 : nextZoom(t.zoom || 100, delta));
    },
    toggleFullscreen: toggleFs,
    print: () => {
      if (!printActive()) toast('Cannot print this page', 1800);
    },
    find: () => {
      find.hidden = false;
      findInput.focus();
      findInput.select();
    },
    isDevtools: () => !!getActiveTab()?.devtools,
    toggleDevtools: () => {
      const t = getActiveTab();
      if (!t || t.url === 'about:blank') return toast('Open a page first', 1800);
      if (!toggleDevtoolsActive())
        toast('DevTools work on pages served by Live Server', 3000);
    },
    isDeviceMode: () => deviceMode.isOn(),
    toggleDeviceMode: () => deviceMode.toggle(),
    viewSource: async () => {
      const t = getActiveTab();
      if (!t || !/^https?:/i.test(t.url)) return toast('No page source here', 1800);
      try {
        const fetchUrl = t.iframe?.src && t.iframe.src !== 'about:blank' ? t.iframe.src : t.url;
        const txt = await (await fetch(fetchUrl)).text();
        const blobUrl = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
        addTab(device, blobUrl, 'view-source:' + t.url.replace(/^https?:\/\//, ''));
      } catch (e) {
        toast('Could not load source: ' + (e?.message || e), 2500);
      }
    },
    openExternal: () => {
      const u = getActiveTab()?.url;
      if (u && u !== 'about:blank') openUrlInSystemBrowser(u);
    },
    openOpacity,
    isOverlay: overlayOn,
    canOverlay: () => hostKind === 'page',
    toggleOverlay: () => patchAppearance({ overlay: !overlayOn() }),
    closeBrowser: () => hideBrowser(),
  });

  // ---- buttons
  $('.ls-tab-new')?.addEventListener('click', newTab);
  wrap.querySelectorAll('.ls-close-btn, .ls-ov-close').forEach((b) => b.addEventListener('click', () => hideBrowser()));
  $('.ls-fs-btn')?.addEventListener('click', toggleFs);
  backBtn?.addEventListener('click', () => historyActive(-1));
  fwdBtn?.addEventListener('click', () => historyActive(1));
  reloadBtn.addEventListener('click', () => (getActiveTab()?.loading ? stopActive() : reloadActive()));
  $('.ls-home')?.addEventListener('click', goHome);
  starBtn.addEventListener('click', toggleBookmark);
  opBtn.addEventListener('click', openOpacity);
  devBtn.addEventListener('click', () => {
    const on = deviceMode.toggle();
    devBtn.classList.toggle('is-on', on);
  });
  devBtn.classList.toggle('is-on', deviceMode.isOn());
  menuBtn.addEventListener('click', () => openBrowserMenu(menuApi(), { host: wrap, anchor: menuBtn }));

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      openTargetUrl(urlInput.value);
      urlInput.blur();
    }
  });
  urlInput.addEventListener('focus', () => urlInput.select());

  find.querySelector('.ls-find-prev').addEventListener('click', () => doFind(true));
  find.querySelector('.ls-find-next').addEventListener('click', () => doFind(false));
  find.querySelector('.ls-find-close').addEventListener('click', () => (find.hidden = true));
  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doFind(e.shiftKey);
    if (e.key === 'Escape') find.hidden = true;
  });

  wrap._lsDevice = device;
  wrap._sync = sync;
  return wrap;
}

function createChrome() {
  const wrap = document.createElement('div');
  wrap.className = 'ls-browser-shell';
  wrap.dataset.theme = detectTheme();
  wrap.innerHTML = `
    <div class="ls-chrome">
      <div class="ls-tabstrip">
        <div class="ls-browser-tabs"></div>
        <button type="button" class="ls-ib ls-tab-new" title="New tab">${icon(I.plus, 16)}</button>
        <span class="ls-spacer"></span>
        <div class="ls-win">
          <button type="button" class="ls-ib ls-win-btn ls-fs-btn" title="Fullscreen">${icon(I.maximize, 14)}</button>
          <button type="button" class="ls-ib ls-win-btn ls-close-btn" title="Close">${icon(I.close, 14)}</button>
        </div>
      </div>
      <div class="ls-toolbar">
        <button type="button" class="ls-ib ls-back" title="Back" disabled>${icon(I.back, 18)}</button>
        <button type="button" class="ls-ib ls-fwd" title="Forward" disabled>${icon(I.forward, 18)}</button>
        <button type="button" class="ls-ib ls-reload" title="Reload">${icon(I.reload, 18)}</button>
        <button type="button" class="ls-ib ls-home" title="Home">${icon(I.home, 18)}</button>
        <div class="ls-omni">
          <button type="button" class="ls-site" title="Site information">${icon(I.info, 16)}</button>
          <input class="ls-browser-url" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Search or type a URL" />
          <button type="button" class="ls-ib ls-star" title="Bookmark this tab">${icon(I.star, 16)}</button>
        </div>
        <button type="button" class="ls-ib ls-op-btn" title="Opacity">${icon(I.drop, 18)}</button>
        <button type="button" class="ls-ib ls-dev-toggle" title="Device mode">${icon(I.device, 18)}</button>
        <button type="button" class="ls-ib ls-menu-btn" title="Customize and control">${icon(I.dots, 18, 3)}</button>
        <button type="button" class="ls-ib ls-ov-close" title="Close">${icon(I.close, 16)}</button>
        <div class="ls-progress"></div>
        <div class="ls-green-progress"></div>
      </div>
      <div class="ls-devbar" hidden></div>
    </div>
    <div class="ls-stage">
      <div class="ls-ntp"></div>
      <div class="ls-box"><div class="ls-device"></div></div>
    </div>
    <div class="ls-find" hidden>
      <input type="text" placeholder="Find in page" spellcheck="false" />
      <button type="button" class="ls-ib ls-find-prev" title="Previous">${icon(I.up, 16)}</button>
      <button type="button" class="ls-ib ls-find-next" title="Next">${icon(I.down, 16)}</button>
      <button type="button" class="ls-ib ls-find-close" title="Close">${icon(I.close, 16)}</button>
    </div>
  `;
  return wireChrome(wrap);
}

function handleBack() {
  if (isDropdownOpen()) {
    closeDropdown();
    return true;
  }
  const find = shellEl?.querySelector('.ls-find');
  if (find && !find.hidden) {
    find.hidden = true;
    return true;
  }
  if (shellEl?.classList.contains('is-fullscreen')) {
    host?.onFullscreen?.(setFullscreen(shellEl, false));
    return true;
  }
  return false;
}

function onHostClosed() {
  if (closing) return;
  hideBrowser({ fromHost: true });
}

async function mountShell() {
  if (shellEl && host) {
    host.show?.();
    requestAnimationFrame(() => deviceMode?.layout());
    return shellEl;
  }
  if (mounting) return mounting;
  mounting = (async () => {
    injectBrowserStyles();
    const el = createChrome();
    let h = null;
    hostKind = 'page';
    if (mode() === 'editorTab') {
      h = await mountInEditorTab(el, { title: 'Live Preview', css: BROWSER_CSS, onClose: onHostClosed });
      if (h) hostKind = 'tab';
      else toast('Editor tab not available, using page', 2000);
    }
    if (!h) h = mountInPage(el, { title: 'Live Preview', onClose: onHostClosed, onBack: handleBack });
    host = h;
    shellEl = el;
    initBridge();
    settingsListener = (ev) => {
      if (WATCHED_KEYS.includes(ev?.detail?.key)) applyAppearance();
    };
    window.addEventListener('liveserver-settings', settingsListener);
    applyAppearance();
    requestAnimationFrame(() => deviceMode?.layout());
    return el;
  })().finally(() => {
    mounting = null;
  });
  return mounting;
}

export async function openBrowser(url, opts = {}) {
  const shell = await mountShell();
  const tabsNow = getTabs();

  if (tabsNow.length > 0 && (opts.restoreOnly || !url)) {
    return;
  }

  const u = url || 'about:blank';

  if (opts.reuse) {
    const same = tabsNow.find((t) => sameOrigin(t.url, u));
    if (same) {
      activateTab(same.id);
      if (same.url !== u) navigateActive(u);
      else if (opts.forceReload) reloadActive();
      return;
    }
  }

  const existing = getActiveTab();
  if (existing && existing.url === 'about:blank' && tabsNow.length === 1) {
    navigateActive(u);
  } else {
    addTab(shell._lsDevice, u);
  }
}

export function hideBrowser(opts = {}) {
  if (closing) return;
  closing = true;
  try {
    closeDropdown();
    unsubTabs?.();
    unsubTabs = null;
    if (settingsListener) window.removeEventListener('liveserver-settings', settingsListener);
    settingsListener = null;
    disableAutoSave();
    disposeBridge();
    try {
      deviceMode?.destroy();
    } catch (_) {}
    deviceMode = null;
    closeAllTabs();
    exitFullscreen(shellEl);
    try {
      shellEl?.remove();
    } catch (_) {}
    if (!opts.fromHost) host?.close();
  } finally {
    host = null;
    shellEl = null;
    document.body.classList.remove('ls-browser-fs');
    closing = false;
  }
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