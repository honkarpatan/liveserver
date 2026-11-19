/**
 * Wrapper around Acode's native `webview` API (acode.require('webview')).
 * Bypasses iframe X-Frame-Options / CSP restrictions for external websites.
 */
const toast = acode.require('toast');

let activeView = null;

function fallbackExternalBrowser(url) {
  try {
    if (window.cordova?.InAppBrowser?.open) {
      window.cordova.InAppBrowser.open(url, '_system');
      return true;
    }
    if (window.system?.openInBrowser) {
      window.system.openInBrowser(url);
      return true;
    }
    window.open(url, '_blank', 'noopener');
    return true;
  } catch (_) {
    toast(url, 2500);
    return false;
  }
}

export function isNativeWebviewSupported() {
  try {
    const wv = acode.require('webview');
    return !!(wv && typeof wv.create === 'function');
  } catch (_) {
    return false;
  }
}

/**
 * Open a URL in Acode's fullscreen native WebView.
 * @param {string} url
 * @param {{ title?: string, allowDownloads?: boolean }} [opts]
 */
export async function openInAcodeWebview(url, opts = {}) {
  if (!url || url === 'about:blank') return false;

  let webviewMod = null;
  try {
    webviewMod = acode.require('webview');
  } catch (_) {}

  if (!webviewMod?.create) {
    return fallbackExternalBrowser(url);
  }

  // Reuse existing fullscreen WebView if still alive
  if (activeView) {
    try {
      await activeView.loadURL(url);
      await activeView.show();
      return true;
    } catch (_) {
      // Instance was already destroyed
      activeView = null;
    }
  }

  try {
    const view = await webviewMod.create({
      mode: 'fullscreen',
      title: opts.title || url.replace(/^https?:\/\//i, ''),
      allowNavigation: true,
      allowDownloads: opts.allowDownloads !== false,
      visible: true,
    });

    activeView = view;

    view.on('closed', () => {
      if (activeView === view) {
        activeView = null;
      }
    });

    await view.loadURL(url);
    return true;
  } catch (err) {
    console.warn('[LiveServer] native webview failed, falling back:', err);
    activeView = null;
    return fallbackExternalBrowser(url);
  }
}

/**
 * Must be called in plugin destroy() to prevent native WebView memory leaks.
 */
export async function destroyAcodeWebview() {
  if (!activeView) return;
  const v = activeView;
  activeView = null;
  try {
    await v.destroy();
  } catch (_) {}
}