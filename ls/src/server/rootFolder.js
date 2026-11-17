import { getSettings, updateSetting } from '../core/settings.js';
import { getActiveFile, uriToFsPath, dirnamePath } from '../utils/paths.js';

const toast = acode.require('toast');
const select = acode.require('select');
const prompt = acode.require('prompt');

export function getEffectiveRoot() {
  const s = getSettings();
  if (s.rootFolder && String(s.rootFolder).trim()) return String(s.rootFolder).trim();
  const f = getActiveFile();
  const fs = uriToFsPath(f?.uri || f?.url || '');
  if (fs) return dirnamePath(fs);
  return null;
}

/**
 * Pick root: use active file folder, type path, or clear to auto
 */
export async function pickRootFolder() {
  try {
    const cur = getSettings().rootFolder || '';
    const active = getActiveFile();
    const activeDir = dirnamePath(uriToFsPath(active?.uri || active?.url || '') || '') || '';

    const options = [
      ['active', activeDir ? `Use active file folder` : 'Use active file folder (open a file first)'],
      ['type', 'Type absolute path…'],
      ['clear', 'Clear (auto from active HTML)'],
    ];
    if (cur) options.unshift(['keep', 'Keep: ' + cur]);

    const choice = await select('Server root folder', options, {
      hideOnSelect: true,
      default: cur ? 'keep' : activeDir ? 'active' : 'type',
    });
    if (choice == null) return null;

    if (choice === 'keep') return cur;

    if (choice === 'clear') {
      updateSetting('rootFolder', '');
      toast('Root: auto (active file folder)', 2000);
      return '';
    }

    if (choice === 'active') {
      if (!activeDir) {
        toast('Open a file first', 2000);
        return null;
      }
      updateSetting('rootFolder', activeDir);
      toast('Root: ' + activeDir, 2500);
      try {
        const { getServerStatus } = await import('./status.js');
        const { reapplySetup, startServer } = await import('./process.js');
        if (getServerStatus().running) await reapplySetup();
      } catch (_) {}
      return activeDir;
    }

    // type path
    const pathVal = await prompt(
      'Absolute folder path',
      cur || activeDir || '/data/data/com.termux/files/home',
      'text'
    );
    if (pathVal == null) return null;
    const p = String(pathVal).trim();
    if (!p) {
      toast('Empty path', 1500);
      return null;
    }
    updateSetting('rootFolder', p);
    toast('Root folder saved', 1500);
    try {
      const { getServerStatus } = await import('./status.js');
      const { reapplySetup } = await import('./process.js');
      if (getServerStatus().running) await reapplySetup();
    } catch (_) {}
    return p;
  } catch (e) {
    toast('Could not set root: ' + (e?.message || e), 2500);
    return null;
  }
}

/** Root from file browser selection context if available */
export function rootFromSelectedFolder() {
  try {
    // Some Acode builds expose selected folder on window / file browser
    const sel =
      window.fileBrowser?.selectedFolder ||
      window.addedFolder?.[0]?.url ||
      null;
    if (sel) {
      const fs = uriToFsPath(sel);
      return fs || sel;
    }
  } catch (_) {}
  return null;
}
