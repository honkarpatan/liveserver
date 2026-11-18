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

/** Acode URI for active file folder when path is content:// based */
export function getEffectiveRootUri() {
  const s = getSettings();
  if (s.rootFolderUri && String(s.rootFolderUri).trim()) return String(s.rootFolderUri).trim();
  const f = getActiveFile();
  const uri = f?.uri || f?.url || '';
  if (!uri) return null;
  if (uri.includes('::')) {
    // tree::doc → keep tree part as folder context
    const base = uri.split('::')[0];
    return base;
  }
  const fs = uriToFsPath(uri);
  return fs ? dirnamePath(fs) : null;
}

/**
 * Open Acode file browser to pick a folder (same UX as other plugins).
 */
export async function browseRootFolder() {
  try {
    const FileBrowser = acode.require('fileBrowser');
    if (!FileBrowser) {
      toast('File browser not available', 2000);
      return null;
    }
    const res = await FileBrowser('folder', 'Select Live Server root');
    if (!res) return null;
    const url = res.url || res.uri || res;
    const fs = uriToFsPath(typeof url === 'string' ? url : url?.url || '') || String(url);
    updateSetting('rootFolder', fs);
    try {
      updateSetting('rootFolderUri', typeof url === 'string' ? url : url?.url || fs);
    } catch (_) {}
    toast('Root: ' + fs, 2500);
    return fs;
  } catch (e) {
    toast(String(e?.message || e), 2500);
    return null;
  }
}

/**
 * Pick root: use active file folder, type path, browse, or clear to auto
 */
export async function pickRootFolder() {
  try {
    const cur = getSettings().rootFolder || '';
    const active = getActiveFile();
    const activeDir = dirnamePath(uriToFsPath(active?.uri || active?.url || '') || '') || '';

    const options = [
      ['browse', 'Browse with Acode file browser…'],
      ['active', activeDir ? `Use active file folder\n${activeDir}` : 'Use active file folder'],
      ['type', 'Type path…'],
      ['clear', 'Clear (auto from active HTML)'],
    ];
    if (cur) options.splice(1, 0, ['keep', `Keep current\n${cur}`]);

    const choice = await select('Select root folder', options, { hideOnSelect: true });
    if (!choice || choice === 'keep') return cur || null;

    if (choice === 'browse') return browseRootFolder();

    if (choice === 'active') {
      if (!activeDir) {
        toast('Open an HTML file first', 2000);
        return null;
      }
      updateSetting('rootFolder', activeDir);
      try {
        updateSetting('rootFolderUri', active?.uri || active?.url || '');
      } catch (_) {}
      toast('Root: ' + activeDir, 2200);
      return activeDir;
    }

    if (choice === 'clear') {
      updateSetting('rootFolder', '');
      try {
        updateSetting('rootFolderUri', '');
      } catch (_) {}
      toast('Root cleared — will use active file folder', 2200);
      return null;
    }

    if (choice === 'type') {
      const typed = await prompt('Absolute folder path', cur || activeDir || '/sdcard/', 'text');
      if (!typed) return null;
      const path = String(typed).trim();
      updateSetting('rootFolder', path);
      toast('Root: ' + path, 2200);
      return path;
    }
    return null;
  } catch (e) {
    toast(String(e?.message || e), 2500);
    return null;
  }
}

/** Selected / opened folder from Acode if available */
export function rootFromSelectedFolder() {
  try {
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
