import { pageStyles } from './styles.js';
import { chromeSVG, shareSVG, consoleSVG, refreshSVG , searchSVG , eyeSVG , termuxSVG , backSVG , forwardSVG } from './svg.js'; 
import { getSettings } from './settings.js';
import { resolvePath } from './utils.js'; 

const { editorManager } = window;
const editorFile = acode.require('editorFile');
const SideButton = acode.require('sideButton');

let BigScreenContent;
let pluginId;
let onToggleConsoleCallback = null;
let onInspectCallback = null; 
let lastKnownPath = null;

let historyStack = [];
let forwardStack = [];
let currentURL = ""; 
let currentMode = "server"; 

function getNoCacheUrl(url) {
    try {
        if (!url || url.startsWith('data:') || url.startsWith('suger:')) return url;
        const urlObj = new URL(url);
        urlObj.searchParams.set('t', Date.now()); 
        return urlObj.toString();
    } catch (e) {
        return url;
    }
}

// ✅ SETUP PAGE GENERATOR
// ✅ PROFESSIONAL SETUP PAGE GENERATOR (Updated Design)
// ✅ PROFESSIONAL SETUP PAGE GENERATOR (Icon Inside Buttons)
function getTermuxSetupHtml(port, dirPath) {
    const settings = getSettings();
    const userPort = settings.previewPort || 8080;
    
    // Server Code Logic
    const rawServerCode = `
const http = require('http'); const fs = require('fs'); const path = require('path');
const port = ${userPort};
const mimeTypes = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpg', '.svg': 'image/svg+xml', '.txt': 'text/plain'};

const serveFile = (filePath, res) => {
    const extname = path.extname(filePath);
    let contentType = mimeTypes[extname] || 'application/octet-stream';
    fs.readFile(filePath, (error, content) => {
        if (error) { res.writeHead(500); res.end('Error: '+error.code); }
        else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
};

http.createServer((req, res) => {
    let cleanUrl = req.url.split('?')[0];
    try { cleanUrl = decodeURIComponent(cleanUrl); } catch(e){}
    let filePath = '.' + cleanUrl;
    
    fs.stat(filePath, (err, stats) => {
        if (err) { res.writeHead(404); res.end('404 Not Found'); return; }
        
        if (stats.isDirectory()) {
            const indexPath = path.join(filePath, 'index.html');
            if (fs.existsSync(indexPath)) { serveFile(indexPath, res); } 
            else {
                fs.readdir(filePath, (err, files) => {
                    if (err) { res.writeHead(500); res.end('Error'); return; }
                    let list = '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:monospace;padding:20px}a{display:block;padding:10px;text-decoration:none;color:#007bff;border-bottom:1px solid #eee}a:hover{background:#f8f9fa}</style></head><body><h3>Directory: '+cleanUrl+'</h3>';
                    if(cleanUrl!=='/') list+='<a href="../">Parent Directory</a>';
                    files.forEach(f => {
                        let p = path.join(cleanUrl, f);
                        list += '<a href="'+p+'">'+ (f.indexOf('.')>0?'FILE: ':'DIR: ') + f + '</a>';
                    });
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(list);
                });
            }
        } else { serveFile(filePath, res); }
    });
}).listen(port, () => { console.log('Server running on ' + port); });
`;

    const minified = rawServerCode.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const shellSafe = minified.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const cmd = `cd "${dirPath}" && echo "${shellSafe}" > .acode-live-server.cjs && node .acode-live-server.cjs`;

    // Updated HTML Design with Icons inside Buttons
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * { box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background: #f8f9fa; 
                color: #333; 
                padding: 10px; 
                margin: 0; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
            }
            .card { 
                background: white; 
                padding: 15px; 
                border-radius: 4px; 
                box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
                width: 100%; 
                max-width: 400px; 
                margin-bottom: 10px; 
                text-align: center; 
                border: 1px solid #e0e0e0;
            }
            
            /* Header Logo */
            .header-logo { width: 50px; height: 50px; margin-bottom: 5px; }
            
            .error-title { 
                margin: 5px 0; 
                font-size: 24px; 
                font-weight: 700; 
                color: #d32f2f; 
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            p { font-size: 13px; color: #666; margin: 0 0 15px 0; line-height: 1.4; }
            
            /* Button Styling with Flexbox for Icon Alignment */
            .btn { 
                display: flex; 
                align-items: center; 
                justify-content: center; /* Center content */
                gap: 8px; /* Space between icon and text */
                width: 100%; 
                padding: 10px; 
                background: #007bff; 
                color: white; 
                border: none; 
                border-radius: 4px; 
                font-size: 14px; 
                font-weight: 600; 
                cursor: pointer; 
                text-decoration: none; 
                margin-top: 5px;
            }
            .btn:active { opacity: 0.8; }
            
            /* Icon inside button */
            .btn-icon {
                width: 18px; 
                height: 18px;
                object-fit: contain;
                display: block;
            }
            
            .btn-outline { 
                background: #fff; 
                border: 1px solid #ccc; 
                color: #333; 
                margin-top: 8px; 
            }
            
            .btn-launch { 
                background: #28a745; 
                margin-top: 20px; 
                font-size: 16px; 
                padding: 12px;
                display: block; /* No icon here, so block is fine, but flex works too */
                text-align: center;
            }
            
            .code-label { 
                font-size: 11px; 
                font-weight: 600; 
                color: #555; 
                display: block; 
                text-align: left; 
                margin-top: 12px; 
                margin-bottom: 2px; 
                text-transform: uppercase;
            }
            
            .footer-note { font-size: 11px; color: #999; margin-top: 15px; font-style: italic; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2 class="error-title">⚠️ SERVER NOT FOUND</h2>
            <p>Port ${port} is inactive. Please run the server in Termux.</p>
            <button class="btn" onclick="copyTermuxCmd()">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Termux.svg/2048px-Termux.svg.png" class="btn-icon">
                COPY SERVER COMMAND
            </button>
          
        <p class="footer-note" style="text-align: center;">* Copying this command paste inside Termux or Any Terminal and Run , After then you can launch preview  </p>
          
        </div>

        <div class="card" style="text-align: left;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; text-align: center; color:#333;">Inject Debugger</h3>
            
            <span class="code-label">Option 1: Suger Devtool (Recommended)</span>
            <button class="btn btn-outline" onclick="copySuger()">
                <img src="https://i.postimg.cc/G3536HzL/suger-dt.png" class="btn-icon">
                COPY SUGER SCRIPT TAG
            </button>

            <span class="code-label">Option 2: Eruda (For lightweight console)</span>
            <button class="btn btn-outline" onclick="copyEruda()">
                <img src="https://i.postimg.cc/1tH9r43G/eruda-svgrepo-com.png" class="btn-icon">
                COPY ERUDA SCRIPT TAG
            </button>
            
            <p class="footer-note" style="text-align: center;">* Paste inside &lt;head&gt; or &lt;body&gt; of your HTML.</p>
        </div>

        <button class="btn btn-launch" onclick="launchPreview()">LAUNCH PREVIEW</button>

        <script>
            // ✅ Safe Injection of Command
            const termuxCommand = ${JSON.stringify(cmd)};
            const sugerScript = '<script src="https://suger-cdn.vercel.app/suger-dev.js"><\\/script>';
            const erudaScript = '<script src="https://cdn.jsdelivr.net/npm/eruda"><\\/script><script>eruda.init();<\\/script>';

            function copyTermuxCmd() {
                copyToClipboard(termuxCommand, "Termux Command Copied!");
            }
            function copySuger() {
                copyToClipboard(sugerScript, "Suger Script Copied!");
            }
            function copyEruda() {
                copyToClipboard(erudaScript, "Eruda Script Copied!");
            }
            function launchPreview() {
                try {
                    window.parent.postMessage({ type: 'suger-launch-preview', url: 'http://localhost:${port}/' }, '*');
                } catch(e) {
                    window.location.href = 'http://localhost:${port}/';
                }
            }
            function copyToClipboard(text, msg) {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.style.position = "fixed"; 
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand("copy");
                    window.toast(msg);
                } catch (err) {
                    window.toast("Failed to copy!");
                }
                document.body.removeChild(textarea);
            }
        </script>
    </body>
    </html>
    `;
    return htmlContent;
}

function createBigScreenPage() {
    let content = document.createElement('div');
    content.className = 'suger-content-root';
    content.innerHTML += `
        <nav>
            <span class="sugerserver_TitleContainer">
                <img src="https://i.postimg.cc/kMf1dhFP/icon.png" alt="Suger Server Icon" style="height:25px;margin-left:4px;">
            </span>
            <span class="sugerserver_ToolsContainer">
                <input type="text" id="url-input" placeholder="http://localhost:..." spellcheck="false" autocomplete="off">
                <p id="tool-search" title="Enter URL">${searchSVG}</p>
                <p id="tool-back" title="Go Back" style="opacity: 0.5;">${backSVG}</p>
                <p id="tool-forward" title="Go Forward" style="opacity: 0.5;">${forwardSVG}</p>
                <p id="tool-preview" title="Toggle Preview/Server Mode">${eyeSVG}</p>
                <p id="tool-console" title="Toggle Console">${consoleSVG}</p>
                <p id="tool-share" title="Copy URL">${shareSVG}</p>
                <p id="tool-open-browser" title="Open in Browser">${chromeSVG}</p>
                <p id="tool-refresh" title="Force Refresh">${refreshSVG}</p>          
            </span>
        </nav>
        <iframe class="sugerframe" id="sugerframe"></iframe>
    `;

    const iframe = content.querySelector('#sugerframe');
    const urlInput = content.querySelector('#url-input');
    const searchBtn = content.querySelector('#tool-search');
    const previewBtn = content.querySelector('#tool-preview');
    const refreshBtn = content.querySelector('#tool-refresh');
    const backBtn = content.querySelector('#tool-back');
    const forwardBtn = content.querySelector('#tool-forward');

    // ✅ ROBUST NAVIGATION HANDLER
    content.handleNavigation = (url, type = 'new', htmlContent = null) => {
        if (!url && !htmlContent) return;

        // Reset Iframe to avoid sticky errors
        // iframe.src = 'about:blank'; 

        if (type === 'new') {
            if (currentURL && currentURL !== url) historyStack.push({url: currentURL, mode: currentMode, html: iframe.getAttribute('data-setup-html')});
            forwardStack = [];
            currentURL = url;
        } else if (type === 'back') {
            forwardStack.push({url: currentURL, mode: currentMode, html: iframe.getAttribute('data-setup-html')});
            const prev = url; currentURL = prev.url; currentMode = prev.mode; htmlContent = prev.html;
        } else if (type === 'forward') {
            historyStack.push({url: currentURL, mode: currentMode, html: iframe.getAttribute('data-setup-html')});
            const next = url; currentURL = next.url; currentMode = next.mode; htmlContent = next.html;
        }
        backBtn.style.opacity = historyStack.length > 0 ? '1' : '0.5';
        forwardBtn.style.opacity = forwardStack.length > 0 ? '1' : '0.5';
        
        if (htmlContent) {
            // ✅ FORCE SETUP PAGE (Using srcdoc for reliability)
            iframe.removeAttribute('src'); 
            iframe.srcdoc = htmlContent;
            iframe.setAttribute('data-setup-html', htmlContent);
            currentMode = 'setup';
        } else {
            // ✅ NORMAL URL
            iframe.removeAttribute('data-setup-html');
            iframe.removeAttribute('srcdoc');
            iframe.src = getNoCacheUrl(currentURL);
            currentMode = 'server';
        }
        updateAddressBar(currentURL);
    };

    const handleNavigation = content.handleNavigation;

    searchBtn.onclick = () => { searchBtn.style.display = 'none'; urlInput.style.display = 'block'; urlInput.focus(); };
    urlInput.onblur = () => { urlInput.style.display = 'none'; searchBtn.style.display = 'flex'; };
    urlInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            let val = urlInput.value.trim();
            if (!val) return;
            if (!val.startsWith('http')) val = 'http://' + val;
            window.toast(`Loading: ${val}`, 1000);
            handleNavigation(val, 'new');
            urlInput.blur();
            localStorage.setItem('suger_last_mode', 'manual');
        }
    };
    backBtn.onclick = () => { if (historyStack.length > 0) handleNavigation(historyStack.pop(), 'back'); };
    forwardBtn.onclick = () => { if (forwardStack.length > 0) handleNavigation(forwardStack.pop(), 'forward'); };

    // ✅ FIXED PREVIEW TOGGLE
    previewBtn.onclick = () => {
        const settings = getSettings();
        const lastMode = localStorage.getItem('suger_last_mode'); 
        
        if (lastMode === 'preview') {
            // Switch to Server
            localStorage.setItem('suger_last_mode', 'server'); // Update storage FIRST
            const port = localStorage.getItem('suger_active_server_port') || settings.serverPort || 1024;
            handleNavigation(`http://localhost:${port}/`, 'new');
            window.toast(`Switched to Internal Server: ${port}`, 1000);
        } else {
            // Switch to Preview
            localStorage.setItem('suger_last_mode', 'preview'); // Update storage FIRST
            
            const port = settings.previewPort || 8080;
            let dirPath = lastKnownPath || "$HOME"; 
            if (!dirPath && editorManager.activeFile && editorManager.activeFile.id !== pluginId) {
                dirPath = resolvePath(editorManager.activeFile.uri);
            }
            const setupHtml = getTermuxSetupHtml(port, dirPath);
            handleNavigation('suger://termux-setup', 'new', setupHtml);
            window.toast(`Switched to Preview Mode`, 1000);
        }
    };

    refreshBtn.onclick = () => { if (iframe.src) iframe.src = iframe.src; };

    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'acode-live-server-inspect' && event.data.selector) {
            if (onInspectCallback) onInspectCallback(event.data.selector);
        }
        if (event.data && event.data.type === 'suger-launch-preview') {
            handleNavigation(event.data.url, 'new');
        }
    });
    
    // Tools
    content.querySelector('#tool-console').onclick = () => { if (onToggleConsoleCallback) onToggleConsoleCallback(); };
    content.querySelector('#tool-share').onclick = () => { if (!iframe.src) return; navigator.clipboard.writeText(iframe.src); window.toast('URL Copied!', 2000); };
    content.querySelector('#tool-open-browser').onclick = () => {
        if (currentURL && !currentURL.startsWith('suger:') && !currentURL.startsWith('data:')) {
            if (window.cordova) cordova.exec(null, null, 'System', 'open-in-browser', [currentURL]);
        } else { window.toast('Start the server first!', 2000); }
    };
    return content;
}

