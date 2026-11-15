/**
 * Category settings hub (C++/Java style)
 */
import { defaultSettings } from './settingsDefaults.js';
import { getPluginId, getSettings, updateSetting } from './settings.js';

const Page = acode.require('page');
const actionStack = acode.require('actionStack');
const select = acode.require('select');
const prompt = acode.require('prompt');

const PAGE_STACK_PREFIX = 'liveserver-settings-';
let activeBody = null;
let activeListFn = null;
let activeStackId = null;

function val(key) {
  const s = getSettings();
  return s[key] !== undefined ? s[key] : defaultSettings[key];
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function displayValue(item) {
  const s = getSettings();
  if (item.checkbox) return !!s[item.key];
  if (item.select) {
    const cur = s[item.key] !== undefined ? s[item.key] : item.value;
    const opt = (item.select || []).find((o) => (Array.isArray(o) ? o[0] : o.value) === cur);
    return opt ? (Array.isArray(opt) ? opt[1] : opt.text || opt.value) : String(cur ?? '');
  }
  const v = s[item.key] !== undefined ? s[item.key] : item.value;
  return v === '' || v == null ? '' : String(v);
}

function subCb(key, value) {
  updateSetting(key, value);
  if (activeBody && activeListFn) renderList(activeBody, activeListFn());
}

function renderList(body, list) {
  const s = getSettings();
  let html = '<section class="settings-section"><div class="settings-section-card">';
  for (const item of list) {
    const key = item.key;
    const isCheck = !!item.checkbox;
    const isSelect = !!(item.select && Array.isArray(item.select));
    const isCat = typeof key === 'string' && key.startsWith('__cat_');
    const isAction =
      !!item.actionOnly ||
      (typeof key === 'string' && (key.startsWith('__deps_') || key.startsWith('__action_')));
    const checked = isCheck && !!s[key];
    const info = item.info
      ? `<small class="value setting-info">${escapeHtml(item.info)}</small>`
      : '';
    let classes = 'list-item no-leading-icon';
    if (item.info) classes += ' has-subtitle';
    if (!isCheck) classes += isSelect ? ' has-tail-value has-tail-select' : ' has-tail-value';

    let tail = '';
    if (isCheck) {
      tail = `<div class="setting-tail"><label class="input-checkbox switch">
        <input type="checkbox" data-key="${escapeHtml(key)}"${checked ? ' checked' : ''}>
        <span class="box"><span class="handle"></span></span></label></div>`;
    } else if (isSelect) {
      tail = `<div class="setting-tail"><div class="setting-value-display is-select">
        <small class="setting-trailing-value is-select">${escapeHtml(displayValue(item))}</small>
        <span class="icon keyboard_arrow_down setting-value-icon"></span></div></div>`;
    } else {
      tail = `<div class="setting-tail"><span class="icon keyboard_arrow_right settings-chevron"></span></div>`;
    }

    const dataType = isCheck ? 'check' : isSelect ? 'select' : isCat ? 'cat' : isAction ? 'action' : 'prompt';
    html += `<div tabindex="0" data-key="${escapeHtml(key)}" data-type="${dataType}" data-action="list-item" class="${classes}" role="button">
      <span class="icon no-icon"></span>
      <div class="container"><div class="text">${escapeHtml(item.text || key)}</div>${info}</div>${tail}</div>`;
  }
  html += '</div></section>';
  body.innerHTML = html;

  body.querySelectorAll('.list-item[data-action="list-item"]').forEach((row) => {
    row.addEventListener('click', async () => {
      const key = row.getAttribute('data-key');
      const type = row.getAttribute('data-type');
      const item = list.find((x) => x.key === key);
      if (!item) return;

      if (type === 'cat') {
        openCategory(key);
        return;
      }
      if (type === 'action') {
        if (key === '__deps_check') {
          import('../deps/dependencyChecker.js')
            .then((m) => m.checkDependenciesAction())
            .catch(console.warn);
          return;
        }
        if (key === '__deps_reinstall') {
          import('../deps/dependencyChecker.js')
            .then((m) => m.reinstallDependenciesAction())
            .catch(console.warn);
          return;
        }
        if (key === '__action_select_root') {
          import('../server/rootFolder.js')
            .then((m) => m.pickRootFolder())
            .catch(console.warn);
          return;
        }
        if (key === '__action_status') {
          import('../server/status.js').then(async (m) => {
            const st = m.getServerStatus();
            const toast = acode.require('toast');
            if (!st.running) toast('Not running', 2000);
            else toast((st.url || '') + ' · port ' + st.port, 3500);
            try { await m.refreshStatusFromBackend(); } catch (_) {}
          });
          return;
        }
        if (key === '__action_start') {
          import('../server/process.js').then((m) => m.startServer()).catch(console.warn);
          return;
        }
        if (key === '__action_stop') {
          import('../server/process.js').then((m) => m.stopServer()).catch(console.warn);
          return;
        }
        if (key === '__action_open_browser') {
          import('../server/status.js').then(async (st) => {
            const s = st.getServerStatus();
            const toast = acode.require('toast');
            if (!s.running) return toast('Server is not running', 2000);
            const { openBrowser } = await import('../browser/index.js');
            openBrowser(s.url || ('http://127.0.0.1:' + s.port + '/'));
          }).catch(console.warn);
          return;
        }
        return;
      }
      if (type === 'select' && item.select) {
        const choice = await select(item.text || key, item.select, {
          hideOnSelect: true,
          default: val(key),
        });
        if (choice != null) subCb(key, choice);
        return;
      }
      if (item.promptType || item.prompt) {
        const cur = val(key);
        const result = await prompt(
          item.prompt || item.text || key,
          cur == null ? '' : String(cur),
          item.promptType === 'number' ? 'number' : item.promptType === 'textarea' ? 'textarea' : 'text'
        );
        if (result != null) {
          let out = result;
          if (item.promptType === 'number') {
            const n = parseInt(String(result), 10);
            out = Number.isFinite(n) ? n : result;
          }
          subCb(key, out);
        }
      }
    });
  });

  body.querySelectorAll('label.input-checkbox input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', (e) => {
      e.stopPropagation();
      subCb(input.getAttribute('data-key'), !!input.checked);
    });
    input.addEventListener('click', (e) => e.stopPropagation());
  });
}

