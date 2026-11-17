/**
 * Single source of truth for plugin settings.
 *  - buildNativeSettings() -> { list, cb } for acode.setPluginInit(id, init, settings)
 *    (shows up in Acode: Settings -> Plugins -> Live Server)
 *  - SCHEMA / getValue / formatValue / handleSettingChange are reused by the
 *    in-plugin settings hub (settingsPages.js).
 */
import { defaultSettings } from './settingsDefaults.js';
import { getSettings, updateSetting } from './settings.js';

const toast = acode.require('toast');

export const ACTIONS = [
  ['start', 'Start server'],
  ['stop', 'Stop server'],
  ['restart', 'Restart server'],
  ['open', 'Open browser'],
  ['root', 'Select root folder…'],
  ['status', 'Show server status'],
  ['deps', 'Check dependencies'],
  ['reinstall', 'Reinstall dependencies'],
];

export const SCHEMA = [
  // ---- Actions
  {
    key: '__action',
    category: 'Actions',
    text: 'Run action',
    info: 'Start / stop / open browser / dependencies',
    select: ACTIONS,
    noValue: true,
  },

  // ---- General
  { key: 'port', category: 'General', text: 'Port', info: 'Default 8080', prompt: 'Port number', promptType: 'number' },
  {
    key: 'bindAddress',
    category: 'General',
    text: 'Bind address',
    select: [
      ['127.0.0.1', 'Localhost only (127.0.0.1)'],
      ['0.0.0.0', 'All interfaces (0.0.0.0)'],
    ],
  },
  {
    key: 'rootFolder',
    category: 'General',
    text: 'Root folder',
    info: 'Empty = folder of the active HTML file',
    prompt: 'Absolute folder path',
    promptType: 'text',
  },
  { key: 'liveReload', category: 'General', text: 'Live reload on save', checkbox: true },
  { key: 'openBrowserOnStart', category: 'General', text: 'Open browser on start', checkbox: true },
  {
    key: 'autoShutdownMinutes',
    category: 'General',
    text: 'Auto shutdown (minutes)',
    info: '0 = off',
    prompt: 'Minutes (0 = off)',
    promptType: 'number',
  },

  // ---- Browser
  {
    key: 'browserDisplayMode',
    category: 'Browser',
    text: 'Show browser in',
    info: 'Acode page or editor tab',
    select: [
      ['inPage', 'Acode page (default)'],
      ['editorTab', 'Editor tab'],
    ],
  },
  {
    key: 'browserOpacity',
    category: 'Browser',
    text: 'Browser opacity',
    info: '0.1 - 1.0 (page mode)',
    asString: true,
    select: ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1'].map((v) => [v, v]),
  },
  {
    key: 'browserOverlay',
    category: 'Browser',
    text: 'Preview as overlay',
    info: 'See-through preview over the editor; you can still type in the editor',
    checkbox: true,
  },
  {
    key: 'overlayAutoSave',
    category: 'Browser',
    text: 'Auto-save in overlay mode',
    info: 'Saves the file after you stop typing so the preview updates live',
    checkbox: true,
  },
  { key: 'showAddressBar', category: 'Browser', text: 'Show address bar', checkbox: true },
  { key: 'showSideButton', category: 'Browser', text: 'Show side button', checkbox: true },

  // ---- HTML / static
  { key: 'directoryListing', category: 'HTML / static', text: 'Enable directory listing', checkbox: true },
  { key: 'enableCors', category: 'HTML / static', text: 'Enable CORS', checkbox: true },
  { key: 'customCharset', category: 'HTML / static', text: 'Custom charset', prompt: 'Charset', promptType: 'text' },
  {
    key: 'customHeaders',
    category: 'HTML / static',
    text: 'Custom response headers',
    info: 'One "Header: value" per line',
    prompt: 'Custom headers',
    promptType: 'textarea',
  },

  // ---- Security
  { key: 'bindLocalhostOnly', category: 'Security', text: 'Prefer localhost bind', checkbox: true },
  {
    key: 'ipWhitelist',
    category: 'Security',
    text: 'Client IP whitelist',
    info: 'Comma or newline separated; empty = all',
    prompt: 'IP whitelist',
    promptType: 'textarea',
  },
  { key: 'basicAuthUser', category: 'Security', text: 'Basic auth user', prompt: 'User name', promptType: 'text' },
  {
    key: 'basicAuthPass',
    category: 'Security',
    text: 'Basic auth password',
    prompt: 'Password',
    promptType: 'text',
    secret: true,
  },
];

