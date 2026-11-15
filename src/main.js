/**
 * Live Server v2 — Acode plugin entry
 */
import plugin from '../plugin.json';
import { initPlugin, destroyPlugin } from './core/initPlugin.js';

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
  acode.setPluginInit(plugin.id, async (baseUrl) => {
    p.baseUrl = baseUrl?.endsWith?.('/') ? baseUrl : `${baseUrl || ''}/`;
    await p.init(p.baseUrl);
  });
  acode.setPluginUnmount(plugin.id, () => {
    p.destroy();
  });
}

export default LiveServerPlugin;
