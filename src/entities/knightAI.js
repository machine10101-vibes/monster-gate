import * as THREE from 'three';
import { clamp } from '../engine/voxel.js';

/**
 * The Holy Knight and the Demon Knight: brains and body language.
 *
 * Holy Knight (war hammer)
 *   Hammer Smash   raises the hammer and brings it down in front of him, a crushing ring of light
 *   Smite          marks a patch of ground; a pillar of holy light drops on it a beat later
 * Demon Knight (greatsword and shield)
 *   Hell Cleave    a wide sweep of the greatsword
 *   Shield Rush    lowers the shield and charges
 *   Hellfire Wave  drives the blade into the ground and sends a line of fire along it
 * Below half health each one is gripped by the eternal war and fights faster.
 */
const TAU = Math.PI * 2;
const HOLY_COL = 0x6fb8ff;
const DEMON_COL = 0xff3a1a;
const GOLD = [0xfff0b0, 0xffd27a, 0xffffff, 0x9fd0ff];
const HELL = [0xff3a1a, 0xff8a2a, 0xffd27a, 0x3a0a08];

export const KNIGHT_BUSY = new Set(['wind', 'strike', 'dash', 'recover']);
export const knightHoldsWarn = (state) => state === 'wind' || state === 'dash';

const TIMES = {
  smash: { wind: 0.78, strike: 0.4, recover: 0.75 },
  smite: { wind: 1.0, strike: 0.35, recover: 0.7 },
  cleave: { wind: 0.62, strike: 0.34, recover: 0.6 },
  rush: { wind: 0.55, dash: 0.46, recover: 0.8 },
  hellfire: { wind: 0.9, strike: 0.36, recover: 0.75 },
};
export const knightRage = (m) => (m.enraged || (m.puppet && m.hp < m.maxHp * 0.5) ? 1.3 : 1);
export const knightDur = (m, state) => {
  const d = (TIMES[m.atk] || TIMES.smash)[state] || 0.5;
  return state === 'wind' ? d / knightRage(m) : d;
};

function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
const turn = (m, to, rate, dt) => {
  m.yaw += clamp(angDiff(m.yaw, to), -rate * dt, rate * dt);
};

function begin(m, atk, P) {
  const g = m.game;
  m.atk = atk;
  m.state = 'wind';
  m.t = 0;
  m.hitDone = false;
  m.fireAcc = 0;
  if (atk === 'smash') {
    m.warn('circle', 3.5, 0, knightDur(m, 'wind') + 0.05);
    m.teleCenter = true;
    g.audio.tone(140, 0.6, 'triangle', 0.1, 120);
  } else if (atk === 'smite') {
    m.mark = { x: P.pos.x, z: P.pos.z };
    const gy = g.world.heightAt(m.mark.x, m.mark.z);
    m.teleSlot = g.fx.telegraph(m.mark.x, gy, m.mark.z, 0, 'circle', 2.5, 0, HOLY_COL, knightDur(m, 'wind') + 0.05);
    m.teleSlot.owner = m;
    m.teleKind = 'dive';
    g.audio.tone(520, 0.9, 'sine', 0.09, 300);
  } else if (atk === 'cleave') {
    m.warn('line', 3.6, 4.0, knightDur(m, 'wind'));
    g.audio.tone(90, 0.4, 'sawtooth', 0.1, -30);
  } else if (atk === 'rush') {
    m.warn('line', 2.3, 7.5, knightDur(m, 'wind'));
    g.audio.tone(110, 0.5, 'sawtooth', 0.1, 60);
  } else {
    m.warn('line', 2.3, 11.5, knightDur(m, 'wind'));
    g.audio.tone(70, 0.9, 'sawtooth', 0.1, 140);
  }
}

function pick(m, dist) {
  const r = Math.random();
  const holy = m.type === 'holyknight';
  let a = null;
  if (holy) {
    if (dist < 4.4) a = r < 0.62 ? 'smash' : 'smite';
    else if (dist < 12) a = r < 0.7 ? 'smite' : null;
  } else if (dist < 4.1) a = r < 0.55 ? 'cleave' : r < 0.78 ? 'rush' : 'hellfire';
  else if (dist < 11) a = r < 0.45 ? 'rush' : r < 0.9 ? 'hellfire' : null;
  if (a && a === m.lastAtk && Math.random() < 0.6) a = holy ? (a === 'smash' ? 'smite' : 'smash') : a === 'cleave' ? 'hellfire' : 'cleave';
  return a;
}

