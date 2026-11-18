/** Device presets (CSS pixels, same values Chrome DevTools uses) */
export const DEVICES = [
  { id: 'responsive', name: 'Responsive', w: 390, h: 844 },
  { id: 'iphone-se', name: 'iPhone SE', w: 375, h: 667 },
  { id: 'iphone-xr', name: 'iPhone XR', w: 414, h: 896 },
  { id: 'iphone-12-pro', name: 'iPhone 12 Pro', w: 390, h: 844 },
  { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', w: 430, h: 932 },
  { id: 'pixel-7', name: 'Pixel 7', w: 412, h: 915 },
  { id: 'galaxy-s8-plus', name: 'Samsung Galaxy S8+', w: 360, h: 740 },
  { id: 'galaxy-s20-ultra', name: 'Samsung Galaxy S20 Ultra', w: 412, h: 915 },
  { id: 'galaxy-fold', name: 'Galaxy Fold', w: 280, h: 653 },
  { id: 'surface-duo', name: 'Surface Duo', w: 540, h: 720 },
  { id: 'ipad-mini', name: 'iPad Mini', w: 768, h: 1024 },
  { id: 'ipad-air', name: 'iPad Air', w: 820, h: 1180 },
  { id: 'ipad-pro', name: 'iPad Pro', w: 1024, h: 1366 },
  { id: 'surface-pro-7', name: 'Surface Pro 7', w: 912, h: 1368 },
  { id: 'nest-hub', name: 'Nest Hub', w: 1024, h: 600 },
  { id: 'nest-hub-max', name: 'Nest Hub Max', w: 1280, h: 800 },
  { id: 'laptop', name: 'Laptop 1366', w: 1366, h: 768 },
  { id: 'desktop', name: 'Desktop 1920', w: 1920, h: 1080 },
];

export const ZOOMS = ['fit', 25, 50, 75, 100, 125, 150, 200];

export function findDevice(id) {
  return DEVICES.find((d) => d.id === id) || DEVICES[0];
}

export const MIN_SIZE = 50;
export const MAX_SIZE = 9999;

export function clampSize(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return null;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, v));
}

/** scale factor for the device frame inside a stage of availW x availH */
export function computeScale(zoom, w, h, availW, availH) {
  if (zoom !== 'fit') return Math.max(0.1, Number(zoom) / 100);
  if (!availW || !availH) return 1;
  return Math.min(1, availW / w, availH / h);
}
