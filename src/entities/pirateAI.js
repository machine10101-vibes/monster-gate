import * as THREE from 'three';
import { clamp } from '../engine/voxel.js';
import { PIRATE_TIMES, CURSED_TIMES, S } from '../data/pirates.js';
import { buildPirate, buildCursedPirate, HIP_Y } from './pirates.js';

/**
 * The Pirate and the Cursed Pirate: brains and body language.
 *
 * Pirate (cutlass)
 *   Overhead Chop  raises the cutlass behind the head and brings it straight down
 *   Side Slash     a fast backhand sweep across the body
 *   Lunge          drops low, then dashes in with the point out; open to a counter while it recovers
 *   Staggers if struck while winding up. Circles at cutlass range between attacks.
 * Cursed Pirate (bloody cutlass)
 *   Grave Combo    two slashes (three once the curse stirs), each leaving a green afterimage of the blade
 *   Grave Smash    a two-handed chop that sends a ring of cursed light out around him
 *   Relentless, rarely staggers, and fights faster below half health.
 */
const TAU = Math.PI * 2;
const GHOST = [0x6aff9a, 0xb8ffd0, 0x3ad87a];
const BONES = [0xd9cfb4, 0xe6dcc2, 0xa09474, 0x6aff9a];

export const TYPES = new Set(['pirate', 'cursedpirate']);

export const DEFS = {
  pirate: { name: 'Pirate', hp: 70, radius: 0.6, speed: 3.0, dmg: 4, gold: [20, 40], aggro: 14, build: buildPirate },
  cursedpirate: { name: 'Cursed Pirate', hp: 110, radius: 0.6, speed: 3.1, dmg: 6, gold: [45, 70], aggro: 15, build: buildCursedPirate },
};

export const FX = {
  pirate: {
    spark: [0xfff2c0, 0xffb347, 0xffffff],
    burst: [0xc9967a, 0xff5a46, 0xffffff],
    death: [0x2a3f78, 0xd4b050, 0xc9967a, 0xffffff],
    tele: 0xffd23f,
    accel: 10,
    accelFn: (m) => (m.state === 'dash' ? 30 : m.state.startsWith('strike') ? 16 : 10),
    knock: 2.2,
    stun: 0.3,
    plateY: 2.1,
    deathDur: 1.7,
    heavy: false,
    rage: false,
  },
  cursedpirate: {
    spark: [0xe6f9d0, 0x6aff9a, 0xffffff],
    burst: [0xd8cdb0, 0x3aff7a, 0xffffff],
    death: [0xd9cfb4, 0x6aff9a, 0xb8ffd0, 0x3ad87a],
    tele: 0x3aff7a,
    accel: 9,
    accelFn: (m) => (m.state.startsWith('strike') ? 12 : 9),
    knock: 3.4,
    stun: 0.2,
    plateY: 2.1,
    deathDur: 2.6,
    heavy: true,
    rage: true,
    rageText: 'The Curse Stirs!',
    noLift: true,
    slowmo: true,
  },
};

const PIRATE_WIND = new Set(['windO', 'windS', 'windL']);
const PIRATE_BUSY = new Set(['strikeO', 'strikeS', 'dash', 'recover']);
const CURSED_WIND = new Set(['windC', 'windG']);
const CURSED_BUSY = new Set(['strikeC1', 'linkC1', 'strikeC2', 'linkC2', 'strikeC3', 'strikeG', 'recover']);

const rageOf = (m) => (m.enraged || (m.puppet && m.hp < m.maxHp * 0.5) ? 1.3 : 1);
const isCursed = (m) => m.type === 'cursedpirate';

export function busy(m) {
  if (isCursed(m)) return CURSED_BUSY.has(m.state) || (rageOf(m) > 1 && CURSED_WIND.has(m.state));
  return PIRATE_BUSY.has(m.state);
}

export const holdsWarn = (m) => PIRATE_WIND.has(m.state) || CURSED_WIND.has(m.state);

function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
const turn = (m, to, rate, dt) => {
  m.yaw += clamp(angDiff(m.yaw, to), -rate * dt, rate * dt);
};

function pirateDur(state) {
  const t = PIRATE_TIMES;
  return { windO: t.overhead.wind, strikeO: t.overhead.strike, windS: t.side.wind, strikeS: t.side.strike, windL: t.lunge.wind, dash: t.lunge.dash }[state];
}
function cursedDur(m, state) {
  const c = CURSED_TIMES;
  const r = rageOf(m);
  const d = { windC: c.combo.wind, strikeC1: c.combo.strike1, linkC1: c.combo.link, strikeC2: c.combo.strike2, linkC2: c.combo.link * 0.8, strikeC3: c.combo.strike2 * 1.1, windG: c.smash.wind, strikeG: c.smash.strike }[state] || 0.5;
  return CURSED_WIND.has(state) ? d / r : state.startsWith('link') ? d / r : d;
}

function lateral(m, P, fromX, fromZ) {
  const dx = P.pos.x - fromX;
  const dz = P.pos.z - fromZ;
  const s = Math.sin(m.yaw);
  const c = Math.cos(m.yaw);
  return { along: dx * s + dz * c, perp: Math.abs(dx * c - dz * s), dist: Math.hypot(dx, dz), ang: Math.abs(angDiff(m.yaw, Math.atan2(dx, dz))) };
}
const reachable = (m, P) => !P.dead && P.pos.y < m.y + 2.6;

function hurtLine(m, P, reach, half, dmg, knock, cols) {
  if (!reachable(m, P)) return false;
  const l = lateral(m, P, m.x, m.z);
  if (l.along < -0.3 || l.along > reach || l.perp > half) return false;
  return landed(m, P, dmg, knock, cols);
}
function hurtArc(m, P, reach, arc, dmg, knock, cols) {
  if (!reachable(m, P)) return false;
  const l = lateral(m, P, m.x, m.z);
  if (l.dist > reach || l.ang > arc) return false;
  return landed(m, P, dmg, knock, cols);
}
function landed(m, P, dmg, knock, cols) {
  if (!P.hurt(dmg, m.x, m.z, knock)) return false;
  m.game.fx.burst(P.pos.x, P.pos.y + 1.1, P.pos.z, cols, 10, 3.4, 0.09, 0.4);
  return true;
}

