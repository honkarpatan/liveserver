/**
 * Node / npm / acodels node_modules — checks dependencies, asks via browserConfirm(),
 * then installs hiddenly in the background with a green loader bar and bottom-left status pill.
 */
import { getSettings, updateSetting } from '../core/settings.js';
import {
  commandExists,
  silentExec,
  silentExecScript,
  shellEscape,
  getExecutor,
} from '../utils/alpineExec.js';
import { browserConfirm } from '../ui/browserConfirm.js';
import { showStatusPill, hideStatusPill, setGreenLoader } from '../ui/statusPill.js';

const toast = acode.require('toast');

let dismissedUntilRestart = false;
let checkedThisSession = false;
let installPromise = null;
let lastBaseUrl = '';

export const DEP_CATALOG = [
  { id: 'node', label: 'Node.js runtime', desc: 'Required to run local HTTP & reverse proxy server' },
  { id: 'npm', label: 'npm package manager', desc: 'Required to install backend packages' },
  { id: 'acodels', label: 'Backend modules (express, ws, chokidar)', desc: 'Live reload & proxy server dependencies' },
];

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
      try {
        updateSetting('acodelsPath', best);
      } catch (_) {}
      return best;
    }
  } catch (e) {
    console.warn('[LiveServer:deps] probe', e?.message || e);
  }
  const saved = String(s.acodelsPath || '').trim();
  if (saved && !saved.startsWith('/public') && !saved.includes('com.termux')) {
    return saved;
  }
  try {
    if (saved) updateSetting('acodelsPath', '');
  } catch (_) {}
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
  return [
    { ...DEP_CATALOG[0], present: nodeOk },
    { ...DEP_CATALOG[1], present: npmOk },
    { ...DEP_CATALOG[2], present: modsOk, path: acodelsPath },
  ];
}

export async function verifyDependencies(baseUrl) {
  const all = await scanAllDeps(baseUrl);
  const missing = all.filter((d) => !d.present);
  return { ok: missing.length === 0, missing, all };
}

async function runHiddenInstall(missingIds, acodelsPath) {
  if (installPromise) return installPromise;

  installPromise = (async () => {
    setGreenLoader(true);
    showStatusPill('Preparing hidden environment setup...', { spin: true });

    try {
      // Step 1: Install Node.js & npm if missing
      if (missingIds.includes('node') || missingIds.includes('npm')) {
        showStatusPill('$ Detecting package manager (apk / pkg / apt)...', { spin: true });

        const detectOut = await silentExec(
          'if command -v apk >/dev/null 2>&1; then echo APK; elif command -v pkg >/dev/null 2>&1; then echo PKG; elif command -v apt-get >/dev/null 2>&1; then echo APT; else echo NONE; fi',
          { timeoutMs: 10000 }
        );
        const pm = String(detectOut || '').trim();

        if (pm === 'APK') {
          showStatusPill('$ apk update && apk add --no-cache nodejs npm', { spin: true });
          await silentExecScript(
            `#!/bin/sh
set +e
apk update >/dev/null 2>&1
apk add --no-cache nodejs npm 2>&1
`,
            { timeoutMs: 0 }
          );
        } else if (pm === 'PKG') {
          showStatusPill('$ pkg update -y && pkg install -y nodejs', { spin: true });
          await silentExecScript(
            `#!/bin/sh
set +e
pkg update -y >/dev/null 2>&1
pkg install -y nodejs 2>&1 || pkg install -y nodejs-lts 2>&1
`,
            { timeoutMs: 0 }
          );
        } else if (pm === 'APT') {
          showStatusPill('$ apt-get update && apt-get install -y nodejs npm', { spin: true });
          await silentExecScript(
            `#!/bin/sh
set +e
apt-get update -y >/dev/null 2>&1
apt-get install -y nodejs npm 2>&1
`,
            { timeoutMs: 0 }
          );
        } else {
          showStatusPill('No supported package manager found in Alpine', { spin: false, autoHideMs: 3500 });
          return false;
        }

        const nodeVer = await silentExec('node -v 2>/dev/null || echo ""', { timeoutMs: 8000 });
        if (String(nodeVer).trim()) {
          showStatusPill(`Installed Node.js ${String(nodeVer).trim()}`, { spin: true });
        }
      }

      // Step 2: Install backend node_modules (express, ws, chokidar, cors)
      if (missingIds.includes('acodels') || missingIds.includes('node')) {
        showStatusPill(`$ mkdir -p ${acodelsPath} && npm install --omit=dev`, { spin: true });

        const modScript = `#!/bin/sh
set +e
DIR=${shellEscape(acodelsPath)}
case "$DIR" in
  '$HOME'/*|\$HOME/*) DIR="/root/.acode_liveserver/acodels" ;;
esac
if [ -z "$DIR" ] || echo "$DIR" | grep -q com.termux; then
  DIR="/root/.acode_liveserver/acodels"
fi
mkdir -p "$DIR" 2>&1
cd "$DIR" || exit 1
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
npm install --omit=dev --no-audit --no-fund 2>&1
`;
        await silentExecScript(modScript, { timeoutMs: 0 });
      }

      showStatusPill('Verifying installed packages...', { spin: true });
      const check = await verifyDependencies(lastBaseUrl);
      updateSetting('dependenciesInstalled', check.ok);

      if (check.ok) {
        dismissedUntilRestart = true;
        showStatusPill('✓ Node.js & Live Server modules ready', { spin: false, autoHideMs: 2800 });
        return true;
      } else {
        const missNames = check.missing.map((m) => m.id).join(', ');
        showStatusPill(`Missing after install: ${missNames}`, { spin: false, autoHideMs: 4000 });
        toast(`Still missing: ${missNames}`, 3500);
        return false;
      }
    } catch (err) {
      console.warn('[LiveServer:deps] hidden install error:', err);
      showStatusPill(`Install error: ${err?.message || err}`, { spin: false, autoHideMs: 4000 });
      return false;
    } finally {
      setGreenLoader(false);
      installPromise = null;
    }
  })();

  return installPromise;
}

