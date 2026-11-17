export const defaultSettings = {
  pluginEnabled: true,

  // Server
  port: 8080,
  bindAddress: '127.0.0.1', // or 0.0.0.0
  rootFolder: '',
  liveReload: true,
  openBrowserOnStart: true,
  directoryListing: true,
  autoShutdownMinutes: 0, // 0 = off

  // Browser
  browserDisplayMode: 'inPage', // inPage | editorTab
  browserSearchEngine: 'google', // google | duckduckgo | bing | brave
  // externalSiteMode: 'inApp', // inApp | systemBrowser
  externalSiteMode: 'acodeWebview', // acodeWebview | inApp | systemBrowser
  browserHomeUrl: '', // empty = Live Server root URL
  showSideButton: true,
  browserOpacity: 1, // 0.1 - 1.0
  browserOverlay: false, // preview as overlay: page is see-through and the editor underneath stays usable
  overlayAutoSave: true, // overlay only: save the file shortly after typing so the preview updates live
  browserBookmarks: [],
  browserDevice: { on: false, id: 'responsive', w: 390, h: 844, zoom: 'fit' },

  // CORS / headers
  enableCors: true,
  customHeaders: '',
  customCharset: 'utf-8',

  // Security (optional)
  bindLocalhostOnly: true,
  ipWhitelist: '',
  basicAuthUser: '',
  basicAuthPass: '',

  // Deps
  dependenciesInstalled: false,
  acodelsPath: '', // auto: plugin dir/acodels

  // UI
  showAddressBar: true,
};