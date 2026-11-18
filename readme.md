<div style="display:flex;align-items:center;background: linear-gradient(to right, #5b7c99, #6b7280);padding:10px;height:40px;margin:0;font-size:10px;">
  <svg width="40" height="40" viewBox="0 0 24 24" style="margin-right:10px;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#e8f0fe"/>
    <path d="M8 12h8M12 8v8" stroke="#1a73e8" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M6 16.5c1.5 1.2 3.5 2 6 2s4.5-.8 6-2" stroke="#34a853" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  </svg>
  <h1 style="margin:0;">
    <span style="background: linear-gradient(135deg, #0f172a, #1e293b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: bold;">Live Server</span>
    <sup style="font-size:0.6rem;font-weight:300;color:#111;padding:0 0 0 5px;">for Acode</sup>
  </h1>
  <div style="margin-left:auto;display:flex;flex-direction:column;gap:5px;">
    <small style="font-size:0.6em;color:#0f4128;">v2</small>
    <small style="font-size:0.6em;color:#403710;">Stable</small>
  </div>
</div>

Local HTTP preview with **live reload**, in-app browser, and silent dependency install — for Acode on Android.

---

<div style="border-left: 4px solid #f59e0b; background: rgba(245,158,11,0.10); padding: 10px 15px; border-radius: 3px; margin: 12px 0;">
<b>Note</b><br>
Starting from <b>external SD card</b> may fail if Alpine cannot see that mount — prefer internal storage (<code>/sdcard</code>) or set a reachable root folder. Permission and path mapping matter.
</div>

---

<p align="center">
  <img src="https://img.shields.io/badge/Live_reload-1a73e8?style=for-the-badge">
  <img src="https://img.shields.io/badge/In--app_browser-34a853?style=for-the-badge">
  <img src="https://img.shields.io/badge/Side_button-f59e0b?style=for-the-badge">
  <img src="https://img.shields.io/badge/Deps_popup-9333ea?style=for-the-badge">
  <img src="https://img.shields.io/badge/Category_settings-0ea5e9?style=for-the-badge">
  <img src="https://img.shields.io/badge/Node_backend-64748b?style=for-the-badge">
</p>

---

## Features

<div style="border-left: 4px solid #1a73e8; background: rgba(26,115,232,0.08); padding: 10px 15px; border-radius: 3px; margin: 10px 0;">
<b>HTTP server + live reload</b><br>
Vendored Node backend (<code>acodels</code>). WebSocket reload on save. Port and bind address configurable.
</div>

<div style="border-left: 4px solid #34a853; background: rgba(52,168,83,0.08); padding: 10px 15px; border-radius: 3px; margin: 10px 0;">
<b>In-app browser</b><br>
Multi-tab chrome, address bar, home / NTP search, device mode, fullscreen, bookmarks, menu.<br>
Display: <b>in page</b> (default) or <b>editor tab</b>. Theme follows Acode (border radius ≤ 3px).
</div>

<div style="border-left: 4px solid #f59e0b; background: rgba(245,158,11,0.08); padding: 10px 15px; border-radius: 3px; margin: 10px 0;">
<b>Side button</b><br>
Quick tools: start / stop / restart, port, root folder, browser, dependencies, settings.
</div>

<div style="border-left: 4px solid #9333ea; background: rgba(147,51,234,0.08); padding: 10px 15px; border-radius: 3px; margin: 10px 0;">
<b>Dependencies</b><br>
Popup for <b>node</b>, <b>npm</b>, and <b>acodels</b> modules. Progress, logs, cancel. Checked once per restart when opening HTML if missing.
</div>

<div style="border-left: 4px solid #0ea5e9; background: rgba(14,165,233,0.08); padding: 10px 15px; border-radius: 3px; margin: 10px 0;">
<b>External sites</b><br>
Optional local reverse proxy for opening remote URLs inside the shell.
</div>

---

## Requirements

- Acode (min version code as in `plugin.json`)
- Background shell executor (Termux / Acode Executor)
- **node** + **npm** (install from the dependencies popup)

---

## Quick use

1. Open an `.html` file  
2. Install dependencies if prompted  
3. Side button → **Go Live** / start  
4. Browser opens (or use **Open browser**)

**Root folder:** tools / settings / **Select root folder**.  
Empty root = folder of the active HTML file.

---

## Settings (summary)

| Category | Options |
|----------|---------|
| **General** | Port, bind address, root, live reload, open browser on start, auto-shutdown |
| **Browser** | In page \| Editor tab, search engine, external site mode, home URL, opacity, overlay, address bar, side button, **running / offline labels** |
| **HTML / static** | Directory listing, CORS, charset, custom headers |
| **Security** | Localhost preference, IP whitelist, basic auth |
| **Dependencies** | Check / reinstall |

Side button labels support tokens **`{HOST}`** and **`{PORT}`**.

---

## Storage tips

| Location | Typical Alpine path | Notes |
|----------|---------------------|--------|
| Internal | `/sdcard/...` or `/storage/emulated/0/...` | Best supported |
| External SD | `/storage/XXXX-XXXX/...` | Probed; may fail if mount not visible to Executor |
| Termux home | `/data/data/com.termux/files/home/...` | Supported when path resolves |

If start fails with “Folder not reachable from Alpine”, pick a root under internal storage or grant storage access, then retry.

---

## Commands

- Run / preview current HTML  
- Select root folder  
- Start / stop / restart server  
- Open browser  
- Check dependencies  
- Open settings  

---

## License

See repository license file.
