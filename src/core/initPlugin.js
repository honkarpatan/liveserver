import { registerPluginSettings } from './settingsPages.js';
import { registerSideButton, unregisterSideButton, onFileSwitch, setLiveDot } from '../ui/sideButton.js';
import { registerCommands, unregisterCommands } from '../commands/palette.js';
import { setPluginBase } from './baseUrl.js';
import { registerRunButton, unregisterRunButton, refreshRunButton } from '../ui/runButton.js';
import { ensureLiveServerDeps, resetDepsSession } from '../deps/dependencyChecker.js';
import { isHtmlFile, getActiveFile } from '../utils/paths.js';
import { setProcessBaseUrl, probeExistingServer } from '../server/process.js';
import { getServerStatus } from '../server/status.js';
import { registerLiveReloadOnSave, unregisterLiveReloadOnSave } from '../server/liveReload.js';

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

  try {
    if (!document.getElementById('ls-ui-styles-data')) {
      const s2 = document.createElement('style');
      s2.id = 'ls-ui-styles-data';
      s2.textContent = `
#ls-deps-picker{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center}
.ls-dp-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.45)}
.ls-dp-card{position:relative;width:min(420px,92vw);max-height:min(72vh,540px);display:flex;flex-direction:column;border-radius:3px;background:var(--secondary-color,#1e1e1e);color:var(--color,#e0e0e0);overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.4)}
.ls-dp-header{padding:12px 14px 8px;border-bottom:1px solid rgba(128,128,128,.25)}
.ls-dp-title{font-weight:600}
.ls-dp-subtitle{font-size:.75rem;opacity:.75;margin-top:4px}
.ls-dp-body{flex:1;overflow:auto;padding:8px 12px}
.ls-dp-row{display:flex;align-items:center;gap:10px;padding:8px 6px;border-radius:3px;margin-bottom:4px;background:rgba(128,128,128,.08)}
.ls-dp-status.ok{color:#66bb6a}.ls-dp-status.miss{color:#f48771}
.ls-dp-footer{display:flex;gap:8px;justify-content:flex-end;padding:10px 12px;border-top:1px solid rgba(128,128,128,.25)}
.ls-dp-btn{border:none;border-radius:3px;padding:8px 12px;background:rgba(128,128,128,.2);color:inherit}
.ls-dp-btn.ls-dp-install{background:var(--active-color,#61afef);color:#111;font-weight:600}
.ls-dp-progress-track{height:3px;border-radius:3px;background:rgba(128,128,128,.25);overflow:hidden}
.ls-dp-progress-bar{height:100%;background:var(--active-color,#61afef);transition:width .25s}
.ls-dp-spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(128,128,128,.35);border-top-color:var(--active-color,#61afef);animation:ls-spin .7s linear infinite}
@keyframes ls-spin{to{transform:rotate(360deg)}}
      `;
      document.head.appendChild(s2);
    }
  } catch (_) {}

  try { registerPluginSettings(); } catch (e) { console.warn('[LiveServer] settings', e); }
  try { registerSideButton(); } catch (e) { console.warn('[LiveServer] side', e); }
  try { registerCommands(); } catch (e) { console.warn('[LiveServer] commands', e); }
  try { registerLiveReloadOnSave(); } catch (e) { console.warn('[LiveServer] liveReload', e); }
  try { registerRunButton(); } catch (e) { console.warn('[LiveServer] run button', e); }

  fileHandler = () => {
    onFileSwitch();
    refreshRunButton();
    const f = getActiveFile();
    if (isHtmlFile(f)) {
      ensureLiveServerDeps({ baseUrl }).catch((e) => console.warn('[LiveServer:deps]', e));
    }
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

  // Detect already-running server immediately on startup/restart and on app resume
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