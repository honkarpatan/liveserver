/**
 * Live Server v2 — Acode plugin entry
 */
import plugin from '../plugin.json';
import { initPlugin, destroyPlugin } from './core/initPlugin.js';
import { buildNativeSettings } from './core/nativeSettings.js';

class LiveServerPlugin {
  constructor() {
    this.baseUrl = '';
  }

  async init(baseUrl) {
    this.baseUrl = baseUrl?.endsWith?.('/') ? baseUrl : `${baseUrl || ''}/`;
    await initPlugin(this.baseUrl);
  }

  async destroy() {
    destroyPlugin();
  }
}

if (window.acode) {
  const p = new LiveServerPlugin();
  acode.setPluginInit(
    plugin.id,
    async (baseUrl) => {
      p.baseUrl = baseUrl?.endsWith?.('/') ? baseUrl : `${baseUrl || ''}/`;
      await p.init(p.baseUrl);
    },
    // 3rd argument = settings page under Acode: Settings -> Plugins -> Live Server
    buildNativeSettings()
  );
  acode.setPluginUnmount(plugin.id, () => {
    p.destroy();
  });
}

export default LiveServerPlugin;
