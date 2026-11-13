import * as THREE from 'three';

const TAU = Math.PI * 2;
const R = (a = 0, b = 1) => a + Math.random() * (b - a);
const tmpV = new THREE.Vector3();

const FIRE = [0xfff4c0, 0xffd25a, 0xff8a1e, 0xff4a1a];
const ICE = [0xffffff, 0xd7f4ff, 0x8fd4ff];
const ZAP = [0xffffff, 0xd9ffff, 0x4ad0ff];
const VOID = [0xf0c8ff, 0xb25cff, 0x6a2cc8];
const TOXIN = [0xd7ffb0, 0x8fe35a, 0x4aa83a];

/* ------------------------------------------------------------------ */
/* projectile looks                                                   */
/* ------------------------------------------------------------------ */

const STYLES = {
  fireball: { core: 0xfff4c0, c1: 0xff8a1e, size: 2.5, trail: [0xff6a1a, 0.55, 0.38], sparks: FIRE, rate: 60, smoke: true, light: 0xff8a2a, coreSize: 0.34 },
  frostbolt: { core: 0xffffff, c1: 0x7fd0ff, size: 2.1, trail: [0x9fdcff, 0.4, 0.35], sparks: ICE, rate: 50, light: 0x8fd4ff, coreSize: 0.3, shard: true },
  spark: { core: 0xffffff, c1: 0x4ad0ff, size: 1.7, trail: [0x8fe4ff, 0.26, 0.2], sparks: ZAP, rate: 70, coreSize: 0.22, zap: true },
  bolt: { core: 0xffffff, c1: 0x4ad0ff, size: 1.9, trail: [0x6fd8ff, 0.3, 0.26], sparks: ZAP, rate: 55, coreSize: 0.26, zap: true },
  ember: { core: 0xfff4c0, c1: 0xff8a1e, size: 2.2, trail: [0xff6a1a, 0.45, 0.32], sparks: FIRE, rate: 50, smoke: true, coreSize: 0.3 },
  frost: { core: 0xffffff, c1: 0x7fd0ff, size: 1.9, trail: [0x9fdcff, 0.34, 0.3], sparks: ICE, rate: 40, coreSize: 0.26 },
  icicle: { c1: 0x9fdcff, size: 1.5, trail: [0xbfeaff, 0.22, 0.28], sparks: ICE, rate: 34, arrow: { tip: 0xe6f9ff, fletch: 0x8fd4ff, thick: 1.15 } },
  iceboulder: { core: 0xe6f9ff, c1: 0x7fd0ff, size: 3.2, trail: [0x9fdcff, 0.7, 0.4], sparks: ICE, rate: 70, coreSize: 0.78, shard: true },
  icebreath: { core: 0xffffff, c1: 0xaee4ff, size: 2.6, trail: [0xcdeeff, 0.5, 0.26], sparks: ICE, rate: 60, coreSize: 0.34 },
  orb: { core: 0xf3d6ff, c1: 0xb04dff, size: 2.1, trail: [0xb04dff, 0.36, 0.3], sparks: VOID, rate: 45, coreSize: 0.28 },
  gloom: { core: 0xf0c8ff, c1: 0x7a34e0, size: 2.7, trail: [0x6a2cc8, 0.5, 0.45], sparks: VOID, rate: 55, smoke: true, smokeCol: 0x2a1c44, coreSize: 0.32, homing: true },
  crescent: { core: 0xe9e4ff, c1: 0xb25cff, size: 2.2, trail: [0xb25cff, 0.6, 0.3], sparks: VOID, rate: 50, coreSize: 0 },
  poisonvolley: { c1: 0x6dce4a, size: 1.0, trail: [0x7fe05a, 0.14, 0.3], sparks: TOXIN, rate: 22, arrow: { tip: 0x7fe05a, fletch: 0x4aa83a } },
  plaguearrow: { c1: 0x8a4ad0, size: 1.7, trail: [0x7a3ac8, 0.28, 0.5], sparks: [0xd7ffb0, 0x9a5ae0, 0x6dce4a], rate: 48, smoke: true, smokeCol: 0x2c4a2a, arrow: { tip: 0xb8ff7a, fletch: 0x8a4ad0, thick: 1.5 } },
  aimedshot: { c1: 0xffd23f, size: 1.5, trail: [0xffd23f, 0.2, 0.28], sparks: [0xffffff, 0xffd23f], rate: 28, arrow: { tip: 0xfff0b0, fletch: 0xffd23f, thick: 1.2 } },
  snipe: { c1: 0x8fe4ff, size: 1.8, trail: [0xaee9ff, 0.26, 0.5], sparks: [0xffffff, 0x8fe4ff], rate: 36, arrow: { tip: 0xffffff, fletch: 0x8fe4ff, thick: 1.3 } },
  arrow: { c1: 0xfff2d0, size: 0, trail: [0xfff2d0, 0.09, 0.14], rate: 0, arrow: { tip: 0xdfe6ee, fletch: 0xf2efe6 } },
  stone: { c1: 0xd9c9a0, size: 0, trail: [0xd9c9a0, 0.12, 0.2], rate: 0 },
};

function styleOf(p) {
  return STYLES[p.skill] || STYLES[p.kind] || STYLES.arrow;
}

export function buildProjectileMesh(o) {
  const st = STYLES[o.skill] || STYLES[o.kind] || STYLES.arrow;
  const g = new THREE.Group();
  const kind = o.kind;
  if (st.arrow) {
    const a = st.arrow;
    const th = a.thick || 1;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.05 * th, 0.05 * th, 0.62), new THREE.MeshBasicMaterial({ color: 0xc89a5c }));
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1 * th, 0.1 * th, 0.15), new THREE.MeshBasicMaterial({ color: a.tip }));
    tip.position.z = 0.37;
    const tip2 = new THREE.Mesh(new THREE.BoxGeometry(0.05 * th, 0.05 * th, 0.08), new THREE.MeshBasicMaterial({ color: a.tip }));
    tip2.position.z = 0.45;
    g.add(shaft, tip, tip2);
    for (let i = 0; i < 2; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.16 * th, 0.015, 0.16), new THREE.MeshBasicMaterial({ color: a.fletch }));
      f.position.z = -0.27;
      f.rotation.z = i * Math.PI * 0.5;
      g.add(f);
    }
    return g;
  }
  if (kind === 'stone') {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0xa9a9b2 })));
    return g;
  }
  if (kind === 'crescent') {
    const blade = new THREE.MeshBasicMaterial({ color: 0xf3eeff });
    const edge = new THREE.MeshBasicMaterial({ color: 0xb25cff });
    for (let i = 0; i < 9; i++) {
      const a = -1.2 + i * 0.3;
      const w = 0.3 - Math.abs(i - 4) * 0.045;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.16), blade);
      seg.position.set(Math.sin(a) * 0.55, 0, Math.cos(a) * 0.55 - 0.4);
      seg.rotation.y = a;
      const rim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.05, 0.1), edge);
      rim.position.set(Math.sin(a) * 0.66, 0, Math.cos(a) * 0.66 - 0.4);
      rim.rotation.y = a;
      g.add(seg, rim);
    }
    return g;
  }
  const s = st.coreSize || 0.28;
  const core = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshBasicMaterial({ color: st.core }));
  const inner = new THREE.Mesh(new THREE.BoxGeometry(s * 0.8, s * 0.8, s * 0.8), new THREE.MeshBasicMaterial({ color: st.c1 }));
  inner.rotation.set(0.78, 0.78, 0);
  inner.scale.setScalar(1.35);
  g.add(inner, core);
  if (st.shard) {
    for (let i = 0; i < 4; i++) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.3), new THREE.MeshBasicMaterial({ color: 0xd7f4ff }));
      const a = (i / 4) * TAU;
      sh.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0);
      sh.rotation.z = a;
      g.add(sh);
    }
  }
  return g;
}

export function initProjectile(game, p) {
  const st = styleOf(p);
  p.fxStyle = st;
  if (st.trail) {
    const [c, w, life] = st.trail;
    p.trail = game.vfx.trail(c, { width: w, life, pts: 24, white: st.arrow ? 0.5 : 0.7, step: 0.05 });
  }
}

