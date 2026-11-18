/**
 * Replaces Acode's header run button for .html / .htm files with Live Server's play button.
 * Uses custom action="run-live-server" so Acode's native header CSS aligns it identically
 * without triggering Acode's built-in action="run" handler.
 */
import { isHtmlFile, getActiveFile } from '../utils/paths.js';
import { runPreview } from '../server/runPreview.js';

let btn = null;
let timer = null;
let isLaunching = false;

function injectCss() {
  if (document.getElementById('ls-run-css')) return;
  const s = document.createElement('style');
  s.id = 'ls-run-css';
  s.textContent = `
    body.ls-html-file #root > header.tile > [action="run"]:not([data-ls-run]) {
      display: none !important;
    }
  `;
  document.head.appendChild(s);
}

const HEADER = '#root > header.tile';

function findOriginal() {
  return (
    document.querySelector(`${HEADER} > span.icon.play_arrow[action="run"]`) ||
    document.querySelector('[action="run"]:not([data-ls-run])')
  );
}

async function onClick(e) {
  e.preventDefault();
  e.stopPropagation();

  if (isLaunching) return;
  isLaunching = true;

  try {
    const activeFile = getActiveFile() || window.editorManager?.activeFile;
    await runPreview(activeFile);
  } catch (err) {
    console.error('[LiveServer] runPreview failed:', err);
    try {
      acode.require('toast')(err?.message || 'Failed to launch Live Server');
    } catch (_) {}
  } finally {
    isLaunching = false;
  }
}

export function refreshRunButton() {
  injectCss();

  const activeFile = getActiveFile() || window.editorManager?.activeFile;
  const htmlActive = isHtmlFile(activeFile);
  document.body.classList.toggle('ls-html-file', htmlActive);

  if (!htmlActive) {
    if (btn?.isConnected) btn.remove();
    return;
  }

  if (!btn) {
    btn = document.createElement('span');
    btn.className = 'icon play_arrow';
    btn.setAttribute('action', 'run-live-server');
    btn.setAttribute('data-ls-run', '1');
    btn.setAttribute('title', 'Run with Live Server');
    btn.onclick = onClick;
  }

  // Keep clean classes only — do NOT copy inline styles or set display: inline-block
  btn.className = 'icon play_arrow';

  const orig = findOriginal();
  const header = document.querySelector(HEADER);

  if (orig && orig.parentNode) {
    if (btn.parentNode !== orig.parentNode || btn.nextSibling !== orig) {
      orig.parentNode.insertBefore(btn, orig);
    }
  } else if (header && !btn.isConnected) {
    header.insertBefore(btn, header.lastChild);
  }
}

export function registerRunButton() {
  refreshRunButton();

  if (window.editorManager) {
    editorManager.off('switch-file', refreshRunButton);
    editorManager.off('rename-file', refreshRunButton);
    editorManager.on('switch-file', refreshRunButton);
    editorManager.on('rename-file', refreshRunButton);
  }

  clearInterval(timer);
  timer = setInterval(refreshRunButton, 1500);
}

export function unregisterRunButton() {
  clearInterval(timer);
  timer = null;

  if (window.editorManager) {
    editorManager.off('switch-file', refreshRunButton);
    editorManager.off('rename-file', refreshRunButton);
  }

  try {
    btn?.remove();
  } catch (_) {}
  btn = null;

  document.body.classList.remove('ls-html-file');
  document.getElementById('ls-run-css')?.remove();
}