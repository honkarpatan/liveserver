/** Pinch / pan / double-tap zoom for the browser iframe (same engine as acodels/zoom-handler.js) */
export class ZoomHandler {
  constructor(element) {
    this.element = element;
    if (!this.element) return;

    this.s = 1; // applied scale
    this.tx = 0; // applied translation (px, parent space)
    this.ty = 0;
    this.mode = null; // 'pinch' | 'pan' | null
    this.startDist = 1;
    this.startScale = 1;
    this.focal = { x: 0, y: 0 };
    this.panStart = null;
    this.lastTap = 0;
    this.tapStart = null;

    this.onStart = this.onStart.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onEnd = this.onEnd.bind(this);
    this.onDblClick = this.onDblClick.bind(this);

    this.element.style.transformOrigin = '0 0';
    this.syncTouchAction();
    // passive:false is required, otherwise preventDefault() is ignored on <body>/<html>
    // and the page keeps scrolling / native-zooming underneath the gesture.
    this.element.addEventListener('touchstart', this.onStart, { passive: false });
    this.element.addEventListener('touchmove', this.onMove, { passive: false });
    this.element.addEventListener('touchend', this.onEnd);
    this.element.addEventListener('touchcancel', this.onEnd);
    this.element.addEventListener('dblclick', this.onDblClick);
  }

  destroy() {
    if (!this.element) return;
    this.element.removeEventListener('touchstart', this.onStart);
    this.element.removeEventListener('touchmove', this.onMove);
    this.element.removeEventListener('touchend', this.onEnd);
    this.element.removeEventListener('touchcancel', this.onEnd);
    this.element.removeEventListener('dblclick', this.onDblClick);
    this.s = 1;
    this.tx = 0;
    this.ty = 0;
    this.element.style.transform = '';
    this.element.style.transformOrigin = '';
    this.element.style.touchAction = '';
  }

  syncTouchAction() {
    this.element.style.touchAction = this.s > 1.001 ? 'none' : 'auto';
  }

  apply(s, tx, ty) {
    this.s = s;
    this.tx = tx;
    this.ty = ty;
    this.element.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + s + ')';
  }

  mid(t) {
    return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 };
  }

  dist(t) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy) || 1;
  }

  beginPinch(touches) {
    const r = this.element.getBoundingClientRect();
    const m = this.mid(touches);
    this.mode = 'pinch';
    this.startDist = this.dist(touches);
    this.startScale = this.s;
    this.focal = { x: (m.x - r.left) / this.s, y: (m.y - r.top) / this.s };
  }

  beginPan(touch) {
    this.mode = 'pan';
    this.panStart = { x: touch.clientX, y: touch.clientY, tx: this.tx, ty: this.ty };
  }

  onStart(e) {
    if (e.touches.length >= 2) {
      if (e.cancelable) e.preventDefault();
      this.tapStart = null;
      this.beginPinch(e.touches);
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      this.tapStart = { x: t.clientX, y: t.clientY, at: Date.now() };
      if (this.s > 1.001) this.beginPan(t);
    }
  }

  onMove(e) {
    if (this.tapStart && e.touches[0]) {
      const t = e.touches[0];
      if (Math.abs(t.clientX - this.tapStart.x) > 10 || Math.abs(t.clientY - this.tapStart.y) > 10) {
        this.tapStart = null;
      }
    }
    if (this.mode === 'pinch' && e.touches.length >= 2) {
      if (e.cancelable) e.preventDefault();
      const m = this.mid(e.touches);
      const s = Math.max(0.5, Math.min(5, (this.startScale * this.dist(e.touches)) / this.startDist));
      // element origin in the viewport WITHOUT our translation = (origin - scroll), read live
      const r = this.element.getBoundingClientRect();
      const baseX = r.left - this.tx;
      const baseY = r.top - this.ty;
      this.apply(s, m.x - s * this.focal.x - baseX, m.y - s * this.focal.y - baseY);
    } else if (this.mode === 'pan' && e.touches.length === 1) {
      if (e.cancelable) e.preventDefault();
      const t = e.touches[0];
      this.apply(
        this.s,
        this.panStart.tx + (t.clientX - this.panStart.x),
        this.panStart.ty + (t.clientY - this.panStart.y)
      );
    }
  }

  onEnd(e) {
    const left = e.touches ? e.touches.length : 0;
    if (this.mode === 'pinch') {
      if (left === 1 && this.s > 1.001) this.beginPan(e.touches[0]);
      else this.mode = left >= 2 ? 'pinch' : null;
      if (left >= 2) this.beginPinch(e.touches);
    } else if (left === 0) {
      this.mode = null;
    }
    if (left === 0) {
      if (this.s > 0.97 && this.s < 1.03) this.reset(false); // snap back to exactly 1
      this.syncTouchAction();
      // double tap -> reset
      if (this.tapStart && e.type === 'touchend') {
        const now = Date.now();
        if (now - this.lastTap < 320 && this.s !== 1) this.reset(true);
        this.lastTap = now;
      }
      this.tapStart = null;
    } else {
      this.syncTouchAction();
    }
  }

  onDblClick() {
    if (this.s !== 1) this.reset(true);
  }

  reset(animate) {
    const el = this.element;
    this.s = 1;
    this.tx = 0;
    this.ty = 0;
    this.mode = null;
    if (animate) {
      el.style.transition = 'transform 0.25s ease';
      setTimeout(() => {
        el.style.transition = '';
      }, 300);
    }
    el.style.transform = 'translate(0px, 0px) scale(1)';
    this.syncTouchAction();
  }
}