export function tickProjectile(game, p, dt) {
  const st = p.fxStyle;
  if (!st) return;
  const vfx = game.vfx;
  const m = p.mesh.position;
  if (p.trail) p.trail.add(m.x, m.y, m.z);
  if (st.size) {
    const pulse = 1 + Math.sin(p.age * 30) * 0.08;
    vfx.glowNow(m.x, m.y, m.z, st.c1, st.size * pulse, 0.85);
    if (st.coreSize || st.arrow) vfx.glowNow(m.x, m.y, m.z, 0xffffff, st.size * 0.38 * pulse, 0.7);
  }
  if (st.rate && Math.random() < dt * st.rate * vfx.density) {
    const cols = st.sparks;
    const c = cols[(Math.random() * cols.length) | 0];
    vfx.spark(m.x + R(-0.12, 0.12), m.y + R(-0.12, 0.12), m.z + R(-0.12, 0.12), -p.vx * 0.06 + R(-0.8, 0.8), R(-0.4, 1.2), -p.vz * 0.06 + R(-0.8, 0.8), c, R(0.04, 0.09), R(0.25, 0.5), st.zap ? 0 : 3, 1.5);
  }
  if (st.smoke && Math.random() < dt * 22 * vfx.density) {
    game.fx.emit(m.x, m.y, m.z, R(-0.3, 0.3), R(0.4, 1), R(-0.3, 0.3), st.smokeCol || 0x4a4040, R(0.12, 0.2), R(0.4, 0.7), -0.8);
  }
  if (st.zap && Math.random() < dt * 14 * vfx.density) {
    const a = R(0, TAU);
    const r = R(0.3, 0.7);
    vfx.bolt({ x: m.x, y: m.y, z: m.z }, { x: m.x + Math.cos(a) * r, y: m.y + R(-0.4, 0.4), z: m.z + Math.sin(a) * r }, { seg: 3, width: 0.07, jag: 0.15, life: 0.1, branches: 0, color: 0xb5ecff });
  }
  if (st.light && p.skill) vfx.flash(m.x, m.y, m.z, st.light, 2.2, 0.12);
}

export function endProjectile(game, p, ground) {
  const st = p.fxStyle;
  p.trail?.end();
  if (!st) return;
  const m = p.mesh.position;
  const vfx = game.vfx;
  const { x, y, z } = m;
  const key = p.skill || p.kind;
  if (p.splash) return;
  switch (key) {
    case 'frostbolt':
    case 'frost':
    case 'icicle':
    case 'icebreath':
      iceBurst(game, x, y, z, key === 'icebreath' ? 0.7 : 1);
      break;
    case 'iceboulder':
      iceBurst(game, x, y, z, 2.1);
      break;
    case 'spark':
    case 'bolt':
      zapBurst(game, x, y, z, key === 'spark' ? 0.8 : 1.1);
      break;
    case 'orb':
      voidBurst(game, x, y, z, 0.8, 0xb04dff);
      break;
    case 'gloom':
    case 'crescent':
      voidBurst(game, x, y, z, 1.1, 0x8a3ae0);
      break;
    case 'plaguearrow':
      toxinPuff(game, x, y, z, 1.3);
      break;
    case 'poisonvolley':
      toxinPuff(game, x, y, z, 0.6);
      break;
    case 'snipe':
      vfx.ring(x, y, z, { axis: 'cam', color: 0xaee9ff, r0: 0.1, r1: 1.0, life: 0.22, thick: 0.2 });
      vfx.sparks(x, y, z, [0xffffff, 0xaee9ff], 8, 6, 0.06, 0.3, 6);
      break;
    case 'aimedshot':
      vfx.ring(x, y, z, { axis: 'cam', color: 0xffd23f, r0: 0.1, r1: 0.8, life: 0.2, thick: 0.2 });
      vfx.sparks(x, y, z, [0xffffff, 0xffd23f], 6, 5, 0.06, 0.3, 6);
      break;
    case 'stone':
      game.fx.dust(x, y, z, 4, 1, 0xb8b0a0);
      break;
    default:
      if (ground) vfx.sparks(x, Math.max(y, 0), z, [0xfff2d0, 0xd9c9a0], 3, 2, 0.05, 0.25, 8);
  }
}

/* ------------------------------------------------------------------ */
/* shared bursts                                                      */
/* ------------------------------------------------------------------ */

export function iceBurst(game, x, y, z, s = 1) {
  const v = game.vfx;
  v.glow(x, y, z, 0xffffff, 1.6 * s, 0.14, { grow: 0.6 });
  v.glow(x, y, z, 0x7fd0ff, 2.8 * s, 0.3, { grow: 0.8 });
  v.ring(x, y, z, { axis: 'cam', color: 0xbfeaff, r0: 0.1, r1: 1.2 * s, life: 0.28, thick: 0.18 });
  v.sparks(x, y, z, ICE, 14 * s, 5.5, 0.07, 0.55, 9);
  for (let i = 0; i < v.n(5); i++) {
    const a = (i / 5) * TAU + R(0, 0.5);
    v.spark(x, y, z, Math.cos(a) * 3.4, R(1.5, 4), Math.sin(a) * 3.4, 0xe8fbff, 0.14, 0.6, 12, 0.8);
  }
  v.flash(x, y, z, 0x8fd4ff, 2.4, 0.2);
}

export function zapBurst(game, x, y, z, s = 1) {
  const v = game.vfx;
  v.glow(x, y, z, 0xffffff, 1.4 * s, 0.1, { grow: 0.5 });
  v.glow(x, y, z, 0x4ad0ff, 2.6 * s, 0.22, { grow: 0.8 });
  v.ring(x, y, z, { axis: 'cam', color: 0x9fe8ff, r0: 0.1, r1: 1.0 * s, life: 0.2, thick: 0.2, fill: 0.2 });
  for (let i = 0; i < 3; i++) {
    const a = R(0, TAU);
    const r = R(0.8, 1.5) * s;
    v.bolt({ x, y, z }, { x: x + Math.cos(a) * r, y: y + R(-0.5, 0.6), z: z + Math.sin(a) * r }, { seg: 4, width: 0.09, jag: 0.2, life: 0.16, branches: 0, color: 0xb5ecff });
  }
  v.sparks(x, y, z, ZAP, 10 * s, 6, 0.06, 0.35, 5);
  v.flash(x, y, z, 0x6fd8ff, 2.4, 0.16);
}

export function voidBurst(game, x, y, z, s, color) {
  const v = game.vfx;
  v.glow(x, y, z, 0xffffff, 1.2 * s, 0.1, { grow: 0.5 });
  v.glow(x, y, z, color, 2.8 * s, 0.34, { grow: 0.9 });
  v.ring(x, y, z, { axis: 'cam', color, r0: 1.4 * s, r1: 0.1, life: 0.2, thick: 0.25, ease: 'lin' });
  v.ring(x, y, z, { axis: 'cam', color: 0xe8c8ff, r0: 0.1, r1: 1.5 * s, life: 0.3, thick: 0.14, delay: 0.1 });
  v.sparks(x, y, z, VOID, 12 * s, 4.5, 0.07, 0.6, 3);
  for (let i = 0; i < 4; i++) game.fx.emit(x, y, z, R(-1.2, 1.2), R(0.5, 2), R(-1.2, 1.2), 0x2a1c44, R(0.14, 0.24), R(0.5, 0.8), -1);
  v.flash(x, y, z, 0x8a3ae0, 2, 0.2);
}

export function toxinPuff(game, x, y, z, s = 1) {
  const v = game.vfx;
  for (let i = 0; i < v.n(5); i++) {
    v.glow(x + R(-0.4, 0.4) * s, y + R(0, 0.4), z + R(-0.4, 0.4) * s, i % 2 ? 0x6dce4a : 0x9a5ae0, R(1.2, 2.2) * s, R(0.5, 0.9), { grow: 0.8, vy: R(0.4, 1), gain: 0.7 });
  }
  v.ring(x, y, z, { axis: 'cam', color: 0x8fe35a, r0: 0.1, r1: 1.1 * s, life: 0.3, thick: 0.16 });
  v.sparks(x, y, z, TOXIN, 10 * s, 3, 0.08, 0.7, -0.5, 1, 0.8);
}

