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
  showSideButton: true,

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