const hurtNear = (m, P, x, z, r, dmg, knock, cols) => {
  if (P.dead) return false;
  if (Math.hypot(P.pos.x - x, P.pos.z - z) > r || P.pos.y > m.y + 3.2) return false;
  if (!P.hurt(dmg, m.x, m.z, knock)) return false;
  m.game.fx.burst(P.pos.x, P.pos.y + 1.1, P.pos.z, cols, 10, 3.4, 0.09, 0.4);
  return true;
};

function strikeFx(m, P) {
  const g = m.game;
  const s = Math.sin(m.yaw);
  const c = Math.cos(m.yaw);
  const dmg = m.def.dmg;
  if (m.atk === 'smash') {
    const ix = m.x + s * 2.4;
    const iz = m.z + c * 2.4;
    const gy = g.world.heightAt(ix, iz);
    g.fx.shockwave(ix, gy, iz, 0xfff0d0, 3.6);
    g.fx.ring(ix, gy + 0.25, iz, HOLY_COL, 26, 6.6, 0.12, 0.55);
    g.fx.ring(ix, gy + 0.5, iz, 0xffd27a, 18, 4.4, 0.1, 0.45);
    g.fx.burst(ix, gy + 0.6, iz, GOLD, 24, 5, 0.14, 0.9, 7, 3);
    g.vfx.glow(ix, gy + 0.8, iz, HOLY_COL, 5.5, 0.4, { grow: 0.8 });
    g.shake(0.4);
    g.punch(0.3);
    g.audio.tone(55, 0.5, 'square', 0.18, -20);
    hurtNear(m, P, ix, iz, 3.5, dmg + 2, 11, GOLD);
  } else if (m.atk === 'smite') {
    const { x, z } = m.mark;
    const gy = g.world.heightAt(x, z);
    g.fx.ring(x, gy + 0.2, z, HOLY_COL, 22, 5, 0.12, 0.5);
    g.vfx.glow(x, gy + 1.2, z, 0xffffff, 6, 0.4, { grow: 0.4 });
    for (let i = 0; i < 26; i++) g.fx.emit(x + (Math.random() - 0.5) * 1.8, gy + Math.random() * 0.8, z + (Math.random() - 0.5) * 1.8, 0, 6 + Math.random() * 6, 0, GOLD[i & 3], 0.16, 0.8, -2);
    g.fx.shockwave(x, gy, z, 0xfff0d0, 2.6);
    g.shake(0.3);
    g.audio.tone(900, 0.5, 'sine', 0.12, -600);
    hurtNear(m, P, x, z, 2.5, dmg + 3, 7, GOLD);
  } else if (m.atk === 'cleave') {
    g.vfx.slashArc(m.x + s * 0.4, m.y + 1.6, m.z + c * 0.4, m.yaw, { radius: 3.6, thick: 1.7, sweep: 3.0, color: DEMON_COL, hot: 0xffd0a0, tilt: 0.3, life: 0.34, sweepT: 0.16, tail: 0.9 });
    g.fx.burst(m.x + s * 2.3, m.y + 1.0, m.z + c * 2.3, HELL, 14, 4, 0.1, 0.6, 3, 2);
    g.shake(0.2);
    g.audio.tone(170, 0.2, 'square', 0.12, -120);
    const dx = P.pos.x - m.x;
    const dz = P.pos.z - m.z;
    if (Math.abs(angDiff(m.yaw, Math.atan2(dx, dz))) < 1.25) hurtNear(m, P, m.x, m.z, 3.7, dmg + 1, 9, HELL);
  }
}

function fireLine(m, P, dt) {
  const g = m.game;
  const s = Math.sin(m.yaw);
  const c = Math.cos(m.yaw);
  m.fireAcc += dt;
  const u = clamp(m.t / 0.3, 0, 1);
  const reach = 1.5 + 10.5 * u;
  for (let i = 0; i < 6; i++) {
    const d = 1.4 + Math.random() * (reach - 1.4);
    const x = m.x + s * d + (Math.random() - 0.5) * 1.6;
    const z = m.z + c * d + (Math.random() - 0.5) * 1.6;
    g.fx.emit(x, g.world.heightAt(x, z) + 0.15, z, 0, 2.5 + Math.random() * 3.5, 0, HELL[(Math.random() * 3) | 0], 0.2, 0.55, -1);
  }
  if (!m.hitDone && u > 0.15) {
    const dx = P.pos.x - m.x;
    const dz = P.pos.z - m.z;
    const along = dx * s + dz * c;
    const perp = Math.abs(dx * c - dz * s);
    if (along > 0.5 && along < 1.5 + 10.5 * u && perp < 1.35 && P.pos.y < m.y + 2.4) {
      m.hitDone = true;
      P.hurt(m.def.dmg + 1, m.x, m.z, 7);
      g.fx.burst(P.pos.x, P.pos.y + 1, P.pos.z, HELL, 12, 3.6, 0.1, 0.5);
    }
  }
}

