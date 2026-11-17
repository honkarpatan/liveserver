/**
 * Same technique as the C/C++ plugin (runButtonManager.js): our own span lives in Acode's main header
 * (#root > header.tile), Acode's built-in run button is hidden while an HTML file is active.
 *
 * Replaces Acode's header run button (<span action="run" class="icon play_arrow">) with an
 * identical-looking Live Server button — for .html / .htm files only. Other file types keep
 * Acode's own run button.
 * Our span carries NO `action` attribute, so Acode's header click handler never sees it.
 */
import { isHtmlFile, getActiveFile } from '../utils/paths.js';

let btn = null;
let timer = null;

function injectCss() {
  if (document.getElementById('ls-run-css')) return;
  const s = document.createElement('style');
  s.id = 'ls-run-css';
  s.textContent = `
body.ls-html-file [action="run"]:not([data-ls-run]) { display: none !important; }
[data-ls-run] { display: none; }
body.ls-html-file [data-ls-run] { display: inline-block; }
`;
  document.head.appendChild(s);
}

const HEADER = '#root > header.tile';

function findOriginal() {
  return (
    document.querySelector(HEADER + ' > span.icon.play_arrow[action="run"]') ||
    document.querySelector('[action="run"]:not([data-ls-run])')
  );
}

function onClick(e) {
  e.preventDefault();
  e.stopPropagation();
  import('../server/runPreview.js').then((m) => m.runPreview()).catch((err) => console.warn('[LiveServer] run', err));
}

export function refreshRunButton() {
  injectCss();
  document.body.classList.toggle('ls-html-file', isHtmlFile(getActiveFile()));
  const orig = findOriginal();
  if (!btn) {
    btn = document.createElement('span');
    btn.className = 'icon play_arrow';
    btn.setAttribute('data-ls-run', '1');
    btn.setAttribute('title', 'Run with Live Server');
    btn.addEventListener('click', onClick);
  }
  if (orig) {
    // look identical to the original
    btn.className = orig.className.replace(/\bhide\b/, '').trim() || 'icon play_arrow';
    if (orig.getAttribute('style')) btn.setAttribute('style', orig.getAttribute('style'));
    else btn.style.fontSize = '1.2em';
    btn.style.removeProperty('display');
    if (btn.parentNode !== orig.parentNode || btn.nextSibling !== orig) orig.parentNode.insertBefore(btn, orig);
  } else if (!btn.isConnected && isHtmlFile(getActiveFile())) {
    // Acode has no run button right now — add ours to the header like the C/C++ plugin does
    const header = document.querySelector(HEADER);
    if (header) {
      btn.className = 'icon play_arrow';
      btn.style.fontSize = '1.2em';
      header.insertBefore(btn, header.lastChild);
    }
  }
}

export function registerRunButton() {
  refreshRunButton();
  clearInterval(timer);
  // Acode may re-create its header buttons; keep ours next to the original
  timer = setInterval(refreshRunButton, 1500);
}

export function unregisterRunButton() {
  clearInterval(timer);
  timer = null;
  try {
    btn?.remove();
  } catch (_) {}
  btn = null;
  document.body.classList.remove('ls-html-file');
  document.getElementById('ls-run-css')?.remove();
}