/**
 * Ensures Node.js, npm, and acodels modules are installed.
 * Shows browserConfirm() first, then runs hiddenly with green loader + bottom-left status pill.
 */
export async function ensureLiveServerDeps(opts = {}) {
  const baseUrl = opts.baseUrl || lastBaseUrl || '';
  lastBaseUrl = baseUrl;

  if (installPromise) return installPromise;
  if (!opts.force && dismissedUntilRestart) return false;

  if (!opts.force && checkedThisSession && getSettings().dependenciesInstalled === true) {
    return true;
  }

  if (!getExecutor()?.execute) {
    if (!opts.silent) {
      toast('Open Acode Terminal once to initialize Alpine environment', 3500);
    }
    return false;
  }

  if (!opts.silent) {
    showStatusPill('Checking Node.js environment...', { spin: true });
  }

  const v = await verifyDependencies(baseUrl);
  checkedThisSession = true;

  if (v.ok && !opts.force) {
    updateSetting('dependenciesInstalled', true);
    hideStatusPill(400);
    return true;
  }

  hideStatusPill(0);

  const itemsToShow = (opts.force ? v.all : v.missing).map((d) => ({
    name: d.label,
    tag: d.present ? 'reinstall' : 'required',
  }));

  const confirmed = await browserConfirm({
    title: opts.force ? 'Reinstall Live Server Dependencies?' : 'Install Node.js & Dependencies?',
    message:
      'Live Server and the local web proxy require Node.js and backend modules in Alpine Linux. They will be installed silently in the background.',
    items: itemsToShow,
    details: 'Progress will appear at the top (green bar) and bottom-left status indicator.',
    confirmText: 'Install Now',
    cancelText: 'Not Now',
  });

  if (!confirmed) {
    dismissedUntilRestart = true;
    return false;
  }

  const acodelsPath = await resolveAcodelsPath(baseUrl);
  const targetIds = opts.force ? ['node', 'npm', 'acodels'] : v.missing.map((m) => m.id);
  return runHiddenInstall(targetIds, acodelsPath);
}

export async function checkDependenciesAction(baseUrl) {
  dismissedUntilRestart = false;
  checkedThisSession = false;
  const ok = await ensureLiveServerDeps({ baseUrl: baseUrl || lastBaseUrl, force: false });
  if (ok) toast('All dependencies are installed and ready', 2200);
  return ok;
}

export async function reinstallDependenciesAction(baseUrl) {
  dismissedUntilRestart = false;
  checkedThisSession = false;
  return ensureLiveServerDeps({ baseUrl: baseUrl || lastBaseUrl, force: true });
}

export function resetDepsSession() {
  dismissedUntilRestart = false;
  checkedThisSession = false;
}