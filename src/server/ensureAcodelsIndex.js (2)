import { silentExec, shellEscape, silentExecScript } from '../utils/alpineExec.js';
import { ACODELS_INDEX_B64 } from './acodelsIndexB64.js';

/**
 * Restore full vendored acodels/index.js if missing, stub, or lacking ls-proxy-v7.
 */
export async function ensureFullAcodelsIndex(acodelsPath) {
  const dir = acodelsPath || '/root/.acode_liveserver/acodels';
  try {
    const check = await silentExec(
      'D=' +
        shellEscape(dir) +
        '; if [ ! -f "$D/index.js" ]; then echo NEED; exit 0; fi; ' +
        'if grep -q WebSocket "$D/index.js" 2>/dev/null && grep -q chokidar "$D/index.js" 2>/dev/null && grep -q ls-proxy-v7 "$D/index.js" 2>/dev/null; then echo FULL; else echo NEED; fi',
      { timeoutMs: 8000 }
    );
    if (String(check).includes('FULL') && !String(check).includes('NEED')) {
      return false;
    }
  } catch (e) {
    console.warn('[LiveServer] index check', e?.message || e);
  }

  const b64 = ACODELS_INDEX_B64;
  const script = [
    '#!/bin/sh',
    'set -e',
    'D=' + dir.replace(/'/g, ''),
    'mkdir -p "$D"',
    "echo '" + b64 + "' | base64 -d > \"$D/index.js\"",
    'echo RESTORED',
  ].join('\n');

  try {
    await silentExecScript(script, { timeoutMs: 0 });
    return true;
  } catch (e) {
    console.warn('[LiveServer] restore failed', e?.message || e);
    return false;
  }
}