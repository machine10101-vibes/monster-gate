/** 180° of yaw per full-width one-finger swipe on touch / coarse pointers. */
export const LOOK_SWIPE_RAD = Math.PI;
export const MOUSE_LOOK_GAIN = 0.006;
export const TAB_CAMERA_KEY = 'mg-tab-camera';
export function readTabCamera(store = typeof localStorage !== 'undefined' ? localStorage : null) {
  try { return store?.getItem(TAB_CAMERA_KEY) !== '0'; } catch { return true; }
}
export function writeTabCamera(enabled, store = typeof localStorage !== 'undefined' ? localStorage : null) {
  try { store?.setItem(TAB_CAMERA_KEY, enabled ? '1' : '0'); } catch { /* private mode */ }
  return !!enabled;
}
export const STRAFE_STORAGE_KEY = 'mg-strafe';

export function readStrafeSetting(store = typeof localStorage !== 'undefined' ? localStorage : null) {
  try { return store?.getItem(STRAFE_STORAGE_KEY) === '1'; } catch { return false; }
}

export function writeStrafeSetting(enabled, store = typeof localStorage !== 'undefined' ? localStorage : null) {
  try { store?.setItem(STRAFE_STORAGE_KEY, enabled ? '1' : '0'); } catch { /* private mode */ }
  return !!enabled;
}

export function lookRadiansPerPixel(width, { touch = false } = {}) {
  const w = Math.max(1, Number(width) || 1);
  if (touch) return LOOK_SWIPE_RAD / w;
  return MOUSE_LOOK_GAIN;
}

