/**
 * Desktop Linux-themed Dependencies Checker & Installer Popup.
 * Matches Chromium Installer UI & follows Acode's active CSS color theme.
 */
import { injectDepsPickerCss } from './injectDepsCss.js';

let root = null;
let resolvePromise = null;
let cancelled = false;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

export function isDepsPickerOpen() {
  return !!root;
}

export function wasInstallCancelled() {
  return cancelled;
}

export function resetInstallCancel() {
  cancelled = false;
}

/**
 * @returns {Promise<{ action: string, selected?: string[] }>}
 */
export function openDepsPicker(opts = {}) {
  injectDepsPickerCss();
  closeDepsPicker(true);
  cancelled = false;

  const title = opts.title || 'Live Server Dependencies';
  const subtitle = opts.subtitle || 'Checking Alpine Linux packages...';
  const items = Array.isArray(opts.items) ? opts.items.slice() : [];

  return new Promise((resolve) => {
    resolvePromise = resolve;
    root = document.createElement('div');
    root.id = 'ls-deps-picker';
    root.innerHTML = `
      <div class="ls-dp-backdrop"></div>
      <div class="ls-dp-card" role="dialog" aria-modal="true">
        <div class="ls-dp-titlebar">
          <div class="ls-dp-title-left">
            <span class="ls-dp-dots"><span></span><span></span><span></span></span>
            <div class="ls-dp-title">${escapeHtml(title)}</div>
          </div>
        </div>
        <div class="ls-dp-subbar ls-dp-subtitle">${escapeHtml(subtitle)}</div>

        <div class="ls-dp-body">
          <div class="ls-dp-checking" style="display:${opts.checking ? 'flex' : 'none'}">
            <span class="ls-dp-spinner"></span>
            <span>Scanning Alpine environment...</span>
          </div>

          <div class="ls-dp-lists" style="display:${opts.checking ? 'none' : 'block'}"></div>

          <div class="ls-dp-progress" style="display:none">
            <div class="ls-dp-warn">
              <span>⚠</span>
              <span>Don't close Acode while packages are installing.</span>
            </div>

            <div class="ls-dp-prog-top">
              <div class="ls-dp-progress-info">Preparing installation...</div>
              <span class="ls-dp-pct">0%</span>
            </div>

            <div class="ls-dp-progress-track">
              <div class="ls-dp-progress-bar" style="width:0%"></div>
            </div>

            <button type="button" class="ls-dp-link ls-dp-toggle-log">
              <span class="ls-dp-arrow">▸</span>
              <span class="ls-dp-more-label">Show more</span>
            </button>
            <pre class="ls-dp-log" style="display:none"></pre>
          </div>
        </div>

        <div class="ls-dp-footer">
          <button type="button" class="ls-dp-btn ls-dp-notnow">Not now</button>
          <button type="button" class="ls-dp-btn ls-dp-cancel" style="display:none">Cancel installation</button>
          <button type="button" class="ls-dp-btn ls-dp-install">Install selected</button>
          <button type="button" class="ls-dp-btn ls-dp-done" style="display:none">Close</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    const listsEl = root.querySelector('.ls-dp-lists');
    const checkingEl = root.querySelector('.ls-dp-checking');
    const progressEl = root.querySelector('.ls-dp-progress');
    const barEl = root.querySelector('.ls-dp-progress-bar');
    const pctEl = root.querySelector('.ls-dp-pct');
    const infoEl = root.querySelector('.ls-dp-progress-info');
    const logEl = root.querySelector('.ls-dp-log');
    const installBtn = root.querySelector('.ls-dp-install');
    const notNowBtn = root.querySelector('.ls-dp-notnow');
    const cancelBtn = root.querySelector('.ls-dp-cancel');
    const doneBtn = root.querySelector('.ls-dp-done');
    const toggleLog = root.querySelector('.ls-dp-toggle-log');
    const arrowEl = root.querySelector('.ls-dp-arrow');
    const moreLabel = root.querySelector('.ls-dp-more-label');
    const subtitleEl = root.querySelector('.ls-dp-subtitle');
    const backdrop = root.querySelector('.ls-dp-backdrop');

    function renderLists() {
      if (!listsEl) return;
      let html = '';
      for (const it of items) {
        const status = it.present
          ? '<span class="ls-dp-status ok">installed</span>'
          : it.optional
            ? '<span class="ls-dp-status opt">optional</span>'
            : '<span class="ls-dp-status miss">missing</span>';
        const isChecked = it.checked != null ? !!it.checked : !it.present && !it.optional;
        html += `<label class="ls-dp-row ${it.present ? 'is-present' : 'is-missing'}">
          <input type="checkbox" data-id="${escapeHtml(it.id)}" ${isChecked ? 'checked' : ''} ${it.present ? 'disabled' : ''}/>
          <span class="ls-dp-row-main">
            <span class="ls-dp-name">${escapeHtml(it.label)}</span>
            <span class="ls-dp-desc">${escapeHtml(it.desc || '')}</span>
          </span>${status}</label>`;
      }
      listsEl.innerHTML = html || '<div class="ls-dp-empty">No items</div>';
    }

    function getSelected() {
      const selected = [];
      root
        ?.querySelectorAll('input[type=checkbox][data-id]:checked:not(:disabled)')
        .forEach((el) => selected.push(el.getAttribute('data-id')));
      return selected;
    }

    function finishAndClose(action) {
      const selected = getSelected();
      const r = resolvePromise;
      resolvePromise = null;
      closeDepsPicker(false);
      if (r) r({ action, selected });
    }

    function beginInstall() {
      const selected = getSelected();
      if (!selected.length) {
        try {
          acode.require('toast')('Select at least one item', 2000);
        } catch (_) {}
        return;
      }
      cancelled = false;
      if (listsEl) listsEl.style.display = 'none';
      if (checkingEl) checkingEl.style.display = 'none';
      if (progressEl) progressEl.style.display = 'flex';
      if (installBtn) installBtn.style.display = 'none';
      if (notNowBtn) notNowBtn.style.display = 'none';
      if (cancelBtn) cancelBtn.style.display = 'inline-block';
      if (doneBtn) doneBtn.style.display = 'none';
      if (barEl) barEl.style.width = '2%';
      if (pctEl) pctEl.textContent = '2%';
      if (infoEl) infoEl.textContent = 'Initializing package installer...';
      if (logEl) logEl.textContent = '';
      if (subtitleEl) subtitleEl.textContent = 'Installing selected packages in Alpine Linux...';

      const r = resolvePromise;
      resolvePromise = null;
      if (r) r({ action: 'install', selected, keepOpen: true });
    }

    installBtn?.addEventListener('click', () => beginInstall());
    notNowBtn?.addEventListener('click', () => finishAndClose('notnow'));
    cancelBtn?.addEventListener('click', () => {
      cancelled = true;
      if (infoEl) infoEl.textContent = 'Cancelled';
      finishAndClose('cancel');
    });
    doneBtn?.addEventListener('click', () => finishAndClose('done'));
    backdrop?.addEventListener('click', () => {
      if (progressEl && progressEl.style.display !== 'none' && cancelBtn?.style.display !== 'none') {
        return;
      }
      finishAndClose('close');
    });
    toggleLog?.addEventListener('click', () => {
      if (!logEl) return;
      const open = logEl.style.display !== 'none';
      logEl.style.display = open ? 'none' : 'block';
      if (arrowEl) arrowEl.textContent = open ? '▸' : '▾';
      if (moreLabel) moreLabel.textContent = open ? 'Show more' : 'Show less';
      if (!open) logEl.scrollTop = logEl.scrollHeight;
    });

    root._lsDpUpdate = (status) => {
      if (status.checking === false && checkingEl && listsEl) {
        checkingEl.style.display = 'none';
        listsEl.style.display = 'block';
      }
      if (status.checking === true && checkingEl && listsEl) {
        checkingEl.style.display = 'flex';
        listsEl.style.display = 'none';
      }
      if (status.subtitle != null && subtitleEl) subtitleEl.textContent = status.subtitle;
      if (Array.isArray(status.items)) {
        items.length = 0;
        status.items.forEach((it) =>
          items.push({
            ...it,
            checked: it.checked != null ? !!it.checked : !it.present && !it.optional,
          })
        );
        renderLists();
      }
      if (status.progressMode) {
        if (listsEl) listsEl.style.display = 'none';
        if (checkingEl) checkingEl.style.display = 'none';
        if (progressEl) progressEl.style.display = 'flex';
        if (installBtn) installBtn.style.display = 'none';
        if (notNowBtn) notNowBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = status.showDone ? 'none' : 'inline-block';
        if (doneBtn) doneBtn.style.display = status.showDone ? 'inline-block' : 'none';
      }
      if (typeof status.percent === 'number') {
        const clamped = Math.max(0, Math.min(100, Math.round(status.percent)));
        if (barEl) barEl.style.width = clamped + '%';
        if (pctEl) pctEl.textContent = clamped + '%';
      }
      if (status.info && infoEl) infoEl.textContent = status.info;
      if (status.logAppend && logEl) {
        logEl.textContent += status.logAppend;
        logEl.scrollTop = logEl.scrollHeight;
      }
      if (status.logSet != null && logEl) {
        logEl.textContent = status.logSet;
      }
    };

    renderLists();
  });
}

export function updateDepsPicker(status) {
  if (root && typeof root._lsDpUpdate === 'function') root._lsDpUpdate(status);
}

export function closeDepsPicker(immediate) {
  if (!root) return;
  const el = root;
  root = null;
  resolvePromise = null;
  try {
    el.classList.add('ls-dp-leaving');
  } catch (_) {}
  const remove = () => {
    try {
      el.remove();
    } catch (_) {}
  };
  if (immediate) remove();
  else setTimeout(remove, 180);
}