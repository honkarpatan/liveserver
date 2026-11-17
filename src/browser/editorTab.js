/**
 * Editor-tab display mode.
 * Uses Acode's EditorFile with type "custom": the shell element is passed as
 * `content` and is rendered inside the tab (Shadow DOM), so the stylesheet MUST
 * be passed via `stylesheets` — document.head styles do not reach it.
 */
let seq = 0;

function getEditorFileClass() {
  for (const name of ['editorFile', 'EditorFile']) {
    try {
      const C = acode.require(name);
      if (typeof C === 'function') return C;
    } catch (_) {}
  }
  return null;
}

/**
 * @param {HTMLElement} el  browser shell element
 * @param {{title?: string, css?: string, onClose?: () => void}} [opts]
 */
export async function mountInEditorTab(el, opts = {}) {
  const EditorFile = getEditorFileClass();
  if (!EditorFile) return null;

  el.classList.add('is-in-tab');
  const title = opts.title || 'Live Preview';
  const id = 'liveserver-preview-' + Date.now() + '-' + ++seq;

  let file = null;
  const attempts = [
    { type: 'custom', content: el, stylesheets: opts.css ? [opts.css] : [], hideQuickTools: true, id, render: true },
    { type: 'page', content: el, stylesheets: opts.css ? [opts.css] : [], id, render: true },
  ];
  for (const o of attempts) {
    try {
      file = new EditorFile(title, o);
      break;
    } catch (e) {
      console.warn('[LiveServer] EditorFile ' + o.type, e);
      file = null;
    }
  }
  if (!file) {
    el.classList.remove('is-in-tab');
    return null;
  }

  let done = false;
  const handleClose = () => {
    if (done) return;
    done = true;
    try {
      opts.onClose?.();
    } catch (_) {}
  };
  try {
    file.on?.('close', handleClose);
  } catch (_) {}
  try {
    file.onclose = handleClose;
  } catch (_) {}

  return {
    file,
    show() {
      if (done) return;
      try {
        file.makeActive?.();
      } catch (_) {}
    },
    close() {
      if (done) return;
      done = true;
      try {
        file.remove?.(true);
      } catch (_) {
        try {
          file.remove?.();
        } catch (_) {}
      }
    },
    onFullscreen() {},
    setAppearance() {},
  };
}