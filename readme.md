<div style="display:flex;align-items:center;background: linear-gradient(to right, #022634, #01261f);padding:10px;height:40px;margin:0;font-size:10px;">
<img alt="" src="https://i.postimg.cc/5tsg9097/green-fox-html-server.png" style="width:40px;">
  <h1 style="margin: 10px 0px 0px 10px;">
    <span style="background: linear-gradient(135deg, #fff, #fff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: bold;">Html Server</span>
    <sup style="font-size:0.6rem;font-weight:300;color:#fff;padding:0 0 0 5px;">PRO</sup>
  </h1>
  <div style="margin-left:auto;display:flex;flex-direction:column;gap:5px;">
    <small style="font-size:0.6em;color:#fff;">v2</small>
    <small style="font-size:0.6em;color:#fff;">Stable</small>
  </div>
</div>

Local HTTP preview with **live reload**, in-app browser with auto setup — for Acode.

---

<div style="border-left: 4px solid #f59e0b; background: rgba(245,158,11,0.10); padding: 10px 15px; border-radius: 3px; margin: 12px 0;">
<b>Note</b><br>
  Working on Any path but Prefer Acode <b>Terminal Public</b> OR <b>Acode Storage</b> , SDcard or Other Storage may fail on Some Device !
</div>

<div style="border-left: 4px solid #1a73e8; background: rgba(26,115,232,0.10); padding: 10px 15px; border-radius: 3px; margin: 12px 0;">
<b>Network &amp; privacy</b><br>
  The preview server runs locally (<code>127.0.0.1</code>); the plugin has no analytics, telemetry or license server and only reaches the internet when <i>you</i> browse a site. <b>Developer tools</b> is optional: on first use, after you confirm, it downloads the open-source <a href="https://github.com/Sou6900/suger-devtool">Suger DevTool</a> (2.7 MB) from GitHub, verifies a fixed SHA-256 and caches it. It runs only inside the page you preview (it hooks that page's <code>fetch</code>/<code>XMLHttpRequest</code> to show the Network panel) and sends nothing anywhere.
</div>

---

<p align="center">
  <img src="https://img.shields.io/badge/Live_Server-1a73e8?style=for-the-badge">
  <img src="https://img.shields.io/badge/Node_backend-64748b?style=for-the-badge">
  <img src="https://img.shields.io/badge/In--app_browser-34a853?style=for-the-badge">
  <img src="https://img.shields.io/badge/Developer_Tool-f59e0b?style=for-the-badge">
</p>

---

## Preview 

 <div style="display:flex;text-align: center;overflow-x:scroll; gap:5px;">
  <img src="https://i.postimg.cc/wvBNwQpy/Green-Fox-Html-Server-Page.png" alt="Green-fox-live-server-startpage" style="width: 400px;">
  <img src="https://i.postimg.cc/rpKGcRgY/green-fox-server-homepage.jpg" alt="Green-fox-live-server-startpage" style="width: 400px;">
</div>


---

## ▶️ Watch Plugin Video | Смотреть видео | 观看视频  | Ver video  | مشاهدة الفيديو 

 <details>
  <summary style="font-weight:bold; cursor:pointer;"><a href="https://youtube.com/shorts/rqFa4eN-PWk?si=FRpmas88el8DVJ2J">Click to Watch Video [latest 2.0.0v]</a></summary>
  <iframe width="100%" height="250px" src="https://www.youtube.com/embed/rqFa4eN-PWk?si=FRpmas88el8DVJ2J" frameborder="0" allowfullscreen></iframe>
  <br>
</details>
  
---

## Features

<div style="border-left: 4px solid #1a73e8; background: rgba(26,115,232,0.08); padding: 10px 15px; border-radius: 3px; margin: 10px 0;">
<b>HTTP server + live reload</b><br>
Vendored Node backend (<code>acodels</code>). WebSocket reload on save. Port and bind address configurable.
</div>

<div style="border-left: 4px solid #34a853; background: rgba(52,168,83,0.08); padding: 10px 15px; border-radius: 3px; margin: 10px 0;">
<b>In-app browser</b><br>
Multi-tab chrome, address bar, home / NTP search, device mode, fullscreen, bookmarks, menu.<br>
Display: <b>in page</b> (default) or <b>editor tab</b>.
</div>

<div style="border-left: 4px solid #f59e0b; background: rgba(245,158,11,0.08); padding: 10px 15px; border-radius: 3px; margin: 10px 0;">
<b>Side button</b><br>
Quick tools: start / stop / restart, port, root folder, browser, dependencies, settings.
</div>

<div style="border-left: 4px solid #9333ea; background: rgba(147,51,234,0.08); padding: 10px 15px; border-radius: 3px; margin: 10px 0;">
<b>More...</b>
</div>

---

## Requirements

- Acode (min version >= 1.13)
- Acode Built-In Terminal
- **node** + **npm** (install from the dependencies popup)

---

## Quick use

1. Open an `.html` file  
2. Install dependencies if prompted  
3. Side button → **Go Live** -> `start live server`

   <div style="display:flex;align-items:center;gap :10px;">
   <img src="https://i.postimg.cc/43GtCTz2/Go-live.jpg" style="width:40px;">
   <img src="https://i.postimg.cc/QMbrmp85/live-server-running.jpg" style="width:55px;">
  </div>
    
5. Browser opens autometically (Next time use **play button** OR **Open browser** from side tools)
   
   <img src="https://i.postimg.cc/XN5s0nFS/live-server-play-preview-button.png" style="height:50px;">

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
| Internal | `file:///data/user/0/com.foxdebug.acodefree/files/public/YOUR_PROJECT_FOLDER` | Best supported |
| External SD | `/storage/XXXX-XXXX/...` | Probed; may fail if mount not visible to Executor |
| Termux home | `/data/data/com.termux/files/home/...` | Supported when path resolves |

If start fails with “Folder not reachable from Alpine”, pick a root under Acode terminal storage or grant storage access, then retry.

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

Proprietary

### Author

**Devs. Sou** <br>
*Green Fox - HTML Server for Acode Editor*  
<a href="https://t.me/sourav0chand" target="_blank">
  <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/telegram.svg" width="16" style="vertical-align: middle;"/> Telegram
</a>