export function updateAddressBar(url) {
    if (BigScreenContent) {
        const input = BigScreenContent.querySelector('#url-input');
        if (input) {
            if (url.startsWith('suger:')) input.value = "Termux Setup";
            else input.value = url;
        }
    }
}

// ✅ STRICT MODE ENFORCEMENT
export function addBigScreenPage(content_link) {
    const existingFile = editorManager.getFile(pluginId, 'id');
    const settings = getSettings();
    const lastMode = localStorage.getItem('suger_last_mode');
    
    // Check if we should ignore the content_link (localhost) and show Setup
    // If user is in 'preview' mode, ALWAYS show setup, ignore main.js calls
    const shouldForceSetup = (lastMode === 'preview');

    if (!BigScreenContent) BigScreenContent = createBigScreenPage();

    if (existingFile) {
        existingFile.makeActive();
        // If forced setup, load it regardless of content_link
        if (shouldForceSetup) {
             const port = settings.previewPort || 8080;
             let dirPath = lastKnownPath || "$HOME";
             const setupHtml = getTermuxSetupHtml(port, dirPath);
             // Ensure iframe is clean
             const iframe = BigScreenContent.querySelector('#sugerframe');
             iframe.removeAttribute('src'); 
             BigScreenContent.handleNavigation('suger://termux-setup', 'new', setupHtml);
             return;
        }

        if (content_link && content_link !== currentURL) {
             BigScreenContent.handleNavigation(content_link, 'new');
        }
        return;
    }

    if (shouldForceSetup) {
        const port = settings.previewPort || 8080;
        let dirPath = lastKnownPath || "$HOME";
        const setupHtml = getTermuxSetupHtml(port, dirPath);
        BigScreenContent.handleNavigation('suger://termux-setup', 'new', setupHtml);
    } else if (content_link) {
        BigScreenContent.handleNavigation(content_link, 'new');
    }
    
    new editorFile('Suger Server', {
        type: 'page',
        render: true,
        content: BigScreenContent,
        tabIcon: "icon liveserver",
        id: pluginId,
        stylesheets:[pageStyles],
        hideQuickTools: true,
        uri: ' '
    });
}

export function createSideButton(onClick) {
    return SideButton({ text: 'Suger Server', onclick: onClick, backgroundColor: '#9b9696', textColor: '#000' });
}
export function showDefaultWindow() {
    const iframes = document.querySelectorAll('iframe.sugerframe');
    if (iframes.length > 0) { iframes.forEach(iframe => { iframe.removeAttribute('src'); iframe.src = 'about:blank'; }); }
}
export function initUi(pId , baseUrl , onToggleConsole, onInspect) { 
    pluginId = pId; onToggleConsoleCallback = onToggleConsole; onInspectCallback = onInspect; 
    if (!BigScreenContent) BigScreenContent = createBigScreenPage();
    editorManager.on('switch-file', () => {
        const file = editorManager.activeFile;
        if (file && file.id !== pluginId && file.uri) {
            const path = resolvePath(file.uri);
            if (path) lastKnownPath = path;
        }
    });
    if (editorManager.activeFile && editorManager.activeFile.id !== pluginId) {
        const initialPath = resolvePath(editorManager.activeFile.uri);
        if (initialPath) lastKnownPath = initialPath;
    }
}