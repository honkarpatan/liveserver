// settings.js
import plugin from '../plugin.json';
const appSettings = acode.require('settings');

// Default setting values
const defaultSettings = {
  // disablePlugin: false,
  enablePinchToZoom: true,
  consoleType: 'suger',
  serverPort: 1024,
  previewPort: 8080, 
  previewOnSave: false,
  dependenciesInstalled: false,
  redownloadDeps: false,
  updateServerFiles: false // ✅ New Key
};

function getSettings() {
  let pluginSettings = appSettings.value[plugin.id];
  if (!pluginSettings) {
    pluginSettings = { ...defaultSettings };
    appSettings.value[plugin.id] = pluginSettings;
    appSettings.update();
    return pluginSettings;
  }
  
  let changed = false;
  for (const key in defaultSettings) {
    if (!(key in pluginSettings)) {
      pluginSettings[key] = defaultSettings[key];
      changed = true;
    }
  }
  if (changed) appSettings.update();
  return pluginSettings;
}

const settingsList = [
  {
    key: 'serverPort',
    text: 'Server Port (Static)',
    value: getSettings().serverPort,
    prompt: 'Enter Port (1024-65535)',
    promptType: 'number',
    info: 'Fixed port for the static server (Default: 1024)'
  },
  {
    key: 'previewPort',
    text: 'Preview Port (App/Dev)',
    value: getSettings().previewPort,
    prompt: 'Enter Port (e.g., 3000, 8080)',
    promptType: 'number',
    info: 'Port for the Eye button (e.g., React/Vue dev server)'
  },
  // {
  //   key: 'disablePlugin',
  //   text: 'Disable Live Server',
  //   checkbox: getSettings().disablePlugin,
  //   info: 'If enabled, the plugin will be disabled on next startup.'
  // },
  {
    key: 'enablePinchToZoom',
    text: 'Enable Pinch to Zoom',
    checkbox: getSettings().enablePinchToZoom,
    info: 'Enable pinch-to-zoom on preview.'
  },
  {
    key: 'consoleType',
    text: 'DevTool / Console Type',
    value: getSettings().consoleType,
    select: [
        ['suger', 'Suger DevTool (Recommended)'],
        ['eruda', 'Eruda Inspector']
    ],
    info: 'Choose which tool opens when you click the Console icon.'
  },
  {
    key: 'previewOnSave',
    text: 'Preview on Save',
    checkbox: getSettings().previewOnSave,
    info: 'Automatically refresh the preview window when you save a file.'
  },
  {
    key: 'redownloadDeps',
    text: 'Re-check/Install Dependencies',
    checkbox: true,
    info: 'Click to force check and install Node.js/Git'
  },
  // ✅ NEW: Update Server Files Option
  {
    key: 'updateServerFiles',
    text: 'Update Server Files',
    checkbox: false, // Checkbox acts as a button
    info: 'Force delete and re-download server files on next run.'
  }
];

function onSettingsChange(key, value) {
  const settings = getSettings();
  
  if (key === 'redownloadDeps') {
      import('./dependencyChecker.js').then(module => {
          module.ensureNodeDependencies(true);
      });
      settings[key] = false; 
  } 
  // ✅ NEW: Handle Manual Update Trigger
  else if (key === 'updateServerFiles') {
      // 1. LocalStorage থেকে ভার্সন ডিলিট করা
      localStorage.removeItem('acodels_server_version');
      
      // 2. টোস্ট দেখানো
      window.toast('Updated server preference! Please Restart Server.', 3000);
      
      // 3. UI তে চেকবাক্সটি আবার false করে দেওয়া (যাতে সবসময় ক্লিকেবল থাকে)
      settings[key] = false;
  }
  else {
      settings[key] = value;
  }
  appSettings.update();
}

export {
  getSettings,
  settingsList,
  onSettingsChange
};