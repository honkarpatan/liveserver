/**
 * On editor save → POST /reload if server live (backup for chokidar path issues)
 */
import { getSettings } from '../core/settings.js';
import { getServerStatus } from './status.js';
import { isHtmlFile } from '../utils/paths.js';

let saveHandler = null;

export function registerLiveReloadOnSave() {
  if (saveHandler) return;
  saveHandler = async (file) => {
    try {
      if (getSettings().liveReload === false) return;
      const st = getServerStatus();
      if (!st.running || !st.port) return;
      // Always nudge clients; static assets also benefit
      await fetch(`http://127.0.0.1:${st.port}/reload`, { method: 'POST' }).catch(() => {});
      if (isHtmlFile(file) || isHtmlFile(editorManager?.activeFile)) {
        console.log('[LiveServer] reload signal after save');
      }
    } catch (e) {
      console.warn('[LiveServer] save reload', e);
    }
  };
  try {
    editorManager?.on?.('save-file', saveHandler);
  } catch (_) {}
}

export function unregisterLiveReloadOnSave() {
  try {
    if (saveHandler) editorManager?.off?.('save-file', saveHandler);
  } catch (_) {}
  saveHandler = null;
}
