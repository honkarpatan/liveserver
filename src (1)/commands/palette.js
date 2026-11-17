/**
 * Command palette entries
 */
import { isHtmlFile, getActiveFile } from '../utils/paths.js';

const toast = acode.require('toast');
let registered = [];

export function registerCommands() {
  try {
    const commands = acode.require('commands');
    if (!commands?.add) return;

    const add = (name, description, exec) => {
      try {
        commands.add({ name, description, exec });
        registered.push(name);
      } catch (_) {}
    };

    add('liveserver:run-file', 'Live Server: Run this file in HTTP server', async () => {
      const f = getActiveFile();
      if (!f) return toast('Open a file in the editor first', 2000);
      const { startServer } = await import('../server/process.js');
      await startServer();
    });

    add('liveserver:select-root', 'Live Server: Select root folder', async () => {
      const { pickRootFolder } = await import('../server/rootFolder.js');
      await pickRootFolder();
    });

    add('liveserver:run-selected-root', 'Live Server: Run HTTP server for selected / saved root', async () => {
      const { startServer } = await import('../server/process.js');
      const { getSettings } = await import('../core/settings.js');
      const { rootFromSelectedFolder } = await import('../server/rootFolder.js');
      const root = getSettings().rootFolder || rootFromSelectedFolder();
      if (!root) return toast('Select a root folder first (command: Select root folder)', 3000);
      await startServer({ root });
    });

    add('liveserver:stop', 'Live Server: Stop server', async () => {
      const { stopServer } = await import('../server/process.js');
      await stopServer();
    });

    add('liveserver:restart', 'Live Server: Restart server', async () => {
      const { restartServer } = await import('../server/process.js');
      await restartServer();
    });

    add('liveserver:open-browser', 'Live Server: Open browser', async () => {
      const { getServerStatus } = await import('../server/status.js');
      const { openBrowser } = await import('../browser/index.js');
      const st = getServerStatus();
      if (!st.running) return toast('Server is not running', 2000);
      openBrowser(st.url || `http://127.0.0.1:${st.port}/`, { restoreOnly: true });
    });

    add('liveserver:settings', 'Live Server: Open settings', async () => {
      const { openSettingsHub } = await import('../core/settingsPages.js');
      openSettingsHub();
    });
  } catch (e) {
    console.warn('[LiveServer] commands', e);
  }
}

export function unregisterCommands() {
  try {
    const commands = acode.require('commands');
    registered.forEach((n) => {
      try {
        commands?.remove?.(n);
      } catch (_) {}
    });
  } catch (_) {}
  registered = [];
}
