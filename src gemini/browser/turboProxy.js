/**
 * browser/turboProxy.js
 * Dual-Power Google Turbo Engine + Smart Embeds:
 *  1. Instant 0ms Google Home (Web & Images)
 *  2. Hidden Native WebView (acode.require('webview') mode: 'hidden') that natively passes
 *     Google's enablejs/BotGuard JS challenge on https://www.google.com, extracts the rendered DOM,
 *     and strips Google's client-side scripts so srcdoc never triggers "having trouble accessing Google Search".
 *  3. Automatic Google-UI Search & Image Fallback if Google serves an enablejs/CAPTCHA block on the IP.
 *  4. Unwraps all result links so clicking any website opens via Node Reverse Proxy (/__proxy) with full BFCache history.
 */
import { getSettings } from '../core/settings.js';

const turboHtmlCache = new Map(); // url -> { html, finalUrl, ts }
const TURBO_CACHE_TTL = 5 * 60 * 1000;
let headlessView = null;
let headlessBusy = false;

export const TURBO_IFRAME_ALLOW = [
  'autoplay',
  'encrypted-media',
  'picture-in-picture',
  'fullscreen',
  'clipboard-read',
  'clipboard-write',
  'accelerometer',
  'gyroscope',
  'web-share',
  'display-capture',
  'ch-ua',
  'ch-ua-mobile',
  'ch-ua-platform',
  'ch-ua-arch',
  'ch-ua-bitness',
  'ch-ua-full-version',
  'ch-ua-full-version-list',
  'ch-ua-model',
  'ch-ua-platform-version',
  'ch-viewport-width',
  'ch-viewport-height',
  'ch-dpr',
].join('; ');

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function isGoogleUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return /^(www\.|m\.|images\.|encrypted\.)?google\.[a-z.]+$/i.test(u.hostname);
  } catch (_) {
    return false;
  }
}