export function knightThink(m, dt, c) {
  const { g, P, dx, dz, dist, sees, toP } = c;
  const holy = m.type === 'holyknight';
  const rage = knightRage(m);
  const spd = m.def.speed * (rage > 1 ? 1.2 : 1);
  let mvx = 0;
  let mvz = 0;
  const st = m.state;
  const camp = Math.hypot(m.x - m.home.x, m.z - m.home.z);

  if (st === 'idle' || st === 'wander') {
    if (sees && camp < 46) {
      m.state = 'chase';
      m.cd = Math.min(m.cd, 0.9);
      g.hud.floatText(...g.screenOf(m.x, m.y + 3.6, m.z), holy ? 'For the Light!' : 'Burn it all!', 'crit');
      g.audio.tone(holy ? 330 : 80, 0.5, holy ? 'sine' : 'sawtooth', 0.1, holy ? 220 : -20);
    } else {
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 2.4 + Math.random() * 3;
        const a = Math.random() * TAU;
        const rr = 2 + Math.random() * 8;
        m.target = { x: m.home.x + Math.cos(a) * rr, z: m.home.z + Math.sin(a) * rr };
      }
      const tx = m.target.x - m.x;
      const tz = m.target.z - m.z;
      const td = Math.hypot(tx, tz);
      if (td > 0.8) {
        mvx = (tx / td) * 0.9;
        mvz = (tz / td) * 0.9;
        turn(m, Math.atan2(tx, tz), 2.6, dt);
      }
    }
  } else if (st === 'chase') {
    if (!sees && dist > m.def.aggro * 1.5) m.state = 'idle';
    else if (camp > 60) {
      m.state = 'idle';
      m.target = { x: m.home.x, z: m.home.z };
    }
    turn(m, toP, 4.4, dt);
    if (dist > 2.3) {
      mvx = (dx / dist) * spd;
      mvz = (dz / dist) * spd;
    }
    if (m.cd <= 0) {
      const a = pick(m, dist);
      if (a) begin(m, a, P);
      else m.cd = 0.4;
    }
  } else if (st === 'wind') {
    const rate = m.atk === 'smite' ? 1.6 : m.atk === 'hellfire' ? 3.4 : 6;
    if (m.atk === 'smite' && m.t < 0.45) {
      m.mark.x += (P.pos.x - m.mark.x) * Math.min(1, dt * 5);
      m.mark.z += (P.pos.z - m.mark.z) * Math.min(1, dt * 5);
      const sl = m.teleSlot;
      if (sl && sl.owner === m && sl.active) sl.mesh.position.set(m.mark.x, g.world.heightAt(m.mark.x, m.mark.z) + 0.1, m.mark.z);
    }
    turn(m, toP, rate, dt);
    if (m.atk === 'smash' || m.atk === 'cleave') {
      if (dist > 2.6) {
        mvx = (dx / dist) * spd * 0.3;
        mvz = (dz / dist) * spd * 0.3;
      }
    }
    if (m.t > knightDur(m, 'wind')) {
      m.clearWarn();
      m.t = 0;
      m.hitDone = false;
      m.fireAcc = 0;
      if (m.atk === 'rush') {
        m.state = 'dash';
        g.audio.tone(70, 0.4, 'square', 0.12, 100);
      } else {
        m.state = 'strike';
        if (m.atk !== 'hellfire') strikeFx(m, P);
        else {
          g.fx.ring(m.x + Math.sin(m.yaw) * 1.2, m.y + 0.3, m.z + Math.cos(m.yaw) * 1.2, DEMON_COL, 14, 3.4, 0.1, 0.4);
          g.shake(0.25);
          g.audio.tone(60, 0.5, 'square', 0.16, -10);
        }
      }
    }
  } else if (st === 'strike') {
    if (m.atk === 'hellfire') fireLine(m, P, dt);
    if (m.t > knightDur(m, 'strike')) {
      m.state = 'recover';
      m.t = 0;
    }
  } else if (st === 'dash') {
    const v = 13.5 * rage;
    mvx = Math.sin(m.yaw) * v;
    mvz = Math.cos(m.yaw) * v;
    if (Math.random() < dt * 40) g.fx.dust(m.x, m.y, m.z, 1, 1.4, 0x6a5a58);
    if (!m.hitDone && dist < m.radius + 1.35) {
      m.hitDone = true;
      if (!P.dead && P.hurt(m.def.dmg + 2, m.x, m.z, 13)) g.fx.burst(P.pos.x, P.pos.y + 1, P.pos.z, HELL, 12, 3.6, 0.1, 0.5);
      g.shake(0.3);
      g.fx.ring(m.x + Math.sin(m.yaw) * 1.3, m.y + 0.5, m.z + Math.cos(m.yaw) * 1.3, DEMON_COL, 14, 3.4, 0.1, 0.4);
    }
    if (m.t > knightDur(m, 'dash') || m.hitDone) {
      m.state = 'recover';
      m.t = 0;
    }
  } else if (st === 'recover') {
    if (m.t > knightDur(m, 'recover') / (rage > 1 ? 1.25 : 1)) {
      m.state = 'chase';
      m.cd = (holy ? 1.1 : 0.9) + Math.random() * 0.8 - (rage > 1 ? 0.3 : 0);
    }
  }
  return [mvx, mvz];
}

