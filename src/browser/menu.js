/**
 * Browser menu + submenu (select-based, SVG-free labels)
 */
const select = acode.require('select');
const toast = acode.require('toast');

/**
 * @param {object} api
 * @param {() => void} api.reload
 * @param {() => void} api.newTab
 * @param {() => void} api.closeTab
 * @param {() => void} api.toggleFullscreen
 * @param {() => void} api.closeBrowser
 * @param {() => string} api.getUrl
 * @param {(url: string) => void} api.navigate
 */
export async function openBrowserMenu(api) {
  const choice = await select(
    'Browser',
    [
      ['nav', 'Navigation ›'],
      ['tabs', 'Tabs ›'],
      ['view', 'View ›'],
      ['copy', 'Copy current URL'],
      ['close', 'Close browser'],
    ],
    { hideOnSelect: true }
  ).catch(() => null);

  if (!choice) return;

  if (choice === 'nav') {
    const sub = await select(
      'Navigation',
      [
        ['back', 'Back'],
        ['forward', 'Forward'],
        ['reload', 'Reload'],
        ['home', 'Open server root'],
      ],
      { hideOnSelect: true }
    ).catch(() => null);
    if (sub === 'back') api.back?.();
    if (sub === 'forward') api.forward?.();
    if (sub === 'reload') api.reload?.();
    if (sub === 'home') {
      const { getServerStatus } = await import('../server/status.js');
      const st = getServerStatus();
      const root = st.url ? st.url.replace(/\/[^/]*$/, '/') : st.port ? `http://127.0.0.1:${st.port}/` : null;
      if (root) api.navigate?.(root);
      else toast('Server not running', 2000);
    }
    return;
  }

  if (choice === 'tabs') {
    const sub = await select(
      'Tabs',
      [
        ['new', 'New tab'],
        ['close', 'Close current tab'],
        ['closeOthers', 'Close other tabs'],
      ],
      { hideOnSelect: true }
    ).catch(() => null);
    if (sub === 'new') api.newTab?.();
    if (sub === 'close') api.closeTab?.();
    if (sub === 'closeOthers') api.closeOtherTabs?.();
    return;
  }

  if (choice === 'view') {
    const sub = await select(
      'View',
      [
        ['fs', 'Toggle fullscreen'],
        ['desktop', 'Desktop width (100%)'],
        ['mobile', 'Narrow width'],
      ],
      { hideOnSelect: true }
    ).catch(() => null);
    if (sub === 'fs') api.toggleFullscreen?.();
    if (sub === 'desktop') api.setViewport?.('desktop');
    if (sub === 'mobile') api.setViewport?.('mobile');
    return;
  }

  if (choice === 'copy') {
    const url = api.getUrl?.() || '';
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast('URL copied', 1500);
    } catch (_) {
      toast(url || 'No URL', 2500);
    }
    return;
  }

  if (choice === 'close') api.closeBrowser?.();
}
