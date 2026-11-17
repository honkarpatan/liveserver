/**
 * Node / npm / acodels node_modules + optional Chromium browser engine check & install.
 * Chromium appears in the dependencies list as optional & unselected by default.
 */
import { getSettings, updateSetting } from '../core/settings.js';
import {
  commandExists,
  silentExec,
  silentExecScript,
  shellEscape,
  getExecutor,
} from '../utils/alpineExec.js';
import {
  openDepsPicker,
  updateDepsPicker,
  isDepsPickerOpen,
  wasInstallCancelled,
  resetInstallCancel,
  closeDepsPicker,
} from './depsPicker.js';
import { showChromiumInstallerPopup } from '../ui/chromiumInstaller.js';

const toast = acode.require('toast');
const confirm = acode.require('confirm');

let dismissedUntilRestart = false;
let checkedThisSession = false;
let installInFlight = false;
let lastBaseUrl = '';

export const DEP_CATALOG = [
  { id: 'node', label: 'node', desc: 'Node.js runtime', required: true },
  { id: 'npm', label: 'npm', desc: 'Package manager', required: true },
  {
    id: 'acodels',
    label: 'acodels modules',
    desc: 'Backend node_modules (express, ws, chokidar)',
    required: true,
  },
  {
    id: 'chromium',
    label: 'chromium (optional)',
    desc: 'Headless browser for heavy JS websites (~180MB)',
    required: false,
    optional: true,
  },
];

export async function isChromiumInstalled() {
  try {
    if (await commandExists('chromium')) return true;
    if (await commandExists('chromium-browser')) return true;
  } catch (_) {}
  return false;
}

