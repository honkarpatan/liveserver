/**
 * Build: esbuild bundle → dist/main.js → liveserver-v{version}.zip (Acode installable)
 * Usage: npm run build | npm run watch
 */
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;

const color = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  underline: '\x1b[4m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const args = process.argv.slice(2);
const WATCH = args.includes('--watch') || process.env.WATCH === '1';

let pluginJson = {};
try {
  pluginJson = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf-8'));
} catch (e) {
  console.warn(`${color.yellow}Warning: plugin.json missing or invalid${color.reset}`);
}

const version = pluginJson.version || '2.0.0';
const zipName = `liveserver-v${version}.zip`;
const zipPath = path.join(root, zipName);

let isBuilding = false;
let debounceTimer;

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

async function bundle() {
  if (isBuilding) return;
  isBuilding = true;

  console.log(`${color.cyan}Building (minified)…${color.reset}`);

  try {
    fs.mkdirSync(path.join(root, 'dist'), { recursive: true });

    await build({
      entryPoints: [path.join(root, 'src/main.js')],
      bundle: true,
      outfile: path.join(root, 'dist/main.js'),
      format: 'iife',
      platform: 'browser',
      target: ['es2019'],
      minify: true,
      legalComments: 'none',
      treeShaking: true,
      sourcemap: false,
      logLevel: 'warning',
    });

    console.log(`${color.green}esbuild → dist/main.js${color.reset}`);

    // Remove previous zip
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);

    // Core: Acode expects main.js at zip root
    if (exists('dist/main.js')) {
      archive.file(path.join(root, 'dist/main.js'), { name: 'main.js' });
    }
    if (exists('plugin.json')) {
      archive.file(path.join(root, 'plugin.json'), { name: 'plugin.json' });
    }
    if (exists('icon.png')) {
      archive.file(path.join(root, 'icon.png'), { name: 'icon.png' });
    }

    // readme / changelogs / license from plugin.json
    const extras = [];
    if (pluginJson.readme && exists(pluginJson.readme)) extras.push(pluginJson.readme);
    if (pluginJson.changelogs && exists(pluginJson.changelogs)) extras.push(pluginJson.changelogs);
    if (pluginJson.license && typeof pluginJson.license === 'string' && exists(pluginJson.license)) {
      extras.push(pluginJson.license);
    }
    if (exists('readme.md') && !extras.includes('readme.md')) extras.push('readme.md');

    for (const file of extras) {
      const abs = path.join(root, file);
      if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
      archive.file(abs, { name: path.basename(file) });
      console.log(`${color.dim}  + ${path.basename(file)}${color.reset}`);
    }

    // Always ship vendored Node backend (required at runtime)
    if (exists('acodels')) {
      archive.directory(path.join(root, 'acodels'), 'acodels');
      console.log(`${color.dim}  + acodels/${color.reset}`);
    }

    // Optional plugin.json files[] entries (dirs or files)
    if (Array.isArray(pluginJson.files)) {
      for (const f of pluginJson.files) {
        const rel = String(f).replace(/\/$/, '');
        if (rel === 'acodels' || rel === 'readme.md' || rel === 'icon.png') continue; // already added (a duplicate zip entry is flagged by the Acode scanner)
        const abs = path.join(root, rel);
        if (!fs.existsSync(abs)) continue;
        const st = fs.statSync(abs);
        if (st.isDirectory()) {
          archive.directory(abs, rel);
          console.log(`${color.dim}  + ${rel}/${color.reset}`);
        } else {
          archive.file(abs, { name: path.basename(rel) });
          console.log(`${color.dim}  + ${path.basename(rel)}${color.reset}`);
        }
      }
    }

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('end', resolve);
      output.on('error', reject);
      archive.on('error', reject);
      archive.finalize().catch(reject);
    });

    const sizeKB = (fs.statSync(zipPath).size / 1024).toFixed(1);
    console.log(
      `📦 ${color.yellow}${color.underline}${color.bold}${zipName}${color.reset} created ${color.yellow}${color.bold}(${sizeKB} KB)${color.reset}\n`
    );
  } catch (err) {
    console.error(`${color.magenta}Build failed: ${err.message}${color.reset}`);
    console.error(err);
  } finally {
    isBuilding = false;
  }
}

await bundle();

if (WATCH) {
  console.log(`${color.dim}Watching src/ …${color.reset}`);
  fs.watch(path.join(root, 'src'), { recursive: true }, (event, filename) => {
    if (!filename) return;
    if (!/\.(js|css|json|md)$/i.test(filename)) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log(`${color.bold}change: ${filename}${color.reset}`);
      await bundle();
    }, 600);
  });
  // also watch acodels lightly
  try {
    fs.watch(path.join(root, 'acodels'), { recursive: true }, () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => bundle(), 800);
    });
  } catch (_) {}
} else {
  process.exit(0);
}
