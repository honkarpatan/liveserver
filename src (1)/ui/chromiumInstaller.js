/**
 * Desktop-style Chromium Installer Modal for Alpine / Termux in Acode.
 * Features:
 *  - Obeys Acode CSS theme variables (--secondary-color, --primary-color, --color, --active-color)
 *  - Center popup offer when page loading exceeds 10 seconds
 *  - Live Linux installation progress bar with percentage (0% - 100%)
 *  - Prominent "Don't close Acode" notice
 *  - Collapsible "Show more" terminal output log
 *  - Working "Cancel installation" button that terminates background apk/pkg process
 */
import { silentExec, silentExecScript, getExecutor } from '../utils/alpineExec.js';
import { updateSetting } from '../core/settings.js';

const toast = acode.require('toast');

let modalEl = null;
let isInstalling = false;
let isCancelled = false;
let pollTimer = null;
let progressTimer = null;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function injectInstallerCss() {
  if (document.getElementById('ls-chromium-installer-css')) return;
  const s = document.createElement('style');
  s.id = 'ls-chromium-installer-css';
  s.textContent = `
    .ls-ci-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100010;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.58);
      backdrop-filter: blur(3px);
      animation: ls-ci-fade 0.18s ease-out;
    }
    @keyframes ls-ci-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
.ls-ci-window {
  width: min(440px, 94vw);
  max-height: 84vh;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: var(--popup-background-color, var(--secondary-color, #1e1f22));
  color: var(--popup-text-color, var(--primary-text-color, var(--color, #e8eaed)));
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.28));
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.52);
  overflow: hidden;
  font-family: inherit;
}

    .ls-ci-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 16px;
      background: var(--primary-color, rgba(0, 0, 0, 0.25));
      border-bottom: 1px solid var(--border-color, rgba(128, 128, 128, 0.22));
    }
    .ls-ci-title-left {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
    }
    .ls-ci-dots {
      display: inline-flex;
      gap: 5px;
      flex-shrink: 0;
    }
    .ls-ci-dots span {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      display: inline-block;
    }
    .ls-ci-dots span:nth-child(1) { background: #ef4444; }
    .ls-ci-dots span:nth-child(2) { background: #f59e0b; }
    .ls-ci-dots span:nth-child(3) { background: #22c55e; }
    .ls-ci-title {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ls-ci-body {
      padding: 14px 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-size: 13px;
      line-height: 1.45;
    }
    .ls-ci-desc {
      margin: 0;
      opacity: 0.92;
    }
    .ls-ci-pkg-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 6px;
      background: var(--primary-color, rgba(0, 0, 0, 0.2));
      border: 1px solid var(--border-color, rgba(128, 128, 128, 0.2));
    }
    .ls-ci-pkg-name {
      font-weight: 600;
      font-size: 13px;
    }
    .ls-ci-pkg-sub {
      font-size: 11.5px;
      opacity: 0.72;
      margin-top: 2px;
    }
    .ls-ci-pkg-size {
      font-size: 11.5px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(34, 197, 94, 0.16);
      color: #4ade80;
      white-space: nowrap;
    }
    .ls-ci-warn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 11px;
      border-radius: 5px;
      background: rgba(245, 158, 11, 0.14);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
      font-size: 12px;
      font-weight: 500;
    }
    .ls-ci-prog-wrap {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .ls-ci-prog-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 12.5px;
    }
    .ls-ci-step {
      opacity: 0.9;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ls-ci-pct {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--active-color, #22c55e);
      flex-shrink: 0;
    }
    .ls-ci-track {
      width: 100%;
      height: 8px;
      border-radius: 99px;
      background: var(--primary-color, rgba(128, 128, 128, 0.25));
      overflow: hidden;
      border: 1px solid var(--border-color, rgba(128, 128, 128, 0.2));
    }
    .ls-ci-fill {
      height: 100%;
      width: 0%;
      border-radius: 99px;
      background: linear-gradient(90deg, #16a34a, #22c55e, #4ade80);
      transition: width 0.3s ease;
    }
    .ls-ci-more-toggle {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: 0;
      padding: 2px 0;
      color: var(--active-color, #61afef);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .ls-ci-console {
      margin: 0;
      padding: 10px;
      max-height: 150px;
      overflow-y: auto;
      border-radius: 5px;
      background: #0d1117;
      color: #c9d1d9;
      border: 1px solid rgba(128, 128, 128, 0.25);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .ls-ci-console[hidden] {
      display: none;
    }
    .ls-ci-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 11px 16px;
      background: var(--primary-color, rgba(0, 0, 0, 0.18));
      border-top: 1px solid var(--border-color, rgba(128, 128, 128, 0.22));
    }
    .ls-ci-btn {
      border: 0;
      border-radius: 5px;
      padding: 8px 14px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .ls-ci-btn:active { opacity: 0.85; }
    .ls-ci-btn-sec {
      background: rgba(128, 128, 128, 0.22);
      color: inherit;
    }
    .ls-ci-btn-pri {
  background: var(--active-color, #22c55e);
  color: var(--button-text-color, #0b1116);
}
    .ls-ci-btn-danger {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
  `;
  document.head.appendChild(s);
}

