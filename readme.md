# Live Server for Acode

Local HTTP preview with live reload, in-app browser, and silent dependency install.

**Version 2** — modular rewrite (no terminal tab for install/start).

---

## Features

- **HTTP server** via vendored Node backend (`acodels/`)
- **Live reload** on save (WebSocket + save hook)
- **In-app browser** — multi-tab, address bar, fullscreen, menu/submenus  
  Display: **in page** (default) or **editor tab**
- **Side button** — green indicator when live; start/stop, port, root, browser, deps
- **Dependencies popup** — node / npm / `acodels` modules; tick + progress (once per restart on HTML open)
- **Category settings** — General, Browser, HTML/static, Security, Dependencies
- **Command palette** — run file, select root, run root, stop, restart, open browser, settings

---

## Requirements

- Acode (min version code 290+)
- Background shell executor (Termux / Acode Executor) for Node
- **node** + **npm** (installable from the deps popup)

---

## Quick use

1. Open an `.html` file  
2. Install deps if prompted  
3. Side button → **Start live server**  
4. Browser opens (or use **Open browser**)

**Root folder:** Tools / Settings / command **Select root folder**  
Empty root = folder of the active file.

---

## Settings (summary)

| Category | Options |
|----------|---------|
| **General** | Port, bind address, root, live reload, open browser on start, auto-shutdown, start/stop |
| **Browser** | In page \| Editor tab, address bar, side button |
| **HTML / static** | Directory listing, CORS, charset, custom headers |
| **Security** | Localhost preference, IP whitelist, basic auth |
| **Dependencies** | Check / reinstall |

---

## Commands

- `Live Server: Run this file in HTTP server`
- `Live Server: Select root folder`
- `Live Server: Run HTTP server for selected / saved root`
- `Live Server: Stop server`
- `Live Server: Restart server`
- `Live Server: Open browser`
- `Live Server: Open settings`

---

## Build

```bash
npm install
npm run build
```

Entry: `dist/main.js` (see `plugin.json`).

Backend sources ship in `acodels/` (not downloaded at runtime). First-time `npm install` inside `acodels` runs from the deps UI.

---

## License

See plugin listing.
