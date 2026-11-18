export const defaultSettings = {
  pluginEnabled: true,

  // Server
  port: 8080,
  bindAddress: '127.0.0.1', // or 0.0.0.0
  rootFolder: '',
  rootFolderUri: '',
  lastMirrorRoot: '',
  mirrorSharedStorage: true, // sdcard / SD card: copy through Acode fs and serve from Alpine cache
  liveReload: true,
  openBrowserOnStart: true,
  directoryListing: true,
  autoShutdownMinutes: 0, // 0 = off

  // Browser
  browserDisplayMode: 'inPage', // inPage | editorTab
  browserSearchEngine: 'brave', // google | duckduckgo | bing | brave
  externalSiteMode: 'proxy', // proxy | acodeWebview | inApp | systemBrowser
  browserHomeUrl: '', // empty = Green Fox Homepage
  showSideButton: true,
  sideButtonRunningLabel: '{HOST}:{PORT}',
  sideButtonOfflineLabel: 'Go Live',
  browserOpacity: 1, // 0.1 - 1.0
  browserOverlay: false,
  overlayAutoSave: true,
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
  acodelsPath: '',

  // UI
  showAddressBar: true,
};