function stopTimers() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

async function abortBackgroundInstall() {
  isCancelled = true;
  stopTimers();
  try {
    await silentExec(
      'pkill -9 -f "apk add" 2>/dev/null || true; ' +
      'pkill -9 -f "pkg install" 2>/dev/null || true; ' +
      'pkill -9 -f "apt-get" 2>/dev/null || true; ' +
      'rm -f /tmp/ls-chromium-install.log 2>/dev/null || true',
      { timeoutMs: 8000 }
    );
  } catch (_) {}
}

export function closeChromiumInstallerModal() {
  stopTimers();
  if (modalEl) {
    try {
      modalEl.remove();
    } catch (_) {}
    modalEl = null;
  }
}

export function isChromiumInstallerOpen() {
  return !!modalEl;
}

/**
 * Show the center desktop-style popup offering Chromium installation (or jump directly to install).
 * @param {object} [opts]
 * @param {string} [opts.url] - The slow URL that triggered the prompt
 * @param {boolean} [opts.startImmediately=false] - Skip offer screen and start installing immediately
 * @param {() => void} [opts.onInstalled] - Callback fired when Chromium finishes installing
 * @param {() => void} [opts.onDismiss] - Callback fired if user clicks Not Now / cancels
 * @returns {Promise<boolean>} true if Chromium was installed
 */
