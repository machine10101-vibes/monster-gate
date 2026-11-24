export class Audio8 {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
    this.last = {};
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.value = this.enabled ? 0.55 : 0;
  }

  tone(freq, dur, type = 'square', vol = 0.2, slide = 0, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.2, freq = 1800, q = 0.8, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  throttle(name, ms) {
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < ms) return false;
    this.last[name] = now;
    return true;
  }

  /** Procedural weapon-specific air, tension and mechanism sounds. */
  swing(family = 'sword') {
    if (family === 'bow') {
      this.noise(0.11, 0.075, 1750, 1.1);
      this.tone(460, 0.1, 'triangle', 0.035, -180);
    } else if (family === 'crossbow') {
      this.noise(0.07, 0.08, 1100, 1.4);
      this.tone(210, 0.075, 'square', 0.045, -70);
    } else if (family === 'magic' || family === 'staff') {
      this.tone(520, 0.18, 'sine', 0.055, 380);
      this.noise(0.12, 0.035, 2400, 0.7);
    } else if (family === 'heavy') {
      this.noise(0.24, 0.19, 1050, 0.55);
      this.tone(115, 0.18, 'triangle', 0.07, 90);
    } else if (family === 'spear') {
      this.noise(0.13, 0.12, 1950, 0.75);
      this.tone(260, 0.09, 'triangle', 0.035, -110);
    } else if (family === 'scythe') {
      this.noise(0.22, 0.17, 1450, 0.55);
      this.tone(185, 0.16, 'sawtooth', 0.035, -80);
    } else if (family === 'dual') {
      this.noise(0.12, 0.12, 2900, 0.7);
      this.noise(0.09, 0.075, 2100, 0.9, 0.055);
    } else {
      this.noise(0.16, 0.14, 2600, 0.6);
      this.tone(320, 0.12, 'triangle', 0.05, -140);
    }
  }
  /** Contact sounds distinguish edge, blunt, polearm and magical impacts. */
  hit(family = 'sword') {
    if (family === 'heavy') {
      this.noise(0.16, 0.27, 420, 0.65);
      this.tone(92, 0.2, 'sine', 0.16, -42);
      this.noise(0.055, 0.11, 2600, 1.3, 0.025);
    } else if (family === 'spear') {
      this.noise(0.07, 0.19, 1250, 1.2);
      this.tone(185, 0.1, 'triangle', 0.08, -65);
    } else if (family === 'scythe' || family === 'sword' || family === 'dual') {
      this.noise(0.095, 0.24, family === 'scythe' ? 720 : 980, 0.9);
      this.tone(family === 'dual' ? 210 : 165, 0.11, 'square', 0.11, -90);
      this.noise(0.04, 0.09, 3400, 1.4, 0.018);
    } else if (family === 'magic' || family === 'staff') {
      this.tone(360, 0.18, 'sine', 0.12, -220);
      this.noise(0.13, 0.1, 1850, 0.65);
    } else {
      this.noise(0.1, 0.22, 900, 0.9);
      this.tone(150, 0.12, 'square', 0.14, -80);
    }
  }
  /** Release is timed to the projectile spawn, not the start of the draw animation. */
  release(family = 'bow') {
    if (family === 'crossbow') {
      this.tone(260, 0.07, 'square', 0.1, -150);
      this.noise(0.045, 0.12, 1900, 1.5);
      this.tone(780, 0.055, 'triangle', 0.035, -300, 0.025);
    } else if (family === 'bow') {
      this.tone(720, 0.085, 'triangle', 0.1, -440);
      this.noise(0.07, 0.075, 2600, 0.85);
    } else {
      this.tone(520, 0.14, 'sawtooth', 0.075, -260);
      this.noise(0.12, 0.055, 2200, 0.7);
    }
  }
  hurt() {
    this.tone(220, 0.25, 'sawtooth', 0.14, -150);
    this.noise(0.15, 0.2, 500, 0.7);
  }
  block() {
    this.tone(660, 0.1, 'square', 0.12, 220);
    this.noise(0.06, 0.2, 4200, 1.5);
  }
  evade() {
    this.noise(0.22, 0.12, 1400, 0.5);
  }
  step() {
    if (!this.throttle('step', 210)) return;
    this.noise(0.05, 0.05, 500 + Math.random() * 300, 1.2);
  }
  coin() {
    this.tone(988, 0.07, 'square', 0.1);
    this.tone(1319, 0.14, 'square', 0.1, 0, 0.06);
  }
  bolt() {
    this.tone(520, 0.3, 'sawtooth', 0.1, 900);
    this.noise(0.25, 0.08, 3000, 0.7);
  }
  fury() {
    this.tone(110, 0.5, 'sawtooth', 0.2, 220);
    this.noise(0.4, 0.2, 700, 0.5);
  }
  pop() {
    this.tone(500, 0.12, 'triangle', 0.14, -300);
    this.noise(0.1, 0.12, 1200, 0.8);
  }
  potion() {
    this.tone(400, 0.1, 'sine', 0.15, 300);
    this.tone(600, 0.14, 'sine', 0.15, 300, 0.09);
  }
  quest() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'square', 0.1, 0, i * 0.1));
  }
  select() {
    this.tone(700, 0.04, 'square', 0.06);
  }
  portal() {
    this.tone(90, 0.8, 'sawtooth', 0.05, 40);
  }
}
