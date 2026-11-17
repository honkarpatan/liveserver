/**
 * Desktop Chrome/Firefox-style bottom-left shadowy mini status indicator
 * + global top green progress bar for hidden background terminal tasks.
 */

let pillEl = null;
let textEl = null;
let dotEl = null;
let topBarEl = null;
let hideTimer = null;

function injectStatusPillCss() {
  if (document.getElementById('ls-status-pill-css')) return;
  const s = document.createElement('style');
  s.id = 'ls-status-pill-css';
  s.textContent = `
    #ls-status-pill {
      position: fixed;
      left: 8px;
      bottom: 8px;
      z-index: 100001;
      max-width: min(82vw, 440px);
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 5px 10px;
      border-radius: 4px;
      background: var(--secondary-color, rgba(28, 30, 34, 0.94));
      color: var(--primary-text-color, var(--color, #e8eaed));
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.3);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.3;
      pointer-events: none;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.18s ease, transform 0.18s ease;
    }
    #ls-status-pill.is-visible {
      opacity: 0.96;
      transform: translateY(0);
    }
    .ls-sp-dot {
      width: 7px;
      height: 7px;
      min-width: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px rgba(34, 197, 94, 0.9);
    }
    .ls-sp-dot.is-spin {
      animation: ls-sp-pulse 0.9s ease-in-out infinite alternate;
    }
    @keyframes ls-sp-pulse {
      from { opacity: 0.4; transform: scale(0.85); }
      to { opacity: 1; transform: scale(1.15); }
    }
    .ls-sp-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Global top green progress bar (shown when installing in background) */
    #ls-global-green-loader {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      z-index: 100002;
      overflow: hidden;
      pointer-events: none;
      display: none;
      background: rgba(34, 197, 94, 0.15);
    }
    #ls-global-green-loader.is-active {
      display: block;
    }
    #ls-global-green-loader::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      width: 35%;
      background: linear-gradient(90deg, #16a34a, #4ade80, #22c55e);
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.85);
      animation: ls-green-slide 1.15s ease-in-out infinite;
    }
    @keyframes ls-green-slide {
      0% { left: -35%; }
      100% { left: 100%; }
    }
  `;
  document.head.appendChild(s);
}

function ensurePill() {
  injectStatusPillCss();
  if (!pillEl || !pillEl.isConnected) {
    pillEl = document.createElement('div');
    pillEl.id = 'ls-status-pill';
    dotEl = document.createElement('span');
    dotEl.className = 'ls-sp-dot';
    textEl = document.createElement('span');
    textEl.className = 'ls-sp-text';
    pillEl.append(dotEl, textEl);
    document.body.appendChild(pillEl);
  }
  return pillEl;
}

/**
 * Toggle the green loading progress bar (both in-browser toolbar and global top bar).
 */
export function setGreenLoader(active) {
  injectStatusPillCss();
  const on = !!active;
  document.body.classList.toggle('ls-green-loading', on);
  document.querySelectorAll('.ls-browser-shell').forEach((el) => {
    el.classList.toggle('is-installing', on);
  });

  if (!topBarEl || !topBarEl.isConnected) {
    topBarEl = document.createElement('div');
    topBarEl.id = 'ls-global-green-loader';
    document.body.appendChild(topBarEl);
  }
  topBarEl.classList.toggle('is-active', on);
}

/**
 * Show or update the bottom-left mini status pill.
 * @param {string} message
 * @param {{ spin?: boolean, autoHideMs?: number }} [opts]
 */
export function showStatusPill(message, opts = {}) {
  clearTimeout(hideTimer);
  const el = ensurePill();
  if (textEl) textEl.textContent = String(message || '');
  if (dotEl) dotEl.classList.toggle('is-spin', opts.spin !== false);

  requestAnimationFrame(() => {
    el.classList.add('is-visible');
  });

  if (opts.autoHideMs && opts.autoHideMs > 0) {
    hideTimer = setTimeout(() => {
      hideStatusPill(0);
    }, opts.autoHideMs);
  }
}

export function hideStatusPill(delayMs = 0) {
  clearTimeout(hideTimer);
  const doHide = () => {
    if (pillEl) pillEl.classList.remove('is-visible');
  };
  if (delayMs > 0) {
    hideTimer = setTimeout(doHide, delayMs);
  } else {
    doHide();
  }
}

export function destroyStatusPill() {
  clearTimeout(hideTimer);
  setGreenLoader(false);
  try {
    pillEl?.remove();
    topBarEl?.remove();
  } catch (_) {}
  pillEl = null;
  textEl = null;
  dotEl = null;
  topBarEl = null;
}