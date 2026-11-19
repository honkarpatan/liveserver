(()=>{var Oi=Object.defineProperty;var R=(e,t)=>()=>(e&&(t=e(e=0)),t);var xe=(e,t)=>{for(var r in t)Oi(e,r,{get:t[r],enumerable:!0})};var Dt,on=R(()=>{Dt={pluginEnabled:!0,port:8080,bindAddress:"127.0.0.1",rootFolder:"",rootFolderUri:"",lastMirrorRoot:"",mirrorSharedStorage:!0,liveReload:!0,openBrowserOnStart:!0,directoryListing:!0,autoShutdownMinutes:0,browserDisplayMode:"inPage",browserSearchEngine:"brave",externalSiteMode:"proxy",browserHomeUrl:"",showSideButton:!0,sideButtonRunningLabel:"{HOST}:{PORT}",sideButtonOfflineLabel:"Go Live",browserOpacity:1,browserOverlay:!1,enablePinchToZoom:!0,overlayAutoSave:!0,browserBookmarks:[],browserDevice:{on:!1,id:"responsive",w:390,h:844,zoom:"fit"},enableCors:!0,customHeaders:"",customCharset:"utf-8",bindLocalhostOnly:!0,ipWhitelist:"",basicAuthUser:"",basicAuthPass:"",dependenciesInstalled:!1,acodelsPath:"",showAddressBar:!0}});var De={};xe(De,{getPluginId:()=>Hi,getSettings:()=>k,saveSettingsPatch:()=>Bi,updateSetting:()=>H});function Hi(){return sn}function k(){var e;try{let t=acode.require("settings"),r=(e=t==null?void 0:t.value)==null?void 0:e[sn];return(!r||typeof r!="object")&&(r={...Dt},t!=null&&t.value&&(t.value[sn]=r)),r}catch{return{...Dt}}}function H(e,t){let r=k();r[e]=t;try{acode.require("settings").update(!1)}catch{}try{window.dispatchEvent(new CustomEvent("liveserver-settings",{detail:{key:e,value:t}}))}catch{}}function Bi(e){let t=k();Object.assign(t,e);try{acode.require("settings").update(!1)}catch{}}var sn,K=R(()=>{on();sn="acode.plugin.sugerserver"});function _e(e){return String(e!=null?e:"").replace(/'/g,`'"'"'`)}function an(e){let t=String(e||"").trim();return t?/^sh\s+-c\s+/i.test(t)?t:`sh -c '${_e(t)}'`:"sh -c 'true'"}function It(e){return String(e||"").split(`
`).filter(t=>!/proot warning:/i.test(t)).join(`
`)}function Co(e){if(e==null)return"";if(typeof e=="string")return It(e);if(typeof e=="object"){let t=[e.stdout,e.stderr,e.output,e.message].filter(r=>r!=null&&r!=="").map(String);if(t.length)return It(t.join(`
`));try{return It(JSON.stringify(e))}catch{return It(String(e))}}return It(String(e))}function ln(e){try{return btoa(unescape(encodeURIComponent(e)))}catch{let r=new TextEncoder().encode(e),n="";return r.forEach(o=>{n+=String.fromCharCode(o)}),btoa(n)}}function ft(){try{let e=acode.require("terminal"),t=typeof Executor!="undefined"&&Executor||window.Executor||globalThis.Executor||(e==null?void 0:e.Executor)||null;if(t!=null&&t.execute)return t}catch{}return null}async function ee(e,t={}){let r=typeof t=="number"?t:t.timeoutMs||0,n=typeof t=="object"&&t.alpine!==!1,o=ft();if(!(o!=null&&o.execute))throw console.warn("[LiveServer:exec] no executor",{hasWindow:!!window.Executor,hasGlobal:!!globalThis.Executor,hasTerminal:!!acode.require("terminal")}),new Error("Executor not available. Open Acode Terminal once (or install Executor), then retry.");let s=an(e);console.log("[LiveServer:exec] run len=",s.length);let i=async()=>{try{let a=await o.execute(s,n),d=Co(a);return console.log("[LiveServer:exec] ok len=",d.length),d}catch(a){let d=Co(a)||a&&a.message||String(a);return console.warn("[LiveServer:exec] catch \u2192",String(d).slice(0,240)),d}};return r>0?Promise.race([i(),new Promise(a=>setTimeout(()=>{console.warn("[LiveServer:exec] timeout",r,"ms \u2014 continuing"),a("")},r))]):i()}async function qt(e,t={}){let r=ln(String(e||""));return ee(`echo '${_e(r)}' | base64 -d | sh`,{timeoutMs:t.timeoutMs||0,alpine:t.alpine!==!1})}async function cn(e){try{let t=await ee(`command -v ${_e(e)} 2>/dev/null || which ${_e(e)} 2>/dev/null || echo MISS`,{timeoutMs:2e4}),r=String(t||"").trim();return!r||/MISS|not found/i.test(r)?!1:/\//.test(r)||r.split(`
`).some(n=>n.includes("/"))}catch(t){return console.warn("[LiveServer:exec] commandExists",e,(t==null?void 0:t.message)||t),!1}}var ht=R(()=>{});function Ro(){let e=document.getElementById("ls-deps-picker-css");e&&e.remove();let t=document.createElement("style");t.id="ls-deps-picker-css",t.textContent=`
#ls-deps-picker {
  position: fixed;
  inset: 0;
  z-index: 100005;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.56);
  backdrop-filter: blur(3px);
  animation: ls-dp-in 0.18s ease-out;
}
@keyframes ls-dp-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
#ls-deps-picker.ls-dp-leaving {
  opacity: 0;
  transition: opacity 0.16s ease;
}
.ls-dp-backdrop {
  position: absolute;
  inset: 0;
}
.ls-dp-card {
  position: relative;
  z-index: 1;
  width: min(440px, 94vw);
  max-height: min(82vh, 580px);
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: var(--popup-background-color, var(--secondary-color, #1e1f22));
  color: var(--popup-text-color, var(--primary-text-color, var(--color, #e8eaed)));
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.28));
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.52);
  overflow: hidden;
  font-family: inherit;
}

/* ---- Linux Window Titlebar ---- */
.ls-dp-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 15px;
  background: var(--primary-color, rgba(0, 0, 0, 0.24));
  border-bottom: 1px solid var(--border-color, rgba(128, 128, 128, 0.22));
  flex-shrink: 0;
}
.ls-dp-title-left {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.ls-dp-dots {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.ls-dp-dots span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}
.ls-dp-dots span:nth-child(1) { background: #ef4444; }
.ls-dp-dots span:nth-child(2) { background: #f59e0b; }
.ls-dp-dots span:nth-child(3) { background: #22c55e; }
.ls-dp-title {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ls-dp-subbar {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--secondary-text-color, inherit);
  opacity: 0.85;
  background: rgba(128, 128, 128, 0.06);
  border-bottom: 1px solid var(--border-color, rgba(128, 128, 128, 0.16));
  flex-shrink: 0;
}

/* ---- Body ---- */
.ls-dp-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 15px;
  min-height: 90px;
}
.ls-dp-checking {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  padding: 26px 8px;
  font-size: 13px;
}
.ls-dp-spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(128, 128, 128, 0.3);
  border-top-color: var(--active-color, #22c55e);
  animation: ls-spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes ls-spin {
  to { transform: rotate(360deg); }
}

/* ---- Package Rows ---- */
.ls-dp-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  border-radius: 6px;
  margin-bottom: 7px;
  background: var(--primary-color, rgba(128, 128, 128, 0.1));
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.2));
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.ls-dp-row:last-child {
  margin-bottom: 0;
}
.ls-dp-row.is-present {
  opacity: 0.78;
  cursor: default;
}
.ls-dp-row input[type="checkbox"] {
  width: 1.12rem;
  height: 1.12rem;
  flex-shrink: 0;
  accent-color: var(--active-color, #22c55e);
}
.ls-dp-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ls-dp-name {
  font-weight: 600;
  font-size: 13px;
}
.ls-dp-desc {
  font-size: 11.5px;
  color: var(--secondary-text-color, inherit);
  opacity: 0.75;
  word-break: break-word;
}
.ls-dp-status {
  font-size: 11px;
  flex-shrink: 0;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
}
.ls-dp-status.ok {
  background: rgba(34, 197, 94, 0.16);
  color: #4ade80;
}
.ls-dp-status.miss {
  background: rgba(239, 68, 68, 0.16);
  color: #f87171;
}
.ls-dp-status.opt {
  background: rgba(128, 128, 128, 0.18);
  color: var(--secondary-text-color, #9aa0a6);
}

/* ---- Linux Installation Progress View ---- */
.ls-dp-progress {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ls-dp-warn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  border-radius: 5px;
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fbbf24;
  font-size: 12px;
  font-weight: 500;
}
.ls-dp-prog-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12.5px;
}
.ls-dp-progress-info {
  opacity: 0.92;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ls-dp-pct {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--active-color, #22c55e);
  flex-shrink: 0;
}
.ls-dp-progress-track {
  width: 100%;
  height: 8px;
  border-radius: 99px;
  background: var(--primary-color, rgba(128, 128, 128, 0.25));
  overflow: hidden;
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.2));
}
.ls-dp-progress-bar {
  height: 100%;
  width: 0%;
  border-radius: 99px;
  background: var(--active-color, #22c55e);
  transition: width 0.28s ease;
}
.ls-dp-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--active-color, #61afef);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 0;
  font-family: inherit;
}
.ls-dp-log {
  margin: 0;
  max-height: 155px;
  overflow-y: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.4;
  background: #0d1117;
  color: #c9d1d9;
  padding: 10px;
  border-radius: 5px;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.25));
}

/* ---- Footer ---- */
.ls-dp-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  padding: 11px 15px;
  background: var(--primary-color, rgba(0, 0, 0, 0.18));
  border-top: 1px solid var(--border-color, rgba(128, 128, 128, 0.22));
  flex-shrink: 0;
}
.ls-dp-btn {
  border: none;
  border-radius: 5px;
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(128, 128, 128, 0.22);
  color: inherit;
  font-family: inherit;
}
.ls-dp-btn:active {
  opacity: 0.85;
}
.ls-dp-btn.ls-dp-install,
.ls-dp-btn.ls-dp-done {
  background: var(--active-color, #22c55e);
  color: var(--button-text-color, #0b1116);
}
.ls-dp-btn.ls-dp-cancel {
  background: rgba(239, 68, 68, 0.18);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.38);
}
.ls-dp-empty {
  opacity: 0.7;
  padding: 14px;
  text-align: center;
  font-size: 13px;
}
  `,document.head.appendChild(t)}var Ao=R(()=>{});function $t(e){return String(e!=null?e:"").replace(/&/g,"&").replace(/</g,"<").replace(/>/g,">").replace(/"/g,'"')}function Oo(){return!!B}function dn(){return zt}function Mo(){zt=!1}function Ho(e={}){Ro(),Po(!0),zt=!1;let t=e.title||"Live Server Dependencies",r=e.subtitle||"Checking Alpine Linux packages...",n=Array.isArray(e.items)?e.items.slice():[];return new Promise(o=>{mt=o,B=document.createElement("div"),B.id="ls-deps-picker",B.innerHTML=`
      <div class="ls-dp-backdrop"></div>
      <div class="ls-dp-card" role="dialog" aria-modal="true">
        <div class="ls-dp-titlebar">
          <div class="ls-dp-title-left">
            <span class="ls-dp-dots"><span></span><span></span><span></span></span>
            <div class="ls-dp-title">${$t(t)}</div>
          </div>
        </div>
        <div class="ls-dp-subbar ls-dp-subtitle">${$t(r)}</div>

        <div class="ls-dp-body">
          <div class="ls-dp-checking" style="display:${e.checking?"flex":"none"}">
            <span class="ls-dp-spinner"></span>
            <span>Scanning Alpine environment...</span>
          </div>

          <div class="ls-dp-lists" style="display:${e.checking?"none":"block"}"></div>

          <div class="ls-dp-progress" style="display:none">
            <div class="ls-dp-warn">
              <span>\u26A0</span>
              <span>Don't close Acode while packages are installing.</span>
            </div>

            <div class="ls-dp-prog-top">
              <div class="ls-dp-progress-info">Preparing installation...</div>
              <span class="ls-dp-pct">0%</span>
            </div>

            <div class="ls-dp-progress-track">
              <div class="ls-dp-progress-bar" style="width:0%"></div>
            </div>

            <button type="button" class="ls-dp-link ls-dp-toggle-log">
              <span class="ls-dp-arrow">\u25B8</span>
              <span class="ls-dp-more-label">Show more</span>
            </button>
            <pre class="ls-dp-log" style="display:none"></pre>
          </div>
        </div>

        <div class="ls-dp-footer">
          <button type="button" class="ls-dp-btn ls-dp-notnow">Not now</button>
          <button type="button" class="ls-dp-btn ls-dp-cancel" style="display:none">Cancel installation</button>
          <button type="button" class="ls-dp-btn ls-dp-install">Install selected</button>
          <button type="button" class="ls-dp-btn ls-dp-done" style="display:none">Close</button>
        </div>
      </div>`,document.body.appendChild(B);let s=B.querySelector(".ls-dp-lists"),i=B.querySelector(".ls-dp-checking"),a=B.querySelector(".ls-dp-progress"),d=B.querySelector(".ls-dp-progress-bar"),u=B.querySelector(".ls-dp-pct"),p=B.querySelector(".ls-dp-progress-info"),c=B.querySelector(".ls-dp-log"),g=B.querySelector(".ls-dp-install"),h=B.querySelector(".ls-dp-notnow"),l=B.querySelector(".ls-dp-cancel"),v=B.querySelector(".ls-dp-done"),T=B.querySelector(".ls-dp-toggle-log"),x=B.querySelector(".ls-dp-arrow"),_=B.querySelector(".ls-dp-more-label"),O=B.querySelector(".ls-dp-subtitle"),C=B.querySelector(".ls-dp-backdrop");function b(){if(!s)return;let m="";for(let y of n){let oe=y.present?'<span class="ls-dp-status ok">installed</span>':y.optional?'<span class="ls-dp-status opt">optional</span>':'<span class="ls-dp-status miss">missing</span>',ye=y.checked!=null?!!y.checked:!y.present&&!y.optional;m+=`<label class="ls-dp-row ${y.present?"is-present":"is-missing"}">
          <input type="checkbox" data-id="${$t(y.id)}" ${ye?"checked":""} ${y.present?"disabled":""}/>
          <span class="ls-dp-row-main">
            <span class="ls-dp-name">${$t(y.label)}</span>
            <span class="ls-dp-desc">${$t(y.desc||"")}</span>
          </span>${oe}</label>`}s.innerHTML=m||'<div class="ls-dp-empty">No items</div>'}function M(){let m=[];return B==null||B.querySelectorAll("input[type=checkbox][data-id]:checked:not(:disabled)").forEach(y=>m.push(y.getAttribute("data-id"))),m}function $(m){let y=M(),oe=mt;mt=null,Po(!1),oe&&oe({action:m,selected:y})}function I(){let m=M();if(!m.length){try{acode.require("toast")("Select at least one item",2e3)}catch{}return}zt=!1,s&&(s.style.display="none"),i&&(i.style.display="none"),a&&(a.style.display="flex"),g&&(g.style.display="none"),h&&(h.style.display="none"),l&&(l.style.display="inline-block"),v&&(v.style.display="none"),d&&(d.style.width="2%"),u&&(u.textContent="2%"),p&&(p.textContent="Initializing package installer..."),c&&(c.textContent=""),O&&(O.textContent="Installing selected packages in Alpine Linux...");let y=mt;mt=null,y&&y({action:"install",selected:m,keepOpen:!0})}g==null||g.addEventListener("click",()=>I()),h==null||h.addEventListener("click",()=>$("notnow")),l==null||l.addEventListener("click",()=>{zt=!0,p&&(p.textContent="Cancelled"),$("cancel")}),v==null||v.addEventListener("click",()=>$("done")),C==null||C.addEventListener("click",()=>{a&&a.style.display!=="none"&&(l==null?void 0:l.style.display)!=="none"||$("close")}),T==null||T.addEventListener("click",()=>{if(!c)return;let m=c.style.display!=="none";c.style.display=m?"none":"block",x&&(x.textContent=m?"\u25B8":"\u25BE"),_&&(_.textContent=m?"Show more":"Show less"),m||(c.scrollTop=c.scrollHeight)}),B._lsDpUpdate=m=>{if(m.checking===!1&&i&&s&&(i.style.display="none",s.style.display="block"),m.checking===!0&&i&&s&&(i.style.display="flex",s.style.display="none"),m.subtitle!=null&&O&&(O.textContent=m.subtitle),Array.isArray(m.items)&&(n.length=0,m.items.forEach(y=>n.push({...y,checked:y.checked!=null?!!y.checked:!y.present&&!y.optional})),b()),m.progressMode&&(s&&(s.style.display="none"),i&&(i.style.display="none"),a&&(a.style.display="flex"),g&&(g.style.display="none"),h&&(h.style.display="none"),l&&(l.style.display=m.showDone?"none":"inline-block"),v&&(v.style.display=m.showDone?"inline-block":"none")),typeof m.percent=="number"){let y=Math.max(0,Math.min(100,Math.round(m.percent)));d&&(d.style.width=y+"%"),u&&(u.textContent=y+"%")}m.info&&p&&(p.textContent=m.info),m.logAppend&&c&&(c.textContent+=m.logAppend,c.scrollTop=c.scrollHeight),m.logSet!=null&&c&&(c.textContent=m.logSet)},b()})}function me(e){B&&typeof B._lsDpUpdate=="function"&&B._lsDpUpdate(e)}function Po(e){if(!B)return;let t=B;B=null,mt=null;try{t.classList.add("ls-dp-leaving")}catch{}let r=()=>{try{t.remove()}catch{}};e?r():setTimeout(r,180)}var B,mt,zt,Bo=R(()=>{Ao();B=null,mt=null,zt=!1});var xr={};xe(xr,{DEP_CATALOG:()=>vr,checkDependenciesAction:()=>Ui,ensureLiveServerDeps:()=>wr,reinstallDependenciesAction:()=>Fi,resetDepsSession:()=>fn,resolveAcodelsPath:()=>bt,scanAllDeps:()=>pn,showDepsPickerFlow:()=>yr,verifyDependencies:()=>Ut});async function bt(){let e=k();try{let r=await ee(`for d in /root/.acode_liveserver/acodels /home/root/.acode_liveserver/acodels "$HOME/.acode_liveserver/acodels"; do
  [ -f "$d/index.js" ] || continue
  if [ -d "$d/node_modules/express" ]; then echo "FULL:$d"; exit 0; fi
  echo "BARE:$d"
done
exit 0`,{timeoutMs:12e3}),n=String(r||"").split(`
`).map(d=>d.trim()).filter(Boolean),o=n.filter(d=>d.startsWith("FULL:")).map(d=>d.slice(5)),s=n.filter(d=>d.startsWith("BARE:")).map(d=>d.slice(5)),i=d=>d.filter(p=>p&&!p.startsWith("/public")).sort((p,c)=>(c.startsWith("/root")?1:0)-(p.startsWith("/root")?1:0))[0]||d.find(p=>p&&!p.startsWith("/public"))||d[0]||null,a=i(o)||i(s);if(a){try{H("acodelsPath",a)}catch{}return a}}catch(r){console.warn("[LiveServer:deps] probe",(r==null?void 0:r.message)||r)}let t=String(e.acodelsPath||"").trim();if(t&&!t.startsWith("/public")&&!t.includes("com.termux"))return t;try{t&&H("acodelsPath","")}catch{}return"/root/.acode_liveserver/acodels"}async function Ii(e){try{let t=e?_e(e):"''",r=await ee("for d in "+t+' /root/.acode_liveserver/acodels "$HOME/.acode_liveserver/acodels"; do [ -d "$d/node_modules/express" ] && [ -d "$d/node_modules/ws" ] && echo OK && exit 0; done; echo MISS',{timeoutMs:1e4});return String(r).includes("OK")}catch{return!1}}async function pn(e){Ie=e||Ie;let t=await cn("node"),r=await cn("npm"),n=await bt(e),o=t?await Ii(n):!1;return[{...vr[0],present:t},{...vr[1],present:r},{...vr[2],present:o,path:n}]}async function Ut(e){let t=await pn(e),r=t.filter(n=>!n.present).map(n=>n.id);return{ok:r.length===0,missing:r,all:t}}function qi(e){return e.map(t=>({id:t.id,label:t.label,desc:t.desc+(t.path?` \u2014 ${t.path}`:""),present:t.present,optional:!1,checked:!t.present}))}async function $i(){return qt(`#!/bin/sh
set +e
echo "[pm] detecting..."
if command -v pkg >/dev/null 2>&1; then
  echo "[pm] termux pkg"
  pkg update -y 2>&1
  pkg install -y nodejs 2>&1 || pkg install -y nodejs-lts 2>&1
elif command -v apk >/dev/null 2>&1; then
  echo "[pm] apk"
  apk update 2>&1
  apk add --no-cache nodejs npm 2>&1
elif command -v apt-get >/dev/null 2>&1; then
  echo "[pm] apt"
  apt-get update -y 2>&1
  apt-get install -y nodejs npm 2>&1
else
  echo "[pm] none found"
  exit 1
fi
node -v 2>&1
npm -v 2>&1
echo "[done] node packages"
`,{timeoutMs:0})}async function zi(e){let t=`#!/bin/sh
set +e
DIR=${_e(e)}
case "$DIR" in
  '$HOME'/*|$HOME/*) DIR="/root/.acode_liveserver/acodels" ;;
esac
if [ -z "$DIR" ] || echo "$DIR" | grep -q com.termux; then
  DIR="/root/.acode_liveserver/acodels"
fi
mkdir -p "$DIR" 2>&1
cd "$DIR" || { echo "[acodels] cd failed"; exit 1; }
if [ ! -f package.json ]; then
  cat > package.json << 'JSON'
{
  "name": "acodels",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "chokidar": "^3.5.3",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "ws": "^8.11.0"
  }
}
JSON
fi
echo "[acodels] npm install in $DIR"
npm install --omit=dev --no-audit --no-fund 2>&1
echo "[done] acodels"
`;return qt(t,{timeoutMs:0})}async function yr(e={}){var i,a,d;let t=e.baseUrl||Ie||"";if(Ie=t,gt)return un("Install already running...",2e3),!1;if(Oo()&&!e.force||!e.force&&!e.fromSettings&&vt)return!1;if(!e.force&&!e.fromSettings&&(await Ut(t)).ok)return H("dependenciesInstalled",!0),!0;(i=ft())!=null&&i.execute||un("Open Acode Terminal once, then retry Install",3500);let r=Ho({title:"Live Server Dependencies",subtitle:"Checking...",items:[],checking:!0}),n;try{n=await pn(t)}catch(u){return me({checking:!1,subtitle:"Check failed \u2014 "+((u==null?void 0:u.message)||u),items:[]}),await r,!1}let o=n.filter(u=>u.required!==!1&&!u.present).length;me({checking:!1,subtitle:o===0?"All required tools present":`${o} required missing \u2014 tick what to install`,items:qi(n)});let s=await r;if(s.action==="notnow"||s.action==="close"||s.action==="cancel")return vt=!0,!1;if(s.action==="done")return(await Ut(t)).ok;if(s.action==="install"&&((a=s.selected)!=null&&a.length)){if(gt=!0,Mo(),!((d=ft())!=null&&d.execute))return me({progressMode:!0,percent:0,info:"Executor not available",logAppend:`Open Acode Terminal once (Alpine/Termux), then open this dialog again.
`,showDone:!0}),gt=!1,!1;me({progressMode:!0,percent:5,info:"Preparing...",logAppend:"Selected: "+s.selected.join(", ")+`
`});try{let u=await bt(t);if(s.selected.includes("node")||s.selected.includes("npm")){if(me({percent:15,info:"Installing Node.js / npm...",logAppend:`
=== node / npm ===
`}),dn())return gt=!1,!1;let c=await $i();me({percent:48,logAppend:String(c||"").slice(-2500)+`
`})}if(s.selected.includes("acodels")){if(me({percent:58,info:"Installing backend modules in acodels...",logAppend:`
=== acodels @ ${u} ===
`}),dn())return gt=!1,!1;let c=await zi(u);me({percent:82,logAppend:String(c||"").slice(-3e3)+`
`})}let p=await Ut(t);return me({progressMode:!0,percent:100,info:p.ok?"Done \u2014 all required present":"Finished \u2014 still missing: "+p.missing.join(", "),showDone:!0,logAppend:p.ok?`
OK
`:`
Missing: `+p.missing.join(", ")+`
`}),H("dependenciesInstalled",p.ok),p.ok&&(vt=!0,un("Dependencies ready",2500)),p.ok}catch(u){return me({progressMode:!0,percent:100,info:"Failed",showDone:!0,logAppend:`
ERROR: `+((u==null?void 0:u.message)||u)+`
`}),!1}finally{gt=!1}}return!1}async function wr(e={}){let t=e.baseUrl||Ie||"";Ie=t;try{return!e.force&&vt||!e.force&&br&&k().dependenciesInstalled===!0?!0:(br=!0,(await Ut(t)).ok?(H("dependenciesInstalled",!0),!0):yr({...e,baseUrl:t}))}catch(r){return console.warn("[LiveServer:deps]",r),!1}}async function Ui(e){return yr({force:!0,fromSettings:!0,baseUrl:e||Ie})}async function Fi(e){return await Di("Reinstall dependencies?","Will run pkg/apk install for Node and npm install in acodels.")?(vt=!1,br=!1,yr({force:!0,fromSettings:!0,baseUrl:e||Ie})):!1}function fn(){vt=!1,br=!1}var un,Di,vt,br,gt,Ie,vr,yt=R(()=>{K();ht();Bo();un=acode.require("toast"),Di=acode.require("confirm"),vt=!1,br=!1,gt=!1,Ie="",vr=[{id:"node",label:"node",desc:"Node.js runtime",required:!0},{id:"npm",label:"npm",desc:"Package manager",required:!0},{id:"acodels",label:"acodels modules",desc:"Backend node_modules (express, ws, chokidar)",required:!0}]});var ji,Do,Io=R(()=>{ht();ji=`/**
 * acodels \u2014 Live Server + Local Reverse Proxy Node backend (ls-proxy-v9, ls-bridge-v1)
 */
const http = require('http');
const https = require('https');
const express = require('express');
const path = require('path');
const fs = require('fs');
const net = require('net');
const zlib = require('zlib');
const { URL } = require('url');
const { Server: WebSocketServer } = require('ws');
const chokidar = require('chokidar');

let BASE_DIR = null;
let jsonData = {};
let erudaEnabled = false;
let consoleType = 'suger';
let zoomEnabled = false;
let liveReloadEnabled = true;
let directoryListing = true;
let fileWatcher = null;
let connectedSockets = [];
let customHeaders = {};
let charset = 'utf-8';
let ipWhitelist = [];
let basicAuth = null;
let lastActivity = Date.now();

const args = process.argv.slice(2);
let currentPort = args[0] ? parseInt(args[0], 10) : 8080;
if (!Number.isFinite(currentPort) || currentPort < 1) currentPort = 8080;
const bindHost = args[1] || '0.0.0.0';

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen(port, bindHost === '0.0.0.0' ? undefined : bindHost);
  });
}

