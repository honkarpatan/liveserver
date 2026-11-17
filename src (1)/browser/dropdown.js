/**
 * Desktop-style dropdown menu with toggleable submenus.
 */
import { svgIcon } from '../utils/svg.js';

const CHECK = 'M20 6L9 17l-5-5';
const CHEVRON = 'M9 18l6-6-6-6';

let current = null;

function mk(tag, cls) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

export function closeDropdown() {
  if (current) current.close();
}

export function isDropdownOpen() {
  return !!current;
}

export function openDropdown({ host, anchor, items, onClose }) {
  closeDropdown();
  if (!host || !items?.length) return { close() {} };

  const layer = mk('div', 'ls-dd-layer');
  const backdrop = mk('div', 'ls-dd-backdrop');
  layer.appendChild(backdrop);
  host.appendChild(layer);

  const menus = []; // index = depth
  let closed = false;

  function closeFrom(depth) {
    while (menus.length > depth) menus.pop().remove();
  }

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    try {
      layer.remove();
    } catch (_) {}
    if (current && current.close === close) current = null;
    try {
      onClose?.();
    } catch (_) {}
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }

  function place(menu, depth, rect) {
    const h = host.getBoundingClientRect();
    const w = menu.offsetWidth;
    const mh = menu.offsetHeight;
    let left;
    let top;

    if (depth === 0) {
      top = rect.bottom - h.top + 2;
      left = rect.right - h.left - w;
      if (left < 4) left = rect.left - h.left;
    } else {
      top = rect.top - h.top - 4;
      left = rect.right - h.left - 2;
      if (left + w > h.width - 4) left = rect.left - h.left - w + 2;
    }

    if (left + w > h.width - 4) left = h.width - w - 4;
    if (left < 4) left = 4;

    const room = h.height - top - 4;
    if (mh > room && h.height) {
      if (depth > 0 && h.height - mh - 4 > 0) top = h.height - mh - 4;
      else menu.style.maxHeight = Math.max(room, 80) + 'px';
    }
    if (top < 4) top = 4;

    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }

  function build(list, depth, rect) {
    closeFrom(depth);
    const menu = mk('div', 'ls-dd-menu');
    menu.setAttribute('role', 'menu');
    menu.style.visibility = 'hidden';

    list.forEach((it) => {
      if (it.separator) {
        menu.appendChild(mk('div', 'ls-dd-sep'));
        return;
      }
      if (it.render) {
        const custom = mk('div', 'ls-dd-custom');
        it.render(custom, close);
        menu.appendChild(custom);
        return;
      }

      const row = mk('div', 'ls-dd-item' + (it.disabled ? ' is-disabled' : ''));
      row.setAttribute('role', 'menuitem');

      const chk = mk('span', 'ls-dd-check');
      if (it.checked) chk.innerHTML = svgIcon(CHECK, 14);
      row.appendChild(chk);

      const label = mk('span', 'ls-dd-label');
      label.textContent = it.label;
      row.appendChild(label);

      if (it.children) {
        const arrow = mk('span', 'ls-dd-arrow');
        arrow.innerHTML = svgIcon(CHEVRON, 14);
        row.appendChild(arrow);
      }

      const openChildren = () => {
        menu.querySelectorAll('.ls-dd-item.is-active').forEach((n) => n.classList.remove('is-active'));
        row.classList.add('is-active');
        build(it.children, depth + 1, row.getBoundingClientRect());
      };

      const closeChildren = () => {
        closeFrom(depth + 1);
        row.classList.remove('is-active');
      };

      row.addEventListener('pointerenter', (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        if (it.children) openChildren();
        else {
          closeFrom(depth + 1);
          menu.querySelectorAll('.ls-dd-item.is-active').forEach((n) => n.classList.remove('is-active'));
        }
      });

      row.addEventListener('click', (e) => {
        e.stopPropagation();
        if (it.disabled) return;
        // Toggle submenu show/hide on click
        if (it.children) {
          if (row.classList.contains('is-active') && menus.length > depth + 1) {
            closeChildren();
          } else {
            openChildren();
          }
          return;
        }
        close();
        try {
          it.onClick?.();
        } catch (err) {
          console.warn('[LiveServer] menu item', err);
        }
      });

      menu.appendChild(row);
    });

    layer.appendChild(menu);
    menus.push(menu);
    place(menu, depth, rect);
    menu.style.visibility = '';
    return menu;
  }

  backdrop.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });
  backdrop.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    close();
  });
  document.addEventListener('keydown', onKey, true);

  const rect = anchor ? anchor.getBoundingClientRect() : host.getBoundingClientRect();
  build(items, 0, rect);

  current = { close };
  return { close };
}

export function openPanel({ host, anchor, render, onClose }) {
  closeDropdown();
  if (!host) return { close() {} };

  const layer = mk('div', 'ls-dd-layer');
  const backdrop = mk('div', 'ls-dd-backdrop');
  const panel = mk('div', 'ls-dd-menu ls-dd-panel');
  layer.append(backdrop, panel);
  host.appendChild(layer);

  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    try {
      layer.remove();
    } catch (_) {}
    if (current && current.close === close) current = null;
    try {
      onClose?.();
    } catch (_) {}
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }

  backdrop.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });
  document.addEventListener('keydown', onKey, true);

  render(panel, close);

  const h = host.getBoundingClientRect();
  const r = anchor ? anchor.getBoundingClientRect() : h;
  const w = panel.offsetWidth;
  let left = r.right - h.left - w;
  if (left > h.width - w - 4) left = h.width - w - 4;
  if (left < 4) left = 4;
  panel.style.left = left + 'px';
  panel.style.top = r.bottom - h.top + 2 + 'px';

  current = { close };
  return { close, panel };
}