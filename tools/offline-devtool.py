#!/usr/bin/env python3
"""
Make devtool/suger-dev.js fully offline (no runtime network access of its own).

Run after every new Suger DevTool build:   python3 tools/offline-devtool.py devtool/suger-dev.js

What it removes
  * LicenseManager server calls  (license-server-*.vercel.app)  -> local no-op, always active
  * FingerprintJS monitoring ping (m1.openfpcdn.io)             -> no-op
  * @import of codemirror.min.css from cdnjs                    -> CSS inlined from tools/vendor/
  * logo image from i.postimg.cc                                -> inline data URI (plugin icon)
What stays: the inspector features that talk to the *previewed page* (Network panel hooks,
source viewer fetching the page's own files) and plain <a href> links the user may tap.
Idempotent: running it on an already patched file changes nothing.
"""
import base64, io, json, re, sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
path = Path(sys.argv[1] if len(sys.argv) > 1 else root / 'devtool' / 'suger-dev.js')
s = path.read_text(encoding='utf-8')
orig = s
report = []

def sub(label, pattern, repl, flags=re.S, count=1):
    global s
    new, n = re.subn(pattern, repl, s, count=count, flags=flags)
    report.append((label, n))
    s = new

# 1) fingerprint monitoring ping
sub('fingerprint ping', r'function \$6\(\)\{if\(!\(window\.__fpjs_d_m.*?\}catch\(e\)\{console\.error\(e\)\}\}',
    'function $6(){}')

# 2) license server: replace the fetch wrapper with a local answer, drop the url
sub('license fetch', r'async function m\(A,_,L,I\)\{try\{let H=new AbortController.*?isNetworkError:!0\}\}\}',
    'async function m(A,_,L,I){return{success:!0,valid:!0,key:null,offline:!0}}')
sub('license url', r'let e="https://license-server-[a-z0-9.-]+\.vercel\.app/api",', 'let e="",')
# playground/demo hosts are website-only, no need to ship them
sub('demo hosts', r't=\["suger-playground\.vercel\.app","suger-play\.vercel\.app","https://suger-play\.vercel\.app"\],', 't=[],')

# 2b) leftover marketing string of the fingerprint library
sub('fpjs text', r'https://fpjs\.dev/pro', 'fpjs')

# 3) codemirror css inline (escape for a JS template literal)
css = (root / 'tools' / 'vendor' / 'codemirror.css').read_text(encoding='utf-8')
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
css = re.sub(r'\s+', ' ', css)
css = re.sub(r'\s*([{};:,>])\s*', r'\1', css).strip()
css = css.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
sub('codemirror @import', r'@import"https://cdnjs\.cloudflare\.com/ajax/libs/codemirror/[0-9.]+/codemirror\.min\.css";',
    lambda m: css)

# 4) logo -> data uri
im = Image.open(root / 'icon.png').convert('RGBA').resize((64, 64), Image.LANCZOS)
buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
data_uri = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
sub('logo', r'https://i\.postimg\.cc/[A-Za-z0-9_-]+/[^"\']+\.png', lambda m: data_uri, count=0)

path.write_text(s, encoding='utf-8')
for label, n in report:
    print(f'  {label:20s} {"patched" if n else "nothing to do"} ({n})')
left = sorted(set(re.findall(r'https?://[a-zA-Z0-9.-]+', s)))
print('hosts still mentioned in file:', ', '.join(h for h in left if 'w3.org' not in h))
print('changed' if s != orig else 'unchanged', path)
