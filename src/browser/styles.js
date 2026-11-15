let injected = false;

export function injectBrowserStyles() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.id = 'ls-browser-styles';
  s.textContent = `
/* Live Server browser shell — radius ≤ 3px, Acode theme */
#ls-browser-shell.ls-browser-shell {
  position: fixed; left: 0; right: 0; bottom: 0; top: 26%;
  z-index: 99990; display: none; flex-direction: column;
  background: var(--secondary-color, #1e1e1e);
  color: var(--color, #e0e0e0);
  border-top: 1px solid var(--popup-border-color, rgba(128,128,128,0.35));
  border-radius: 3px 3px 0 0;
  opacity: 0;
  transform: translateY(8px);
  transition: transform 0.2s ease, opacity 0.18s ease;
  box-shadow: 0 -4px 24px rgba(0,0,0,0.35);
}
#ls-browser-shell.is-open {
  display: flex;
  opacity: 1;
  transform: translateY(0);
}
#ls-browser-shell.is-fullscreen {
  top: 0; border-radius: 0;
}
.ls-browser-top {
  display: flex; align-items: center; gap: 4px; min-height: 34px;
  padding: 2px 6px; border-bottom: 1px solid rgba(128,128,128,0.25);
  flex-shrink: 0;
}
.ls-browser-tabs {
  flex: 1; display: flex; gap: 3px; overflow-x: auto; min-width: 0;
  scrollbar-width: none;
}
.ls-browser-tabs::-webkit-scrollbar { height: 0; }
.ls-tab {
  display: inline-flex; align-items: center; gap: 4px; max-width: 148px;
  padding: 5px 8px; font-size: 12px; border: none; border-radius: 3px;
  background: rgba(128,128,128,0.14); color: inherit; cursor: pointer;
  white-space: nowrap; flex-shrink: 0;
  transition: background 0.15s ease;
}
.ls-tab.is-active {
  background: var(--active-color, #61afef); color: #111;
}
.ls-tab.is-loading .ls-tab-label { opacity: 0.65; }
.ls-tab-label {
  overflow: hidden; text-overflow: ellipsis; max-width: 110px;
}
.ls-tab-x {
  display: inline-flex; opacity: 0.65; border-radius: 3px; padding: 1px;
}
.ls-tab-x:hover { opacity: 1; background: rgba(0,0,0,0.12); }
.ls-browser-bar {
  display: flex; align-items: center; gap: 4px; padding: 4px 6px;
  border-bottom: 1px solid rgba(128,128,128,0.2); flex-shrink: 0;
}
.ls-browser-url {
  flex: 1; min-width: 0; height: 30px; border-radius: 3px;
  border: 1px solid rgba(128,128,128,0.35);
  background: var(--primary-color, #252525); color: inherit;
  padding: 0 10px; font-size: 13px; outline: none;
}
.ls-browser-url:focus {
  border-color: var(--active-color, #61afef);
}
.ls-browser-iconbtn {
  width: 30px; height: 30px; border: none; border-radius: 3px; cursor: pointer;
  background: transparent; color: inherit;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background 0.15s ease;
}
.ls-browser-iconbtn:active,
.ls-browser-iconbtn:hover {
  background: rgba(128,128,128,0.18);
}
.ls-browser-views {
  flex: 1; position: relative; min-height: 0; background: #fff;
}
.ls-browser-views.is-mobile {
  display: flex; justify-content: center; background: var(--primary-color, #111);
}
.ls-browser-views.is-mobile .ls-browser-frame {
  width: min(390px, 100%); left: 50%; transform: translateX(-50%);
  border-left: 1px solid rgba(0,0,0,0.15); border-right: 1px solid rgba(0,0,0,0.15);
}
.ls-browser-frame {
  position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #fff;
}
/* Host inside editor tab */
.ls-editor-tab-host .ls-browser-shell,
.ls-editor-tab-host #ls-browser-shell {
  position: relative !important; inset: auto !important; top: auto !important;
  flex: 1; height: 100%; width: 100%; display: flex !important;
  opacity: 1 !important; transform: none !important;
  box-shadow: none; border-radius: 0; border-top: none; z-index: 1;
}
body.ls-browser-fs { overflow: hidden; }
`;
  document.head.appendChild(s);
}
