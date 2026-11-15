/** Shared live server runtime status */
const state = {
  running: false,
  port: null,
  root: null,
  url: null,
  fileName: null,
  bind: null,
  startedAt: null,
  lastError: null,
};

export function getServerStatus() {
  return { ...state };
}

export function setServerStatus(patch) {
  Object.assign(state, patch || {});
  try {
    window.dispatchEvent(new CustomEvent('liveserver-status', { detail: getServerStatus() }));
  } catch (_) {}
}

export async function refreshStatusFromBackend() {
  if (!state.port) return state;
  try {
    const res = await fetch(`http://127.0.0.1:${state.port}/status`);
    if (!res.ok) {
      setServerStatus({ running: false, lastError: 'status ' + res.status });
      return getServerStatus();
    }
    const data = await res.json();
    setServerStatus({
      running: true,
      port: data.port || state.port,
      root: data.root || state.root,
      fileName: data.fileName || state.fileName,
    });
  } catch (_) {
    setServerStatus({ running: false });
  }
  return getServerStatus();
}
