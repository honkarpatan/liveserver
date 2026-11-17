import { defaultSettings } from './settingsDefaults.js';

const PLUGIN_ID = 'acode.plugin.sugerserver';

export function getPluginId() {
  return PLUGIN_ID;
}

export function getSettings() {
  try {
    const app = acode.require('settings');
    let v = app?.value?.[PLUGIN_ID];
    if (!v || typeof v !== 'object') {
      v = { ...defaultSettings };
      if (app?.value) app.value[PLUGIN_ID] = v;
    }
    return v;
  } catch (_) {
    return { ...defaultSettings };
  }
}

export function updateSetting(key, value) {
  const s = getSettings();
  s[key] = value;
  try {
    acode.require('settings').update(false);
  } catch (_) {}
  try {
    window.dispatchEvent(
      new CustomEvent('liveserver-settings', { detail: { key, value } })
    );
  } catch (_) {}
}

export function saveSettingsPatch(patch) {
  const s = getSettings();
  Object.assign(s, patch);
  try {
    acode.require('settings').update(false);
  } catch (_) {}
}
