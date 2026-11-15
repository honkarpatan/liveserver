const confirm = acode.require('confirm');
const toast = acode.require('toast');
const loader = acode.require('loader');
import { getSettings, onSettingsChange } from './settings.js';

/**
 * Execute command safely (Mocking Executor behavior for Acode environment)
 * Note: This relies on the environment having 'Executor' or similar command interface.
 * If 'Executor' is not available globally from another plugin, we might need a fallback.
 * Assuming the reference code implies 'Executor' exists in your setup.
 */
async function safeExec(cmd) {
    try {
        // 'Executor' usually comes from C/C++ plugin or Termux integration. 
        // Ensure it exists or replace with appropriate shell execution method for Acode.
        if (typeof Executor !== 'undefined') {
            const out = await Executor.execute(cmd, true);
            return out?.trim() || null;
        } else {
            // Fallback if you use Acode Terminal plugin API directly
            // For now, returning null to simulate check failure and force install flow logic
            // console.warn("Executor not found. Cannot check dependencies in background.");
            return null; 
        }
    } catch (e) {
        return null;
    }
}

async function checkCommand(cmd) {
    const a = await safeExec(`which ${cmd}`);
    if (a && a.includes('/')) return true;
    const b = await safeExec(`command -v ${cmd}`);
    return !!(b && b.includes('/'));
}

async function verifyNodeDeps() {
    // Check for Node.js, NPM, and Git
    const deps = ['node', 'npm', 'git'];
    
    // Check logic (Triple check pattern)
    let lastResults = [];
    for (let i = 0; i < 2; i++) { // 2 pass check
        const result = await Promise.all(deps.map(checkCommand));
        lastResults = result;
        if (result.every(v => v)) return [true, []];
        await new Promise(r => setTimeout(r, 200));
    }

    const missing = deps.filter((_, i) => !lastResults[i]);
    return [false, missing];
}

/**
 * Ensures Node.js, NPM, and Git are installed.
 * @param {boolean} force - If true, ignores previous checks and forces installation.
 */
export async function ensureNodeDependencies(force = false) {
    const settings = getSettings();

    if (!force && settings.dependenciesInstalled === true) {
        // Silent Verification
        const [ok] = await verifyNodeDeps();
        if (ok) return true;
    }

    const [ok, missing] = await verifyNodeDeps();

    if (ok && !force) {
        settings.dependenciesInstalled = true;
        // settings update manually call to save state
        return true;
    }

    // If we are here, something is missing or forced
    const message = force 
        ? "Re-download/Update Dependencies (Node.js, NPM, Git)? (~50MB)"
        : `Missing dependencies: ${missing.join(', ')}\n\nInstall now?`;

    const confirmed = await confirm('Live Server Dependencies', message);
    if (!confirmed) {
        toast('⚠️ Live Server may not work without dependencies.');
        return false;
    }

    const installLoader = loader.create('Installing Dependencies', 'Installing Node.js, NPM, Git...');
    
    try {
        // Using 'pkg' or 'apk' depending on the environment (Termux uses pkg/apt)
        await safeExec('apk update');
        await safeExec('apk add nodejs-lts'); // nodejs usually includes npm
        await safeExec('apk add npm'); 
        await safeExec('apk add git'); // nodejs usually includes npm
        
        installLoader.hide();

        const [finalOk] = await verifyNodeDeps();
        if (finalOk) {
            // Update settings to true
            onSettingsChange('dependenciesInstalled', true);
            toast('✅ Dependencies installed successfully!');
            return true;
        } else {
            toast('⚠️ Installation verification failed. Please try manually in terminal.');
            return false;
        }
    } catch (err) {
        installLoader.hide();
        toast(`❌ Installation failed: ${err.message || 'Unknown error'}`);
        return false;
    }
}