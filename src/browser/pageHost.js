/**
 * Hosts the browser inside a real Acode Page (acode.require('page')).
 * - Acode's own page header (<header class="tile"> with back arrow + title) is hidden, the browser
 *   draws its own chrome edge to edge.
 * - Acode's Page does not push itself onto the action stack, so we do it here: the hardware back
 *   button behaves like on any Acode page (closes the page), but first lets the browser dismiss
 *   an open menu / find bar / fullscreen (opts.onBack returns true when it handled the press).
 */
let seq = 0;

/**
 * @param {HTMLElement} el   browser shell element
 * @param {{title?: string, onClose?: () => void, onBack?: () => boolean}} [opts]
 * @returns {{close: () => void, onFullscreen: (on: boolean) => void, page: any}}
 */
export function mountInPage(el, opts = {}) {
  const Page = acode.require('page');
  const actionStack = acode.require('actionStack');
  const id = 'liveserver-browser-page-' + ++seq;

  const back = document.createElement('span');
  back.className = 'icon arrow_back';
  back.dataset.action = 'back';
  back.style.cssText = 'pointer-events:auto;cursor:pointer;';

  const page = Page(opts.title || 'Live Preview', { lead: back });
  const body = page.body || page;
  const hdr = page.header || page.querySelector?.('header');
  if (hdr) hdr.style.display = 'none'; // no Acode header
  // body fills the whole page now that the header is gone
  Object.assign(body.style, {
    position: 'absolute',
    inset: '0',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    width: 'auto',
    height: 'auto',
    padding: '0',
    margin: '0',
    overflow: 'hidden',
  });

  el.classList.add('is-in-page');
  if (typeof page.appendBody === 'function') page.appendBody(el);
  else body.appendChild(el);

  let done = false;
  function finish(notify) {
    if (done) return;
    done = true;
    try {
      window.removeEventListener('resize', onResize);
    } catch (_) {}
    try {
      actionStack.remove(id);
    } catch (_) {}
    try {
      page.hide?.();
    } catch (_) {}
    try {
      page.remove?.();
    } catch (_) {}
    if (notify) {
      try {
        opts.onClose?.();
      } catch (_) {}
    }
  }

  back.onclick = (e) => {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
    } catch (_) {}
    finish(true);
  };
  // page hidden by Acode itself
  try {
    page.onhide = () => finish(true);
  } catch (_) {}
  const handleBack = () => {
    let handled = false;
    try {
      handled = !!opts.onBack?.();
    } catch (_) {}
    if (handled) {
      // actionStack.pop() removed our entry before calling us — put it back
      try {
        actionStack.push({ id, action: handleBack });
      } catch (_) {}
      return;
    }
    finish(true);
  };
  try {
    actionStack.push({ id, action: handleBack });
  } catch (_) {}

  (window.app || document.body).append(page);

  // the page must be a positioning context for the absolute body
  try {
    if (getComputedStyle(page).position === 'static') {
      Object.assign(page.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    }
  } catch (_) {}

  // ---- appearance: opacity + overlay (see-through, editor stays usable underneath)
  let savedCss = null;
  const editorRect = () => {
    try {
      const c = window.editorManager?.container;
      const r = c?.getBoundingClientRect?.();
      if (r && r.width > 0 && r.height > 0) return r;
    } catch (_) {}
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  };
  const place = () => {
    const r = editorRect();
    page.style.left = r.left + 'px';
    page.style.top = r.top + 'px';
    page.style.width = r.width + 'px';
    page.style.height = r.height + 'px';
  };
  const onResize = () => {
    if (savedCss != null) place();
  };
  window.addEventListener('resize', onResize);

  return {
    page,
    setAppearance({ overlay, opacity }) {
      if (overlay) {
        if (savedCss == null) savedCss = page.style.cssText;
        Object.assign(page.style, {
          position: 'fixed',
          background: 'transparent',
          pointerEvents: 'none',
          opacity: '1',
        });
        place();
        body.style.background = 'transparent';
      } else {
        if (savedCss != null) {
          page.style.cssText = savedCss;
          savedCss = null;
        }
        body.style.background = '';
        page.style.opacity = opacity < 1 ? String(opacity) : '';
      }
    },
    close: () => {
      window.removeEventListener('resize', onResize);
      finish(false);
    },
    onFullscreen() {}, // header is already hidden; the shell goes position:fixed itself
  };
}
