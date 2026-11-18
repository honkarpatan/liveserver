import { getSettings } from '../core/settings.js';

export function getConfiguredPort() {
  const p = parseInt(getSettings().port, 10);
  return Number.isFinite(p) && p > 0 ? p : 8080;
}

export function buildServerUrl(port, bind) {
  const host = bind === '0.0.0.0' ? '127.0.0.1' : bind || '127.0.0.1';
  return `http://${host}:${port}/`;
}