const webSocketScript = \`
<script>
  (function() {
    try {
      var wsUrl = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
      var ws = new WebSocket(wsUrl);
      ws.onmessage = function (event) {
        if (event.data === 'reload') location.reload();
      };
    } catch (e) {}
  })();
<\/script>\`;

const sugerScript = \`<script src="/dt/suger-dev.js"><\/script>\`;
const erudaRealScript = \`
<script src="/eruda.min.js"><\/script>
<script>if (typeof eruda !== 'undefined') eruda.init();<\/script>
\`;
const inspectorScript = \`<script src="/inspector.js"><\/script>\`;

/* ls-bridge-v1: page <-> Acode browser bridge */
const LS_BRIDGE_JS = \`
(function () {
  var P = window.__lsParent || window.parent;
  if (window.__lsBridge || !P || P === window) return;
  window.__lsBridge = 1;
  function post(m) {
    try { m.ls = 1; P.postMessage(m, '*'); } catch (e) {}
  }
  function currentHref() {
    return window.__LS_PROXY_TARGET__ || location.href;
  }
  function fav() {
    var l = document.querySelector('link[rel~="icon"]');
    if (l && l.href) return l.href;
    try { return new URL('/favicon.ico', currentHref()).href; } catch (e) { return ''; }
  }
  function meta() {
    post({ type: 'meta', href: currentHref(), title: document.title || '', favicon: fav() });
  }
  window.__lsPostMeta = meta;
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(meta, 0);
  window.addEventListener('load', meta);
  window.addEventListener('popstate', function () { setTimeout(meta, 0); });
  window.addEventListener('hashchange', function () { setTimeout(meta, 0); });
  try {
    var t = document.querySelector('title');
    if (t) new MutationObserver(meta).observe(t, { childList: true, characterData: true, subtree: true });
  } catch (e) {}

  var dtOn = false;
  function devtools(d) {
    try {
      if (d.on) {
        if (!window.suger) {
          if (!d.code) { post({ type: 'need-devtools' }); return; }
          var s = document.createElement('script');
          s.textContent = d.code;
          (document.head || document.documentElement).appendChild(s);
        }
        if (window.suger) {
          if (!window.__lsDtInit) { window.__lsDtInit = 1; window.suger.init(); }
          else window.suger.show();
          dtOn = true;
        }
      } else if (window.suger) {
        window.suger.hide();
        dtOn = false;
      }
    } catch (e) {
      post({ type: 'devtools-error', message: String(e && e.message || e) });
    }
    post({ type: 'devtools', on: dtOn });
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.ls !== 1 || e.source !== P) return;
    try {
      if (d.cmd === 'history') history.go(d.dir < 0 ? -1 : 1);
      else if (d.cmd === 'reload') location.reload();
      else if (d.cmd === 'stop') window.stop();
      else if (d.cmd === 'zoom') document.documentElement.style.zoom = String((d.pct || 100) / 100);
      else if (d.cmd === 'print') window.print();
      else if (d.cmd === 'find') post({ type: 'found', ok: !!window.find(d.q, false, !!d.back, true, false, false, false) });
      else if (d.cmd === 'devtools') devtools(d);
      else if (d.cmd === 'ping') meta();
    } catch (err) {}
  });
})();
\`;

const lsBridgeScript = '<script src="/__ls/bridge.js"><\/script>';
/* pinch-zoom engine is embedded: only index.js is written to Alpine, so a separate zoom-handler.js file never existed there */
const LS_ZOOM_JS = "class ZoomHandler {\\n  constructor(element) {\\n    this.element = element;\\n    if (!this.element) return;\\n    \\n    this.scroller = this.element.parentNode; \\n\\n    this.finalScale = 1;\\n    this.offsetX = 0;\\n    this.offsetY = 0;\\n    \\n    this.tempScale = 1;\\n    this.tempOffsetX = 0;\\n    this.tempOffsetY = 0;\\n\\n    this.panning = false;\\n    this.isPanningContent = false;\\n    \\n    this.initialDistance = 0;\\n    this.panStart = null;\\n    this.pageOrigin = null; \\n\\n    this.handleTouchStart = this.handleTouchStart.bind(this);\\n    this.handleTouchMove = this.handleTouchMove.bind(this);\\n    this.handleTouchEnd = this.handleTouchEnd.bind(this);\\n    this.handleDoubleTap = this.handleDoubleTap.bind(this);\\n\\n    this.setupZoomEvents();\\n  }\\n\\n  setupZoomEvents() {\\n    const updateTouchAction = () => {\\n      this.element.style.touchAction = this.finalScale > 1 ? 'none' : 'auto';\\n    };\\n    updateTouchAction();\\n    this.element.style.transformOrigin = '0 0';\\n\\n    this.element.addEventListener('touchstart', this.handleTouchStart);\\n    this.element.addEventListener('touchmove', this.handleTouchMove);\\n    this.element.addEventListener('touchend', (e) => {\\n      this.handleTouchEnd(e);\\n      updateTouchAction(); \\n    });\\n    this.element.addEventListener('touchcancel', this.handleTouchEnd);\\n    this.element.addEventListener('dblclick', this.handleDoubleTap);\\n  }\\n\\n  destroy() {\\n    this.element.removeEventListener('touchstart', this.handleTouchStart);\\n    this.element.removeEventListener('touchmove', this.handleTouchMove);\\n    this.element.removeEventListener('touchend', this.handleTouchEnd);\\n    this.element.removeEventListener('touchcancel', this.handleTouchEnd);\\n    this.element.removeEventListener('dblclick', this.handleDoubleTap);\\n  }\\n  \\n  getDistance(p1, p2) {\\n    const dx = p1.clientX - p2.clientX;\\n    const dy = p1.clientY - p2.clientY;\\n    return Math.sqrt(dx * dx + dy * dy);\\n  }\\n  \\n  getPageCoordinates(e_touches) {\\n    if (!this.scroller || !this.scroller.getBoundingClientRect) {\\n      this.scroller = this.element.parentNode;\\n      \\n      if (!this.scroller || !this.scroller.getBoundingClientRect) {\\n        console.error(\\"ZoomHandler Error: Cannot find scroller parent element.\\");\\n        return null; \\n      }\\n    }\\n\\n    const scrollerRect = this.scroller.getBoundingClientRect();\\n    const scrollLeft = this.scroller.scrollLeft;\\n    const scrollTop = this.scroller.scrollTop;\\n\\n    const screenX = (e_touches[0].clientX + (e_touches[1]?.clientX || e_touches[0].clientX)) / e_touches.length;\\n    const screenY = (e_touches[0].clientY + (e_touches[1]?.clientY || e_touches[0].clientY)) / e_touches.length;\\n\\n    const x_in_scroller_viewport = screenX - scrollerRect.left;\\n    const y_in_scroller_viewport = screenY - scrollerRect.top;\\n\\n    return {\\n      x: x_in_scroller_viewport + scrollLeft,\\n      y: y_in_scroller_viewport + scrollTop\\n    };\\n  }\\n\\n  handleTouchStart(e) {\\n    if (e.touches.length === 2) {\\n      e.preventDefault();\\n      \\n      this.pageOrigin = this.getPageCoordinates(e.touches);\\n      if (!this.pageOrigin) return; \\n\\n      this.panning = true; \\n      this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);\\n      \\n    } else if (e.touches.length === 1 && this.finalScale > 1) {\\n      const trueHit = this.getPageCoordinates(e.touches);\\n      if (!trueHit) return; \\n\\n      this.isPanningContent = true;\\n      this.panStart = {\\n        x: trueHit.x - this.offsetX,\\n        y: trueHit.y - this.offsetY,\\n      };\\n    }\\n  }\\n\\n  handleTouchMove(e) {\\n    const element = e.currentTarget;\\n\\n    if (this.panning && e.touches.length === 2) {\\n      e.preventDefault();\\n      \\n      const currentDistance = this.getDistance(e.touches[0], e.touches[1]);\\n      const gestureRatio = currentDistance / this.initialDistance;\\n      \\n      this.tempScale = this.finalScale * gestureRatio;\\n      this.tempScale = Math.max(0.5, Math.min(this.tempScale, 5));\\n\\n      const scaleRatio = this.tempScale / this.finalScale;\\n      this.tempOffsetX = this.pageOrigin.x * (1 - scaleRatio) + this.offsetX * scaleRatio;\\n      this.tempOffsetY = this.pageOrigin.y * (1 - scaleRatio) + this.offsetY * scaleRatio;\\n\\n      element.style.transform = \`translate(\${this.tempOffsetX}px, \${this.tempOffsetY}px) scale(\${this.tempScale})\`;\\n    }\\n\\n    else if (this.isPanningContent && e.touches.length === 1 && this.finalScale > 1) {\\n      e.preventDefault();\\n      \\n      const trueHit = this.getPageCoordinates(e.touches);\\n      if (!trueHit) return; \\n      \\n      this.tempOffsetX = trueHit.x - this.panStart.x;\\n      this.tempOffsetY = trueHit.y - this.panStart.y;\\n      \\n      element.style.transform = \`translate(\${this.tempOffsetX}px, \${this.tempOffsetY}px) scale(\${this.finalScale})\`;\\n    }\\n  }\\n  \\n  handleTouchEnd(e) {\\n    if (this.panning) {\\n      this.panning = false;\\n      this.finalScale = this.tempScale;\\n      this.offsetX = this.tempOffsetX;\\n      this.offsetY = this.tempOffsetY;\\n      this.pageOrigin = null; \\n    }\\n    if (this.isPanningContent) {\\n      this.isPanningContent = false;\\n      this.offsetX = this.tempOffsetX;\\n      this.offsetY = this.tempOffsetY;\\n    }\\n  }\\n\\n  handleDoubleTap(e) {\\n    const element = e.currentTarget;\\n    this.finalScale = 1;\\n    this.tempScale = 1;\\n    this.offsetX = 0;\\n    this.offsetY = 0;\\n    this.tempOffsetX = 0;\\n    this.tempOffsetY = 0;\\n    \\n    element.style.transition = 'transform 0.25s ease';\\n    element.style.transformOrigin = '0 0';\\n    element.style.transform = 'translate(0,0) scale(1)';\\n    setTimeout(() => {\\n      element.style.transition = '';\\n    }, 300);\\n  }\\n}\\n";

const zoomScript = \`
<script src="/zoom-handler.js"><\/script>
<script>try { new ZoomHandler(document.body); } catch (e) {}<\/script>\`;

const app = express();

// Capture raw body for /__proxy while still parsing JSON for /setup
app.use((req, res, next) => {
  if (req.path === '/__proxy' || req.path === '/_proxy') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      req.rawBody = chunks.length ? Buffer.concat(chunks) : null;
      next();
    });
    return;
  }
  express.json({ limit: '2mb' })(req, res, next);
});

// Activity + security middleware
app.use((req, res, next) => {
  lastActivity = Date.now();
  if (ipWhitelist.length) {
    const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    if (!ipWhitelist.includes(ip) && ip !== '127.0.0.1' && ip !== '::1') {
      return res.status(403).send('Forbidden');
    }
  }
  if (basicAuth && basicAuth.user && !req.path.startsWith('/__proxy')) {
    const hdr = req.headers.authorization || '';
    const ok = (() => {
      if (!hdr.startsWith('Basic ')) return false;
      try {
        const decoded = Buffer.from(hdr.slice(6), 'base64').toString('utf8');
        const i = decoded.indexOf(':');
        const u = decoded.slice(0, i);
        const p = decoded.slice(i + 1);
        return u === basicAuth.user && p === (basicAuth.pass || '');
      } catch (_) {
        return false;
      }
    })();
    if (!ok) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Live Server"');
      return res.status(401).send('Unauthorized');
    }
  }
  Object.keys(customHeaders).forEach((k) => {
    try { res.setHeader(k, customHeaders[k]); } catch (_) {}
  });
  next();
});

// CORS
app.use((req, res, next) => {
  if (jsonData.enableCors !== false) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.get('/check', (req, res) => {
  res.status(200).json({
    message: 'Ready',
    key: 'AcodeLiveServer_NodeJS',
    port: currentPort,
    root: BASE_DIR,
    fileName: jsonData.fileName || null,
    liveReload: liveReloadEnabled,
    proxy: true,
    proxyVersion: 5,
  });
});

app.get('/status', (req, res) => {
  res.json({
    port: currentPort,
    bind: bindHost,
    root: BASE_DIR,
    fileName: jsonData.fileName || null,
    liveReload: liveReloadEnabled,
    directoryListing,
    clients: connectedSockets.length,
    lastActivity,
    uptime: process.uptime(),
    proxy: true,
    proxyVersion: 3,
  });
});

app.post('/reload', (req, res) => {
  broadcastReload();
  res.json({ ok: true, clients: connectedSockets.length });
});

app.patch('/setup', (req, res) => {
  const data = req.body || {};
  if (!data.path) return res.status(400).json({ error: 'Missing path' });

  BASE_DIR = data.path;
  jsonData = data;
  erudaEnabled = data.eruda === true;
  if (data.consoleType) consoleType = data.consoleType;
  zoomEnabled = data.zoom === true;
  liveReloadEnabled = data.liveReload !== false;
  directoryListing = data.directoryListing !== false;

  if (typeof data.charset === 'string' && data.charset) charset = data.charset;
  customHeaders = {};
  if (data.customHeaders && typeof data.customHeaders === 'object') {
    customHeaders = data.customHeaders;
  } else if (typeof data.customHeaders === 'string') {
    String(data.customHeaders).split('\\n').forEach((line) => {
      const i = line.indexOf(':');
      if (i > 0) {
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim();
        if (k) customHeaders[k] = v;
      }
    });
  }

  ipWhitelist = [];
  if (data.ipWhitelist) {
    const raw = Array.isArray(data.ipWhitelist)
      ? data.ipWhitelist
      : String(data.ipWhitelist).split(/[\\n,]+/);
    ipWhitelist = raw.map((s) => String(s).trim()).filter(Boolean);
  }

  if (data.basicAuthUser) {
    basicAuth = { user: String(data.basicAuthUser), pass: String(data.basicAuthPass || '') };
  } else {
    basicAuth = null;
  }

  if (liveReloadEnabled) startFileWatcher(res);
  else {
    if (fileWatcher) {
      try { fileWatcher.close(); } catch (_) {}
      fileWatcher = null;
    }
    res.status(201).json({ message: 'OK', liveReload: false });
  }
});

app.get('/__ls/bridge.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(LS_BRIDGE_JS);
});

// ============================================================================
// LOCAL REVERSE PROXY (/__proxy?url=...)
// ============================================================================

function buildProxyRuntimeScript(targetUrl) {
  let origin = '';
  try { origin = new URL(targetUrl).origin; } catch (_) {}
  return \`<script>
(function() {
  window.__LS_PROXY_TARGET__ = \${JSON.stringify(targetUrl)};
  window.__LS_PROXY_ORIGIN__ = \${JSON.stringify(origin)};
  var proxyBase = location.origin + '/__proxy?url=';

  function unwrapUrl(u) {
    var s = String(u || '');
    var idx = s.indexOf('/__proxy?url=');
    if (idx !== -1) {
      try {
        return decodeURIComponent(s.slice(idx + '/__proxy?url='.length).split('&')[0]);
      } catch (e) {}
    }
    return s;
  }

  function wrapUrl(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    var s = raw.trim();
    if (!s || s.charAt(0) === '#' || s.indexOf('data:') === 0 || s.indexOf('blob:') === 0 || s.indexOf('javascript:') === 0 || s.indexOf('mailto:') === 0 || s.indexOf('tel:') === 0) {
      return raw;
    }
    if (s.indexOf('/__proxy?url=') !== -1 || s.indexOf('/__ls/') === 0 || s.indexOf('/dt/') === 0) {
      return raw;
    }
    try {
      var resolved = new URL(s, window.__LS_PROXY_TARGET__);
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        return proxyBase + encodeURIComponent(resolved.href);
      }
    } catch (e) {}
    return raw;
  }

  // Prevent proxied Service Workers from hijacking 127.0.0.1
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = function() {
        return Promise.resolve({ scope: '/' });
      };
    }
  } catch (e) {}

  // Patch history.pushState / replaceState so SPAs don't throw cross-origin SecurityError
  try {
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function(state, title, url) {
      if (url != null) {
        var realTarget = unwrapUrl(String(url));
        try { realTarget = new URL(realTarget, window.__LS_PROXY_TARGET__).href; } catch (e) {}
        window.__LS_PROXY_TARGET__ = realTarget;
        url = proxyBase + encodeURIComponent(realTarget);
      }
      var r = origPush.call(this, state, title, url);
      if (window.__lsPostMeta) setTimeout(window.__lsPostMeta, 0);
      return r;
    };
    history.replaceState = function(state, title, url) {
      if (url != null) {
        var realTarget = unwrapUrl(String(url));
        try { realTarget = new URL(realTarget, window.__LS_PROXY_TARGET__).href; } catch (e) {}
        window.__LS_PROXY_TARGET__ = realTarget;
        url = proxyBase + encodeURIComponent(realTarget);
      }
      var r = origReplace.call(this, state, title, url);
      if (window.__lsPostMeta) setTimeout(window.__lsPostMeta, 0);
      return r;
    };
  } catch (e) {}

  // Patch fetch
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        input = wrapUrl(input);
      } else if (input && typeof input.url === 'string') {
        try {
          input = new Request(wrapUrl(input.url), input);
        } catch (e) {}
      }
      return origFetch.call(this, input, init);
    };
  }

  // Patch XMLHttpRequest
  if (window.XMLHttpRequest) {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      var args = Array.prototype.slice.call(arguments);
      if (typeof url === 'string') args[1] = wrapUrl(url);
      return origOpen.apply(this, args);
    };
  }

  // Patch dynamic DOM element URL setters (fixes dynamically injected CSS <link> and <script>)
  function patchProp(Proto, prop) {
    if (!Proto) return;
    var desc = Object.getOwnPropertyDescriptor(Proto, prop);
    if (!desc || !desc.set) return;
    Object.defineProperty(Proto, prop, {
      get: desc.get,
      set: function(val) {
        return desc.set.call(this, typeof val === 'string' ? wrapUrl(val) : val);
      },
      configurable: true
    });
  }
  try {
    patchProp(window.HTMLScriptElement && HTMLScriptElement.prototype, 'src');
    patchProp(window.HTMLLinkElement && HTMLLinkElement.prototype, 'href');
    patchProp(window.HTMLImageElement && HTMLImageElement.prototype, 'src');
    patchProp(window.HTMLIFrameElement && HTMLIFrameElement.prototype, 'src');
    var origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, val) {
      var lower = String(name || '').toLowerCase();
      if ((lower === 'src' || lower === 'href' || lower === 'action') && typeof val === 'string') {
        val = wrapUrl(val);
      }
      return origSetAttr.call(this, name, val);
    };
  } catch (e) {}

  // Intercept anchor clicks
  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
    e.preventDefault();
    location.href = wrapUrl(href);
  }, true);

  // Helper to submit forms cleanly without losing ?url= on GET forms (fixes Google Search 404)
  function submitProxiedForm(form) {
    var rawAction = form.getAttribute('action') || window.__LS_PROXY_TARGET__;
    var targetAction = unwrapUrl(rawAction);
    try {
      targetAction = new URL(targetAction, window.__LS_PROXY_TARGET__).href;
    } catch (err) {}

    var method = (form.getAttribute('method') || form.method || 'GET').toUpperCase();
    if (method === 'GET') {
      var u = new URL(targetAction);
      var fd = new FormData(form);
      fd.forEach(function(v, k) {
        if (k === '__ls_u') return;
        if (typeof v === 'string') u.searchParams.append(k, v);
      });
      location.href = proxyBase + encodeURIComponent(u.href);
      return true;
    } else {
      origSetAttr.call(form, 'action', proxyBase + encodeURIComponent(targetAction));
      return false;
    }
  }

  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    if (submitProxiedForm(form)) {
      e.preventDefault();
    }
  }, true);

  // Also intercept programmatic form.submit() calls (used by Google Search)
  try {
    var origFormSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
      if (submitProxiedForm(this)) return;
      return origFormSubmit.apply(this, arguments);
    };
  } catch (e) {}

  window.open = function(url) {
    if (url) location.href = wrapUrl(url);
    return window;
  };
})();
<\/script>\`;
}

function rewriteCssForProxy(css, targetUrl) {
  let out = String(css || '');
  // Rewrite url(...)
  out = out.replace(/url\\(\\s*(["']?)([^"')]+)\\1\\s*\\)/gi, (match, quote, raw) => {
    const s = String(raw || '').trim();
    if (
      !s ||
      s.startsWith('data:') ||
      s.startsWith('#') ||
      s.startsWith('blob:') ||
      s.includes('/__proxy?url=')
    ) {
      return match;
    }
    try {
      const parsed = new URL(s, targetUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return 'url(' + quote + '/__proxy?url=' + encodeURIComponent(parsed.href) + quote + ')';
      }
    } catch (_) {}
    return match;
  });

  // Rewrite @import "..." or @import '...'
  out = out.replace(/@import\\s+(["'])([^"']+)\\1/gi, (match, quote, raw) => {
    const s = String(raw || '').trim();
    if (!s || s.includes('/__proxy?url=')) return match;
    try {
      const parsed = new URL(s, targetUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return '@import ' + quote + '/__proxy?url=' + encodeURIComponent(parsed.href) + quote;
      }
    } catch (_) {}
    return match;
  });

  return out;
}

function rewriteHtmlForProxy(html, targetUrl) {
  const toProxy = (raw) => {
    const s = String(raw || '').trim();
    if (
      !s ||
      s.startsWith('#') ||
      s.startsWith('data:') ||
      s.startsWith('blob:') ||
      s.startsWith('javascript:') ||
      s.startsWith('mailto:') ||
      s.startsWith('tel:') ||
      s.includes('/__proxy?url=')
    ) {
      return raw;
    }
    try {
      const parsed = new URL(s, targetUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return '/__proxy?url=' + encodeURIComponent(parsed.href);
      }
    } catch (_) {}
    return raw;
  };

  // Rewrite href, src, action, poster attributes
  let out = String(html || '').replace(
    /\\b(href|src|action|poster)\\s*=\\s*(["'])([^"']+)\\2/gi,
    (match, attr, quote, val) => {
      return attr + '=' + quote + toProxy(val) + quote;
    }
  );

  // Rewrite srcset / imagesrcset
  out = out.replace(
    /\\b(srcset|imagesrcset)\\s*=\\s*(["'])([^"']+)\\2/gi,
    (match, attr, quote, val) => {
      const rewrittenList = val
        .split(',')
        .map((part) => {
          const trimmed = part.trim();
          if (!trimmed) return part;
          const spaceIdx = trimmed.search(/\\s/);
          if (spaceIdx === -1) return toProxy(trimmed);
          const u = trimmed.slice(0, spaceIdx);
          const descriptor = trimmed.slice(spaceIdx);
          return toProxy(u) + descriptor;
        })
        .join(', ');
      return attr + '=' + quote + rewrittenList + quote;
    }
  );

  // GET forms (Google search...): a native submit drops the ?url= of the action and the Referer
  // is often origin-only, so carry the real target inside the form as a hidden field.
  out = out.replace(/<form\\b[^>]*>/gi, (tag) => {
    if (/\\bmethod\\s*=\\s*["']?\\s*post/i.test(tag)) return tag;
    let target = targetUrl;
    const m = tag.match(/\\baction\\s*=\\s*(["'])([^"']*)\\1/i);
    if (m) {
      let a = m[2].replace(/&amp;/g, '&');
      const k = a.indexOf('/__proxy?url=');
      try {
        if (k !== -1) a = decodeURIComponent(a.slice(k + '/__proxy?url='.length).split('&')[0]);
        target = new URL(a || targetUrl, targetUrl).href;
      } catch (_) {}
    }
    let fixed = tag;
    if (!m) fixed = tag.replace(/^<form/i, '<form action="/__proxy?url=' + encodeURIComponent(target) + '"');
    const safe = String(target).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return fixed + '<input type="hidden" name="__ls_u" value="' + safe + '">';
  });

  // Rewrite inline <style> blocks
  out = out.replace(
    /(<style[^>]*>)([\\s\\S]*?)(<\\/style>)/gi,
    (match, openTag, cssBody, closeTag) => openTag + rewriteCssForProxy(cssBody, targetUrl) + closeTag
  );

  // Strip SRI integrity, CSP nonces, and CSP meta tags
  out = out.replace(/\\s+(?:integrity|nonce)\\s*=\\s*(["'])[^"']*\\1/gi, '');
  out = out.replace(/<meta[^>]+http-equiv\\s*=\\s*["']?Content-Security-Policy["']?[^>]*>/gi, '');

  // Rewrite meta refresh redirects
  out = out.replace(
    /(<meta[^>]+http-equiv\\s*=\\s*["']?refresh["']?[^>]+content\\s*=\\s*["'][^"']*?url=)([^"'>]+)(["'][^>]*>)/gi,
    (match, prefix, urlVal, suffix) => prefix + toProxy(urlVal.trim()) + suffix
  );

  const injectedHead = buildProxyRuntimeScript(targetUrl) + lsBridgeScript;

  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => m + '\\n' + injectedHead);
  } else if (/<html[^>]*>/i.test(out)) {
    out = out.replace(/<html[^>]*>/i, (m) => m + '<head>' + injectedHead + '</head>');
  } else {
    out = injectedHead + '\\n' + out;
  }

  return out;
}

function decompressBuffer(buf, encoding) {
  const enc = String(encoding || '').toLowerCase();
  try {
    if (enc.includes('gzip')) return zlib.gunzipSync(buf);
    if (enc.includes('br') && typeof zlib.brotliDecompressSync === 'function') {
      return zlib.brotliDecompressSync(buf);
    }
    if (enc.includes('deflate')) return zlib.inflateSync(buf);
  } catch (_) {}
  return buf;
}

function fetchUpstream(targetUrl, method, reqHeaders, bodyBuf, redirectsLeft = 6) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch (e) {
      return reject(new Error('Invalid target URL'));
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return reject(new Error('Only HTTP/HTTPS URLs are supported'));
    }

    const client = parsed.protocol === 'https:' ? https : http;
    const upperMethod = (method || 'GET').toUpperCase();
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      'Accept':
        reqHeaders['accept'] ||
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': reqHeaders['accept-language'] || 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': parsed.origin + '/',
    };
    if (upperMethod !== 'GET' && upperMethod !== 'HEAD') {
      headers['Origin'] = parsed.origin;
    }
    if (reqHeaders['content-type']) headers['Content-Type'] = reqHeaders['content-type'];
    if (reqHeaders['cookie']) headers['Cookie'] = reqHeaders['cookie'];
    if (bodyBuf && bodyBuf.length) headers['Content-Length'] = bodyBuf.length;

    const upstreamReq = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: upperMethod,
        headers,
        timeout: 20000,
        rejectUnauthorized: false,
      },
      (upstreamRes) => {
        const status = upstreamRes.statusCode || 200;
        const loc = upstreamRes.headers['location'];
        if ([301, 302, 303, 307, 308].includes(status) && loc && redirectsLeft > 0) {
          upstreamRes.resume();
          const nextUrl = new URL(loc, parsed.href).href;
          const nextMethod =
            status === 303 || ((status === 301 || status === 302) && upperMethod === 'POST')
              ? 'GET'
              : upperMethod;
          return resolve(
            fetchUpstream(
              nextUrl,
              nextMethod,
              reqHeaders,
              nextMethod === 'GET' ? null : bodyBuf,
              redirectsLeft - 1
            )
          );
        }

        const chunks = [];
        upstreamRes.on('data', (c) => chunks.push(c));
        upstreamRes.on('end', () => {
          resolve({
            status,
            headers: upstreamRes.headers,
            body: Buffer.concat(chunks),
            finalUrl: parsed.href,
          });
        });
      }
    );

    upstreamReq.on('timeout', () => {
      upstreamReq.destroy(new Error('Upstream request timed out'));
    });
    upstreamReq.on('error', reject);
    if (bodyBuf && bodyBuf.length) upstreamReq.write(bodyBuf);
    upstreamReq.end();
  });
}

async function handleProxyRequest(req, res, targetUrl) {
  try {
    const bodyBuf = req.rawBody || null;
    const result = await fetchUpstream(targetUrl, req.method, req.headers, bodyBuf);

    const blockedHeaders = new Set([
      'x-frame-options',
      'content-security-policy',
      'content-security-policy-report-only',
      'cross-origin-opener-policy',
      'cross-origin-embedder-policy',
      'cross-origin-resource-policy',
      'content-length',
      'content-encoding',
      'transfer-encoding',
      'connection',
    ]);

    Object.entries(result.headers || {}).forEach(([k, v]) => {
      const lower = k.toLowerCase();
      if (blockedHeaders.has(lower)) return;
      if (lower === 'set-cookie' && Array.isArray(v)) {
        const cleanCookies = v.map((c) =>
          String(c)
            .replace(/;\\s*Domain=[^;]+/gi, '')
            .replace(/;\\s*Secure/gi, '')
            .replace(/SameSite=None/gi, 'SameSite=Lax')
        );
        res.setHeader('Set-Cookie', cleanCookies);
        return;
      }
      try {
        res.setHeader(k, v);
      } catch (_) {}
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-LS-Final-Url', result.finalUrl);

    const contentType = String(result.headers['content-type'] || '');
    const rawBuf = decompressBuffer(result.body, result.headers['content-encoding']);

    if (/text\\/html|application\\/xhtml\\+xml/i.test(contentType)) {
      const htmlText = rawBuf.toString('utf8');
      const rewritten = rewriteHtmlForProxy(htmlText, result.finalUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(result.status).send(rewritten);
    }

    if (/text\\/css/i.test(contentType)) {
      const cssText = rawBuf.toString('utf8');
      const rewrittenCss = rewriteCssForProxy(cssText, result.finalUrl);
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      return res.status(result.status).send(rewrittenCss);
    }

    return res.status(result.status).send(rawBuf);
  } catch (err) {
    const safeUrl = String(targetUrl || '').replace(/</g, '<');
    const safeMsg = String((err && err.message) || err).replace(/</g, '<');
    res.status(502).setHeader('Content-Type', 'text/html; charset=utf-8').send(\`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        body { font-family: system-ui, sans-serif; background: #1e1e1e; color: #e8eaed; padding: 28px 18px; text-align: center; }
        .card { max-width: 420px; margin: 24px auto; padding: 20px; border-radius: 8px; background: #292a2d; border: 1px solid #3c4043; }
        h3 { margin: 0 0 8px; color: #f87171; }
        p { font-size: 13px; color: #9aa0a6; word-break: break-all; }
        button { margin-top: 12px; padding: 8px 16px; border: 0; border-radius: 5px; background: #22c55e; color: #052e16; font-weight: 600; cursor: pointer; }
      </style></head>
      <body>
        <div class="card">
          <h3>Proxy Could Not Load Page</h3>
          <p>\${safeMsg}</p>
          <p>\${safeUrl}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      </body></html>
    \`);
  }
}

app.all(['/__proxy', '/_proxy'], (req, res) => {
  if (req.query.url) {
    const target = String(req.query.url);
        return handleProxyRequest(req, res, target);
  }
  // GET form submitted natively: real target travels in the hidden __ls_u field
  if (req.query.__ls_u) {
    try {
      const u = new URL(String(req.query.__ls_u));
      Object.keys(req.query || {}).forEach((k) => {
        if (k === '__ls_u') return;
        const v = req.query[k];
        u.searchParams.delete(k);
        (Array.isArray(v) ? v : [v]).forEach((x) => {
          if (typeof x === 'string') u.searchParams.append(k, x);
        });
      });
      return handleProxyRequest(req, res, u.href);
    } catch (_) {}
  }
  // Fallback when a GET form (like Google Search) strips ?url= and submits ?q=... directly to /__proxy
  const ref = req.headers.referer || '';
  const idx = ref.indexOf('/__proxy?url=');
  if (idx !== -1) {
    try {
      const encodedBase = ref.slice(idx + '/__proxy?url='.length).split('&')[0];
      const baseTarget = decodeURIComponent(encodedBase);
      const u = new URL('/search', baseTarget);
      Object.entries(req.query || {}).forEach(([k, v]) => {
        if (typeof v === 'string') u.searchParams.set(k, v);
      });
      return handleProxyRequest(req, res, u.href);
    } catch (_) {}
  }
  return res.status(400).send('Missing ?url=');
});

// Referer-based fallback for root-relative assets/APIs requested by proxied pages
app.use((req, res, next) => {
  const ref = req.headers.referer || '';
  const idx = ref.indexOf('/__proxy?url=');
  if (
    idx !== -1 &&
    !req.path.startsWith('/__ls/') &&
    !req.path.startsWith('/dt/') &&
    req.path !== '/__proxy' &&
    req.path !== '/_proxy'
  ) {
    try {
      const encodedBase = ref.slice(idx + '/__proxy?url='.length).split('&')[0];
      const baseTarget = decodeURIComponent(encodedBase);
      const resolved = new URL(req.originalUrl, baseTarget).href;
      return handleProxyRequest(req, res, resolved);
    } catch (_) {}
  }
  next();
});

// ============================================================================
// LOCAL STATIC LIVE SERVER
// ============================================================================

app.get('/dt/suger-dev.js', (req, res) => {
  const p = path.join(__dirname, 'suger-dev.js');
  if (fs.existsSync(p)) res.sendFile(p);
  else res.status(404).end();
});
app.get('/zoom-handler.js', (req, res) => {
  res.type('application/javascript').set('Cache-Control', 'no-store').send(LS_ZOOM_JS);
});
app.get('/inspector.js', (req, res) => {
  const p = path.join(__dirname, 'inspector.js');
  if (fs.existsSync(p)) res.sendFile(p);
  else res.status(404).end();
});
app.get('/eruda.min.js', (req, res) => {
  const erudaPath = path.join(__dirname, 'eruda.min.js');
  if (fs.existsSync(erudaPath)) res.sendFile(erudaPath);
  else res.status(404).send('Eruda not found');
});

function injectHtml(html) {
  let injected = html;
  if (liveReloadEnabled) {
    injected = injected.replace(/<\\/body>/i, webSocketScript + '</body>');
    if (!/<\\/body>/i.test(html)) injected = injected + webSocketScript;
  }
  if (erudaEnabled) {
    const extra =
      consoleType === 'eruda' ? erudaRealScript + '\\n' + inspectorScript : sugerScript + '\\n' + inspectorScript;
    injected = injected.replace(/<\\/body>/i, extra + '</body>');
  }
  if (zoomEnabled) {
    injected = injected.replace(/<\\/body>/i, zoomScript + '</body>');
  }
  if (/<\\/body>/i.test(injected)) injected = injected.replace(/<\\/body>/i, lsBridgeScript + '</body>');
  else injected += lsBridgeScript;
  return injected;
}

function sendHtmlFile(res, fullPath) {
  fs.readFile(fullPath, 'utf8', (err, html_content) => {
    if (err) return res.status(404).send('Not found');
    res.setHeader('Content-Type', 'text/html; charset=' + charset);
    res.send(injectHtml(html_content));
  });
}


function safeJoinRoot(root, reqPath) {
  const base = path.resolve(String(root || '/'));
  let rel = decodeURIComponent(String(reqPath || ''));
  rel = rel.split('?')[0].split('#')[0];
  // CRITICAL: path.join(root, '/T.html') => '/T.html' on Node \u2014 strip leading slashes
  while (rel.charAt(0) === '/') rel = rel.slice(1);
  if (!rel || rel === '.') return base;
  const full = path.resolve(base, rel);
  const prefix = base.endsWith(path.sep) ? base : base + path.sep;
  if (full !== base && !full.startsWith(prefix)) return null;
  return full;
}

app.get('/', (req, res) => {
  if (!BASE_DIR) return res.status(400).send('Not configured. PATCH /setup first.');
  const fileName = String(jsonData.fileName || 'index.html').split('/').filter(Boolean).join('/');
  const fullPath = safeJoinRoot(BASE_DIR, fileName);
  if (fullPath && fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    return sendHtmlFile(res, fullPath);
  }
  const indexPath = safeJoinRoot(BASE_DIR, 'index.html');
  if (indexPath && fs.existsSync(indexPath)) return sendHtmlFile(res, indexPath);
  if (directoryListing) return listDir(res, BASE_DIR, '/');
  return res.status(404).send('No index.html in ' + BASE_DIR + ' (wanted ' + fileName + ')');
});

function listDir(res, dirPath, urlPath) {
  fs.readdir(dirPath, { withFileTypes: true }, (err, entries) => {
    if (err) return res.status(500).send('Cannot list directory');
    const rows = entries
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => {
        const href = path.posix.join(urlPath, e.name) + (e.isDirectory() ? '/' : '');
        return \`<li><a href="\${href}">\${e.name}\${e.isDirectory() ? '/' : ''}</a></li>\`;
      })
      .join('\\n');
    res.setHeader('Content-Type', 'text/html; charset=' + charset);
    res.send(
      \`<!DOCTYPE html><html><head><meta charset="\${charset}"/><title>Index of \${urlPath}</title></head><body><h1>Index of \${urlPath}</h1><ul>\${rows}</ul></body></html>\`
    );
  });
}

app.use((req, res, next) => {
  if (!BASE_DIR) return next();
  const rel = decodeURIComponent(req.path || '/');
  if (rel === '/' || rel === '') return next();
  const full = safeJoinRoot(BASE_DIR, rel);
  if (!full) return res.status(403).send('Forbidden path');
  fs.stat(full, (err, st) => {
    if (err) {
      return res.status(404).send('Cannot get ' + rel.replace(/^[/]+/, '') + ' (root ' + BASE_DIR + ')');
    }
    if (st.isDirectory()) {
      if (directoryListing) return listDir(res, full, rel.endsWith('/') ? rel : rel + '/');
      const idx = safeJoinRoot(full, 'index.html');
      if (idx && fs.existsSync(idx)) return sendHtmlFile(res, idx);
      return res.status(404).end();
    }
    if (/.html?$/i.test(full)) return sendHtmlFile(res, full);
    res.sendFile(full, (e) => {
      if (e) res.status(404).send('Cannot get ' + rel.replace(/^[/]+/, ''));
    });
  });
});

app.use(express.static(__dirname));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  connectedSockets.push(ws);
  lastActivity = Date.now();
  ws.on('close', () => {
    connectedSockets = connectedSockets.filter((s) => s !== ws);
  });
});

function broadcastReload() {
  for (const ws of connectedSockets) {
    try {
      ws.send('reload');
    } catch (_) {}
  }
}

function startFileWatcher(res) {
  if (fileWatcher) {
    try { fileWatcher.close(); } catch (_) {}
    fileWatcher = null;
  }
  if (!BASE_DIR || !liveReloadEnabled) {
    if (res) res.status(201).json({ message: 'OK' });
    return;
  }
  fileWatcher = chokidar.watch(BASE_DIR, {
    ignored: /(^|[\\/\\\\])\\.\\./,
    persistent: true,
    ignoreInitial: true,
  });
  fileWatcher.on('change', () => {
    lastActivity = Date.now();
    broadcastReload();
  });
  let responseSent = false;
  const done = (code, body) => {
    if (responseSent || !res) return;
    responseSent = true;
    res.status(code).json(body);
  };
  fileWatcher.on('ready', () => done(201, { message: 'OK', liveReload: true }));
  fileWatcher.on('error', (error) => {
    console.error('Watcher Error:', error.message);
    done(500, { error: error.message });
  });
  setTimeout(() => done(201, { message: 'OK', liveReload: true }), 3000);
}

async function main() {
  const ok = await isPortAvailable(currentPort);
  if (!ok) {
    console.error('[acodels] port busy', currentPort);
    process.exit(1);
  }
  server.listen(currentPort, bindHost, () => {
    console.log('[acodels] listening', bindHost + ':' + currentPort);
  });
}

main();
`,Do=ln(ji)});async function hn(e){let t=e||"/root/.acode_liveserver/acodels";try{let o=await ee("D="+_e(t)+'; if [ ! -f "$D/index.js" ]; then echo NEED; exit 0; fi; if grep -q WebSocket "$D/index.js" 2>/dev/null && grep -q chokidar "$D/index.js" 2>/dev/null && grep -q ls-proxy-v9 "$D/index.js" 2>/dev/null; then echo FULL; else echo NEED; fi',{timeoutMs:8e3});if(String(o).includes("FULL")&&!String(o).includes("NEED"))return!1}catch(o){console.warn("[LiveServer] index check",(o==null?void 0:o.message)||o)}let r=Do,n=["#!/bin/sh","set -e","D="+t.replace(/'/g,""),'mkdir -p "$D"',"echo '"+r+`' | base64 -d > "$D/index.js"`,"echo RESTORED"].join(`
`);try{return await qt(n,{timeoutMs:0}),!0}catch(o){return console.warn("[LiveServer] restore failed",(o==null?void 0:o.message)||o),!1}}var qo=R(()=>{ht();Io()});function Ni(e){return/\.html?$/i.test(String(e||""))}function Te(e){return!!(e&&Ni(e.filename||e.name))}function G(){try{return(editorManager==null?void 0:editorManager.activeFile)||null}catch{return null}}function mn(e){try{return decodeURIComponent(e)}catch{return e}}function $o(e){let t=String(e||""),r=t.indexOf(":");if(r<0)return t.startsWith("/")?t:null;let n=t.slice(0,r),o=t.slice(r+1).replace(/^\/+/,""),s=o?"/"+o:"";return n==="primary"?"/sdcard"+s:n==="home"?"/sdcard/Documents"+s:/^[0-9A-F]{4}-[0-9A-F]{4}$/i.test(n)?"/storage/"+n+s:null}function qe(e){if(!e||typeof e!="string")return null;let t=e;if(t.startsWith("content://")){if(t.includes("::")){let n=mn(t.split("::").pop());if(n.startsWith("/"))return n;let o=$o(n);if(o)return o}let r=t.indexOf("/document/");if(r>=0){let n=mn(t.slice(r+10).split("?")[0]);if(n.startsWith("/"))return n;let o=$o(n);if(o)return o}return null}if(t.startsWith("file://")&&(t=mn(t.replace(/^file:\/\//,""))),t.includes("/data/data/com.termux/files/home"))return t.includes("::")?t.split("::").pop():t;if(t.includes("::")){let r=t.split("::").pop();if(r&&r.startsWith("/"))return r}if(/\/(storage|sdcard|emulated)\//i.test(t)){let r=t.match(/(\/(?:storage|sdcard|emulated)\/[^?#]*)/i);if(r)return r[1]}return t.startsWith("/")?t:null}function Sr(e){if(!e)return null;let t=Math.max(e.lastIndexOf("/"),e.lastIndexOf("\\"));return t<=0?e:e.slice(0,t)}var Se=R(()=>{});var Je={};xe(Je,{browseRootFolder:()=>Uo,getEffectiveRoot:()=>kr,getEffectiveRootUri:()=>Gi,pickRootFolder:()=>Vi,rootFromSelectedFolder:()=>Zi});function Yi(e){let t=String(e||"").replace(/\/+$/,"")||"",r=t.match(/^\/storage\/emulated\/0(\/.*)?$/);return r||(r=t.match(/^\/storage\/self\/primary(\/.*)?$/),r)?"/sdcard"+(r[1]||""):t}function zo(e){return Yi(String(e||"").replace(/\/+$/,""))}function kr(){let e=k(),t=G(),r=qe((t==null?void 0:t.uri)||(t==null?void 0:t.url)||""),n=r?Sr(r):null,o=e.rootFolder&&String(e.rootFolder).trim()||"";if(o&&n){let s=zo(o),i=zo(n);return i===s||i.startsWith(s+"/")?o:(console.log("[LiveServer] root: active file outside saved root, using",n,"(saved was",o,")"),n)}return o||n}function Gi(){let e=k(),t=G(),r=(t==null?void 0:t.uri)||(t==null?void 0:t.url)||"",n=(()=>{let o=qe(r);return o?Sr(o):null})();return e.rootFolderUri&&String(e.rootFolderUri).trim()&&!n?String(e.rootFolderUri).trim():r.includes("::")?r.split("::")[0]:n}async function Uo(){try{let e=acode.require("fileBrowser");if(!e)return $e("File browser not available",2e3),null;let t=await e("folder","Select Live Server root");if(!t)return null;let r=t.url||t.uri||t,n=qe(typeof r=="string"?r:(r==null?void 0:r.url)||"")||String(r);H("rootFolder",n);try{H("rootFolderUri",typeof r=="string"?r:(r==null?void 0:r.url)||n)}catch{}return $e("Root: "+n,2500),n}catch(e){return $e(String((e==null?void 0:e.message)||e),2500),null}}async function Vi(){try{let e=k().rootFolder||"",t=G(),r=Sr(qe((t==null?void 0:t.uri)||(t==null?void 0:t.url)||"")||"")||"",n=[["browse","Browse with Acode file browser\u2026"],["active",r?`Use active file folder
${r}`:"Use active file folder"],["type","Type path\u2026"],["clear","Clear (auto from active HTML)"]];e&&n.splice(1,0,["keep",`Keep current
${e}`]);let o=await Wi("Select root folder",n,{hideOnSelect:!0});if(!o||o==="keep")return e||null;if(o==="browse")return Uo();if(o==="active"){if(!r)return $e("Open an HTML file first",2e3),null;H("rootFolder",r);try{H("rootFolderUri",(t==null?void 0:t.uri)||(t==null?void 0:t.url)||"")}catch{}return $e("Root: "+r,2200),r}if(o==="clear"){H("rootFolder","");try{H("rootFolderUri","")}catch{}return $e("Root cleared \u2014 will use active file folder",2200),null}if(o==="type"){let s=await Xi("Absolute folder path",e||r||"/sdcard/","text");if(!s)return null;let i=String(s).trim();return H("rootFolder",i),$e("Root: "+i,2200),i}return null}catch(e){return $e(String((e==null?void 0:e.message)||e),2500),null}}function Zi(){var e,t,r;try{let n=((e=window.fileBrowser)==null?void 0:e.selectedFolder)||((r=(t=window.addedFolder)==null?void 0:t[0])==null?void 0:r.url)||null;if(n)return qe(n)||n}catch{}return null}var $e,Wi,Xi,ze=R(()=>{K();Se();$e=acode.require("toast"),Wi=acode.require("select"),Xi=acode.require("prompt")});var Qe={};xe(Qe,{getServerStatus:()=>q,refreshStatusFromBackend:()=>gn,setServerStatus:()=>ie});function q(){return{...Ue}}function ie(e){Object.assign(Ue,e||{});try{window.dispatchEvent(new CustomEvent("liveserver-status",{detail:q()}))}catch{}}async function gn(){if(!Ue.port)return Ue;try{let e=await fetch(`http://127.0.0.1:${Ue.port}/status`);if(!e.ok)return ie({running:!1,lastError:"status "+e.status}),q();let t=await e.json();ie({running:!0,port:t.port||Ue.port,root:t.root||Ue.root,fileName:t.fileName||Ue.fileName})}catch{ie({running:!1})}return q()}var Ue,ue=R(()=>{Ue={running:!1,port:null,root:null,url:null,fileName:null,bind:null,startedAt:null,lastError:null}});function jt(){try{return acode.require("fsOperation")||window.fsOperation}catch{return window.fsOperation}}function ea(e){let t=5381,r=String(e||"");for(let n=0;n<r.length;n++)t=(t<<5)+t+r.charCodeAt(n)|0;return"p"+(t>>>0).toString(36)}function ke(e){return"'"+String(e).replace(/'/g,"'\\''")+"'"}function Tr(e){try{return decodeURIComponent(e)}catch{return e}}function xt(e){let t=e.lastIndexOf("/");return t<0?"":e.slice(0,t)}function ta(e){return e==null?null:e instanceof Uint8Array?e:e instanceof ArrayBuffer?new Uint8Array(e):ArrayBuffer.isView(e)?new Uint8Array(e.buffer,e.byteOffset,e.byteLength):typeof e=="string"?new TextEncoder().encode(e):typeof e=="object"&&typeof e.byteLength=="number"?new Uint8Array(e):null}function ra(e){let t="";for(let n=0;n<e.length;n+=32768)t+=String.fromCharCode.apply(null,e.subarray(n,n+32768));return btoa(t)}function na(e){let t=2166136261;for(let r=0;r<e.length;r++)t^=e[r],t=Math.imul(t,16777619);return(t>>>0).toString(36)+":"+e.length}async function Ko(e,t,r){let n=new Array(e.length),o=0,s=Array.from({length:Math.min(t,e.length)},async()=>{for(;o<e.length;){let i=o++;try{n[i]=await r(e[i],i)}catch{n[i]=void 0}}});return await Promise.all(s),n}function bn(e){let t=Wo.then(e,e);return Wo=t.catch(()=>{}),t}async function Nt(e){try{let t=await jt()(e).stat();return t||null}catch{return null}}function _r(e){return!!(e&&(e.isDirectory===!0||e.type==="dir"||e.type==="directory"))}function Jo(e){if(!e)return null;let t=e.length!=null?e.length:e.size,r=e.lastModified!=null?e.lastModified:e.mtime!=null?e.mtime:e.modified;return t==null&&r==null?null:String(t)+"|"+String(r instanceof Date?r.getTime():r)}async function oa(e){let t=await jt()(e).readFile(),r=ta(t);if(!r)throw new Error("unreadable");return r}function Yo(e,t){let r=String(e||"").replace(/\/+$/,""),n=String(t||"").replace(/^\/+/,"");return n?r+"/"+n:r}function Qo(e,t){let r=Yo(e,t),n=Yo(e,t.split("/").map(o=>encodeURIComponent(o)).join("/"));return r===n?[r]:[r,n]}async function es(e,t,r){let n=e,o=t.split("/").filter(Boolean);for(let i=0;i<o.length;i++){let a=r.get(n);if(!a){try{a=await jt()(n).lsDir()||[]}catch{return null}r.set(n,a)}let d=o[i],u=d.toLowerCase(),p=a.find(c=>(c.name||"")===d)||a.find(c=>Tr(c.name||"")===d)||a.find(c=>(c.name||"").toLowerCase()===u);if(!p||(n=p.url||p.uri||null,!n))return null}let s=await Nt(n);return!s||_r(s)?null:{uri:n,st:s}}async function Sn(e,t){if(!E)return null;for(let r of Qo(E.baseUri,e)){let n=await Nt(r);if(n&&!_r(n))return{uri:r,st:n};if(n&&_r(n))return null}return es(E.baseUri,e,t)}function sa(e){let t=[],r=String(e||"").replace(/\/+$/,"");if(!r.startsWith("/"))return t;let n=r,o=r.match(/^\/sdcard(\/.*)?$/);o&&(n="/storage/emulated/0"+(o[1]||"")),o=r.match(/^\/storage\/self\/primary(\/.*)?$/),o&&(n="/storage/emulated/0"+(o[1]||""));let s=n.split("/").map(i=>encodeURIComponent(i)).join("/");return t.push("file://"+s,"file://"+n),n!==r&&t.push("file://"+r),t}function ia(e,t){let r=[t,encodeURI(t),t.split("/").map(encodeURIComponent).join("/")];for(let o of r)if(e.endsWith("/"+o))return e.slice(0,e.length-o.length-1);let n=encodeURIComponent(t);return e.endsWith("%2F"+n)?e.slice(0,e.length-n.length-3):null}function Go(e){let t=[e],r=e.match(/\/tree\/([^/:]+)$/);return r&&t.push(e+"::"+Tr(r[1])),t}function aa(e,t,r){let n=[],o=u=>{u&&!n.includes(u)&&n.push(u)},s=G(),i=(s==null?void 0:s.uri)||(s==null?void 0:s.url)||"",a=String(i).split("/").pop(),d=t.split("/").pop();if(i&&(Tr(a)===d||a===d)){let u=ia(i,t);u&&Go(u).forEach(o)}return r&&Go(String(r).replace(/\/+$/,"")).forEach(o),sa(e).forEach(o),String(e||"").startsWith("/")&&o(String(e).replace(/\/+$/,"")),n}async function la(e,t,r){let n=new Map;for(let o of aa(e,t,r)){for(let i of Qo(o,t)){let a=await Nt(i);if(a&&!_r(a))return{base:o,uri:i,st:a}}let s=await es(o,t,n);if(s)return{base:o,uri:s.uri,st:s.st}}return null}function ca(e){return/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(String(e||"").trim())}function da(e){let t=String(e||"").trim();return!t||ca(t)||(t=t.split("#")[0].split("?")[0],!t||t.endsWith("/"))?null:Tr(t)}function vn(e,t,r){let n=da(t);if(!n)return null;let o=[];n.startsWith("/")?o=n.slice(1).split("/"):o=(r!=null?r:xt(e)).split("/").filter(Boolean).concat(n.split("/"));let s=[];for(let i of o)if(!(!i||i==="."))if(i===".."){if(!s.length)return null;s.pop()}else s.push(i);return s.length?s.join("/"):null}function yn(e){let t=[],r=String(e||"").replace(/\/\*[\s\S]*?\*\//g,""),n,o=/url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s][^)]*?))\s*\)/gi;for(;n=o.exec(r);)t.push(n[1]||n[2]||n[3]);let s=/@import\s+(?:"([^"]+)"|'([^']+)')/gi;for(;n=s.exec(r);)t.push(n[1]||n[2]);return t}function ts(e){let t=[],r=String(e||"").replace(/\/\*[\s\S]*?\*\//g,"").replace(/(^|[^:\\])\/\/[^\n]*/g,"$1"),n,o=/(?:\bfrom|\bimport)\s*\(?\s*(?:"([^"]+)"|'([^']+)'|`([^`$]+)`)/g;for(;n=o.exec(r);)t.push(n[1]||n[2]||n[3]);let s=/importScripts\s*\(([^)]*)\)/g;for(;n=s.exec(r);){let u=/["'`]([^"'`]+)["'`]/g,p;for(;p=u.exec(n[1]);)t.push(p[1])}let i=/new\s+URL\(\s*(?:"([^"]+)"|'([^']+)')/g;for(;n=i.exec(r);)t.push(n[1]||n[2]);let a=new RegExp("[\"'`]((?:\\.{1,2}/|/)?[A-Za-z0-9_@%~+\\-./]+\\.(?:"+Qi+"))(?:[?#][^\"'`]*)?[\"'`]","gi");for(;n=a.exec(r);)t.push(n[1]);let d=/["'`](\.{1,2}\/[^"'`\s]+)["'`]/g;for(;n=d.exec(r);)t.push(n[1]);return t}function pa(e){let t=[],r=String(e||"").replace(/<!--[\s\S]*?-->/g,""),n=/<([a-zA-Z][\w:-]*)\b([^>]*)>/g,o;for(;o=n.exec(r);){let d=o[1].toLowerCase(),u=o[2],p=/([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g,c;for(;c=p.exec(u);){let g=c[1].toLowerCase(),h=c[2]!=null?c[2]:c[3]!=null?c[3]:c[4];if(g==="style"){yn("x{"+h+"}").forEach(l=>t.push(l));continue}if(ua.has(g)){if(g==="srcset"||g==="data-srcset"){String(h).split(",").forEach(l=>{let v=l.trim().split(/\s+/)[0];v&&t.push(v)});continue}if(g==="href"&&(d==="a"||d==="area")){/\.html?([?#].*)?$/i.test(h)&&t.push(h);continue}g!=="action"&&t.push(h)}}}let s=/<style\b[^>]*>([\s\S]*?)<\/style>/gi,i;for(;i=s.exec(r);)yn(i[1]).forEach(d=>t.push(d));let a=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;for(;i=a.exec(r);)/\bsrc\s*=/.test(i[1])||/type\s*=\s*["']?(?:application\/(?:ld\+)?json|importmap)/i.test(i[1])&&!/importmap/i.test(i[1])||ts(i[2]).forEach(d=>t.push(d));return t}function fa(e){return/\.html?$/i.test(e)?"html":/\.css$/i.test(e)?"css":/\.m?js$/i.test(e)?"js":"bin"}function ha(e,t,r,n){let o;try{o=new TextDecoder("utf-8").decode(r)}catch{return[]}let s=[];t==="html"?s=pa(o):t==="css"?s=yn(o):t==="js"&&(s=ts(o));let i=[],a=new Set;for(let d of s){let u=[],p=vn(e,d);if(p&&u.push(p),t==="js"){let c=vn(e,d,xt(n));c&&u.push(c);let g=vn(e,"/"+String(d).replace(/^\.{0,2}\/+/,""));g&&u.push(g)}u.forEach(c=>{a.has(c)||(a.add(c),i.push(c))})}return i}function et(e,t){return ee(e,{timeoutMs:t||2e4})}function ma(){var n,o,s;let e=[],t=i=>{if(!i)return;let a=String(i).replace(/\/+$/,"");e.includes(a)||e.push(a)};try{t((o=(n=window.cordova)==null?void 0:n.file)==null?void 0:o.dataDirectory)}catch{}let r=[];try{(s=window.BuildInfo)!=null&&s.packageName&&r.push(window.BuildInfo.packageName)}catch{}return r.push("com.foxdebug.acode","com.foxdebug.acodefree"),r.forEach(i=>{t("file:///data/user/0/"+i+"/files"),t("file:///data/data/"+i+"/files")}),e}async function ga(){if(ce)return ce;let e=".probe_"+Math.random().toString(36).slice(2,8),t=await et("mkdir -p "+ke(Er)+" && echo ok > "+ke(Er+"/"+e)+" && echo PROBE_OK",2e4);if(!String(t||"").includes("PROBE_OK"))throw new Error("Alpine shell cannot write its cache dir (open the Acode terminal once)");let r=null;for(let n of ma()){for(let o of["/alpine/root","/alpine/home/root"]){let s=n+o+"/.acode_liveserver/cache";if(await Nt(s+"/"+e)){r=s;break}}if(r)break}return et("rm -f "+ke(Er+"/"+e),8e3).catch(()=>{}),ce=r?{mode:"direct",androidCache:r,verified:!1}:{mode:"shell"},console.log("[LiveServer:mirror] transport",ce.mode,r||""),ce}async function va(e){let t=[...new Set(e.filter(Boolean))];if(!t.length)return;let r="";for(let n of t){let o="mkdir -p "+ke(n)+"; ";r.length+o.length>4e4&&(await et(r,2e4),r=""),r+=o}r&&await et(r,2e4)}async function ba(e){let t="",r=async()=>{t&&(await et(t,6e4),t="")};for(let n of e){let o=ra(n.bytes);if(!o.length){let s=": > "+ke(n.dest)+"; ";t.length+s.length>46e3&&await r(),t+=s;continue}for(let s=0,i=!0;s<o.length;s+=jo,i=!1){let a=o.slice(s,s+jo),d="printf %s "+ke(a)+" | base64 -d "+(i?">":">>")+" "+ke(n.dest)+"; ";t.length+d.length>46e3&&await r(),t+=d}}await r()}async function ya(e,t,r){let n=ce.androidCache+"/"+E.id+"/"+e;if(r)await jt()(n).writeFile(t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength));else{let o=ce.androidCache+"/"+E.id+(xt(e)?"/"+xt(e):""),s=e.split("/").pop();await jt()(o).createFile(s,t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength))}}async function wa(e){let t=await et("wc -c < "+ke(E.aroot+"/"+e)+" 2>/dev/null || echo NONE",1e4),r=String(t||"").match(/(\d+)/);return r?parseInt(r[1],10):-1}async function xa(e){if(e.length){if(await va(e.map(t=>E.aroot+(xt(t.rel)?"/"+xt(t.rel):""))),ce.mode==="direct")try{for(let t of e)await ya(t.rel,t.bytes,E.written.has(t.rel)),E.written.add(t.rel);if(!ce.verified){let t=e.find(n=>n.bytes.length>0)||e[0];if(await wa(t.rel)!==t.bytes.length)throw new Error("direct write not visible in Alpine");ce.verified=!0}return}catch(t){console.warn("[LiveServer:mirror] direct write failed, using shell transport",(t==null?void 0:t.message)||t),ce={mode:"shell"}}await ba(e.map(t=>({dest:E.aroot+"/"+t.rel,bytes:t.bytes}))),e.forEach(t=>E.written.add(t.rel))}}async function wn(e,t={}){let r=No[ce.mode]||No.shell,n=new Map,o=e.filter(a=>a),s=0,i=[];for(;o.length;){let a=await Ko(o,Zo,async c=>{let g=E.files.get(c),h=await Sn(c,n);if(!h)return E.missing.add(c),null;let l=Jo(h.st),v=h.st.length!=null?h.st.length:h.st.size;if(v!=null&&v>r.file)return i.push(c+" ("+Math.round(v/1048576)+" MB)"),null;if(!t.force&&g&&l&&g.sig===l&&g.uri===h.uri)return{rel:c,unchanged:!0,known:g};let T=await oa(h.uri),x=l||na(T);return!t.force&&g&&g.sig===x&&E.written.has(c)?{rel:c,unchanged:!0,known:g}:{rel:c,src:h,bytes:T,sig:x}}),d=a.filter(c=>c&&!c.unchanged),u=new Set;for(let c of d){let g=E.files.get(c.rel),h=g&&g.size||0;E.total-h+c.bytes.length>r.total?(i.push(c.rel+" (total limit)"),c.skip=!0):!g&&E.files.size>=r.files&&(i.push(c.rel+" (file count limit)"),c.skip=!0)}let p=d.filter(c=>!c.skip).map(c=>({rel:c.rel,bytes:c.bytes}));await xa(p);for(let c of d){if(c.skip)continue;let g=E.files.get(c.rel);E.total+=c.bytes.length-(g&&g.size||0);let h=fa(c.rel),l=Ji.test(c.rel)?ha(c.rel,h,c.bytes,E.entryRel):[];E.files.set(c.rel,{uri:c.src.uri,sig:c.sig,size:c.bytes.length,deps:new Set(l)}),E.missing.delete(c.rel),s++,l.forEach(v=>{!E.files.has(v)&&!E.missing.has(v)&&u.add(v)})}a.forEach(c=>{c&&c.unchanged&&c.known&&c.known.deps.forEach(g=>{!E.files.has(g)&&!E.missing.has(g)&&u.add(g)})}),o=[...u]}return i.length&&(console.warn("[LiveServer:mirror] skipped",i.slice(0,6).join(", ")),Ki("Mirror skipped large file , Try from Acode Terminal Storage: "+i[0],3500)),s}function Sa(){clearTimeout(Xo),Xo=setTimeout(async()=>{try{if(k().liveReload===!1)return;let{getServerStatus:e}=await Promise.resolve().then(()=>(ue(),Qe)),t=e();if(!t.running||!t.port)return;await fetch("http://127.0.0.1:"+t.port+"/reload",{method:"POST"}).catch(()=>{})}catch{}try{window.dispatchEvent(new CustomEvent("liveserver-mirror-updated"))}catch{}},120)}async function xn(e={}){if(!E||!ce)return 0;let t=new Map,r=[...E.files.keys()],n=[];await Ko(r,Zo,async i=>{let a=E.files.get(i),d=await Nt(a.uri);if(!d){await Sn(i,t)&&n.push(i);return}let u=Jo(d);(u==null||u!==a.sig)&&n.push(i)}),E.tick=(E.tick||0)+1;let o=[];(e.retryMissing||E.tick%5===0)&&(o=[...E.missing],E.missing.clear());let s=await wn([...n,...o],{force:!1});return s>0&&!e.silent&&Sa(),s}function Vo(){var t;kn();let e=async()=>{if(E&&!Lr){Lr=!0;let r=Date.now();try{await bn(()=>xn())}catch(o){console.warn("[LiveServer:mirror] poll",(o==null?void 0:o.message)||o)}Lr=!1;let n=Date.now()-r;Ft=setTimeout(e,Math.max(Fo,n*1.5))}};if(Ft=setTimeout(e,Fo),!wt){wt=()=>{E&&setTimeout(()=>bn(()=>xn({retryMissing:!0})).catch(()=>{}),150)};try{(t=editorManager==null?void 0:editorManager.on)==null||t.call(editorManager,"save-file",wt)}catch{}}}function kn(){Ft&&(clearTimeout(Ft),Ft=null),Lr=!1}function Cr(){var e;kn();try{wt&&((e=editorManager==null?void 0:editorManager.off)==null||e.call(editorManager,"save-file",wt))}catch{}wt=null}function ka(e={}){return bn(async()=>{let t=String(e.sourceRoot||"").replace(/\/+$/,""),r=String(e.entryRel||"index.html").replace(/^\/+/,"");if(!t&&!e.sourceRootUri)throw new Error("No source root to mirror");let n=await ga(),o=ea(t||String(e.sourceRootUri)),s=Er+"/"+o;if(E&&E.id===o){if(E.entries.add(r),E.entryRel=r,!(E.files.has(r)?!0:!!await Sn(r,new Map)))throw new Error("Cannot read "+r+" from storage");return await xn({silent:!0}),await wn([r]),Vo(),s}kn();let i=await la(t,r,e.sourceRootUri||k().rootFolderUri||"");if(!i)throw new Error("Acode cannot read "+r+" under "+(t||e.sourceRootUri));E={id:o,aroot:s,rootPath:t,baseUri:i.base,entryRel:r,entries:new Set([r]),files:new Map,written:new Set,missing:new Set,total:0},await et("rm -rf "+ke(s)+" && mkdir -p "+ke(s),2e4);let a=await wn([r]);if(!E.files.has(r)||a===0){let d="Could not copy "+r+" ("+(n.mode||"")+")";throw E=null,new Error(d)}try{H("lastMirrorRoot",s)}catch{}return Vo(),console.log("[LiveServer:mirror] ready",s,"files=",E.files.size,"mode=",ce.mode),s})}async function Rr(e,t,r){return ka({sourceRoot:e,entryRel:t,sourceRootUri:r})}var Ki,Er,Fo,Zo,jo,No,Ji,Qi,E,ce,Ft,Lr,Wo,wt,Xo,ua,rs=R(()=>{K();Se();ht();Ki=(...e)=>{try{acode.require("toast")(...e)}catch{}},Er="/root/.acode_liveserver/cache",Fo=2e3,Zo=4,jo=44e3,No={direct:{files:800,file:96*1024*1024,total:400*1024*1024},shell:{files:400,file:8*1024*1024,total:40*1024*1024}},Ji=/\.(html?|css|m?js)$/i,Qi="js|mjs|json|css|html?|svg|png|jpe?g|gif|webp|avif|ico|bmp|woff2?|ttf|otf|eot|mp3|mp4|webm|ogg|wav|m4a|glb|gltf|wasm|txt|xml|csv|webmanifest|map",E=null,ce=null,Ft=null,Lr=!1,Wo=Promise.resolve(),wt=null,Xo=null;ua=new Set(["src","href","poster","data","data-src","data-href","data-background","data-bg","manifest","background","srcset","data-srcset"])});function St(){let e=parseInt(k().port,10);return Number.isFinite(e)&&e>0?e:8080}function Wt(e,t){return`http://${t==="0.0.0.0"?"127.0.0.1":t||"127.0.0.1"}:${e}/`}var ns=R(()=>{K()});function os(){if(document.getElementById("ls-status-pill-css"))return;let e=document.createElement("style");e.id="ls-status-pill-css",e.textContent=`
    #ls-status-pill {
      position: fixed;
      left: 8px;
      bottom: 8px;
      z-index: 100001;
      max-width: min(82vw, 440px);
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 5px 10px;
      border-radius: 4px;
      background: var(--secondary-color, rgba(28, 30, 34, 0.94));
      color: var(--primary-text-color, var(--color, #e8eaed));
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.3);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.3;
      pointer-events: none;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.18s ease, transform 0.18s ease;
    }
    #ls-status-pill.is-visible {
      opacity: 0.96;
      transform: translateY(0);
    }
    .ls-sp-dot {
      width: 7px;
      height: 7px;
      min-width: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px rgba(34, 197, 94, 0.9);
    }
    .ls-sp-dot.is-spin {
      animation: ls-sp-pulse 0.9s ease-in-out infinite alternate;
    }
    @keyframes ls-sp-pulse {
      from { opacity: 0.4; transform: scale(0.85); }
      to { opacity: 1; transform: scale(1.15); }
    }
    .ls-sp-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Global top green progress bar (shown when installing in background) */
    #ls-global-green-loader {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      z-index: 100002;
      overflow: hidden;
      pointer-events: none;
      display: none;
      background: rgba(34, 197, 94, 0.15);
    }
    #ls-global-green-loader.is-active {
      display: block;
    }
    #ls-global-green-loader::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      width: 35%;
      background: linear-gradient(90deg, #16a34a, #4ade80, #22c55e);
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.85);
      animation: ls-green-slide 1.15s ease-in-out infinite;
    }
    @keyframes ls-green-slide {
      0% { left: -35%; }
      100% { left: 100%; }
    }
  `,document.head.appendChild(e)}function Ea(){return os(),(!de||!de.isConnected)&&(de=document.createElement("div"),de.id="ls-status-pill",Et=document.createElement("span"),Et.className="ls-sp-dot",kt=document.createElement("span"),kt.className="ls-sp-text",de.append(Et,kt),document.body.appendChild(de)),de}function Ce(e,t={}){os();let r=!!e,o=!!document.querySelector("#ls-browser-shell.is-open, .ls-browser-shell.is-open")||t.force===!0;if(document.body.classList.toggle("ls-green-loading",r&&o),document.querySelectorAll(".ls-browser-shell").forEach(s=>{s.classList.toggle("is-installing",r)}),!o){pe&&pe.classList.remove("is-active");return}(!pe||!pe.isConnected)&&(pe=document.createElement("div"),pe.id="ls-global-green-loader",document.body.appendChild(pe)),pe.classList.toggle("is-active",r)}function Re(e,t={}){if(!!!document.querySelector("#ls-browser-shell.is-open, .ls-browser-shell.is-open")&&t.force!==!0){Yt(0);return}clearTimeout(Xt);let n=Ea();kt&&(kt.textContent=String(e||"")),Et&&Et.classList.toggle("is-spin",t.spin!==!1),requestAnimationFrame(()=>{n.classList.add("is-visible")}),t.autoHideMs&&t.autoHideMs>0&&(Xt=setTimeout(()=>{Yt(0)},t.autoHideMs))}function Yt(e=0){clearTimeout(Xt);let t=()=>{de&&de.classList.remove("is-visible")};e>0?Xt=setTimeout(t,e):t()}function ss(){clearTimeout(Xt),Ce(!1);try{de==null||de.remove(),pe==null||pe.remove()}catch{}de=null,kt=null,Et=null,pe=null}var de,kt,Et,pe,Xt,Ar=R(()=>{de=null,kt=null,Et=null,pe=null,Xt=null});function P(e,t=18,r=2){return`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${r}" stroke-linecap="round" stroke-linejoin="round"><path d="${e}"/></svg>`}var A,Gt=R(()=>{A={back:"M19 12H5M12 19l-7-7 7-7",forward:"M5 12h14M12 5l7 7-7 7",reload:"M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16",close:"M18 6L6 18M6 6l12 12",plus:"M12 5v14M5 12h14",home:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",lock:"M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2zM7 11V7a5 5 0 0110 0v4",info:"M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01",device:"M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zM12 18h.01",rotate:"M21 12a9 9 0 11-9-9c2.5 0 4.7 1 6.3 2.7L21 8M21 3v5h-5",dots:"M12 5h.01M12 12h.01M12 19h.01",maximize:"M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3",drop:"M12 2.69l5.66 5.66a8 8 0 11-11.31 0z",down:"M6 9l6 6 6-6",up:"M18 15l-6-6-6 6",search:"M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.35-4.35",globe:"M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20",minus:"M5 12h14"}});function La(e){let t=String(e||"").trim().match(/^#([0-9a-f]{3,8})$/i),r,n,o;if(t){let s=t[1];s.length===3&&(s=s.split("").map(i=>i+i).join("")),r=parseInt(s.slice(0,2),16),n=parseInt(s.slice(2,4),16),o=parseInt(s.slice(4,6),16)}else{if(t=String(e||"").match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i),!t)return null;r=+t[1],n=+t[2],o=+t[3]}return(.299*r+.587*n+.114*o)/255}function is(){try{let e=getComputedStyle(document.documentElement),t=e.getPropertyValue("--primary-color")||e.getPropertyValue("--secondary-color"),r=La(t);if(r!=null)return r>.6?"light":"dark"}catch{}return"dark"}var as=R(()=>{});function ls(){let e=document.getElementById("ls-browser-styles");e&&e.remove();let t=document.createElement("style");t.id="ls-browser-styles",t.textContent=En,document.head.appendChild(t)}var En,cs=R(()=>{En=`
:host { display: block; position: relative; height: 100%; width: 100%; }
.ls-browser-shell {
  --ls-frame: #202124; --ls-toolbar: #35363a; --ls-omni: #202124; --ls-text: #e8eaed; --ls-sub: #9aa0a6;
  --ls-hover: rgba(255,255,255,.10); --ls-press: rgba(255,255,255,.16); --ls-line: #3c4043; --ls-accent: #8ab4f8;
  --ls-menu: #292a2d; --ls-stage: #1b1c1e; --ls-active-tab-text: #e8eaed;
  position: absolute; inset: 0; z-index: 1;
  display: flex; flex-direction: column; box-sizing: border-box;
  background: var(--ls-frame); color: var(--ls-text);
  font: 13px/1.3 Roboto, "Noto Sans", "Segoe UI", system-ui, sans-serif;
}
.ls-browser-shell[data-theme="light"] {
  --ls-frame: #dee1e6; --ls-toolbar: #ffffff; --ls-omni: #f1f3f4; --ls-text: #202124; --ls-sub: #5f6368;
  --ls-hover: rgba(0,0,0,.08); --ls-press: rgba(0,0,0,.14); --ls-line: #dadce0; --ls-accent: #1a73e8;
  --ls-menu: #ffffff; --ls-stage: #e8eaed; --ls-active-tab-text: #202124;
}
.ls-browser-shell *, .ls-browser-shell *::before, .ls-browser-shell *::after { box-sizing: border-box; }
.ls-browser-shell button { font: inherit; color: inherit; }
.ls-browser-shell.is-fullscreen { position: fixed; inset: 0; z-index: 99990; }

/* ---- chrome (tab strip + toolbar) */
.ls-chrome { flex-shrink: 0; display: flex; flex-direction: column; background: var(--ls-frame); }
.ls-tabstrip { display: flex; align-items: flex-end; height: 38px; padding: 6px 6px 0 6px; gap: 2px; }
.ls-browser-tabs { display: flex; flex: 0 1 auto; min-width: 0; overflow: hidden; align-items: flex-end; }
.ls-tab {
  position: relative; display: flex; align-items: center; gap: 6px; flex: 0 1 200px; min-width: 36px; max-width: 220px;
  height: 32px; padding: 0 6px 0 10px; border-radius: 3px 3px 0 0; color: var(--ls-sub); cursor: default; user-select: none;
}
.ls-tab:hover { background: var(--ls-hover); }
.ls-tab.is-active { background: var(--ls-toolbar); color: var(--ls-active-tab-text); }
.ls-tab:not(.is-active)::after { content: ""; position: absolute; right: -1px; top: 8px; height: 16px; width: 1px; background: var(--ls-line); }
.ls-tab:hover::after, .ls-tab.is-active::after, .ls-tab:has(+ .ls-tab.is-active)::after { display: none; }
.ls-fav { width: 16px; height: 16px; flex: none; display: inline-flex; align-items: center; justify-content: center; }
.ls-fav img { width: 16px; height: 16px; }
.ls-fav.is-spin { border: 2px solid var(--ls-line); border-top-color: var(--ls-accent); border-radius: 50%; animation: ls-spin .8s linear infinite; }
.ls-tab-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ls-tab-x { width: 18px; height: 18px; flex: none; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; }
.ls-tab-x:hover { background: var(--ls-press); }
.ls-tabstrip .ls-spacer { flex: 1; }
.ls-win { display: flex; align-items: center; align-self: center; gap: 2px; }
.ls-ib {
  width: 32px; height: 32px; flex: none; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--ls-sub);
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
}
.ls-ib:hover { background: var(--ls-hover); }
.ls-ib:active { background: var(--ls-press); }
.ls-ib:disabled { opacity: .4; pointer-events: none; }
.ls-ib.is-on { color: var(--ls-accent); }
.ls-ib.is-on svg { fill: var(--ls-accent); }
.ls-ib.ls-tab-new { width: 28px; height: 28px; margin-left: 2px; align-self: center; }
.ls-ib.ls-win-btn { width: 26px; height: 26px; }

.ls-toolbar { position: relative; display: flex; align-items: center; gap: 2px; height: 40px; padding: 0 6px; background: var(--ls-toolbar); border-bottom: 1px solid var(--ls-line); }
/* ---- omnibox focus: nav buttons rise out one after another (each starts at 80% of the previous).
   The url bar growth is ONE continuous width animation of the whole nav group (not per button),
   so it glides instead of moving in steps. */
.ls-nav { display: flex; align-items: center; flex: none; height: 100%; overflow: hidden; width: 136px; transition: width 680ms cubic-bezier(.45, 0, .25, 1); }
.ls-toolbar.is-omni .ls-nav { width: 0; }
.ls-nav .ls-ib {
  --ls-d: 0ms; margin-right: 2px;
  transition:
    transform 200ms cubic-bezier(.3, 0, .2, 1) var(--ls-d),
    opacity 160ms ease var(--ls-d),
    background-color 120ms ease,
    visibility 0s linear var(--ls-d);
}
/* unfocus: reverse order - back comes down first, home last */
.ls-nav .ls-back { --ls-d: 0ms; }
.ls-nav .ls-fwd { --ls-d: 160ms; }
.ls-nav .ls-reload { --ls-d: 320ms; }
.ls-nav .ls-home { --ls-d: 480ms; }
.ls-toolbar.is-omni .ls-nav .ls-ib {
  transform: translateY(-140%); opacity: 0; pointer-events: none; visibility: hidden;
  transition:
    transform 200ms cubic-bezier(.3, 0, .2, 1) var(--ls-d),
    opacity 160ms ease var(--ls-d),
    visibility 0s linear calc(var(--ls-d) + 240ms);
}
/* focus: home rises first, then reload, forward, back */
.ls-toolbar.is-omni .ls-nav .ls-home { --ls-d: 0ms; }
.ls-toolbar.is-omni .ls-nav .ls-reload { --ls-d: 160ms; }
.ls-toolbar.is-omni .ls-nav .ls-fwd { --ls-d: 320ms; }
.ls-toolbar.is-omni .ls-nav .ls-back { --ls-d: 480ms; }
@media (prefers-reduced-motion: reduce) { .ls-nav, .ls-nav .ls-ib, .ls-toolbar.is-omni .ls-nav .ls-ib { transition: none; } }
.ls-omni { flex: 1; min-width: 0; height: 30px; margin: 0 6px; display: flex; align-items: center; gap: 2px; padding: 0 2px 0 4px; border-radius: 3px; background: var(--ls-omni); }
.ls-omni:focus-within { box-shadow: inset 0 0 0 2px var(--ls-accent); }
.ls-site { width: 24px; height: 24px; flex: none; border: 0; border-radius: 50%; background: transparent; color: var(--ls-sub); display: inline-flex; align-items: center; justify-content: center; padding: 0; }
.ls-site:hover { background: var(--ls-hover); }
.ls-browser-url { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; color: var(--ls-text); font: inherit; font-size: 14px; padding: 0 4px; }
.ls-browser-url::placeholder { color: var(--ls-sub); }
.ls-omni .ls-ib { width: 26px; height: 26px; }
.ls-browser-shell.no-url .ls-omni { visibility: hidden; }
.ls-progress { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; overflow: hidden; display: none; }
.ls-browser-shell.is-loading .ls-progress { display: block; }
.ls-progress::before { content: ""; position: absolute; top: 0; bottom: 0; width: 30%; background: var(--ls-accent); animation: ls-bar 1.1s ease-in-out infinite; }
@keyframes ls-bar { 0% { left: -30%; } 100% { left: 100%; } }
@keyframes ls-spin { to { transform: rotate(360deg); } }

/* ---- external site fallback banner */
.ls-ext-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 5px 10px; background: var(--ls-menu); border-bottom: 1px solid var(--ls-line);
  font-size: 12px; color: var(--ls-sub);
}
.ls-ext-bar[hidden] { display: none; }
.ls-ext-open {
  border: 0; border-radius: 3px; padding: 4px 10px; background: #22c55e;
  color: #052e16; font-weight: 600; font-size: 11.5px; cursor: pointer; white-space: nowrap;
}

