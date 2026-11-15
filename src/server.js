import plugin from '../plugin.json';

function check_this_port(port, timeout, data = {}) {
    return new Promise((resolve, reject) => {
        cordova.plugin.http.get(`http://localhost:${port}/check`, data, {}, (response) => {
            resolve(response);
        }, (error) => {
            reject(error);
        });
        setTimeout(() => { reject(new Error('Timeout')) }, timeout);
    });
}

export async function getLivePortIfAvilable(targetPort = null, timeout = 1000) {
    if (targetPort) {
        try {
            await check_this_port(targetPort, timeout);
            return targetPort;
        } catch (err) {
            return null;
        }
    }
    let portList = [1024, 1025, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034];
    for (let port of portList) { 
        try {
            await check_this_port(port, timeout);
            return port;
        } catch (err) {}
    }
    return null;
}

export async function checkServer(jsonData) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); 

    try {
        let response = await fetch(`http://localhost:${jsonData.port}/setup`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return !!(response && response.ok);
    } catch (error) {
        clearTimeout(timeoutId);
        return false;
    }
}

async function pollServerAndBack(activeFileId, onServerReady, targetPort) {
    const loader = acode.require('loader');
    const currentLoader = loader.create('Starting Server', `Please Wait Serving...`);
    
    let attempts = 0;
    const maxAttempts = 40; 

    const interval = setInterval(async () => {
        attempts++;
        const port = await getLivePortIfAvilable(targetPort, 200); 

        if (port) {
            clearInterval(interval);
            currentLoader.hide();
            
            if (activeFileId) {
                window.editorManager.switchFile(activeFileId);
            }
            if (onServerReady) onServerReady();
            
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            currentLoader.hide();
            window.toast('Server start timed out. Check terminal.', 4000);
        }
    }, 1000);
}

/**
* Starts the backend Node.js server.
*/
export async function start_in_app_server(activeFileId, onServerReady, port = 1024) {
    const terminal = await acode.require('terminal');
    
    const server = await terminal.createServer();
    
    await new Promise(r => setTimeout(r, 1000));

    const GITHUB_REPO_URL = "https://github.com/Sou6900/acodels_suger.git"; 
    const REPO_DIR = "acodels"; 

    // VERSION CHECK LOGIC
    const STORAGE_KEY = 'acodels_server_version';
    const savedVersion = localStorage.getItem(STORAGE_KEY);
    const currentVersion = plugin.version;
    
    let shouldUpdate = false;
    if (savedVersion !== currentVersion) {
        shouldUpdate = true;
        localStorage.setItem(STORAGE_KEY, currentVersion);
        window.toast(`Updating Server Files to v${currentVersion}...`, 2000);
    }

    let command = "";
    
    // আমরা নিশ্চিত করব যে আমরা হোম ডিরেক্টরিতে আছি (~/)
    command += `cd ~\n`; 

    if (shouldUpdate) {
        command += `rm -rf ${REPO_DIR}\n`;
    }

    command += `if [ ! -d '${REPO_DIR}' ]; then\n`;
    command += `  git clone ${GITHUB_REPO_URL} ${REPO_DIR}\n`;
    command += `fi\n`;
    
    command += `cd ${REPO_DIR}\n`;
    
    command += `if [ ! -d 'node_modules' ]; then\n`;
    command += `  npm install\n`;
    command += `fi\n`;
    
    command += `node index.js ${port}\n`;
    
    // টার্মিনালে কমান্ড রাইট করা
    terminal.write(server.id, command);

    // সার্ভার রেডি হওয়ার অপেক্ষা
    pollServerAndBack(activeFileId, onServerReady, port);
}