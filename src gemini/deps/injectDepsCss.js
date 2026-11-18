/**
 * Desktop Linux-themed styles for the Dependencies Checker popup.
 * Strictly obeys Acode's active color theme CSS variables (Dark & Light).
 */
export function injectDepsPickerCss() {
  const old = document.getElementById('ls-deps-picker-css');
  if (old) old.remove();

  const s = document.createElement('style');
  s.id = 'ls-deps-picker-css';
  s.textContent = `
#ls-deps-picker {
  position: fixed;
  inset: 0;
  z-index: 100005;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.56);
  backdrop-filter: blur(3px);
  animation: ls-dp-in 0.18s ease-out;
}
@keyframes ls-dp-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
#ls-deps-picker.ls-dp-leaving {
  opacity: 0;
  transition: opacity 0.16s ease;
}
.ls-dp-backdrop {
  position: absolute;
  inset: 0;
}
.ls-dp-card {
  position: relative;
  z-index: 1;
  width: min(440px, 94vw);
  max-height: min(82vh, 580px);
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: var(--popup-background-color, var(--secondary-color, #1e1f22));
  color: var(--popup-text-color, var(--primary-text-color, var(--color, #e8eaed)));
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.28));
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.52);
  overflow: hidden;
  font-family: inherit;
}

/* ---- Linux Window Titlebar ---- */
.ls-dp-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 15px;
  background: var(--primary-color, rgba(0, 0, 0, 0.24));
  border-bottom: 1px solid var(--border-color, rgba(128, 128, 128, 0.22));
  flex-shrink: 0;
}
.ls-dp-title-left {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.ls-dp-dots {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.ls-dp-dots span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}
.ls-dp-dots span:nth-child(1) { background: #ef4444; }
.ls-dp-dots span:nth-child(2) { background: #f59e0b; }
.ls-dp-dots span:nth-child(3) { background: #22c55e; }
.ls-dp-title {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ls-dp-subbar {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--secondary-text-color, inherit);
  opacity: 0.85;
  background: rgba(128, 128, 128, 0.06);
  border-bottom: 1px solid var(--border-color, rgba(128, 128, 128, 0.16));
  flex-shrink: 0;
}

/* ---- Body ---- */
.ls-dp-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 15px;
  min-height: 90px;
}
.ls-dp-checking {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  padding: 26px 8px;
  font-size: 13px;
}
.ls-dp-spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(128, 128, 128, 0.3);
  border-top-color: var(--active-color, #22c55e);
  animation: ls-spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes ls-spin {
  to { transform: rotate(360deg); }
}

/* ---- Package Rows ---- */
.ls-dp-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  border-radius: 6px;
  margin-bottom: 7px;
  background: var(--primary-color, rgba(128, 128, 128, 0.1));
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.2));
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.ls-dp-row:last-child {
  margin-bottom: 0;
}
.ls-dp-row.is-present {
  opacity: 0.78;
  cursor: default;
}
.ls-dp-row input[type="checkbox"] {
  width: 1.12rem;
  height: 1.12rem;
  flex-shrink: 0;
  accent-color: var(--active-color, #22c55e);
}
.ls-dp-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ls-dp-name {
  font-weight: 600;
  font-size: 13px;
}
.ls-dp-desc {
  font-size: 11.5px;
  color: var(--secondary-text-color, inherit);
  opacity: 0.75;
  word-break: break-word;
}
.ls-dp-status {
  font-size: 11px;
  flex-shrink: 0;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
}
.ls-dp-status.ok {
  background: rgba(34, 197, 94, 0.16);
  color: #4ade80;
}
.ls-dp-status.miss {
  background: rgba(239, 68, 68, 0.16);
  color: #f87171;
}
.ls-dp-status.opt {
  background: rgba(128, 128, 128, 0.18);
  color: var(--secondary-text-color, #9aa0a6);
}

/* ---- Linux Installation Progress View ---- */
.ls-dp-progress {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ls-dp-warn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  border-radius: 5px;
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fbbf24;
  font-size: 12px;
  font-weight: 500;
}
.ls-dp-prog-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12.5px;
}
.ls-dp-progress-info {
  opacity: 0.92;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ls-dp-pct {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--active-color, #22c55e);
  flex-shrink: 0;
}
.ls-dp-progress-track {
  width: 100%;
  height: 8px;
  border-radius: 99px;
  background: var(--primary-color, rgba(128, 128, 128, 0.25));
  overflow: hidden;
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.2));
}
.ls-dp-progress-bar {
  height: 100%;
  width: 0%;
  border-radius: 99px;
  background: var(--active-color, #22c55e);
  transition: width 0.28s ease;
}
.ls-dp-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--active-color, #61afef);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 0;
  font-family: inherit;
}
.ls-dp-log {
  margin: 0;
  max-height: 155px;
  overflow-y: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.4;
  background: #0d1117;
  color: #c9d1d9;
  padding: 10px;
  border-radius: 5px;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.25));
}

/* ---- Footer ---- */
.ls-dp-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  padding: 11px 15px;
  background: var(--primary-color, rgba(0, 0, 0, 0.18));
  border-top: 1px solid var(--border-color, rgba(128, 128, 128, 0.22));
  flex-shrink: 0;
}
.ls-dp-btn {
  border: none;
  border-radius: 5px;
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(128, 128, 128, 0.22);
  color: inherit;
  font-family: inherit;
}
.ls-dp-btn:active {
  opacity: 0.85;
}
.ls-dp-btn.ls-dp-install,
.ls-dp-btn.ls-dp-done {
  background: var(--active-color, #22c55e);
  color: var(--button-text-color, #0b1116);
}
.ls-dp-btn.ls-dp-cancel {
  background: rgba(239, 68, 68, 0.18);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.38);
}
.ls-dp-empty {
  opacity: 0.7;
  padding: 14px;
  text-align: center;
  font-size: 13px;
}
  `;
  document.head.appendChild(s);
}