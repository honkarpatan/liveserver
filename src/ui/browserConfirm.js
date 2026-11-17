/**
 * Reusable Acode-themed confirmation modal API.
 * Obeys Acode CSS variables (--secondary-color, --primary-color, --color, --active-color).
 * Can be reused anywhere in the plugin for future confirmations.
 */

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function injectConfirmCss() {
  if (document.getElementById('ls-confirm-css')) return;
  const s = document.createElement('style');
  s.id = 'ls-confirm-css';
  s.textContent = `
    .ls-cfm-overlay {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(2px);
      animation: ls-cfm-in 0.16s ease-out;
    }
    @keyframes ls-cfm-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .ls-cfm-card {
      width: min(400px, 92vw);
      max-height: 82vh;
      display: flex;
      flex-direction: column;
      border-radius: 6px;
      background: var(--secondary-color, #1e1e1e);
      color: var(--primary-text-color, var(--color, #e8eaed));
      border: 1px solid var(--border-color, rgba(128, 128, 128, 0.28));
      box-shadow: 0 14px 42px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      font-family: inherit;
    }
    .ls-cfm-head {
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--border-color, rgba(128, 128, 128, 0.2));
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ls-cfm-badge {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.75);
      flex-shrink: 0;
    }
    .ls-cfm-badge.is-danger {
      background: #ef4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.75);
    }
    .ls-cfm-title {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.3;
    }
    .ls-cfm-body {
      padding: 12px 16px;
      overflow-y: auto;
      font-size: 13px;
      line-height: 1.45;
    }
    .ls-cfm-msg {
      margin: 0;
      opacity: 0.92;
    }
    .ls-cfm-list {
      margin: 10px 0 0;
      padding: 8px 10px;
      list-style: none;
      border-radius: 4px;
      background: var(--primary-color, rgba(0, 0, 0, 0.22));
      border: 1px solid var(--border-color, rgba(128, 128, 128, 0.18));
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ls-cfm-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 12.5px;
    }
    .ls-cfm-item-name {
      font-weight: 500;
    }
    .ls-cfm-item-tag {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(34, 197, 94, 0.16);
      color: #4ade80;
    }
    .ls-cfm-details {
      margin-top: 10px;
      font-size: 11.5px;
      opacity: 0.72;
    }
    .ls-cfm-foot {
      padding: 10px 14px;
      border-top: 1px solid var(--border-color, rgba(128, 128, 128, 0.2));
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .ls-cfm-btn {
      border: 0;
      border-radius: 4px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .ls-cfm-btn:active {
      opacity: 0.85;
    }
    .ls-cfm-cancel {
      background: rgba(128, 128, 128, 0.2);
      color: inherit;
    }
    .ls-cfm-ok {
      background: var(--active-color, #22c55e);
      color: #0b1116;
    }
    .ls-cfm-ok.is-danger {
      background: #ef4444;
      color: #fff;
    }
  `;
  document.head.appendChild(s);
}

let activeModal = null;

export function closeBrowserConfirm() {
  if (activeModal) {
    activeModal(false);
    activeModal = null;
  }
}

/**
 * Show an Acode-themed confirmation dialog.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {Array<{name: string, tag?: string}|string>} [opts.items]
 * @param {string} [opts.details]
 * @param {string} [opts.confirmText='Confirm']
 * @param {string} [opts.cancelText='Cancel']
 * @param {boolean} [opts.danger=false]
 * @param {boolean} [opts.dismissOnBackdrop=true]
 * @returns {Promise<boolean>}
 */
export function browserConfirm(opts = {}) {
  injectConfirmCss();
  closeBrowserConfirm();

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'ls-cfm-overlay';

    const itemsHtml =
      Array.isArray(opts.items) && opts.items.length
        ? `<ul class="ls-cfm-list">${opts.items
            .map((it) => {
              const name = typeof it === 'string' ? it : it.name;
              const tag = typeof it === 'object' && it.tag ? `<span class="ls-cfm-item-tag">${escapeHtml(it.tag)}</span>` : '';
              return `<li class="ls-cfm-item"><span class="ls-cfm-item-name">${escapeHtml(name)}</span>${tag}</li>`;
            })
            .join('')}</ul>`
        : '';

    const detailsHtml = opts.details
      ? `<div class="ls-cfm-details">${escapeHtml(opts.details)}</div>`
      : '';

    overlay.innerHTML = `
      <div class="ls-cfm-card" role="dialog" aria-modal="true">
        <div class="ls-cfm-head">
          <span class="ls-cfm-badge ${opts.danger ? 'is-danger' : ''}"></span>
          <div class="ls-cfm-title">${escapeHtml(opts.title || 'Confirm')}</div>
        </div>
        <div class="ls-cfm-body">
          <p class="ls-cfm-msg">${escapeHtml(opts.message || '')}</p>
          ${itemsHtml}
          ${detailsHtml}
        </div>
        <div class="ls-cfm-foot">
          <button type="button" class="ls-cfm-btn ls-cfm-cancel">${escapeHtml(opts.cancelText || 'Cancel')}</button>
          <button type="button" class="ls-cfm-btn ls-cfm-ok ${opts.danger ? 'is-danger' : ''}">${escapeHtml(opts.confirmText || 'Install')}</button>
        </div>
      </div>
    `;

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey, true);
      try {
        overlay.remove();
      } catch (_) {}
      if (activeModal === finish) activeModal = null;
      resolve(!!result);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        finish(true);
      }
    };

    activeModal = finish;
    document.addEventListener('keydown', onKey, true);

    overlay.querySelector('.ls-cfm-cancel').addEventListener('click', () => finish(false));
    overlay.querySelector('.ls-cfm-ok').addEventListener('click', () => finish(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && opts.dismissOnBackdrop !== false) finish(false);
    });

    document.body.appendChild(overlay);
  });
}