/* ---- device toolbar */
.ls-devbar { display: flex; align-items: center; gap: 6px; min-height: 34px; padding: 3px 8px; background: var(--ls-toolbar); border-bottom: 1px solid var(--ls-line); overflow-x: auto; scrollbar-width: none; }
.ls-devbar[hidden] { display: none; }
.ls-devbar::-webkit-scrollbar { height: 0; }
.ls-dev-btn { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 8px; border: 1px solid var(--ls-line); border-radius: 3px; background: transparent; white-space: nowrap; cursor: pointer; }
.ls-dev-btn:hover { background: var(--ls-hover); }
.ls-dev-num { width: 58px; height: 26px; padding: 0 6px; border: 1px solid var(--ls-line); border-radius: 3px; background: var(--ls-omni); color: var(--ls-text); font: inherit; text-align: center; outline: 0; -moz-appearance: textfield; }
.ls-dev-num:focus { border-color: var(--ls-accent); }
.ls-dev-num::-webkit-outer-spin-button, .ls-dev-num::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.ls-dev-x { color: var(--ls-sub); }
.ls-dev-spacer { flex: 1; }
.ls-dev-icon { width: 26px; height: 26px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--ls-sub); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.ls-dev-icon:hover { background: var(--ls-hover); }

/* ---- stage (page area) */
.ls-stage { position: relative; flex: 1; min-height: 0; overflow: hidden; background: #fff; }
.ls-browser-shell.is-device .ls-stage { overflow: auto; display: flex; padding: 12px; background: var(--ls-stage); }
.ls-box { position: relative; width: 100%; height: 100%; }
.ls-browser-shell.is-device .ls-box { flex: none; margin: auto; background: #fff; box-shadow: 0 0 0 1px var(--ls-line), 0 2px 12px rgba(0,0,0,.35); }
.ls-device { position: relative; width: 100%; height: 100%; transform-origin: 0 0; }
.ls-browser-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #fff; }
.ls-hdl { display: none; position: absolute; z-index: 3; background: transparent; touch-action: none; }
.ls-browser-shell.is-device .ls-hdl { display: block; }
.ls-hdl-r { top: 0; bottom: 0; right: -12px; width: 12px; cursor: ew-resize; }
.ls-hdl-b { left: 0; right: 0; bottom: -12px; height: 12px; cursor: ns-resize; }
.ls-hdl-c { right: -12px; bottom: -12px; width: 12px; height: 12px; cursor: nwse-resize; }
.ls-hdl::after { content: ""; position: absolute; background: var(--ls-sub); border-radius: 3px; opacity: .8; }
.ls-hdl-r::after { top: calc(50% - 14px); left: 4px; width: 4px; height: 28px; }
.ls-hdl-b::after { left: calc(50% - 14px); top: 4px; height: 4px; width: 28px; }
.ls-hdl-c::after { left: 4px; top: 4px; width: 4px; height: 4px; border-radius: 50%; }

/* ---- new tab page (Mozilla Firefox style: large Green Fox top-center + search bar + round bookmarks + recent) */
.ls-ntp {
  position: absolute; inset: 0; z-index: 2; display: none; flex-direction: column;
  align-items: center; justify-content: flex-start; gap: 20px; padding: 26px 16px 28px;
  overflow-y: auto; background: var(--ls-toolbar); color: var(--ls-text);
}
.ls-ntp.is-on { display: flex; }
.ls-ntp-hero {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; margin-top: 6px;
}
.ls-ntp-logo {
  width: 92px; height: 92px; object-fit: contain; display: block;
  filter: drop-shadow(0 6px 16px rgba(34, 197, 94, 0.25));
}
.ls-ntp-title {
  font-size: 22px; font-weight: 600; letter-spacing: .3px;
}
.ls-ntp-search {
  width: min(480px, 95%); height: 44px; border-radius: 8px;
  background: var(--ls-omni); border: 1px solid var(--ls-line);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  display: flex; align-items: center; gap: 8px; padding: 0 6px 0 12px; color: var(--ls-sub);
}
.ls-ntp-search:focus-within {
  border-color: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.28);
}
.ls-ntp-search-ico {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ls-ntp-search input {
  flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent;
  color: var(--ls-text); font: inherit; font-size: 14px;
}
.ls-ntp-search-btn {
  height: 32px; padding: 0 14px; border: 0; border-radius: 6px;
  background: #22c55e; color: #052e16; font-weight: 600; font-size: 12.5px;
  cursor: pointer; flex-shrink: 0;
}
.ls-ntp-search-btn:active { opacity: 0.85; }
.ls-ntp-tiles {
  display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;
  width: min(480px, 100%);
}
.ls-ntp-tile {
  width: 78px; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 8px 4px; border: 0; border-radius: 6px; background: transparent; cursor: pointer;
}
.ls-ntp-tile:hover { background: var(--ls-hover); }
.ls-ntp-dot {
  width: 48px; height: 48px; border-radius: 50%; background: var(--ls-omni);
  border: 1px solid var(--ls-line); color: var(--ls-text);
  display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600;
  overflow: hidden; flex-shrink: 0;
}
.ls-ntp-dot img { width: 24px; height: 24px; border-radius: 50%; object-fit: contain; }
.ls-ntp-name {
  max-width: 74px; font-size: 11.5px; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; color: var(--ls-text);
}
.ls-ntp-recent-wrap {
  width: min(480px, 100%); display: flex; flex-direction: column; gap: 6px;
  border-top: 1px solid var(--ls-line); padding-top: 12px;
}
.ls-ntp-sec-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 4px 4px; font-size: 12px; font-weight: 600; color: var(--ls-sub);
}
.ls-ntp-more {
  border: 0; background: transparent; color: #22c55e; font-size: 12px;
  font-weight: 600; cursor: pointer; padding: 2px 6px; border-radius: 3px;
}
.ls-ntp-more:hover { background: var(--ls-hover); }
.ls-ntp-recent-list { display: flex; flex-direction: column; gap: 2px; }
.ls-ntp-recent-row {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  padding: 8px 8px; border: 0; border-radius: 4px; background: transparent; cursor: pointer;
}
.ls-ntp-recent-row:hover { background: var(--ls-hover); }
.ls-ntp-recent-ico {
  width: 28px; height: 28px; border-radius: 50%; background: var(--ls-omni);
  border: 1px solid var(--ls-line); display: inline-flex; align-items: center;
  justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0;
}
.ls-ntp-recent-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ls-ntp-recent-title {
  font-size: 13px; color: var(--ls-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ls-ntp-recent-url {
  font-size: 11px; color: var(--ls-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ls-ntp-empty { font-size: 12px; color: var(--ls-sub); padding: 8px 4px; }

/* ---- find bar */
.ls-find { position: absolute; top: 80px; right: 10px; z-index: 40; display: flex; align-items: center; gap: 2px; padding: 4px 6px; background: var(--ls-menu); border: 1px solid var(--ls-line); border-radius: 3px; box-shadow: 0 4px 14px rgba(0,0,0,.35); }
.ls-find[hidden] { display: none; }
.ls-find input { width: 150px; height: 26px; border: 0; border-bottom: 2px solid var(--ls-accent); background: transparent; color: var(--ls-text); outline: 0; font: inherit; padding: 0 4px; }
.ls-find .ls-ib { width: 26px; height: 26px; }

/* ---- overlay preview (page see-through, editor underneath stays usable) */
.ls-browser-shell.is-overlay { pointer-events: none; background: transparent; }
.ls-browser-shell.is-overlay .ls-tabstrip { display: none; }
.ls-ov-close { display: none !important; }
.ls-browser-shell.is-overlay .ls-ov-close { display: inline-flex !important; }
.ls-browser-shell.is-overlay .ls-chrome { pointer-events: auto; }
.ls-browser-shell.is-overlay .ls-stage { opacity: var(--ls-op, 1); pointer-events: none; background: transparent; }
.ls-browser-shell.is-overlay .ls-stage * { pointer-events: none; }
.ls-browser-shell.is-overlay .ls-dd-layer, .ls-browser-shell.is-overlay .ls-find { pointer-events: auto; }

/* ---- dropdown menu (desktop style) */
.ls-dd-layer { position: absolute; inset: 0; z-index: 60; }
.ls-dd-backdrop { position: absolute; inset: 0; background: transparent; }
.ls-dd-menu {
  position: absolute; min-width: 220px; max-width: calc(100% - 8px); padding: 6px 0;
  background: var(--ls-menu, #292a2d); color: var(--ls-text, #e8eaed);
  border: 1px solid var(--ls-line, #3c4043); border-radius: 3px;
  box-shadow: 0 4px 16px rgba(0,0,0,.4); font-size: 13px; overflow: auto;
}
.ls-dd-item { display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 6px 14px 6px 8px; cursor: pointer; white-space: nowrap; user-select: none; }
.ls-dd-item:hover, .ls-dd-item.is-active { background: var(--ls-hover, rgba(128,128,128,.22)); }
.ls-dd-item.is-disabled { opacity: .45; pointer-events: none; }
.ls-dd-check { width: 14px; height: 14px; display: inline-flex; flex-shrink: 0; }
.ls-dd-label { flex: 1; }
.ls-dd-arrow { opacity: .7; display: inline-flex; }
.ls-dd-sep { height: 1px; margin: 6px 0; background: var(--ls-line, rgba(128,128,128,.3)); }
.ls-dd-custom { padding: 2px 8px 2px 22px; }
.ls-zoomrow { display: flex; align-items: center; gap: 4px; min-height: 32px; }
.ls-zoomrow .ls-zl { flex: 1; }
.ls-zoomrow .ls-zv { min-width: 44px; text-align: center; }
.ls-zoomrow .ls-ib { width: 26px; height: 26px; color: var(--ls-text); }

/* ---- opacity panel */
.ls-dd-panel { width: 250px; padding: 12px 14px; }
.ls-op-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ls-op-val { color: var(--ls-accent); font-variant-numeric: tabular-nums; }
.ls-range { -webkit-appearance: none; appearance: none; width: 100%; height: 18px; margin: 0; background: transparent; outline: 0; }
.ls-range::-webkit-slider-runnable-track { height: 4px; border-radius: 3px; background: linear-gradient(to right, var(--ls-accent) var(--ls-fill, 100%), var(--ls-line) var(--ls-fill, 100%)); }
.ls-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; margin-top: -6px; border-radius: 50%; background: var(--ls-accent); border: 0; }
.ls-range::-moz-range-track { height: 4px; border-radius: 3px; background: var(--ls-line); }
.ls-range::-moz-range-progress { height: 4px; border-radius: 3px; background: var(--ls-accent); }
.ls-range::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: var(--ls-accent); border: 0; }
.ls-op-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; cursor: pointer; }
.ls-op-row.is-disabled { opacity: .45; pointer-events: none; }
.ls-op-hint { margin-top: 8px; font-size: 11px; color: var(--ls-sub); }
.ls-switch { position: relative; flex: none; width: 36px; height: 20px; }
.ls-switch::before { content: ""; position: absolute; inset: 0; border-radius: 3px; background: var(--ls-line); transition: background .15s; }
.ls-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 3px; background: var(--ls-text); transition: transform .15s; }
.ls-switch.is-on::before { background: var(--ls-accent); }
.ls-switch.is-on::after { transform: translateX(16px); background: #fff; }

 #ls-deps-picker{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center}
.ls-dp-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.45)}
.ls-dp-card{position:relative;width:min(420px,92vw);max-height:min(72vh,540px);display:flex;flex-direction:column;border-radius:3px;background:var(--secondary-color,#1e1e1e);color:var(--color,#e0e0e0);overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.4)}
.ls-dp-header{padding:12px 14px 8px;border-bottom:1px solid rgba(128,128,128,.25)}
.ls-dp-title{font-weight:600}
.ls-dp-subtitle{font-size:.75rem;opacity:.75;margin-top:4px}
.ls-dp-body{flex:1;overflow:auto;padding:8px 12px}
.ls-dp-row{display:flex;align-items:center;gap:10px;padding:8px 6px;border-radius:3px;margin-bottom:4px;background:rgba(128,128,128,.08)}
.ls-dp-status.ok{color:#66bb6a}.ls-dp-status.miss{color:#f48771}
.ls-dp-footer{display:flex;gap:8px;justify-content:flex-end;padding:10px 12px;border-top:1px solid rgba(128,128,128,.25)}
.ls-dp-btn{border:none;border-radius:3px;padding:8px 12px;background:rgba(128,128,128,.2);color:inherit}
.ls-dp-btn.ls-dp-install{background:var(--active-color,#61afef);color:#111;font-weight:600}
.ls-dp-progress-track{height:3px;border-radius:3px;background:rgba(128,128,128,.25);overflow:hidden}
.ls-dp-progress-bar{height:100%;background:var(--active-color,#61afef);transition:width .25s}
.ls-dp-spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(128,128,128,.35);border-top-color:var(--active-color,#61afef);animation:ls-spin .7s linear infinite}
@keyframes ls-spin{to{transform:rotate(360deg)}}



.ls-progress { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; overflow: hidden; display: none; }
.ls-browser-shell.is-loading .ls-progress { display: block; }
.ls-progress::before { content: ""; position: absolute; top: 0; bottom: 0; width: 30%; background: var(--ls-accent); animation: ls-bar 1.1s ease-in-out infinite; }

.ls-green-progress { position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; overflow: hidden; display: none; background: rgba(34, 197, 94, 0.16); }
.ls-browser-shell.is-installing .ls-green-progress { display: block; }
.ls-green-progress::before {
  content: ""; position: absolute; top: 0; bottom: 0; width: 35%;
  background: linear-gradient(90deg, #16a34a, #4ade80, #22c55e);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.85);
  animation: ls-bar 1.1s ease-in-out infinite;
}
`});function us(e){ds=e?String(e).endsWith("/")?String(e):e+"/":""}function ps(){return ds}var ds,Ln=R(()=>{ds=""});async function fs(){if(Pr)return Pr;let e=ps()+_a;try{let r=await acode.require("fsOperation")(e).readFile("utf8");if(r&&r.length>1e3)return Pr=String(r)}catch(t){console.warn("[LiveServer] devtool via fsOperation",t)}try{let t=await fetch(e);if(t.ok){let r=await t.text();if(r.length>1e3)return Pr=r}}catch(t){console.warn("[LiveServer] devtool via fetch",t)}return null}var _a,Pr,hs=R(()=>{Ln();_a="devtool/suger-dev.js",Pr=null});var Or,ms=R(()=>{Or=class{constructor(t){this.element=t,this.element&&(this.scroller=this.element.parentNode,this.finalScale=1,this.offsetX=0,this.offsetY=0,this.tempScale=1,this.tempOffsetX=0,this.tempOffsetY=0,this.panning=!1,this.isPanningContent=!1,this.initialDistance=0,this.panStart=null,this.pageOrigin=null,this.handleTouchStart=this.handleTouchStart.bind(this),this.handleTouchMove=this.handleTouchMove.bind(this),this.handleTouchEnd=this.handleTouchEnd.bind(this),this.handleDoubleTap=this.handleDoubleTap.bind(this),this.setupZoomEvents())}setupZoomEvents(){let t=()=>{this.element.style.touchAction=this.finalScale>1?"none":"auto"};t(),this.element.style.transformOrigin="0 0",this.onEnd=r=>{this.handleTouchEnd(r),t()},this.element.addEventListener("touchstart",this.handleTouchStart),this.element.addEventListener("touchmove",this.handleTouchMove),this.element.addEventListener("touchend",this.onEnd),this.element.addEventListener("touchcancel",this.handleTouchEnd),this.element.addEventListener("dblclick",this.handleDoubleTap)}destroy(){this.element.removeEventListener("touchstart",this.handleTouchStart),this.element.removeEventListener("touchmove",this.handleTouchMove),this.element.removeEventListener("touchend",this.onEnd),this.element.removeEventListener("touchcancel",this.handleTouchEnd),this.element.removeEventListener("dblclick",this.handleDoubleTap),this.finalScale=1,this.element.style.transform="",this.element.style.transformOrigin="",this.element.style.touchAction=""}getDistance(t,r){let n=t.clientX-r.clientX,o=t.clientY-r.clientY;return Math.sqrt(n*n+o*o)}getPageCoordinates(t){var u,p;if((!this.scroller||!this.scroller.getBoundingClientRect)&&(this.scroller=this.element.parentNode,!this.scroller||!this.scroller.getBoundingClientRect))return console.error("ZoomHandler Error: Cannot find scroller parent element."),null;let r=this.scroller.getBoundingClientRect(),n=this.scroller.scrollLeft,o=this.scroller.scrollTop,s=(t[0].clientX+(((u=t[1])==null?void 0:u.clientX)||t[0].clientX))/t.length,i=(t[0].clientY+(((p=t[1])==null?void 0:p.clientY)||t[0].clientY))/t.length,a=s-r.left,d=i-r.top;return{x:a+n,y:d+o}}handleTouchStart(t){if(t.touches.length===2){if(t.preventDefault(),this.pageOrigin=this.getPageCoordinates(t.touches),!this.pageOrigin)return;this.panning=!0,this.initialDistance=this.getDistance(t.touches[0],t.touches[1])}else if(t.touches.length===1&&this.finalScale>1){let r=this.getPageCoordinates(t.touches);if(!r)return;this.isPanningContent=!0,this.panStart={x:r.x-this.offsetX,y:r.y-this.offsetY}}}handleTouchMove(t){let r=t.currentTarget;if(this.panning&&t.touches.length===2){t.preventDefault();let o=this.getDistance(t.touches[0],t.touches[1])/this.initialDistance;this.tempScale=this.finalScale*o,this.tempScale=Math.max(.5,Math.min(this.tempScale,5));let s=this.tempScale/this.finalScale;this.tempOffsetX=this.pageOrigin.x*(1-s)+this.offsetX*s,this.tempOffsetY=this.pageOrigin.y*(1-s)+this.offsetY*s,r.style.transform=`translate(${this.tempOffsetX}px, ${this.tempOffsetY}px) scale(${this.tempScale})`}else if(this.isPanningContent&&t.touches.length===1&&this.finalScale>1){t.preventDefault();let n=this.getPageCoordinates(t.touches);if(!n)return;this.tempOffsetX=n.x-this.panStart.x,this.tempOffsetY=n.y-this.panStart.y,r.style.transform=`translate(${this.tempOffsetX}px, ${this.tempOffsetY}px) scale(${this.finalScale})`}}handleTouchEnd(t){this.panning&&(this.panning=!1,this.finalScale=this.tempScale,this.offsetX=this.tempOffsetX,this.offsetY=this.tempOffsetY,this.pageOrigin=null),this.isPanningContent&&(this.isPanningContent=!1,this.offsetX=this.tempOffsetX,this.offsetY=this.tempOffsetY)}handleDoubleTap(t){let r=t.currentTarget;this.finalScale=1,this.tempScale=1,this.offsetX=0,this.offsetY=0,this.tempOffsetX=0,this.tempOffsetY=0,r.style.transition="transform 0.25s ease",r.style.transformOrigin="0 0",r.style.transform="translate(0,0) scale(1)",setTimeout(()=>{r.style.transition=""},300)}}});var Xn={};xe(Xn,{activateTab:()=>Rt,addSourceTab:()=>Wn,addTab:()=>Ct,applyPinchAll:()=>Dr,applyZoom:()=>Mn,canGoBack:()=>Rn,canGoForward:()=>An,clearVisited:()=>Cn,closeAllTabs:()=>qn,closeTab:()=>Vt,disposeBridge:()=>Dn,duplicateActive:()=>In,findInActive:()=>zn,getActiveTab:()=>D,getTabs:()=>Lt,getVisited:()=>Br,historyActive:()=>qr,initBridge:()=>Bn,isLocalUrl:()=>rt,isPinchEnabled:()=>Ir,navigateActive:()=>Ne,normalizeUrl:()=>nt,onTabsChange:()=>Pn,printActive:()=>Un,reloadActive:()=>Zt,renderTabStrip:()=>Nn,sendToTab:()=>Ae,setZoomActive:()=>jn,stopActive:()=>$n,toDisplayUrl:()=>_t,toggleDevtoolsActive:()=>Fn});function Lt(){return J.slice()}function D(){return J.find(e=>e.id===Fe)||null}function Br(){return tt.slice()}function Cn(){tt=[],te()}function Rn(){let e=D();return!!(e&&e.historyIndex>0)}function An(){let e=D();return!!(e&&e.historyIndex<e.history.length-1)}function Pn(e){return Mr.push(e),()=>{Mr=Mr.filter(t=>t!==e)}}function te(){Mr.forEach(e=>{try{e(Lt(),D())}catch{}})}function On(e,t){let r=_t(e);!r||r==="about:blank"||r.startsWith("blob:")||(tt=tt.filter(n=>n.url!==r),tt.unshift({url:r,title:t||r.replace(/^https?:\/\//i,""),ts:Date.now()}),tt.length>50&&(tt.length=50))}function rt(e){let t=_t(e);return/^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0|192\.168\.|10\.)/i.test(String(t||""))}function _t(e){let t=String(e||"").trim();if(!t)return"about:blank";let r="/__proxy?url=",n=t.indexOf(r);if(n!==-1)try{let o=t.slice(n+r.length).split("&")[0];return decodeURIComponent(o)}catch{}return t}function nt(e){let t=_t(e);if(!t||t==="about:blank")return"about:blank";if(/^(about:|blob:|data:|https?:\/\/)/i.test(t))return t;if(/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/.*)?$/i.test(t))return"http://"+t;if(!/\s/.test(t)&&/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(t))return"https://"+t;let r=k().browserSearchEngine||"google",n=encodeURIComponent(t);return r==="duckduckgo"?`https://duckduckgo.com/?q=${n}`:r==="bing"?`https://www.bing.com/search?q=${n}`:r==="brave"?`https://search.brave.com/search?q=${n}`:`https://www.google.com/search?q=${n}`}async function Ca(e,t={}){if(!e||e==="about:blank"||e.startsWith("blob:"))return e||"about:blank";if(rt(e))return e;if((k().externalSiteMode||"proxy")==="proxy"){let n=q(),o=n.running&&n.port?n.port:await Yn();if(o)return`http://127.0.0.1:${o}/__proxy?url=${encodeURIComponent(e)}`}return e}function je(){_n&&(clearTimeout(_n),_n=null)}function vs(e,t,r){je()}function Ae(e,t,r){try{return e.iframe.contentWindow.postMessage({ls:1,cmd:t,...r||{}},"*"),!0}catch{return!1}}function Tt(e){var t;try{let r=(t=e.iframe)==null?void 0:t.contentWindow;return r.document,r}catch{return null}}function Mn(e){if(!e)return;let t=e.zoom||100,r=t/100;try{e.iframe&&(e.iframe.style.zoom=String(r),e.iframe.style.transformOrigin="0 0")}catch{}let n=Tt(e);if(n)try{n.document.documentElement.style.zoom=String(r)}catch{}Ae(e,"zoom",{pct:t})}function Ra(e){return J.find(t=>{try{return t.iframe.contentWindow===e}catch{return!1}})}function Hn(e,t){!e||!t||e.history[e.historyIndex]===t||(e.history=e.history.slice(0,e.historyIndex+1),e.history.push(t),e.historyIndex=e.history.length-1)}function bs(e){let t=e.data;if(!t||t.ls!==1)return;let r=Ra(e.source);if(r)if(r.bridge=!0,t.type==="meta"){if(je(),r.loading=!1,t.href&&t.href!=="about:blank"){let n=_t(t.href);n!==r.url&&(r.url=n,Hn(r,n))}r.pinTitle||(r.title=String(t.title||r.url.replace(/^https?:\/\//,"")).slice(0,60)),t.favicon&&(r.favicon=t.favicon),(r.zoom||100)!==100&&Ae(r,"zoom",{pct:r.zoom}),On(r.url,r.title),te()}else t.type==="devtools"?(r.devtools=!!t.on,te()):t.type==="need-devtools"?fs().then(n=>{if(!n)return gs("Suger DevTool file missing (devtool/suger-dev.js). Reinstall the plugin.",3500);Ae(r,"devtools",{on:!0,code:n})}):t.type==="devtools-error"&&gs("DevTool: "+t.message,3e3)}function ys(e){var t,r;if(e!=null&&e.iframe)try{let n=k().enablePinchToZoom!==!1;n&&!e.zoomHandler?e.zoomHandler=new Or(e.iframe):!n&&e.zoomHandler&&((r=(t=e.zoomHandler).destroy)==null||r.call(t),e.zoomHandler=null)}catch(n){console.warn("[LiveServer] ZoomHandler",n)}}function Dr(){J.forEach(ys)}function Ir(){return k().enablePinchToZoom!==!1}function Bn(){window.addEventListener("message",bs),window.addEventListener("liveserver-settings",ws)}function Dn(){je(),window.removeEventListener("message",bs),window.removeEventListener("liveserver-settings",ws)}function Tn(e,t){!String(t||"").includes("/__proxy?url=")&&(rt(t)||t==="about:blank"||t.startsWith("blob:"))?e.setAttribute("sandbox","allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads"):e.removeAttribute("sandbox")}async function Hr(e,t,r={}){je();let n=k().externalSiteMode||"proxy";e.useChromium=!1;let o=nt(t);if(r.pushHistory!==!1&&Hn(e,o),e.url=o,e.devtools=!1,e.useChromium=!1,o==="about:blank"){e.loading=!1,e.title="New tab",e.favicon=null,Tn(e.iframe,"about:blank"),e.iframe.src="about:blank",te();return}e.loading=!0,e.pinTitle||(e.title=o.replace(/^https?:\/\//i,"")),te(),vs(e,o,e.useChromium);let s=await Ca(o,{useChromium:e.useChromium});Tn(e.iframe,s),e.iframe.src=s,On(o,e.title),te()}function Ct(e,t,r){let n=Ta++,o=document.createElement("iframe");o.className="ls-browser-frame",o.setAttribute("allow","fullscreen; clipboard-read; clipboard-write");let s=t?nt(t):"about:blank",i={id:n,url:s,title:r||(s==="about:blank"?"New tab":s.replace(/^https?:\/\//i,"")),iframe:o,loading:s!=="about:blank",favicon:null,zoom:100,pinTitle:!!r,useChromium:!1,history:[s],historyIndex:0};return e.appendChild(o),ys(i),J.push(i),J.forEach(a=>{a.iframe&&(a.iframe.style.display=a.id===n?"block":"none")}),Fe=n,o.addEventListener("load",()=>{je(),i.loading=!1,i.devtools=!1;let a=Tt(i);if(a)try{let u=a.__LS_PROXY_TARGET__||_t(a.location.href);u&&u!=="about:blank"&&u!==i.url&&(i.url=u,Hn(i,u)),i.pinTitle||(a.document.title?i.title=a.document.title.slice(0,60):i.url!=="about:blank"&&(i.title=i.url.replace(/^https?:\/\//,"")));let p=a.document.querySelector('link[rel~="icon"]');p!=null&&p.href&&(i.favicon=p.href)}catch{}else!i.pinTitle&&i.url!=="about:blank"&&(i.title=i.url.replace(/^https?:\/\//,""));if(!i.favicon&&/^https?:/i.test(i.url))try{i.favicon=new URL("/favicon.ico",i.url).href}catch{}Mn(i),On(i.url,i.title),te()}),s==="about:blank"?(Tn(o,"about:blank"),o.src="about:blank",te()):Hr(i,s,{pushHistory:!1}),i}function In(e){let t=D();return t?Ct(e,t.url,t.title):null}function Rt(e){J.some(t=>t.id===e)&&(Fe=e,J.forEach(t=>{t.iframe&&(t.iframe.style.display=t.id===e?"block":"none")}),te())}function Vt(e){var n;let t=J.findIndex(o=>o.id===e);if(t<0)return J.length;let[r]=J.splice(t,1);r.id===Fe&&je();try{(n=r.iframe)==null||n.remove()}catch{}if(Fe===e)if(J.length){let o=J[Math.min(t,J.length-1)];Rt(o.id)}else Fe=null,te();else te();return J.length}function qn(){je(),J.forEach(e=>{var t;try{(t=e.iframe)==null||t.remove()}catch{}}),J=[],Fe=null,te()}function Ne(e,t={}){let r=D();r!=null&&r.iframe&&Hr(r,e,{pushHistory:!0,useChromium:!1})}function Zt(){let e=D();if(!(e!=null&&e.iframe))return;if(e.url==="about:blank"){te();return}e.loading=!0,vs(e,e.url,e.useChromium);let t=Tt(e),r=!1;if(t)try{t.location.reload(),r=!0}catch{}!r&&!(e.bridge&&Ae(e,"reload"))&&(e.iframe.src=e.iframe.src),te()}function $n(){je();let e=D();if(!(e!=null&&e.iframe))return;let t=Tt(e);if(t)try{t.stop()}catch{}else Ae(e,"stop");e.loading=!1,te()}function qr(e){let t=D();if(t){if(e<0&&t.historyIndex>0){t.historyIndex-=1;let r=t.history[t.historyIndex];Hr(t,r,{pushHistory:!1});return}if(e>0&&t.historyIndex<t.history.length-1){t.historyIndex+=1;let r=t.history[t.historyIndex];Hr(t,r,{pushHistory:!1});return}}}function zn(e,t){var o;let r=D();if(!r||!e)return;let n=Tt(r);if(n)try{(o=n.find)==null||o.call(n,e,!1,!!t,!0,!1,!1,!1);return}catch{}Ae(r,"find",{q:e,back:!!t})}function Un(){let e=D();if(!e)return!1;let t=Tt(e);if(t)try{return t.print(),!0}catch{}return Ae(e,"print")}function Fn(){let e=D();return!e||!e.bridge?!1:Ae(e,"devtools",{on:!e.devtools})}function jn(e){let t=D();return t?(t.zoom=Math.min(500,Math.max(25,Math.round(e))),Mn(t),te(),t.zoom):100}function Nn(e){e&&(e.innerHTML="",J.forEach(t=>{let r=document.createElement("div");r.className="ls-tab"+(t.id===Fe?" is-active":"")+(t.loading?" is-loading":""),r.setAttribute("role","tab"),r.title=t.title||"";let n=document.createElement("span");if(n.className="ls-fav",t.loading)n.classList.add("is-spin");else if(t.favicon){let i=document.createElement("img");i.src=t.favicon,i.alt="",i.addEventListener("error",()=>{n.innerHTML=P(A.globe,14)}),n.appendChild(i)}else n.innerHTML=P(A.globe,14);r.appendChild(n);let o=document.createElement("span");o.className="ls-tab-label",o.textContent=t.title||"Tab",r.appendChild(o);let s=document.createElement("span");s.className="ls-tab-x",s.setAttribute("role","button"),s.title="Close tab",s.innerHTML=P(A.close,12),s.addEventListener("click",i=>{i.stopPropagation(),Vt(t.id)}),r.appendChild(s),r.addEventListener("click",()=>Rt(t.id)),e.appendChild(r)}))}function Wn(e,t,r){let n=Ct(e,"about:blank",t||"view-source");n.pinTitle=!0,n.loading=!1,n.url=t||"view-source";try{n.iframe.removeAttribute("sandbox")}catch{}try{n.iframe.srcdoc=r}catch{let s=new Blob([r],{type:"text/html;charset=utf-8"});n.iframe.src=URL.createObjectURL(s)}return n.loading=!1,te(),n}var gs,J,Fe,Ta,Mr,tt,_n,ws,$r=R(()=>{Gt();hs();K();Q();ue();Ar();ms();gs=acode.require("toast"),J=[],Fe=null,Ta=1,Mr=[],tt=[],_n=null;ws=e=>{var t;((t=e==null?void 0:e.detail)==null?void 0:t.key)==="enablePinchToZoom"&&Dr()}});function Kt(e,t=20){return`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${e}"/></svg>`}var Gn=R(()=>{});function fe(e,t){let r=document.createElement(e);return t&&(r.className=t),r}function Jt(){ge&&ge.close()}function xs(){return!!ge}function Qt({host:e,anchor:t,items:r,onClose:n}){if(Jt(),!e||!(r!=null&&r.length))return{close(){}};let o=fe("div","ls-dd-layer"),s=fe("div","ls-dd-backdrop");o.appendChild(s),e.appendChild(o);let i=[],a=!1;function d(l){for(;i.length>l;)i.pop().remove()}function u(){if(!a){a=!0,document.removeEventListener("keydown",p,!0);try{o.remove()}catch{}ge&&ge.close===u&&(ge=null);try{n==null||n()}catch{}}}function p(l){l.key==="Escape"&&(l.stopPropagation(),u())}function c(l,v,T){let x=e.getBoundingClientRect(),_=l.offsetWidth,O=l.offsetHeight,C,b;v===0?(b=T.bottom-x.top+2,C=T.right-x.left-_,C<4&&(C=T.left-x.left)):(b=T.top-x.top-4,C=T.right-x.left-2,C+_>x.width-4&&(C=T.left-x.left-_+2)),C+_>x.width-4&&(C=x.width-_-4),C<4&&(C=4);let M=x.height-b-4;O>M&&x.height&&(v>0&&x.height-O-4>0?b=x.height-O-4:l.style.maxHeight=Math.max(M,80)+"px"),b<4&&(b=4),l.style.left=C+"px",l.style.top=b+"px"}function g(l,v,T){d(v);let x=fe("div","ls-dd-menu");return x.setAttribute("role","menu"),x.style.visibility="hidden",l.forEach(_=>{if(_.separator){x.appendChild(fe("div","ls-dd-sep"));return}if(_.render){let I=fe("div","ls-dd-custom");_.render(I,u),x.appendChild(I);return}let O=fe("div","ls-dd-item"+(_.disabled?" is-disabled":""));O.setAttribute("role","menuitem");let C=fe("span","ls-dd-check");_.checked&&(C.innerHTML=Kt(Aa,14)),O.appendChild(C);let b=fe("span","ls-dd-label");if(b.textContent=_.label,O.appendChild(b),_.children){let I=fe("span","ls-dd-arrow");I.innerHTML=Kt(Pa,14),O.appendChild(I)}let M=()=>{x.querySelectorAll(".ls-dd-item.is-active").forEach(I=>I.classList.remove("is-active")),O.classList.add("is-active"),g(_.children,v+1,O.getBoundingClientRect())},$=()=>{d(v+1),O.classList.remove("is-active")};O.addEventListener("pointerenter",I=>{I.pointerType&&I.pointerType!=="mouse"||(_.children?M():(d(v+1),x.querySelectorAll(".ls-dd-item.is-active").forEach(m=>m.classList.remove("is-active"))))}),O.addEventListener("click",I=>{var m;if(I.stopPropagation(),!_.disabled){if(_.children){O.classList.contains("is-active")&&i.length>v+1?$():M();return}u();try{(m=_.onClick)==null||m.call(_)}catch(y){console.warn("[LiveServer] menu item",y)}}}),x.appendChild(O)}),o.appendChild(x),i.push(x),c(x,v,T),x.style.visibility="",x}s.addEventListener("click",l=>{l.stopPropagation(),u()}),s.addEventListener("contextmenu",l=>{l.preventDefault(),u()}),document.addEventListener("keydown",p,!0);let h=t?t.getBoundingClientRect():e.getBoundingClientRect();return g(r,0,h),ge={close:u},{close:u}}function Ss({host:e,anchor:t,render:r,onClose:n}){if(Jt(),!e)return{close(){}};let o=fe("div","ls-dd-layer"),s=fe("div","ls-dd-backdrop"),i=fe("div","ls-dd-menu ls-dd-panel");o.append(s,i),e.appendChild(o);let a=!1;function d(){if(!a){a=!0,document.removeEventListener("keydown",u,!0);try{o.remove()}catch{}ge&&ge.close===d&&(ge=null);try{n==null||n()}catch{}}}function u(l){l.key==="Escape"&&(l.stopPropagation(),d())}s.addEventListener("click",l=>{l.stopPropagation(),d()}),document.addEventListener("keydown",u,!0),r(i,d);let p=e.getBoundingClientRect(),c=t?t.getBoundingClientRect():p,g=i.offsetWidth,h=c.right-p.left-g;return h>p.width-g-4&&(h=p.width-g-4),h<4&&(h=4),i.style.left=h+"px",i.style.top=c.bottom-p.top+2+"px",ge={close:d},{close:d,panel:i}}var Aa,Pa,ge,er=R(()=>{Gn();Aa="M20 6L9 17l-5-5",Pa="M9 18l6-6-6-6",ge=null});async function Oa(e){var t;try{if((t=navigator.clipboard)!=null&&t.writeText)await navigator.clipboard.writeText(e);else{let r=document.createElement("textarea");r.value=e,document.body.appendChild(r),r.select(),document.execCommand("copy"),r.remove()}Vn("URL copied",1500)}catch{Vn(e||"No URL",2500)}}async function Ma(){let{getServerStatus:e}=await Promise.resolve().then(()=>(ue(),Qe)),t=e();return t.url?t.url.replace(/\/[^/]*$/,"/"):t.port?"http://127.0.0.1:"+t.port+"/":null}function ks(e,t=38){return e=String(e||""),e.length>t?e.slice(0,t-1)+"\u2026":e}function Ha(e){return{render(t){var u,p;let r=document.createElement("div");r.className="ls-zoomrow";let n=document.createElement("span");n.className="ls-zl",n.textContent="Zoom";let o=document.createElement("button");o.type="button",o.className="ls-ib",o.innerHTML=P(A.minus,14);let s=document.createElement("span");s.className="ls-zv",s.textContent=((p=(u=e.getZoom)==null?void 0:u.call(e))!=null?p:100)+"%";let i=document.createElement("button");i.type="button",i.className="ls-ib",i.innerHTML=P(A.plus,14);let a=document.createElement("button");a.type="button",a.className="ls-ib",a.title="Fullscreen",a.innerHTML=P(A.maximize,14);let d=c=>{var h;let g=(h=e.zoom)==null?void 0:h.call(e,c);g!=null&&(s.textContent=g+"%")};o.addEventListener("click",c=>{c.stopPropagation(),d(-10)}),i.addEventListener("click",c=>{c.stopPropagation(),d(10)}),s.style.cursor="pointer",s.addEventListener("click",c=>{var h;c.stopPropagation();let g=(h=e.zoom)==null?void 0:h.call(e,0,!0);g!=null&&(s.textContent=g+"%")}),a.addEventListener("click",c=>{var g;c.stopPropagation(),(g=e.toggleFullscreen)==null||g.call(e)}),r.append(n,o,s,i,a),t.appendChild(r)}}}function Zn(e,t){var i,a,d,u,p,c,g,h;let r=((i=e.getVisited)==null?void 0:i.call(e))||[],n=((a=e.getBookmarks)==null?void 0:a.call(e))||[],o=!!((d=e.isBookmarked)!=null&&d.call(e)),s=[{label:"New tab",onClick:()=>{var l;return(l=e.newTab)==null?void 0:l.call(e)}},{label:"Duplicate tab",onClick:()=>{var l;return(l=e.duplicateTab)==null?void 0:l.call(e)}},{separator:!0},{label:"History",children:r.length?[...r.slice(0,15).map(l=>({label:ks(l.title||l.url),onClick:()=>{var v;return(v=e.navigate)==null?void 0:v.call(e,l.url)}})),{separator:!0},{label:"Clear history",onClick:()=>{var l;return(l=e.clearHistory)==null?void 0:l.call(e)}}]:[{label:"No history yet",disabled:!0}]},{label:"Bookmarks",children:[{label:o?"Remove bookmark for this tab":"Bookmark this tab",onClick:()=>{var l;return(l=e.toggleBookmark)==null?void 0:l.call(e)}},...n.length?[{separator:!0}]:[],...n.map(l=>({label:ks(l.title||l.url),onClick:()=>{var v;return(v=e.navigate)==null?void 0:v.call(e,l.url)}}))]},{separator:!0},Ha(e),{label:"Pinch to zoom",checked:!!((u=e.isPinch)!=null&&u.call(e)),onClick:()=>{var l;return(l=e.togglePinch)==null?void 0:l.call(e)}},{label:"Print\u2026",onClick:()=>{var l;return(l=e.print)==null?void 0:l.call(e)}},{label:"Find\u2026",onClick:()=>{var l;return(l=e.find)==null?void 0:l.call(e)}},{label:"Developer tools",checked:!!((p=e.isDevtools)!=null&&p.call(e)),onClick:()=>{var l;return(l=e.toggleDevtools)==null?void 0:l.call(e)}},{separator:!0},{label:"More tools",children:[{label:"Device mode (responsive)",checked:!!((c=e.isDeviceMode)!=null&&c.call(e)),onClick:()=>{var l;return(l=e.toggleDeviceMode)==null?void 0:l.call(e)}},{label:"View page source",onClick:()=>{var l;return(l=e.viewSource)==null?void 0:l.call(e)}},{separator:!0},{label:"Zoom in",onClick:()=>{var l;return(l=e.zoom)==null?void 0:l.call(e,10)}},{label:"Zoom out",onClick:()=>{var l;return(l=e.zoom)==null?void 0:l.call(e,-10)}},{label:"Reset zoom",onClick:()=>{var l;return(l=e.zoom)==null?void 0:l.call(e,0,!0)}},{separator:!0},{label:"Open server root",onClick:async()=>{var v;let l=await Ma();l?(v=e.navigate)==null||v.call(e,l):Vn("Server not running",2e3)}},{label:"Copy current URL",onClick:()=>{var l;return Oa(((l=e.getUrl)==null?void 0:l.call(e))||"")}},{label:"Open in external browser",onClick:()=>{var l;return(l=e.openExternal)==null?void 0:l.call(e)}},{separator:!0},{label:"Close other tabs",onClick:()=>{var l;return(l=e.closeOtherTabs)==null?void 0:l.call(e)}},{label:"Close current tab",onClick:()=>{var l;return(l=e.closeTab)==null?void 0:l.call(e)}}]},{label:"Opacity\u2026",onClick:()=>{var l;return(l=e.openOpacity)==null?void 0:l.call(e)}},{label:"Preview as overlay",checked:!!((g=e.isOverlay)!=null&&g.call(e)),disabled:!((h=e.canOverlay)!=null&&h.call(e)),onClick:()=>{var l;return(l=e.toggleOverlay)==null?void 0:l.call(e)}},{separator:!0},{label:"Settings",onClick:async()=>{let{openSettingsHub:l}=await Promise.resolve().then(()=>(tr(),zr));l()}},{label:"Exit",onClick:()=>{var l;return(l=e.closeBrowser)==null?void 0:l.call(e)}}];return Qt({host:t.host,anchor:t.anchor,items:s})}var Vn,Es=R(()=>{er();Gt();Vn=acode.require("toast")});function ot(e){let t=parseFloat(e);return Number.isFinite(t)?Math.min(Kn,Math.max(Ur,Math.round(t*100)/100)):1}function Ls(e){return String(ot(e)).replace(/(\.\d)0$/,"$1")}function _s(e,t,r){let n=document.createElement("div");n.className="ls-op-row"+(r?" is-disabled":"");let o=document.createElement("span");o.textContent=e;let s=document.createElement("span");return s.className="ls-switch"+(t?" is-on":""),n.append(o,s),{r:n,sw:s}}function Ts({host:e,anchor:t,get:r,set:n}){return Ss({host:e,anchor:t,render(o){let s=r(),i=document.createElement("div");i.className="ls-op-head";let a=document.createElement("span");a.textContent="Browser opacity";let d=document.createElement("span");d.className="ls-op-val",d.textContent=Ls(s.opacity),i.append(a,d);let u=document.createElement("input");u.type="range",u.className="ls-range",u.min=String(Ur),u.max=String(Kn),u.step="0.05",u.value=String(ot(s.opacity));let p=()=>{let l=(u.value-Ur)/(Kn-Ur)*100;u.style.setProperty("--ls-fill",l+"%")};p(),u.addEventListener("input",()=>{p(),d.textContent=Ls(u.value),n({opacity:ot(u.value)})});let c=_s("Preview as overlay",s.overlay,!s.canOverlay),g=_s("Auto-save while typing",s.autoSave,!1);g.r.style.display=s.overlay?"":"none",c.r.addEventListener("click",()=>{let l=!c.sw.classList.contains("is-on");c.sw.classList.toggle("is-on",l),g.r.style.display=l?"":"none",n({overlay:l})}),g.r.addEventListener("click",()=>{let l=!g.sw.classList.contains("is-on");g.sw.classList.toggle("is-on",l),n({autoSave:l})});let h=document.createElement("div");h.className="ls-op-hint",h.textContent=s.canOverlay?"Overlay: the preview is see-through and you can keep editing underneath.":"Overlay needs the Acode page display mode.",o.append(i,u,c.r,g.r,h)}})}var Ur,Kn,Cs=R(()=>{er();Ur=.1,Kn=1});function jr(e){return Fr.find(t=>t.id===e)||Fr[0]}function Pe(e){let t=Math.round(Number(e));return Number.isFinite(t)?Math.min(Ba,Math.max(Qn,t)):null}function Rs(e,t,r,n,o){return e!=="fit"?Math.max(.1,Number(e)/100):!n||!o?1:Math.min(1,n/t,o/r)}var Fr,Jn,Qn,Ba,As=R(()=>{Fr=[{id:"responsive",name:"Responsive",w:390,h:844},{id:"iphone-se",name:"iPhone SE",w:375,h:667},{id:"iphone-xr",name:"iPhone XR",w:414,h:896},{id:"iphone-12-pro",name:"iPhone 12 Pro",w:390,h:844},{id:"iphone-14-pro-max",name:"iPhone 14 Pro Max",w:430,h:932},{id:"pixel-7",name:"Pixel 7",w:412,h:915},{id:"galaxy-s8-plus",name:"Samsung Galaxy S8+",w:360,h:740},{id:"galaxy-s20-ultra",name:"Samsung Galaxy S20 Ultra",w:412,h:915},{id:"galaxy-fold",name:"Galaxy Fold",w:280,h:653},{id:"surface-duo",name:"Surface Duo",w:540,h:720},{id:"ipad-mini",name:"iPad Mini",w:768,h:1024},{id:"ipad-air",name:"iPad Air",w:820,h:1180},{id:"ipad-pro",name:"iPad Pro",w:1024,h:1366},{id:"surface-pro-7",name:"Surface Pro 7",w:912,h:1368},{id:"nest-hub",name:"Nest Hub",w:1024,h:600},{id:"nest-hub-max",name:"Nest Hub Max",w:1280,h:800},{id:"laptop",name:"Laptop 1366",w:1366,h:768},{id:"desktop",name:"Desktop 1920",w:1920,h:1080}],Jn=["fit",25,50,75,100,125,150,200];Qn=50,Ba=9999});function Oe(e,t,r){let n=document.createElement(e);return t&&(n.className=t),r!=null&&(n.innerHTML=r),n}function Ps({shell:e,stage:t,box:r,device:n,bar:o,onChange:s}){let i={on:!1,id:"responsive",w:390,h:844,zoom:"fit"},a=1,d=null,u=Oe("button","ls-dev-btn ls-dev-device");u.type="button";let p=Oe("input","ls-dev-num"),c=Oe("input","ls-dev-num");[p,c].forEach(m=>{m.type="number",m.min=String(Qn),m.inputMode="numeric"});let g=Oe("span","ls-dev-x","&times;"),h=Oe("button","ls-dev-btn ls-dev-zoom");h.type="button";let l=Oe("button","ls-dev-icon",P(A.rotate,16));l.type="button",l.title="Rotate";let v=Oe("button","ls-dev-icon",P(A.close,16));v.type="button",v.title="Close device mode";let T=Oe("span","ls-dev-spacer");o.append(u,p,g,c,h,l,T,v);function x(){try{s==null||s({...i})}catch{}}function _(){return i.zoom==="fit"?"Fit to window ("+Math.round(a*100)+"%)":i.zoom+"%"}function O(){u.innerHTML="<span>"+jr(i.id).name+"</span>"+P(A.down,12),document.activeElement!==p&&(p.value=String(i.w)),document.activeElement!==c&&(c.value=String(i.h)),h.innerHTML="<span>"+_()+"</span>"+P(A.down,12)}function C(){if(e.classList.toggle("is-device",i.on),o.hidden=!i.on,!i.on){r.style.width="",r.style.height="",n.style.width="",n.style.height="",n.style.transform="";return}let m=t.clientWidth-24,y=t.clientHeight-24;a=Rs(i.zoom,i.w,i.h,m,y),r.style.width=Math.round(i.w*a)+"px",r.style.height=Math.round(i.h*a)+"px",n.style.width=i.w+"px",n.style.height=i.h+"px",n.style.transform="scale("+a+")",O()}function b(m,y,oe){let ye=Pe(m),Ve=Pe(y);ye!=null&&(i.w=ye),Ve!=null&&(i.h=Ve),oe||(i.id="responsive"),C(),x()}function M(m){let y=jr(m);i.id=y.id,i.w=y.w,i.h=y.h,C(),x()}u.addEventListener("click",()=>{Qt({host:e,anchor:u,items:Fr.map(m=>({label:m.id==="responsive"?m.name:m.name+"  "+m.w+" x "+m.h,checked:m.id===i.id,onClick:()=>M(m.id)}))})}),h.addEventListener("click",()=>{Qt({host:e,anchor:h,items:Jn.map(m=>({label:m==="fit"?"Fit to window":m+"%",checked:m===i.zoom,onClick:()=>{i.zoom=m,C(),x()}}))})}),l.addEventListener("click",()=>b(i.h,i.w,!0)),v.addEventListener("click",()=>I.toggle(!1));let $=()=>b(p.value,c.value);[p,c].forEach(m=>{m.addEventListener("change",$),m.addEventListener("keydown",y=>{y.key==="Enter"&&($(),m.blur())})}),["r","b","c"].forEach(m=>{let y=Oe("div","ls-hdl ls-hdl-"+m);r.appendChild(y),y.addEventListener("pointerdown",oe=>{oe.preventDefault(),oe.stopPropagation();let ye=oe.clientX,Ve=oe.clientY,Mt=i.w,fr=i.h;try{y.setPointerCapture(oe.pointerId)}catch{}n.style.pointerEvents="none";let Le=ut=>{var F,V;let Ht=a||1,f=m==="b"?Mt:Mt+(ut.clientX-ye)/Ht,w=m==="r"?fr:fr+(ut.clientY-Ve)/Ht;i.id="responsive",i.w=(F=Pe(f))!=null?F:i.w,i.h=(V=Pe(w))!=null?V:i.h,C()},Ze=()=>{y.removeEventListener("pointermove",Le),y.removeEventListener("pointerup",Ze),y.removeEventListener("pointercancel",Ze),n.style.pointerEvents="",x()};y.addEventListener("pointermove",Le),y.addEventListener("pointerup",Ze),y.addEventListener("pointercancel",Ze)})}),typeof ResizeObserver=="function"&&(d=new ResizeObserver(()=>{i.on&&i.zoom==="fit"&&C()}),d.observe(t));let I={getState:()=>({...i}),getScale:()=>a,isOn:()=>i.on,setState(m){m&&(typeof m.id=="string"&&(i.id=jr(m.id).id),Pe(m.w)!=null&&(i.w=Pe(m.w)),Pe(m.h)!=null&&(i.h=Pe(m.h)),m.zoom!=null&&(i.zoom=Jn.includes(m.zoom)?m.zoom:"fit"),i.on=!!m.on,C())},toggle(m){return i.on=m==null?!i.on:!!m,C(),x(),i.on},layout:C,destroy(){try{d==null||d.disconnect()}catch{}}};return O(),I}var Os=R(()=>{Gt();er();As()});function rr(e,t){if(!e)return;let r=t==null?!e.classList.contains("is-fullscreen"):!!t;return e.classList.toggle("is-fullscreen",r),document.body.classList.toggle("ls-browser-fs",r),r}function Ms(e){return rr(e,!1)}var Hs=R(()=>{});function Bs(e,t={}){var O,C;let r=acode.require("page"),n=acode.require("actionStack"),o="liveserver-browser-page-"+ ++Da,s=document.createElement("span");s.className="icon arrow_back",s.dataset.action="back",s.style.cssText="pointer-events:auto;cursor:pointer;";let i=r(t.title||"Live Preview",{lead:s}),a=i.body||i,d=i.header||((O=i.querySelector)==null?void 0:O.call(i,"header"));d&&(d.style.display="none"),Object.assign(a.style,{position:"absolute",inset:"0",top:"0",left:"0",right:"0",bottom:"0",width:"auto",height:"auto",padding:"0",margin:"0",overflow:"hidden"}),e.classList.add("is-in-page"),typeof i.appendBody=="function"?i.appendBody(e):a.appendChild(e);let u=!1,p=null,c=()=>{var M;let b=!1;try{b=!!((M=t.onBack)!=null&&M.call(t))}catch{}if(b){try{n.remove(o),n.push({id:o,action:c})}catch{}return}h()};function g(){try{n.remove(o),n.push({id:o,action:c})}catch{}}function h(){if(!u){try{n.remove(o)}catch{}try{i.style.display="none"}catch{}}}function l(){var b;if(!u){try{i.style.display="",i.isConnected||(window.app||document.body).append(i),(b=i.show)==null||b.call(i)}catch{}g()}}function v(b){var M,$,I;if(!u){u=!0;try{window.removeEventListener("resize",_)}catch{}try{n.remove(o)}catch{}try{(M=i.hide)==null||M.call(i)}catch{}try{($=i.remove)==null||$.call(i)}catch{}if(b)try{(I=t.onClose)==null||I.call(t)}catch{}}}s.onclick=b=>{var M,$;try{(M=b==null?void 0:b.preventDefault)==null||M.call(b),($=b==null?void 0:b.stopPropagation)==null||$.call(b)}catch{}h()};try{i.onhide=()=>{u||h()}}catch{}(window.app||document.body).append(i);try{getComputedStyle(i).position==="static"&&Object.assign(i.style,{position:"absolute",inset:"0",width:"100%",height:"100%"})}catch{}try{(C=i.show)==null||C.call(i)}catch{}g();let T=()=>{var b,M;try{let $=(b=window.editorManager)==null?void 0:b.container,I=(M=$==null?void 0:$.getBoundingClientRect)==null?void 0:M.call($);if(I&&I.width>0&&I.height>0)return I}catch{}return{left:0,top:0,width:window.innerWidth,height:window.innerHeight}},x=()=>{let b=T();i.style.left=b.left+"px",i.style.top=b.top+"px",i.style.width=b.width+"px",i.style.height=b.height+"px"},_=()=>{p!=null&&x()};return window.addEventListener("resize",_),{page:i,show:l,minimize:h,setAppearance({overlay:b,opacity:M}){b?(p==null&&(p=i.style.cssText),Object.assign(i.style,{position:"fixed",background:"transparent",pointerEvents:"none",opacity:"1"}),x(),a.style.background="transparent"):(p!=null&&(i.style.cssText=p,p=null),a.style.background="",i.style.opacity=M<1?String(M):"")},close:()=>{window.removeEventListener("resize",_),v(!1)},onFullscreen(){}}}var Da,Ds=R(()=>{Da=0});function qa(){for(let e of["editorFile","EditorFile"])try{let t=acode.require(e);if(typeof t=="function")return t}catch{}return null}async function Is(e,t={}){var u;let r=qa();if(!r)return null;e.classList.add("is-in-tab");let n=t.title||"Live Preview",o="liveserver-preview-"+Date.now()+"-"+ ++Ia,s=null,i=[{type:"custom",content:e,stylesheets:t.css?[t.css]:[],hideQuickTools:!0,id:o,render:!0},{type:"page",content:e,stylesheets:t.css?[t.css]:[],id:o,render:!0}];for(let p of i)try{s=new r(n,p);break}catch(c){console.warn("[LiveServer] EditorFile "+p.type,c),s=null}if(!s)return e.classList.remove("is-in-tab"),null;let a=!1,d=()=>{var p;if(!a){a=!0;try{(p=t.onClose)==null||p.call(t)}catch{}}};try{(u=s.on)==null||u.call(s,"close",d)}catch{}try{s.onclose=d}catch{}return{file:s,show(){var p;if(!a)try{(p=s.makeActive)==null||p.call(s)}catch{}},close(){var p,c;if(!a){a=!0;try{(p=s.remove)==null||p.call(s,!0)}catch{try{(c=s.remove)==null||c.call(s)}catch{}}}},onFullscreen(){},setAppearance(){}}}var Ia,qs=R(()=>{Ia=0});var zs={};xe(zs,{destroyAcodeWebview:()=>Ua,isNativeWebviewSupported:()=>za,openInAcodeWebview:()=>eo});function $s(e){var t,r,n;try{return(r=(t=window.cordova)==null?void 0:t.InAppBrowser)!=null&&r.open?(window.cordova.InAppBrowser.open(e,"_system"),!0):(n=window.cordova)!=null&&n.exec?(window.cordova.exec(null,null,"System","open-in-browser",[e]),!0):(window.open(e,"_blank","noopener"),!0)}catch{return $a(e,2500),!1}}function za(){try{let e=acode.require("webview");return!!(e&&typeof e.create=="function")}catch{return!1}}async function eo(e,t={}){if(!e||e==="about:blank")return!1;let r=null;try{r=acode.require("webview")}catch{}if(!(r!=null&&r.create))return $s(e);if(ve)try{return await ve.loadURL(e),await ve.show(),!0}catch{ve=null}try{let n=await r.create({mode:"fullscreen",title:t.title||e.replace(/^https?:\/\//i,""),allowNavigation:!0,allowDownloads:t.allowDownloads!==!1,visible:!0});return ve=n,n.on("closed",()=>{ve===n&&(ve=null)}),await n.loadURL(e),!0}catch(n){return console.warn("[LiveServer] native webview failed, falling back:",n),ve=null,$s(e)}}async function Ua(){if(!ve)return;let e=ve;ve=null;try{await e.destroy()}catch{}}var $a,ve,to=R(()=>{$a=acode.require("toast"),ve=null});var at={};xe(at,{createBrowserShell:()=>Ja,hideBrowser:()=>Pt,openBrowser:()=>oo,openBrowserMenu:()=>Zn});function Ws(){return k().browserDisplayMode==="editorTab"?"editorTab":"inPage"}function Wa(e,t){try{return new URL(e).origin===new URL(t).origin}catch{return!1}}function st(){let e=k().browserBookmarks;return Array.isArray(e)?e:[]}async function Xa(){let{getServerStatus:e}=await Promise.resolve().then(()=>(ue(),Qe)),t=e();return t.url?t.url.replace(/\/[^/]*$/,"/"):t.port?"http://127.0.0.1:"+t.port+"/":null}function Fs(e){var t,r,n;if(!(!e||e==="about:blank"))try{if((r=(t=window.cordova)==null?void 0:t.InAppBrowser)!=null&&r.open){window.cordova.InAppBrowser.open(e,"_system");return}if((n=window.cordova)!=null&&n.exec){window.cordova.exec(null,null,"System","open-in-browser",[e]);return}window.open(e,"_blank","noopener")}catch{ne(e,2500)}}function Ya(){if(!(At||typeof editorManager=="undefined"||!(editorManager!=null&&editorManager.on))){At=()=>{k().overlayAutoSave!==!1&&(clearTimeout(ro),ro=setTimeout(async()=>{var r;let e=G(),t=(e==null?void 0:e.filename)||(e==null?void 0:e.name)||"";if(e&&e.isUnsaved&&(e.uri||e.url)&&ja.test(t))try{await((r=e.save)==null?void 0:r.call(e))}catch(n){console.warn("[LiveServer] overlay auto-save",n)}},700))};try{editorManager.on("update",At)}catch{}}}function Xs(){var e;if(clearTimeout(ro),At)try{(e=editorManager==null?void 0:editorManager.off)==null||e.call(editorManager,"update",At)}catch{}At=null}function Wr(){return it==="page"&&!!k().browserOverlay}function no(){var n,o;if(!N)return;let e=k(),t=ot((n=e.browserOpacity)!=null?n:1),r=Wr();N.classList.toggle("is-overlay",r),N.classList.toggle("no-url",e.showAddressBar===!1),N.style.setProperty("--ls-op",String(t)),it==="page"?((o=j==null?void 0:j.setAppearance)==null||o.call(j,{overlay:r,opacity:t}),N.style.opacity=""):N.style.opacity=t<1?String(t):"",r?Ya():Xs(),Z==null||Z.layout()}function js(e){if("opacity"in e&&H("browserOpacity",ot(e.opacity)),"overlay"in e){if(e.overlay&&it!=="page"){ne("Overlay needs the Acode page display mode",2200);return}H("browserOverlay",!!e.overlay)}"autoSave"in e&&H("overlayAutoSave",!!e.autoSave),no()}function Ga(e){var Ze,ut,Ht;let t=f=>e.querySelector(f),r=t(".ls-browser-tabs"),n=t(".ls-stage"),o=t(".ls-box"),s=t(".ls-device"),i=t(".ls-ntp"),a=t(".ls-back"),d=t(".ls-fwd"),u=t(".ls-browser-url"),p=t(".ls-reload"),c=t(".ls-star"),g=t(".ls-site"),h=t(".ls-menu-btn"),l=t(".ls-op-btn"),v=t(".ls-dev-toggle"),T=t(".ls-find"),x=T.querySelector("input"),_=!1;Z=Ps({shell:e,stage:n,box:o,device:s,bar:t(".ls-devbar"),onChange:f=>H("browserDevice",f)});let O=k().browserDevice;O&&typeof O=="object"&&Z.setState(O);let C=()=>e.getRootNode().activeElement===u,b=async f=>{if(f==="about:blank"){Ne("about:blank");return}let w=nt(f);if(!w||w==="about:blank"){Ne("about:blank");return}if(!rt(w)){let F=k().externalSiteMode||"proxy";if(F==="acodeWebview"){await eo(w);return}if(F==="systemBrowser"){Fs(w);return}}Ne(w)},M=()=>{i.innerHTML="";let f=document.createElement("div");f.className="ls-ntp-hero";let w=document.createElement("img");w.className="ls-ntp-logo",w.src=Fa,w.alt="Live Server",w.onerror=()=>{w.style.display="none"},f.appendChild(w);let F=document.createElement("div");F.className="ls-ntp-title",F.textContent="Live Server",f.appendChild(F);let V=document.createElement("div");V.className="ls-ntp-search";let he=document.createElement("span");he.className="ls-ntp-search-ico",he.innerHTML=P(A.search,17);let le=document.createElement("input");le.type="text",le.placeholder="Search or type a URL",le.setAttribute("enterkeyhint","enter"),le.setAttribute("inputmode","text"),le.setAttribute("spellcheck","false"),le.setAttribute("autocapitalize","off"),le.setAttribute("autocomplete","off");let He=document.createElement("button");He.type="button",He.className="ls-ntp-search-btn",He.textContent="Search";let X=()=>{let S=le.value.trim();if(!S){le.focus();return}b(S)};le.addEventListener("keydown",S=>{S.key==="Enter"&&X()}),He.addEventListener("click",X),V.append(he,le,He);let Be=document.createElement("div");Be.className="ls-ntp-tiles";let en=async S=>{let z=st();if(S<0||S>=z.length)return;let Y=acode.require("prompt"),re=acode.require("select"),se=z[S],U=await re("Shortcut",[["edit","Edit name / URL"],["delete","Remove shortcut"]],{hideOnSelect:!0});if(!U)return;if(U==="delete"){z.splice(S,1),H("browserBookmarks",z),M();return}let pt=await Y("Bookmark URL",se.url||"https://","text");if(!pt)return;let Ke=nt(pt),we=await Y("Shortcut name",se.title||Ke.replace(/^https?:\/\//,""),"text")||Ke;z[S]={url:Ke,title:we},H("browserBookmarks",z),M()},tn=(S,z)=>{let Y=null,re=!1,se=()=>{Y&&clearTimeout(Y),Y=null};S.addEventListener("touchstart",U=>{re=!1,se(),Y=setTimeout(()=>{Y=null,z(U)},480)},{passive:!0}),S.addEventListener("touchmove",()=>{re=!0,se()},{passive:!0}),S.addEventListener("touchend",se),S.addEventListener("touchcancel",se),S.addEventListener("contextmenu",U=>{U.preventDefault(),z(U)}),S.addEventListener("pointerdown",U=>{U.pointerType==="mouse"&&U.button===2||U.pointerType})},Eo=(S,z,Y,re,se={})=>{let U=document.createElement("button");U.type="button",U.className="ls-ntp-tile",U.innerHTML='<span class="ls-ntp-dot"></span><span class="ls-ntp-name"></span>';let pt=U.querySelector(".ls-ntp-dot");if(re&&/^https?:/i.test(re)&&!rt(re)){let we=document.createElement("img");we.src=re,we.alt="",we.onerror=()=>{pt.textContent=Y},pt.appendChild(we)}else pt.textContent=Y;U.querySelector(".ls-ntp-name").textContent=S;let Ke=!1;return U.addEventListener("click",async we=>{if(Ke){Ke=!1,we.preventDefault();return}let To=typeof z=="function"?await z():z;if(!To)return ne("Server not running",2e3);b(To)}),typeof se.onLongPress=="function"&&tn(U,we=>{Ke=!0,se.onLongPress(we)}),U};Be.appendChild(Eo("Server root",Xa,"S",null)),st().forEach((S,z)=>{var se;let Y=null;try{let U=new URL(S.url).hostname;U&&U!=="127.0.0.1"&&U!=="localhost"&&(Y=`https://www.google.com/s2/favicons?domain=${encodeURIComponent(U)}&sz=64`)}catch{}let re=((se=(S.title||S.url||"?").replace(/^https?:\/\//,"")[0])==null?void 0:se.toUpperCase())||"B";Be.appendChild(Eo(S.title||S.url,S.url,re,Y,{onLongPress:()=>en(z)}))});let Bt=document.createElement("button");Bt.type="button",Bt.className="ls-ntp-tile",Bt.innerHTML=`<span class="ls-ntp-dot">${P(A.plus,20)}</span><span class="ls-ntp-name">Add shortcut</span>`,Bt.addEventListener("click",async()=>{let S=acode.require("prompt"),z=await S("Bookmark URL (e.g. https://duckduckgo.com)","https://","text");if(!z)return;let Y=nt(z),re=await S("Shortcut name",Y.replace(/^https?:\/\//,""),"text")||Y,se=st();H("browserBookmarks",[...se,{title:re.trim(),url:Y}]),M()}),Be.appendChild(Bt);let hr=document.createElement("div");hr.className="ls-ntp-recent-wrap";let rn=Br(),mr=document.createElement("div");mr.className="ls-ntp-sec-head";let Lo=document.createElement("span");if(Lo.textContent="Recent",mr.appendChild(Lo),rn.length>0){let S=document.createElement("button");S.type="button",S.className="ls-ntp-more",S.textContent=_?"Less":"More",S.addEventListener("click",()=>{_=!_,M()}),mr.appendChild(S)}hr.appendChild(mr);let gr=document.createElement("div");gr.className="ls-ntp-recent-list";let _o=_?rn:rn.slice(0,5);if(_o.length)_o.forEach(S=>{var re;let z=document.createElement("button");z.type="button",z.className="ls-ntp-recent-row";let Y=((re=(S.title||S.url||"?").replace(/^https?:\/\//,"")[0])==null?void 0:re.toUpperCase())||"W";z.innerHTML=`
          <span class="ls-ntp-recent-ico">${Y}</span>
          <span class="ls-ntp-recent-meta">
            <span class="ls-ntp-recent-title"></span>
            <span class="ls-ntp-recent-url"></span>
          </span>
        `,z.querySelector(".ls-ntp-recent-title").textContent=S.title||S.url,z.querySelector(".ls-ntp-recent-url").textContent=S.url,z.addEventListener("click",()=>b(S.url)),gr.appendChild(z)});else{let S=document.createElement("div");S.className="ls-ntp-empty",S.textContent="No recent pages yet",gr.appendChild(S)}hr.appendChild(gr),i.append(f,V,Be,hr)},$=()=>{let f=D();Nn(r),u&&!C()&&(u.value=f&&f.url!=="about:blank"?f.url:""),e.classList.toggle("is-loading",!!(f!=null&&f.loading)),e.classList.toggle("is-installing",document.body.classList.contains("ls-green-loading")),p.innerHTML=P(f!=null&&f.loading?A.close:A.reload,18),p.title=f!=null&&f.loading?"Stop loading":"Reload",a&&(a.disabled=!Rn()),d&&(d.disabled=!An());let w=/^https:/i.test((f==null?void 0:f.url)||"");g.innerHTML=P(w?A.lock:A.info,16),g.title=w?"Connection is secure":"Not secure";let F=!!f&&st().some(he=>he.url===f.url);c.classList.toggle("is-on",F);let V=!f||f.url==="about:blank";V&&M(),i.classList.toggle("is-on",V),Lt().length||Pt()};We==null||We(),We=Pn($);let I=()=>{var w;let f=rr(e);(w=j==null?void 0:j.onFullscreen)==null||w.call(j,f)},m=()=>{var f;_=!1,Ct(s,"about:blank"),Rt((f=D())==null?void 0:f.id)},y=()=>{_=!1;let f=String(k().browserHomeUrl||"").trim();f?b(f):Ne("about:blank")},oe=(f,w)=>{var F,V;return w>0?(F=Us.find(he=>he>f))!=null?F:f:(V=[...Us].reverse().find(he=>he<f))!=null?V:f},ye=f=>zn(x.value,f),Ve=()=>{let f=D();if(!f||f.url==="about:blank")return ne("Nothing to bookmark",1500);let w=st(),F=w.some(V=>V.url===f.url);H("browserBookmarks",F?w.filter(V=>V.url!==f.url):[...w,{title:f.title||f.url,url:f.url}]),$(),ne(F?"Bookmark removed":"Bookmarked",1200)},Mt=()=>Ts({host:e,anchor:l,get:()=>{var f;return{opacity:ot((f=k().browserOpacity)!=null?f:1),overlay:Wr(),autoSave:k().overlayAutoSave!==!1,canOverlay:it==="page"}},set:js}),fr=()=>({newTab:m,duplicateTab:()=>In(s),closeTab:()=>{let f=D();f&&Vt(f.id)},closeOtherTabs:()=>{let f=D();Lt().filter(w=>w.id!==(f==null?void 0:f.id)).forEach(w=>Vt(w.id))},navigate:f=>b(f),getUrl:()=>{var f;return((f=D())==null?void 0:f.url)||""},getVisited:Br,clearHistory:()=>{Cn(),M(),ne("History cleared",1500)},getBookmarks:st,isBookmarked:()=>{let f=D();return!!f&&st().some(w=>w.url===f.url)},toggleBookmark:Ve,getZoom:()=>{var f,w;return(w=(f=D())==null?void 0:f.zoom)!=null?w:100},zoom:(f,w)=>{let F=D();return F?jn(w?100:oe(F.zoom||100,f)):100},toggleFullscreen:I,print:()=>{Un()||ne("Cannot print this page",1800)},find:()=>{T.hidden=!1,x.focus(),x.select()},isPinch:()=>Ir(),togglePinch:async()=>{let f=!Ir();H("enablePinchToZoom",f),Dr(),ne("Pinch to zoom "+(f?"on":"off"),1400);try{let{reapplySetup:F}=await Promise.resolve().then(()=>(Q(),ae));await F()}catch{}let w=D();w&&w.url!=="about:blank"&&rt(w.url)&&Zt()},isDevtools:()=>{var f;return!!((f=D())!=null&&f.devtools)},toggleDevtools:()=>{let f=D();if(!f||f.url==="about:blank")return ne("Open a page first",1800);Fn()||ne("DevTools work on pages served by Live Server",3e3)},isDeviceMode:()=>Z.isOn(),toggleDeviceMode:()=>Z.toggle(),viewSource:async()=>{var le,He;let f=D();if(!f||f.url==="about:blank"||String(f.url).startsWith("view-source:"))return ne("No page source here",1800);ne("Loading source\u2026",1200);let w="";try{let X=(le=f.iframe)==null?void 0:le.contentDocument;X!=null&&X.documentElement&&(w=`<!DOCTYPE html>
`+X.documentElement.outerHTML)}catch{}if(!w)try{let X=(He=f.iframe)!=null&&He.src&&f.iframe.src!=="about:blank"?f.iframe.src:f.url,Be=new AbortController,en=setTimeout(()=>Be.abort(),15e3),tn=await fetch(X,{signal:Be.signal,credentials:"omit"});clearTimeout(en),w=await tn.text()}catch(X){ne("Could not load source: "+((X==null?void 0:X.message)||X),2800);return}if(!w){ne("Empty source",1800);return}let F=String(w).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),V="view-source:"+String(f.url).replace(/^https?:\/\//i,""),he='<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+V.replace(/[<>]/g,"")+"</title><style>html,body{margin:0;background:#1e1e1e;color:#d4d4d4}pre{margin:12px;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word}</style></head><body><pre>"+F+"</pre></body></html>";try{Wn(s,V,he)}catch(X){ne("Could not open source tab: "+((X==null?void 0:X.message)||X),2500)}},openExternal:()=>{var w;let f=(w=D())==null?void 0:w.url;f&&f!=="about:blank"&&Fs(f)},openOpacity:Mt,isOverlay:Wr,canOverlay:()=>it==="page",toggleOverlay:()=>js({overlay:!Wr()}),closeBrowser:()=>Pt()});(Ze=t(".ls-tab-new"))==null||Ze.addEventListener("click",m),e.querySelectorAll(".ls-close-btn, .ls-ov-close").forEach(f=>f.addEventListener("click",()=>Pt())),(ut=t(".ls-fs-btn"))==null||ut.addEventListener("click",I),a==null||a.addEventListener("click",()=>qr(-1)),d==null||d.addEventListener("click",()=>qr(1)),p.addEventListener("click",()=>{var f;return(f=D())!=null&&f.loading?$n():Zt()}),(Ht=t(".ls-home"))==null||Ht.addEventListener("click",y),c.addEventListener("click",Ve),l.addEventListener("click",Mt),v.addEventListener("click",()=>{let f=Z.toggle();v.classList.toggle("is-on",f)}),v.classList.toggle("is-on",Z.isOn()),h.addEventListener("click",()=>Zn(fr(),{host:e,anchor:h})),u.addEventListener("keydown",f=>{f.key==="Enter"&&(b(u.value),u.blur())});let Le=t(".ls-toolbar");return u.addEventListener("focus",()=>{u.select(),Le==null||Le.classList.add("is-omni")}),u.addEventListener("blur",()=>Le==null?void 0:Le.classList.remove("is-omni")),T.querySelector(".ls-find-prev").addEventListener("click",()=>ye(!0)),T.querySelector(".ls-find-next").addEventListener("click",()=>ye(!1)),T.querySelector(".ls-find-close").addEventListener("click",()=>T.hidden=!0),x.addEventListener("keydown",f=>{f.key==="Enter"&&ye(f.shiftKey),f.key==="Escape"&&(T.hidden=!0)}),e._lsDevice=s,e._sync=$,e}function Va(){let e=document.createElement("div");return e.className="ls-browser-shell",e.dataset.theme=is(),e.innerHTML=`
    <div class="ls-chrome">
      <div class="ls-tabstrip">
        <div class="ls-browser-tabs"></div>
        <button type="button" class="ls-ib ls-tab-new" title="New tab">${P(A.plus,16)}</button>
        <span class="ls-spacer"></span>
        <div class="ls-win">
          <button type="button" class="ls-ib ls-win-btn ls-fs-btn" title="Fullscreen">${P(A.maximize,14)}</button>
          <button type="button" class="ls-ib ls-win-btn ls-close-btn" title="Close">${P(A.close,14)}</button>
        </div>
      </div>
      <div class="ls-toolbar">
        <div class="ls-nav">
          <button type="button" class="ls-ib ls-back" title="Back" disabled>${P(A.back,18)}</button>
          <button type="button" class="ls-ib ls-fwd" title="Forward" disabled>${P(A.forward,18)}</button>
          <button type="button" class="ls-ib ls-reload" title="Reload">${P(A.reload,18)}</button>
          <button type="button" class="ls-ib ls-home" title="Home">${P(A.home,18)}</button>
        </div>
        <div class="ls-omni">
          <button type="button" class="ls-site" title="Site information">${P(A.info,16)}</button>
          <input class="ls-browser-url" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" enterkeyhint="enter" inputmode="text" placeholder="Search or type a URL" />
          <button type="button" class="ls-ib ls-star" title="Bookmark this tab">${P(A.star,16)}</button>
        </div>
        <button type="button" class="ls-ib ls-op-btn" title="Opacity">${P(A.drop,18)}</button>
        <button type="button" class="ls-ib ls-dev-toggle" title="Device mode">${P(A.device,18)}</button>
        <button type="button" class="ls-ib ls-menu-btn" title="Customize and control">${P(A.dots,18,3)}</button>
        <button type="button" class="ls-ib ls-ov-close" title="Close">${P(A.close,16)}</button>
        <div class="ls-progress"></div>
        <div class="ls-green-progress"></div>
      </div>
      <div class="ls-devbar" hidden></div>
    </div>
    <div class="ls-stage">
      <div class="ls-ntp"></div>
      <div class="ls-box"><div class="ls-device"></div></div>
    </div>
    <div class="ls-find" hidden>
      <input type="text" placeholder="Find in page" spellcheck="false" />
      <button type="button" class="ls-ib ls-find-prev" title="Previous">${P(A.up,16)}</button>
      <button type="button" class="ls-ib ls-find-next" title="Next">${P(A.down,16)}</button>
      <button type="button" class="ls-ib ls-find-close" title="Close">${P(A.close,16)}</button>
    </div>
  `,Ga(e)}function Za(){var t;if(xs())return Jt(),!0;let e=N==null?void 0:N.querySelector(".ls-find");return e&&!e.hidden?(e.hidden=!0,!0):N!=null&&N.classList.contains("is-fullscreen")?((t=j==null?void 0:j.onFullscreen)==null||t.call(j,rr(N,!1)),!0):!1}function Ns(){Nr||Pt({fromHost:!0})}async function Ka(){var e;return N&&j?((e=j.show)==null||e.call(j),requestAnimationFrame(()=>Z==null?void 0:Z.layout()),N):nr||(nr=(async()=>{ls();let t=Va(),r=null;return it="page",Ws()==="editorTab"&&(r=await Is(t,{title:"Live Preview",css:En,onClose:Ns}),r?it="tab":ne("Editor tab not available, using page",2e3)),r||(r=Bs(t,{title:"Live Preview",onClose:Ns,onBack:Za})),j=r,N=t,Bn(),or=n=>{var o;Na.includes((o=n==null?void 0:n.detail)==null?void 0:o.key)&&no()},window.addEventListener("liveserver-settings",or),no(),requestAnimationFrame(()=>Z==null?void 0:Z.layout()),t})().finally(()=>{nr=null}),nr)}async function oo(e,t={}){let r=await Ka(),n=Lt();if(n.length>0&&(t.restoreOnly||!e))return;let o=e||"about:blank";if(t.reuse){let i=n.find(a=>Wa(a.url,o));if(i){Rt(i.id),i.url!==o?Ne(o):t.forceReload&&Zt();return}}let s=D();s&&s.url==="about:blank"&&n.length===1?Ne(o):Ct(r._lsDevice,o)}function Pt(e={}){if(!Nr){Nr=!0;try{Jt(),We==null||We(),We=null,or&&window.removeEventListener("liveserver-settings",or),or=null,Xs(),Dn();try{Z==null||Z.destroy()}catch{}Z=null,qn(),Ms(N);try{N==null||N.remove()}catch{}e.fromHost||j==null||j.close()}finally{j=null,N=null,document.body.classList.remove("ls-browser-fs"),Nr=!1}}}function Ja(e={}){return{open:t=>oo(t||e.initialUrl),addTab:t=>oo(t),setFullscreen:t=>rr(N,t),dispose:Pt,getMode:Ws}}var ne,Fa,Us,ja,Na,N,j,it,We,nr,Nr,Z,or,At,ro,lt=R(()=>{K();Se();Gt();as();cs();$r();Es();er();Cs();Os();Hs();Ds();qs();to();ne=acode.require("toast"),Fa="https://i.postimg.cc/WpYPQ47b/green-fox.png",Us=[25,33,50,67,75,80,90,100,110,125,150,175,200,250,300,400,500],ja=/\.(html?|css|js|mjs|json|svg|xml|txt|md)$/i,Na=["browserOpacity","browserOverlay","overlayAutoSave","showAddressBar"],N=null,j=null,it="page",We=null,nr=null,Nr=!1,Z=null,or=null,At=null,ro=null});var ae={};xe(ae,{changePortAndRestart:()=>sl,ensureProxyServer:()=>Yn,probeExistingServer:()=>po,reapplySetup:()=>il,refreshStatusFromBackend:()=>gn,restartServer:()=>ol,setProcessBaseUrl:()=>lo,startServer:()=>ar,stopServer:()=>Vr});function lo(e){sr=e||""}async function Yr(e,t=900){try{let r=new AbortController,n=setTimeout(()=>r.abort(),t),o=await fetch("http://127.0.0.1:"+e+"/check",{signal:r.signal});if(clearTimeout(n),!o||!o.ok)return{alive:!1,proxy:!1};let s=await o.json().catch(()=>({}));return{alive:!0,proxy:(s==null?void 0:s.proxy)===!0&&((s==null?void 0:s.proxyVersion)||0)>=5}}catch{return{alive:!1,proxy:!1}}}async function Js(e,t=800){return(await Yr(e,t)).alive}async function Qa(e){try{let t=await ee("if command -v wget >/dev/null 2>&1; then wget -qO- -T 2 http://127.0.0.1:"+e+"/check 2>/dev/null; elif command -v curl >/dev/null 2>&1; then curl -s --max-time 2 http://127.0.0.1:"+e+"/check 2>/dev/null; else echo NOCLIENT; fi",{timeoutMs:8e3});return/Ready|AcodeLiveServer|"port"/i.test(String(t||""))}catch{return!1}}async function so(e,t={}){let r=String(parseInt(e,10)||8080);return await Js(r)?!0:t.deep?Qa(r):!1}async function co(e){let t=String(parseInt(e,10)||8080);Xe=null;let r=`for pid in $(ps -o pid,args 2>/dev/null | grep "node index.js ${t}" | grep -v grep | awk '{print $1}'); do kill -9 "$pid" 2>/dev/null; done; for pid in $(ps 2>/dev/null | grep "node index.js ${t}" | grep -v grep | awk '{print $1}'); do kill -9 "$pid" 2>/dev/null; done; pkill -9 -f "node index.js ${t}" 2>/dev/null || true; fuser -k ${t}/tcp 2>/dev/null || true`;try{await ee(r,{timeoutMs:12e3})}catch{}for(let n=0;n<10&&await Js(t,400);n++)await new Promise(o=>setTimeout(o,200))}function uo(e){let t=String(e||"").replace(/\/+$/,"")||"/",r=t.match(/^\/storage\/emulated\/0(\/.*)?$/);return r||(r=t.match(/^\/storage\/self\/primary(\/.*)?$/),r)?"/sdcard"+(r[1]||""):t}function Ys(e){return uo(String(e||"").replace(/\/+$/,""))}async function el(e,t){let r=s=>"'"+String(s).replace(/'/g,"'\\''")+"'",n=String(t||"index.html").replace(/^\/+/,""),o=e.replace(/\/+$/,"")+"/"+n;try{let s=await ee("[ -f "+r(o)+" ] && [ -r "+r(o)+" ] && head -c 1 "+r(o)+" >/dev/null 2>&1 && echo ENTRY_OK || echo ENTRY_NO",{timeoutMs:8e3});return String(s||"").includes("ENTRY_OK")}catch{return!1}}async function Vs(e,t,r={}){let n=t||"index.html",o=await tl(e),s=Gs.test(String(e||""))||Gs.test(String(o||"")),i=!!r.forceMirror;try{let{getSettings:a}=await Promise.resolve().then(()=>(K(),De));s&&a().mirrorSharedStorage!==!1&&(i=!0)}catch{}if(i)try{let{getSettings:a}=await Promise.resolve().then(()=>(K(),De)),d=await Rr(e,n,a().rootFolderUri||"");if(d)return{aroot:d,mirrored:!0}}catch(a){if(console.warn("[LiveServer] mirror failed, falling back to direct Alpine path:",(a==null?void 0:a.message)||a),!o)throw a}if(o){if(await el(o,n)){try{Cr()}catch{}return{aroot:o,mirrored:!1}}try{if(await Qs(o,n)){try{Cr()}catch{}return{aroot:o,mirrored:!1}}}catch{}console.warn("[LiveServer] alpine sees",o,"but not",n,"-> mirroring through Acode fs")}else console.warn("[LiveServer] alpine cannot see",e,"-> mirroring through Acode fs");try{let{getSettings:a}=await Promise.resolve().then(()=>(K(),De)),d=await Rr(e,n,a().rootFolderUri||"");if(d)return{aroot:d,mirrored:!0}}catch(a){if(console.warn("[LiveServer] mirror failed",a),o)return{aroot:o,mirrored:!1};throw a}return{aroot:o||null,mirrored:!1}}async function tl(e){let t=String(e||"").replace(/\/+$/,"")||"/",r=a=>"'"+String(a).replace(/'/g,"'\\''")+"'";try{let a=await ee("[ -d "+r(t)+" ] && echo OK || echo NO",{timeoutMs:8e3});if(String(a||"").includes("OK"))return console.log("[LiveServer] alpine root (direct)",t),t}catch(a){console.warn("[LiveServer] root direct check",a)}let n=[],o=a=>{a&&!n.includes(a)&&n.push(a)};o(t);let s=t.match(/^\/storage\/emulated\/0(\/.*)?$/);s&&o("/sdcard"+(s[1]||"")),s=t.match(/^\/sdcard(\/.*)?$/),s&&(o("/storage/emulated/0"+(s[1]||"")),o("/storage/self/primary"+(s[1]||""))),s=t.match(/^\/storage\/self\/primary(\/.*)?$/),s&&(o("/sdcard"+(s[1]||"")),o("/storage/emulated/0"+(s[1]||"")));let i=t.match(/^\/storage\/([0-9A-Fa-f]{4}-[0-9A-Fa-f]{4})(\/.*)?$/);if(i){let a=i[1],d=i[2]||"";o("/storage/"+a+d),o("/mnt/media_rw/"+a+d)}if(!/^\/(sdcard|storage|mnt)(\/|$)/.test(t))return console.warn("[LiveServer] alpine root not found (non-storage)",t),null;try{let a=await ee("for d in "+n.map(r).join(" ")+'; do [ -d "$d" ] && { echo "OK:$d"; exit 0; }; done; echo NONE',{timeoutMs:1e4}),d=String(a||"").match(/OK:(.+)/);if(d)return console.log("[LiveServer] alpine root",d[1].trim()),d[1].trim()}catch(a){console.warn("[LiveServer] root probe failed",a)}return null}async function Qs(e,t){let r=s=>"'"+String(s).replace(/'/g,"'\\''")+"'",n=String(t||"index.html").replace(/^.*\//,"")||"index.html",o="R="+r(e)+"; F="+r(String(t||"").replace(/^\/+/,""))+"; B="+r(n)+'; if [ -f "$R/$F" ]; then echo "HIT:$R|$F"; exit 0; fi; if [ -f "$R/$B" ]; then echo "HIT:$R|$B"; exit 0; fi; found=$(find "$R" -maxdepth 4 -type f -name "$B" 2>/dev/null | head -1); if [ -n "$found" ]; then dir=$(dirname "$found"); echo "HIT:$dir|$B"; exit 0; fi; echo MISS; ls -la "$R" 2>&1 | head -15';try{let s=await ee(o,{timeoutMs:12e3});console.log("[LiveServer] entry locate",String(s||"").slice(0,240));let i=String(s||"").match(/HIT:([^|]+)\|([^\n]+)/);if(i)return{root:i[1].trim(),fileName:i[2].trim()}}catch(s){console.warn("[LiveServer] locateEntry",s)}return null}function rl(e){let t={};return String(e||"").split(`
`).forEach(r=>{let n=r.indexOf(":");if(n>0){let o=r.slice(0,n).trim(),s=r.slice(n+1).trim();o&&(t[o]=s)}}),t}function io(){let e=G(),t=(e==null?void 0:e.filename)||(e==null?void 0:e.name)||"";return/\.html?$/i.test(t)?t:"index.html"}function Zs(e){try{let t=G(),r=qe((t==null?void 0:t.uri)||(t==null?void 0:t.url)||"");if(!r||!e)return io();let n=Ys(e),o=Ys(r);if(o===n)return io();if(o.startsWith(n+"/"))return o.slice(n.length).replace(/^\/+/,"");let s=o.split("/").pop();if(s&&/\.html?$/i.test(s))return s}catch{}return io()}async function ir(e,t,r){let n=k(),o={path:t,fileName:r||"index.html",port:e,liveReload:n.liveReload!==!1,zoom:n.enablePinchToZoom!==!1,directoryListing:n.directoryListing!==!1,enableCors:n.enableCors!==!1,charset:n.customCharset||"utf-8",customHeaders:rl(n.customHeaders),ipWhitelist:n.ipWhitelist||"",basicAuthUser:n.basicAuthUser||"",basicAuthPass:n.basicAuthPass||""};try{let s=await fetch(`http://127.0.0.1:${e}/setup`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});return console.log("[LiveServer] setup",t,r,s&&s.status),!!(s&&(s.ok||s.status===201))}catch(s){return console.warn("[LiveServer] setup",s),!1}}async function nl(e,t){let r=t&&t!=="index.html"?encodeURI(t):"";try{let n=new AbortController,o=setTimeout(()=>n.abort(),4e3),s=await fetch("http://127.0.0.1:"+e+"/"+r,{cache:"no-store",signal:n.signal});return clearTimeout(o),s.status}catch{return 0}}async function Ks(e,t,r,n){if(await nl(e,n)!==404)return{aroot:r,mirrored:!1,healed:!1};console.warn("[LiveServer] server answered 404 for",n,"from",r,"-> trying storage mirror");try{let{getSettings:s}=await Promise.resolve().then(()=>(K(),De)),i=await Rr(t,n||"index.html",s().rootFolderUri||"");if(i)return await ir(e,i,n),{aroot:i,mirrored:!0,healed:!0}}catch(s){console.warn("[LiveServer] heal mirror failed",(s==null?void 0:s.message)||s)}return{aroot:r,mirrored:!1,healed:!1}}function ao(){Xr&&(clearInterval(Xr),Xr=null)}function Gr(){ao();let e=parseInt(k().autoShutdownMinutes,10)||0;if(e<=0)return;let t=e*60*1e3,r=Date.now();Xr=setInterval(async()=>{let n=q();if(!n.running){ao();return}if(Date.now()-(n.startedAt||r)>t){try{let s=await(await fetch(`http://127.0.0.1:${n.port}/status`)).json();if(s.lastActivity&&Date.now()-s.lastActivity<t)return}catch{}be("Live Server auto-stopped (inactivity)",2500),Vr()}},3e4)}async function po(){let e=St();try{let t=new AbortController,r=setTimeout(()=>t.abort(),1200),n=await fetch(`http://127.0.0.1:${e}/status`,{signal:t.signal});if(clearTimeout(r),!n||!n.ok)return!1;let o=await n.json().catch(()=>({})),s=o.port||e,i=o.fileName||null,a=Wt(s,"127.0.0.1"),d=i&&i!=="index.html"?a.replace(/\/$/,"/")+encodeURI(i):a,u=q();if(ie({running:!0,port:s,root:o.root||u.root||null,url:d,fileName:i,bind:o.bind||"0.0.0.0",startedAt:u.startedAt||(o.uptime?Date.now()-Math.round(Number(o.uptime)*1e3):Date.now()),lastError:null}),Gr(),!u.running)try{window.dispatchEvent(new CustomEvent("liveserver-started",{detail:{url:d,port:s,root:o.root||null,fileName:i}}))}catch{}return!0}catch{return!1}}function ei(e,t){let r=ft();if(!(r!=null&&r.execute))throw new Error("Executor not available. Open Acode Terminal once, then retry.");let n='ACODIR=""; for d in "'+String(t||"").replace(/"/g,"")+'" /root/.acode_liveserver/acodels /home/root/.acode_liveserver/acodels; do [ -n "$d" ] || continue; if [ -f "$d/index.js" ] && [ -d "$d/node_modules" ]; then ACODIR="$d"; break; fi; done; [ -z "$ACODIR" ] && { echo acodels_not_found; exit 1; }; cd "$ACODIR" || exit 1; NODE_PATH="$ACODIR/node_modules" exec node index.js '+String(e)+" 0.0.0.0 >liveserver.log 2>&1",o={};Xe=o,r.execute(an(n),!0).then(s=>console.log("[LiveServer] node exited",String(s||"").slice(0,200))).catch(s=>console.warn("[LiveServer] node exited",String((s==null?void 0:s.message)||s).slice(0,200))).finally(()=>{if(Xe===o&&(Xe=null,q().running)){ie({running:!1,lastError:"server process exited"});try{window.dispatchEvent(new CustomEvent("liveserver-stopped"))}catch{}}})}async function Yn(){let e=St(),t=await Yr(e);if(t.alive&&t.proxy)return e;if(!await wr({baseUrl:sr}))return null;Ce(!0),Re(t.alive?`$ Updating backend on :${e} with Reverse Proxy...`:`$ node index.js ${e} (starting local proxy)...`,{spin:!0});try{t.alive&&!t.proxy&&await co(e);let n=await bt(sr);await hn(n),ei(e,n);let o=!1;for(let p=0;p<35;p++){await new Promise(g=>setTimeout(g,300));let c=await Yr(e,500);if(c.alive&&c.proxy){o=!0;break}if(!Xe)break}if(!o)return Re("Proxy server failed to start",{spin:!1,autoHideMs:3e3}),null;let s=q(),i=s.root||kr()||"/sdcard",a=uo(i),d=s.fileName||"index.html";await ir(e,a,d);let u=Wt(e,"127.0.0.1");ie({running:!0,port:e,root:a,url:u,fileName:d,bind:"0.0.0.0",startedAt:Date.now(),lastError:null}),Gr();try{window.dispatchEvent(new CustomEvent("liveserver-started",{detail:{url:u,port:e,root:a,fileName:d}}))}catch{}return Re(`\u2713 Reverse proxy ready on 127.0.0.1:${e}`,{spin:!1,autoHideMs:2e3}),e}catch(n){return Re(`Proxy error: ${(n==null?void 0:n.message)||n}`,{spin:!1,autoHideMs:3500}),null}finally{Ce(!1)}}async function ar(e={}){let t=e.port||St(),r=e.root||kr(),n=k(),o=e.forceDeps?{alive:!1,proxy:!1}:await Yr(t);if(o.alive&&!o.proxy&&(Ce(!0),Re(`$ Upgrading Live Server on :${t}...`,{spin:!0}),await co(t),Ce(!1),Yt(0),o.alive=!1),o.alive&&o.proxy){let h=q(),l=r||h.root;if(!l)return be("Set a root folder or open an HTML file",2500),!1;let v=e.fileName||Zs(l),T,x=!1;try{let b=await Vs(l,v);T=b.aroot||uo(l),x=b.mirrored}catch(b){return be("Cannot serve folder: "+((b==null?void 0:b.message)||b),4e3),!1}let _=!h.running||h.port!==t||h.root!==T||h.fileName!==v;if(_&&await ir(t,T,v),_&&!x){let b=await Ks(t,l,T,v);b.healed&&(T=b.aroot,x=!0)}let O=Wt(t,"127.0.0.1"),C=v&&v!=="index.html"?O.replace(/\/$/,"/")+encodeURI(v):O;if(ie({running:!0,port:t,root:T,url:C,fileName:v,bind:"0.0.0.0",startedAt:h.startedAt||Date.now(),lastError:null}),Gr(),!h.running)try{window.dispatchEvent(new CustomEvent("liveserver-started",{detail:{url:C,port:t,root:T,fileName:v}}))}catch{}if(e.openBrowser===!0||e.openBrowser!==!1&&n.openBrowserOnStart!==!1)try{let{openBrowser:b}=await Promise.resolve().then(()=>(lt(),at));b(C,{reuse:!0})}catch(b){console.warn("[LiveServer] open browser",b)}return!0}if(!await wr({baseUrl:sr,force:!!e.forceDeps}))return!1;if(!r)return be("Set a root folder or open an HTML file",2500),!1;let i=e.fileName||Zs(r),a,d=!1;try{let h=await Vs(r,i);a=h.aroot,d=h.mirrored}catch(h){return ie({running:!1,lastError:String((h==null?void 0:h.message)||h)}),be("Cannot serve folder: "+((h==null?void 0:h.message)||h),4500),null}if(!a)return ie({running:!1,lastError:"root not reachable"}),be("Folder not reachable \u2014 mirror also failed. Use internal /sdcard or grant storage access.",4500),!1;try{let h=await Qs(a,i);h?(h.root!==a||h.fileName!==i)&&(console.log("[LiveServer] adjusted root/file",a,i,"->",h.root,h.fileName),a=h.root,i=h.fileName):d||console.warn("[LiveServer] entry missing under",a,i)}catch(h){console.warn("[LiveServer] locate failed",h)}let u="0.0.0.0";if(!await so(t,{deep:!0})){Ce(!0),Re(`$ node index.js ${t} 0.0.0.0`,{spin:!0});let h=await bt(sr);try{await hn(h)}catch(v){console.warn("[LiveServer] ensure index",v)}try{ei(t,h)}catch(v){return Ce(!1),Yt(0),ie({running:!1,lastError:String((v==null?void 0:v.message)||v)}),be("Start failed: "+((v==null?void 0:v.message)||v),3e3),!1}let l=!1;for(let v=0;v<40;v++){if(await new Promise(T=>setTimeout(T,300)),await so(t)){l=!0;break}if(!Xe)break}if(!l&&Xe&&(l=await so(t,{deep:!0})),Ce(!1),!l){Re("Server failed to start",{spin:!1,autoHideMs:3500});try{let v=await ee("tail -n 40 /root/.acode_liveserver/acodels/liveserver.log 2>/dev/null",{timeoutMs:8e3});console.warn("[LiveServer] start failed, log:",v)}catch{}return be("Server failed to start \u2014 see console log",3500),ie({running:!1,lastError:"start failed"}),Xe=null,!1}Re(`\u2713 Live Server running on :${t}`,{spin:!1,autoHideMs:2200})}let p=await ir(t,a,i);if(p||console.warn("[LiveServer] /setup patch failed"),p&&!d){let h=await Ks(t,r,a,i);h.healed&&(a=h.aroot,d=!0)}let c=Wt(t,"127.0.0.1"),g=i&&i!=="index.html"?c.replace(/\/$/,"/")+encodeURI(i):c;ie({running:!0,port:t,root:a,url:g,fileName:i,bind:u,startedAt:Date.now(),lastError:null}),H("port",t),Gr(),be("Live on "+g,2500);try{window.dispatchEvent(new CustomEvent("liveserver-started",{detail:{url:g,port:t,root:r,fileName:i}}))}catch{}if(e.openBrowser===!0||e.openBrowser!==!1&&n.openBrowserOnStart!==!1)try{let{openBrowser:h}=await Promise.resolve().then(()=>(lt(),at));h(g,{reuse:!0})}catch(h){console.warn("[LiveServer] open browser",h)}return!0}async function Vr(){try{Cr()}catch{}ao();let t=q().port||St();await co(t),ie({running:!1,port:null,url:null,fileName:null,startedAt:null}),be("Server stopped",1500);try{window.dispatchEvent(new CustomEvent("liveserver-stopped"))}catch{}return!0}async function ol(){let e=q(),t=e.root,r=e.fileName;return await Vr(),await new Promise(n=>setTimeout(n,350)),ar({root:t||void 0,fileName:r||void 0})}async function sl(){let e=acode.require("prompt"),t=String(St()),r=await e("Port",t,"number");if(r==null)return!1;let n=parseInt(String(r),10);return!Number.isFinite(n)||n<1||n>65535?(be("Invalid port",1500),!1):(H("port",n),await Vr(),ar({port:n}))}async function il(){let e=q();return!e.running||!e.port||!e.root?!1:ir(e.port,e.root,e.fileName||"index.html")}var be,sr,Xr,Xe,Gs,Q=R(()=>{K();ht();yt();qo();ze();rs();ns();ue();Se();Ar();be=acode.require("toast"),sr="",Xr=null,Xe=null;Gs=/^\/(sdcard|storage|mnt)(\/|$)/});var vo={};xe(vo,{onFileSwitch:()=>mo,registerSideButton:()=>ho,setLiveDot:()=>ct,unregisterSideButton:()=>go});function ai(){if(document.getElementById("ls-side-btn-css"))return;let e=document.createElement("style");e.id="ls-side-btn-css",e.textContent=`
    [data-ls-sidebtn="1"] {
      gap: 6px;
    }
    [data-ls-sidebtn="1"] .ls-side-ico {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.05rem;
      height: 1.05rem;
      flex-shrink: 0;
      margin-right: 4px;
      vertical-align: middle;
    }
    [data-ls-sidebtn="1"] .ls-side-ico svg {
      width: 1.05rem;
      height: 1.05rem;
      display: block;
    }
    [data-ls-sidebtn="1"][data-live="1"] {
      background: #22c55e !important;
      color: #0b1220 !important;
    }
    [data-ls-sidebtn="1"][data-live="0"] {
      background: var(--button-background-color, var(--secondary-color, #3c4043)) !important;
      color: var(--button-text-color, var(--color, #e8eaed)) !important;
    }
  `,document.head.appendChild(e)}function ni(){return'<svg class="ls-side-ico" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5.63605 5.63603L18.364 18.364M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'}function oi(){return'<svg class="ls-side-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'}function ll(){let e=k();if(e.bindLocalhostOnly!==!1)return"127.0.0.1";let t=String(e.bindAddress||"127.0.0.1").trim();return!t||t==="0.0.0.0"?"127.0.0.1":t}function cl(){let e=q(),t=k(),r=String(t.sideButtonRunningLabel||"{HOST}:{PORT}"),n=ll(),o=e.port||t.port||8080;return r.replace(/\{HOST\}/gi,n).replace(/\{PORT\}/gi,String(o))}function dl(){return String(k().sideButtonOfflineLabel||"Go Live")}function lr(e){return e?cl():dl()}function si(){var e;return k().showSideButton!==!1&&Te(G()||((e=window.editorManager)==null?void 0:e.activeFile))}function li(){return L?L.$el||L.el||L.root||(L instanceof HTMLElement?L:null):null}function ci(e,t){var i,a,d;if(!e)return!1;e.setAttribute("data-ls-sidebtn","1"),e.setAttribute("data-live",t?"1":"0");let r=lr(t),n=t?ni():oi(),o=e.querySelectorAll('.text, .label, .side-button-text, [class*="text"], span, small'),s=!1;for(let u of o)(i=u.classList)!=null&&i.contains("icon")||(a=u.classList)!=null&&a.contains("ls-side-ico")||(d=u.children)!=null&&d.length&&u.querySelector(".icon, svg")||(u.innerHTML=n+r,s=!0);if(!s){let u=e.querySelector(".icon");if(u){u.innerHTML=t?ni():oi();let p=!1;for(let c of e.childNodes)c.nodeType===3&&c.textContent.trim()&&(c.textContent=" "+r,p=!0);p||(e.setAttribute("aria-label",r),e.title=r)}else e.innerHTML=n+'<span class="ls-side-label">'+r+"</span>"}return e.setAttribute("aria-label",r),e.title=r,!0}function ul(e){return{text:lr(e),icon:e?"block":"public",backgroundColor:e?"#22c55e":void 0,textColor:e?"#0b1220":void 0,onclick:()=>pl()}}function ii(e){var t;try{(t=L==null?void 0:L.hide)==null||t.call(L)}catch{}if(L=null,!!ti)try{L=ti(ul(e));let r=li();r&&ci(r,e)}catch(r){console.warn("[LiveServer] recreate side",r)}}function ct(e){var t,r,n;try{ai();let o=e==null?!!q().running:!!e;if(document.body.classList.toggle("ls-server-live",o),!si()){try{(t=L==null?void 0:L.hide)==null||t.call(L)}catch{}fo=o;return}if(!L)ii(o);else{try{typeof L.setText=="function"&&L.setText(lr(o)),"text"in L&&(L.text=lr(o)),L.$text&&(L.$text.textContent=lr(o))}catch{}let s=li();(!(s?ci(s,o):!1)||fo!==o)&&ii(o)}si()?(r=L==null?void 0:L.show)==null||r.call(L):(n=L==null?void 0:L.hide)==null||n.call(L),fo=o}catch(o){console.warn("[LiveServer] setLiveDot",o)}}async function pl(){let t=q().running?["stop","Stop live server"]:["start","Start live server"],r=await al("Live Server",[t,["startSelected","Start server on selected path"],["restart","Restart server"],["port","Change port"],["root","Select root folder"],["rootBrowse","Select path (Acode browser)"],["browser","Open browser"],["deps","Check dependencies"],["settings","Settings"]],{hideOnSelect:!0});if(r){try{if(r==="start"){let{startServer:n}=await Promise.resolve().then(()=>(Q(),ae));await n()}else if(r==="startSelected"){let{startServer:n}=await Promise.resolve().then(()=>(Q(),ae)),{getSettings:o}=await Promise.resolve().then(()=>(K(),De)),{browseRootFolder:s,getEffectiveRoot:i}=await Promise.resolve().then(()=>(ze(),Je)),a=o().rootFolder||i();if(a||(a=await s()),!a){ri("Select a folder first",2e3);return}await n({root:a})}else if(r==="stop"){let{stopServer:n}=await Promise.resolve().then(()=>(Q(),ae));await n()}else if(r==="restart"){let{restartServer:n}=await Promise.resolve().then(()=>(Q(),ae));await n()}else if(r==="port"){let{changePortAndRestart:n}=await Promise.resolve().then(()=>(Q(),ae));await n()}else if(r==="root"){let{pickRootFolder:n}=await Promise.resolve().then(()=>(ze(),Je));await n()}else if(r==="rootBrowse"){let{browseRootFolder:n}=await Promise.resolve().then(()=>(ze(),Je));await n()}else if(r==="browser"){let{openBrowser:n}=await Promise.resolve().then(()=>(lt(),at)),o=q().url||"http://127.0.0.1:"+(q().port||8080)+"/";n(o,{restoreOnly:!0})}else if(r==="deps"){let{checkDependenciesAction:n}=await Promise.resolve().then(()=>(yt(),xr));await n()}else if(r==="settings"){let{openSettingsHub:n}=await Promise.resolve().then(()=>(tr(),zr));n()}}catch(n){ri(String((n==null?void 0:n.message)||n),2500)}ct(q().running)}}function ho(){if(k().showSideButton!==!1){ai();try{ct(q().running)}catch(e){console.warn("[LiveServer] side button",e)}}}function mo(){ct(q().running)}function go(){var e;try{(e=L==null?void 0:L.hide)==null||e.call(L)}catch{}L=null,document.body.classList.remove("ls-server-live")}var ti,al,ri,L,fo,Zr=R(()=>{K();Se();ue();ti=acode.require("sideButton"),al=acode.require("select"),ri=acode.require("toast"),L=null,fo=null});function di(){let e=[];return cr.forEach(t=>{e.includes(t.category)||e.push(t.category)}),e}function Ge(e){let t=k();return t[e]!==void 0?t[e]:Dt[e]}function ui(e){if(e.checkbox||e.noValue)return"";let t=Ge(e.key);if(e.select){let n=e.select.find(o=>String(Array.isArray(o)?o[0]:o)===String(t));return n?Array.isArray(n)?n[1]:n:String(t!=null?t:"")}if(e.secret)return t?"\u2022\u2022\u2022\u2022\u2022\u2022":"";let r=t==null?"":String(t);return r.length>28?r.slice(0,27)+"\u2026":r}async function hl(e){try{if(e==="start")return(await Promise.resolve().then(()=>(Q(),ae))).startServer();if(e==="stop")return(await Promise.resolve().then(()=>(Q(),ae))).stopServer();if(e==="restart")return(await Promise.resolve().then(()=>(Q(),ae))).restartServer();if(e==="open"){let r=(await Promise.resolve().then(()=>(ue(),Qe))).getServerStatus();return r.running?(await Promise.resolve().then(()=>(lt(),at))).openBrowser(r.url||"http://127.0.0.1:"+r.port+"/",{restoreOnly:!0}):Ye("Server is not running",2e3)}if(e==="root")return(await Promise.resolve().then(()=>(ze(),Je))).pickRootFolder();if(e==="status"){let r=(await Promise.resolve().then(()=>(ue(),Qe))).getServerStatus();return Ye(r.running?(r.url||"")+" \u2014 port "+r.port:"Not running",3e3)}if(e==="deps")return(await Promise.resolve().then(()=>(yt(),xr))).checkDependenciesAction();if(e==="reinstall")return(await Promise.resolve().then(()=>(yt(),xr))).reinstallDependenciesAction()}catch(t){Ye(String((t==null?void 0:t.message)||t),3e3)}}async function dr(e,t){var n,o;if(e==="__action")return await hl(t),!0;if(e==="__browserAction"){try{t==="clearHistory"?((await Promise.resolve().then(()=>($r(),Xn))).clearVisited(),Ye("Browser history cleared",1800)):t==="clearBookmarks"&&(H("browserBookmarks",[]),Ye("Bookmarks cleared",1800))}catch(s){Ye(String((s==null?void 0:s.message)||s),2500)}return!0}let r=t;if(e==="port"){let s=parseInt(String(t),10);if(!Number.isFinite(s)||s<1||s>65535)return Ye("Invalid port",1800),!1;r=s}else if(e==="autoShutdownMinutes"){let s=parseInt(String(t),10);if(!Number.isFinite(s)||s<0)return Ye("Invalid number",1800),!1;r=s}else if(e==="browserOpacity"){let s=parseFloat(String(t));r=Number.isFinite(s)?Math.min(1,Math.max(.1,Math.round(s*100)/100)):1}if(H(e,r),e==="sideButtonRunningLabel"||e==="sideButtonOfflineLabel")try{let s=await Promise.resolve().then(()=>(Zr(),vo));(n=s.setLiveDot)==null||n.call(s,null)}catch{}if(e==="enablePinchToZoom")try{let s=await Promise.resolve().then(()=>($r(),Xn));(o=s.applyPinchAll)==null||o.call(s)}catch{}if(e==="showSideButton")try{let s=await Promise.resolve().then(()=>(Zr(),vo));r===!1?s.unregisterSideButton():s.registerSideButton()}catch{}return!0}function pi(){return{list:cr.map(t=>{let r={key:t.key,text:t.text,category:t.category};return t.info&&(r.info=t.info),t.checkbox?(r.checkbox=!0,r.value=!!Ge(t.key)):t.select?(r.select=t.select,t.noValue?(r.value="",r.valueText=()=>"Choose\u2026"):r.value=t.asString?String(Ge(t.key)):Ge(t.key)):t.prompt&&(r.prompt=t.prompt,t.promptType&&(r.promptType=t.promptType),r.value=Ge(t.key),t.secret&&(r.valueText=n=>n?"\u2022\u2022\u2022\u2022\u2022\u2022":"")),r}),cb:(t,r)=>{dr(t,r)}}}var Ye,fl,cr,bo=R(()=>{on();K();Ye=acode.require("toast"),fl=[["start","Start server"],["stop","Stop server"],["restart","Restart server"],["open","Open browser"],["root","Select root folder"],["status","Show server status"],["deps","Check dependencies"],["reinstall","Reinstall dependencies"]],cr=[{key:"__action",category:"Actions",text:"Run action",info:"Start / stop / open browser / dependencies",select:fl,noValue:!0},{key:"port",category:"General",text:"Port",info:"Default 8080",prompt:"Port number",promptType:"number"},{key:"bindAddress",category:"General",text:"Bind address",select:[["127.0.0.1","Localhost only (127.0.0.1)"],["0.0.0.0","All interfaces (0.0.0.0)"]]},{key:"rootFolder",category:"General",text:"Root folder",info:"Empty = folder of the active HTML file",prompt:"Absolute folder path",promptType:"text"},{key:"liveReload",category:"General",text:"Live reload on save",checkbox:!0},{key:"openBrowserOnStart",category:"General",text:"Open browser on start",checkbox:!0},{key:"mirrorSharedStorage",category:"General",text:"Serve sdcard via safe copy",info:"Copy the HTML + its dependencies from sdcard / SD card into Alpine cache and keep them synced",checkbox:!0},{key:"autoShutdownMinutes",category:"General",text:"Auto shutdown (minutes)",info:"0 = off",prompt:"Minutes (0 = off)",promptType:"number"},{key:"browserDisplayMode",category:"Browser",text:"Show browser in",info:"Acode page or editor tab",select:[["inPage","Acode page (default)"],["editorTab","Editor tab"]]},{key:"browserSearchEngine",category:"Browser",text:"Search engine",info:"Used when searching keywords in address bar or New Tab",select:[["google","Google"],["duckduckgo","DuckDuckGo"],["bing","Bing"],["brave","Brave Search"]]},{key:"externalSiteMode",category:"Browser",text:"External websites",info:"Proxy auto-switches to Chromium if slow, or select Chromium directly",select:[["proxy","Local Node.js Reverse Proxy (Default)"],["acodeWebview","Acode Native WebView (Fullscreen)"],["inApp","Direct iframe (without proxy)"],["systemBrowser","Chrome / External system browser"]]},{key:"browserHomeUrl",category:"Browser",text:"Home button URL",info:"Empty = Green Fox Homepage",prompt:"Home URL (leave empty for Green Fox Homepage)",promptType:"text"},{key:"browserOpacity",category:"Browser",text:"Browser opacity",info:"0.1 - 1.0 (page mode)",asString:!0,select:["0.1","0.2","0.3","0.4","0.5","0.6","0.7","0.8","0.9","1"].map(e=>[e,e])},{key:"enablePinchToZoom",category:"Browser",text:"Pinch to zoom",info:"Two-finger zoom, drag to pan, double-tap to reset (served pages reload when toggled)",checkbox:!0},{key:"browserOverlay",category:"Browser",text:"Preview as overlay",info:"See-through preview over the editor; you can still type in the editor",checkbox:!0},{key:"overlayAutoSave",category:"Browser",text:"Auto-save in overlay mode",info:"Saves the file after you stop typing so the preview updates live",checkbox:!0},{key:"showAddressBar",category:"Browser",text:"Show address bar",checkbox:!0},{key:"showSideButton",category:"Browser",text:"Show side button",checkbox:!0},{key:"sideButtonRunningLabel",category:"Browser",text:"Side button running label",value:"{HOST}:{PORT}",valueText:e=>String(e||"{HOST}:{PORT}"),prompt:"Running label ({HOST} {PORT} tokens)",promptType:"text",info:"Shown when server is live. Tokens: {HOST} {PORT}."},{key:"sideButtonOfflineLabel",category:"Browser",text:"Side button offline label",value:"Go Live",valueText:e=>String(e||"Go Live"),prompt:"Offline label",promptType:"text",info:"Shown when server is stopped."},{key:"__browserAction",category:"Browser",text:"Browser data",info:"Clear recent history or saved bookmarks",select:[["clearHistory","Clear recent history"],["clearBookmarks","Clear all bookmarks"]],noValue:!0},{key:"directoryListing",category:"HTML / static",text:"Enable directory listing",checkbox:!0},{key:"enableCors",category:"HTML / static",text:"Enable CORS",checkbox:!0},{key:"customCharset",category:"HTML / static",text:"Custom charset",prompt:"Charset",promptType:"text"},{key:"customHeaders",category:"HTML / static",text:"Custom response headers",info:'One "Header: value" per line',prompt:"Custom headers",promptType:"textarea"},{key:"bindLocalhostOnly",category:"Security",text:"Prefer localhost bind",checkbox:!0},{key:"ipWhitelist",category:"Security",text:"Client IP whitelist",info:"Comma or newline separated; empty = all",prompt:"IP whitelist",promptType:"textarea"},{key:"basicAuthUser",category:"Security",text:"Basic auth user",prompt:"User name",promptType:"text"},{key:"basicAuthPass",category:"Security",text:"Basic auth password",prompt:"Password",promptType:"text",secret:!0}]});var zr={};xe(zr,{openSettingsHub:()=>El,registerPluginSettings:()=>bi});function wl(){if(document.getElementById("ls-settings-css"))return;let e=document.createElement("style");e.id="ls-settings-css",e.textContent=yl,document.head.appendChild(e)}function Me(e,t,r){let n=document.createElement(e);return t&&(n.className=t),r!=null&&(n.textContent=r),n}function gi(e,t,r,n){let o=Me("div","ls-set-row");o.setAttribute("role","button"),o.tabIndex=0;let s=Me("div","ls-set-main");return s.appendChild(Me("div","ls-set-title",e)),t&&s.appendChild(Me("div","ls-set-info",t)),o.appendChild(s),r&&o.appendChild(r),o.addEventListener("click",n),o}function vi(){let e=Me("span","ls-set-chev");return e.innerHTML=Kt(bl,16),e}async function xl(e,t){let r=Ge(e.key);if(e.checkbox)return await dr(e.key,!r),t();if(e.select){let n=await gl(e.text,e.select,{hideOnSelect:!0,default:e.noValue?void 0:String(r)});n!=null&&(await dr(e.key,n),t());return}if(e.prompt){let n=e.promptType==="number"?"number":e.promptType==="textarea"?"textarea":"text",o=await vl(e.prompt,r==null?"":String(r),n);o!=null&&(await dr(e.key,o),t())}}function Sl(e,t){e.textContent="",di().forEach(r=>{let n=cr.filter(o=>o.category===r).length;e.appendChild(gi(r,n+" options",vi(),()=>t(r)))})}function kl(e,t,r){e.textContent="",cr.filter(n=>n.category===t).forEach(n=>{let o=null;if(n.checkbox)o=Me("span","ls-set-switch"+(Ge(n.key)?" is-on":""));else{o=Me("span"),o.style.cssText="display:flex;align-items:center;gap:6px;min-width:0;max-width:50%";let s=ui(n);s&&o.appendChild(Me("span","ls-set-val",s)),o.appendChild(vi())}e.appendChild(gi(n.text,n.info,o,()=>xl(n,r)))})}function mi(e,t,r){var d,u;wl();let n=document.createElement("span");n.className="icon arrow_back",n.dataset.action="back",n.style.cssText="pointer-events:auto;cursor:pointer;";let o=ml(e,{lead:n}),s=Me("div","ls-set-body");try{o.appendBody(s)}catch{(d=o.appendChild)==null||d.call(o,s)}let i=()=>t(s,i),a=()=>{var p,c;try{fi.remove(r)}catch{}try{(p=o.hide)==null||p.call(o)}catch{}try{(c=o.remove)==null||c.call(o)}catch{}};n.onclick=p=>{var c,g;try{(c=p==null?void 0:p.preventDefault)==null||c.call(p),(g=p==null?void 0:p.stopPropagation)==null||g.call(p)}catch{}a()};try{fi.push({id:r,action:a})}catch{}i();try{(window.app||document.body).append(o)}catch{document.body.append(o)}try{(u=o.show)==null||u.call(o)}catch{}}function El(){mi("Live Server",e=>Sl(e,t=>mi(t,(r,n)=>kl(r,t,n),hi+t)),hi+"hub")}function bi(){}var ml,fi,gl,vl,hi,bl,yl,tr=R(()=>{bo();Gn();ml=acode.require("page"),fi=acode.require("actionStack"),gl=acode.require("select"),vl=acode.require("prompt"),hi="liveserver-settings-",bl="M9 18l6-6-6-6",yl=`
.ls-set-body{height:100%;overflow:auto;padding:4px 0 24px}
.ls-set-row{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;border-bottom:1px solid rgba(128,128,128,.15)}
.ls-set-row:active{background:rgba(128,128,128,.14)}
.ls-set-main{flex:1;min-width:0}
.ls-set-title{font-size:15px}
.ls-set-info{font-size:12px;opacity:.65;margin-top:2px}
.ls-set-val{max-width:45%;font-size:12px;opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ls-set-chev{display:inline-flex;opacity:.55;flex-shrink:0}
.ls-set-switch{position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0}
.ls-set-switch::before{content:'';position:absolute;inset:0;border-radius:3px;background:rgba(128,128,128,.45);transition:background .15s}
.ls-set-switch::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:3px;background:#fff;transition:transform .15s}
.ls-set-switch.is-on::before{background:var(--active-color,#61afef)}
.ls-set-switch.is-on::after{transform:translateX(18px)}
`});var nn={id:"acode.plugin.sugerserver",name:"Html Server Pro - Devtool",main:"main.js",version:"2.0.0",readme:"readme.md",icon:"icon.png",files:["acodels/","devtool/","icon.png","readme.md"],minVersionCode:1011,license:"Proprietary",changelogs:"changelogs.md",keywords:["Live Server Pro","HTML","HTTP","browser","preview"],price:70,repository:"",author:{name:"Dev.Sourav",email:"devs.sourav@gmail.com",github:"Sou6900"}};tr();Zr();Se();var yo=acode.require("toast"),wo=[];function yi(){try{let e=acode.require("commands");if(!(e!=null&&e.add))return;let t=(r,n,o)=>{try{e.add({name:r,description:n,exec:o}),wo.push(r)}catch{}};t("liveserver:run-file","Live Server: Run this file in HTTP server",async()=>{if(!G())return yo("Open a file in the editor first",2e3);let{startServer:n}=await Promise.resolve().then(()=>(Q(),ae));await n()}),t("liveserver:select-root","Live Server: Select root folder",async()=>{let{pickRootFolder:r}=await Promise.resolve().then(()=>(ze(),Je));await r()}),t("liveserver:run-selected-root","Live Server: Run HTTP server for selected / saved root",async()=>{let{startServer:r}=await Promise.resolve().then(()=>(Q(),ae)),{getSettings:n}=await Promise.resolve().then(()=>(K(),De)),{rootFromSelectedFolder:o}=await Promise.resolve().then(()=>(ze(),Je)),s=n().rootFolder||o();if(!s)return yo("Select a root folder first (command: Select root folder)",3e3);await r({root:s})}),t("liveserver:stop","Live Server: Stop server",async()=>{let{stopServer:r}=await Promise.resolve().then(()=>(Q(),ae));await r()}),t("liveserver:restart","Live Server: Restart server",async()=>{let{restartServer:r}=await Promise.resolve().then(()=>(Q(),ae));await r()}),t("liveserver:open-browser","Live Server: Open browser",async()=>{let{getServerStatus:r}=await Promise.resolve().then(()=>(ue(),Qe)),{openBrowser:n}=await Promise.resolve().then(()=>(lt(),at)),o=r();if(!o.running)return yo("Server is not running",2e3);n(o.url||`http://127.0.0.1:${o.port}/`,{restoreOnly:!0})}),t("liveserver:settings","Live Server: Open settings",async()=>{let{openSettingsHub:r}=await Promise.resolve().then(()=>(tr(),zr));r()})}catch(e){console.warn("[LiveServer] commands",e)}}function wi(){try{let e=acode.require("commands");wo.forEach(t=>{var r;try{(r=e==null?void 0:e.remove)==null||r.call(e,t)}catch{}})}catch{}wo=[]}Ln();Se();Se();Q();var xi=acode.require("toast"),xo=!1;async function Si(e){var t;if(xo)return!1;xo=!0;try{let r=e||G();if(!Te(r))return xi("Open an .html / .htm file first",2e3),!1;if(r.isUnsaved&&(r.uri||r.url))try{await((t=r.save)==null?void 0:t.call(r))}catch(n){console.warn("[LiveServer] save before run",n)}return await ar({openBrowser:!0})}catch(r){return xi(String((r==null?void 0:r.message)||r),3e3),!1}finally{xo=!1}}var W=null,Kr=null,So=!1;function Ll(){if(document.getElementById("ls-run-css"))return;let e=document.createElement("style");e.id="ls-run-css",e.textContent=`
    body.ls-html-file #root > header.tile > [action="run"]:not([data-ls-run]) {
      display: none !important;
    }
  `,document.head.appendChild(e)}var ki="#root > header.tile";function _l(){return document.querySelector(`${ki} > span.icon.play_arrow[action="run"]`)||document.querySelector('[action="run"]:not([data-ls-run])')}async function Tl(e){var t;if(e.preventDefault(),e.stopPropagation(),!So){So=!0;try{let r=G()||((t=window.editorManager)==null?void 0:t.activeFile);await Si(r)}catch(r){console.error("[LiveServer] runPreview failed:",r);try{acode.require("toast")((r==null?void 0:r.message)||"Failed to launch Live Server")}catch{}}finally{So=!1}}}function Ee(){var o;Ll();let e=G()||((o=window.editorManager)==null?void 0:o.activeFile),t=Te(e);if(document.body.classList.toggle("ls-html-file",t),!t){W!=null&&W.isConnected&&W.remove();return}W||(W=document.createElement("span"),W.className="icon play_arrow",W.setAttribute("action","run-live-server"),W.setAttribute("data-ls-run","1"),W.setAttribute("title","Run with Live Server"),W.onclick=Tl),W.className="icon play_arrow";let r=_l(),n=document.querySelector(ki);r&&r.parentNode?(W.parentNode!==r.parentNode||W.nextSibling!==r)&&r.parentNode.insertBefore(W,r):n&&!W.isConnected&&n.insertBefore(W,n.lastChild)}function Ei(){Ee(),window.editorManager&&(editorManager.off("switch-file",Ee),editorManager.off("rename-file",Ee),editorManager.on("switch-file",Ee),editorManager.on("rename-file",Ee)),clearInterval(Kr),Kr=setInterval(Ee,1500)}function Li(){var e;clearInterval(Kr),Kr=null,window.editorManager&&(editorManager.off("switch-file",Ee),editorManager.off("rename-file",Ee));try{W==null||W.remove()}catch{}W=null,document.body.classList.remove("ls-html-file"),(e=document.getElementById("ls-run-css"))==null||e.remove()}yt();Q();ue();K();ue();Se();var Ot=null;function _i(){var e;if(!Ot){Ot=async t=>{try{if(k().liveReload===!1)return;let r=q();if(!r.running||!r.port)return;await fetch(`http://127.0.0.1:${r.port}/reload`,{method:"POST"}).catch(()=>{}),(Te(t)||Te(editorManager==null?void 0:editorManager.activeFile))&&console.log("[LiveServer] reload signal after save")}catch(r){console.warn("[LiveServer] save reload",r)}};try{(e=editorManager==null?void 0:editorManager.on)==null||e.call(editorManager,"save-file",Ot)}catch{}}}function Ti(){var e;try{Ot&&((e=editorManager==null?void 0:editorManager.off)==null||e.call(editorManager,"save-file",Ot))}catch{}Ot=null}var ko=null;function Ci(){ko&&(ko(!1),ko=null)}Ar();var Ri=["switch-file","rename-file","file-loaded","new-file"],Jr="",ur=null,dt=null,pr=null;async function Ai(e){Jr=e||"",lo(Jr),us(Jr),fn();try{let{getSettings:r,updateSetting:n}=await Promise.resolve().then(()=>(K(),De)),o=r().acodelsPath||"";/^\/public|com\.termux/.test(String(o))&&n("acodelsPath","")}catch{}try{}catch(r){console.warn("[LiveServer] settings",r)}try{ho()}catch(r){console.warn("[LiveServer] side",r)}try{yi()}catch(r){console.warn("[LiveServer] commands",r)}try{_i()}catch(r){console.warn("[LiveServer] liveReload",r)}try{Ei()}catch(r){console.warn("[LiveServer] run button",r)}ur=()=>{mo(),Ee()},Ri.forEach(r=>{var n;try{(n=editorManager==null?void 0:editorManager.on)==null||n.call(editorManager,r,ur)}catch{}}),dt=()=>ct(q().running);try{window.addEventListener("liveserver-status",dt),window.addEventListener("liveserver-started",dt),window.addEventListener("liveserver-stopped",dt)}catch{}let t=async()=>{let r=await po();ct(r)};t(),setTimeout(t,1200),setTimeout(ur,400),pr=()=>{document.visibilityState==="visible"&&t()},document.addEventListener("visibilitychange",pr);try{window.addEventListener("liveserver-settings",async()=>{try{let{reapplySetup:r}=await Promise.resolve().then(()=>(Q(),ae));q().running&&await r()}catch{}})}catch{}console.log("[LiveServer] v2 init",Jr)}function Pi(){Ri.forEach(e=>{var t;try{ur&&((t=editorManager==null?void 0:editorManager.off)==null||t.call(editorManager,e,ur))}catch{}});try{Li()}catch{}try{window.removeEventListener("liveserver-status",dt),window.removeEventListener("liveserver-started",dt),window.removeEventListener("liveserver-stopped",dt)}catch{}pr&&(document.removeEventListener("visibilitychange",pr),pr=null),Ci(),ss(),go(),wi();try{Ti()}catch{}try{Promise.resolve().then(()=>(lt(),at)).then(e=>{var t;return(t=e.hideBrowser)==null?void 0:t.call(e)})}catch{}try{Promise.resolve().then(()=>(to(),zs)).then(e=>{var t;return(t=e.destroyAcodeWebview)==null?void 0:t.call(e)})}catch{}}bo();var Qr=class{constructor(){this.baseUrl=""}async init(t){var r;this.baseUrl=(r=t==null?void 0:t.endsWith)!=null&&r.call(t,"/")?t:`${t||""}/`,await Ai(this.baseUrl)}async destroy(){Pi()}};if(window.acode){let e=new Qr;acode.setPluginInit(nn.id,async t=>{var r;e.baseUrl=(r=t==null?void 0:t.endsWith)!=null&&r.call(t,"/")?t:`${t||""}/`,await e.init(e.baseUrl)},pi()),acode.setPluginUnmount(nn.id,()=>{e.destroy()})}var zd=Qr;})();