export function fireExplosion(game, x, y, z, radius) {
  const v = game.vfx;
  const gy = game.world.heightAt(x, z);
  v.glow(x, y, z, 0xffffff, radius * 1.5, 0.12, { grow: 0.6, pow: 1.2 });
  v.glow(x, y, z, 0xffa040, radius * 2.6, 0.3, { grow: 0.7, gain: 0.7 });
  v.glow(x, y + 0.2, z, 0xff4a1a, radius * 3.4, 0.45, { grow: 0.5, gain: 0.35 });
  v.ring(x, gy + 0.12, z, { color: 0xffc040, r0: 0.3, r1: radius * 1.5, life: 0.32, thick: 0.18, fill: 0.2 });
  v.ring(x, gy + 0.14, z, { color: 0xff5a1a, r0: 0.2, r1: radius * 1.9, life: 0.5, thick: 0.08, delay: 0.05 });
  v.ring(x, y, z, { axis: 'cam', color: 0xffd080, r0: 0.2, r1: radius * 1.2, life: 0.25, thick: 0.16 });
  v.sparks(x, y, z, FIRE, 26 * (radius / 2), 8, 0.1, 0.8, 9, 1, 0.4);
  const n = v.n(6);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + R(-0.3, 0.3);
    const d = radius * R(0.35, 0.8);
    v.prism(x + Math.cos(a) * d, gy, z + Math.sin(a) * d, { w: R(0.4, 0.6), h: R(1.1, 1.9) * (radius / 2.2), segs: 5, color: 0xe84a10, core: 0xffb040, delay: i * 0.025, rise: 0.12, hold: 0.12, fall: 0.38, flicker: true, tilt: 0.15 });
  }
  for (let i = 0; i < v.n(8); i++) {
    game.fx.emit(x + R(-0.5, 0.5), y, z + R(-0.5, 0.5), R(-1.6, 1.6), R(1.5, 3.2), R(-1.6, 1.6), i % 3 ? 0x4a4040 : 0x2a2626, R(0.16, 0.3), R(0.7, 1.2), -1.2);
  }
  v.scorch(x, z, radius * 0.95, 0x120c08, 0.5, 5);
  v.flash(x, y + 0.5, z, 0xff8a2a, 3, 0.35);
}

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

function yawOf(f) {
  return Math.atan2(f.x, f.z);
}

function handPos(p) {
  const slot = p.model?.heldSlot;
  if (slot) {
    p.obj.updateMatrixWorld(true);
    slot.getWorldPosition(tmpV);
    return { x: tmpV.x, y: tmpV.y, z: tmpV.z };
  }
  return { x: p.pos.x + p.facing.x * 0.6, y: p.pos.y + 1.2, z: p.pos.z + p.facing.z * 0.6 };
}

function aura(game, key, color, active, o = {}) {
  const v = game.vfx;
  const store = (game.vfxAuras = game.vfxAuras || {});
  if (store[key]) store[key].dead = true;
  const a = v.add({
    update: (dt, self) => {
      if (self.dead || !active()) {
        if (store[key] === self) store[key] = null;
        return false;
      }
      const p = game.player;
      if (Math.random() < dt * (o.rate ?? 26) * v.density) {
        const ang = R(0, TAU);
        const r = R(0.3, 0.7);
        v.spark(p.pos.x + Math.cos(ang) * r, p.pos.y + R(0.1, 0.5), p.pos.z + Math.sin(ang) * r, 0, R(1.2, 2.6), 0, color[(Math.random() * color.length) | 0], R(0.05, 0.09), R(0.5, 0.9), -0.5, 0.2);
      }
      v.glowNow(p.pos.x, p.pos.y + 0.12, p.pos.z, color[color.length > 2 ? 2 : 0], 1.7 + Math.sin(self.t * 9) * 0.15, 0.35);
      return true;
    },
  });
  store[key] = a;
  return a;
}

/* ------------------------------------------------------------------ */
/* melee swings                                                       */
/* ------------------------------------------------------------------ */

const SWING = {
  blade: { c: 0xfff2c0, h: 0xffffff },
  budgeblade: { c: 0xb8ff7a, h: 0xffffff },
  dual: { c: 0xd7f4ff, h: 0xffffff },
  axe: { c: 0xffe0b0, h: 0xffffff },
  hammer: { c: 0xffd9a0, h: 0xffffff },
  darkscythe: { c: 0xb25cff, h: 0xf0e0ff },
  yetisword: { c: 0x9fdcff, h: 0xffffff },
  yetigreatsword: { c: 0x9fdcff, h: 0xffffff },
  yetidual: { c: 0xbfeaff, h: 0xffffff },
  yetihammer: { c: 0xbfeaff, h: 0xffffff },
  yetispear: { c: 0xbfeaff, h: 0xffffff },
  yetiscythe: { c: 0x9fdcff, h: 0xffffff },
  tigerclaws: { c: 0xff9a3a, h: 0xfff0c0 },
  tigerspear: { c: 0xff9a3a, h: 0xfff0c0 },
  raptorsaber: { c: 0xd2da72, h: 0xffffff },
  raptorscythe: { c: 0xd2da72, h: 0xffffff },
  piratecutlass: { c: 0xdfe8f5, h: 0xffe9a0 },
  piratedual: { c: 0xdfe8f5, h: 0xffe9a0 },
  piratecleaver: { c: 0xe8eef8, h: 0xffd95a },
  cursedblade: { c: 0x5cff9a, h: 0xe0ffe8 },
  demonsword: { c: 0xff3a1a, h: 0xffd0a0 },
  holyhammer: { c: 0x9fd0ff, h: 0xffffff },
};

export function meleeSwing(game, p, it, combo, reach) {
  const v = game.vfx;
  const f = p.facing;
  const yaw = yawOf(f);
  const spec = SWING[it.held] || SWING.blade;
  const heavy = combo === 2;
  const x = p.pos.x;
  const z = p.pos.z;
  const big = it.style === 'twohand' || it.dur > 0.5;
  const radius = Math.max(1.3, reach * 0.88);
  const thick = reach * (big ? 0.5 : 0.36);
  if (heavy) {
    v.slashArc(x, p.pos.y + 1.15, z, yaw, { radius: radius * 1.05, thick: thick * 1.3, sweep: 2.5, color: 0xffd27a, hot: 0xffffff, tilt: 1.2, life: 0.32, sweepT: 0.17, grow: 0.15, tail: 0.85 });
    v.slashArc(x, p.pos.y + 1.0, z, yaw, { radius: radius * 0.9, thick: thick * 0.7, sweep: 2.2, color: spec.c, hot: 0xffffff, tilt: 1.1, life: 0.26, sweepT: 0.14, delay: 0 });
    const gx = x + f.x * reach * 0.85;
    const gz = z + f.z * reach * 0.85;
    v.ring(gx, game.world.heightAt(gx, gz) + 0.1, gz, { color: 0xffd27a, r0: 0.2, r1: 1.7, life: 0.32, thick: 0.16, fill: 0.2 });
    v.sparks(gx, game.world.heightAt(gx, gz) + 0.15, gz, [0xffd27a, 0xffffff, 0xd9c9a0], 12, 5, 0.07, 0.45, 9);
    v.scorch(gx, gz, 0.9, 0x3a2e20, 0.35, 3);
  } else {
    const dir = combo === 1 ? -1 : 1;
    v.slashArc(x, p.pos.y + 1.0, z, yaw, { radius, thick, sweep: 2.1 + (it.arc || 2) * 0.2, color: spec.c, hot: spec.h, tilt: dir * 0.38, flip: dir, life: 0.22, sweepT: 0.12 });
    if (it.style === 'dual') {
      v.slashArc(x, p.pos.y + 1.1, z, yaw, { radius: radius * 0.9, thick: thick * 0.8, sweep: 2.0, color: spec.c, hot: spec.h, tilt: -dir * 0.5, flip: -dir, life: 0.2, sweepT: 0.11, delay: 0 });
    }
  }
  const h = handPos(p);
  v.glow(h.x + f.x * 0.5, h.y, h.z + f.z * 0.5, spec.c, 1.3, 0.14);
}

/* ------------------------------------------------------------------ */
/* skills                                                             */
/* ------------------------------------------------------------------ */

