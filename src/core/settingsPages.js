/**
 * In-plugin settings hub (opened from the side-button tools menu, command palette,
 * browser menu). Same schema as the native Acode plugin settings page, but rendered
 * with its own markup + CSS so toggles always show regardless of Acode's internal CSS.
 */
import { SCHEMA, getCategories, getValue, formatValue, handleSettingChange } from './nativeSettings.js';
import { svgIcon } from '../utils/svg.js';

const Page = acode.require('page');
const actionStack = acode.require('actionStack');
const select = acode.require('select');
const prompt = acode.require('prompt');

const STACK_PREFIX = 'liveserver-settings-';
const CHEVRON = 'M9 18l6-6-6-6';

const CSS = `
.ls-set-body{height:100%;overflow:auto;padding:4px 0 24px}
.ls-set-row{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;border-bottom:1px solid rgba(128,128,128,.15)}
.ls-set-row:active{background:rgba(128,128,128,.14)}
.ls-set-main{flex:1;min-width:0}
.ls-set-title{font-size:15px}
.ls-set-info{font-size:12px;opacity:.65;margin-top:2px}
.ls-set-val{max-width:45%;font-size:12px;opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ls-set-chev{display:inline-flex;opacity:.55;flex-shrink:0}
.ls-set-switch{position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0}
.ls-set-switch::before{content:'';position:absolute;inset:0;border-radius:3px;background:rgba(128,128,128,.45);transition:background .15s}
.ls-set-switch::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:3px;background:#fff;transition:transform .15s}
.ls-set-switch.is-on::before{background:var(--active-color,#61afef)}
.ls-set-switch.is-on::after{transform:translateX(18px)}
`;

function ensureCss() {
  if (document.getElementById('ls-settings-css')) return;
  const s = document.createElement('style');
  s.id = 'ls-settings-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function mk(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

function makeRow(title, info, tail, onClick) {
  const row = mk('div', 'ls-set-row');
  row.setAttribute('role', 'button');
  row.tabIndex = 0;
  const main = mk('div', 'ls-set-main');
  main.appendChild(mk('div', 'ls-set-title', title));
  if (info) main.appendChild(mk('div', 'ls-set-info', info));
  row.appendChild(main);
  if (tail) row.appendChild(tail);
  row.addEventListener('click', onClick);
  return row;
}

function chevron() {
  const c = mk('span', 'ls-set-chev');
  c.innerHTML = svgIcon(CHEVRON, 16);
  return c;
}

async function editItem(item, refresh) {
  const cur = getValue(item.key);
  if (item.checkbox) {
    await handleSettingChange(item.key, !cur);
    return refresh();
  }
  if (item.select) {
    const choice = await select(item.text, item.select, {
      hideOnSelect: true,
      default: item.noValue ? undefined : String(cur),
    });
    if (choice != null) {
      await handleSettingChange(item.key, choice);
      refresh();
    }
    return;
  }
  if (item.prompt) {
    const type = item.promptType === 'number' ? 'number' : item.promptType === 'textarea' ? 'textarea' : 'text';
    const res = await prompt(item.prompt, cur == null ? '' : String(cur), type);
    if (res != null) {
      await handleSettingChange(item.key, res);
      refresh();
    }
  }
}

function renderHub(body, openCategory) {
  body.textContent = '';
  getCategories().forEach((cat) => {
    const count = SCHEMA.filter((i) => i.category === cat).length;
    body.appendChild(makeRow(cat, count + ' options', chevron(), () => openCategory(cat)));
  });
}

function renderCategory(body, cat, refresh) {
  body.textContent = '';
  SCHEMA.filter((i) => i.category === cat).forEach((item) => {
    let tail = null;
    if (item.checkbox) {
      tail = mk('span', 'ls-set-switch' + (getValue(item.key) ? ' is-on' : ''));
    } else {
      tail = mk('span');
      tail.style.cssText = 'display:flex;align-items:center;gap:6px;min-width:0;max-width:50%';
      const v = formatValue(item);
      if (v) tail.appendChild(mk('span', 'ls-set-val', v));
      tail.appendChild(chevron());
    }
    body.appendChild(makeRow(item.text, item.info, tail, () => editItem(item, refresh)));
  });
}

function openPage(title, render, stackId) {
  ensureCss();
  const back = document.createElement('span');
  back.className = 'icon arrow_back';
  back.dataset.action = 'back';
  back.style.cssText = 'pointer-events:auto;cursor:pointer;';

  const page = Page(title, { lead: back });
  const body = mk('div', 'ls-set-body');
  try {
    page.appendBody(body);
  } catch (_) {
    page.appendChild?.(body);
  }

  const refresh = () => render(body, refresh);

  const close = () => {
    try {
      actionStack.remove(stackId);
    } catch (_) {}
    try {
      page.hide?.();
    } catch (_) {}
    try {
      page.remove?.();
    } catch (_) {}
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

  refresh();
  try {
    (window.app || document.body).append(page);
  } catch (_) {
    document.body.append(page);
  }
  try {
    page.show?.();
  } catch (_) {}
}

export function openSettingsHub() {
  openPage(
    'Live Server',
    (body) =>
      renderHub(body, (cat) =>
        openPage(cat, (b, refresh) => renderCategory(b, cat, refresh), STACK_PREFIX + cat)
      ),
    STACK_PREFIX + 'hub'
  );
}

/**
 * Plugin settings are now registered through the 3rd argument of
 * acode.setPluginInit() (see main.js). Kept as a no-op so initPlugin.js
 * keeps working unchanged.
 */
export function registerPluginSettings() {}
