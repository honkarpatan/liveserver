/**
 * Where the Suger DevTool engine comes from.
 *
 * It is NOT shipped inside the plugin zip. On first use (after the user agrees) the plugin
 * downloads it from the author's GitHub repo, checks the SHA-256 below and caches it.
 * A file whose hash differs is never used - change DEVTOOL_SHA256 only after reviewing it.
 *
 * To publish a new engine build:
 *   python3 tools/offline-devtool.py dist/suger-dev.embed.min.js   (strips license/telemetry calls)
 *   commit it to the repo below, then:  sha256sum dist/suger-dev.embed.min.js
 */
export const DEVTOOL_URL =
  'https://raw.githubusercontent.com/Sou6900/suger-devtool/main/dist/suger-dev.embed.min.js';
export const DEVTOOL_SHA256 = 'e3623347981cb6c84d061ac4b7479e7cf17da186bbfebd9c2dee07656a1af7a7';
export const DEVTOOL_REPO = 'github.com/Sou6900/suger-devtool';
export const DEVTOOL_SIZE_MB = '2.7';