export const SKILLFX = {
  shieldbash(game, p, hits, reach) {
    const v = game.vfx;
    const f = p.facing;
    const y = p.pos.y + 1.0;
    const yaw = yawOf(f);
    v.slashArc(p.pos.x, y, p.pos.z, yaw, { radius: reach * 0.9, thick: 1.0, sweep: 1.7, color: 0x9fd8ff, hot: 0xffffff, life: 0.24, sweepT: 0.1, tail: 0.9 });
    const cx = p.pos.x + f.x * 1.3;
    const cz = p.pos.z + f.z * 1.3;
    v.ring(cx, y, cz, { axis: f, color: 0xbfe6ff, r0: 0.15, r1: 1.7, life: 0.3, thick: 0.2, fill: 0.2 });
    v.ring(cx, y, cz, { axis: f, color: 0xffffff, r0: 0.1, r1: 1.1, life: 0.2, thick: 0.3, delay: 0.04 });
    v.glow(cx, y, cz, 0xffffff, 2, 0.16, { grow: 0.5 });
    v.glow(cx, y, cz, 0x7fc8ff, 3.2, 0.3, { grow: 0.6 });
    for (let i = 0; i < v.n(12); i++) {
      const a = R(-0.7, 0.7);
      const sp = R(4, 9);
      const dx = f.x * Math.cos(a) - f.z * Math.sin(a);
      const dz = f.x * Math.sin(a) + f.z * Math.cos(a);
      v.spark(cx, y + R(-0.3, 0.3), cz, dx * sp, R(0, 2), dz * sp, i % 2 ? 0xffffff : 0x9fd8ff, 0.08, 0.35, 6, 1);
    }
    if (hits) v.flash(cx, y, cz, 0x9fd8ff, 3, 0.2);
  },

  bulwark(game, p, dur) {
    const v = game.vfx;
    v.dome(() => p.pos, { radius: 1.45, color: 0x9fd8ff, life: dur, lift: 0.95 });
    v.ring(p.pos.x, p.pos.y + 0.1, p.pos.z, { color: 0x9fd8ff, r0: 0.3, r1: 2.2, life: 0.5, thick: 0.12, fill: 0.2 });
    v.ring(p.pos.x, p.pos.y + 0.1, p.pos.z, { color: 0xffffff, r0: 0.2, r1: 1.6, life: 0.35, thick: 0.2, delay: 0.08 });
    v.sparks(p.pos.x, p.pos.y + 0.2, p.pos.z, [0xffffff, 0x9fd8ff], 14, 3, 0.07, 0.6, -2, 2, 1);
    v.glow(p.pos.x, p.pos.y + 1, p.pos.z, 0x9fd8ff, 3.4, 0.35, { grow: 0.5 });
  },

  ironcitadel(game, p, dur) {
    const v = game.vfx;
    v.dome(() => p.pos, { radius: 1.65, color: 0xffd98a, life: dur, lift: 0.95 });
    v.ring(p.pos.x, p.pos.y + 0.1, p.pos.z, { color: 0xffd98a, r0: 0.3, r1: 2.6, life: 0.5, thick: 0.12, fill: 0.2 });
    v.glow(p.pos.x, p.pos.y + 1, p.pos.z, 0xffd98a, 3.6, 0.35, { grow: 0.5 });
    v.prism(p.pos.x, p.pos.y, p.pos.z, { w: 1.1, h: 3.4, segs: 6, color: 0xffd98a, core: 0xfff0c0, rise: 0.12, hold: 0.1, fall: 0.35, taper: 0.4, alpha: 0.3, flicker: true });
    const t0 = game.time;
    v.add({
      update: (dt, self) => {
        if (self.t > dur || p.ironT <= 0 || p.ironHits <= 0) return false;
        for (let i = 0; i < p.ironHits; i++) {
          const a = (game.time - t0) * 2.4 + (i / 3) * TAU;
          v.glowNow(p.pos.x + Math.cos(a) * 1.35, p.pos.y + 1.0 + Math.sin(a * 1.5) * 0.12, p.pos.z + Math.sin(a) * 1.35, 0xffe9b0, 1.0, 0.95);
          v.glowNow(p.pos.x + Math.cos(a) * 1.35, p.pos.y + 1.0 + Math.sin(a * 1.5) * 0.12, p.pos.z + Math.sin(a) * 1.35, 0xffffff, 0.4, 0.9);
        }
        return true;
      },
    });
  },

  whirlwind(game, p, radius, color = 0xffb347, hot = 0xfff0b0) {
    const v = game.vfx;
    const y = p.pos.y;
    v.slashArc(p.pos.x, y + 0.9, p.pos.z, yawOf(p.facing) - 1.5, { radius: radius * 0.92, thick: radius * 0.4, sweep: 5.6, color, hot, life: 0.4, sweepT: 0.24, tail: 0.95, grow: 0.08, follow: () => p.pos, lift: 0.9 });
    v.slashArc(p.pos.x, y + 0.55, p.pos.z, yawOf(p.facing) + 1.2, { radius: radius * 0.78, thick: radius * 0.3, sweep: 5.2, color: hot, hot: 0xffffff, life: 0.34, sweepT: 0.2, flip: -1, tail: 0.9, tilt: 0.12, follow: () => p.pos, lift: 0.55 });
    v.ring(p.pos.x, y + 0.1, p.pos.z, { color, r0: 0.4, r1: radius * 1.15, life: 0.4, thick: 0.1, fill: 0.15 });
    v.ring(p.pos.x, y + 0.12, p.pos.z, { color: hot, r0: 0.3, r1: radius * 0.9, life: 0.3, thick: 0.14, delay: 0.06 });
    const t0 = game.time;
    v.add({
      update: (dt, self) => {
        if (self.t > 0.42) return false;
        const a = self.t * 15;
        for (let k = 0; k < 2; k++) {
          const aa = a + k * Math.PI;
          v.glow(p.pos.x + Math.cos(aa) * radius * 0.85, p.pos.y + 0.8, p.pos.z + Math.sin(aa) * radius * 0.85, color, 1.1, 0.22, { grow: 0.4 });
          v.spark(p.pos.x + Math.cos(aa) * radius * 0.9, p.pos.y + 0.8, p.pos.z + Math.sin(aa) * radius * 0.9, -Math.sin(aa) * 4, R(0.5, 2), Math.cos(aa) * 4, hot, 0.07, 0.35, 4, 1);
        }
        return true;
      },
    });
    game.fx.dust(p.pos.x, p.pos.y, p.pos.z, 8, radius * 1.3, 0xd9c9a0);
    void t0;
  },

  bloodstorm(game, p, radius) {
    const v = game.vfx;
    SKILLFX.whirlwind(game, p, radius, 0xff3a3a, 0xffd0a0);
    v.slashArc(p.pos.x, p.pos.y + 1.4, p.pos.z, yawOf(p.facing), { radius: radius * 0.85, thick: radius * 0.35, sweep: 5.8, color: 0xc01818, hot: 0xff9a7a, life: 0.46, sweepT: 0.28, tilt: 0.5, follow: () => p.pos, lift: 1.4, flip: -1 });
    const n = v.n(7);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const d = radius * 0.8;
      v.prism(p.pos.x + Math.cos(a) * d, p.pos.y, p.pos.z + Math.sin(a) * d, { w: 0.34, h: R(1.4, 2.2), segs: 5, color: 0xc01818, core: 0xff9a7a, delay: i * 0.03, rise: 0.12, hold: 0.1, fall: 0.35, flicker: true, tilt: 0.2 });
    }
    v.glow(p.pos.x, p.pos.y + 1, p.pos.z, 0xff3a3a, radius * 1.8, 0.4, { grow: 0.5, gain: 0.8 });
    v.sparks(p.pos.x, p.pos.y + 0.5, p.pos.z, [0xff3a3a, 0xff9a7a, 0xffffff], 22, 6, 0.09, 0.7, 4, 1.5, 0.5);
    v.flash(p.pos.x, p.pos.y + 1, p.pos.z, 0xff2a2a, 4, 0.35);
  },

  execute(game, p, finisher, hits) {
    const v = game.vfx;
    const f = p.facing;
    const yaw = yawOf(f);
    const col = finisher ? 0xff3a2a : 0xff7a5a;
    v.slashArc(p.pos.x, p.pos.y + 1.2, p.pos.z, yaw, { radius: 2.5, thick: 1.5, sweep: 2.6, color: col, hot: 0xffffff, tilt: 1.2, life: 0.36, sweepT: 0.17, tail: 0.9, grow: 0.15 });
    v.slashArc(p.pos.x, p.pos.y + 1.1, p.pos.z, yaw, { radius: 2.3, thick: 0.8, sweep: 2.4, color: 0xffd0b0, hot: 0xffffff, tilt: 1.2, life: 0.28, sweepT: 0.13 });
    const gx = p.pos.x + f.x * 2.3;
    const gz = p.pos.z + f.z * 2.3;
    const gy = game.world.heightAt(gx, gz);
    for (let i = 0; i < 7; i++) {
      const d = 0.6 + i * 0.55;
      v.glow(p.pos.x + f.x * d, gy + 0.2, p.pos.z + f.z * d, 0xff5a3a, 1.4, 0.4, { delay: i * 0.025, grow: 0.5 });
    }
    v.streak({ x: p.pos.x + f.x * 0.8, y: gy + 0.1, z: p.pos.z + f.z * 0.8 }, { x: p.pos.x + f.x * 4, y: gy + 0.1, z: p.pos.z + f.z * 4 }, { color: col, width: 0.35, life: 0.4, flat: true });
    v.scorch(gx, gz, 1.1, 0x1a0a08, 0.45, 4);
    v.sparks(gx, gy + 0.2, gz, [0xff5a3a, 0xffd0b0, 0xffffff], 16, 6, 0.08, 0.5, 8);
    if (finisher) {
      v.ring(gx, gy + 1, gz, { axis: 'cam', color: 0xff3a2a, r0: 0.2, r1: 2.4, life: 0.35, thick: 0.14 });
      v.glow(gx, gy + 1, gz, 0xffffff, 3.6, 0.2, { grow: 0.7 });
      v.flash(gx, gy + 1, gz, 0xff3a2a, 5, 0.3);
    } else if (hits) v.flash(gx, gy + 1, gz, 0xff7a5a, 2.5, 0.2);
  },

  leapStart(game, p) {
    const v = game.vfx;
    v.ring(p.pos.x, p.pos.y + 0.1, p.pos.z, { color: 0xd9c9a0, r0: 0.3, r1: 1.8, life: 0.35, thick: 0.16, fill: 0.2 });
    game.fx.dust(p.pos.x, p.pos.y, p.pos.z, 8, 1.8);
    v.sparks(p.pos.x, p.pos.y + 0.3, p.pos.z, [0xffd27a, 0xffffff], 8, 3, 0.07, 0.4, 5);
    const tr = v.trail(0xffe0a0, { width: 0.55, life: 0.4, pts: 24, white: 0.4 });
    v.add({
      update: (dt, self) => {
        tr.add(p.pos.x, p.pos.y + 0.9, p.pos.z);
        if (self.t > 0.5 || p.dead) {
          tr.end();
          return false;
        }
        return true;
      },
    });
  },

  leapImpact(game, x, y, z, r) {
    const v = game.vfx;
    v.glow(x, y + 0.3, z, 0xffffff, r * 1.6, 0.12, { grow: 0.5 });
    v.glow(x, y + 0.3, z, 0xffd27a, r * 2.4, 0.3, { grow: 0.6 });
    v.ring(x, y + 0.12, z, { color: 0xffe0a0, r0: 0.3, r1: r * 1.6, life: 0.4, thick: 0.15, fill: 0.25 });
    v.ring(x, y + 0.14, z, { color: 0xd9c9a0, r0: 0.2, r1: r * 2.2, life: 0.55, thick: 0.08, delay: 0.06 });
    const n = v.n(9);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + R(-0.2, 0.2);
      const d = r * R(0.55, 0.9);
      const px = x + Math.cos(a) * d;
      const pz = z + Math.sin(a) * d;
      v.prism(px, game.world.heightAt(px, pz) - 0.1, pz, { w: R(0.28, 0.42), h: R(0.7, 1.3), segs: 3, color: 0x7a6248, core: 0xd9c9a0, solid: true, taper: 0.5, tilt: 0.35, delay: i * 0.012, rise: 0.1, hold: 0.18, fall: 0.3, onShatter: (sx, sy, sz) => game.fx.dust(sx, sy, sz, 2, 0.8, 0xb8a890) });
      v.streak({ x, y: y + 0.1, z }, { x: x + Math.cos(a) * r * 1.2, y: y + 0.1, z: z + Math.sin(a) * r * 1.2 }, { color: 0xffd27a, width: 0.14, life: 0.45, flat: true });
    }
    v.sparks(x, y + 0.2, z, [0xffd27a, 0xffffff, 0xd9c9a0], 20, 7, 0.09, 0.6, 9);
    game.fx.dust(x, y, z, 14, r * 1.2);
    v.scorch(x, z, r * 0.9, 0x2a1e14, 0.4, 4);
    v.flash(x, y + 0.5, z, 0xffd27a, 4, 0.3);
  },

  earthquake(game, p, r) {
    const v = game.vfx;
    const x = p.pos.x;
    const z = p.pos.z;
    const y = p.pos.y;
    v.glow(x, y + 0.3, z, 0xffffff, r * 1.4, 0.12, { grow: 0.5 });
    v.glow(x, y + 0.3, z, 0xe8a850, r * 2.4, 0.4, { grow: 0.6, gain: 0.8 });
    for (let i = 0; i < 3; i++) v.ring(x, y + 0.12 + i * 0.01, z, { color: i === 1 ? 0xffffff : 0xe8a850, r0: 0.3, r1: r * (1.3 + i * 0.3), life: 0.4 + i * 0.12, thick: 0.1 + i * 0.03, delay: i * 0.1, fill: i === 0 ? 0.25 : 0 });
    const n = v.n(14);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + R(-0.15, 0.15);
      const d = R(0.7, r * 0.95);
      const px = x + Math.cos(a) * d;
      const pz = z + Math.sin(a) * d;
      v.prism(px, game.world.heightAt(px, pz) - 0.15, pz, { w: R(0.3, 0.55), h: R(0.9, 2.0), segs: 4, color: 0x6e5a42, core: 0xc9b89a, solid: true, taper: 0.45, tilt: 0.3, delay: (d / r) * 0.15, rise: 0.12, hold: 0.3, fall: 0.35, onShatter: (sx, sy, sz) => game.fx.dust(sx, sy, sz, 2, 1, 0xb8a890) });
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      v.streak({ x, y: y + 0.12, z }, { x: x + Math.cos(a) * r * 1.15, y: y + 0.12, z: z + Math.sin(a) * r * 1.15 }, { color: 0xffc070, width: 0.22, life: 0.6, flat: true });
    }
    v.sparks(x, y + 0.2, z, [0xffc070, 0xffffff, 0xd9c9a0], 24, 8, 0.09, 0.7, 9);
    game.fx.dust(x, y, z, 16, r * 1.3);
    v.scorch(x, z, r * 1.0, 0x1a120a, 0.5, 6);
    v.flash(x, y + 0.5, z, 0xe8a850, 4, 0.3);
  },

  warcry(game, p, radius, dur) {
    const v = game.vfx;
    const x = p.pos.x;
    const z = p.pos.z;
    const y = p.pos.y;
    for (let i = 0; i < 3; i++) {
      v.ring(x, y + 0.12, z, { color: i === 1 ? 0xffd0a0 : 0xff4a3a, r0: 0.4, r1: radius * (0.9 + i * 0.15), life: 0.5 + i * 0.1, thick: 0.1, delay: i * 0.11, fill: i === 0 ? 0.2 : 0 });
      v.ring(x, y + 1.3, z, { axis: 'cam', color: 0xff6a4a, r0: 0.2, r1: 1.6 + i * 0.8, life: 0.4, thick: 0.1, delay: i * 0.1 });
    }
    v.prism(x, y, z, { w: 1.3, h: 5.5, segs: 7, color: 0xff3a2a, core: 0xffb090, rise: 0.14, hold: 0.2, fall: 0.5, taper: 0.4, alpha: 0.3, flicker: true });
    v.glow(x, y + 1.2, z, 0xffffff, 3, 0.14, { grow: 0.6 });
    v.glow(x, y + 1.2, z, 0xff5a3a, 6, 0.5, { grow: 0.7, gain: 0.7 });
    v.sparks(x, y + 0.8, z, [0xffe0c0, 0xff5a3a, 0xff2a1a], 30, 7, 0.1, 0.9, 3, 1, 0.5);
    v.flash(x, y + 1, z, 0xff4a3a, 4, 0.4);
    game.fx.dust(x, y, z, 10, radius * 0.7);
    aura(game, 'warcry', [0xffe0c0, 0xff7a4a, 0xff3a2a], () => game.player.warcryT > 0);
    void dur;
  },

  callwolf(game, x, y, z) {
    const v = game.vfx;
    v.ring(x, y + 0.1, z, { color: 0x9fe8ff, r0: 0.3, r1: 1.6, life: 0.6, thick: 0.1, fill: 0.2 });
    v.ring(x, y + 0.12, z, { color: 0xffffff, r0: 0.2, r1: 1.0, life: 0.4, thick: 0.16, delay: 0.1 });
    v.prism(x, y, z, { w: 0.8, h: 3, segs: 6, color: 0x6fc8ff, core: 0xd0f0ff, rise: 0.15, hold: 0.25, fall: 0.4, taper: 0.4, alpha: 0.3, flicker: true });
    v.glow(x, y + 0.7, z, 0x9fe8ff, 3.2, 0.5, { grow: 0.6 });
    v.sparks(x, y + 0.3, z, [0xffffff, 0x9fe8ff, 0xd2b48c], 18, 3, 0.07, 0.8, -1, 2, 1);
  },

  packtactics(game, p, wolf, dur) {
    const v = game.vfx;
    v.ring(p.pos.x, p.pos.y + 0.1, p.pos.z, { color: 0xd2b48c, r0: 0.3, r1: 3.2, life: 0.45, thick: 0.1, fill: 0.15 });
    v.glow(p.pos.x, p.pos.y + 1, p.pos.z, 0xffa850, 3.2, 0.3, { grow: 0.5 });
    if (wolf) {
      v.ring(wolf.x, wolf.y + 0.1, wolf.z, { color: 0xffa850, r0: 0.3, r1: 2, life: 0.4, thick: 0.12 });
      v.glow(wolf.x, wolf.y + 0.7, wolf.z, 0xffa850, 3, 0.3, { grow: 0.5 });
    }
    aura(game, 'pack', [0xfff0c0, 0xffa850, 0xe86a2a], () => game.player.packT > 0);
    void dur;
  },

  howl(game, p, wolf, radius) {
    const v = game.vfx;
    const f = p.facing;
    const y = p.pos.y + 1.55;
    const go = (x, yy, z, fx2, fz2) => {
      for (let i = 0; i < 4; i++) {
        v.ring(x + fx2 * (0.4 + i * 0.35), yy, z + fz2 * (0.4 + i * 0.35), { axis: { x: fx2, y: 0.2, z: fz2 }, color: 0xf0d9a0, r0: 0.25, r1: 2.4 + i * 0.5, life: 0.5, thick: 0.1, delay: i * 0.1 });
      }
    };
    go(p.pos.x, y, p.pos.z, f.x, f.z);
    if (wolf) go(wolf.x, wolf.y + 0.9, wolf.z, f.x, f.z);
    v.ring(p.pos.x, p.pos.y + 0.12, p.pos.z, { color: 0xf0d9a0, r0: 0.4, r1: radius * 1.1, life: 0.5, thick: 0.08 });
    v.glow(p.pos.x, y, p.pos.z, 0xfff0c0, 2.4, 0.4, { grow: 0.7 });
    v.sparks(p.pos.x, y, p.pos.z, [0xfff0c0, 0xf0d9a0], 12, 4, 0.07, 0.6, 0, 0, 0.8);
  },

  poisonvolley(game, p) {
    const v = game.vfx;
    const h = handPos(p);
    v.glow(h.x, h.y, h.z, 0x8fe35a, 2.2, 0.2, { grow: 0.6 });
    v.ring(h.x + p.facing.x * 0.4, h.y, h.z + p.facing.z * 0.4, { axis: p.facing, color: 0x8fe35a, r0: 0.1, r1: 1.0, life: 0.22, thick: 0.2 });
    v.sparks(h.x, h.y, h.z, TOXIN, 8, 3, 0.07, 0.5, 2);
  },

  aimedshot(game, p) {
    const v = game.vfx;
    const h = handPos(p);
    const f = p.facing;
    v.ring(h.x + f.x * 0.5, h.y, h.z + f.z * 0.5, { axis: f, color: 0xffd23f, r0: 1.1, r1: 0.1, life: 0.22, thick: 0.18, ease: 'lin' });
    v.ring(h.x + f.x * 0.5, h.y, h.z + f.z * 0.5, { axis: f, color: 0xffffff, r0: 0.1, r1: 1.4, life: 0.25, thick: 0.15, delay: 0.1 });
    v.glow(h.x, h.y, h.z, 0xffd23f, 2.4, 0.22, { grow: 0.6 });
    v.sparks(h.x, h.y, h.z, [0xffffff, 0xffd23f], 8, 5, 0.06, 0.4, 3);
  },

  snipe(game, p) {
    const v = game.vfx;
    const h = handPos(p);
    const f = p.facing;
    v.ring(h.x + f.x * 0.5, h.y, h.z + f.z * 0.5, { axis: f, color: 0xaee9ff, r0: 1.4, r1: 0.1, life: 0.26, thick: 0.18, ease: 'lin' });
    v.ring(h.x + f.x * 0.6, h.y, h.z + f.z * 0.6, { axis: f, color: 0xffffff, r0: 0.1, r1: 2.0, life: 0.3, thick: 0.12, delay: 0.12 });
    v.glow(h.x, h.y, h.z, 0xffffff, 2.2, 0.14, { grow: 0.6 });
    v.glow(h.x, h.y, h.z, 0x8fe4ff, 3.4, 0.3, { grow: 0.6 });
    v.streak({ x: h.x, y: h.y, z: h.z }, { x: h.x + f.x * 16, y: h.y, z: h.z + f.z * 16 }, { color: 0xaee9ff, width: 0.18, life: 0.25 });
    v.sparks(h.x, h.y, h.z, [0xffffff, 0x8fe4ff], 10, 6, 0.06, 0.4, 3);
  },

  plaguearrow(game, p) {
    const v = game.vfx;
    const h = handPos(p);
    v.glow(h.x, h.y, h.z, 0x9a5ae0, 2.6, 0.26, { grow: 0.6 });
    v.glow(h.x, h.y, h.z, 0x8fe35a, 1.6, 0.2, { grow: 0.5 });
    v.sparks(h.x, h.y, h.z, [0xd7ffb0, 0x9a5ae0, 0x6dce4a], 10, 3, 0.07, 0.6, -1);
  },

  markedprey(game, p, mon) {
    const v = game.vfx;
    const h = handPos(p);
    const y = mon.y + (mon.hover || 0) + 0.9;
    v.streak({ x: h.x, y: h.y, z: h.z }, { x: mon.x, y, z: mon.z }, { color: 0xffd23f, width: 0.12, life: 0.3 });
    for (let i = 0; i < 3; i++) v.ring(mon.x, y, mon.z, { axis: 'cam', color: 0xffd23f, r0: 2.2 - i * 0.3, r1: 0.7, life: 0.35, thick: 0.08, delay: i * 0.07, ease: 'lin' });
    v.glow(mon.x, y, mon.z, 0xffd23f, 3, 0.3, { grow: 0.5 });
    v.sparks(mon.x, y, mon.z, [0xffffff, 0xffd23f], 10, 3, 0.07, 0.5, -1);
  },

  fireball(game, p) {
    const v = game.vfx;
    const h = handPos(p);
    v.glow(h.x, h.y, h.z, 0xfff0b0, 1.6, 0.14, { grow: 0.6 });
    v.glow(h.x, h.y, h.z, 0xff7a1a, 3, 0.3, { grow: 0.6 });
    v.ring(h.x + p.facing.x * 0.4, h.y, h.z + p.facing.z * 0.4, { axis: p.facing, color: 0xff9a3a, r0: 0.1, r1: 1.0, life: 0.22, thick: 0.22 });
    v.sparks(h.x, h.y, h.z, FIRE, 12, 4, 0.08, 0.45, 5);
    v.flash(h.x, h.y, h.z, 0xff8a2a, 3, 0.2);
  },

  flamewave(game, p, reach) {
    const v = game.vfx;
    const f = p.facing;
    const rx = f.z;
    const rz = -f.x;
    const gh = (x, z) => game.world.heightAt(x, z);
    v.slashArc(p.pos.x, p.pos.y + 0.55, p.pos.z, yawOf(f), { radius: reach * 0.92, thick: reach * 0.55, sweep: 1.55, color: 0xff7a1a, hot: 0xffe9a0, life: 0.45, sweepT: 0.22, tail: 0.95, grow: 0.12 });
    const rows = 5;
    for (let i = 0; i < rows; i++) {
      const d = 0.9 + i * (reach / rows) * 0.9;
      const half = d * 0.55;
      const cols = i < 2 ? 2 : 3;
      for (let k = 0; k < cols; k++) {
        const lat = cols === 1 ? 0 : (k / (cols - 1) - 0.5) * 2 * half;
        const px = p.pos.x + f.x * d + rx * lat;
        const pz = p.pos.z + f.z * d + rz * lat;
        v.prism(px, gh(px, pz), pz, { w: 0.42 + i * 0.04, h: R(1.0, 1.6) + i * 0.1, segs: 5, color: 0xff6a1a, core: 0xfff2b0, delay: i * 0.05 + R(0, 0.03), rise: 0.12, hold: 0.14, fall: 0.4, flicker: true, tilt: 0.12 });
        v.glow(px, gh(px, pz) + 0.6, pz, 0xff8a2a, 2.2, 0.4, { delay: i * 0.05, grow: 0.5, gain: 0.7 });
      }
    }
    const hx = p.pos.x + f.x * 1.3;
    const hz = p.pos.z + f.z * 1.3;
    v.sparks(hx, p.pos.y + 0.9, hz, FIRE, 22, 6, 0.1, 0.7, 2, 1.5, 0.4);
    v.flash(hx, p.pos.y + 1, hz, 0xff8a2a, 4, 0.4);
  },

  frostbolt(game, p) {
    const v = game.vfx;
    const h = handPos(p);
    v.glow(h.x, h.y, h.z, 0xffffff, 1.4, 0.14, { grow: 0.6 });
    v.glow(h.x, h.y, h.z, 0x7fd0ff, 2.8, 0.3, { grow: 0.6 });
    v.ring(h.x + p.facing.x * 0.4, h.y, h.z + p.facing.z * 0.4, { axis: p.facing, color: 0x9fdcff, r0: 0.1, r1: 0.9, life: 0.22, thick: 0.22 });
    v.sparks(h.x, h.y, h.z, ICE, 10, 3.5, 0.07, 0.5, 4);
  },

  icenova(game, p, radius) {
    const v = game.vfx;
    const x = p.pos.x;
    const z = p.pos.z;
    const y = p.pos.y;
    v.glow(x, y + 0.5, z, 0xffffff, radius * 1.2, 0.14, { grow: 0.6 });
    v.glow(x, y + 0.5, z, 0x7fd0ff, radius * 2, 0.45, { grow: 0.8, gain: 0.8 });
    v.ring(x, y + 0.12, z, { color: 0xbfeaff, r0: 0.3, r1: radius * 1.35, life: 0.45, thick: 0.16, fill: 0.3 });
    v.ring(x, y + 0.14, z, { color: 0xffffff, r0: 0.2, r1: radius * 1.1, life: 0.3, thick: 0.1, delay: 0.05 });
    v.ring(x, y + 0.9, z, { axis: 'cam', color: 0xd7f4ff, r0: 0.2, r1: radius * 0.8, life: 0.3, thick: 0.1 });
    const ringSpec = [
      [radius * 0.92, 11, 1.3],
      [radius * 0.55, 7, 1.0],
    ];
    ringSpec.forEach(([rad, n, h], layer) => {
      const cnt = v.n(n);
      for (let i = 0; i < cnt; i++) {
        const a = (i / cnt) * TAU + layer * 0.4 + R(-0.1, 0.1);
        const px = x + Math.cos(a) * rad;
        const pz = z + Math.sin(a) * rad;
        v.prism(px, game.world.heightAt(px, pz) - 0.1, pz, { w: R(0.3, 0.45), h: h * R(0.8, 1.4), segs: 4, color: 0x8fd4ff, core: 0xffffff, solid: true, taper: 0.1, tilt: 0.35, delay: layer * 0.07 + (i % 3) * 0.02, rise: 0.1, hold: 0.45, fall: 0.35, onShatter: (sx, sy, sz) => v.sparks(sx, sy, sz, ICE, 5, 3, 0.08, 0.5, 9) });
      }
    });
    v.sparks(x, y + 0.5, z, ICE, 24, 7, 0.08, 0.8, 3, 1, 0.6);
    v.scorch(x, z, radius * 0.9, 0xcfeeff, 0.5, 3);
    v.flash(x, y + 0.7, z, 0x8fd4ff, 4, 0.35);
  },

  glacier(game, p, reach) {
    const v = game.vfx;
    const f = p.facing;
    const rx = f.z;
    const rz = -f.x;
    v.slashArc(p.pos.x, p.pos.y + 0.5, p.pos.z, yawOf(f), { radius: reach * 0.9, thick: reach * 0.5, sweep: 1.6, color: 0x8fd4ff, hot: 0xffffff, life: 0.45, sweepT: 0.2, tail: 0.95 });
    const rows = 5;
    for (let i = 0; i < rows; i++) {
      const d = 0.9 + i * (reach / rows) * 0.85;
      const half = d * 0.5;
      const cols = i === 0 ? 2 : 3;
      for (let k = 0; k < cols; k++) {
        const lat = (k / (cols - 1) - 0.5) * 2 * half + R(-0.15, 0.15);
        const px = p.pos.x + f.x * d + rx * lat;
        const pz = p.pos.z + f.z * d + rz * lat;
        v.prism(px, game.world.heightAt(px, pz) - 0.1, pz, { w: R(0.4, 0.55), h: R(1.3, 2.1) + i * 0.15, segs: 5, color: 0x7fc8ff, core: 0xffffff, solid: true, taper: 0.08, tilt: 0.28, delay: i * 0.055, rise: 0.11, hold: 0.45, fall: 0.35, onShatter: (sx, sy, sz) => v.sparks(sx, sy, sz, ICE, 5, 3, 0.08, 0.5, 9) });
      }
    }
    v.sparks(p.pos.x + f.x * 1.5, p.pos.y + 0.8, p.pos.z + f.z * 1.5, ICE, 20, 6, 0.08, 0.7, 3, 1, 0.5);
    v.flash(p.pos.x + f.x * 2, p.pos.y + 1, p.pos.z + f.z * 2, 0x8fd4ff, 3.5, 0.35);
  },

  spark(game, p) {
    const v = game.vfx;
    const h = handPos(p);
    v.glow(h.x, h.y, h.z, 0xffffff, 1.2, 0.1, { grow: 0.5 });
    v.glow(h.x, h.y, h.z, 0x4ad0ff, 2.2, 0.2, { grow: 0.6 });
    v.bolt(h, { x: h.x + p.facing.x * 1.3, y: h.y + 0.05, z: h.z + p.facing.z * 1.3 }, { seg: 4, width: 0.1, jag: 0.2, life: 0.12, branches: 0, color: 0xc5f0ff });
    v.sparks(h.x, h.y, h.z, ZAP, 6, 4, 0.06, 0.3, 0);
  },

  thunderclap(game, p, radius) {
    const v = game.vfx;
    const x = p.pos.x;
    const z = p.pos.z;
    const y = p.pos.y;
    v.bolt({ x: x + R(-0.4, 0.4), y: y + 13, z: z + R(-0.4, 0.4) }, { x, y: y + 0.1, z }, { seg: 14, width: 0.42, jag: 0.55, life: 0.34, branches: 3, color: 0xc5ecff });
    v.glow(x, y + 0.6, z, 0xffffff, radius * 1.6, 0.14, { grow: 0.6 });
    v.glow(x, y + 0.6, z, 0x6fd8ff, radius * 2.8, 0.4, { grow: 0.7, gain: 0.8 });
    const n = v.n(7);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + R(-0.2, 0.2);
      const px = x + Math.cos(a) * radius * R(0.8, 1.15);
      const pz = z + Math.sin(a) * radius * R(0.8, 1.15);
      v.bolt({ x, y: y + 0.4, z }, { x: px, y: game.world.heightAt(px, pz) + 0.15, z: pz }, { seg: 8, width: 0.16, jag: 0.5, life: 0.26, branches: 1, color: 0xb5e3ff });
    }
    v.ring(x, y + 0.12, z, { color: 0xd7e4ff, r0: 0.4, r1: radius * 1.35, life: 0.4, thick: 0.14, fill: 0.3 });
    v.ring(x, y + 0.14, z, { color: 0xffffff, r0: 0.3, r1: radius * 1.0, life: 0.28, thick: 0.1, delay: 0.04 });
    v.ring(x, y + 1, z, { axis: 'cam', color: 0xb5e3ff, r0: 0.3, r1: radius * 0.9, life: 0.3, thick: 0.12 });
    v.sparks(x, y + 0.5, z, ZAP, 28, 8, 0.08, 0.6, 4, 1, 0.5);
    v.scorch(x, z, radius * 0.8, 0x101018, 0.5, 5);
    v.flash(x, y + 2, z, 0xaee4ff, 9, 0.4);
  },
};

