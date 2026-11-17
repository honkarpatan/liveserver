import { registerPluginSettings } from './settingsPages.js';
import { registerSideButton, unregisterSideButton, onFileSwitch, setLiveDot } from '../ui/sideButton.js';
import { registerCommands, unregisterCommands } from '../commands/palette.js';
import { setPluginBase } from './baseUrl.js';
import { registerRunButton, unregisterRunButton, refreshRunButton } from '../ui/runButton.js';
import { resetDepsSession } from '../deps/dependencyChecker.js';
import { setProcessBaseUrl, probeExistingServer } from '../server/process.js';
import { getServerStatus } from '../server/status.js';
import { registerLiveReloadOnSave, unregisterLiveReloadOnSave } from '../server/liveReload.js';
import { closeBrowserConfirm } from '../ui/browserConfirm.js';
import { destroyStatusPill } from '../ui/statusPill.js';

const FILE_EVENTS = ['switch-file', 'rename-file', 'file-loaded', 'new-file'];

let baseUrl = '';
let fileHandler = null;
let statusHandler = null;
let visibilityHandler = null;

export async function initPlugin(_baseUrl) {
  baseUrl = _baseUrl || '';
  setProcessBaseUrl(baseUrl);
  setPluginBase(baseUrl);
  resetDepsSession();

  try {
    const { getSettings, updateSetting } = await import('./settings.js');
    const p = getSettings().acodelsPath || '';
    if (/^\/public|com\.termux/.test(String(p))) updateSetting('acodelsPath', '');
  } catch (_) {}

  try { registerPluginSettings(); } catch (e) { console.warn('[LiveServer] settings', e); }
  try { registerSideButton(); } catch (e) { console.warn('[LiveServer] side', e); }
  try { registerCommands(); } catch (e) { console.warn('[LiveServer] commands', e); }
  try { registerLiveReloadOnSave(); } catch (e) { console.warn('[LiveServer] liveReload', e); }
  try { registerRunButton(); } catch (e) { console.warn('[LiveServer] run button', e); }

  fileHandler = () => {
    onFileSwitch();
    refreshRunButton();
  };

  FILE_EVENTS.forEach((ev) => {
    try { editorManager?.on?.(ev, fileHandler); } catch (_) {}
  });

  statusHandler = () => setLiveDot(getServerStatus().running);
  try {
    window.addEventListener('liveserver-status', statusHandler);
    window.addEventListener('liveserver-started', statusHandler);
    window.addEventListener('liveserver-stopped', statusHandler);
  } catch (_) {}

  const syncLiveState = async () => {
    const alive = await probeExistingServer();
    setLiveDot(alive);
  };
  syncLiveState();
  setTimeout(syncLiveState, 1200);
  setTimeout(fileHandler, 400);

  visibilityHandler = () => {
    if (document.visibilityState === 'visible') syncLiveState();
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  try {
    window.addEventListener('liveserver-settings', async () => {
      try {
        const { reapplySetup } = await import('../server/process.js');
        if (getServerStatus().running) await reapplySetup();
      } catch (_) {}
    });
  } catch (_) {}

  console.log('[LiveServer] v2 init', baseUrl);
}

export function destroyPlugin() {
  FILE_EVENTS.forEach((ev) => {
    try {
      if (fileHandler) editorManager?.off?.(ev, fileHandler);
    } catch (_) {}
  });
  try { unregisterRunButton(); } catch (_) {}
  try {
    window.removeEventListener('liveserver-status', statusHandler);
    window.removeEventListener('liveserver-started', statusHandler);
    window.removeEventListener('liveserver-stopped', statusHandler);
  } catch (_) {}
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  closeBrowserConfirm();
  destroyStatusPill();
  unregisterSideButton();
  unregisterCommands();
  try { unregisterLiveReloadOnSave(); } catch (_) {}
  try {
    import('../browser/index.js').then((m) => m.hideBrowser?.());
  } catch (_) {}
  try {
    import('../browser/nativeWebview.js').then((m) => m.destroyAcodeWebview?.());
  } catch (_) {}
}

export function getBaseUrl() {
  return baseUrl;
}