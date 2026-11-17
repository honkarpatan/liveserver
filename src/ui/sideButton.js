/**
 * Dynamic Live Server side button — green dot when running
 */
import { getSettings } from '../core/settings.js';
import { isHtmlFile, getActiveFile } from '../utils/paths.js';
import { getServerStatus } from '../server/status.js';

const SideButton = acode.require('sideButton');
const select = acode.require('select');
const toast = acode.require('toast');

let sideButton = null;

function injectLiveDotCss() {
  if (document.getElementById('ls-side-dot-css')) return;
  const s = document.createElement('style');
  s.id = 'ls-side-dot-css';
  s.textContent = `
body.ls-server-live .ls-side-btn-indicator,
.ls-side-live-dot {
  display: inline-block;
  width: 8px; height: 8px; border-radius: 50%;
  background: #3ddc84; box-shadow: 0 0 0 2px rgba(61,220,132,0.25);
  margin-left: 4px; vertical-align: middle;
}
body:not(.ls-server-live) .ls-side-live-dot { display: none; }
`;
  document.head.appendChild(s);
}

export function setLiveDot(on) {
  try {
    document.body.classList.toggle('ls-server-live', !!on);
    if (sideButton) {
      const base = 'Live Server';
      // Some SideButton impls use .text
      try {
        if ('text' in sideButton) sideButton.text = on ? base + ' ●' : base;
      } catch (_) {}
      try {
        sideButton.setAttribute?.('data-live', on ? '1' : '0');
      } catch (_) {}
    }
  } catch (_) {}
}

async function openToolsMenu() {
  const st = getServerStatus();
  const startStop = st.running
    ? ['stop', 'Stop live server']
    : ['start', 'Start live server'];
  const choice = await select(
    'Live Server',
    [
      startStop,
      ['restart', 'Restart server'],
      ['port', 'Change port'],
      ['root', 'Select root folder'],
      ['browser', 'Open browser'],
      ['deps', 'Check dependencies'],
      ['settings', 'Settings'],
    ],
    { hideOnSelect: true }
  );
  if (!choice) return;
  try {
    if (choice === 'start') {
      const { startServer } = await import('../server/process.js');
      await startServer();
    } else if (choice === 'stop') {
      const { stopServer } = await import('../server/process.js');
      await stopServer();
    } else if (choice === 'restart') {
      const { restartServer } = await import('../server/process.js');
      await restartServer();
    } else if (choice === 'port') {
      const { changePortAndRestart } = await import('../server/process.js');
      await changePortAndRestart();
    } else if (choice === 'root') {
      const { pickRootFolder } = await import('../server/rootFolder.js');
      await pickRootFolder();
    } else if (choice === 'browser') {
      const { openBrowser } = await import('../browser/index.js');
      const url =
        getServerStatus().url ||
        'http://127.0.0.1:' + (getServerStatus().port || 8080) + '/';
      openBrowser(url);
    } else if (choice === 'deps') {
      const { checkDependenciesAction } = await import('../deps/dependencyChecker.js');
      await checkDependenciesAction();
    } else if (choice === 'settings') {
      const { openSettingsHub } = await import('../core/settingsPages.js');
      openSettingsHub();
    }
  } catch (e) {
    toast(String(e?.message || e), 2500);
  }
  setLiveDot(getServerStatus().running);
}

export function registerSideButton() {
  if (getSettings().showSideButton === false) return;
  injectLiveDotCss();
  try {
    if (!sideButton && SideButton) {
      sideButton = SideButton({
        text: 'Live Server',
        icon: 'public',
        onclick: () => openToolsMenu(),
      });
    }
    onFileSwitch();
  } catch (e) {
    console.warn('[LiveServer] side button', e);
  }
}

export function onFileSwitch() {
  // only for .html / .htm files
  const show = getSettings().showSideButton !== false && isHtmlFile(getActiveFile());
  try {
    show ? sideButton?.show?.() : sideButton?.hide?.();
  } catch (_) {}
  setLiveDot(getServerStatus().running);
}

export function unregisterSideButton() {
  try {
    sideButton?.hide?.();
  } catch (_) {}
  sideButton = null;
  document.body.classList.remove('ls-server-live');
}