const CATEGORIES = {
  __cat_general: { title: 'General', list: generalList },
  __cat_browser: { title: 'Browser', list: browserList },
  __cat_html: { title: 'HTML / static', list: htmlList },
  __cat_security: { title: 'Security', list: securityList },
  __cat_deps: { title: 'Dependencies', list: depsList },
};

function hubList() {
  return [
    { key: '__cat_general', text: 'General', value: '›', info: 'Port, root, start/stop' },
    { key: '__cat_browser', text: 'Browser', value: '›', info: 'In page or editor tab' },
    { key: '__cat_html', text: 'HTML / static', value: '›' },
    { key: '__cat_security', text: 'Security', value: '›' },
    { key: '__cat_deps', text: 'Dependencies', value: '›', info: 'Node / npm / backend' },
  ];
}

function generalList() {
  return [
    {
      key: '__action_status',
      text: 'Server status',
      actionOnly: true,
      value: '›',
      info: 'Show running URL / port',
    },
    {
      key: 'port',
      text: 'Port',
      value: val('port'),
      promptType: 'number',
      info: 'Default 8080',
    },
    {
      key: 'bindAddress',
      text: 'Bind address',
      value: val('bindAddress'),
      select: [
        ['127.0.0.1', 'Localhost only (127.0.0.1)'],
        ['0.0.0.0', 'All interfaces (0.0.0.0)'],
      ],
    },
    {
      key: 'rootFolder',
      text: 'Root folder',
      value: val('rootFolder') || '(active file folder)',
      promptType: 'text',
      info: 'Empty = folder of active HTML file',
    },
    { key: '__action_select_root', text: 'Select root folder…', actionOnly: true, value: '›' },
    { key: 'liveReload', text: 'Live reload on save', checkbox: true },
    { key: 'openBrowserOnStart', text: 'Open browser on start', checkbox: true },
    {
      key: 'autoShutdownMinutes',
      text: 'Auto shutdown (minutes, 0=off)',
      value: val('autoShutdownMinutes'),
      promptType: 'number',
    },
    { key: '__action_start', text: 'Start server', actionOnly: true, value: '›' },
    { key: '__action_stop', text: 'Stop server', actionOnly: true, value: '›' },
    { key: '__action_open_browser', text: 'Open browser', actionOnly: true, value: '›' },
  ];
}

