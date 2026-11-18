/**
 * Browser menu — mirrors desktop Chrome's three-dot menu (custom dropdown, see dropdown.js)
 */
import { openDropdown } from './dropdown.js';
import { icon, I } from './icons.js';

const toast = acode.require('toast');

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('URL copied', 1500);
  } catch (_) {
    toast(text || 'No URL', 2500);
  }
}

async function serverRoot() {
  const { getServerStatus } = await import('../server/status.js');
  const st = getServerStatus();
  if (st.url) return st.url.replace(/\/[^/]*$/, '/');
  if (st.port) return 'http://127.0.0.1:' + st.port + '/';
  return null;
}

function short(s, n = 38) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function zoomRow(api) {
  return {
    render(row) {
      const wrap = document.createElement('div');
      wrap.className = 'ls-zoomrow';
      const l = document.createElement('span');
      l.className = 'ls-zl';
      l.textContent = 'Zoom';
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'ls-ib';
      minus.innerHTML = icon(I.minus, 14);
      const v = document.createElement('span');
      v.className = 'ls-zv';
      v.textContent = (api.getZoom?.() ?? 100) + '%';
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'ls-ib';
      plus.innerHTML = icon(I.plus, 14);
      const fs = document.createElement('button');
      fs.type = 'button';
      fs.className = 'ls-ib';
      fs.title = 'Fullscreen';
      fs.innerHTML = icon(I.maximize, 14);
      const bump = (d) => {
        const z = api.zoom?.(d);
        if (z != null) v.textContent = z + '%';
      };
      minus.addEventListener('click', (e) => {
        e.stopPropagation();
        bump(-10);
      });
      plus.addEventListener('click', (e) => {
        e.stopPropagation();
        bump(10);
      });
      v.style.cursor = 'pointer';
      v.addEventListener('click', (e) => {
        e.stopPropagation();
        const z = api.zoom?.(0, true);
        if (z != null) v.textContent = z + '%';
      });
      fs.addEventListener('click', (e) => {
        e.stopPropagation();
        api.toggleFullscreen?.();
      });
      wrap.append(l, minus, v, plus, fs);
      row.appendChild(wrap);
    },
  };
}

/**
 * @param {object} api  browser actions
 * @param {{host: HTMLElement, anchor: HTMLElement}} where  shell element + the menu button
 */
export function openBrowserMenu(api, where) {
  const history = api.getVisited?.() || [];
  const marks = api.getBookmarks?.() || [];
  const marked = !!api.isBookmarked?.();

  const items = [
    { label: 'New tab', onClick: () => api.newTab?.() },
    { label: 'Duplicate tab', onClick: () => api.duplicateTab?.() },
    { separator: true },
    {
      label: 'History',
      children: history.length
        ? [
            ...history.slice(0, 15).map((h) => ({
              label: short(h.title || h.url),
              onClick: () => api.navigate?.(h.url),
            })),
            { separator: true },
            { label: 'Clear history', onClick: () => api.clearHistory?.() },
          ]
        : [{ label: 'No history yet', disabled: true }],
    },
    {
      label: 'Bookmarks',
      children: [
        {
          label: marked ? 'Remove bookmark for this tab' : 'Bookmark this tab',
          onClick: () => api.toggleBookmark?.(),
        },
        ...(marks.length ? [{ separator: true }] : []),
        ...marks.map((b) => ({
          label: short(b.title || b.url),
          onClick: () => api.navigate?.(b.url),
        })),
      ],
    },
    { separator: true },
    zoomRow(api),
    { label: 'Pinch to zoom', checked: !!api.isPinch?.(), onClick: () => api.togglePinch?.() },
    { label: 'Print…', onClick: () => api.print?.() },
    { label: 'Find…', onClick: () => api.find?.() },
    { label: 'Developer tools', checked: !!api.isDevtools?.(), onClick: () => api.toggleDevtools?.() },
    { separator: true },
    {
      label: 'More tools',
      children: [
        { label: 'Device mode (responsive)', checked: !!api.isDeviceMode?.(), onClick: () => api.toggleDeviceMode?.() },
        { label: 'View page source', onClick: () => api.viewSource?.() },
        { separator: true },
        { label: 'Zoom in', onClick: () => api.zoom?.(10) },
        { label: 'Zoom out', onClick: () => api.zoom?.(-10) },
        { label: 'Reset zoom', onClick: () => api.zoom?.(0, true) },
        { separator: true },
        {
          label: 'Open server root',
          onClick: async () => {
            const root = await serverRoot();
            if (root) api.navigate?.(root);
            else toast('Server not running', 2000);
          },
        },
        { label: 'Copy current URL', onClick: () => copyText(api.getUrl?.() || '') },
        { label: 'Open in external browser', onClick: () => api.openExternal?.() },
        { separator: true },
        { label: 'Close other tabs', onClick: () => api.closeOtherTabs?.() },
        { label: 'Close current tab', onClick: () => api.closeTab?.() },
      ],
    },
    { label: 'Opacity…', onClick: () => api.openOpacity?.() },
    {
      label: 'Preview as overlay',
      checked: !!api.isOverlay?.(),
      disabled: !api.canOverlay?.(),
      onClick: () => api.toggleOverlay?.(),
    },
    { separator: true },
    {
      label: 'Settings',
      onClick: async () => {
        const { openSettingsHub } = await import('../core/settingsPages.js');
        openSettingsHub();
      },
    },
    { label: 'Exit', onClick: () => api.closeBrowser?.() },
  ];

  return openDropdown({ host: where.host, anchor: where.anchor, items });
}