/* ------------------------------------------------------------------ */
/* chain lightning and meteors                                         */
/* ------------------------------------------------------------------ */

export function lightningArc(game, a, b, o = {}) {
  const v = game.vfx;
  v.bolt(a, b, { seg: 9, width: o.width ?? 0.2, jag: 0.45, life: 0.3, branches: 2, color: 0xc5ecff });
  v.glow(b.x, b.y, b.z, 0xffffff, 1.5, 0.12, { grow: 0.5 });
  v.glow(b.x, b.y, b.z, 0x4ad0ff, 3, 0.3, { grow: 0.8 });
  v.ring(b.x, b.y, b.z, { axis: 'cam', color: 0x9fe8ff, r0: 0.1, r1: 1.2, life: 0.22, thick: 0.18 });
  v.sparks(b.x, b.y, b.z, ZAP, 10, 6, 0.07, 0.4, 5);
  v.flash(b.x, b.y, b.z, 0x6fd8ff, 3.5, 0.2);
}

export function summonMeteor(game, tx, tz, onImpact) {
  const v = game.vfx;
  const gy = game.world.heightAt(tx, tz);
  const fall = 0.85;
  const start = { x: tx + 7, y: gy + 24, z: tz - 5 };
  game.fx.telegraph(tx, gy, tz, 0, 'circle', 3.3, 0, 0xff5a1a, fall + 0.1);
  v.ring(tx, gy + 0.12, tz, { color: 0xff5a1a, r0: 4, r1: 0.6, life: fall, thick: 0.05, ease: 'lin', gain: 0.8 });
  const tr = v.trail(0xff6a1a, { width: 1.1, life: 0.5, pts: 30, white: 0.6, step: 0.2 });
  let done = false;
  v.add({
    update: (dt, self) => {
      const k = Math.min(1, self.t / fall);
      const e = Math.pow(k, 1.7);
      const x = start.x + (tx - start.x) * e;
      const y = start.y + (gy + 0.6 - start.y) * e;
      const z = start.z + (tz - start.z) * e;
      tr.add(x, y, z);
      v.glowNow(x, y, z, 0xff7a1a, 5.2, 0.9);
      v.glowNow(x, y, z, 0xfff0b0, 2.6, 0.9);
      v.glowNow(x, y, z, 0xffffff, 1.2, 1);
      if (Math.random() < dt * 60 * v.density) v.spark(x, y, z, R(-1, 1), R(-1, 2), R(-1, 1), FIRE[(Math.random() * 4) | 0], R(0.1, 0.2), R(0.4, 0.8), 3, 1);
      if (Math.random() < dt * 40) game.fx.emit(x, y, z, R(-0.5, 0.5), R(0, 1), R(-0.5, 0.5), 0x3a3030, R(0.2, 0.34), R(0.6, 1), -0.5);
      v.flash(x, y, z, 0xff8a2a, 4, 0.12);
      if (k >= 1 && !done) {
        done = true;
        tr.end();
        fireExplosion(game, tx, gy + 0.7, tz, 3.4);
        v.ring(tx, gy + 0.9, tz, { axis: 'cam', color: 0xffffff, r0: 0.3, r1: 5, life: 0.3, thick: 0.1 });
        for (let i = 0; i < v.n(14); i++) {
          const a = R(0, TAU);
          const sp = R(3, 8);
          game.fx.emit(tx, gy + 0.5, tz, Math.cos(a) * sp, R(4, 9), Math.sin(a) * sp, i % 2 ? 0x5a4636 : 0x2a2220, R(0.14, 0.26), R(0.7, 1.2), 14);
        }
        onImpact();
        return false;
      }
      return true;
    },
  });
}

