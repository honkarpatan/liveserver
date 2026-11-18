/**
 * Opacity popover: slider 0.1 - 1.0 + "Preview as overlay" toggle next to it.
 */
import { openPanel } from './dropdown.js';

export const MIN_OPACITY = 0.1;
export const MAX_OPACITY = 1;

export function clampOpacity(v) {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, Math.round(n * 100) / 100));
}

export function fmtOpacity(v) {
  return String(clampOpacity(v)).replace(/(\.\d)0$/, '$1');
}

function row(label, on, disabled) {
  const r = document.createElement('div');
  r.className = 'ls-op-row' + (disabled ? ' is-disabled' : '');
  const l = document.createElement('span');
  l.textContent = label;
  const sw = document.createElement('span');
  sw.className = 'ls-switch' + (on ? ' is-on' : '');
  r.append(l, sw);
  return { r, sw };
}

/**
 * @param {object} o
 * @param {HTMLElement} o.host
 * @param {HTMLElement} o.anchor
 * @param {() => {opacity:number, overlay:boolean, autoSave:boolean, canOverlay:boolean}} o.get
 * @param {(patch: object) => void} o.set   patch keys: opacity | overlay | autoSave
 */
export function openOpacityPanel({ host, anchor, get, set }) {
  return openPanel({
    host,
    anchor,
    render(panel) {
      const s = get();
      const head = document.createElement('div');
      head.className = 'ls-op-head';
      const t = document.createElement('span');
      t.textContent = 'Browser opacity';
      const val = document.createElement('span');
      val.className = 'ls-op-val';
      val.textContent = fmtOpacity(s.opacity);
      head.append(t, val);

      const range = document.createElement('input');
      range.type = 'range';
      range.className = 'ls-range';
      range.min = String(MIN_OPACITY);
      range.max = String(MAX_OPACITY);
      range.step = '0.05';
      range.value = String(clampOpacity(s.opacity));
      const paint = () => {
        const f = ((range.value - MIN_OPACITY) / (MAX_OPACITY - MIN_OPACITY)) * 100;
        range.style.setProperty('--ls-fill', f + '%');
      };
      paint();
      range.addEventListener('input', () => {
        paint();
        val.textContent = fmtOpacity(range.value);
        set({ opacity: clampOpacity(range.value) });
      });

      const ov = row('Preview as overlay', s.overlay, !s.canOverlay);
      const auto = row('Auto-save while typing', s.autoSave, false);
      auto.r.style.display = s.overlay ? '' : 'none';

      ov.r.addEventListener('click', () => {
        const on = !ov.sw.classList.contains('is-on');
        ov.sw.classList.toggle('is-on', on);
        auto.r.style.display = on ? '' : 'none';
        set({ overlay: on });
      });
      auto.r.addEventListener('click', () => {
        const on = !auto.sw.classList.contains('is-on');
        auto.sw.classList.toggle('is-on', on);
        set({ autoSave: on });
      });

      const hint = document.createElement('div');
      hint.className = 'ls-op-hint';
      hint.textContent = s.canOverlay
        ? 'Overlay: the preview is see-through and you can keep editing underneath.'
        : 'Overlay needs the Acode page display mode.';

      panel.append(head, range, ov.r, auto.r, hint);
    },
  });
}
