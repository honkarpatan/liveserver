/**
 * Device mode (Chrome DevTools "responsive" toolbar).
 * The page lives in an iframe of EXACT css-pixel size, scaled with a transform, so media
 * queries / vw / vh see the real device width and height. Drag handles resize it live.
 */
import { icon, I } from './icons.js';
import { openDropdown } from './dropdown.js';
import { DEVICES, ZOOMS, findDevice, clampSize, computeScale, MIN_SIZE } from './devices.js';

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/**
 * @param {object} o
 * @param {HTMLElement} o.shell   browser shell (gets .is-device)
 * @param {HTMLElement} o.stage   scrolling area around the frame
 * @param {HTMLElement} o.box     sized wrapper (w*scale x h*scale)
 * @param {HTMLElement} o.device  the real-size frame holder (iframes live here)
 * @param {HTMLElement} o.bar     toolbar row
 * @param {(state: object) => void} [o.onChange]
 */
export function createDeviceMode({ shell, stage, box, device, bar, onChange }) {
  const st = { on: false, id: 'responsive', w: 390, h: 844, zoom: 'fit' };
  let scale = 1;
  let ro = null;

  // ---- toolbar
  const devBtn = el('button', 'ls-dev-btn ls-dev-device');
  devBtn.type = 'button';
  const wIn = el('input', 'ls-dev-num');
  const hIn = el('input', 'ls-dev-num');
  [wIn, hIn].forEach((i) => {
    i.type = 'number';
    i.min = String(MIN_SIZE);
    i.inputMode = 'numeric';
  });
  const times = el('span', 'ls-dev-x', '&times;');
  const zoomBtn = el('button', 'ls-dev-btn ls-dev-zoom');
  zoomBtn.type = 'button';
  const rotBtn = el('button', 'ls-dev-icon', icon(I.rotate, 16));
  rotBtn.type = 'button';
  rotBtn.title = 'Rotate';
  const closeBtn = el('button', 'ls-dev-icon', icon(I.close, 16));
  closeBtn.type = 'button';
  closeBtn.title = 'Close device mode';
  const spacer = el('span', 'ls-dev-spacer');
  bar.append(devBtn, wIn, times, hIn, zoomBtn, rotBtn, spacer, closeBtn);

  function fireChange() {
    try {
      onChange?.({ ...st });
    } catch (_) {}
  }

  function labelZoom() {
    return st.zoom === 'fit' ? 'Fit to window (' + Math.round(scale * 100) + '%)' : st.zoom + '%';
  }

  function syncBar() {
    devBtn.innerHTML = '<span>' + findDevice(st.id).name + '</span>' + icon(I.down, 12);
    if (document.activeElement !== wIn) wIn.value = String(st.w);
    if (document.activeElement !== hIn) hIn.value = String(st.h);
    zoomBtn.innerHTML = '<span>' + labelZoom() + '</span>' + icon(I.down, 12);
  }

  function layout() {
    shell.classList.toggle('is-device', st.on);
    bar.hidden = !st.on;
    if (!st.on) {
      box.style.width = '';
      box.style.height = '';
      device.style.width = '';
      device.style.height = '';
      device.style.transform = '';
      return;
    }
    const availW = stage.clientWidth - 24;
    const availH = stage.clientHeight - 24;
    scale = computeScale(st.zoom, st.w, st.h, availW, availH);
    box.style.width = Math.round(st.w * scale) + 'px';
    box.style.height = Math.round(st.h * scale) + 'px';
    device.style.width = st.w + 'px';
    device.style.height = st.h + 'px';
    device.style.transform = 'scale(' + scale + ')';
    syncBar();
  }

  function setSize(w, h, keepId) {
    const cw = clampSize(w);
    const ch = clampSize(h);
    if (cw != null) st.w = cw;
    if (ch != null) st.h = ch;
    if (!keepId) st.id = 'responsive';
    layout();
    fireChange();
  }

  function setDevice(id) {
    const d = findDevice(id);
    st.id = d.id;
    st.w = d.w;
    st.h = d.h;
    layout();
    fireChange();
  }

  // ---- toolbar actions
  devBtn.addEventListener('click', () => {
    openDropdown({
      host: shell,
      anchor: devBtn,
      items: DEVICES.map((d) => ({
        label: d.id === 'responsive' ? d.name : d.name + '  ' + d.w + ' x ' + d.h,
        checked: d.id === st.id,
        onClick: () => setDevice(d.id),
      })),
    });
  });
  zoomBtn.addEventListener('click', () => {
    openDropdown({
      host: shell,
      anchor: zoomBtn,
      items: ZOOMS.map((z) => ({
        label: z === 'fit' ? 'Fit to window' : z + '%',
        checked: z === st.zoom,
        onClick: () => {
          st.zoom = z;
          layout();
          fireChange();
        },
      })),
    });
  });
  rotBtn.addEventListener('click', () => setSize(st.h, st.w, true));
  closeBtn.addEventListener('click', () => api.toggle(false));
  const commit = () => setSize(wIn.value, hIn.value);
  [wIn, hIn].forEach((i) => {
    i.addEventListener('change', commit);
    i.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        commit();
        i.blur();
      }
    });
  });

  // ---- drag handles (right / bottom / corner)
  ['r', 'b', 'c'].forEach((k) => {
    const h = el('div', 'ls-hdl ls-hdl-' + k);
    box.appendChild(h);
    h.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const sx = e.clientX;
      const sy = e.clientY;
      const sw = st.w;
      const sh = st.h;
      try {
        h.setPointerCapture(e.pointerId);
      } catch (_) {}
      device.style.pointerEvents = 'none';
      const move = (ev) => {
        const s = scale || 1;
        const nw = k === 'b' ? sw : sw + (ev.clientX - sx) / s;
        const nh = k === 'r' ? sh : sh + (ev.clientY - sy) / s;
        st.id = 'responsive';
        st.w = clampSize(nw) ?? st.w;
        st.h = clampSize(nh) ?? st.h;
        layout();
      };
      const up = () => {
        h.removeEventListener('pointermove', move);
        h.removeEventListener('pointerup', up);
        h.removeEventListener('pointercancel', up);
        device.style.pointerEvents = '';
        fireChange();
      };
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', up);
      h.addEventListener('pointercancel', up);
    });
  });

  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(() => {
      if (st.on && st.zoom === 'fit') layout();
    });
    ro.observe(stage);
  }

  const api = {
    getState: () => ({ ...st }),
    getScale: () => scale,
    isOn: () => st.on,
    setState(next) {
      if (!next) return;
      if (typeof next.id === 'string') st.id = findDevice(next.id).id;
      if (clampSize(next.w) != null) st.w = clampSize(next.w);
      if (clampSize(next.h) != null) st.h = clampSize(next.h);
      if (next.zoom != null) st.zoom = ZOOMS.includes(next.zoom) ? next.zoom : 'fit';
      st.on = !!next.on;
      layout();
    },
    toggle(on) {
      st.on = on == null ? !st.on : !!on;
      layout();
      fireChange();
      return st.on;
    },
    layout,
    destroy() {
      try {
        ro?.disconnect();
      } catch (_) {}
    },
  };
  syncBar();
  return api;
}
