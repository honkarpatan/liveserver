/**
 * Suger DevTool (https://github.com/Sou6900/suger-devtool) loader.
 * The engine ships inside the plugin zip as devtool/suger-dev.js and is handed to the
 * previewed page through the page bridge (postMessage) — no CDN, no copy into Alpine.
 */
import { getPluginBase } from '../core/baseUrl.js';

const REL = 'devtool/suger-dev.js';
let cached = null;

export async function loadDevtoolCode() {
  if (cached) return cached;
  const url = getPluginBase() + REL;
  try {
    const fsOp = acode.require('fsOperation');
    const txt = await fsOp(url).readFile('utf8');
    if (txt && txt.length > 1000) return (cached = String(txt));
  } catch (e) {
    console.warn('[LiveServer] devtool via fsOperation', e);
  }
  try {
    const res = await fetch(url);
    if (res.ok) {
      const txt = await res.text();
      if (txt.length > 1000) return (cached = txt);
    }
  } catch (e) {
    console.warn('[LiveServer] devtool via fetch', e);
  }
  return null;
}

export function resetDevtoolCache() {
  cached = null;
}
