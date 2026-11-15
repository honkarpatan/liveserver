/**
 * Editor-tab display mode — host browser chrome inside an Acode EditorFile / page tab
 */
import { svgIcon, ICONS } from '../utils/svg.js';

let editorFileRef = null;
let hostEl = null;

export function isEditorTabOpen() {
  return !!editorFileRef || !!hostEl;
}

/**
 * Try Acode EditorFile API; fallback returns null
 * @returns {Promise<{ file: any, body: HTMLElement } | null>}
 */
export async function openEditorTabHost(title = 'Live Preview') {
  closeEditorTabHost();
  try {
    const EditorFile = acode.require('editorFile');
    if (typeof EditorFile !== 'function') return null;

    // Common patterns across Acode versions
    let file;
    try {
      file = new EditorFile(title, { type: 'single', render: true });
    } catch (_) {
      try {
        file = new EditorFile(title);
      } catch (e2) {
        console.warn('[LiveServer] EditorFile', e2);
        return null;
      }
    }

    editorFileRef = file;
    // Wait a tick for tab DOM
    await new Promise((r) => setTimeout(r, 50));

    const body = document.createElement('div');
    body.className = 'ls-editor-tab-host';
    body.style.cssText =
      'display:flex;flex-direction:column;height:100%;width:100%;min-height:0;background:var(--secondary-color,#1e1e1e);';

    // Attach into editor content area
    const container =
      file.content ||
      file.container ||
      file.tab?.content ||
      document.querySelector('.editor-container .active') ||
      null;

    if (container && container.appendChild) {
      try {
        container.innerHTML = '';
        container.appendChild(body);
      } catch (_) {
        document.body.appendChild(body);
      }
    } else {
      // Page API fallback
      try {
        const Page = acode.require('page');
        const page = Page(title, { lead: null });
        page.appendBody?.(body);
        page.show?.();
        file._lsPage = page;
      } catch (_) {
        return null;
      }
    }

    hostEl = body;
    try {
      file.onclose = () => {
        hostEl = null;
        editorFileRef = null;
      };
    } catch (_) {}

    return { file, body };
  } catch (e) {
    console.warn('[LiveServer] editorTab', e);
    return null;
  }
}

export function getEditorTabBody() {
  return hostEl;
}

export function closeEditorTabHost() {
  try {
    if (editorFileRef?.remove) editorFileRef.remove(true);
    else if (editorFileRef?.close) editorFileRef.close();
  } catch (_) {}
  try {
    editorFileRef?._lsPage?.hide?.();
  } catch (_) {}
  try {
    hostEl?.remove();
  } catch (_) {}
  hostEl = null;
  editorFileRef = null;
}