export function unwrapGoogleRedirectUrl(rawUrl, baseUrl = 'https://www.google.com') {
  try {
    const u = new URL(rawUrl, baseUrl);
    if (isGoogleUrl(u.href)) {
      if (u.pathname === '/url') {
        const target = u.searchParams.get('q') || u.searchParams.get('url');
        if (target && /^https?:\/\//i.test(target)) return target;
      }
      if (u.pathname === '/imgres') {
        const target = u.searchParams.get('imgrefurl') || u.searchParams.get('imgurl');
        if (target && /^https?:\/\//i.test(target)) return target;
      }
    }
    return u.href;
  } catch (_) {
    return rawUrl;
  }
}

export async function destroyTurboWebview() {
  if (!headlessView) return;
  const v = headlessView;
  headlessView = null;
  headlessBusy = false;
  try {
    await v.destroy();
  } catch (_) {}
}

/**
 * Converts known media/code-playground URLs into official embed player URLs.
 */
export function generateEmbedUrl(rawUrl) {
  let props;
  try {
    props = new URL(rawUrl);
  } catch (_) {
    return '';
  }

  const s = getSettings();
  const knownParams = new URLSearchParams();
  const currentTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const playerConfig = {
    flags: ['autoplay', 'loop', 'mute'],
    states: [s.autoplayVideos !== false, !!s.loopPlaylist, !!s.startMuted],
  };

  let isShortUrl = false;
  let embedUrl = '';
  let paramString = '';
  const host = props.hostname.toLowerCase();
  const pathname = props.pathname;

  if (
    host.endsWith('geo.dailymotion.com') ||
    host.endsWith('player.vimeo.com') ||
    host.endsWith('player.twitch.tv') ||
    (host.endsWith('youtube.com') && pathname.startsWith('/embed/'))
  ) {
    return rawUrl;
  }

  if (host.endsWith('codepen.io') && pathname.includes('/pen/')) {
    const [, username, , slugHash] = pathname.split('/');
    if (!username || !slugHash) return '';
    embedUrl = `https://codepen.io/${username}/embed/${slugHash}`;
    delete playerConfig.flags;
    knownParams.append('default-tab', 'result');
    knownParams.append('theme-id', currentTheme);
    knownParams.append('preview', 'true');
    knownParams.append('editable', 'false');
    knownParams.append('animations', 'run');
  } else if (host.endsWith('jsfiddle.net')) {
    const [, username, fiddleId] = pathname.split('/');
    if (!username || !fiddleId) return '';
    embedUrl = `https://jsfiddle.net/${username}/${fiddleId}/embed/result,html,css,js,resources/${currentTheme}`;
    delete playerConfig.flags;
  } else if (host.endsWith('dailymotion.com') || host === 'dai.ly') {
    const parts = pathname.split('/').filter(Boolean);
    const kind = host === 'dai.ly' ? 'video' : parts[0];
    const id = host === 'dai.ly' ? parts[0] : parts[1];
    const time = props.searchParams.get('startTime') || props.searchParams.get('start');
    if (!id || (kind !== 'video' && kind !== 'playlist')) return '';
    knownParams.append(kind, id);
    embedUrl = 'https://geo.dailymotion.com/player.html';
    if (time) knownParams.append('start', String(parseInt(time, 10) || 0));
  } else if (host.endsWith('vimeo.com') && !host.includes('player')) {
    const videoId = pathname.replace(/^\/+/, '').split('/')[0];
    if (!/^\d+$/.test(videoId)) return '';
    embedUrl = `https://player.vimeo.com/video/${videoId}`;
    const oldToken = props.searchParams.get('h');
    const privacyToken = props.searchParams.get('turnstile');
    if (privacyToken) knownParams.append('turnstile', privacyToken);
    else if (oldToken) knownParams.append('h', oldToken);
    knownParams.append('autopause', '1');
    knownParams.append('dnt', '1');
    playerConfig.flags[2] = 'muted';
  } else if (host.endsWith('youtube.com') || (host.endsWith('youtu.be') && (isShortUrl = true))) {
    embedUrl = 'https://www.youtube.com/embed/';
    const time = props.searchParams.get('t') || props.searchParams.get('start');
    const playlistId = props.searchParams.get('list');
    const search = props.searchParams.get('search_query');
    let videoId = '';
    let startSeconds = 0;

    if (isShortUrl) {
      videoId = pathname.slice(1).split('/')[0];
    } else if (pathname.startsWith('/shorts/')) {
      videoId = pathname.split('/shorts/')[1]?.split('/')[0] || '';
    } else if (pathname.startsWith('/live/')) {
      videoId = pathname.split('/live/')[1]?.split('/')[0] || '';
    } else if (pathname.startsWith('/watch')) {
      videoId = props.searchParams.get('v') || '';
    }

    if (videoId) {
      embedUrl += videoId;
      if (playlistId) knownParams.append('list', playlistId);
      else if (s.loopPlaylist) knownParams.append('playlist', videoId);
    } else if (playlistId) {
      embedUrl += 'videoseries';
      knownParams.append('list', playlistId);
    } else if (search) {
      embedUrl = embedUrl.slice(0, -1);
      knownParams.append('list', search);
      knownParams.append('listType', 'search');
    } else {
      return '';
    }

    if (time) {
      if (Number.isFinite(Number(time))) {
        startSeconds = parseInt(time, 10);
      } else {
        const rMatch = time.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/);
        if (rMatch) {
          const [, h = 0, m = 0, sec = 0] = rMatch.map(Number);
          startSeconds = (h || 0) * 3600 + (m || 0) * 60 + (sec || 0);
        }
      }
    }
    if (startSeconds > 0) knownParams.append('start', String(startSeconds));
    knownParams.append('playsinline', '1');
    knownParams.append('rel', '0');
  } else if (host.endsWith('tiktok.com') && pathname.includes('/video/')) {
    const m = pathname.match(/\/video\/(\d+)/);
    if (!m) return '';
    return `https://www.tiktok.com/embed/v2/${m[1]}`;
  } else if (host === 'open.spotify.com' && /^\/(track|album|playlist|episode|show)\//.test(pathname)) {
    return `https://open.spotify.com/embed${pathname}`;
  } else {
    return '';
  }

  playerConfig.flags?.forEach((key, index) => {
    if (key) knownParams.append(key, String(Number(playerConfig.states[index] ?? false)));
  });

  if ([...knownParams.keys()].length > 0) {
    paramString = '?' + knownParams.toString();
  }

  return embedUrl + paramString + props.hash;
}

export function hasCordovaHttp() {
  return typeof window !== 'undefined' && typeof window.cordova?.plugin?.http?.sendRequest === 'function';
}

function isTroubleGoogleHtml(html) {
  const s = String(html || '');
  return (
    s.includes("having trouble accessing Google Search") ||
    s.includes('/httpservice/retry/enablejs') ||
    s.includes('emsg=SG_REL') ||
    s.includes('Our systems have detected unusual traffic')
  );
}

/**
 * Instant 0ms Google Homepage (Web & Images tabs) when visiting https://www.google.com
 */
function buildInstantGoogleHomeHtml(targetUrl) {
  let isImages = false;
  try {
    const u = new URL(targetUrl);
    isImages = u.searchParams.get('tbm') === 'isch' || u.searchParams.get('udm') === '2' || u.hostname.startsWith('images.');
  } catch (_) {}

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${isImages ? 'Google Images' : 'Google'}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: flex; flex-direction: column;
      font-family: Roboto, Arial, sans-serif; background: #202124; color: #e8eaed;
    }
    .top-nav {
      display: flex; align-items: center; gap: 18px; padding: 14px 20px; font-size: 13px;
    }
    .top-nav a {
      color: #9aa0a6; text-decoration: none; font-weight: 500; padding-bottom: 6px;
      border-bottom: 2px solid transparent;
    }
    .top-nav a.active { color: #8ab4f8; border-bottom-color: #8ab4f8; }
    .center {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 20px 16px 90px;
    }
    .logo {
      font-size: 48px; font-weight: 700; letter-spacing: -1px; margin-bottom: 24px; user-select: none;
    }
    .logo span:nth-child(1) { color: #4285f4; }
    .logo span:nth-child(2) { color: #ea4335; }
    .logo span:nth-child(3) { color: #fbbc05; }
    .logo span:nth-child(4) { color: #4285f4; }
    .logo span:nth-child(5) { color: #34a853; }
    .logo span:nth-child(6) { color: #ea4335; }
    .sub { font-size: 14px; color: #8ab4f8; margin-top: -18px; margin-bottom: 20px; font-weight: 500; }
    form { width: min(560px, 94vw); }
    .bar {
      display: flex; align-items: center; height: 46px; border-radius: 24px;
      background: #303134; border: 1px solid #5f6368; padding: 0 6px 0 16px;
    }
    .bar:focus-within { background: #303134; border-color: #8ab4f8; box-shadow: 0 1px 6px rgba(0,0,0,0.35); }
    .bar input {
      flex: 1; border: 0; outline: 0; background: transparent; color: #e8eaed; font-size: 16px;
    }
    .bar button {
      border: 0; border-radius: 20px; height: 34px; padding: 0 16px;
      background: #8ab4f8; color: #202124; font-weight: 600; font-size: 13px; cursor: pointer;
    }
  </style>
  ${buildGoogleTurboRuntime(targetUrl)}
</head>
<body>
  <div class="top-nav">
    <a href="https://www.google.com/webhp" class="${!isImages ? 'active' : ''}">All</a>
    <a href="https://www.google.com/webhp?tbm=isch" class="${isImages ? 'active' : ''}">Images</a>
  </div>
  <div class="center">
    <div class="logo"><span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span></div>
    ${isImages ? '<div class="sub">Images</div>' : ''}
    <form action="https://www.google.com/search" method="GET">
      ${isImages ? '<input type="hidden" name="tbm" value="isch">' : ''}
      <div class="bar">
        <input type="text" name="q" placeholder="${isImages ? 'Search Google Images...' : 'Search Google or type a URL'}" autocomplete="off" autofocus>
        <button type="submit">Search</button>
      </div>
    </form>
  </div>
</body>
</html>`;
  return html;
}

/**
 * Engine 1: Uses Acode's Hidden Native WebView (`acode.require('webview')` with `mode: 'hidden'`)
 * to load Google on its real `https://www.google.com` origin, pass the `enablejs` JS challenge,
 * and return the rendered DOM.
 */
async function tryHiddenWebviewGoogle(targetUrl) {
  if (headlessBusy) return null;
  let webviewMod = null;
  try {
    webviewMod = acode.require('webview');
  } catch (_) {}
  if (!webviewMod?.create) return null;

  headlessBusy = true;
  try {
    if (!headlessView) {
      headlessView = await webviewMod.create({
        mode: 'hidden',
        allowNavigation: true,
      });
    }

    await headlessView.loadURL(targetUrl);

    const start = Date.now();
    let clickedRetry = false;

    while (Date.now() - start < 4800) {
      await new Promise((r) => setTimeout(r, 260));
      let rawState = null;
      try {
        rawState = await headlessView.evaluate(`
          (function() {
            var bodyTxt = document.body ? document.body.innerText : '';
            var isTrouble = bodyTxt.indexOf('having trouble accessing Google Search') !== -1 ||
                            location.pathname.indexOf('/httpservice/retry/enablejs') !== -1 ||
                            location.pathname.indexOf('/sorry/') !== -1;
            var hasResults = !!(document.querySelector('#search, #rso, #islrg, [data-hveid], .g, .MjjYud'));
            return JSON.stringify({
              readyState: document.readyState,
              isTrouble: isTrouble,
              hasResults: hasResults,
              href: location.href
            });
          })()
        `);
      } catch (_) {
        continue;
      }

      let st = null;
      try {
        st = typeof rawState === 'string' ? JSON.parse(rawState) : rawState;
      } catch (_) {}
      if (!st) continue;

      if (st.isTrouble) {
        if (st.href && st.href.includes('/sorry/')) {
          break; // CAPTCHA -> switch immediately to fallback engine
        }
        if (!clickedRetry && Date.now() - start > 1400) {
          clickedRetry = true;
          try {
            await headlessView.evaluate(`
              (function() {
                var a = document.querySelector('a[href*="enablejs"], a[href*="/search?"]');
                if (a) a.click();
              })()
            `);
          } catch (_) {}
        }
        continue;
      }

      if (st.hasResults && (st.readyState === 'interactive' || st.readyState === 'complete')) {
        const snapshot = await headlessView.evaluate(`
          (function() {
            document.querySelectorAll('img').forEach(function(img) {
              var best = img.currentSrc || img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-iurl');
              if (best) img.setAttribute('src', best);
            });
            return JSON.stringify({
              href: location.href,
              html: document.documentElement.outerHTML
            });
          })()
        `);
        const parsedSnap = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
        if (parsedSnap?.html && !isTroubleGoogleHtml(parsedSnap.html)) {
          return {
            html: transformGoogleTurboHtml(parsedSnap.html, parsedSnap.href || targetUrl),
            finalUrl: parsedSnap.href || targetUrl,
          };
        }
      }
    }
  } catch (e) {
    console.warn('[LiveServer] headless webview google fallback:', e?.message || e);
    try {
      await headlessView?.destroy();
    } catch (_) {}
    headlessView = null;
  } finally {
    headlessBusy = false;
  }
  return null;
}

/**
 * Helper to fetch raw text/JSON via Cordova Native HTTP or standard fetch.
 */
function nativeGetText(url, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return reject(e);
    }

    if (hasCordovaHttp()) {
      window.cordova.plugin.http.sendRequest(
        parsed.origin + parsed.pathname,
        {
          method: 'get',
          params: Object.fromEntries(parsed.searchParams),
          responseType: 'text',
          timeout: 15,
          followRedirect: true,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            'Accept-Language': navigator.language || 'en-US,en;q=0.9',
            ...customHeaders,
          },
        },
        (res) => resolve(String(res.data || '')),
        (err) => reject(new Error(err?.error || 'HTTP error'))
      );
      return;
    }

    fetch(url).then((r) => r.text()).then(resolve).catch(reject);
  });
}

/**
 * Engine 2 (Zero-Block Fallback): When Google blocks with `enablejs` or CAPTCHA,
 * fetches real Web & Image results and renders them in a Google Search & Google Images UI.
 * Clicking any result opens the target site via our Node Reverse Proxy (/__proxy)!
 */
async function buildGoogleTurboFallbackResults(targetUrl) {
  const u = new URL(targetUrl);
  const q = (u.searchParams.get('q') || '').trim();
  const isImages = u.searchParams.get('tbm') === 'isch' || u.searchParams.get('udm') === '2';

  if (!q) {
    return buildInstantGoogleHomeHtml(targetUrl);
  }

  const webUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  const imgUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=isch`;

  let resultsHtml = '';

  if (isImages) {
    // Fetch real image results from Wikimedia Commons + DuckDuckGo/Yahoo Image search
    const images = [];
    try {
      const ddgImgPage = await nativeGetText(`https://images.search.yahoo.com/search/images?p=${encodeURIComponent(q)}`);
      const doc = new DOMParser().parseFromString(ddgImgPage, 'text/html');
      doc.querySelectorAll('li.ld, a[href*="rurl="], img[data-src], img[src]').forEach((el) => {
        if (images.length >= 36) return;
        const imgEl = el.tagName === 'IMG' ? el : el.querySelector('img');
        const thumb = imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src') || '';
        if (!thumb || !/^https?:\/\//i.test(thumb) || thumb.includes('s.yimg.com/pv/')) return;
        const aEl = el.tagName === 'A' ? el : el.closest('a') || el.querySelector('a');
        let rurl = '';
        const href = aEl?.getAttribute('href') || '';
        try {
          const hu = new URL(href, 'https://images.search.yahoo.com');
          rurl = hu.searchParams.get('rurl') || hu.searchParams.get('imgurl') || '';
        } catch (_) {}
        if (!rurl) rurl = thumb;
        const title = imgEl?.getAttribute('alt') || aEl?.getAttribute('aria-label') || q;
        if (!images.some((it) => it.thumb === thumb)) {
          images.push({ thumb, url: rurl, title });
        }
      });
    } catch (_) {}

    if (images.length === 0) {
      try {
        const wikiJson = await nativeGetText(
          `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap|drawing%20${encodeURIComponent(q)}&gsrlimit=24&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=400&format=json&origin=*`
        );
        const data = JSON.parse(wikiJson);
        const pages = data?.query?.pages || {};
        Object.values(pages).forEach((p) => {
          const ii = p?.imageinfo?.[0];
          if (ii?.thumburl) {
            images.push({
              thumb: ii.thumburl,
              url: ii.descriptionurl || ii.url || ii.thumburl,
              title: String(p.title || q).replace(/^File:/i, ''),
            });
          }
        });
      } catch (_) {}
    }

    if (images.length > 0) {
      resultsHtml = `<div class="img-grid">${images
        .map((it) => {
          let host = '';
          try { host = new URL(it.url).hostname.replace(/^www\./, ''); } catch (_) {}
          return `<a class="img-card" href="${escapeHtml(it.url)}">
            <div class="img-box"><img src="${escapeHtml(it.thumb)}" alt="${escapeHtml(it.title)}" loading="lazy"></div>
            <div class="img-title">${escapeHtml(it.title)}</div>
            <div class="img-host">${escapeHtml(host)}</div>
          </a>`;
        })
        .join('')}</div>`;
    } else {
      resultsHtml = `<div class="empty">No images found for "${escapeHtml(q)}".</div>`;
    }
  } else {
    // Fetch real web search results via DuckDuckGo HTML endpoint
    const items = [];
    try {
      const ddgHtml = await nativeGetText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`);
      const doc = new DOMParser().parseFromString(ddgHtml, 'text/html');
      doc.querySelectorAll('.result, .web-result').forEach((row) => {
        const a = row.querySelector('a.result__a');
        if (!a) return;
        let href = a.getAttribute('href') || '';
        if (href.includes('uddg=')) {
          try {
            const uParam = new URL(href, 'https://html.duckduckgo.com').searchParams.get('uddg');
            if (uParam) href = decodeURIComponent(uParam);
          } catch (_) {}
        }
        if (!/^https?:\/\//i.test(href)) return;
        const title = (a.textContent || '').trim();
        const snippet = (row.querySelector('.result__snippet')?.textContent || '').trim();
        if (title) items.push({ title, url: href, snippet });
      });
    } catch (_) {}

    if (items.length > 0) {
      resultsHtml = `<div class="web-list">${items
        .map((it) => {
          let host = '';
          try { host = new URL(it.url).hostname; } catch (_) {}
          const fav = host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32` : '';
          return `<div class="web-card">
            <a class="web-link" href="${escapeHtml(it.url)}">
              <div class="web-cite">
                ${fav ? `<img src="${escapeHtml(fav)}" class="web-fav" alt="">` : ''}
                <div class="web-cite-txt">
                  <div class="web-host">${escapeHtml(host)}</div>
                  <div class="web-url">${escapeHtml(it.url)}</div>
                </div>
              </div>
              <div class="web-title">${escapeHtml(it.title)}</div>
            </a>
            ${it.snippet ? `<div class="web-desc">${escapeHtml(it.snippet)}</div>` : ''}
          </div>`;
        })
        .join('')}</div>`;
    } else {
      resultsHtml = `<div class="empty">No results found for "${escapeHtml(q)}".</div>`;
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(q)} - Google Search</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: Roboto, Arial, sans-serif;
      background: #202124; color: #e8eaed; line-height: 1.45;
    }
    .header {
      position: sticky; top: 0; z-index: 10; background: #202124;
      border-bottom: 1px solid #3c4043; padding: 10px 14px 0;
    }
    .top-row {
      display: flex; align-items: center; gap: 12px; max-width: 720px;
    }
    .g-logo {
      font-size: 22px; font-weight: 700; text-decoration: none; flex-shrink: 0;
    }
    .g-logo span:nth-child(1) { color: #4285f4; }
    .g-logo span:nth-child(2) { color: #ea4335; }
    .g-logo span:nth-child(3) { color: #fbbc05; }
    .g-logo span:nth-child(4) { color: #4285f4; }
    .g-logo span:nth-child(5) { color: #34a853; }
    .g-logo span:nth-child(6) { color: #ea4335; }
    form { flex: 1; min-width: 0; }
    .search-box {
      display: flex; align-items: center; height: 40px; border-radius: 20px;
      background: #303134; border: 1px solid #5f6368; padding: 0 5px 0 14px;
    }
    .search-box input {
      flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
      color: #e8eaed; font-size: 15px;
    }
    .search-box button {
      border: 0; border-radius: 16px; height: 30px; padding: 0 12px;
      background: #8ab4f8; color: #202124; font-weight: 600; font-size: 12.5px; cursor: pointer;
    }
    .tabs {
      display: flex; gap: 22px; margin-top: 10px; font-size: 13px; padding-left: 4px;
    }
    .tabs a {
      color: #9aa0a6; text-decoration: none; padding-bottom: 8px;
      border-bottom: 3px solid transparent; font-weight: 500;
    }
    .tabs a.active { color: #8ab4f8; border-bottom-color: #8ab4f8; }
    .web-list { max-width: 680px; padding: 12px 14px 36px; display: flex; flex-direction: column; gap: 18px; }
    .web-card { display: flex; flex-direction: column; gap: 4px; }
    .web-link { text-decoration: none; color: inherit; display: block; }
    .web-cite { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .web-fav { width: 18px; height: 18px; border-radius: 50%; background: #303134; flex-shrink: 0; }
    .web-cite-txt { min-width: 0; flex: 1; }
    .web-host { font-size: 13px; color: #dadce0; line-height: 1.2; }
    .web-url { font-size: 11.5px; color: #9aa0a6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .web-title { font-size: 18px; color: #8ab4f8; font-weight: 400; line-height: 1.3; }
    .web-link:hover .web-title { text-decoration: underline; }
    .web-desc { font-size: 13.5px; color: #bdc1c6; line-height: 1.5; }
    .img-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 10px; padding: 12px;
    }
    .img-card {
      display: flex; flex-direction: column; text-decoration: none; color: inherit;
      background: #303134; border-radius: 8px; overflow: hidden; border: 1px solid #3c4043;
    }
    .img-box { width: 100%; height: 135px; background: #171717; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .img-box img { width: 100%; height: 100%; object-fit: cover; }
    .img-title { font-size: 12px; color: #e8eaed; padding: 6px 8px 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .img-host { font-size: 11px; color: #9aa0a6; padding: 0 8px 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .empty { padding: 32px 16px; color: #9aa0a6; font-size: 14px; }
  </style>
  ${buildGoogleTurboRuntime(targetUrl)}
</head>
<body>
  <div class="header">
    <div class="top-row">
      <a href="https://www.google.com/webhp" class="g-logo"><span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span></a>
      <form action="https://www.google.com/search" method="GET">
        ${isImages ? '<input type="hidden" name="tbm" value="isch">' : ''}
        <div class="search-box">
          <input type="text" name="q" value="${escapeHtml(q)}" autocomplete="off">
          <button type="submit">Search</button>
        </div>
      </form>
    </div>
    <div class="tabs">
      <a href="${escapeHtml(webUrl)}" class="${!isImages ? 'active' : ''}">All</a>
      <a href="${escapeHtml(imgUrl)}" class="${isImages ? 'active' : ''}">Images</a>
    </div>
  </div>
  ${resultsHtml}
</body>
</html>`;
}

/**
 * Main entry for Google / Google Search / Google Images Turbo fetching.
 */
export async function fetchViaCordovaTurbo(targetUrl, opts = {}) {
  if (!opts.forceReload && turboHtmlCache.has(targetUrl)) {
    const cached = turboHtmlCache.get(targetUrl);
    if (Date.now() - cached.ts < TURBO_CACHE_TTL) {
      return { ok: true, html: cached.html, finalUrl: cached.finalUrl, fromCache: true };
    }
    turboHtmlCache.delete(targetUrl);
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch (_) {
    return { ok: false, error: 'Invalid URL' };
  }

  // 1. Instant 0ms Google Homepage if no search query
  const q = (parsed.searchParams.get('q') || '').trim();
  if (!q && (parsed.pathname === '/' || parsed.pathname === '' || parsed.pathname === '/webhp' || parsed.pathname === '/imghp')) {
    const homeHtml = buildInstantGoogleHomeHtml(parsed.href);
    turboHtmlCache.set(targetUrl, { html: homeHtml, finalUrl: parsed.href, ts: Date.now() });
    return { ok: true, html: homeHtml, finalUrl: parsed.href };
  }

  // 2. Try Acode Hidden Native WebView first (passes Google enablejs natively)
  const wvRes = await tryHiddenWebviewGoogle(parsed.href);
  if (wvRes && wvRes.html) {
    const entry = { html: wvRes.html, finalUrl: wvRes.finalUrl, ts: Date.now() };
    turboHtmlCache.set(targetUrl, entry);
    turboHtmlCache.set(wvRes.finalUrl, entry);
    return { ok: true, html: wvRes.html, finalUrl: wvRes.finalUrl };
  }

  // 3. Zero-Block Fallback (guarantees user NEVER sees "If you're having trouble accessing Google Search")
  const fallbackHtml = await buildGoogleTurboFallbackResults(parsed.href);
  const entry = { html: fallbackHtml, finalUrl: parsed.href, ts: Date.now() };
  turboHtmlCache.set(targetUrl, entry);
  return { ok: true, html: fallbackHtml, finalUrl: parsed.href };
}

/**
 * Cleans rendered Google HTML:
 * - Strips all of Google's own <script> tags so they cannot re-run inside `about:srcdoc`
 *   and trigger the `enablejs` trouble screen!
 * - Unwraps all /url?q=... and /imgres?imgrefurl=... links into direct external URLs.
 * - Injects our clean Turbo runtime script so link clicks & searches route properly.
 */
export function transformGoogleTurboHtml(rawHtml, finalUrl) {
  const url = new URL(finalUrl);
  const baseDirHref = url.origin + url.pathname.replace(/[^/]*$/, '');

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // CRITICAL: Remove all of Google's <script> and <noscript> tags so they never re-execute inside srcdoc!
  doc.querySelectorAll('script, noscript').forEach((s) => s.remove());

  doc.querySelectorAll('meta[http-equiv]').forEach((m) => {
    const eq = (m.getAttribute('http-equiv') || '').toLowerCase();
    if (eq === 'content-security-policy' || eq === 'x-frame-options' || eq === 'refresh') m.remove();
  });

  doc.querySelectorAll('[integrity], [nonce]').forEach((el) => {
    el.removeAttribute('integrity');
    el.removeAttribute('nonce');
  });

  let baseEl = doc.querySelector('head base');
  if (!baseEl) {
    baseEl = doc.createElement('base');
    if (doc.head) doc.head.prepend(baseEl);
  }
  baseEl.setAttribute('href', baseDirHref);

  doc.querySelectorAll('a[href]').forEach((a) => {
    a.removeAttribute('ping');
    a.removeAttribute('onmousedown');
    a.removeAttribute('ontouchstart');
    a.removeAttribute('jsaction');
    const rawHref = a.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;
    const unwrapped = unwrapGoogleRedirectUrl(rawHref, finalUrl);
    a.setAttribute('href', unwrapped);
  });

  doc.querySelectorAll('[data-lpage], [data-ru]').forEach((card) => {
    const pageUrl = card.getAttribute('data-lpage') || card.getAttribute('data-ru');
    if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) return;
    card.querySelectorAll('a').forEach((a) => {
      const h = a.getAttribute('href') || '';
      if (!h || h === '#' || h.startsWith('javascript:') || isGoogleUrl(h)) {
        a.setAttribute('href', pageUrl);
      }
    });
  });

  doc.querySelectorAll('img').forEach((img) => {
    const realSrc =
      img.getAttribute('data-src') ||
      img.getAttribute('data-iurl') ||
      img.getAttribute('data-Url') ||
      img.getAttribute('data-lazy-src');
    const curSrc = img.getAttribute('src') || '';
    if (realSrc && (!curSrc || curSrc.startsWith('data:image/gif') || curSrc.startsWith('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE'))) {
      try {
        img.setAttribute('src', new URL(realSrc, finalUrl).href);
      } catch (_) {
        img.setAttribute('src', realSrc);
      }
    } else if (curSrc && curSrc.startsWith('/')) {
      try {
        img.setAttribute('src', new URL(curSrc, finalUrl).href);
      } catch (_) {}
    }
    if (img.style) {
      if (img.style.opacity === '0') img.style.opacity = '1';
      if (img.style.visibility === 'hidden') img.style.visibility = 'visible';
    }
  });

  doc.querySelectorAll('link[href]').forEach((el) => {
    const h = el.getAttribute('href');
    if (h && h.startsWith('/')) {
      try { el.setAttribute('href', new URL(h, finalUrl).href); } catch (_) {}
    }
  });
  doc.querySelectorAll('form[action]').forEach((el) => {
    const act = el.getAttribute('action');
    if (act) {
      try { el.setAttribute('action', new URL(act, finalUrl).href); } catch (_) {}
    }
  });

  const runtimeScript = doc.createElement('script');
  runtimeScript.textContent = buildGoogleTurboRuntime(finalUrl);
  if (doc.head) {
    doc.head.insertBefore(runtimeScript, baseEl.nextSibling);
  } else if (doc.documentElement) {
    doc.documentElement.prepend(runtimeScript);
  }

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

function buildGoogleTurboRuntime(targetUrl) {
  let origin = '';
  try { origin = new URL(targetUrl).origin; } catch (_) {}

  return `<script>
(function() {
  var P = window.parent || window.top;
  window.__LS_PROXY_TARGET__ = ${JSON.stringify(targetUrl)};
  window.__LS_PROXY_ORIGIN__ = ${JSON.stringify(origin)};

  function postToBrowser(msg) {
    try {
      msg.ls = 1;
      P.postMessage(msg, '*');
    } catch (e) {}
  }

  function unwrapGoogleUrl(raw) {
    try {
      var u = new URL(raw, window.__LS_PROXY_TARGET__);
      if (/^(www\\.|m\\.|images\\.|encrypted\\.)?google\\.[a-z.]+$/i.test(u.hostname)) {
        if (u.pathname === '/url') {
          var q = u.searchParams.get('q') || u.searchParams.get('url');
          if (q && /^https?:\\/\\//i.test(q)) return q;
        }
        if (u.pathname === '/imgres') {
          var r = u.searchParams.get('imgrefurl') || u.searchParams.get('imgurl');
          if (r && /^https?:\\/\\//i.test(r)) return r;
        }
      }
      return u.href;
    } catch (e) {
      return raw;
    }
  }

  function sendMeta() {
    postToBrowser({
      type: 'meta',
      href: window.__LS_PROXY_TARGET__,
      title: document.title || 'Google Search',
      favicon: 'https://www.google.com/favicon.ico'
    });
  }

  document.addEventListener('DOMContentLoaded', sendMeta);
  window.addEventListener('load', sendMeta);
  setTimeout(sendMeta, 60);

  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) {
      var card = e.target && e.target.closest ? e.target.closest('[data-lpage], [data-ru]') : null;
      if (card) {
        var cardUrl = card.getAttribute('data-lpage') || card.getAttribute('data-ru');
        if (cardUrl && /^https?:\\/\\//i.test(cardUrl)) {
          e.preventDefault();
          e.stopPropagation();
          postToBrowser({ type: 'navigate', href: cardUrl });
          return;
        }
      }
      return;
    }
    var rawHref = a.getAttribute('href') || '';
    if (!rawHref || rawHref.charAt(0) === '#' || /^javascript:/i.test(rawHref)) return;
    var resolved = unwrapGoogleUrl(rawHref);
    if (/^https?:\\/\\//i.test(resolved)) {
      e.preventDefault();
      e.stopPropagation();
      postToBrowser({ type: 'navigate', href: resolved });
    }
  }, true);

  function handleSearchForm(form) {
    if (!form) return false;
    var rawAction = form.getAttribute('action') || 'https://www.google.com/search';
    try {
      var u = new URL(rawAction, window.__LS_PROXY_TARGET__);
      var fd = new FormData(form);
      fd.forEach(function(v, k) {
        if (typeof v === 'string') u.searchParams.set(k, v);
      });
      postToBrowser({ type: 'navigate', href: u.href });
      return true;
    } catch (err) {
      return false;
    }
  }

  document.addEventListener('submit', function(e) {
    if (handleSearchForm(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  try {
    var origSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
      if (handleSearchForm(this)) return;
      return origSubmit.apply(this, arguments);
    };
  } catch (e) {}

  window.open = function(u) {
    if (u) {
      var resolved = unwrapGoogleUrl(String(u));
      if (/^https?:\\/\\//i.test(resolved)) {
        postToBrowser({ type: 'navigate', href: resolved });
      }
    }
    return window;
  };
})();
</script>`;
}