export async function resolveAcodelsPath() {
  const s = getSettings();
  try {
    const out = await silentExec(
      `for d in /root/.acode_liveserver/acodels /home/root/.acode_liveserver/acodels "$HOME/.acode_liveserver/acodels"; do
  [ -f "$d/index.js" ] || continue
  if [ -d "$d/node_modules/express" ]; then echo "FULL:$d"; exit 0; fi
  echo "BARE:$d"
done
exit 0`,
      { timeoutMs: 12000 }
    );
    const lines = String(out || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const full = lines.filter((l) => l.startsWith('FULL:')).map((l) => l.slice(5));
    const bare = lines.filter((l) => l.startsWith('BARE:')).map((l) => l.slice(5));
    const prefer = (list) => {
      const scored = list
        .filter((p) => p && !p.startsWith('/public'))
        .sort((a, b) => (b.startsWith('/root') ? 1 : 0) - (a.startsWith('/root') ? 1 : 0));
      return scored[0] || list.find((p) => p && !p.startsWith('/public')) || list[0] || null;
    };
    const best = prefer(full) || prefer(bare);
    if (best) {
      try { updateSetting('acodelsPath', best); } catch (_) {}
      return best;
    }
  } catch (e) {
    console.warn('[LiveServer:deps] probe', e?.message || e);
  }
  const saved = String(s.acodelsPath || '').trim();
  if (saved && !saved.startsWith('/public') && !saved.includes('com.termux')) {
    return saved;
  }
  try { if (saved) updateSetting('acodelsPath', ''); } catch (_) {}
  return '/root/.acode_liveserver/acodels';
}

async function acodelsModulesPresent(acodelsPath) {
  try {
    const extra = acodelsPath ? shellEscape(acodelsPath) : "''";
    const out = await silentExec(
      'for d in ' +
        extra +
        ' /root/.acode_liveserver/acodels "$HOME/.acode_liveserver/acodels"; do ' +
        '[ -d "$d/node_modules/express" ] && [ -d "$d/node_modules/ws" ] && echo OK && exit 0; ' +
        'done; echo MISS',
      { timeoutMs: 10000 }
    );
    return String(out).includes('OK');
  } catch (_) {
    return false;
  }
}

export async function scanAllDeps(baseUrl) {
  lastBaseUrl = baseUrl || lastBaseUrl;
  const nodeOk = await commandExists('node');
  const npmOk = await commandExists('npm');
  const acodelsPath = await resolveAcodelsPath(baseUrl);
  const modsOk = nodeOk ? await acodelsModulesPresent(acodelsPath) : false;
  const chromiumOk = await isChromiumInstalled();

  updateSetting('chromiumInstalled', chromiumOk);

  return [
    { ...DEP_CATALOG[0], present: nodeOk },
    { ...DEP_CATALOG[1], present: npmOk },
    { ...DEP_CATALOG[2], present: modsOk, path: acodelsPath },
    { ...DEP_CATALOG[3], present: chromiumOk },
  ];
}

export async function verifyDependencies(baseUrl) {
  const all = await scanAllDeps(baseUrl);
  // Only required items block server start; chromium is optional
  const missing = all.filter((d) => d.required !== false && !d.present).map((d) => d.id);
  return { ok: missing.length === 0, missing, all };
}

function toPickerItems(all) {
  return all.map((d) => ({
    id: d.id,
    label: d.label,
    desc: d.desc + (d.path ? ` — ${d.path}` : ''),
    present: d.present,
    optional: d.optional === true,
    // Chromium is unselected by default even when not installed
    checked: d.optional ? false : !d.present,
  }));
}

async function installNodePackages() {
  const script = `#!/bin/sh
set +e
echo "[pm] detecting..."
if command -v pkg >/dev/null 2>&1; then
  echo "[pm] termux pkg"
  pkg update -y 2>&1
  pkg install -y nodejs 2>&1 || pkg install -y nodejs-lts 2>&1
elif command -v apk >/dev/null 2>&1; then
  echo "[pm] apk"
  apk update 2>&1
  apk add --no-cache nodejs npm 2>&1
elif command -v apt-get >/dev/null 2>&1; then
  echo "[pm] apt"
  apt-get update -y 2>&1
  apt-get install -y nodejs npm 2>&1
else
  echo "[pm] none found"
  exit 1
fi
node -v 2>&1
npm -v 2>&1
echo "[done] node packages"
`;
  return silentExecScript(script, { timeoutMs: 0 });
}

async function ensureAcodelsSources(acodelsPath) {
  const script = `#!/bin/sh
set +e
DIR=${shellEscape(acodelsPath)}
case "$DIR" in
  '$HOME'/*|\$HOME/*) DIR="/root/.acode_liveserver/acodels" ;;
esac
if [ -z "$DIR" ] || echo "$DIR" | grep -q com.termux; then
  DIR="/root/.acode_liveserver/acodels"
fi
mkdir -p "$DIR" 2>&1
cd "$DIR" || { echo "[acodels] cd failed"; exit 1; }
if [ ! -f package.json ]; then
  cat > package.json << 'JSON'
{
  "name": "acodels",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "chokidar": "^3.5.3",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "ws": "^8.11.0"
  }
}
JSON
fi
echo "[acodels] npm install in $DIR"
npm install --omit=dev --no-audit --no-fund 2>&1
echo "[done] acodels"
`;
  return silentExecScript(script, { timeoutMs: 0 });
}

export async function showDepsPickerFlow(opts = {}) {
  const baseUrl = opts.baseUrl || lastBaseUrl || '';
  lastBaseUrl = baseUrl;

  if (installInFlight) {
    toast('Install already running...', 2000);
    return false;
  }
  if (isDepsPickerOpen() && !opts.force) {
    return false;
  }
  if (!opts.force && !opts.fromSettings && dismissedUntilRestart) return false;

  if (!opts.force && !opts.fromSettings) {
    const v = await verifyDependencies(baseUrl);
    if (v.ok) {
      updateSetting('dependenciesInstalled', true);
      return true;
    }
  }

  if (!getExecutor()?.execute) {
    toast('Open Acode Terminal once, then retry Install', 3500);
  }

  const promise = openDepsPicker({
    title: 'Live Server Dependencies',
    subtitle: 'Checking...',
    items: [],
    checking: true,
  });

  let all;
  try {
    all = await scanAllDeps(baseUrl);
  } catch (e) {
    updateDepsPicker({
      checking: false,
      subtitle: 'Check failed — ' + (e?.message || e),
      items: [],
    });
    await promise;
    return false;
  }

  const miss = all.filter((d) => d.required !== false && !d.present).length;
  updateDepsPicker({
    checking: false,
    subtitle:
      miss === 0
        ? 'All required tools present (Chromium is optional)'
        : `${miss} required missing — tick what to install`,
    items: toPickerItems(all),
  });

  const result = await promise;
  if (result.action === 'notnow' || result.action === 'close' || result.action === 'cancel') {
    dismissedUntilRestart = true;
    return false;
  }
  if (result.action === 'done') {
    return (await verifyDependencies(baseUrl)).ok;
  }

  if (result.action === 'install' && result.selected?.length) {
    const onlyChromium = result.selected.length === 1 && result.selected[0] === 'chromium';
    if (onlyChromium) {
      closeDepsPicker(true);
      return showChromiumInstallerPopup({ startImmediately: true });
    }

    installInFlight = true;
    resetInstallCancel();

    if (!getExecutor()?.execute) {
      updateDepsPicker({
        progressMode: true,
        percent: 0,
        info: 'Executor not available',
        logAppend: 'Open Acode Terminal once (Alpine/Termux), then open this dialog again.\n',
        showDone: true,
      });
      installInFlight = false;
      return false;
    }

    updateDepsPicker({
      progressMode: true,
      percent: 5,
      info: 'Preparing...',
      logAppend: 'Selected: ' + result.selected.join(', ') + '\n',
    });

    try {
      const acodelsPath = await resolveAcodelsPath(baseUrl);

      if (result.selected.includes('node') || result.selected.includes('npm')) {
        updateDepsPicker({
          percent: 15,
          info: 'Installing Node.js / npm...',
          logAppend: '\n=== node / npm ===\n',
        });
        if (wasInstallCancelled()) {
          installInFlight = false;
          return false;
        }
        const out = await installNodePackages();
        updateDepsPicker({
          percent: 48,
          logAppend: String(out || '').slice(-2500) + '\n',
        });
      }

      if (result.selected.includes('acodels')) {
        updateDepsPicker({
          percent: 58,
          info: 'Installing backend modules in acodels...',
          logAppend: `\n=== acodels @ ${acodelsPath} ===\n`,
        });
        if (wasInstallCancelled()) {
          installInFlight = false;
          return false;
        }
        const out2 = await ensureAcodelsSources(acodelsPath);
        updateDepsPicker({
          percent: 82,
          logAppend: String(out2 || '').slice(-3000) + '\n',
        });
      }

      if (result.selected.includes('chromium')) {
        closeDepsPicker(true);
        installInFlight = false;
        await showChromiumInstallerPopup({ startImmediately: true });
        const after = await verifyDependencies(baseUrl);
        updateSetting('dependenciesInstalled', after.ok);
        return after.ok;
      }

      const after = await verifyDependencies(baseUrl);
      updateDepsPicker({
        progressMode: true,
        percent: 100,
        info: after.ok ? 'Done — all required present' : 'Finished — still missing: ' + after.missing.join(', '),
        showDone: true,
        logAppend: after.ok ? '\nOK\n' : '\nMissing: ' + after.missing.join(', ') + '\n',
      });
      updateSetting('dependenciesInstalled', after.ok);
      if (after.ok) {
        dismissedUntilRestart = true;
        toast('Dependencies ready', 2500);
      }
      return after.ok;
    } catch (e) {
      updateDepsPicker({
        progressMode: true,
        percent: 100,
        info: 'Failed',
        showDone: true,
        logAppend: '\nERROR: ' + (e?.message || e) + '\n',
      });
      return false;
    } finally {
      installInFlight = false;
    }
  }
  return false;
}

export async function ensureLiveServerDeps(opts = {}) {
  const baseUrl = opts.baseUrl || lastBaseUrl || '';
  lastBaseUrl = baseUrl;
  try {
    if (!opts.force && dismissedUntilRestart) return true;
    if (!opts.force && checkedThisSession && getSettings().dependenciesInstalled === true) {
      return true;
    }
    checkedThisSession = true;
    const v = await verifyDependencies(baseUrl);
    if (v.ok) {
      updateSetting('dependenciesInstalled', true);
      return true;
    }
    return showDepsPickerFlow({ ...opts, baseUrl });
  } catch (e) {
    console.warn('[LiveServer:deps]', e);
    return false;
  }
}

export async function checkDependenciesAction(baseUrl) {
  return showDepsPickerFlow({
    force: true,
    fromSettings: true,
    baseUrl: baseUrl || lastBaseUrl,
  });
}

export async function reinstallDependenciesAction(baseUrl) {
  const ok = await confirm(
    'Reinstall dependencies?',
    'Will run pkg/apk install for Node and npm install in acodels.'
  );
  if (!ok) return false;
  dismissedUntilRestart = false;
  checkedThisSession = false;
  return showDepsPickerFlow({
    force: true,
    fromSettings: true,
    baseUrl: baseUrl || lastBaseUrl,
  });
}

export function resetDepsSession() {
  dismissedUntilRestart = false;
  checkedThisSession = false;
}