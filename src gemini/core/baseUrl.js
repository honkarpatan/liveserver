/** Plugin base url (set once on init) — used to read files shipped inside the plugin zip */
let base = '';
export function setPluginBase(url) {
  base = url ? (String(url).endsWith('/') ? String(url) : url + '/') : '';
}
export function getPluginBase() {
  return base;
}