export function showChromiumInstallerPopup(opts = {}) {
  if (modalEl) return Promise.resolve(false);
  injectInstallerCss();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      closeChromiumInstallerModal();
      if (ok) {
        try { opts.onInstalled?.(); } catch (_) {}
      } else {
        try { opts.onDismiss?.(); } catch (_) {}
      }
      resolve(!!ok);
    };

    const backdrop = document.createElement('div');
    backdrop.className = 'ls-ci-backdrop';

    const hostLabel = (() => {
      try {
        return opts.url ? new URL(opts.url).hostname : 'this website';
      } catch (_) {
        return 'this website';
      }
    })();

    backdrop.innerHTML = `
      <div class="ls-ci-window" role="dialog" aria-modal="true">
        <div class="ls-ci-titlebar">
          <div class="ls-ci-title-left">
            <span class="ls-ci-dots"><span></span><span></span><span></span></span>
            <span class="ls-ci-title">Chromium Browser Engine</span>
          </div>
        </div>

        <div class="ls-ci-body">
          <!-- Offer View -->
          <div class="ls-ci-offer-view">
            <p class="ls-ci-desc">
              <strong>${escapeHtml(hostLabel)}</strong> is taking longer than 10 seconds in lightweight proxy mode. Install <strong>Chromium</strong> in Alpine Linux to render complex JavaScript sites smoothly.
            </p>
            <div class="ls-ci-pkg-card" style="margin-top:10px;">
              <div>
                <div class="ls-ci-pkg-name">chromium + headless fonts</div>
                <div class="ls-ci-pkg-sub">Alpine / Termux package (optional)</div>
              </div>
              <span class="ls-ci-pkg-size">~180 MB</span>
            </div>
          </div>

          <!-- Progress View -->
          <div class="ls-ci-progress-view" hidden>
            <div class="ls-ci-warn">
              <span>⚠</span>
              <span>Don't close Acode while Chromium is installing.</span>
            </div>

            <div class="ls-ci-prog-wrap" style="margin-top:10px;">
              <div class="ls-ci-prog-top">
                <span class="ls-ci-step">Preparing Linux environment...</span>
                <span class="ls-ci-pct">0%</span>
              </div>
              <div class="ls-ci-track">
                <div class="ls-ci-fill"></div>
              </div>
            </div>

            <button type="button" class="ls-ci-more-toggle" style="margin-top:10px;">
              <span class="ls-ci-arrow">▸</span>
              <span class="ls-ci-more-label">Show more</span>
            </button>
            <pre class="ls-ci-console" hidden></pre>
          </div>
        </div>

        <div class="ls-ci-footer">
          <button type="button" class="ls-ci-btn ls-ci-btn-sec ls-ci-notnow">Not Now</button>
          <button type="button" class="ls-ci-btn ls-ci-btn-pri ls-ci-install">Install Chromium</button>
          <button type="button" class="ls-ci-btn ls-ci-btn-danger ls-ci-cancel" hidden>Cancel installation</button>
          <button type="button" class="ls-ci-btn ls-ci-btn-pri ls-ci-done" hidden>Reload Page</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    modalEl = backdrop;

    const offerView = backdrop.querySelector('.ls-ci-offer-view');
    const progView = backdrop.querySelector('.ls-ci-progress-view');
    const stepEl = backdrop.querySelector('.ls-ci-step');
    const pctEl = backdrop.querySelector('.ls-ci-pct');
    const fillEl = backdrop.querySelector('.ls-ci-fill');
    const moreBtn = backdrop.querySelector('.ls-ci-more-toggle');
    const arrowEl = backdrop.querySelector('.ls-ci-arrow');
    const moreLabel = backdrop.querySelector('.ls-ci-more-label');
    const consoleEl = backdrop.querySelector('.ls-ci-console');

    const notNowBtn = backdrop.querySelector('.ls-ci-notnow');
    const installBtn = backdrop.querySelector('.ls-ci-install');
    const cancelBtn = backdrop.querySelector('.ls-ci-cancel');
    const doneBtn = backdrop.querySelector('.ls-ci-done');

    let currentPct = 0;
    const setProgress = (pct, stepText) => {
      currentPct = Math.max(0, Math.min(100, Math.round(pct)));
      if (pctEl) pctEl.textContent = currentPct + '%';
      if (fillEl) fillEl.style.width = currentPct + '%';
      if (stepText && stepEl) stepEl.textContent = stepText;
    };

    const appendLog = (line) => {
      if (!consoleEl) return;
      consoleEl.textContent += line;
      consoleEl.scrollTop = consoleEl.scrollHeight;
    };

    // Collapsible "Show more" toggle
    moreBtn?.addEventListener('click', () => {
      const isHidden = consoleEl.hasAttribute('hidden');
      if (isHidden) {
        consoleEl.removeAttribute('hidden');
        arrowEl.textContent = '▾';
        moreLabel.textContent = 'Show less';
        consoleEl.scrollTop = consoleEl.scrollHeight;
      } else {
        consoleEl.setAttribute('hidden', '');
        arrowEl.textContent = '▸';
        moreLabel.textContent = 'Show more';
      }
    });

    notNowBtn?.addEventListener('click', () => finish(false));
    doneBtn?.addEventListener('click', () => finish(true));

    cancelBtn?.addEventListener('click', async () => {
      cancelBtn.disabled = true;
      cancelBtn.textContent = 'Cancelling...';
      setProgress(currentPct, 'Cancelling installation...');
      appendLog('\n[abort] Terminating package manager process...\n');
      await abortBackgroundInstall();
      isInstalling = false;
      toast('Chromium installation cancelled', 2000);
      finish(false);
    });

    async function startInstall() {
      if (isInstalling) return;
      if (!getExecutor()?.execute) {
        toast('Open Acode Terminal once to initialize Alpine Linux', 3500);
        finish(false);
        return;
      }

      isInstalling = true;
      isCancelled = false;

      offerView.setAttribute('hidden', '');
      progView.removeAttribute('hidden');
      notNowBtn.setAttribute('hidden', '');
      installBtn.setAttribute('hidden', '');
      cancelBtn.removeAttribute('hidden');

      setProgress(4, 'Detecting Linux package manager...');
      appendLog('$ Detecting package manager (apk / pkg / apt)...\n');

      try {
        const pmOut = await silentExec(
          'if command -v apk >/dev/null 2>&1; then echo APK; elif command -v pkg >/dev/null 2>&1; then echo PKG; elif command -v apt-get >/dev/null 2>&1; then echo APT; else echo NONE; fi',
          { timeoutMs: 10000 }
        );
        if (isCancelled) return;

        const pm = String(pmOut || '').trim();
        if (pm === 'NONE' || !pm) {
          appendLog('[error] No supported package manager found.\n');
          setProgress(0, 'Package manager not found');
          cancelBtn.textContent = 'Close';
          cancelBtn.disabled = false;
          cancelBtn.onclick = () => finish(false);
          isInstalling = false;
          return;
        }

        // Step 1: Update repository index
        setProgress(15, 'Updating package repositories...');
        if (pm === 'APK') {
          appendLog('$ apk update\n');
          const upd = await silentExec('apk update 2>&1', { timeoutMs: 60000 });
          appendLog(String(upd || '').slice(-1200) + '\n');
        } else if (pm === 'PKG') {
          appendLog('$ pkg update -y\n');
          const upd = await silentExec('pkg update -y 2>&1', { timeoutMs: 60000 });
          appendLog(String(upd || '').slice(-1200) + '\n');
        } else {
          appendLog('$ apt-get update -y\n');
          const upd = await silentExec('apt-get update -y 2>&1', { timeoutMs: 60000 });
          appendLog(String(upd || '').slice(-1200) + '\n');
        }
        if (isCancelled) return;

        // Step 2: Install Chromium + fonts + NSS with live log tailing & smooth % progression
        setProgress(28, 'Downloading & installing chromium...');
        await silentExec(': > /tmp/ls-chromium-install.log', { timeoutMs: 5000 });

        let lastLen = 0;
        pollTimer = setInterval(async () => {
          if (isCancelled) return;
          try {
            const logTxt = await silentExec('cat /tmp/ls-chromium-install.log 2>/dev/null || true', {
              timeoutMs: 4000,
            });
            const s = String(logTxt || '');
            if (s.length > lastLen) {
              const delta = s.slice(lastLen);
              lastLen = s.length;
              appendLog(delta);
              const lastLine = delta
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)
                .pop();
              if (lastLine && stepEl) {
                stepEl.textContent = lastLine.slice(0, 48);
              }
            }
          } catch (_) {}
        }, 1200);

        progressTimer = setInterval(() => {
          if (isCancelled) return;
          if (currentPct < 88) {
            const bump = currentPct < 55 ? 3 : currentPct < 75 ? 2 : 1;
            setProgress(currentPct + bump);
          }
        }, 1400);

        let installScript = '';
        if (pm === 'APK') {
          appendLog('$ apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont\n');
          installScript = `#!/bin/sh
