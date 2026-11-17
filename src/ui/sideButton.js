/**
 * Dynamic Live Server side button — updates live with a green dot when running,
 * and shows only for .html / .htm files (modeled after problemsPage.js).
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
    .ls-side-live-dot {
      display: inline-block;
      width: 9px;
      height: 9px;
      min-width: 9px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px rgba(34, 197, 94, 0.95);
      margin-right: 6px;
      vertical-align: middle;
      flex-shrink: 0;
    }
    [data-ls-sidebtn="1"][data-live="1"] {
      border-left: 3px solid #22c55e !important;
    }
  `;
  document.head.appendChild(s);
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

function applyLiveVisualToDom(el, isLive) {
  if (!el) return false;
  el.setAttribute('data-ls-sidebtn', '1');
  el.setAttribute('data-live', isLive ? '1' : '0');

  let applied = false;
  const nodes = el.querySelectorAll('.text, .label, .side-button-text, [class*="text"], span, small');
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.classList?.contains('icon') || n.classList?.contains('ls-side-live-dot')) continue;
    if (n.children?.length && n.querySelector('.icon')) continue;

    n.textContent = 'Live Server';
    if (isLive) {
      const dot = document.createElement('span');
      dot.className = 'ls-side-live-dot';
      dot.setAttribute('aria-hidden', 'true');
      n.prepend(dot);
    }
    applied = true;
  }

  if (!applied) {
    const label = isLive ? '● Live Server' : 'Live Server';
    el.setAttribute('aria-label', label);
    el.title = label;
    for (const child of [...el.childNodes]) {
      if (child.nodeType === 3 && child.textContent.trim()) {
        child.textContent = label;
        applied = true;
      }
    }
  }
  return applied;
}

function sideButtonOpts(isLive) {
  return {
    text: isLive ? '● Live Server' : 'Live Server',
    icon: 'public',
    backgroundColor: isLive ? '#14532d' : 'var(--primary-color, #1e1e1e)',
    textColor: isLive ? '#86efac' : 'var(--primary-text-color, #fff)',
    onclick: () => openToolsMenu(),
  };
}

function recreateSideButton(isLive) {
  const show = shouldShowSideButton();
  try {
    sideButton?.hide?.();
  } catch (_) {}
  sideButton = null;
  try {
    sideButton = SideButton(sideButtonOpts(isLive));
    const el = getButtonElement();
    if (el) applyLiveVisualToDom(el, isLive);
    if (show) sideButton?.show?.();
    else sideButton?.hide?.();
  } catch (e) {
    console.warn('[LiveServer] recreateSideButton', e);
  }
}

export function setLiveDot(on) {
  const isLive = !!on;
  try {
    injectLiveDotCss();
    document.body.classList.toggle('ls-server-live', isLive);

    if (!sideButton && SideButton) {
      sideButton = SideButton(sideButtonOpts(isLive));
    }
    if (!sideButton) return;

    const label = isLive ? '● Live Server' : 'Live Server';
    try {
      if (typeof sideButton.setText === 'function') sideButton.setText(label);
      if ('text' in sideButton) sideButton.text = label;
      if (sideButton.$text) sideButton.$text.textContent = label;
    } catch (_) {}

    const el = getButtonElement();
    const ok = el ? applyLiveVisualToDom(el, isLive) : false;
    if (!ok) {
      recreateSideButton(isLive);
      return;
    }

    if (shouldShowSideButton()) sideButton.show?.();
    else sideButton.hide?.();
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
  injectLiveDotCss();
  try {
    const isLive = getServerStatus().running;
    if (!sideButton && SideButton) {
      sideButton = SideButton(sideButtonOpts(isLive));
    }
    setLiveDot(isLive);
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