/* ------------------------------------------------------------------ */
/* monster status visuals                                              */
/* ------------------------------------------------------------------ */

export function statusFx(game, mon, dt) {
  const v = game.vfx;
  if (!v || mon.dead) return;
  const cy = mon.y + (mon.hover || 0);
  const h = Math.max(0.9, (mon.radius || 0.5) * 2.1);
  const r = mon.radius || 0.5;
  if (mon.burnT > 0 && Math.random() < dt * 28 * v.density) {
    const a = R(0, TAU);
    const d = R(0, r * 0.9);
    const px = mon.x + Math.cos(a) * d;
    const pz = mon.z + Math.sin(a) * d;
    const py = cy + R(0.2, h);
    v.glow(px, py, pz, i2c(), R(0.7, 1.2), R(0.35, 0.6), { vy: R(1, 2), grow: -0.3, gain: 0.8 });
    v.spark(px, py, pz, R(-0.3, 0.3), R(1.2, 2.5), R(-0.3, 0.3), FIRE[(Math.random() * 4) | 0], 0.06, 0.6, -1, 0.3);
    if (Math.random() < 0.3) game.fx.emit(px, py + 0.2, pz, 0, 1, 0, 0x3a3434, 0.12, 0.6, -1);
  }
  if (mon.poisonT > 0 && Math.random() < dt * 14 * v.density) {
    const a = R(0, TAU);
    const px = mon.x + Math.cos(a) * r * R(0.3, 1);
    const pz = mon.z + Math.sin(a) * r * R(0.3, 1);
    const py = cy + R(0.2, h);
    v.glow(px, py, pz, 0x6dce4a, R(0.5, 0.9), R(0.5, 0.9), { vy: R(0.4, 1), gain: 0.8 });
    v.spark(px, py, pz, 0, R(0.6, 1.2), 0, 0xb8ff7a, 0.06, 0.8, -0.5, 0.2);
  }
  if (mon.slowT > 0 && Math.random() < dt * 12 * v.density) {
    const a = R(0, TAU);
    const px = mon.x + Math.cos(a) * r * R(0.4, 1);
    const pz = mon.z + Math.sin(a) * r * R(0.4, 1);
    v.spark(px, cy + R(0.1, h), pz, 0, R(0.3, 0.8), 0, 0xd7f4ff, 0.07, 0.8, -0.2, 0.2);
    v.glow(mon.x, cy + 0.1, mon.z, 0x8fd4ff, r * 3.2, 0.1, { gain: 0.35, grow: 0 });
  }
  if (mon.markT > 0) {
    const t = game.time * 3;
    const y = cy + h + 0.7;
    for (let i = 0; i < 4; i++) {
      const a = t + (i / 4) * TAU;
      v.glowNow(mon.x + Math.cos(a) * 0.5, y, mon.z + Math.sin(a) * 0.5, 0xffd23f, 0.5, 0.9);
    }
    v.glowNow(mon.x, y - 0.35 + Math.sin(game.time * 6) * 0.08, mon.z, 0xffe27a, 0.6, 1);
    v.glowNow(mon.x, y - 0.6 + Math.sin(game.time * 6) * 0.08, mon.z, 0xffd23f, 0.4, 0.9);
  }
  if (mon.stun > 0.05) {
    const t = game.time * 5;
    const y = cy + h + 0.35;
    for (let i = 0; i < 3; i++) {
      const a = t + (i / 3) * TAU;
      v.glowNow(mon.x + Math.cos(a) * 0.55, y + Math.sin(a * 2) * 0.05, mon.z + Math.sin(a) * 0.55, 0xffe27a, 0.55, 1);
    }
  }
}

function i2c() {
  return Math.random() < 0.5 ? 0xff8a1e : 0xffd25a;
}
