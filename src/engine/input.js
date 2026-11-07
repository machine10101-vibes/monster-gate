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

  bind() {
    const k = this.keys;
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.repeat) {
        if (['Tab', 'Space'].includes(e.code)) e.preventDefault();
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
        case 'KeyV':
          this.press('fury');
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
        case 'KeyQ':
          this.press('panel:quest');
          break;
        case 'KeyE':
          this.press('panel:gear');
          break;
        case 'KeyB':
          this.press('panel:bag');
          break;
        case 'KeyT':
          this.press('panel:settings');
          break;
        case 'Escape':
          this.press('escape');
          break;
        case 'Tab':
          e.preventDefault();
          break;
        default:
          if (/^Digit[1-9]$/.test(e.code)) this.slotSelect = Number(e.code.slice(5)) - 1;
      }
    });
    window.addEventListener('keyup', (e) => k.delete(e.code));
    window.addEventListener('blur', () => {
      k.clear();
      this.attackHeld = false;
      this.shieldBtn = false;
    });

    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        this.aim.x = e.clientX;
        this.aim.y = e.clientY;
        this.aim.has = true;
        if (this.drag) {
          this.rotateDelta += e.movementX * 0.006;
        }
      }
    });
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
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
    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoomDelta += Math.sign(e.deltaY);
      },
      { passive: false }
    );

    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || !this.enabled) return;
      this.touch = true;
      document.body.classList.add('touch');
      const t = e.target;
      if (t.closest && (t.closest('.tbtn') || t.closest('.slot') || t.closest('.mbtn') || t.closest('#panel') || t.closest('#dialog') || t.closest('.mini') || t.closest('#title') || t.closest('#loading'))) return;
      const w = window.innerWidth;
      if (e.clientX < w * 0.42 && this.stick.id === null) {
        this.stick.id = e.pointerId;
        this.stick.ox = e.clientX;
        this.stick.oy = e.clientY;
        this.stick.x = 0;
        this.stick.y = 0;
        this.showStick(e.clientX, e.clientY, 0, 0);
      } else if (this.look.id === null && e.clientX >= w * 0.42) {
        this.look.id = e.pointerId;
        this.look.x = e.clientX;
        this.look.moved = 0;
        this.look.startT = performance.now();
      }
    });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') return;
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
        this.rotateDelta += dx * 0.008;
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
        b.setPointerCapture?.(e.pointerId);
        b.classList.add('active');
        if (act === 'shield') this.shieldBtn = true;
        else if (act === 'attack') {
          this.attackHeld = true;
          this.press('attack');
        } else this.press(act);
      };
      const up = (e) => {
        b.classList.remove('active');
        if (act === 'shield') this.shieldBtn = false;
        if (act === 'attack') this.attackHeld = false;
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
