/**
 * One-tap "run": start (or reuse) the server for the active HTML file and show it in the browser.
 */
import { getActiveFile, isHtmlFile } from '../utils/paths.js';
import { startServer } from './process.js';

const toast = acode.require('toast');
let busy = false;

export async function runPreview(file) {
  if (busy) return false;
  busy = true;
  try {
    const f = file || getActiveFile();
    if (!isHtmlFile(f)) {
      toast('Open an .html / .htm file first', 2000);
      return false;
    }
    // run what the user sees, not what is on disk
    if (f.isUnsaved && (f.uri || f.url)) {
      try {
        await f.save?.();
      } catch (e) {
        console.warn('[LiveServer] save before run', e);
      }
    }
    return await startServer({ openBrowser: true });
  } catch (e) {
    toast(String(e?.message || e), 3000);
    return false;
  } finally {
    busy = false;
  }
}