set +e
apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont >> /tmp/ls-chromium-install.log 2>&1
echo "[exit:$?]" >> /tmp/ls-chromium-install.log
`;
        } else if (pm === 'PKG') {
          appendLog('$ pkg install -y x11-repo && pkg install -y chromium\n');
          installScript = `#!/bin/sh
set +e
pkg install -y x11-repo >> /tmp/ls-chromium-install.log 2>&1
pkg install -y chromium >> /tmp/ls-chromium-install.log 2>&1
echo "[exit:$?]" >> /tmp/ls-chromium-install.log
`;
        } else {
          appendLog('$ apt-get install -y chromium fonts-liberation\n');
          installScript = `#!/bin/sh
set +e
DEBIAN_FRONTEND=noninteractive apt-get install -y chromium fonts-liberation >> /tmp/ls-chromium-install.log 2>&1
echo "[exit:$?]" >> /tmp/ls-chromium-install.log
`;
        }

        await silentExecScript(installScript, { timeoutMs: 0 });
        stopTimers();
        if (isCancelled) return;

        // Read final log tail
        try {
          const finalLog = await silentExec('cat /tmp/ls-chromium-install.log 2>/dev/null; rm -f /tmp/ls-chromium-install.log', {
            timeoutMs: 6000,
          });
          const s = String(finalLog || '');
          if (s.length > lastLen) appendLog(s.slice(lastLen));
        } catch (_) {}

        setProgress(95, 'Verifying Chromium binary...');
        const binCheck = await silentExec(
          'command -v chromium 2>/dev/null || command -v chromium-browser 2>/dev/null || echo MISS',
          { timeoutMs: 8000 }
        );
        const binPath = String(binCheck || '').trim();
        const ok = !!binPath && !binPath.includes('MISS') && binPath.includes('/');

        updateSetting('chromiumInstalled', ok);

        if (ok) {
          setProgress(100, 'Chromium installed successfully!');
          appendLog(`\n✓ Installed at: ${binPath}\n`);
          updateSetting('externalSiteMode', 'chromium');
          cancelBtn.setAttribute('hidden', '');
          doneBtn.removeAttribute('hidden');
          toast('Chromium installed!', 2500);
        } else {
          setProgress(currentPct, 'Installation failed — check details');
          appendLog('\n✗ Chromium binary not found after install.\n');
          consoleEl.removeAttribute('hidden');
          arrowEl.textContent = '▾';
          moreLabel.textContent = 'Show less';
          cancelBtn.textContent = 'Close';
          cancelBtn.disabled = false;
          cancelBtn.onclick = () => finish(false);
        }
      } catch (err) {
        stopTimers();
        if (!isCancelled) {
          appendLog(`\n[error] ${err?.message || err}\n`);
          setProgress(currentPct, 'Installation error');
          cancelBtn.textContent = 'Close';
          cancelBtn.onclick = () => finish(false);
        }
      } finally {
        isInstalling = false;
      }
    }

    installBtn?.addEventListener('click', startInstall);

    if (opts.startImmediately) {
      startInstall();
    }
  });
}