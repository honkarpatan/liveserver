/**
 * Live Server side button
 * - Offline: browser icon + offline label (default "Go Live"), Acode button background
 * - Running: grey pause icon + running label (default "{HOST}:{PORT}"), green background
 * - No status dot before the label
 */
import { getSettings } from '../core/settings.js';
import { isHtmlFile, getActiveFile } from '../utils/paths.js';
import { getServerStatus } from '../server/status.js';

const SideButton = acode.require('sideButton');
const select = acode.require('select');
const toast = acode.require('toast');

let sideButton = null;
let lastLive = null;

function injectSideBtnCss() {
  if (document.getElementById('ls-side-btn-css')) return;
  const s = document.createElement('style');
  s.id = 'ls-side-btn-css';
  s.textContent = `
    [data-ls-sidebtn="1"] {
      gap: 6px;
    }
    [data-ls-sidebtn="1"] .ls-side-ico {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.05rem;
      height: 1.05rem;
      flex-shrink: 0;
      margin-right: 4px;
      vertical-align: middle;
    }
    [data-ls-sidebtn="1"] .ls-side-ico svg {
      width: 1.05rem;
      height: 1.05rem;
      display: block;
    }
    [data-ls-sidebtn="1"][data-live="1"] {
      background: #22c55e !important;
      color: #0b1220 !important;
    }
    [data-ls-sidebtn="1"][data-live="0"] {
      background: var(--button-background-color, var(--secondary-color, #3c4043)) !important;
      color: var(--button-text-color, var(--color, #e8eaed)) !important;
    }
  `;
  document.head.appendChild(s);
}

function iconRunning() {
  // circle + slash (user-provided style)
  return `<svg class="ls-side-ico" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5.63605 5.63603L18.364 18.364M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function iconBrowser() {
  return `<svg class="ls-side-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`;
}

function resolveHost() {
  const s = getSettings();
  if (s.bindLocalhostOnly !== false) return '127.0.0.1';
  const b = String(s.bindAddress || '127.0.0.1').trim();
  if (!b || b === '0.0.0.0') return '127.0.0.1';
  return b;
}

function formatRunningLabel() {
  const st = getServerStatus();
  const s = getSettings();
  const tpl = String(s.sideButtonRunningLabel || '{HOST}:{PORT}');
  const host = resolveHost();
  const port = st.port || s.port || 8080;
  return tpl.replace(/\{HOST\}/gi, host).replace(/\{PORT\}/gi, String(port));
}

function formatOfflineLabel() {
  return String(getSettings().sideButtonOfflineLabel || 'Go Live');
}

function labelFor(isLive) {
  return isLive ? formatRunningLabel() : formatOfflineLabel();
}

function shouldShowSideButton() {
  return (
    getSettings().showSideButton !== false &&
    isHtmlFile(getActiveFile() || window.editorManager?.activeFile)
  );
}

function getButtonElement() {
  if (!sideButton) return null;
  return (
    sideButton.$el ||
    sideButton.el ||
    sideButton.root ||
    (sideButton instanceof HTMLElement ? sideButton : null)
  );
}

function applyVisual(el, isLive) {
  if (!el) return false;
  el.setAttribute('data-ls-sidebtn', '1');
  el.setAttribute('data-live', isLive ? '1' : '0');
  const text = labelFor(isLive);
  const ico = isLive ? iconRunning() : iconBrowser();

  // Prefer known text nodes
  const candidates = el.querySelectorAll(
    '.text, .label, .side-button-text, [class*="text"], span, small'
  );
  let applied = false;
  for (const n of candidates) {
    if (n.classList?.contains('icon') || n.classList?.contains('ls-side-ico')) continue;
    if (n.children?.length && n.querySelector('.icon, svg')) continue;
    n.innerHTML = ico + text;
    applied = true;
  }
  if (!applied) {
    // Fallback: set whole content carefully
    const iconHost = el.querySelector('.icon');
    if (iconHost) {
      iconHost.innerHTML = isLive ? iconRunning() : iconBrowser();
      // find adjacent text
      let set = false;
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && n.textContent.trim()) {
          n.textContent = ' ' + text;
          set = true;
        }
      }
      if (!set) {
        el.setAttribute('aria-label', text);
        el.title = text;
      }
    } else {
      el.innerHTML = ico + '<span class="ls-side-label">' + text + '</span>';
    }
  }
  el.setAttribute('aria-label', text);
  el.title = text;
  return true;
}

