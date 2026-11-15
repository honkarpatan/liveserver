/** Ensure deps picker styles exist (progress, buttons, log) */
export function injectDepsPickerCss() {
  if (document.getElementById('ls-deps-picker-css')) return;
  const s = document.createElement('style');
  s.id = 'ls-deps-picker-css';
  s.textContent = `
#ls-deps-picker {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; align-items: center; justify-content: center;
  animation: ls-dp-in 0.2s ease-out;
}
@keyframes ls-dp-in { from { opacity: 0; } to { opacity: 1; } }
#ls-deps-picker.ls-dp-leaving { opacity: 0; transition: opacity 0.18s ease; }
.ls-dp-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
.ls-dp-card {
  position: relative; z-index: 1;
  width: min(420px, 92vw); max-height: min(78vh, 560px);
  display: flex; flex-direction: column;
  border-radius: 3px;
  background: var(--secondary-color, #1e1e1e);
  color: var(--color, #e0e0e0);
  box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  overflow: hidden;
  border: 1px solid rgba(128,128,128,0.25);
}
.ls-dp-header {
  padding: 12px 14px 8px;
  border-bottom: 1px solid rgba(128,128,128,0.25);
  flex-shrink: 0;
}
.ls-dp-title { font-weight: 600; font-size: 1.02rem; }
.ls-dp-subtitle { font-size: 0.75rem; opacity: 0.75; margin-top: 4px; }
.ls-dp-body { flex: 1; overflow: auto; padding: 10px 12px; min-height: 80px; }
.ls-dp-checking {
  display: flex; align-items: center; gap: 10px; justify-content: center; padding: 24px 8px;
}
.ls-dp-spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid rgba(128,128,128,0.35);
  border-top-color: var(--active-color, #61afef);
  animation: ls-spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes ls-spin { to { transform: rotate(360deg); } }
.ls-dp-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 8px; border-radius: 3px; margin-bottom: 6px;
  background: rgba(128,128,128,0.1);
}
.ls-dp-row.is-present { opacity: 0.75; }
.ls-dp-row input[type="checkbox"] {
  width: 1.15rem; height: 1.15rem; flex-shrink: 0;
  accent-color: var(--active-color, #61afef);
}
.ls-dp-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ls-dp-name { font-weight: 500; font-size: 0.92rem; }
.ls-dp-desc { font-size: 0.7rem; opacity: 0.7; word-break: break-all; }
.ls-dp-status { font-size: 0.72rem; flex-shrink: 0; font-weight: 600; }
.ls-dp-status.ok { color: #66bb6a; }
.ls-dp-status.miss { color: #f48771; }
.ls-dp-progress { padding: 6px 2px 10px; }
.ls-dp-progress-track {
  height: 4px; border-radius: 3px;
  background: rgba(128,128,128,0.3); overflow: hidden;
}
.ls-dp-progress-bar {
  height: 100%; width: 0;
  background: var(--active-color, #61afef);
  transition: width 0.25s ease;
  border-radius: 3px;
}
.ls-dp-progress-info {
  font-size: 0.8rem; margin-top: 10px; opacity: 0.95; line-height: 1.35;
}
.ls-dp-link {
  display: inline-block; margin-top: 10px;
  background: none; border: none;
  color: var(--active-color, #61afef);
  font-size: 0.78rem; cursor: pointer; padding: 0;
  text-decoration: underline;
}
.ls-dp-log {
  margin-top: 8px; max-height: 160px; overflow: auto;
  font-size: 0.68rem; line-height: 1.35;
  background: rgba(0,0,0,0.35); padding: 8px; border-radius: 3px;
  white-space: pre-wrap; word-break: break-word;
  border: 1px solid rgba(128,128,128,0.2);
  color: #c8c8c8;
}
.ls-dp-footer {
  display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end;
  padding: 10px 12px;
  border-top: 1px solid rgba(128,128,128,0.25);
  flex-shrink: 0;
}
.ls-dp-btn {
  border: none; border-radius: 3px; padding: 9px 14px; font-size: 0.85rem;
  cursor: pointer; background: rgba(128,128,128,0.25); color: inherit;
  min-height: 36px;
}
.ls-dp-btn.ls-dp-install,
.ls-dp-btn.ls-dp-done {
  background: var(--active-color, #61afef); color: #111; font-weight: 600;
}
.ls-dp-btn.ls-dp-cancel {
  background: rgba(244, 135, 113, 0.25); color: #f48771;
}
.ls-dp-empty { opacity: 0.7; padding: 12px; text-align: center; }
`;
  document.head.appendChild(s);
}
