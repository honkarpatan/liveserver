# Live Server (Suger) — Rebuild Plan

Source baseline: [honkarpatan/liveserver](https://github.com/honkarpatan/liveserver) (v1.0.7, monolithic `main/ui/server/settings`).

Goal: modular rewrite — CM6-friendly, category settings, Chromium-like in-app browser module, silent deps (no terminal UI), dynamic side tools, reusable `modules/browser`.

---

## 1. `acodels` — copy from project, not live GitHub download

**Recommendation: keep / update `acodels/` inside the plugin tree (same project).**

| Approach | Verdict |
|----------|---------|
| **Vendor in repo** (`acodels/` next to `src/`) | **Best** — offline, fixed version, no network at install time, works Termux/SD/any storage after first npm install of *its* deps |
| GitHub clone at runtime | Fragile (no net, rate limits, path differences, slow on mobile) |
| Download tarball then copy | OK only as *dev* bootstrap; ship the folder in the zip |

**Install flow (user device):**

1. Plugin ships `acodels/` sources + `package.json`.
2. Deps popup runs **one-time** `npm install` *inside* that folder (via Executor / alpine, **no terminal tab**).
3. Server starts with `node acodels/index.js <port>` in background.

Do **not** `git clone` on every open. Optionally “Update backend” button can re-fetch a pinned release later.

---

## 2. Target folder structure (no giant files)

```
liveserver/
  plugin.json
  package.json
  icon.png
  readme.md
  acodels/                    # Node HTTP + WS backend (vendored)
    index.js
    package.json
    inspector.js
    zoom-handler.js
  src/
    main.js                   # thin entry
    core/
      initPlugin.js
      settings.js
      settingsDefaults.js
      settingsPages.js        # category hub (C++/Java style)
    server/
      port.js
      process.js              # start/stop/restart node backend (no terminal UI)
      rootFolder.js
      liveReload.js
      status.js
    deps/
      dependencyChecker.js
      depsPicker.js           # tick UI, progress, cancel, expand details
      installProgress.js
    browser/                  # REUSABLE MODULE (other plugins can copy)
      index.js                # createBrowserShell()
      tabManager.js
      chromeBar.js            # thin top bar (back/forward/reload/url/menu)
      menu.js                 # menu → submenu
      viewport.js             # iframe / WebView host
      fullscreen.js
      modes.js                # in-page | editor-tab
      theme.js                # Acode CSS vars, radius ≤ 3px
      icons.js                # SVG only
      styles.css
    ui/
      sideButton.js           # green-dot when live
      toolsMenu.js            # start/stop, restart, port, root…
      styles.css
    commands/
      palette.js              # command palette entries
    utils/
      paths.js                # termux / sdcard / content:// normalize
      alpineExec.js
      svg.js
```

---

## 3. Browser module (desktop Chromium feel)

**Modes (settings):**

- `browserDisplayMode`: **`inPage`** (default) | `editorTab`

**Chrome UI:**

- Thin top bar: back · forward · reload · URL · menu · fullscreen
- **Multi-tab** (Windows-style): new tab, close, switch, favicon optional
- Fullscreen + exit fullscreen
- **border-radius ≤ 3px** everywhere except true circles (spinner/avatar)
- Acode theme: `--primary-color`, `--secondary-color`, `--active-color`, `--popup-border-color`, etc.
- **SVG icons only** — no emoji
- Short CSS transitions (150–220ms)
- Menu with **submenu** where needed (e.g. Tools → Zoom, Console, DevTools)

**API for reuse:**

```js
import { createBrowserShell } from './browser';

const shell = createBrowserShell({
  acode,
  theme: 'acode',
  mode: 'inPage', // or 'editorTab'
  initialUrl: 'http://127.0.0.1:8080/',
});
shell.open();
shell.addTab(url);
shell.setFullscreen(true);
shell.dispose();
```

---

## 4. Dependencies popup (no terminal)

**When:**

- First open of an `.html` / `.htm` file after Acode restart, **or**
- Required deps missing (`node`, `npm`; backend `node_modules` for `acodels`)

**Once per session** after “Not now” or successful install — same pattern as C++/Java.

**UI:**

- Linux-ish card, Acode colors, radius 3px
- Rows with **tick** (installed / missing)
- **Install selected** · **Not now**
- Progress: thin bar, short status line, **Stop / Cancel**, **Expand details** (log)

**Paths:** resolve project root via active file URI (Termux home, SD card, Acode virtual) — never assume a single fixed disk.

**Never open a terminal tab** for install or server start — background Executor / silent script only; progress only in popup.

---

## 5. Side button (dynamic)

- Visible on HTML (and optionally CSS/JS when server already live)
- **Green status dot** when server is running
- Click → tools menu (like Java Tools):

| Item | Behavior |
|------|----------|
| **Start live server** / **Stop live server** | Label flips with state |
| Restart server | Stop + start same root/port |
| Change port | Prompt → restart |
| Select root folder | Folder picker; saved in settings |
| Open browser | Show shell in current mode |
| Quick: live reload on/off | Toggle |
| Check dependencies | Force deps picker |

---

## 6. Command palette

1. **Run this file in HTTP server** — active editor file; if none → toast “Open a file first” (or hide command)
2. **Select root folder** — also in Tools + Settings
3. **Run HTTP server (selected folder)** — selected folder in file browser, not necessarily active file; settings shows current root

---

## 7. Settings categories (feasible subset)

### General / Server

| Setting | Feasible | Notes |
|---------|----------|--------|
| Status (running / stopped) + URL | Yes | Read-only status row |
| Port | Yes | Default 8080 (or keep 1024+ if preferred) |
| IP version IPv4 / show lo address | Partial | List local addresses via backend if available |
| URL `http://127.0.0.1:port` | Yes | |
| Root folder | Yes | |
| Start / stop from settings | Yes | |
| Browser: in page \| editor tab | Yes | |
| Live reload on save | Yes | |
| Open browser on start | Yes | |

### HTML / static

| Setting | Feasible | Notes |
|---------|----------|--------|
| Enable directory listing | Yes | Express `serve-index` or custom |
| Custom charset | Yes | Header |
| Custom response headers | Yes | |
| Configure CORS | Yes | Already using `cors` |
| Edit redirections | Yes | Simple path map JSON |

### Security (practical on local mobile)

| Setting | Feasible | Notes |
|---------|----------|--------|
| Restrict network interfaces | Partial | Bind `127.0.0.1` vs `0.0.0.0` |
| White list of clients (IPs) | Yes | Middleware |
| Require authorization | Optional | Basic auth |
| Use TLS (HTTPS) | Optional / hard | Self-signed on device is painful; phase 2 |
| Verify Host header | Yes | |
| Request rate limit | Optional | Simple token bucket |

### Not practical / skip (or far later)

- WebDAV, Remote screen sharing / remote control, Keep screen on, Ask before anyone sees screen  
- SQLite database server feature  
- CGI / Intent handlers / Autostart on boot / Battery optimization (Android system)  
- Allow control by external app (needs deep integration)

### Handlers / WebSocket

| Setting | Feasible | Notes |
|---------|----------|--------|
| Enable WebSocket channels | Yes | Already WS for reload; optional extra channels |
| CGI / command scripts | No (security) | Skip |

### Misc

| Setting | Feasible | Notes |
|---------|----------|--------|
| Auto shutdown by inactivity | Yes | Timer in plugin |
| Exclude from battery optimization | No | OS settings only; link/toast hint |

---

## 8. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **0** | Scaffold folders, settings hub, defaults, SVG icons |
| **1** | Deps picker + progress (node/npm + `acodels` npm install), once-per-restart check |
| **2** | Server start/stop/restart/port/root — silent process, status API |
| **3** | Browser module: bar, tabs, fullscreen, in-page mode, theme |
| **4** | Editor-tab mode, side button green dot + tools menu |
| **5** | Command palette + settings: listing, CORS, headers, bind address, live reload |
| **6** | Polish transitions, submenu, optional auth / IP allowlist |

---

## 9. Hard rules (product)

- No emoji in UI — SVG only  
- `border-radius` ≤ **3px** (circles exempt)  
- No terminal window for server or install  
- Modular files — avoid 500+ line god files  
- Theme follows Acode CSS variables  
- Works from Termux, SD card, and Acode storage after path normalize  

---

## 10. Next step

Start **Phase 0 + 1**: scaffold under `liveserver acode plugin/` and port `acodels` from GitHub tree into the project as vendored backend, then deps popup matching Java/C++ UX.
'''

## Status (2026-11-15)

Phase **0 + 1** scaffolded under `liveserver acode plugin/`:

- Vendored `acodels/` from GitHub tree
- Modular `src/` (core, server, deps, browser, ui, commands, utils)
- Category settings hub
- Deps picker + once-per-restart ensure on HTML open
- Side button tools menu + green live indicator class
- Browser shell (in-page, multi-tab, thin bar, fullscreen)
- Command palette stubs
- Silent process start via Executor (no terminal tab)

**Build:** run `npm install && npm run build` on device/dev machine → `dist/main.js`.


### Phase 2 done
- acodels: /status, /reload, directory listing, CORS, headers, whitelist, basic auth, bind host argv
- process: full setup payload, page URL for active file, inactivity auto-stop, reapplySetup
- liveReload on save-file → POST /reload
- settings: server status action


### Phase 3 done
- browser/tabManager.js — multi-tab, navigate, history, strip UI
- browser/menu.js — Navigation / Tabs / View submenus, copy URL
- browser/editorTab.js — EditorFile host + fallback
- browser/fullscreen.js + polished styles (transitions, mobile width)
- browser/index.js orchestrates inPage | editorTab


### Phase 4 done
- Root picker UX (active folder / type path / clear)
- Command palette: restart, open browser, settings
- Side button live indicator CSS + label
- Settings: Open browser action
- readme.md
