/**
 * Utility functions for the Live Server plugin.
 */

/**
 * Checks if the currently active file in the editor is an HTML file.
 */
export function isHTMLFile() {
    const { editorManager } = window;
    if (
        editorManager &&
        editorManager.activeFile &&
        editorManager.activeFile.session &&
        editorManager.activeFile.session.$modeId
    ) {
        const ActiveFileType = editorManager.activeFile.session.$modeId;
        if (ActiveFileType) {
            return ActiveFileType === 'ace/mode/html';
        }
    }
    return false;
}

/**
 * Resolves the filesystem path from an Acode file URI.
 * @param {string} rawPath - The file URI from Acode.
 * @returns {string|false} The resolved filesystem path or false if unresolved.
 */

/**
 * Resolves the filesystem path from an Acode file URI.
 * @param {string} rawPath - The file URI from Acode.
 * @returns {string|false} The resolved filesystem path or false if unresolved.
 */
export function resolvePath(rawPath) {
    // 🔍 DEBUG LOG: কনসোলে আসল পাথটি প্রিন্ট হবে
    console.log("🔍 Attempting to resolve RAW path:", rawPath);

    // ✅ FIX: Termux Path Logic
    if (rawPath.startsWith("content://com.termux.documents/tree")) {
        const pathParts = rawPath.split("::");
        if (pathParts.length > 1) {
            const fullPath = pathParts[1]; 
            const directory = fullPath.substring(0, fullPath.lastIndexOf("/"));
            console.log("✅ Resolved Termux Path:", directory);
            return directory;
        }
    }

    // ✅ Standard Internal Storage (/sdcard)
    if (rawPath.startsWith("file:///storage/emulated/0/")) {
        const path = rawPath.replace("file://", "");
        const directory = path.substring(0, path.lastIndexOf("/"));
        console.log("✅ Resolved SDCard Path:", directory);
        return directory;
    }

    // ✅ External SD Card (Android 11+)
    if (rawPath.startsWith("content://com.android.externalstorage.documents/tree/primary")) {
        const trimmed = rawPath.split("::primary:")[1];
        const directory = trimmed.substring(0, trimmed.lastIndexOf("/"));
        const finalPath = `/sdcard/${directory}`;
        console.log("✅ Resolved External SD:", finalPath);
        return finalPath;
    }

    // ✅ Acode Internal/Private Storage (More Generic Logic)
    // আগে শুধু 'files/alpine/home' চেক করা হতো, এখন যেকোনো ইন্টারনাল পাথ চেক হবে
    if (rawPath.startsWith("file:///data/user/0/") || rawPath.startsWith("file:///data/data/")) {
        // "file://" প্রিফিক্স বাদ দিয়ে সম্পূর্ণ অ্যাবসলিউট পাথ নেওয়া হচ্ছে
        const path = rawPath.replace("file://", "");
        const directory = path.substring(0, path.lastIndexOf("/"));
        
        console.log("✅ Resolved Acode Internal Path:", directory);
        return directory;
    }
    
    // ❌ যদি কোনোটিই না মেলে
    console.error("❌ Failed to resolve path. Unrecognized URI:", rawPath);
    return false;
}