/* ---------------------------------------------------------------- */
/* Poses                                                             */
/* ---------------------------------------------------------------- */
const lerpA = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
const ease = (t) => t * t * (3 - 2 * t);
const HOLY_POSES = {
  guard: { pos: [0.3, 0.4, 0.62], dir: [-0.8, 0.52, 0.3] },
  raise: { pos: [0.05, 0.95, 0.05], dir: [-0.12, 1, -0.3] },
  slam: { pos: [0.0, 0.5, 0.35], dir: [0.04, -0.5, 1] },
  pillar: { pos: [0.0, 1.05, 0.2], dir: [0, 1, 0.05] },
};
const DEMON_POSES = {
  guard: { pos: [-0.66, 0.2, 0.74], dir: [-0.12, 1, 0.12] },
  back: { pos: [-0.85, 0.75, -0.1], dir: [-0.85, 0.6, -0.6] },
  swept: { pos: [0.35, 0.4, 0.95], dir: [0.95, 0.15, 0.55] },
  raise: { pos: [-0.35, 0.9, 0.2], dir: [-0.1, 1, -0.2] },
  plunge: { pos: [-0.1, 0.35, 0.9], dir: [0, -0.35, 1] },
  hip: { pos: [-0.8, 0.45, 0.3], dir: [-0.5, 0.5, -0.8] },
};
const mix = (P, a, b, u) => {
  const e = ease(clamp(u, 0, 1));
  return { pos: lerpA(P[a].pos, P[b].pos, e), dir: lerpA(P[a].dir, P[b].dir, e), face: [0, 0, 1] };
};

const _v = new THREE.Vector3();
void _v;

