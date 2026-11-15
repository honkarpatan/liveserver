<style>
html {
  scroll-behavior: smooth;
}
.feature {
  background: rgba(0, 120, 215, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  color: #0078d4;
}
.keywords {
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: monospace;
  color: #d63384;
}
.premium {
  background: linear-gradient(90deg, #976700, #baa815);
  padding: 2px 8px;
  border-radius: 2px;
  font-weight: bold;
  color: white;
  font-size: 0.8em;
}
.new-badge {
  background: #ff4757;
  padding: 2px 6px;
  border-radius: 2px;
  font-weight: bold;
  color: white;
  font-size: 0.7em;
  vertical-align: middle;
}
.box {
  border: 1px solid #e0e0e0;
  padding: 15px;
  border-radius: 2px;
  background-color: #000000;
  margin: 10px 0;
}
</style>

<div style="padding: 20px; background: #f8f9fa; border-bottom: 2px solid #0078d4; margin-bottom: 20px;">
<div style="display:flex;align-items:center;">
    <img src="https://i.postimg.cc/kMf1dhFP/icon.png" alt="Suger Server Icon" style="height:40px;margin-right:10px;margin-bottom: 8px;">
    <h1 style="color: #333;">Suger Server</h1>
    </div>
  <p style="margin: 5px 0 0 0; color: #666;">Professional Live Server for Acode with Termux Integration & Node.js Backend</p>
  <div style="margin-top: 10px;">
    <span style="background: #333; color: #fff; padding: 2px 6px; border-radius: 2px; font-size: 12px;">v1.0.7</span>
    <span style="background: #28a745; color: #fff; padding: 2px 6px; border-radius: 2px; font-size: 12px;">Stable</span>
  </div>
</div>

**Suger Server** brings the power of a real-time local development server to Acode. It automatically reloads your browser whenever you save a file, making mobile web development faster and smoother. Now includes **Termux Bridge**, **Smart History Navigation**, and built-in support for <span class="feature">Node.js</span>, <span class="feature">Eruda</span>, and the advanced <span class="premium">Suger DevTool</span>.

---

<center>

 <img src="https://i.postimg.cc/hvSyLS0y/Screenshot-2025-12-04-07-24-23-37-a2cf8efcdd42a8e6f7906303f104fb67.jpg" alt="Suger Server Demo" style="width:98%;max-width:600px;border-radius:5px;">




<div style="display:flex;overflow:auto; gap:8px;">
  <img src="https://i.postimg.cc/bvBqr4dg/Picsart-25-12-19-17-33-11-835.jpg" alt="Demo 1" style="width:280px;border-radius:5px;">
  
  <img src="https://i.postimg.cc/vmG9YgkK/Screenshot-2025-12-19-17-17-19-59-e3c1f266f17b29c7b40472751f031275.jpg" alt="Demo 1" style="width:280px;border-radius:5px;">
  
  <img src="https://i.postimg.cc/9fX1Y2Hh/Screenshot-2025-11-24-09-09-54-21-a2cf8efcdd42a8e6f7906303f104fb67.jpg" alt="Demo 1" style="width:280px;border-radius:5px;">
  <img src="https://i.postimg.cc/bJn4n8hX/Screenshot-2025-11-24-10-30-13-43-a2cf8efcdd42a8e6f7906303f104fb67.jpg" alt="Demo 2" style="width:280px;border-radius:5px;">
  <img src="https://i.postimg.cc/jjqv4T0p/Screenshot-2025-11-24-09-17-20-32-a2cf8efcdd42a8e6f7906303f104fb67.jpg" alt="Demo 3" style="width:280px;border-radius:5px;">
</div>
</center>

--- 

<h2 style="display:flex;align-items:center;">
  <a style="text-decoration:none; color:inherit;">
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="red" style="vertical-align:middle; margin-right:6px;">
      <path d="M23.498 6.186a2.997 2.997 0 0 0-2.112-2.12C19.508 3.5 12 3.5 12 3.5s-7.507 0-9.386.566A2.997 2.997 0 0 0 .502 6.186 31.221 31.221 0 0 0 0 12a31.221 31.221 0 0 0 .502 5.814 2.997 2.997 0 0 0 2.112 2.12C4.493 20.5 12 20.5 12 20.5s7.508 0 9.386-.566a2.997 2.997 0 0 0 2.112-2.12A31.221 31.221 0 0 0 24 12a31.221 31.221 0 0 0-.502-5.814zM9.75 15.568V8.432L15.818 12 9.75 15.568z"/>
    </svg>
    Watch Plugin Now
  </a>
</h2>

<details> 
  <summary style="font-style:bold;"><span style="color:#153fe1;">Click to Watch New 1.0v Video</span></summary> 
  <iframe width="100%" height="600px" src="https://www.youtube.com/embed/XT-o9NIlQJE?si=Renv4U9nvjjgJgWi" frameborder="0" allowfullscreen></iframe>
</details>

---

---

## Core Features

This is a full-fledged server environment running directly on your device.

* <span class="feature">Auto Reload</span> Instantly refreshes the preview when you save HTML, CSS, or JS files.
* <span class="feature">Real Node.js Server</span> Runs a lightweight Node.js backend for robust performance.
* <span class="feature">Smart Dependency Manager</span> Automatically checks and installs required packages (Node, NPM, Git).
* <span class="feature">Custom Port</span> Choose your preferred server port (Default: `1024`) and preview port.

---

## Termux Integration (How to Use)

If you prefer running your server via Termux for more control, Suger Server makes it instant.

1. Open any HTML file in Acode.
2. Open the **Suger Server** window (Side Button).
3. Click on the **Terminal Icon** <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg> in the toolbar.
4. A "One-line Command" is automatically copied to your clipboard.
5. Open Termux and **Paste**.

The command automatically navigates to your project folder and starts a server on port `8080` (or `8081` if busy).

---

## Debugging Tools

Suger Server comes with two powerful debugging options. You can switch between them in the Plugin Settings.

### 1. Eruda Console
For quick and lightweight debugging, Eruda is included out-of-the-box.
* Basic Console logging.
* Simple DOM inspection.
* Lightweight execution.

### <span style="color:#cbb236;">2. Suger DevTool (Advanced)</span>

Turn your Acode editor into a desktop-class development environment. **Suger DevTool** offers **90%+ parity with V8 Engine (Chrome) DevTools**.

<div class="box">
  <strong>[Important]</strong> This is a <span class="premium">Premium Feature ⭐</span>.
  <br>
  You need a valid license key to use Suger DevTool.
  <br><br>
  <a href="https://suger-devtool.vercel.app"><strong>Get Lifetime License 👈</strong></a>
  <br>
  <em>For a 2-day free trial, contact support on <a href="https://t.me/cosmodec">Telegram</a>.</em>
</div>

#### Why Suger DevTool?

* **Elements Panel**: Full DOM Tree, Computed Styles, Box Model, and Visual Layout Debugging.
* **Network Inspector**: Waterfall Chart, Request Interception, and XHR/Fetch Breakpoints.
* **Pro Debugger (Source)**: Async/Await stepping, Breakpoints, and Scope Analysis.
* **Application Tab**: Manage LocalStorage, SessionStorage, Cookies, IndexedDB, and Service Workers.
* **Advanced Console**: Rich Object/JSON formatting and Top-level Await support.

---

## Standalone Usage (Use Anywhere)

You can use Suger DevTool in any HTML project outside of Acode.

### Step 1: Service Worker Setup
Download `devtool-sw.js` and place it in the **root folder** of your project.
* **Download:** [Click to Download devtool-sw.js](https://raw.githubusercontent.com/Sou6900/acodels_suger/refs/heads/main/devtool-sw.js)

### Step 2: Inject Script
Add the following script tag to your HTML file:

### Download Suger DevTool ⬇️
[https://raw.githubusercontent.com/Sou6900/acodels_suger/refs/heads/main/dt/suger-dev.js](https://raw.githubusercontent.com/Sou6900/acodels_suger/refs/heads/main/dt/suger-dev.js)

```html
<script src="dt/suger-dev.js"></script>
````

-----

## Settings

Configure the server behavior from **Acode > Settings > Plugins > Suger Server**.

| Setting | Description |
| :-- | :-- |
| <span class="keywords">Disable Live Server</span> | Temporarily turn off the plugin. |
| <span class="keywords">Server Port</span> | Fixed port for the internal server (Default: `1024`). |
| <span class="keywords">Preview Port</span> | Port used for the Preview/Termux mode (e.g., `8080`). |
| <span class="keywords">DevTool Type</span> | Choose **Suger DevTool** or **Eruda**. |
| <span class="keywords">Re-check Dependencies</span> | Force re-installation of Node.js/Git. |

-----

## Troubleshooting

**Server failed to start / Port busy**

  * Change the <span class="keywords">Server Port</span> in settings.
  * Use the **Termux Button** to run the server externally if the internal port is blocked.

**Dependencies missing**

  * Click on <span class="keywords">Re-check/Install Dependencies</span> in plugin settings.

**Termux Command not working**

  * Ensure you have `nodejs` installed in Termux (`pkg install nodejs-lts`).

-----

## Support & Contact

<center>
<div>
<img src="https://i.postimg.cc/h4MD2bdN/Screenshot-2025-11-24-09-25-52-66-4d38fce200f96aeac5e860e739312e76.jpg" alt="Support" style="width:98%;max-width:600px;border-radius:5px;">
</div>
</center>

  * **Purchase Key:** [Official Website](https://suger-devtool.vercel.app)
  * **Trial & Help:** [Telegram Support (@cosmodec)](https://t.me/cosmodec)
  * **Report Bugs:** [Acode Plugin Page](https://www.google.com/search?q=https://acode.app/plugin/plugin.acode.liveserver/comments)

