/**
 * Silent shell execution — same Executor discovery as Java/C++ plugins.
 * No terminal tab required.
 */
export function shellEscape(s) {
  return String(s ?? '').replace(/'/g, `'\"'\"'`);
}

export function wrapSh(script) {
  const s = String(script || '').trim();
  if (!s) return "sh -c 'true'";
  if (/^sh\s+-c\s+/i.test(s)) return s;
  return `sh -c '${shellEscape(s)}'`;
}

function stripProotNoise(s) {
  return String(s || '')
    .split('\n')
    .filter((line) => !/proot warning:/i.test(line))
    .join('\n');
}

function normalizeOutput(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') return stripProotNoise(raw);
  if (typeof raw === 'object') {
    const parts = [raw.stdout, raw.stderr, raw.output, raw.message]
      .filter((x) => x != null && x !== '')
      .map(String);
    if (parts.length) return stripProotNoise(parts.join('\n'));
    try {
      return stripProotNoise(JSON.stringify(raw));
    } catch (_) {
      return stripProotNoise(String(raw));
    }
  }
  return stripProotNoise(String(raw));
}

export function toBase64(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (_) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }
}

function getExecutor() {
  try {
    const terminal = acode.require('terminal');
    const ex =
      (typeof Executor !== 'undefined' && Executor) ||
      window.Executor ||
      globalThis.Executor ||
      terminal?.Executor ||
      null;
    if (ex?.execute) return ex;
  } catch (_) {}
  return null;
}

/**
 * @param {string} command
 * @param {{ timeoutMs?: number, alpine?: boolean }} [opts]
 */
export async function silentExec(command, opts = {}) {
  const timeoutMs = typeof opts === 'number' ? opts : opts.timeoutMs || 0;
  const alpine = typeof opts === 'object' && opts.alpine !== false; // default true like C++/Java

  const executor = getExecutor();
  if (!executor?.execute) {
    console.warn('[LiveServer:exec] no executor', {
      hasWindow: !!window.Executor,
      hasGlobal: !!globalThis.Executor,
      hasTerminal: !!acode.require('terminal'),
    });
    throw new Error(
      'Executor not available. Open Acode Terminal once (or install Executor), then retry.'
    );
  }

  const wrapped = wrapSh(command);
  console.log('[LiveServer:exec] run len=', wrapped.length);

  const run = async () => {
    try {
      const raw = await executor.execute(wrapped, alpine);
      const out = normalizeOutput(raw);
      console.log('[LiveServer:exec] ok len=', out.length);
      return out;
    } catch (e) {
      // Executor often rejects on non-zero exit — still return stderr text
      const out = normalizeOutput(e) || (e && e.message) || String(e);
      console.warn('[LiveServer:exec] catch →', String(out).slice(0, 240));
      return out;
    }
  };

  if (timeoutMs > 0) {
    return Promise.race([
      run(),
      new Promise((resolve) =>
        setTimeout(() => {
          console.warn('[LiveServer:exec] timeout', timeoutMs, 'ms — continuing');
          resolve('');
        }, timeoutMs)
      ),
    ]);
  }
  return run();
}

export async function silentExecScript(scriptBody, opts = {}) {
  const b64 = toBase64(String(scriptBody || ''));
  // long installs: no short timeout by default
  return silentExec(`echo '${shellEscape(b64)}' | base64 -d | sh`, {
    timeoutMs: opts.timeoutMs || 0,
    alpine: opts.alpine !== false,
  });
}

export async function commandExists(bin) {
  try {
    const out = await silentExec(
      `command -v ${shellEscape(bin)} 2>/dev/null || which ${shellEscape(bin)} 2>/dev/null || echo MISS`,
      { timeoutMs: 20000 }
    );
    const s = String(out || '').trim();
    if (!s || /MISS|not found/i.test(s)) return false;
    // which/command -v print a path
    return /\//.test(s) || s.split('\n').some((l) => l.includes('/'));
  } catch (e) {
    console.warn('[LiveServer:exec] commandExists', bin, e?.message || e);
    return false;
  }
}

export { getExecutor };