export function animateKnight(m, dt, ctx) {
  const { spd, t, hk, spawnS } = ctx;
  const p = m.model.parts;
  const holy = m.type === 'holyknight';
  const gait = Math.min(1, spd / 2.6);
  m.gaitC = (m.gaitC || 0) + dt * (2.8 + spd * 1.7);
  const c = m.gaitC;
  const lk = Math.min(1, dt * 12);
  const stepL = Math.sin(c) * 0.55 * gait;
  const stepR = Math.sin(c + Math.PI) * 0.55 * gait;
  p.legL.rotation.x += (stepL - p.legL.rotation.x) * lk;
  p.legR.rotation.x += (stepR - p.legR.rotation.x) * lk;
  p.kneeL.rotation.x += (Math.max(0, stepL) * 1.15 - p.kneeL.rotation.x) * lk;
  p.kneeR.rotation.x += (Math.max(0, stepR) * 1.15 - p.kneeR.rotation.x) * lk;

  const st = m.state === 'dead' ? 'idle' : m.state;
  const atk = m.atk || 'smash';
  const dur = (s) => (st === s ? knightDur(m, s) : 1);
  const u = clamp(m.t / (st === 'wind' ? dur('wind') : st === 'strike' ? dur('strike') : st === 'dash' ? dur('dash') : st === 'recover' ? dur('recover') : 1), 0, 1);
  let lean = 0.04 + gait * 0.05;
  let twist = 0;
  let pose;
  let shieldZ = 0;
  let shieldRot = 0.22;
  const sway = Math.sin(t * 1.7) * 0.012;
  if (holy) {
    if (st === 'wind') {
      pose = mix(HOLY_POSES, 'guard', atk === 'smite' ? 'pillar' : 'raise', u);
      lean = -0.12 * u;
    } else if (st === 'strike') {
      const from = atk === 'smite' ? 'pillar' : 'raise';
      pose = mix(HOLY_POSES, from, 'slam', Math.min(1, u * 4));
      lean = -0.12 + 0.55 * Math.min(1, u * 4);
    } else if (st === 'recover') {
      pose = mix(HOLY_POSES, 'slam', 'guard', u);
      lean = 0.38 * (1 - u);
    } else {
      pose = { pos: HOLY_POSES.guard.pos.map((v, i) => v + (i === 1 ? Math.sin(t * 1.6) * 0.012 : 0)), dir: HOLY_POSES.guard.dir, face: [0, 0, 1] };
    }
    p.body.userData.pose = pose;
    m.model.holdHammer(pose);
  } else {
    if (st === 'wind') {
      if (atk === 'cleave') {
        pose = mix(DEMON_POSES, 'guard', 'back', u);
        twist = 0.6 * u;
      } else if (atk === 'rush') {
        pose = mix(DEMON_POSES, 'guard', 'hip', u);
        shieldZ = 0.18 * u;
        lean = 0.25 * u;
      } else {
        pose = mix(DEMON_POSES, 'guard', 'raise', u);
        lean = -0.1 * u;
      }
    } else if (st === 'strike') {
      if (atk === 'cleave') {
        pose = mix(DEMON_POSES, 'back', 'swept', Math.min(1, u * 3.5));
        twist = 0.6 - 1.3 * Math.min(1, u * 3.5);
      } else {
        pose = mix(DEMON_POSES, 'raise', 'plunge', Math.min(1, u * 4));
        lean = -0.1 + 0.5 * Math.min(1, u * 4);
      }
    } else if (st === 'dash') {
      pose = mix(DEMON_POSES, 'guard', 'hip', 1);
      shieldZ = 0.32;
      lean = 0.32;
    } else if (st === 'recover') {
      const from = atk === 'cleave' ? 'swept' : atk === 'rush' ? 'hip' : 'plunge';
      pose = mix(DEMON_POSES, from, 'guard', u);
      twist = atk === 'cleave' ? -0.7 * (1 - u) : 0;
      lean = 0.2 * (1 - u);
    } else {
      pose = { pos: DEMON_POSES.guard.pos.map((v, i) => v + (i === 1 ? Math.sin(t * 1.4) * 0.01 : 0)), dir: DEMON_POSES.guard.dir, face: [0, 0, 1] };
    }
    const sw = m.model.parts.weapon;
    void sw;
    m.model.holdGear(pose);
    p.shield.position.z += (0.5 + shieldZ - p.shield.position.z) * lk;
    p.shield.rotation.y += (shieldRot - p.shield.rotation.y) * lk;
  }
  p.body.rotation.x += (lean + sway - p.body.rotation.x) * Math.min(1, dt * 9);
  p.body.rotation.y += (twist - p.body.rotation.y) * Math.min(1, dt * 14);
  p.body.rotation.z = Math.sin(c) * 0.03 * gait;
  p.head.rotation.y += (ctx.lookSm * 0.6 - p.head.rotation.y - p.body.rotation.y * 0.5) * Math.min(1, dt * 8);
  p.head.rotation.x += ((st === 'chase' ? 0.04 : -0.06) - p.head.rotation.x) * lk;
  p.cloth.rotation.x = Math.sin(c * 2) * 0.05 * gait + Math.sin(t * 2) * 0.02;
  if (p.cape) p.cape.rotation.x = 0.06 + gait * 0.2 + Math.sin(t * 1.6) * 0.04 + Math.sin(c * 2) * 0.05 * gait;
  void hk;
  void spawnS;

  if (!holy && Math.random() < dt * 9) {
    const g = m.game;
    const a = m.yaw + (Math.random() < 0.5 ? 1.6 : -1.6);
    g.fx.emit(m.x + Math.sin(a) * 0.75, m.y + 2.4 + Math.random() * 0.6, m.z + Math.cos(a) * 0.75, 0, 0.9 + Math.random() * 0.7, 0, [0x3a3a42, 0x55555e, 0x2a2a30][(Math.random() * 3) | 0], 0.2, 1.6, -0.3);
  }
  if (holy && Math.random() < dt * 5) {
    const g = m.game;
    const a = Math.random() * TAU;
    g.fx.emit(m.x + Math.cos(a) * 0.9, m.y + 0.6 + Math.random() * 2.2, m.z + Math.sin(a) * 0.9, 0, 0.6, 0, [0xfff0b0, 0x9fd0ff][(Math.random() * 2) | 0], 0.09, 1.1, -0.2);
  }
  return { rootY: Math.abs(Math.sin(c)) * 0.04 * gait, rootX: 0 };
}