function pickOrbit(m) {
  m.orbitT = 1.2 + Math.random() * 2.2;
  if (Math.random() < 0.5) m.orbitDir = -(m.orbitDir || 1);
  m.orbitDir = m.orbitDir || 1;
}

function patrol(m, dt, speed) {
  m.pauseT = (m.pauseT ?? Math.random() * 2) - dt;
  if (m.pauseT > 0) return [0, 0];
  if (!m.target) {
    const a = Math.random() * TAU;
    const r = 2 + Math.random() * 5;
    m.target = { x: m.home.x + Math.cos(a) * r, z: m.home.z + Math.sin(a) * r };
  }
  const tx = m.target.x - m.x;
  const tz = m.target.z - m.z;
  const td = Math.hypot(tx, tz);
  m.patrolT = (m.patrolT || 0) + dt;
  if (td > 0.7 && m.patrolT < 6) {
    turn(m, Math.atan2(tx, tz), 3, dt);
    return [(tx / td) * speed, (tz / td) * speed];
  }
  m.pauseT = 1.6 + Math.random() * 3;
  m.patrolT = 0;
  m.target = null;
  return [0, 0];
}

/* ------------------------------------------------------------------ */
/* Ghost afterimages                                                    */
/* ------------------------------------------------------------------ */
const _mat4 = new THREE.Matrix4();
export function ghostBlade(m, color = 0x4dff8a, life = 0.28, opacity = 0.55) {
  const sword = m.model.parts.sword;
  const g = m.game;
  if (!sword || !g?.scene) return;
  sword.updateWorldMatrix(true, true);
  const meshes = [];
  sword.traverse((o) => o.isMesh && meshes.push(o));
  const grp = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const src of meshes) {
    const c = new THREE.Mesh(src.geometry, mat);
    c.matrixAutoUpdate = false;
    _mat4.copy(src.matrixWorld);
    c.matrix.copy(_mat4);
    c.frustumCulled = false;
    grp.add(c);
  }
  g.scene.add(grp);
  const t0 = performance.now();
  const tick = () => {
    const k = (performance.now() - t0) / 1000 / life;
    if (k >= 1 || !grp.parent) {
      g.scene.remove(grp);
      mat.dispose();
      return;
    }
    mat.opacity = opacity * (1 - k) ** 1.4;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function bladeTip(m) {
  const s = m.model.parts.sword;
  s.updateWorldMatrix(true, false);
  return new THREE.Vector3(0, 40 * S, 3 * S).applyMatrix4(s.matrixWorld);
}

/* ------------------------------------------------------------------ */
/* Pirate brain                                                         */
/* ------------------------------------------------------------------ */
function beginPirate(m, atk, P, dist) {
  const g = m.game;
  m.atk = atk;
  m.lastAtk = atk;
  m.t = 0;
  m.hitDone = false;
  if (atk === 'overhead') {
    m.state = 'windO';
    m.warn('line', 1.9, 3.1, PIRATE_TIMES.overhead.wind);
    g.audio.tone(130, 0.35, 'sawtooth', 0.08, -40);
  } else if (atk === 'side') {
    m.state = 'windS';
    m.warn('line', 3.4, 2.9, PIRATE_TIMES.side.wind);
    g.audio.tone(200, 0.25, 'sawtooth', 0.07, -80);
  } else {
    m.state = 'windL';
    m.warn('line', 1.4, Math.min(8, Math.max(5.5, dist + 1.5)), PIRATE_TIMES.lunge.wind);
    g.audio.tone(90, 0.45, 'triangle', 0.09, 120);
  }
}

function pirateThink(m, dt, c) {
  const { g, P, dx, dz, dist, sees, toP } = c;
  const speed = m.def.speed;
  let mvx = 0;
  let mvz = 0;
  const st = m.state;
  const camp = Math.hypot(m.x - m.home.x, m.z - m.home.z);

  const struck = m._hpSeen !== undefined && m.hp < m._hpSeen;
  m._hpSeen = m.hp;
  if (PIRATE_WIND.has(st) && struck) {
    m.clearWarn();
    m.state = 'stagger';
    m.t = 0;
    m.cd = 0.5;
    g.hud.floatText(...g.screenOf(m.x, m.y + 2.2, m.z), 'Staggered', 'gold');
    return [0, 0];
  }

  if (st === 'idle' || st === 'wander') {
    m.state = 'idle';
    if (sees && camp < 40) {
      m.state = 'chase';
      m.cd = Math.min(m.cd, 0.7);
      pickOrbit(m);
      g.audio.tone(150, 0.3, 'sawtooth', 0.07, 40);
    } else [mvx, mvz] = patrol(m, dt, 1.15);
  } else if (st === 'chase') {
    if ((!sees && dist > m.def.aggro * 1.5) || camp > 40) {
      m.state = 'idle';
      m.target = { x: m.home.x, z: m.home.z };
      m.pauseT = 0;
      return [0, 0];
    }
    turn(m, toP, 7, dt);
    m.orbitT = (m.orbitT ?? 0) - dt;
    if (m.orbitT <= 0) pickOrbit(m);
    const nx = dx / dist;
    const nz = dz / dist;
    if (dist > 3.0) {
      const sp = speed * (dist > 9 ? 1.15 : 1);
      mvx = nx * sp;
      mvz = nz * sp;
    } else {
      const back = dist < 1.9 ? -0.5 : dist < 2.3 ? 0 : 0.25;
      mvx = (nx * back - nz * m.orbitDir * 0.55) * speed;
      mvz = (nz * back + nx * m.orbitDir * 0.55) * speed;
    }
    if (m.cd <= 0 && !P.dead) {
      const r = Math.random();
      if (dist < 3.2) beginPirate(m, m.lastAtk === 'overhead' && r < 0.6 ? 'side' : r < 0.58 ? 'overhead' : 'side', P, dist);
      else if (dist > 4 && dist < 9 && r < 0.7) beginPirate(m, 'lunge', P, dist);
      else m.cd = 0.25;
    }
  } else if (PIRATE_WIND.has(st)) {
    const rate = st === 'windL' ? 9 : st === 'windS' ? 7 : 5;
    if (m.t < pirateDur(st) - 0.12) turn(m, toP, rate, dt);
    if (st === 'windO' && dist > 2.6) {
      mvx = (dx / dist) * speed * 0.45;
      mvz = (dz / dist) * speed * 0.45;
    }
    if (m.t > pirateDur(st)) {
      m.clearWarn();
      m.t = 0;
      m.hitDone = false;
      if (st === 'windL') {
        m.state = 'dash';
        g.audio.tone(70, 0.3, 'square', 0.1, 100);
        g.fx.ring(m.x, m.y + 0.2, m.z, 0xd9c9a0, 8, 2.4, 0.08, 0.35);
      } else {
        m.state = st === 'windO' ? 'strikeO' : 'strikeS';
        m.kick = 1;
        strikePirate(m, P);
      }
    }
  } else if (st === 'strikeO' || st === 'strikeS') {
    if (m.t > pirateDur(st)) {
      m.state = 'recover';
      m.t = 0;
    }
  } else if (st === 'dash') {
    const v = 13;
    mvx = Math.sin(m.yaw) * v;
    mvz = Math.cos(m.yaw) * v;
    if (Math.random() < dt * 40) g.fx.dust(m.x, m.y, m.z, 1, 1.2, 0xd9c9a0);
    if (!m.hitDone && dist < m.radius + 1.45 && reachable(m, P)) {
      m.hitDone = true;
      if (!P.dead && P.hurt(m.def.dmg + 1, m.x, m.z, 9)) {
        g.fx.burst(P.pos.x, P.pos.y + 1.1, P.pos.z, [0xfff2c0, 0xff5a46, 0xffffff], 10, 3.4, 0.09, 0.4);
        g.shake(0.15);
      }
      g.vfx.hit(m.x + Math.sin(m.yaw) * 1.3, m.y + 1.0, m.z + Math.cos(m.yaw) * 1.3, Math.sin(m.yaw), Math.cos(m.yaw), 0xffe2a0, 0.8);
    }
    if (m.t > pirateDur('dash') || m.hitDone) {
      m.state = 'recover';
      m.t = 0;
    }
  } else if (st === 'recover') {
    const long = m.atk === 'lunge';
    if (m.t > (long ? 0.75 : m.atk === 'side' ? 0.4 : 0.5)) {
      m.state = 'chase';
      m.cd = 0.55 + Math.random() * 0.7;
      pickOrbit(m);
    }
  } else if (st === 'stagger') {
    mvx = -Math.sin(m.yaw) * 0.6;
    mvz = -Math.cos(m.yaw) * 0.6;
    if (m.t > 0.42) {
      m.state = 'chase';
      m.cd = 0.35 + Math.random() * 0.3;
    }
  } else m.state = 'chase';
  return [mvx, mvz];
}

function strikePirate(m, P) {
  const g = m.game;
  const s = Math.sin(m.yaw);
  const c = Math.cos(m.yaw);
  const dmg = m.def.dmg;
  const col = [0xfff2c0, 0xffb347, 0xffffff];
  if (m.atk === 'overhead') {
    g.vfx.slashArc(m.x + s * 0.3, m.y + 1.5, m.z + c * 0.3, m.yaw, { radius: 2.3, thick: 1.15, sweep: 2.4, color: 0xffe2a0, hot: 0xffffff, tilt: 1.45, life: 0.26, sweepT: 0.12, tail: 0.9 });
    g.fx.dust(m.x + s * 2.0, m.y, m.z + c * 2.0, 4, 1.4, 0xd9c9a0);
    g.audio.tone(170, 0.2, 'square', 0.1, -110);
    hurtLine(m, P, 2.9, 0.95, dmg + 1, 7, col);
  } else {
    g.vfx.slashArc(m.x + s * 0.2, m.y + 1.1, m.z + c * 0.2, m.yaw, { radius: 2.5, thick: 1.0, sweep: 2.5, color: 0xe6f0ff, hot: 0xffffff, tilt: 0.12, flip: -1, life: 0.22, sweepT: 0.1, tail: 0.9 });
    g.audio.tone(240, 0.16, 'square', 0.09, -140);
    hurtArc(m, P, 3.0, 1.15, dmg, 6, col);
  }
}

/* ------------------------------------------------------------------ */
/* Cursed brain                                                         */
/* ------------------------------------------------------------------ */
function beginCursed(m, atk) {
  const g = m.game;
  m.atk = atk;
  m.lastAtk = atk;
  m.t = 0;
  m.hitDone = false;
  const dur = atk === 'combo' ? cursedDur(m, 'windC') : cursedDur(m, 'windG');
  if (atk === 'combo') {
    m.state = 'windC';
    m.warn('line', 2.5, 3.5, dur);
    g.audio.tone(80, 0.5, 'sawtooth', 0.09, -20);
  } else {
    m.state = 'windG';
    m.warn('circle', 3.0, 0, dur);
    g.audio.tone(60, 0.8, 'triangle', 0.1, 80);
  }
}

function strikeCursed(m, P, step) {
  const g = m.game;
  const s = Math.sin(m.yaw);
  const c = Math.cos(m.yaw);
  const dmg = m.def.dmg;
  const cols = [0x6aff9a, 0xd9cfb4, 0xffffff];
  const tilt = step === 1 ? 0.75 : step === 2 ? -0.75 : 1.4;
  g.vfx.slashArc(m.x + s * 0.3, m.y + 1.4, m.z + c * 0.3, m.yaw, {
    radius: 2.7, thick: 1.4, sweep: 2.8, color: 0x3aff7a, hot: 0xd8ffe0, tilt, flip: step === 2 ? -1 : 1, life: 0.32, sweepT: 0.14, tail: 0.95,
  });
  g.fx.burst(m.x + s * 2.0, m.y + 1.0, m.z + c * 2.0, GHOST, 8, 3, 0.1, 0.5, 2, 1.5);
  g.audio.tone(step === 3 ? 90 : 140, 0.25, 'sawtooth', 0.1, -100);
  ghostBlade(m, 0x4dff8a, 0.3, 0.6);
  if (step === 3) {
    g.shake(0.2);
    hurtLine(m, P, 3.2, 1.2, dmg + 2, 10, cols);
  } else hurtArc(m, P, 3.2, 1.2, dmg + (step === 2 ? 1 : 0), step === 2 ? 8 : 6, cols);
}

function smashCursed(m, P) {
  const g = m.game;
  const s = Math.sin(m.yaw);
  const c = Math.cos(m.yaw);
  const ix = m.x + s * 1.6;
  const iz = m.z + c * 1.6;
  const gy = g.world.heightAt(ix, iz);
  g.fx.shockwave(ix, gy, iz, 0x9fffc0, 3.2);
  g.fx.ring(ix, gy + 0.25, iz, 0x3aff7a, 24, 5.4, 0.12, 0.55);
  g.fx.burst(ix, gy + 0.5, iz, [0x6aff9a, 0xd9cfb4, 0xffffff], 18, 4.4, 0.12, 0.8, 7, 3);
  g.vfx.glow(ix, gy + 0.6, iz, 0x3aff7a, 4.5, 0.4, { grow: 0.8 });
  g.vfx.slashArc(m.x + s * 0.3, m.y + 1.5, m.z + c * 0.3, m.yaw, { radius: 2.6, thick: 1.5, sweep: 2.4, color: 0x3aff7a, hot: 0xd8ffe0, tilt: 1.45, life: 0.34, sweepT: 0.14, tail: 0.95 });
  ghostBlade(m, 0x4dff8a, 0.36, 0.65);
  g.shake(0.35);
  g.punch?.(0.25);
  g.audio.tone(55, 0.5, 'square', 0.16, -20);
  if (!P.dead && P.pos.y < m.y + 2.6 && Math.hypot(P.pos.x - m.x, P.pos.z - m.z) < 3.0) {
    if (P.hurt(m.def.dmg + 3, m.x, m.z, 11)) g.fx.burst(P.pos.x, P.pos.y + 1.1, P.pos.z, [0x6aff9a, 0xd9cfb4, 0xffffff], 12, 3.6, 0.1, 0.5);
  }
}

function cursedThink(m, dt, c) {
  const { g, P, dx, dz, dist, sees, toP } = c;
  const rage = rageOf(m);
  const speed = m.def.speed * (rage > 1 ? 1.2 : 1);
  let mvx = 0;
  let mvz = 0;
  const st = m.state;
  const camp = Math.hypot(m.x - m.home.x, m.z - m.home.z);

  const struck = m._hpSeen !== undefined && m.hp < m._hpSeen;
  m._hpSeen = m.hp;
  if (CURSED_WIND.has(st) && rage <= 1 && struck) {
    m.clearWarn();
    m.state = 'stagger';
    m.t = 0;
    m.cd = 0.45;
    return [0, 0];
  }

  if (rage > 1 && Math.random() < dt * 4) {
    g.fx.emit(m.x + (Math.random() - 0.5) * 0.7, m.y + 0.2 + Math.random() * 1.6, m.z + (Math.random() - 0.5) * 0.7, 0, 1.0 + Math.random(), 0, GHOST[(Math.random() * 3) | 0], 0.1, 0.9, -0.4);
  }

  if (st === 'idle' || st === 'wander') {
    m.state = 'idle';
    if (sees && camp < 46) {
      m.state = 'chase';
      m.cd = Math.min(m.cd, 0.8);
      g.audio.tone(70, 0.5, 'sawtooth', 0.08, -20);
      g.fx.burst(m.x, m.y + 1.6, m.z, GHOST, 6, 1.8, 0.09, 0.6, -0.5, 0.5);
    } else [mvx, mvz] = patrol(m, dt, 0.8);
  } else if (st === 'chase') {
    if ((!sees && dist > m.def.aggro * 1.6) || camp > 50) {
      m.state = 'idle';
      m.target = { x: m.home.x, z: m.home.z };
      m.pauseT = 0;
      return [0, 0];
    }
    turn(m, toP, 4.8 * rage, dt);
    if (dist > 2.2) {
      mvx = (dx / dist) * speed;
      mvz = (dz / dist) * speed;
    }
    if (m.cd <= 0 && !P.dead && dist < 3.6) {
      const smash = Math.random() < (rage > 1 ? 0.38 : 0.28) && m.lastAtk !== 'smash';
      beginCursed(m, smash ? 'smash' : 'combo');
    }
  } else if (CURSED_WIND.has(st)) {
    turn(m, toP, st === 'windG' ? 3.5 : 6, dt);
    if (dist > 2.4) {
      mvx = (dx / dist) * speed * 0.35;
      mvz = (dz / dist) * speed * 0.35;
    }
    if (m.t > cursedDur(m, st)) {
      m.clearWarn();
      m.t = 0;
      m.kick = 1;
      if (st === 'windC') {
        m.state = 'strikeC1';
        strikeCursed(m, P, 1);
      } else {
        m.state = 'strikeG';
        smashCursed(m, P);
      }
    }
  } else if (st === 'strikeC1' || st === 'strikeC2' || st === 'strikeC3' || st === 'strikeG') {
    turn(m, toP, 2.2, dt);
    if (m.t > cursedDur(m, st)) {
      m.t = 0;
      if (st === 'strikeC1') m.state = 'linkC1';
      else if (st === 'strikeC2' && rage > 1) m.state = 'linkC2';
      else m.state = 'recover';
    }
  } else if (st === 'linkC1' || st === 'linkC2') {
    turn(m, toP, 7 * rage, dt);
    mvx = (dx / Math.max(dist, 0.1)) * speed * 0.7;
    mvz = (dz / Math.max(dist, 0.1)) * speed * 0.7;
    if (dist < 1.4) {
      mvx = 0;
      mvz = 0;
    }
    if (m.t > cursedDur(m, st)) {
      m.t = 0;
      m.kick = 1;
      m.state = st === 'linkC1' ? 'strikeC2' : 'strikeC3';
      strikeCursed(m, P, st === 'linkC1' ? 2 : 3);
    }
  } else if (st === 'recover') {
    if (m.t > (m.atk === 'smash' ? 0.9 : 0.75) / rage) {
      m.state = 'chase';
      m.cd = (0.45 + Math.random() * 0.45) / rage;
    }
  } else if (st === 'stagger') {
    mvx = -Math.sin(m.yaw) * 0.5;
    mvz = -Math.cos(m.yaw) * 0.5;
    if (m.t > 0.35) {
      m.state = 'chase';
      m.cd = 0.3;
    }
  } else m.state = 'chase';
  return [mvx, mvz];
}

export function think(m, dt, c) {
  return isCursed(m) ? cursedThink(m, dt, c) : pirateThink(m, dt, c);
}

/* ------------------------------------------------------------------ */
/* Poses                                                                */
/* ------------------------------------------------------------------ */
const ease = (t) => t * t * (3 - 2 * t);
const easeIn = (t) => t * t;
const easeOut = (t) => 1 - (1 - t) * (1 - t);

/**
 * lean/twist/roll: torso. rx/rz/re: sword shoulder and elbow. rb: absolute blade pitch (the wrist is solved from it),
 * rr: blade roll. lx/lz/le: free arm. ll/lr/kl/kr: thighs and knees. crouch: how far the hips sink.
 */
const READY = { lean: 0.05, twist: 0, roll: 0, rx: -0.2, rz: 0.04, re: -0.6, rb: 0.3, rr: 0, lx: 0.05, lz: 0.08, le: -0.25, ll: 0, lr: 0, kl: 0, kr: 0, crouch: 0, hx: 0, hy: 0 };
const KEYS = Object.keys(READY);
const K = (o) => ({ ...READY, ...o });
const mixPose = (a, b, u) => {
  const out = {};
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * u;
  return out;
};

const PIRATE_POSES = {
  O0: K({ lean: -0.24, twist: -0.18, rx: -2.85, rz: 0.1, re: -0.55, rb: -2.55, lx: -0.7, lz: 0.55, le: -0.6, ll: 0.35, lr: -0.12, kl: 0.25, crouch: 0.1, hx: -0.15 }),
  O1: K({ lean: 0.5, twist: 0.2, rx: -0.55, rz: 0.12, re: -0.2, rb: 0.6, lx: 0.5, lz: 0.5, le: -0.3, ll: 0.5, lr: -0.55, kr: 0.5, crouch: 0.22, hx: 0.2 }),
  S0: K({ lean: 0.14, twist: 1.0, rx: -0.85, rz: 1.0, re: -0.6, rb: -0.25, rr: -1.45, lx: -0.7, lz: 0.2, le: -0.7, ll: 0.3, lr: -0.25, kl: 0.2, crouch: 0.12 }),
  S1: K({ lean: 0.25, twist: -1.0, rx: -1.25, rz: 0.55, re: -0.2, rb: -0.1, rr: -1.45, lx: 0.5, lz: 0.9, le: -0.2, ll: -0.3, lr: 0.35, kr: 0.3, crouch: 0.12 }),
  L0: K({ lean: -0.08, twist: 0.45, rx: 0.25, rz: 0.04, re: -1.85, rb: 0.0, lx: -0.9, lz: 0.2, le: -0.9, ll: 0.55, lr: -0.9, kl: 0.5, kr: 1.1, crouch: 0.28, hx: -0.1 }),
  L1: K({ lean: 0.55, twist: -0.35, rx: -1.5, rz: 0.05, re: -0.08, rb: 0.0, lx: 0.55, lz: 0.9, le: -0.3, ll: 0.9, lr: -1.0, kl: 0.4, kr: 0.9, crouch: 0.25, hx: 0.2 }),
};

const CURSED_POSES = {
  W: K({ lean: -0.2, twist: 0.7, rx: -2.7, rz: 0.4, re: -0.6, rb: -2.3, rr: 0.3, lx: -0.6, lz: 0.6, le: -0.5, ll: 0.3, lr: -0.1, crouch: 0.1, hx: -0.2 }),
  A: K({ lean: 0.45, twist: -0.75, rx: -0.75, rz: -0.2, re: -0.3, rb: 0.5, rr: 0.1, lx: 0.5, lz: 0.5, le: -0.3, ll: 0.45, lr: -0.5, kr: 0.4, crouch: 0.22, hx: 0.15 }),
  B: K({ lean: 0.25, twist: -0.8, rx: -1.1, rz: -0.1, re: -0.5, rb: 0.2, rr: 3.1, lx: 0.4, lz: 0.5, le: -0.4, ll: 0.3, lr: -0.4, kr: 0.3, crouch: 0.15 }),
  C: K({ lean: 0.2, twist: 0.85, rx: -1.0, rz: 0.9, re: -0.4, rb: -0.3, rr: 3.1, lx: -0.5, lz: 0.4, le: -0.5, ll: -0.3, lr: 0.4, kl: 0.4, crouch: 0.15 }),
  G0: K({ lean: -0.35, twist: 0, rx: -2.9, rz: 0.1, re: -0.45, rb: -2.7, lx: -2.8, lz: -0.05, le: -0.5, ll: 0.3, lr: -0.2, kl: 0.25, crouch: 0.12, hx: -0.3 }),
  G1: K({ lean: 0.62, twist: 0.1, rx: -0.75, rz: 0.1, re: -0.2, rb: 0.65, lx: -0.9, lz: 0.2, le: -0.6, ll: 0.55, lr: -0.6, kr: 0.6, crouch: 0.28, hx: 0.25 }),
};

function pirateTarget(m, st, u) {
  switch (st) {
    case 'windO': return mixPose(READY, PIRATE_POSES.O0, ease(u));
    case 'strikeO': return mixPose(PIRATE_POSES.O0, PIRATE_POSES.O1, easeIn(clamp(u * 1.5, 0, 1)));
    case 'windS': return mixPose(READY, PIRATE_POSES.S0, ease(u));
    case 'strikeS': return mixPose(PIRATE_POSES.S0, PIRATE_POSES.S1, easeIn(clamp(u * 1.4, 0, 1)));
    case 'windL': return mixPose(READY, PIRATE_POSES.L0, ease(u));
    case 'dash': return mixPose(PIRATE_POSES.L0, PIRATE_POSES.L1, easeOut(clamp(u * 3, 0, 1)));
    case 'recover': {
      const from = m.atk === 'overhead' ? PIRATE_POSES.O1 : m.atk === 'side' ? PIRATE_POSES.S1 : PIRATE_POSES.L1;
      return mixPose(from, READY, ease(clamp((u - 0.15) / 0.85, 0, 1)));
    }
    case 'stagger': return K({ lean: -0.3, twist: -0.3, rx: -0.6, rz: 0.7, re: -0.4, rb: 0.5, lx: 0.2, lz: 1.0, le: -0.2, ll: 0.25, lr: -0.2, kl: 0.3, crouch: 0.1, hx: -0.4 });
    default: return null;
  }
}

function cursedTarget(m, st, u) {
  const P = CURSED_POSES;
  switch (st) {
    case 'windC': return mixPose(READY, P.W, ease(u));
    case 'strikeC1': return mixPose(P.W, P.A, easeIn(clamp(u * 1.5, 0, 1)));
    case 'linkC1': return mixPose(P.A, P.B, ease(u));
    case 'strikeC2': return mixPose(P.B, P.C, easeIn(clamp(u * 1.5, 0, 1)));
    case 'linkC2': return mixPose(P.C, P.W, ease(u));
    case 'strikeC3': return mixPose(P.W, P.A, easeIn(clamp(u * 1.5, 0, 1)));
    case 'windG': return mixPose(READY, P.G0, ease(u));
    case 'strikeG': return mixPose(P.G0, P.G1, easeIn(clamp(u * 1.6, 0, 1)));
    case 'recover': {
      const from = m.atk === 'smash' ? P.G1 : m.lastStrike === 'strikeC3' || m.lastStrike === 'strikeC2' ? P.C : P.A;
      return mixPose(from, READY, ease(clamp((u - 0.15) / 0.85, 0, 1)));
    }
    case 'stagger': return K({ lean: -0.35, twist: 0.3, rx: -0.5, rz: 0.8, re: -0.5, rb: 0.4, lx: 0.3, lz: 1.0, le: -0.3, ll: 0.2, lr: -0.2, crouch: 0.08, hx: -0.5 });
    default: return null;
  }
}

const STRIKE_STATES = new Set(['strikeO', 'strikeS', 'dash', 'strikeC1', 'strikeC2', 'strikeC3', 'strikeG']);

/* ------------------------------------------------------------------ */
/* Animation                                                            */
/* ------------------------------------------------------------------ */
export function animate(m, dt, ctx) {
  const p = m.model.parts;
  const undead = isCursed(m);
  const { spd, t, hk, lookSm } = ctx;
  const st = m.state === 'dead' ? 'idle' : m.state;
  const rage = undead ? rageOf(m) : 1;

  if (m._ast !== st) {
    if (STRIKE_STATES.has(m._ast) || m._ast === 'linkC1') m.lastStrike = m._ast;
    m._ast = st;
    m._at = 0;
  }
  m._at = (m._at || 0) + dt;
  const dur = undead ? cursedDur(m, st) : pirateDur(st);
  const recoverDur = st === 'recover' ? (undead ? (m.atk === 'smash' ? 0.9 : 0.75) / rage : m.atk === 'lunge' ? 0.75 : m.atk === 'side' ? 0.4 : 0.5) : 0;
  const u = clamp(m._at / (st === 'recover' ? recoverDur : st === 'stagger' ? 0.4 : dur || 1), 0, 1);

  const gait = Math.min(1, spd / (undead ? 2.4 : 2.7));
  m.gaitC = (m.gaitC || 0) + dt * ((undead ? 2.4 : 3.1) + spd * (undead ? 1.5 : 1.9));
  const c = m.gaitC;

  let T = (undead ? cursedTarget : pirateTarget)(m, st, u);
  const attacking = !!T;
  if (!T) {
    const sa = Math.sin(c) * (undead ? 0.5 : 0.58) * gait;
    const sb = Math.sin(c + Math.PI) * (undead ? 0.5 : 0.58) * gait;
    T = K({
      lean: 0.04 + gait * (undead ? 0.16 : 0.09) + Math.sin(t * 1.6) * 0.012,
      twist: Math.sin(c) * (undead ? 0.05 : 0.09) * gait,
      roll: Math.sin(c) * 0.035 * gait,
      rx: -0.2 + sb * 0.2 + Math.sin(t * 1.7) * 0.012,
      re: -0.6 - Math.max(0, -sb) * 0.2,
      rb: 0.3 + sb * 0.3,
      lx: 0.05 - sa * 0.55 - (undead ? 0.06 : 0),
      lz: 0.08 + gait * 0.06 + Math.sin(t * 1.3) * 0.015,
      le: -0.25 - Math.max(0, sa) * 0.35,
      ll: sa,
      lr: sb,
      kl: Math.max(0, sa) * 1.25,
      kr: Math.max(0, sb) * 1.25,
    });
    if (undead) {
      T.hx = 0.1 + gait * 0.12;
      T.rz += Math.sin(t * 11) * 0.01 * (1 - gait);
    }
    if (st === 'chase' && spd < 0.9 && !undead) {
      T.crouch = 0.05;
      T.ll = 0.12;
      T.lr = -0.12;
      T.lean = 0.08;
    }
  }

  const sp = m.pose || (m.pose = { ...T });
  const lk = Math.min(1, dt * (STRIKE_STATES.has(st) ? 38 : attacking ? 15 : 11));
  for (const k of KEYS) sp[k] += (T[k] - sp[k]) * lk;

  const dh = 0.82 * (1 - Math.cos(sp.crouch * 2.2));
  p.hip.position.y = HIP_Y * S - dh * 0.55;
  p.body.rotation.set(sp.lean - hk * 0.22, sp.twist, sp.roll);

  const look = st === 'idle' ? (undead ? Math.round(Math.sin(t * 0.55) * 1.4) * 0.55 : Math.sin(t * 0.6) * 0.5) : lookSm * 0.7;
  p.head.rotation.x += ((sp.hx + (undead ? 0 : Math.sin(t * 1.1) * 0.015) - sp.lean * 0.7) - hk * 0.45 - p.head.rotation.x) * Math.min(1, dt * 10);
  p.head.rotation.y += (look - sp.twist * 0.55 - p.head.rotation.y) * Math.min(1, dt * 7);

  const rw = clamp(sp.rb - sp.rx - sp.re, -2.6, 2.6);
  p.armR.rotation.set(sp.rx, 0, sp.rz);
  p.elbowR.rotation.x = sp.re;
  p.handR.rotation.set(rw, 0, sp.rr);
  p.armL.rotation.set(sp.lx + hk * 0.3, 0, -sp.lz - hk * 0.3);
  p.elbowL.rotation.x = sp.le;

  p.legL.rotation.x = sp.ll - sp.crouch;
  p.legR.rotation.x = sp.lr - sp.crouch;
  p.kneeL.rotation.x = sp.kl + sp.crouch * 2;
  p.kneeR.rotation.x = sp.kr + sp.crouch * 2;

  const ck = Math.min(1, dt * 12);
  const swayA = Math.sin(t * 2.1) * 0.02;
  p.clothL.rotation.x += ((p.legL.rotation.x < 0 ? p.legL.rotation.x * 0.7 : p.legL.rotation.x * 0.45) + swayA + gait * 0.04 - p.clothL.rotation.x) * ck;
  p.clothR.rotation.x += ((p.legR.rotation.x < 0 ? p.legR.rotation.x * 0.7 : p.legR.rotation.x * 0.45) + swayA + gait * 0.04 - p.clothR.rotation.x) * ck;
  p.clothL.rotation.z = -Math.sin(c) * 0.03 * gait - 0.02;
  p.clothR.rotation.z = Math.sin(c) * 0.03 * gait + 0.02;

  const accel = clamp((m.accAlong || 0) * 0.02, -0.5, 0.5);
  p.hat.rotation.x += ((undead ? 0.06 : 0.04) - hk * 0.35 - accel * 0.3 + Math.sin(c * 2) * 0.02 * gait - p.hat.rotation.x) * Math.min(1, dt * 9);
  p.hat.rotation.z += (Math.sin(c) * 0.025 * gait - p.hat.rotation.z) * Math.min(1, dt * 9);
  p.knot.rotation.z = -0.12 + Math.sin(t * 3.1) * 0.08 + Math.sin(c * 2 + 1) * 0.22 * gait;
  p.knot.rotation.x = 0.1 + gait * 0.25 + Math.sin(t * 2.3) * 0.05 - accel * 0.4;

  if (undead) {
    const talk = st === 'idle' || st === 'chase' ? Math.max(0, Math.sin(t * 15)) * (Math.sin(t * 0.8) > 0.2 ? 0.14 : 0.02) : 0;
    const open = st.startsWith('wind') ? 0.35 : STRIKE_STATES.has(st) ? 0.55 : st === 'stagger' ? 0.5 : 0.04;
    p.jaw.rotation.x += (open + talk - p.jaw.rotation.x) * Math.min(1, dt * 18);
    if (p.fingersL) p.fingersL.rotation.x = 0.35 + Math.sin(t * 9 + 1) * 0.22 * (0.6 + Math.sin(t * 1.3) * 0.4) + hk * 0.4;
    const rattle = (Math.sin(t * 0.9) > 0.55 ? 1 : 0) * 0.012 + hk * 0.03;
    p.body.rotation.z += Math.sin(t * 46) * rattle;
    p.head.rotation.z = Math.sin(t * 52) * rattle * 2.2;
    p.hip.position.x = Math.sin(t * 61) * rattle * 0.3;
    if (st === 'chase' || STRIKE_STATES.has(st)) {
      const g = m.game;
      if (Math.random() < dt * 6 * rage) {
        const a = Math.random() * TAU;
        g.fx.emit(m.x + Math.cos(a) * 0.5, m.y + 0.3 + Math.random() * 1.5, m.z + Math.sin(a) * 0.5, 0, 0.8, 0, GHOST[(Math.random() * 3) | 0], 0.07, 0.7, -0.3);
      }
    }
    if (STRIKE_STATES.has(st) && st !== 'strikeG' && m._at < 0.18 && Math.random() < dt * 30) ghostBlade(m, 0x3aff7a, 0.22, 0.42);
    if (m.flash <= 0 && rage > 1) m.model.mat.emissive.setRGB(0.04, 0.16 + Math.sin(t * 6) * 0.04, 0.07);
    if (st.startsWith('wind') && m.flash <= 0) m.model.mat.emissive.setRGB(0.03, 0.13 + Math.sin(t * 30) * 0.05, 0.06);
  } else if (st.startsWith('wind') && m.flash <= 0) {
    m.model.mat.emissive.setRGB(0.17 + Math.sin(t * 30) * 0.06, 0.1, 0.0);
  }

  const bob = Math.abs(Math.sin(c)) * (undead ? 0.03 : 0.04) * gait;
  const dash = st === 'dash' ? 0.12 : 0;
  return { rootY: bob, rootX: dash + (undead ? 0 : 0) };
}

/* ------------------------------------------------------------------ */
/* Death                                                                */
/* ------------------------------------------------------------------ */
const PIECES = [
  ['head', null], ['hat', null], ['jaw', null], ['knot', null],
  ['armL', null], ['elbowL', null], ['armR', null], ['elbowR', null],
  ['legL', null], ['kneeL', null], ['legR', null], ['kneeR', null],
  ['clothL', null], ['clothR', null], ['body', null],
];
const REST_H = { head: 0.14, hat: 0.06, jaw: 0.04, knot: 0.03, armL: 0.07, elbowL: 0.07, armR: 0.07, elbowR: 0.07, legL: 0.09, kneeL: 0.09, legR: 0.09, kneeR: 0.09, clothL: 0.05, clothR: 0.05, body: 0.14 };

function shatter(m, c) {
  const o = m.obj;
  const p = m.model.parts;
  const bone = [];
  o.updateMatrixWorld(true);
  for (const [name] of PIECES) {
    const g = p[name];
    if (!g) continue;
    o.attach(g);
    const v = new THREE.Vector3(Math.sin(m.yaw) * -1 + (Math.random() - 0.5) * 2.2, 2.2 + Math.random() * 2.6, Math.cos(m.yaw) * -1 + (Math.random() - 0.5) * 2.2);
    if (name === 'head') v.y += 1.2;
    bone.push({ g, v, w: new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 10), rest: REST_H[name], grounded: false, tgt: new THREE.Euler((Math.random() < 0.5 ? 1 : -1) * Math.PI * 0.5, Math.random() * TAU, (Math.random() - 0.5) * 0.6) });
  }
  m.deadFlags.bone = bone;
  const g = m.game;
  g.fx.burst(m.x, m.y + 1.0, m.z, BONES, 24, 4.4, 0.12, 0.9, 8, 3);
  g.fx.ring(m.x, m.y + 0.3, m.z, 0x3aff7a, 22, 4.4, 0.12, 0.6);
  g.shake(0.3);
}