function browserList() {
  return [
    {
      key: 'browserDisplayMode',
      text: 'Show browser in',
      value: val('browserDisplayMode'),
      select: [
        ['inPage', 'Page (default)'],
        ['editorTab', 'Editor tab'],
      ],
      info: 'In-page overlay or Acode editor tab',
    },
    { key: 'showAddressBar', text: 'Show address bar', checkbox: true },
    { key: 'showSideButton', text: 'Show side button', checkbox: true },
  ];
}

function htmlList() {
  return [
    { key: 'directoryListing', text: 'Enable directory listing', checkbox: true },
    { key: 'enableCors', text: 'Enable CORS', checkbox: true },
    {
      key: 'customCharset',
      text: 'Custom charset',
      value: val('customCharset'),
      promptType: 'text',
    },
    {
      key: 'customHeaders',
      text: 'Custom response headers',
      value: val('customHeaders') || '',
      promptType: 'textarea',
      info: 'One Header: value per line',
    },
  ];
}

function securityList() {
  return [
    { key: 'bindLocalhostOnly', text: 'Prefer localhost bind', checkbox: true },
    {
      key: 'ipWhitelist',
      text: 'Client IP whitelist',
      value: val('ipWhitelist') || '',
      promptType: 'textarea',
      info: 'Comma or newline separated; empty = all',
    },
    {
      key: 'basicAuthUser',
      text: 'Basic auth user',
      value: val('basicAuthUser') || '',
      promptType: 'text',
    },
    {
      key: 'basicAuthPass',
      text: 'Basic auth password',
      value: val('basicAuthPass') || '',
      promptType: 'text',
    },
  ];
}

function depsList() {
  return [
    {
      key: '__deps_check',
      text: 'Check dependencies',
      actionOnly: true,
      value: '›',
      info: 'Verify node / npm / backend modules',
    },
    {
      key: '__deps_reinstall',
      text: 'Reinstall dependencies',
      actionOnly: true,
      value: '›',
    },
  ];
}

function openCategory(key) {
  const cat = CATEGORIES[key];
  if (!cat) return;
  openPage(cat.title, cat.list, PAGE_STACK_PREFIX + key);
}

function openPage(title, listFn, stackId) {
  const back = document.createElement('span');
  back.className = 'icon arrow_back';
  back.dataset.action = 'back';
  back.style.cssText = 'pointer-events:auto;cursor:pointer;';
  const page = Page(title, { lead: back });
  try {
    page.classList.add('detail-settings-page', 'liveserver-settings-page');
  } catch (_) {}
  const body = document.createElement('div');
  body.className = 'main liveserver-settings-body';
  body.style.cssText = 'overflow:auto;height:100%';
  try {
    page.appendBody(body);
  } catch (_) {
    page.appendChild?.(body);
  }

  const close = () => {
    try {
      page.hide?.();
      page.parentElement?.removeChild(page);
    } catch (_) {}
    try {
      actionStack.remove(stackId);
    } catch (_) {}
    if (activeStackId === stackId) {
      activeBody = null;
      activeListFn = null;
      activeStackId = null;
    }
  };

  back.onclick = (e) => {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
    } catch (_) {}
    close();
  };

  try {
    actionStack.push({ id: stackId, action: close });
  } catch (_) {}

  activeBody = body;
  activeListFn = listFn;
  activeStackId = stackId;
  renderList(body, listFn());

  try {
    const app = document.body;
    app.appendChild(page);
    page.show?.();
  } catch (_) {
    try {
      document.body.appendChild(page);
    } catch (__) {}
  }
}

export function openSettingsHub() {
  openPage('Live Server', hubList, PAGE_STACK_PREFIX + 'hub');
}

export function registerPluginSettings() {
  try {
    acode.registerPluginSetting(
      {
        id: getPluginId(),
        name: 'Live Server',
        list: [
          {
            key: '__open_hub',
            text: 'Open Live Server settings',
            info: 'Categories: server, browser, deps…',
          },
        ],
        cb(key) {
          if (key === '__open_hub') openSettingsHub();
        },
      },
      defaultSettings,
      getSettings()
    );
  } catch (e) {
    // Fallback: some builds use different API
    try {
      const settings = acode.require('settings');
      settings.ui?.push?.({
        key: getPluginId(),
        text: 'Live Server',
        icon: 'public',
        onclick: () => openSettingsHub(),
      });
    } catch (_) {
      console.warn('[LiveServer] settings register', e);
    }
  }
}
