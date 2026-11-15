import { silentExec, shellEscape, silentExecScript } from '../utils/alpineExec.js';
import { ACODELS_INDEX_B64 } from './acodelsIndexB64.js';

/**
 * Restore full vendored acodels/index.js if missing or stub.
 * Uses pure shell + base64 — no node -e (parentheses break sh -c).
 */
export async function ensureFullAcodelsIndex(acodelsPath) {
  const dir = acodelsPath || '/root/.acode_liveserver/acodels';
  try {
    const check = await silentExec(
      'D=' +
        shellEscape(dir) +
        '; if [ ! -f "$D/index.js" ]; then echo NEED; exit 0; fi; ' +
        'if grep -q WebSocket "$D/index.js" 2>/dev/null && grep -q chokidar "$D/index.js" 2>/dev/null; then echo FULL; else echo NEED; fi',
      { timeoutMs: 8000 }
    );
    if (String(check).includes('FULL') && !String(check).includes('NEED')) {
      console.log('[LiveServer] index.js OK');
      return false;
    }
  } catch (e) {
    console.warn('[LiveServer] index check', e?.message || e);
  }

  console.log('[LiveServer] restoring full acodels index.js →', dir);
  const b64 = ACODELS_INDEX_B64;
  // Script itself is base64-wrapped by silentExecScript — body is plain sh
  const script = [
    '#!/bin/sh',
    'set -e',
    'D=' + dir.replace(/'/g, ''),
    'mkdir -p "$D"',
    "echo '" + b64 + "' | base64 -d > \"$D/index.js\"",
    'wc -c "$D/index.js"',
    'grep -c WebSocket "$D/index.js" || true',
    'echo RESTORED',
  ].join('\n');

  try {
    const out = await silentExecScript(script, { timeoutMs: 0 });
    console.log('[LiveServer] restore index', String(out || '').slice(0, 200));
    return true;
  } catch (e) {
    console.warn('[LiveServer] restore failed', e?.message || e);
    return false;
  }
}
