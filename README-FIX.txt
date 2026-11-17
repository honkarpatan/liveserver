Unzip over your project root (paths preserved), then: npm run build
  unzip -o liveserver-fix.zip

NEW      devtool/suger-dev.js            Suger DevTool engine (shipped in the plugin zip via plugin.json files[])
         src/browser/{appearance,deviceMode,devices,icons,theme,devtool}.js
         src/core/baseUrl.js  src/server/runPreview.js  src/ui/runButton.js
CHANGED  acodels/index.js                page bridge + embedded devtool service worker (marker: ls-bridge-v1)
         src/server/acodelsIndexB64.js   regenerated from acodels/index.js
         src/server/ensureAcodelsIndex.js  re-installs index.js when the marker is missing
         plugin.json                     files[] now includes devtool/
         src/browser/*  src/core/*  src/server/process.js  src/ui/sideButton.js  src/utils/paths.js  src/main.js

After updating: STOP and START the server once so the new index.js (bridge) is installed in Alpine.