export function getCategories() {
  const out = [];
  SCHEMA.forEach((it) => {
    if (!out.includes(it.category)) out.push(it.category);
  });
  return out;
}

export function getValue(key) {
  const s = getSettings();
  return s[key] !== undefined ? s[key] : defaultSettings[key];
}

/** Text shown on the right side of a row */
export function formatValue(item) {
  if (item.checkbox) return '';
  if (item.noValue) return '';
  const v = getValue(item.key);
  if (item.select) {
    const hit = item.select.find((o) => String(Array.isArray(o) ? o[0] : o) === String(v));
    return hit ? (Array.isArray(hit) ? hit[1] : hit) : String(v ?? '');
  }
  if (item.secret) return v ? '••••••' : '';
  const s = v == null ? '' : String(v);
  return s.length > 28 ? s.slice(0, 27) + '…' : s;
}

async function runAction(id) {
  try {
    if (id === 'start') {
      const m = await import('../server/process.js');
      return m.startServer();
    }
    if (id === 'stop') {
      const m = await import('../server/process.js');
      return m.stopServer();
    }
    if (id === 'restart') {
      const m = await import('../server/process.js');
      return m.restartServer();
    }
    if (id === 'open') {
      const st = await import('../server/status.js');
      const s = st.getServerStatus();
      if (!s.running) return toast('Server is not running', 2000);
      const b = await import('../browser/index.js');
      return b.openBrowser(s.url || 'http://127.0.0.1:' + s.port + '/');
    }
    if (id === 'root') {
      const m = await import('../server/rootFolder.js');
      return m.pickRootFolder();
    }
    if (id === 'status') {
      const st = await import('../server/status.js');
      const s = st.getServerStatus();
      return toast(s.running ? (s.url || '') + ' · port ' + s.port : 'Not running', 3000);
    }
    if (id === 'deps') {
      const m = await import('../deps/dependencyChecker.js');
      return m.checkDependenciesAction();
    }
    if (id === 'reinstall') {
      const m = await import('../deps/dependencyChecker.js');
      return m.reinstallDependenciesAction();
    }
  } catch (e) {
    toast(String(e?.message || e), 3000);
  }
}

/** Shared change handler (native settings page + in-plugin hub) */
export async function handleSettingChange(key, value) {
  if (key === '__action') {
    await runAction(value);
    return true;
  }
  let v = value;
  if (key === 'port') {
    const n = parseInt(String(value), 10);
    if (!Number.isFinite(n) || n < 1 || n > 65535) {
      toast('Invalid port', 1800);
      return false;
    }
    v = n;
  } else if (key === 'autoShutdownMinutes') {
    const n = parseInt(String(value), 10);
    if (!Number.isFinite(n) || n < 0) {
      toast('Invalid number', 1800);
      return false;
    }
    v = n;
  }
  else if (key === 'browserOpacity') {
    const n = parseFloat(String(value));
    v = Number.isFinite(n) ? Math.min(1, Math.max(0.1, Math.round(n * 100) / 100)) : 1;
  }
  updateSetting(key, v);

  if (key === 'showSideButton') {
    try {
      const m = await import('../ui/sideButton.js');
      if (v === false) m.unregisterSideButton();
      else m.registerSideButton();
    } catch (_) {}
  }
  return true;
}

/** { list, cb } for acode.setPluginInit(id, init, settings) */
export function buildNativeSettings() {
  const list = SCHEMA.map((it) => {
    const o = { key: it.key, text: it.text, category: it.category };
    if (it.info) o.info = it.info;
    if (it.checkbox) {
      o.checkbox = true;
      o.value = !!getValue(it.key);
    } else if (it.select) {
      o.select = it.select;
      if (it.noValue) {
        o.value = '';
        o.valueText = () => 'Choose…';
      } else {
        o.value = it.asString ? String(getValue(it.key)) : getValue(it.key);
      }
    } else if (it.prompt) {
      o.prompt = it.prompt;
      if (it.promptType) o.promptType = it.promptType;
      o.value = getValue(it.key);
      if (it.secret) o.valueText = (v) => (v ? '••••••' : '');
    }
    return o;
  });
  return {
    list,
    cb: (key, value) => {
      handleSettingChange(key, value);
    },
  };
}
