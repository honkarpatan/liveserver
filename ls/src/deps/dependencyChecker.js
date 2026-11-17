/**
 * Node / npm / acodels node_modules — once per session check + install
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
];

/**
 * Resolve a path the Executor shell can actually write (Alpine/Termux $HOME).
 * Never hardcode /data/data/com.termux — Alpine proot cannot mkdir there.
 */
export async function resolveAcodelsPath(baseUrl) {
  const s = getSettings();

  // Fast probe only — no find (find hangs under proot and trips 30s timeout)
  try {
    const out = await silentExec(
      `for d in /root/.acode_liveserver/acodels /home/root/.acode_liveserver/acodels "$HOME/.acode_liveserver/acodels"; do
  [ -f "$d/index.js" ] || continue
  if [ -d "$d/node_modules/express" ]; then echo "FULL:$d"; exit 0; fi
  echo "BARE:$d"
done
exit 0
`,
      { timeoutMs: 12000 }
    );
    const lines = String(out || '').split(String.fromCharCode(10)).map((l) => l.trim()).filter(Boolean);
    console.log('[LiveServer:deps] probe', lines.slice(0, 8));
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
      console.log('[LiveServer:deps] acodels path', best);
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
      "for d in " + extra + ' /root/.acode_liveserver/acodels "$HOME/.acode_liveserver/acodels"; do '
      + '[ -d "$d/node_modules/express" ] && [ -d "$d/node_modules/ws" ] && echo OK && exit 0; '
      + 'done; echo MISS',
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
  const missing = all.filter((d) => !d.present).map((d) => d.id);
  return { ok: missing.length === 0, missing, all };
}

function toPickerItems(all) {
  return all.map((d) => ({
    id: d.id,
    label: d.label,
    desc: d.desc + (d.path ? ` · ${d.path}` : ''),
    present: d.present,
    checked: !d.present,
  }));
}

async function installNodePackages() {
  // Termux first (Acode common), then apk, then apt — no artificial short timeout
  const script = `#!/bin/sh
set +e
echo "[pm] detecting..."
if command -v pkg >/dev/null 2>&1; then
  echo "[pm] termux pkg"
  pkg update -y 2>&1
  pkg install -y nodejs 2>&1 || pkg install -y nodejs-lts 2>&1
elif command -v apk >/dev/null 2>&1; then
  echo "[pm] apk"
  apk add --no-cache nodejs npm 2>&1
elif command -v apt-get >/dev/null 2>&1; then
  echo "[pm] apt"
  apt-get update -y 2>&1
  apt-get install -y nodejs npm 2>&1
else
  echo "[pm] none found"
  exit 1
fi
echo "[which] node=$(command -v node 2>/dev/null)"
echo "[which] npm=$(command -v npm 2>/dev/null)"
node -v 2>&1
npm -v 2>&1
echo "[done] node packages"
`;
  return silentExecScript(script, { timeoutMs: 0 });
}

async function ensureAcodelsSources(acodelsPath, pluginBaseUrl) {
  const script = `#!/bin/sh
set +e
DIR=${shellEscape(acodelsPath)}
case "$DIR" in
  '$HOME'/*|\$HOME/*) DIR="/root/.acode_liveserver/acodels" ;;
esac
if [ -z "$DIR" ] || echo "$DIR" | grep -q com.termux; then
  DIR="/root/.acode_liveserver/acodels"
fi
echo "[acodels] HOME=$HOME"
echo "[acodels] DIR=$DIR"
mkdir -p "$DIR" 2>&1
cd "$DIR" || { echo "[acodels] cd failed"; exit 1; }
if [ ! -f package.json ]; then
  echo "[acodels] writing package.json"
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
npm install --omit=dev 2>&1
echo "[test] express=$(test -d node_modules/express && echo ok || echo miss)"
echo "[test] ws=$(test -d node_modules/ws && echo ok || echo miss)"
echo "[pwd] $(pwd)"
echo "[done] acodels"
`;
  return silentExecScript(script, { timeoutMs: 0 });
}

export async function showDepsPickerFlow(opts = {}) {
  const baseUrl = opts.baseUrl || lastBaseUrl || '';
  lastBaseUrl = baseUrl;

  if (installInFlight) {
    toast('Install already running…', 2000);
    return false;
  }
  if (isDepsPickerOpen() && !opts.force) {
    toast('Dependency UI already open…', 2000);
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

  // Executor preflight
  if (!getExecutor()?.execute) {
    toast('Open Acode Terminal once, then retry Install', 3500);
    console.warn('[LiveServer:deps] Executor missing before picker');
  }

  const promise = openDepsPicker({
    title: 'Live Server Dependencies',
    subtitle: 'Checking…',
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

  const miss = all.filter((d) => !d.present).length;
  updateDepsPicker({
    checking: false,
    subtitle:
      miss === 0
        ? 'All required tools present'
        : `${miss} missing · tick what to install`,
    items: toPickerItems(all),
  });

  const result = await promise;

  if (result.action === 'notnow' || result.action === 'close' || result.action === 'cancel') {
    dismissedUntilRestart = true;
    if (result.action === 'notnow') toast('Skipped for this session', 2000);
    return false;
  }

  if (result.action === 'done') {
    return (await verifyDependencies(baseUrl)).ok;
  }

  if (result.action === 'install' && result.selected?.length) {
    installInFlight = true;
    resetInstallCancel();

    if (!getExecutor()?.execute) {
      updateDepsPicker({
        progressMode: true,
        percent: 0,
        info: 'Executor not available',
        logAppend:
          'Open Acode Terminal once (Alpine/Termux), then open this dialog again and Install.\n',
        showDone: true,
      });
      toast('Executor missing — open Terminal first', 3500);
      installInFlight = false;
      return false;
    }

    updateDepsPicker({
      progressMode: true,
      percent: 5,
      info: 'Preparing…',
      logAppend: 'Selected: ' + result.selected.join(', ') + '\n',
    });

    try {
      const acodelsPath = await resolveAcodelsPath(baseUrl);

      if (result.selected.includes('node') || result.selected.includes('npm')) {
        updateDepsPicker({
          percent: 15,
          info: 'Installing Node.js / npm (may take several minutes)…',
          logAppend: '\n=== node / npm ===\n',
        });
        if (wasInstallCancelled()) {
          installInFlight = false;
          return false;
        }
        const out = await installNodePackages();
        updateDepsPicker({
          percent: 50,
          logAppend: String(out || '').slice(-2500) + '\n',
        });
      }

      if (result.selected.includes('acodels')) {
        updateDepsPicker({
          percent: 60,
          info: 'npm install in acodels…',
          logAppend: `\n=== acodels @ ${acodelsPath} ===\n`,
        });
        if (wasInstallCancelled()) {
          installInFlight = false;
          return false;
        }
        const out2 = await ensureAcodelsSources(acodelsPath, baseUrl);
        updateDepsPicker({
          percent: 90,
          logAppend: String(out2 || '').slice(-3000) + '\n',
        });
        try {
          const real = await silentExec(
            `echo "$HOME/.acode_liveserver/acodels"`,
            { timeoutMs: 10000 }
          );
          const pathLine = String(real || '')
            .split(String.fromCharCode(10))
            .map((l) => l.trim())
            .find((l) => l.startsWith('/') && l.includes('acodels'));
          updateSetting('acodelsPath', pathLine || acodelsPath.replace(/^\$HOME/, ''));
        } catch (_) {
          try { updateSetting('acodelsPath', acodelsPath); } catch (__) {}
        }
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
      } else {
        toast('Still missing: ' + after.missing.join(', '), 4000);
      }
      // Do NOT auto-close — user taps Close
      return after.ok;
    } catch (e) {
      console.warn('[LiveServer:deps] install', e);
      updateDepsPicker({
        progressMode: true,
        percent: 100,
        info: 'Failed',
        showDone: true,
        logAppend: '\nERROR: ' + (e?.message || e) + '\n',
      });
      toast('Install error: ' + (e?.message || e), 4000);
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
    if (!opts.force && checkedThisSession) {
      const v = await verifyDependencies(baseUrl);
      return v.ok;
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