export function dead(m, dt, c) {
  const o = m.obj;
  const fl = c.fl;
  const g = m.game;
  const p = m.model.parts;

  if (!isCursed(m)) {
    const k = c.ease(clamp(c.u / 0.7, 0, 1));
    const step = clamp(c.u / 0.25, 0, 1);
    o.position.set(m.x, m.y, m.z);
    o.rotation.set(0, m.yaw, 0);
    m.model.root.rotation.x = -1.5 * k * k;
    m.model.root.position.y = 0.1 * k;
    p.body.rotation.set(-0.3 * step, 0, 0);
    p.head.rotation.x = -0.5 * step + 0.4 * k;
    p.armR.rotation.set(-2.4 * (1 - k) - 0.2 * k, 0, 0.8 + k * 0.5);
    p.armL.rotation.set(-1.8 * (1 - k), 0, -(0.9 + k * 0.6));
    p.elbowR.rotation.x = -0.6;
    p.elbowL.rotation.x = -0.5;
    p.legL.rotation.x = 0.4 * step - 0.3 * k;
    p.legR.rotation.x = -0.5 * step + 0.2 * k;
    p.kneeL.rotation.x = 0.6 * k;
    p.kneeR.rotation.x = 0.3 * k;
    p.hat.rotation.x = -0.4 * k;
    if (!fl.land && c.u > 0.62) {
      fl.land = true;
      g.fx.shockwave(m.x, m.y, m.z, 0xd9c9a0, 1.6);
      g.fx.burst(m.x, m.y + 0.5, m.z, [0xd4b050, 0xffd23f, 0xffffff], 10, 3.2, 0.1, 0.8, 8, 2.5);
      g.shake(0.2);
    }
    const k2 = c.dissolve(1.0, 0.65, FX.pirate.death, 3);
    o.scale.setScalar(c.bs * (1 - k2 * k2));
    return;
  }

  o.position.set(m.x, m.y, m.z);
  o.rotation.set(0, m.yaw, 0);
  o.scale.setScalar(c.bs);
  if (!fl.bone) {
    if (c.u < 0.16) {
      const s = c.u / 0.16;
      m.model.root.rotation.x = -0.25 * s;
      p.head.rotation.x = -0.6 * s;
      p.jaw.rotation.x = 0.7 * s;
      p.armR.rotation.x = -1.0 * s;
      p.armL.rotation.z = -0.9 * s;
      if (Math.random() < dt * 40) g.fx.emit(m.x + (Math.random() - 0.5) * 0.5, m.y + 0.5 + Math.random() * 1.4, m.z + (Math.random() - 0.5) * 0.5, 0, 1.4, 0, GHOST[(Math.random() * 3) | 0], 0.09, 0.6, -0.4);
    } else {
      m.model.root.rotation.x = 0;
      shatter(m, c);
    }
    return;
  }
  const floor = m.y;
  const k2 = c.dissolve(1.7, 0.85, FX.cursedpirate.death, 5);
  for (const b of fl.bone) {
    const gr = b.g;
    b.v.y -= 15 * dt;
    gr.position.x += b.v.x * dt;
    gr.position.y += b.v.y * dt;
    gr.position.z += b.v.z * dt;
    const ground = b.rest + (floor - m.y);
    if (gr.position.y < ground) {
      gr.position.y = ground;
      if (b.v.y < -1.2) {
        b.v.y *= -0.32;
        b.v.x *= 0.6;
        b.v.z *= 0.6;
        b.w.multiplyScalar(0.55);
        if (Math.random() < 0.5) g.fx.dust(m.x + gr.position.x, m.y, m.z + gr.position.z, 1, 0.5, 0xd9cfb4);
      } else {
        b.v.set(0, 0, 0);
        b.grounded = true;
      }
    }
    if (b.grounded) {
      gr.rotation.x += (b.tgt.x - gr.rotation.x) * Math.min(1, dt * 7);
      gr.rotation.y += (b.tgt.y - gr.rotation.y) * Math.min(1, dt * 7);
      gr.rotation.z += (b.tgt.z - gr.rotation.z) * Math.min(1, dt * 7);
    } else {
      gr.rotation.x += b.w.x * dt;
      gr.rotation.y += b.w.y * dt;
      gr.rotation.z += b.w.z * dt;
    }
    gr.scale.setScalar(1 - k2 * k2);
  }
  if (k2 > 0 && !fl.wisp) {
    fl.wisp = true;
    g.vfx.glow?.(m.x, m.y + 0.5, m.z, 0x3aff7a, 3.2, 0.7, { grow: 0.6 });
  }
  if (k2 > 0.2 && k2 < 1 && Math.random() < dt * 22) g.fx.emit(m.x + (Math.random() - 0.5) * 1.6, m.y + 0.3, m.z + (Math.random() - 0.5) * 1.6, 0, 2.2 + Math.random() * 2, 0, GHOST[(Math.random() * 3) | 0], 0.14, 1.0, -0.8);
}
