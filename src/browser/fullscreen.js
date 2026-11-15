export function setFullscreen(shellEl, on) {
  if (!shellEl) return;
  const enable = on == null ? !shellEl.classList.contains('is-fullscreen') : !!on;
  shellEl.classList.toggle('is-fullscreen', enable);
  document.body.classList.toggle('ls-browser-fs', enable);
  return enable;
}

export function exitFullscreen(shellEl) {
  return setFullscreen(shellEl, false);
}
