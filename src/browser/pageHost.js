/**
 * Hosts the browser inside a real Acode Page (acode.require('page')).
 * Minimizes (hides) on hardware back so open tabs & searched pages stay intact,
 * and destroys only when explicitly closed via Close / Exit.
 */
let seq = 0;

/**
 * @param {HTMLElement} el   browser shell element
 * @param {{title?: string, onClose?: () => void, onBack?: () => boolean}} [opts]
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
  if (hdr) hdr.style.display = 'none';

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
  let savedCss = null;

  const handleBack = () => {
    let handled = false;
    try {
      handled = !!opts.onBack?.();
    } catch (_) {}
    if (handled) {
      try {
        actionStack.remove(id);
        actionStack.push({ id, action: handleBack });
      } catch (_) {}
      return;
    }
    minimize();
  };

  function pushBackHandler() {
    try {
      actionStack.remove(id);
      actionStack.push({ id, action: handleBack });
    } catch (_) {}
  }

  function minimize() {
    if (done) return;
    try {
      actionStack.remove(id);
    } catch (_) {}
    try {
      page.style.display = 'none';
    } catch (_) {}
  }

  function show() {
    if (done) return;
    try {
      page.style.display = '';
      if (!page.isConnected) {
        (window.app || document.body).append(page);
      }
      page.show?.();
    } catch (_) {}
    pushBackHandler();
  }

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
    minimize();
  };

  // When Acode hides the page (e.g. switching context), keep tabs alive instead of destroying them
  try {
    page.onhide = () => {
      if (!done) minimize();
    };
  } catch (_) {}

  (window.app || document.body).append(page);

  try {
    if (getComputedStyle(page).position === 'static') {
      Object.assign(page.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    }
  } catch (_) {}

  try {
    page.show?.();
  } catch (_) {}
  pushBackHandler();

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
    show,
    minimize,
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
    onFullscreen() {},
  };
}