function sideButtonOpts(isLive) {
  return {
    text: labelFor(isLive),
    // Acode icon font name hints (may be ignored if we inject SVG)
    icon: isLive ? 'block' : 'public',
    backgroundColor: isLive
      ? '#22c55e'
      : undefined, // fall back to theme when possible
    textColor: isLive ? '#0b1220' : undefined,
    onclick: () => openToolsMenu(),
  };
}

function recreateSideButton(isLive) {
  try {
    sideButton?.hide?.();
  } catch (_) {}
  sideButton = null;
  if (!SideButton) return;
  try {
    sideButton = SideButton(sideButtonOpts(isLive));
    const el = getButtonElement();
    if (el) applyVisual(el, isLive);
  } catch (e) {
    console.warn('[LiveServer] recreate side', e);
  }
}

/**
 * @param {boolean|null} [running] null = read status
 */
export function setLiveDot(running) {
  try {
    injectSideBtnCss();
    const isLive = running == null ? !!getServerStatus().running : !!running;
    document.body.classList.toggle('ls-server-live', isLive);

    if (!shouldShowSideButton()) {
      try {
        sideButton?.hide?.();
      } catch (_) {}
      lastLive = isLive;
      return;
    }

    if (!sideButton) {
      recreateSideButton(isLive);
    } else {
      try {
        if (typeof sideButton.setText === 'function') sideButton.setText(labelFor(isLive));
        if ('text' in sideButton) sideButton.text = labelFor(isLive);
        if (sideButton.$text) sideButton.$text.textContent = labelFor(isLive);
      } catch (_) {}
      const el = getButtonElement();
      const ok = el ? applyVisual(el, isLive) : false;
      if (!ok || lastLive !== isLive) {
        // Icon/background may need full recreate when state flips
        recreateSideButton(isLive);
      }
    }

    if (shouldShowSideButton()) sideButton?.show?.();
    else sideButton?.hide?.();
    lastLive = isLive;
  } catch (e) {
    console.warn('[LiveServer] setLiveDot', e);
  }
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
      ['startSelected', 'Start server on selected path'],
      ['restart', 'Restart server'],
      ['port', 'Change port'],
      ['root', 'Select root folder'],
      ['rootBrowse', 'Select path (Acode browser)'],
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
    } else if (choice === 'startSelected') {
      const { startServer } = await import('../server/process.js');
      const { getSettings } = await import('../core/settings.js');
      const { browseRootFolder, getEffectiveRoot } = await import('../server/rootFolder.js');
      let root = getSettings().rootFolder || getEffectiveRoot();
      if (!root) root = await browseRootFolder();
      if (!root) {
        toast('Select a folder first', 2000);
        return;
      }
      await startServer({ root });
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
    } else if (choice === 'rootBrowse') {
      const { browseRootFolder } = await import('../server/rootFolder.js');
      await browseRootFolder();
    } else if (choice === 'browser') {
      const { openBrowser } = await import('../browser/index.js');
      const url =
        getServerStatus().url ||
        'http://127.0.0.1:' + (getServerStatus().port || 8080) + '/';
      openBrowser(url, { restoreOnly: true });
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
  injectSideBtnCss();
  try {
    setLiveDot(getServerStatus().running);
  } catch (e) {
    console.warn('[LiveServer] side button', e);
  }
}

export function onFileSwitch() {
  setLiveDot(getServerStatus().running);
}

export function unregisterSideButton() {
  try {
    sideButton?.hide?.();
  } catch (_) {}
  sideButton = null;
  document.body.classList.remove('ls-server-live');
}
