/**
 * Browser CSS — desktop Chrome (Linux) look, dark + light, with Mozilla Firefox-style New Tab Page.
 * BROWSER_CSS is used twice:
 *  - injected into document.head (Acode Page mode)
 *  - passed to EditorFile `stylesheets` (editor tab = Shadow DOM, head styles don't apply)
 */
export const BROWSER_CSS = `
:host { display: block; position: relative; height: 100%; width: 100%; }
.ls-browser-shell {
  --ls-frame: #202124; --ls-toolbar: #35363a; --ls-omni: #202124; --ls-text: #e8eaed; --ls-sub: #9aa0a6;
  --ls-hover: rgba(255,255,255,.10); --ls-press: rgba(255,255,255,.16); --ls-line: #3c4043; --ls-accent: #8ab4f8;
  --ls-menu: #292a2d; --ls-stage: #1b1c1e; --ls-active-tab-text: #e8eaed;
  position: absolute; inset: 0; z-index: 1;
  display: flex; flex-direction: column; box-sizing: border-box;
  background: var(--ls-frame); color: var(--ls-text);
  font: 13px/1.3 Roboto, "Noto Sans", "Segoe UI", system-ui, sans-serif;
}
.ls-browser-shell[data-theme="light"] {
  --ls-frame: #dee1e6; --ls-toolbar: #ffffff; --ls-omni: #f1f3f4; --ls-text: #202124; --ls-sub: #5f6368;
  --ls-hover: rgba(0,0,0,.08); --ls-press: rgba(0,0,0,.14); --ls-line: #dadce0; --ls-accent: #1a73e8;
  --ls-menu: #ffffff; --ls-stage: #e8eaed; --ls-active-tab-text: #202124;
}
.ls-browser-shell *, .ls-browser-shell *::before, .ls-browser-shell *::after { box-sizing: border-box; }
.ls-browser-shell button { font: inherit; color: inherit; }
.ls-browser-shell.is-fullscreen { position: fixed; inset: 0; z-index: 99990; }

/* ---- chrome (tab strip + toolbar) */
.ls-chrome { flex-shrink: 0; display: flex; flex-direction: column; background: var(--ls-frame); }
.ls-tabstrip { display: flex; align-items: flex-end; height: 38px; padding: 6px 6px 0 6px; gap: 2px; }
.ls-browser-tabs { display: flex; flex: 0 1 auto; min-width: 0; overflow: hidden; align-items: flex-end; }
.ls-tab {
  position: relative; display: flex; align-items: center; gap: 6px; flex: 0 1 200px; min-width: 36px; max-width: 220px;
  height: 32px; padding: 0 6px 0 10px; border-radius: 3px 3px 0 0; color: var(--ls-sub); cursor: default; user-select: none;
}
.ls-tab:hover { background: var(--ls-hover); }
.ls-tab.is-active { background: var(--ls-toolbar); color: var(--ls-active-tab-text); }
.ls-tab:not(.is-active)::after { content: ""; position: absolute; right: -1px; top: 8px; height: 16px; width: 1px; background: var(--ls-line); }
.ls-tab:hover::after, .ls-tab.is-active::after, .ls-tab:has(+ .ls-tab.is-active)::after { display: none; }
.ls-fav { width: 16px; height: 16px; flex: none; display: inline-flex; align-items: center; justify-content: center; }
.ls-fav img { width: 16px; height: 16px; }
.ls-fav.is-spin { border: 2px solid var(--ls-line); border-top-color: var(--ls-accent); border-radius: 50%; animation: ls-spin .8s linear infinite; }
.ls-tab-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ls-tab-x { width: 18px; height: 18px; flex: none; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; }
.ls-tab-x:hover { background: var(--ls-press); }
.ls-tabstrip .ls-spacer { flex: 1; }
.ls-win { display: flex; align-items: center; align-self: center; gap: 2px; }
.ls-ib {
  width: 32px; height: 32px; flex: none; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--ls-sub);
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
}
.ls-ib:hover { background: var(--ls-hover); }
.ls-ib:active { background: var(--ls-press); }
.ls-ib:disabled { opacity: .4; pointer-events: none; }
.ls-ib.is-on { color: var(--ls-accent); }
.ls-ib.is-on svg { fill: var(--ls-accent); }
.ls-ib.ls-tab-new { width: 28px; height: 28px; margin-left: 2px; align-self: center; }
.ls-ib.ls-win-btn { width: 26px; height: 26px; }

.ls-toolbar { position: relative; display: flex; align-items: center; gap: 2px; height: 40px; padding: 0 6px; background: var(--ls-toolbar); border-bottom: 1px solid var(--ls-line); }
.ls-omni { flex: 1; min-width: 0; height: 30px; margin: 0 6px; display: flex; align-items: center; gap: 2px; padding: 0 2px 0 4px; border-radius: 3px; background: var(--ls-omni); }
.ls-omni:focus-within { box-shadow: inset 0 0 0 2px var(--ls-accent); }
.ls-site { width: 24px; height: 24px; flex: none; border: 0; border-radius: 50%; background: transparent; color: var(--ls-sub); display: inline-flex; align-items: center; justify-content: center; padding: 0; }
.ls-site:hover { background: var(--ls-hover); }
.ls-browser-url { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; color: var(--ls-text); font: inherit; font-size: 14px; padding: 0 4px; }
.ls-browser-url::placeholder { color: var(--ls-sub); }
.ls-omni .ls-ib { width: 26px; height: 26px; }
.ls-browser-shell.no-url .ls-omni { visibility: hidden; }
.ls-progress { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; overflow: hidden; display: none; }
.ls-browser-shell.is-loading .ls-progress { display: block; }
.ls-progress::before { content: ""; position: absolute; top: 0; bottom: 0; width: 30%; background: var(--ls-accent); animation: ls-bar 1.1s ease-in-out infinite; }
@keyframes ls-bar { 0% { left: -30%; } 100% { left: 100%; } }
@keyframes ls-spin { to { transform: rotate(360deg); } }

/* ---- external site fallback banner */
.ls-ext-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 5px 10px; background: var(--ls-menu); border-bottom: 1px solid var(--ls-line);
  font-size: 12px; color: var(--ls-sub);
}
.ls-ext-bar[hidden] { display: none; }
.ls-ext-open {
  border: 0; border-radius: 3px; padding: 4px 10px; background: #22c55e;
  color: #052e16; font-weight: 600; font-size: 11.5px; cursor: pointer; white-space: nowrap;
}

/* ---- device toolbar */
.ls-devbar { display: flex; align-items: center; gap: 6px; min-height: 34px; padding: 3px 8px; background: var(--ls-toolbar); border-bottom: 1px solid var(--ls-line); overflow-x: auto; scrollbar-width: none; }
.ls-devbar[hidden] { display: none; }
.ls-devbar::-webkit-scrollbar { height: 0; }
.ls-dev-btn { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 8px; border: 1px solid var(--ls-line); border-radius: 3px; background: transparent; white-space: nowrap; cursor: pointer; }
.ls-dev-btn:hover { background: var(--ls-hover); }
.ls-dev-num { width: 58px; height: 26px; padding: 0 6px; border: 1px solid var(--ls-line); border-radius: 3px; background: var(--ls-omni); color: var(--ls-text); font: inherit; text-align: center; outline: 0; -moz-appearance: textfield; }
.ls-dev-num:focus { border-color: var(--ls-accent); }
.ls-dev-num::-webkit-outer-spin-button, .ls-dev-num::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.ls-dev-x { color: var(--ls-sub); }
.ls-dev-spacer { flex: 1; }
.ls-dev-icon { width: 26px; height: 26px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--ls-sub); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.ls-dev-icon:hover { background: var(--ls-hover); }

/* ---- stage (page area) */
.ls-stage { position: relative; flex: 1; min-height: 0; overflow: hidden; background: #fff; }
.ls-browser-shell.is-device .ls-stage { overflow: auto; display: flex; padding: 12px; background: var(--ls-stage); }
.ls-box { position: relative; width: 100%; height: 100%; }
.ls-browser-shell.is-device .ls-box { flex: none; margin: auto; background: #fff; box-shadow: 0 0 0 1px var(--ls-line), 0 2px 12px rgba(0,0,0,.35); }
.ls-device { position: relative; width: 100%; height: 100%; transform-origin: 0 0; }
.ls-browser-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #fff; }
.ls-hdl { display: none; position: absolute; z-index: 3; background: transparent; touch-action: none; }
.ls-browser-shell.is-device .ls-hdl { display: block; }
.ls-hdl-r { top: 0; bottom: 0; right: -12px; width: 12px; cursor: ew-resize; }
.ls-hdl-b { left: 0; right: 0; bottom: -12px; height: 12px; cursor: ns-resize; }
.ls-hdl-c { right: -12px; bottom: -12px; width: 12px; height: 12px; cursor: nwse-resize; }
.ls-hdl::after { content: ""; position: absolute; background: var(--ls-sub); border-radius: 3px; opacity: .8; }
.ls-hdl-r::after { top: calc(50% - 14px); left: 4px; width: 4px; height: 28px; }
.ls-hdl-b::after { left: calc(50% - 14px); top: 4px; height: 4px; width: 28px; }
.ls-hdl-c::after { left: 4px; top: 4px; width: 4px; height: 4px; border-radius: 50%; }

/* ---- new tab page (Mozilla Firefox style: large Green Fox top-center + search bar + round bookmarks + recent) */
.ls-ntp {
  position: absolute; inset: 0; z-index: 2; display: none; flex-direction: column;
  align-items: center; justify-content: flex-start; gap: 20px; padding: 26px 16px 28px;
  overflow-y: auto; background: var(--ls-toolbar); color: var(--ls-text);
}
.ls-ntp.is-on { display: flex; }
.ls-ntp-hero {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; margin-top: 6px;
}
.ls-ntp-logo {
  width: 92px; height: 92px; object-fit: contain; display: block;
  filter: drop-shadow(0 6px 16px rgba(34, 197, 94, 0.25));
}
.ls-ntp-title {
  font-size: 22px; font-weight: 600; letter-spacing: .3px;
}
.ls-ntp-search {
  width: min(480px, 95%); height: 44px; border-radius: 8px;
  background: var(--ls-omni); border: 1px solid var(--ls-line);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  display: flex; align-items: center; gap: 8px; padding: 0 6px 0 12px; color: var(--ls-sub);
}
.ls-ntp-search:focus-within {
  border-color: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.28);
}
.ls-ntp-search-ico {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ls-ntp-search input {
  flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent;
  color: var(--ls-text); font: inherit; font-size: 14px;
}
.ls-ntp-search-btn {
  height: 32px; padding: 0 14px; border: 0; border-radius: 6px;
  background: #22c55e; color: #052e16; font-weight: 600; font-size: 12.5px;
  cursor: pointer; flex-shrink: 0;
}
.ls-ntp-search-btn:active { opacity: 0.85; }
.ls-ntp-tiles {
  display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;
  width: min(480px, 100%);
}
.ls-ntp-tile {
  width: 78px; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 8px 4px; border: 0; border-radius: 6px; background: transparent; cursor: pointer;
}
.ls-ntp-tile:hover { background: var(--ls-hover); }
.ls-ntp-dot {
  width: 48px; height: 48px; border-radius: 50%; background: var(--ls-omni);
  border: 1px solid var(--ls-line); color: var(--ls-text);
  display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600;
  overflow: hidden; flex-shrink: 0;
}
.ls-ntp-dot img { width: 24px; height: 24px; border-radius: 50%; object-fit: contain; }
.ls-ntp-name {
  max-width: 74px; font-size: 11.5px; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; color: var(--ls-text);
}
.ls-ntp-recent-wrap {
  width: min(480px, 100%); display: flex; flex-direction: column; gap: 6px;
  border-top: 1px solid var(--ls-line); padding-top: 12px;
}
.ls-ntp-sec-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 4px 4px; font-size: 12px; font-weight: 600; color: var(--ls-sub);
}
.ls-ntp-more {
  border: 0; background: transparent; color: #22c55e; font-size: 12px;
  font-weight: 600; cursor: pointer; padding: 2px 6px; border-radius: 3px;
}
.ls-ntp-more:hover { background: var(--ls-hover); }
.ls-ntp-recent-list { display: flex; flex-direction: column; gap: 2px; }
.ls-ntp-recent-row {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  padding: 8px 8px; border: 0; border-radius: 4px; background: transparent; cursor: pointer;
}
.ls-ntp-recent-row:hover { background: var(--ls-hover); }
.ls-ntp-recent-ico {
  width: 28px; height: 28px; border-radius: 50%; background: var(--ls-omni);
  border: 1px solid var(--ls-line); display: inline-flex; align-items: center;
  justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0;
}
.ls-ntp-recent-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ls-ntp-recent-title {
  font-size: 13px; color: var(--ls-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ls-ntp-recent-url {
  font-size: 11px; color: var(--ls-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ls-ntp-empty { font-size: 12px; color: var(--ls-sub); padding: 8px 4px; }

/* ---- find bar */
.ls-find { position: absolute; top: 80px; right: 10px; z-index: 40; display: flex; align-items: center; gap: 2px; padding: 4px 6px; background: var(--ls-menu); border: 1px solid var(--ls-line); border-radius: 3px; box-shadow: 0 4px 14px rgba(0,0,0,.35); }
.ls-find[hidden] { display: none; }
.ls-find input { width: 150px; height: 26px; border: 0; border-bottom: 2px solid var(--ls-accent); background: transparent; color: var(--ls-text); outline: 0; font: inherit; padding: 0 4px; }
.ls-find .ls-ib { width: 26px; height: 26px; }

/* ---- overlay preview (page see-through, editor underneath stays usable) */
.ls-browser-shell.is-overlay { pointer-events: none; background: transparent; }
.ls-browser-shell.is-overlay .ls-tabstrip { display: none; }
.ls-ov-close { display: none !important; }
.ls-browser-shell.is-overlay .ls-ov-close { display: inline-flex !important; }
.ls-browser-shell.is-overlay .ls-chrome { pointer-events: auto; }
.ls-browser-shell.is-overlay .ls-stage { opacity: var(--ls-op, 1); pointer-events: none; background: transparent; }
.ls-browser-shell.is-overlay .ls-stage * { pointer-events: none; }
.ls-browser-shell.is-overlay .ls-dd-layer, .ls-browser-shell.is-overlay .ls-find { pointer-events: auto; }

/* ---- dropdown menu (desktop style) */
.ls-dd-layer { position: absolute; inset: 0; z-index: 60; }
.ls-dd-backdrop { position: absolute; inset: 0; background: transparent; }
.ls-dd-menu {
  position: absolute; min-width: 220px; max-width: calc(100% - 8px); padding: 6px 0;
  background: var(--ls-menu, #292a2d); color: var(--ls-text, #e8eaed);
  border: 1px solid var(--ls-line, #3c4043); border-radius: 3px;
  box-shadow: 0 4px 16px rgba(0,0,0,.4); font-size: 13px; overflow: auto;
}
.ls-dd-item { display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 6px 14px 6px 8px; cursor: pointer; white-space: nowrap; user-select: none; }
.ls-dd-item:hover, .ls-dd-item.is-active { background: var(--ls-hover, rgba(128,128,128,.22)); }
.ls-dd-item.is-disabled { opacity: .45; pointer-events: none; }
.ls-dd-check { width: 14px; height: 14px; display: inline-flex; flex-shrink: 0; }
.ls-dd-label { flex: 1; }
.ls-dd-arrow { opacity: .7; display: inline-flex; }
.ls-dd-sep { height: 1px; margin: 6px 0; background: var(--ls-line, rgba(128,128,128,.3)); }
.ls-dd-custom { padding: 2px 8px 2px 22px; }
.ls-zoomrow { display: flex; align-items: center; gap: 4px; min-height: 32px; }
.ls-zoomrow .ls-zl { flex: 1; }
.ls-zoomrow .ls-zv { min-width: 44px; text-align: center; }
.ls-zoomrow .ls-ib { width: 26px; height: 26px; color: var(--ls-text); }

/* ---- opacity panel */
.ls-dd-panel { width: 250px; padding: 12px 14px; }
.ls-op-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ls-op-val { color: var(--ls-accent); font-variant-numeric: tabular-nums; }
.ls-range { -webkit-appearance: none; appearance: none; width: 100%; height: 18px; margin: 0; background: transparent; outline: 0; }
.ls-range::-webkit-slider-runnable-track { height: 4px; border-radius: 3px; background: linear-gradient(to right, var(--ls-accent) var(--ls-fill, 100%), var(--ls-line) var(--ls-fill, 100%)); }
.ls-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; margin-top: -6px; border-radius: 50%; background: var(--ls-accent); border: 0; }
.ls-range::-moz-range-track { height: 4px; border-radius: 3px; background: var(--ls-line); }
.ls-range::-moz-range-progress { height: 4px; border-radius: 3px; background: var(--ls-accent); }
.ls-range::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: var(--ls-accent); border: 0; }
.ls-op-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; cursor: pointer; }
.ls-op-row.is-disabled { opacity: .45; pointer-events: none; }
.ls-op-hint { margin-top: 8px; font-size: 11px; color: var(--ls-sub); }
.ls-switch { position: relative; flex: none; width: 36px; height: 20px; }
.ls-switch::before { content: ""; position: absolute; inset: 0; border-radius: 3px; background: var(--ls-line); transition: background .15s; }
.ls-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 3px; background: var(--ls-text); transition: transform .15s; }
.ls-switch.is-on::before { background: var(--ls-accent); }
.ls-switch.is-on::after { transform: translateX(16px); background: #fff; }

 #ls-deps-picker{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center}
.ls-dp-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.45)}
.ls-dp-card{position:relative;width:min(420px,92vw);max-height:min(72vh,540px);display:flex;flex-direction:column;border-radius:3px;background:var(--secondary-color,#1e1e1e);color:var(--color,#e0e0e0);overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.4)}
.ls-dp-header{padding:12px 14px 8px;border-bottom:1px solid rgba(128,128,128,.25)}
.ls-dp-title{font-weight:600}
.ls-dp-subtitle{font-size:.75rem;opacity:.75;margin-top:4px}
.ls-dp-body{flex:1;overflow:auto;padding:8px 12px}
.ls-dp-row{display:flex;align-items:center;gap:10px;padding:8px 6px;border-radius:3px;margin-bottom:4px;background:rgba(128,128,128,.08)}
.ls-dp-status.ok{color:#66bb6a}.ls-dp-status.miss{color:#f48771}
.ls-dp-footer{display:flex;gap:8px;justify-content:flex-end;padding:10px 12px;border-top:1px solid rgba(128,128,128,.25)}
.ls-dp-btn{border:none;border-radius:3px;padding:8px 12px;background:rgba(128,128,128,.2);color:inherit}
.ls-dp-btn.ls-dp-install{background:var(--active-color,#61afef);color:#111;font-weight:600}
.ls-dp-progress-track{height:3px;border-radius:3px;background:rgba(128,128,128,.25);overflow:hidden}
.ls-dp-progress-bar{height:100%;background:var(--active-color,#61afef);transition:width .25s}
.ls-dp-spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(128,128,128,.35);border-top-color:var(--active-color,#61afef);animation:ls-spin .7s linear infinite}
@keyframes ls-spin{to{transform:rotate(360deg)}}



.ls-progress { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; overflow: hidden; display: none; }
.ls-browser-shell.is-loading .ls-progress { display: block; }
.ls-progress::before { content: ""; position: absolute; top: 0; bottom: 0; width: 30%; background: var(--ls-accent); animation: ls-bar 1.1s ease-in-out infinite; }

.ls-green-progress { position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; overflow: hidden; display: none; background: rgba(34, 197, 94, 0.16); }
.ls-browser-shell.is-installing .ls-green-progress { display: block; }
.ls-green-progress::before {
  content: ""; position: absolute; top: 0; bottom: 0; width: 35%;
  background: linear-gradient(90deg, #16a34a, #4ade80, #22c55e);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.85);
  animation: ls-bar 1.1s ease-in-out infinite;
}
`;
export function injectBrowserStyles() {
  const old = document.getElementById('ls-browser-styles');
  if (old) old.remove();
  const s = document.createElement('style');
  s.id = 'ls-browser-styles';
  s.textContent = BROWSER_CSS;
  document.head.appendChild(s);
}