/** Bottom-left well where a press spawns the move stick. Empty screen elsewhere looks. */
export function inStickZone(x, y, vp) {
  const w = Math.max(1, Number(vp?.w) || 1);
  const h = Math.max(1, Number(vp?.h) || 1);
  const wellW = Math.min(220, w * 0.28);
  return x >= 0 && x < wellW && y > h * 0.45 && y <= h;
}

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.moveX = 0;
    this.moveY = 0;
    this.attackHeld = false;
    this.shieldBtn = false;
    this.pressed = new Set();
    this.rotateDelta = 0;
    this.zoomDelta = 0;
    this.aim = { x: 0, y: 0, has: false };
    this.touch = false;
    this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.look = { id: null, x: 0 };
    this.btnTouch = {};
    this.slotSelect = -1;
    this.enabled = true;
    this.strafe = readStrafeSetting();
    this.tabCamera = readTabCamera();

    this.detectTouch();
    this.bind();
  }

  detectTouch() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    this.touch = coarse || 'ontouchstart' in window;
    document.body.classList.toggle('touch', this.touch);
  }

  press(name) {
    this.pressed.add(name);
  }
  take(name) {
    if (this.pressed.has(name)) {
      this.pressed.delete(name);
      return true;
    }
    return false;
  }

  releaseControls() {
    this.keys.clear();
    this.pressed.clear();
    this.attackHeld = false;
    this.shieldBtn = false;
    this.drag = false;
    this.stick.id = null;
    this.stick.x = this.stick.y = 0;
    this.look.id = null;
    this.moveX = this.moveY = 0;
    this.rotateDelta = this.zoomDelta = 0;
    this.slotSelect = -1;
    this.resetStick();
  }

  bind() {
    const k = this.keys;
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Tab') {
        if (!this.tabCamera || this.touch || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || e.target?.closest?.('button, select, a, [contenteditable], #panel, #dialog, #title, #char-select') || !this.canTabCamera?.()) return;
        e.preventDefault();
        if (!e.repeat) this.press('rotateR');
        return;
      }
      if (e.repeat) {
        if (e.code === 'Space') e.preventDefault();
        return;
      }
      k.add(e.code);
      switch (e.code) {
        case 'Space':
          this.press('evade');
          e.preventDefault();
          break;
        case 'KeyF':
          this.press('talk');
          break;
        case 'KeyZ':
          this.press('bolt');
          break;
        case 'KeyX':
          this.press('skill');
          break;
        case 'KeyV':
          this.press('fury');
          break;
        case 'KeyK':
          this.press('panel:skills');
          break;
        case 'KeyG':
          this.press('panel:spellbook');
          break;
        case 'KeyH':
          this.press('photo');
          break;
        case 'KeyJ':
        case 'Enter':
          this.press('attack');
          break;
        case 'KeyR':
        case 'BracketRight':
          this.press('rotateR');
          break;
        case 'BracketLeft':
          this.press('rotateL');
          break;
        case 'KeyM':
          this.press('panel:map');
          break;
        case 'KeyL':
          this.press('maplabels');
          break;
        case 'KeyQ':
          this.press('panel:quest');
          break;
        case 'KeyE':
          this.press('panel:gear');
          break;
        case 'KeyB':
          this.press('panel:bag');
          break;
        case 'KeyN':
          this.press('panel:tome');
          break;
        case 'KeyC':
          this.press('panel:catalog');
          break;
        case 'KeyT':
          this.press('panel:settings');
          break;
        case 'KeyP':
          this.press('panel:friends');
          break;
        case 'Escape':
          this.press('escape');
          break;
        default:
          if (/^Digit[1-9]$/.test(e.code)) this.slotSelect = Number(e.code.slice(5)) - 1;
          else if (e.code === 'Digit0') this.slotSelect = 9;
      }
    });
    window.addEventListener('keyup', (e) => k.delete(e.code));
    window.addEventListener('blur', () => this.releaseControls());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseControls();
    });

    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        this.aim.x = e.clientX;
        this.aim.y = e.clientY;
        this.aim.has = true;
        if (this.drag && !this.touch) {
          this.rotateDelta += e.movementX * lookRadiansPerPixel(window.innerWidth, { touch: false });
        }
      }
    });
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (this.touch) return;
      this.aim.x = e.clientX;
      this.aim.y = e.clientY;
      this.aim.has = true;
      if (e.button === 0) {
        this.attackHeld = true;
        this.press('attack');
      } else if (e.button === 2) {
        this.press('evade');
      } else if (e.button === 1) {
        this.drag = true;
        e.preventDefault();
      }
    });
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (e.button === 0) this.attackHeld = false;
      if (e.button === 1) this.drag = false;
    });
    const onWheel = (e) => {
      if (!this.enabled) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target?.closest?.('#panel, #dialog, #title, #world-chat, #loading, #charselect')) return;
      e.preventDefault();
      const step = Math.sign(e.deltaY) * Math.min(2.4, Math.max(0.35, Math.abs(e.deltaY) / 100));
      this.zoomDelta += step;
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    window.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      if (e.pointerType === 'mouse' && !this.touch) return;
      this.touch = true;
      document.body.classList.add('touch');
      const t = e.target;
      // Native text focus and character preview gestures belong to the UI, not gameplay.
      if (t.closest?.('#charselect, input, textarea, select, [contenteditable]')) return;
      if (t.closest && t.closest('.tbtn, .slot, .mbtn, .mini, #panel, #dialog, #title, #loading, #rotate-overlay, #party-frame, #social-invite, #social-menu, #world-chat, #clock, #quest, #menu-col, #minimap-wrap, #center-bottom, #hotbar')) return;
      e.preventDefault();
      try { t.setPointerCapture?.(e.pointerId); } catch { /* capture is best-effort */ }
      const vp = { w: window.innerWidth, h: window.innerHeight };
      if (this.stick.id === null && inStickZone(e.clientX, e.clientY, vp)) {
        this.stick.id = e.pointerId;
        this.stick.ox = e.clientX;
        this.stick.oy = e.clientY;
        this.stick.x = 0;
        this.stick.y = 0;
        this.showStick(e.clientX, e.clientY, 0, 0);
      } else if (this.look.id === null) {
        this.look.id = e.pointerId;
        this.look.x = e.clientX;
        this.look.moved = 0;
        this.look.startT = performance.now();
      }
    }, { passive: false });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' && !this.touch) return;
      if (e.pointerId === this.stick.id) {
        let dx = e.clientX - this.stick.ox;
        let dy = e.clientY - this.stick.oy;
        const max = 54;
        const d = Math.hypot(dx, dy);
        if (d > max) {
          dx = (dx / d) * max;
          dy = (dy / d) * max;
        }
        this.stick.x = dx / max;
        this.stick.y = dy / max;
        this.showStick(this.stick.ox, this.stick.oy, dx, dy);
      } else if (e.pointerId === this.look.id) {
        const dx = e.clientX - this.look.x;
        this.look.x = e.clientX;
        this.look.moved += Math.abs(dx);
        this.rotateDelta += dx * lookRadiansPerPixel(window.innerWidth, { touch: true });
      }
    });
    const end = (e) => {
      if (e.pointerId === this.stick.id) {
        this.stick.id = null;
        this.stick.x = 0;
        this.stick.y = 0;
        this.resetStick();
      }
      if (e.pointerId === this.look.id) {
        this.look.id = null;
      }
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    document.querySelectorAll('.tbtn').forEach((b) => {
      const act = b.dataset.act;
      const down = (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { b.setPointerCapture?.(e.pointerId); } catch { /* synthetic / DevTools pointers */ }
        b.classList.add('active');
        if (act === 'shield') this.shieldBtn = true;
        else if (act === 'attack') {
          this.attackHeld = true;
          this.press('attack');
        } else if (!['bolt', 'skill', 'fury', 'talk'].includes(act)) this.press(act);
      };
      const up = (e) => {
        b.classList.remove('active');
        if (act === 'shield') this.shieldBtn = false;
        if (act === 'attack') this.attackHeld = false;
        else if (e.type === 'pointerup' && act === 'talk') {
          e.preventDefault();
          e.stopPropagation();
          this.press('talk');
        } else if (e.type === 'pointerup' && ['bolt', 'skill', 'fury'].includes(act) && b.dataset.skillPickerConsumed !== '1') this.press(act);
      };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
    });

    document.querySelectorAll('[data-panel]').forEach((b) =>
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.press('panel:' + b.dataset.panel);
      })
    );
    document.querySelectorAll('[data-action="rotate"]').forEach((b) =>
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.press('rotateR');
      })
    );
    document.getElementById('dialog').addEventListener('pointerdown', (e) => {
      if (e.target.closest('.dlg-choice')) return;
      e.stopPropagation();
      this.press('talk');
    });
  }

  showStick(ox, oy, dx, dy) {
    const s = document.getElementById('stick');
    const knob = document.getElementById('stick-knob');
    s.style.left = ox - 59 + 'px';
    s.style.top = oy - 59 + 'px';
    s.style.bottom = 'auto';
    s.style.transformOrigin = 'center';
    s.style.transform = 'scale(1)';
    s.style.opacity = '1';
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  resetStick() {
    const s = document.getElementById('stick');
    s.style.left = '';
    s.style.top = '';
    s.style.bottom = '';
    s.style.transformOrigin = '';
    s.style.transform = '';
    s.style.opacity = '';
    document.getElementById('stick-knob').style.transform = '';
  }

  get shieldHeld() {
    return this.shieldBtn || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  update() {
    const k = this.keys;
    let x = 0;
    let y = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (this.stick.id !== null) {
      x += this.stick.x;
      y += this.stick.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    const dead = 0.12;
    this.moveX = Math.abs(x) < dead && Math.abs(y) < dead ? 0 : x;
    this.moveY = Math.abs(x) < dead && Math.abs(y) < dead ? 0 : y;
    if (k.has('ArrowLeft') && k.has('ControlLeft')) this.rotateDelta -= 0.03;
  }
}
