/**
 * Open URLs the same way Acode HTML Play does:
 * - plugins/browser → cordova.exec('Browser','open',[url, theme, isConsole])
 * - fallback system.openInBrowser
 *
 * This is a top-level Android WebView (not an iframe), so sites like Google
 * work at full speed with video, cookies, etc. — no node proxy needed.
 */

function getThemeHex() {
  try {
    const themes = acode.require('themes');
    const settings = acode.require('settings');
    if (themes && settings) {
      const id = settings.value?.appTheme;
      const t = themes.get?.(id)?.toJSON?.('hex');
      if (t) return t;
    }
  } catch (_) {}
  return {
    primary: '#1e1e1e',
    primaryColor: '#1e1e1e',
    secondary: '#252526',
    textColor: '#e0e0e0',
  };
}

/**
 * @param {string} url
 * @param {{ console?: boolean }} [opts]
 * @returns {boolean} true if a native open was attempted
 */
export function openAcodeNativeBrowser(url, opts = {}) {
  const u = String(url || '').trim();
  if (!u || u === 'about:blank') return false;

  // 1) Acode Browser plugin (same as src/lib/run.js → browser.open)
  try {
    if (typeof cordova !== 'undefined' && cordova.exec) {
      const theme = getThemeHex();
      cordova.exec(
        () => {},
        (err) => console.warn('[LiveServer] Browser.open err', err),
        'Browser',
        'open',
        [u, theme, !!opts.console],
      );
      console.log('[LiveServer] opened via Acode Browser plugin', u.slice(0, 120));
      return true;
    }
  } catch (e) {
    console.warn('[LiveServer] Browser plugin', e);
  }

  // 2) system.openInBrowser
  try {
    if (typeof system !== 'undefined' && system.openInBrowser) {
      system.openInBrowser(u);
      console.log('[LiveServer] opened via system.openInBrowser', u.slice(0, 120));
      return true;
    }
  } catch (e) {
    console.warn('[LiveServer] system.openInBrowser', e);
  }

  // 4) Last resort: window.open (often blocked or limited in WebView)
  try {
    window.open(u, '_blank');
    return true;
  } catch (_) {}

  return false;
}

export function canUseAcodeNativeBrowser() {
  return (
    (typeof cordova !== 'undefined' && typeof cordova.exec === 'function') ||
    (typeof system !== 'undefined' && typeof system.openInBrowser === 'function')
  );
}
