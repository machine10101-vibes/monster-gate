import { clamp } from '../engine/voxel.js';
import { iceBurst } from '../systems/skillfx.js';

/**
 * Ravenous Snow Yeti: brain and body language.
 *
 * Attacks, in the order a hunter meets them:
 *   Claw Rake     a two-hit slashing combo (three hits, ending in a double-fist smash, when frenzied)
 *   Frost Breath  a cone of icy shards that chills and slows
 *   Glacier Leap  a crouch, a huge jump on top of the hunter, and ice spikes erupting around the landing
 *   Boulder Hurl  rips a boulder of ice from the ground and lobs it (three at once when frenzied)
 * Below half health the yeti roars, speeds up and drops its guard between attacks.
 */
const TAU = Math.PI * 2;
const COL = 0x7fd0ff;
const ICE = [0xbfeaff, 0x7fd0ff, 0xffffff, 0xe6f9ff];

export const YETI_WIND = new Set(['rakewind', 'breathwind', 'slamwind', 'hurlwind']);
export const YETI_BUSY = new Set([...YETI_WIND, 'rake1', 'rake2', 'rake3', 'breath', 'leap', 'land', 'hurl', 'roar', 'recover']);
const HOLD_WARN = new Set([...YETI_WIND, 'leap']);
export const yetiHoldsWarn = (state) => HOLD_WARN.has(state);

const BASE = { rakewind: 0.62, rake1: 0.3, rake2: 0.36, rake3: 0.8, breathwind: 0.85, breath: 1.3, slamwind: 0.72, land: 0.55, hurlwind: 0.95, hurl: 0.5, roar: 1.0, recover: 0.6 };

export function yetiRage(m) {
  return m.enraged || (m.puppet && m.hp < m.maxHp * 0.5) ? 1.28 : 1;
}
/** Windups tighten when the yeti is frenzied; the strikes themselves keep their pace. */
export function yetiDur(m, state) {
  const d = BASE[state] || 0.5;
  return YETI_WIND.has(state) ? d / yetiRage(m) : d;
}

function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
const turn = (m, to, rate, dt) => {
  m.yaw += clamp(angDiff(m.yaw, to), -rate * dt, rate * dt);
};
const lunge = (m, v) => {
  m.vx += Math.sin(m.yaw) * v;
  m.vz += Math.cos(m.yaw) * v;
};

function clawHit(m, P, dmg, reach, arc, knock, fromX = m.x, fromZ = m.z) {
  if (P.dead) return false;
  const dx = P.pos.x - fromX;
  const dz = P.pos.z - fromZ;
  const d = Math.hypot(dx, dz);
  if (d > reach || P.pos.y > m.y + 3.2) return false;
  if (arc < Math.PI && Math.abs(angDiff(m.yaw, Math.atan2(dx, dz))) > arc) return false;
  const g = m.game;
  if (!P.hurt(dmg, m.x, m.z, knock)) return false;
  g.fx.burst(P.pos.x, P.pos.y + 1.1, P.pos.z, [0xe6f9ff, 0x9fdcff, 0xffffff], 10, 3.4, 0.09, 0.4);
  P.chill?.(1.4);
  return true;
}

function slash(m, tilt, o = {}) {
  const g = m.game;
  g.vfx.slashArc(m.x + Math.sin(m.yaw) * 0.5, m.y + 2.1, m.z + Math.cos(m.yaw) * 0.5, m.yaw, {
    radius: 3.1,
    thick: 1.5,
    sweep: 2.5,
    color: 0x8fd4ff,
    hot: 0xffffff,
    tilt,
    life: 0.3,
    sweepT: 0.15,
    forward: 0,
    ...o,
  });
}

function begin(m, atk, P, dist) {
  const g = m.game;
  m.atk = atk;
  m.lastAtk = atk;
  m.t = 0;
  m.hitDone = false;
  m.fireAcc = 0;
  if (atk === 'rake') {
    m.state = 'rakewind';
    m.warn('line', 3.4, 4.3, yetiDur(m, 'rakewind'));
    g.audio.tone(80, 0.3, 'sawtooth', 0.09, -30);
  } else if (atk === 'breath') {
    m.state = 'breathwind';
    m.warn('line', 5.4, 9.5, yetiDur(m, 'breathwind'));
    g.audio.tone(200, 0.7, 'sine', 0.09, 160);
  } else if (atk === 'slam') {
    m.state = 'slamwind';
    const d = Math.min(14, dist);
    const a = Math.atan2(P.pos.x - m.x, P.pos.z - m.z);
    const tx = m.x + Math.sin(a) * d;
    const tz = m.z + Math.cos(a) * d;
    m.dive = { x: tx, z: tz };
    const gy = g.world.heightAt(tx, tz);
    m.teleSlot = g.fx.telegraph(tx, gy, tz, 0, 'circle', 4.0, 0, COL, yetiDur(m, 'slamwind') + 0.55);
    m.teleSlot.owner = m;
    m.teleKind = 'dive';
    g.audio.tone(110, 0.6, 'sawtooth', 0.09, -50);
  } else {
    m.state = 'hurlwind';
    g.audio.tone(140, 0.9, 'triangle', 0.1, 120);
  }
}

function pickAttack(m, dist, rage) {
  const r = Math.random();
  const last = m.lastAtk;
  let pick = null;
  if (dist < 4.2) pick = r < 0.55 ? 'rake' : r < 0.78 ? 'slam' : 'breath';
  else if (dist < 8) pick = r < 0.34 ? 'slam' : r < 0.68 ? 'breath' : 'hurl';
  else if (dist < 17) pick = r < 0.55 ? 'hurl' : r < 0.8 && dist < 10.5 ? 'breath' : null;
  if (pick && pick === last && pick !== 'rake' && Math.random() < 0.7) pick = dist < 6 ? 'rake' : 'hurl';
  if (pick === 'rake' && dist > 4.4) pick = 'slam';
  return pick;
}

function launchBoulders(m, P) {
  const g = m.game;
  const n = yetiRage(m) > 1 ? 3 : 1;
  const a = Math.atan2(P.pos.x - m.x, P.pos.z - m.z);
  const dist = Math.hypot(P.pos.x - m.x, P.pos.z - m.z);
  const T = clamp(dist / 11, 0.85, 1.35);
  const my = m.y + 4.0;
  const mx = m.x + Math.sin(a) * 0.9;
  const mz = m.z + Math.cos(a) * 0.9;
  const lead = 0.45;
  const pvx = P.vel?.x || 0;
  const pvz = P.vel?.z || 0;
  for (let i = 0; i < n; i++) {
    const off = i === 0 ? 0 : (i === 1 ? -1 : 1) * 3.6;
    const tx = P.pos.x + pvx * lead + Math.cos(a) * off;
    const tz = P.pos.z + pvz * lead - Math.sin(a) * off;
    const gy = g.world.heightAt(tx, tz);
    const G = 16;
    const vy = (gy + 0.1 - my + 0.5 * G * T * T) / T;
    g.spawnProjectile({ owner: 'enemy', kind: 'iceboulder', x: mx, y: my, z: mz, vx: (tx - mx) / T, vz: (tz - mz) / T, vy, gravity: G, dmg: m.def.dmg, life: T + 1, r: 0.8 });
    const slot = g.fx.telegraph(tx, gy, tz, 0, 'circle', 2.5, 0, COL, T);
    m.strikes.push({ kind: 'boulder', x: tx, z: tz, gy, t: 0, dur: T, slot, r: 2.5 });
  }
  g.fx.burst(mx, my, mz, [0xe6f9ff, 0x7fd0ff, 0xffffff], 14, 3.4, 0.1, 0.5);
  g.audio.tone(90, 0.3, 'square', 0.13, -40);
  m.kick = 1;
}

function groundSpikes(m, cx, cz, rings) {
  const g = m.game;
  const a0 = Math.random() * TAU;
  let k = 0;
  for (const [n, rad] of rings) {
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * TAU + k * 0.4;
      const sx = cx + Math.cos(a) * rad;
      const sz = cz + Math.sin(a) * rad;
      if (!g.world.playable(sx, sz)) continue;
      const gy = g.world.heightAt(sx, sz);
      const dur = 0.7 + k * 0.1 + i * 0.03;
      const slot = g.fx.telegraph(sx, gy, sz, 0, 'circle', 1.5, 0, COL, dur);
      m.strikes.push({ kind: 'spike', x: sx, z: sz, gy, t: 0, dur, slot, r: 1.5 });
    }
    k++;
  }
}

export function tickYetiStrikes(m, dt, P) {
  if (!m.strikes.length) return;
  const g = m.game;
  for (let i = m.strikes.length - 1; i >= 0; i--) {
    const s = m.strikes[i];
    s.t += dt;
    if (s.kind === 'boulder') {
      if (Math.random() < dt * 14) g.fx.emit(s.x + (Math.random() - 0.5) * s.r, s.gy + 0.2, s.z + (Math.random() - 0.5) * s.r, 0, 1.2, 0, ICE[Math.floor(Math.random() * 4)], 0.1, 0.5, -0.5);
    } else if (Math.random() < dt * 24) {
      g.fx.emit(s.x + (Math.random() - 0.5) * 1.4, s.gy + 0.1, s.z + (Math.random() - 0.5) * 1.4, 0, 1.6 + Math.random(), 0, ICE[Math.floor(Math.random() * 4)], 0.08, 0.4, 0);
    }
    if (s.t < s.dur) continue;
    m.strikes.splice(i, 1);
    if (s.kind === 'boulder') {
      iceBurst(g, s.x, s.gy + 0.7, s.z, 2.4);
      g.fx.shockwave(s.x, s.gy, s.z, 0xcdeeff, 2.4);
      g.fx.ring(s.x, s.gy + 0.2, s.z, 0x7fd0ff, 18, 5, 0.1, 0.5);
      g.fx.burst(s.x, s.gy + 0.5, s.z, ICE, 16, 4.4, 0.12, 0.7);
      g.shake(0.18);
      g.audio.tone(110, 0.25, 'square', 0.1, -50);
    } else {
      g.fx.shockwave(s.x, s.gy, s.z, 0xcdeeff, 1.6);
      g.fx.burst(s.x, s.gy + 0.4, s.z, ICE, 14, 3.2, 0.12, 0.7, 5, 6.5);
      for (let k = 0; k < 7; k++) {
        const a = Math.random() * TAU;
        const r = Math.random() * 0.8;
        g.fx.emit(s.x + Math.cos(a) * r, s.gy + 0.3, s.z + Math.sin(a) * r, Math.cos(a) * 0.6, 5 + Math.random() * 4, Math.sin(a) * 0.6, ICE[k % 4], 0.2, 0.5, 14);
      }
      g.vfx.glow(s.x, s.gy + 0.9, s.z, COL, 3, 0.3, { grow: 0.7, gain: 0.8 });
      g.shake(0.1);
      g.audio.tone(320, 0.14, 'triangle', 0.08, -160);
    }
    if (!P.dead && Math.hypot(P.pos.x - s.x, P.pos.z - s.z) < s.r + 0.2 && P.pos.y < s.gy + 1.6) {
      const dmg = s.kind === 'boulder' ? m.def.dmg + 1 : m.def.dmg;
      if (P.hurt(dmg, s.x, s.z, s.kind === 'boulder' ? 8 : 6)) {
        g.fx.burst(P.pos.x, P.pos.y + 1, P.pos.z, ICE, 8, 3, 0.09, 0.35);
        P.chill?.(s.kind === 'boulder' ? 2.4 : 1.8);
      }
    }
  }
}

function mouth(m) {
  return [m.x + Math.sin(m.yaw) * 1.5, m.y + 3.1, m.z + Math.cos(m.yaw) * 1.5];
}

function breathe(m, dt, P) {
  const g = m.game;
  m.fireAcc = (m.fireAcc || 0) + dt;
  const [mx, my, mz] = mouth(m);
  const dist = Math.hypot(P.pos.x - m.x, P.pos.z - m.z);
  const n = yetiRage(m) > 1 ? 3 : 2;
  while (m.fireAcc >= 0.085) {
    m.fireAcc -= 0.085;
    for (let i = 0; i < n; i++) {
      const sp = (Math.random() - 0.5) * 0.62;
      const sped = 11 + Math.random() * 3;
      const vy = clamp((P.pos.y + 1.0 - my) / Math.max(0.5, dist / sped), -7, 1.5) + (Math.random() - 0.5) * 1.5;
      g.spawnProjectile({ owner: 'enemy', kind: 'icebreath', x: mx, y: my, z: mz, vx: Math.sin(m.yaw + sp) * sped, vz: Math.cos(m.yaw + sp) * sped, vy, dmg: Math.max(2, m.def.dmg - 1), life: 0.62, r: 0.8 });
    }
  }
  for (let i = 0; i < 6; i++) {
    const sp = (Math.random() - 0.5) * 0.7;
    const sped = 5 + Math.random() * 7;
    g.fx.emit(mx, my, mz, Math.sin(m.yaw + sp) * sped, -1.5 + Math.random() * 1.4, Math.cos(m.yaw + sp) * sped, ICE[Math.floor(Math.random() * 4)], 0.12 + Math.random() * 0.1, 0.5, 0.5);
  }
  g.vfx.glowNow(mx, my, mz, 0xaee4ff, 1.2 + Math.random() * 0.4, 0.8);
}

/** Runs the brain for one frame; returns the walking velocity wanted. */
export function yetiThink(m, dt, c) {
  const { g, P, dx, dz, dist, sees, toP } = c;
  const rage = yetiRage(m);
  const spd = m.def.speed * rage;
  let mvx = 0;
  let mvz = 0;
  const homeD = Math.hypot(m.x - m.home.x, m.z - m.home.z);
  const leashed = homeD > 38;
  tickYetiStrikes(m, dt, P);
  const st = m.state;
  const done = (to = 'recover') => {
    m.state = to;
    m.t = 0;
  };

  if (st === 'idle' || st === 'wander') {
    if (sees && !leashed) {
      m.state = 'roar';
      m.t = 0;
      m.roarBlast = false;
      m.cd = 0.5;
    } else {
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 2.5 + Math.random() * 3;
        const a = Math.random() * TAU;
        const rr = Math.random() * 9;
        m.target = { x: m.home.x + Math.cos(a) * rr, z: m.home.z + Math.sin(a) * rr };
      }
      const tx = m.target.x - m.x;
      const tz = m.target.z - m.z;
      const td = Math.hypot(tx, tz);
      if (td > 0.8) {
        mvx = (tx / td) * (leashed ? 2.2 : 1.1);
        mvz = (tz / td) * (leashed ? 2.2 : 1.1);
        turn(m, Math.atan2(tx, tz), 2.2, dt);
      }
    }
  } else if (st === 'chase') {
    if ((!sees && dist > m.def.aggro * 1.5) || leashed) {
      m.state = 'idle';
      m.target = { x: m.home.x, z: m.home.z };
      m.wanderT = 4;
    }
    turn(m, toP, 5 * rage, dt);
    if (dist > 2.6) {
      mvx = (dx / dist) * spd;
      mvz = (dz / dist) * spd;
    }
    if (m.cd <= 0 && sees) {
      const atk = pickAttack(m, dist, rage);
      if (atk) begin(m, atk, P, dist);
      else m.cd = 0.35;
    }
  } else if (st === 'rakewind') {
    turn(m, toP, 6.5 * rage, dt);
    if (m.t > yetiDur(m, st)) {
      m.clearWarn();
      m.state = 'rake1';
      m.t = 0;
      m.hitDone = false;
      lunge(m, 11);
      m.kick = 1;
      g.audio.tone(70, 0.18, 'square', 0.12, -20);
    }
  } else if (st === 'rake1') {
    if (!m.hitDone && m.t > 0.07) {
      m.hitDone = true;
      slash(m, -0.75);
      clawHit(m, P, m.def.dmg, m.radius + 2.5, 1.05, 7);
      g.shake(0.12);
    }
    if (m.t > yetiDur(m, st)) {
      m.state = 'rake2';
      m.t = 0;
      m.hitDone = false;
      turn(m, toP, 2, 1);
      lunge(m, 9);
    }
  } else if (st === 'rake2') {
    turn(m, toP, 4, dt);
    if (!m.hitDone && m.t > 0.15) {
      m.hitDone = true;
      slash(m, 0.75, { sweep: -2.5 });
      clawHit(m, P, m.def.dmg, m.radius + 2.5, 1.05, 8);
      g.shake(0.14);
      g.audio.tone(70, 0.16, 'square', 0.12, -20);
    }
    if (m.t > yetiDur(m, st)) {
      if (rage > 1 && dist < 6.5) {
        m.state = 'rake3';
        m.t = 0;
        m.hitDone = false;
        turn(m, toP, 2, 1);
        m.warn('circle', 2.7, 0, 0.5);
        m.teleKind = 'dive';
        g.audio.tone(60, 0.4, 'sawtooth', 0.1, -20);
      } else done();
    }
  } else if (st === 'rake3') {
    if (m.t < 0.4) turn(m, toP, 3, dt);
    if (m.teleSlot && m.teleKind === 'dive') {
      const tx = m.x + Math.sin(m.yaw) * 2.6;
      const tz = m.z + Math.cos(m.yaw) * 2.6;
      m.teleSlot.mesh.position.set(tx, g.world.heightAt(tx, tz) + 0.1, tz);
    }
    if (!m.hitDone && m.t > 0.42) {
      m.hitDone = true;
      m.clearWarn();
      lunge(m, 8);
      const tx = m.x + Math.sin(m.yaw) * 2.6;
      const tz = m.z + Math.cos(m.yaw) * 2.6;
      const gy = g.world.heightAt(tx, tz);
      slash(m, Math.PI / 2, { radius: 3.4, thick: 1.8, sweep: 2.8 });
      g.fx.shockwave(tx, gy, tz, 0xcdeeff, 3.2);
      g.fx.ring(tx, gy + 0.2, tz, COL, 20, 5.5, 0.11, 0.5);
      g.fx.burst(tx, gy + 0.5, tz, ICE, 18, 4.6, 0.13, 0.8, 8, 4);
      g.vfx.glow(tx, gy + 0.8, tz, COL, 4, 0.3, { grow: 0.7 });
      g.shake(0.4);
      g.punch(0.2);
      g.audio.tone(55, 0.35, 'square', 0.16, -25);
      clawHit(m, P, m.def.dmg + 2, 2.8, Math.PI, 10, tx, tz);
    }
    if (m.t > yetiDur(m, st)) done();
  } else if (st === 'breathwind') {
    turn(m, toP, 4.5, dt);
    if (m.t > yetiDur(m, st)) {
      m.clearWarn();
      m.state = 'breath';
      m.t = 0;
      m.fireAcc = 0.085;
      g.audio.tone(160, 1.2, 'sawtooth', 0.08, 90);
    }
  } else if (st === 'breath') {
    turn(m, toP, 1.15 * rage, dt);
    breathe(m, dt, P);
    if (dist > 4) {
      mvx = (dx / dist) * spd * 0.28;
      mvz = (dz / dist) * spd * 0.28;
    }
    if (m.t > yetiDur(m, st)) done();
  } else if (st === 'slamwind') {
    turn(m, Math.atan2(m.dive.x - m.x, m.dive.z - m.z), 6, dt);
    if (m.t > yetiDur(m, st)) {
      const d = Math.hypot(m.dive.x - m.x, m.dive.z - m.z);
      m.state = 'leap';
      m.t = 0;
      m.leapT = clamp(d / 11, 0.55, 0.9);
      m.leapFrom = { x: m.x, z: m.z };
      m.vy = 11 * m.leapT;
      m.air = true;
      g.fx.dust(m.x, m.y, m.z, 8, 1.8, 0xe8f2fa);
      g.fx.ring(m.x, m.y + 0.2, m.z, COL, 14, 4, 0.1, 0.4);
      g.audio.tone(130, 0.5, 'sawtooth', 0.12, 200);
      g.shake(0.12);
    }
  } else if (st === 'leap') {
    const u = clamp(m.t / m.leapT, 0, 1);
    const tx = m.leapFrom.x + (m.dive.x - m.leapFrom.x) * u;
    const tz = m.leapFrom.z + (m.dive.z - m.leapFrom.z) * u;
    m.moveBy(tx - m.x, tz - m.z);
    turn(m, Math.atan2(m.dive.x - m.x, m.dive.z - m.z), 8, dt);
    if (Math.random() < dt * 40) g.fx.emit(m.x + (Math.random() - 0.5), m.y + 0.6, m.z + (Math.random() - 0.5), 0, -0.4, 0, ICE[Math.floor(Math.random() * 4)], 0.12, 0.5, 0);
    if ((m.t > 0.2 && !m.air) || m.t > m.leapT + 0.2) {
      m.clearWarn();
      m.air = false;
      m.vy = 0;
      m.y = Math.max(g.world.heightAt(m.x, m.z), m.y - 0);
      m.state = 'land';
      m.t = 0;
      g.fx.shockwave(m.x, m.y, m.z, 0xcdeeff, 4.2);
      g.fx.ring(m.x, m.y + 0.25, m.z, COL, 28, 7, 0.12, 0.6);
      g.fx.burst(m.x, m.y + 0.5, m.z, ICE, 22, 5.5, 0.14, 0.9, 8, 4);
      g.vfx.glow(m.x, m.y + 0.8, m.z, COL, 5.5, 0.35, { grow: 0.8 });
      g.shake(0.55);
      g.punch(0.35);
      g.audio.tone(50, 0.5, 'square', 0.18, -20);
      clawHit(m, P, m.def.dmg + 2, 4.0, Math.PI, 11);
      groundSpikes(m, m.x, m.z, rage > 1 ? [[6, 4.8], [9, 7.6]] : [[6, 5.2]]);
    }
  } else if (st === 'land') {
    if (m.t > yetiDur(m, st)) {
      if (rage > 1 && dist < 5.5) {
        m.cd = 0;
        done('chase');
      } else done();
    }
  } else if (st === 'hurlwind') {
    turn(m, toP, 5, dt);
    const w = clamp(m.t / yetiDur(m, st), 0, 1);
    const hx = m.x + Math.sin(m.yaw) * 0.5;
    const hz = m.z + Math.cos(m.yaw) * 0.5;
    g.vfx.glowNow(hx, m.y + 4.5, hz, 0xaee4ff, 0.6 + w * 1.9, 0.9);
    if (Math.random() < dt * 50 * (0.3 + w)) {
      const a = Math.random() * TAU;
      g.fx.emit(hx + Math.cos(a) * 1.6, m.y + 4.5 + Math.sin(a) * 1.2, hz + Math.sin(a) * 0.6, -Math.cos(a) * 2.6, -Math.sin(a) * 2.2, 0, ICE[Math.floor(Math.random() * 4)], 0.1, 0.5, 0);
    }
    if (m.t > yetiDur(m, st)) {
      m.state = 'hurl';
      m.t = 0;
      launchBoulders(m, P);
    }
  } else if (st === 'hurl') {
    turn(m, toP, 4, dt);
    if (m.t > yetiDur(m, st)) done();
  } else if (st === 'roar') {
    const dur = yetiDur(m, st);
    turn(m, toP, 3, dt);
    if (!m.roarBlast && m.t > 0.25) {
      m.roarBlast = true;
      g.fx.ring(m.x, m.y + 1.4, m.z, COL, 24, 6, 0.12, 0.6);
      g.fx.shockwave(m.x, m.y, m.z, 0xcdeeff, 3.6);
      g.vfx.glow(m.x, m.y + 3.2, m.z, 0xbfeaff, 4, 0.4, { grow: 0.8 });
      g.shake(0.4);
      g.audio.tone(70, 0.9, 'sawtooth', 0.2, -25);
      if (m.enraged && !P.dead && dist < 6) {
        if (P.hurt(Math.max(2, m.def.dmg - 2), m.x, m.z, 10)) P.chill?.(2);
      }
    }
    if (Math.random() < dt * 40) {
      const [mx, my, mz] = mouth(m);
      g.fx.emit(mx, my, mz, Math.sin(m.yaw) * 4 + (Math.random() - 0.5) * 3, Math.random() * 1.5, Math.cos(m.yaw) * 4 + (Math.random() - 0.5) * 3, ICE[Math.floor(Math.random() * 4)], 0.12, 0.6, 0.5);
    }
    if (m.t > dur) {
      m.state = 'chase';
      m.cd = 0.15;
      m.t = 0;
    }
  } else if (st === 'recover') {
    if (m.t > yetiDur(m, st)) {
      m.state = 'chase';
      m.t = 0;
      m.cd = (0.65 + Math.random() * 0.8) / rage;
    }
  }
  return [mvx, mvz];
}

/** Rig animation. Returns root offsets for the shared monster pose pass. */
export function animateYeti(m, dt, c) {
  const { spd, t, hk, spawnS } = c;
  const g = m.game;
  const p = m.model.parts;
  const st = m.state;
  const walk = m.puppet ? 0.6 : Math.min(1, spd / 2.6);
  m.gaitC = (m.gaitC || 0) + dt * (2.6 + spd * 1.5);
  const cc = m.gaitC;
  const step = Math.floor(cc / Math.PI);
  if (step !== m.stepIdx) {
    m.stepIdx = step;
    if (walk > 0.5 && c.dist < 14) {
      g.fx.dust(m.x + (step % 2 ? 0.5 : -0.5), m.y, m.z, 3, 1.2, 0xe8f2fa);
      if (c.dist < 11) g.shake(0.05);
    }
  }
  const swing = Math.sin(cc) * walk;
  const sw2 = Math.sin(cc + Math.PI) * walk;
  const dur = yetiDur(m, st);
  const w = YETI_WIND.has(st) ? clamp(m.t / dur, 0, 1) : 0;
  const ew = ease(w);

  const T = {
    thL: swing * 0.5, thR: sw2 * 0.5, knL: Math.max(0, swing) * 0.95, knR: Math.max(0, sw2) * 0.95,
    thZ: 0.06,
    aLx: 0.12 - sw2 * 0.34 + Math.sin(t * 1.6) * 0.03, aRx: 0.12 - swing * 0.34 + Math.sin(t * 1.6 + 1) * 0.03,
    aLz: -0.2, aRz: 0.2, eL: -0.38 - Math.max(0, sw2) * 0.2, eR: -0.38 - Math.max(0, swing) * 0.2,
    bx: 0.2 + walk * 0.05 + Math.sin(t * 1.8) * 0.02, by: 0, bz: swing * 0.05,
    hx: 0.1 + Math.sin(t * 1.5) * 0.03, jaw: 0.14 + Math.max(0, Math.sin(t * 1.1 + m.phase)) * 0.1,
    chest: 1 + Math.sin(t * 2.3) * 0.014,
    rootY: Math.abs(Math.sin(cc)) * 0.05 * walk, rootX: 0,
  };
  let fast = 14;

  if (st === 'rakewind') {
    T.aRx = -0.25 - ew * 2.15; T.aRz = 0.2 + ew * 0.4; T.eR = -0.5 - ew * 0.5;
    T.aLx = -0.2 - ew * 0.4; T.aLz = -0.2 - ew * 0.3; T.eL = -0.6;
    T.by = -0.5 * ew; T.bx = 0.1 - ew * 0.12; T.hx = -0.2 * ew; T.jaw = 0.35 + 0.35 * ew;
    T.thL = -0.1 * ew; T.thR = 0.14 * ew; T.knL = 0.2 * ew; T.knR = 0.1 * ew;
    fast = 18;
  } else if (st === 'rake1') {
    const u = ease(clamp(m.t / 0.15, 0, 1));
    T.aRx = -2.4 + u * 2.5; T.aRz = 0.6 - u * 1.1; T.eR = -0.9 + u * 0.7;
    T.aLx = -0.5; T.aLz = -0.5; T.eL = -0.7;
    T.by = -0.5 + u * 1.0; T.bx = 0.22 + u * 0.28; T.hx = 0.12 + u * 0.2; T.jaw = 0.95;
    T.thL = -0.3 * u; T.thR = 0.1; T.knL = 0.4 * u; T.rootY = -0.1 * u;
    fast = 34;
  } else if (st === 'rake2') {
    const ru = ease(clamp(m.t / 0.12, 0, 1));
    const u = ease(clamp((m.t - 0.1) / 0.14, 0, 1));
    T.aLx = -0.5 - ru * 1.8 + u * 2.35; T.aLz = -0.5 - ru * 0.3 + u * 1.2; T.eL = -0.7 - ru * 0.2 + u * 0.7;
    T.aRx = 0.1; T.aRz = 0.5; T.eR = -0.5;
    T.by = 0.5 - ru * 0.2 - u * 1.0; T.bx = 0.45; T.hx = 0.15 + u * 0.15; T.jaw = 0.95;
    T.thR = -0.3 * u; T.knR = 0.4 * u; T.rootY = -0.08 * u;
    fast = 34;
  } else if (st === 'rake3') {
    const ru = ease(clamp(m.t / 0.38, 0, 1));
    const u = ease(clamp((m.t - 0.4) / 0.12, 0, 1));
    const a = -3.0 * ru + u * 3.5;
    T.aLx = a; T.aRx = a; T.aLz = -0.3 - ru * 0.2; T.aRz = 0.3 + ru * 0.2; T.eL = -0.3 + u * 0.15; T.eR = -0.3 + u * 0.15;
    T.bx = -0.2 * ru + u * 0.75; T.by = 0; T.hx = -0.3 * ru + u * 0.5; T.jaw = 0.6 + 0.4 * u;
    T.thL = -0.5 * u; T.thR = -0.5 * u; T.knL = 0.8 * u; T.knR = 0.8 * u; T.rootY = -0.3 * u;
    fast = m.t > 0.38 ? 40 : 14;
  } else if (st === 'breathwind') {
    T.hx = -0.6 * ew; T.jaw = 0.25 + 0.75 * ew; T.bx = 0.1 - 0.3 * ew; T.chest = 1 + 0.1 * ew;
    T.aLx = -0.3 * ew; T.aRx = -0.3 * ew; T.aLz = -0.25 - 0.55 * ew; T.aRz = 0.25 + 0.55 * ew; T.eL = -0.5; T.eR = -0.5;
    T.thZ = 0.06 + 0.14 * ew; T.thL = -0.1 * ew; T.thR = -0.1 * ew; T.knL = 0.25 * ew; T.knR = 0.25 * ew; T.rootY = -0.08 * ew;
    if (Math.random() < dt * 30 * ew) g.fx.emit(m.x + Math.sin(m.yaw) * 1.5, m.y + 3.1, m.z + Math.cos(m.yaw) * 1.5, Math.sin(m.yaw) * -1.5, 0.3, Math.cos(m.yaw) * -1.5, 0xcdeeff, 0.1, 0.4, 0);
  } else if (st === 'breath') {
    T.hx = 0.18 + Math.sin(m.t * 30) * 0.03; T.jaw = 1.0; T.bx = 0.12; T.chest = 1.08;
    T.aLx = -0.4; T.aRx = -0.4; T.aLz = -0.75; T.aRz = 0.75; T.eL = -0.5; T.eR = -0.5;
    T.thZ = 0.2; T.thL = -0.12; T.thR = -0.12; T.knL = 0.3; T.knR = 0.3; T.rootY = -0.1;
    T.bz = Math.sin(m.t * 38) * 0.025;
    fast = 18;
  } else if (st === 'slamwind') {
    T.thL = -0.9 * ew; T.thR = -0.9 * ew; T.knL = 1.5 * ew; T.knR = 1.5 * ew; T.rootY = -0.4 * ew; T.thZ = 0.14 * ew;
    T.bx = 0.2 + 0.4 * ew; T.hx = -0.1 + 0.1 * ew; T.jaw = 0.5 + 0.4 * ew;
    T.aLx = 0.2 + 0.9 * ew; T.aRx = 0.2 + 0.9 * ew; T.aLz = -0.5 * ew; T.aRz = 0.5 * ew; T.eL = -0.3; T.eR = -0.3;
    T.chest = 1 + 0.05 * ew;
  } else if (st === 'leap') {
    T.thL = -0.7; T.thR = -0.4; T.knL = 1.0; T.knR = 1.3; T.rootY = 0;
    T.aLx = -2.7; T.aRx = -2.7; T.aLz = -0.55; T.aRz = 0.55; T.eL = -0.3; T.eR = -0.3;
    T.bx = 0.45; T.hx = 0.2; T.jaw = 1.0;
    fast = 16;
  } else if (st === 'land') {
    const k = 1 - clamp(m.t / dur, 0, 1);
    const ik = k * k;
    T.thL = -0.9 * ik; T.thR = -0.9 * ik; T.knL = 1.5 * ik; T.knR = 1.5 * ik; T.rootY = -0.4 * ik; T.thZ = 0.12 * ik;
    T.bx = 0.2 + 0.3 * ik; T.aLx = -0.1 + 0.2 * (1 - ik); T.aRx = T.aLx; T.aLz = -0.35; T.aRz = 0.35; T.eL = -0.2; T.eR = -0.2;
    T.jaw = 0.5;
    fast = 26;
  } else if (st === 'hurlwind') {
    T.aLx = -2.95 * ew; T.aRx = -2.95 * ew; T.aLz = -0.3 * ew; T.aRz = 0.3 * ew; T.eL = -0.2; T.eR = -0.2;
    T.bx = 0.1 - 0.4 * ew; T.hx = -0.4 * ew; T.jaw = 0.4 + 0.3 * ew; T.chest = 1 + 0.06 * ew;
    T.thL = -0.1 * ew; T.thR = 0.2 * ew; T.knL = 0.2 * ew; T.knR = 0.3 * ew; T.thZ = 0.1 + 0.08 * ew;
    T.bz = Math.sin(t * 40) * 0.015 * ew;
  } else if (st === 'hurl') {
    const u = ease(clamp(m.t / 0.14, 0, 1));
    const rel = clamp((m.t - 0.15) / 0.3, 0, 1);
    T.aLx = -2.95 + u * 2.7 + rel * 0.4; T.aRx = -2.95 + u * 3.3 + rel * 0.4; T.aLz = -0.3; T.aRz = 0.3; T.eL = -0.2 - u * 0.4; T.eR = -0.2 - u * 0.4;
    T.bx = -0.3 + u * 0.85; T.hx = -0.4 + u * 0.8; T.jaw = 0.8 * (1 - rel) + 0.2;
    T.thL = -0.5 * u; T.thR = 0.3 * u; T.knL = 0.6 * u; T.knR = 0.2 * u; T.rootY = -0.12 * u;
    fast = 36;
  } else if (st === 'roar') {
    const k = ease(clamp(m.t / 0.3, 0, 1));
    const shake = Math.sin(m.t * 55) * 0.02 * k;
    T.hx = -0.75 * k; T.jaw = 1.05 * k; T.bx = 0.05 - 0.28 * k; T.chest = 1 + 0.12 * k;
    T.aLx = -1.0 * k; T.aRx = -1.0 * k; T.aLz = -0.35 - 0.9 * k; T.aRz = 0.35 + 0.9 * k; T.eL = -0.9 * k; T.eR = -0.9 * k;
    T.bz = shake; T.thZ = 0.06 + 0.1 * k; T.rootY = -0.06 * k;
    fast = 16;
  } else if (st === 'recover') {
    const br = Math.sin(m.t * 10) * 0.04;
    T.bx = 0.34 + br; T.hx = 0.28; T.jaw = 0.35 + Math.max(0, Math.sin(m.t * 10)) * 0.2;
    T.aLx = 0.25; T.aRx = 0.25; T.aLz = -0.3; T.aRz = 0.3; T.eL = -0.25; T.eR = -0.25;
    T.thL = -0.15; T.thR = -0.15; T.knL = 0.35; T.knR = 0.35; T.rootY = -0.1; T.chest = 1 + Math.sin(m.t * 10) * 0.035;
  } else if (st === 'idle' || st === 'wander') {
    T.bx = 0.22 + Math.sin(t * 1.4) * 0.025; T.hx = 0.12 + Math.sin(t * 0.9) * 0.05; T.chest = 1 + Math.sin(t * 1.4) * 0.025;
    T.aLx = 0.1 + Math.sin(t * 1.4) * 0.04; T.aRx = 0.1 + Math.sin(t * 1.4 + 0.6) * 0.04;
    if (st === 'idle' && Math.random() < dt * 1.1) {
      g.fx.emit(m.x + Math.sin(m.yaw) * 1.5, m.y + 3.1, m.z + Math.cos(m.yaw) * 1.5, Math.sin(m.yaw) * 1.2, 0.5, Math.cos(m.yaw) * 1.2, 0xe6f4ff, 0.18, 0.9, -0.3);
    }
  } else if (st === 'chase') {
    T.bx = 0.3 + walk * 0.08; T.hx = 0.18; T.jaw = 0.3 + Math.max(0, Math.sin(t * 3)) * 0.16;
    T.aLx = 0.06 - sw2 * 0.5; T.aRx = 0.06 - swing * 0.5; T.aLz = -0.3; T.aRz = 0.3; T.eL = -0.5 - Math.max(0, sw2) * 0.3; T.eR = -0.5 - Math.max(0, swing) * 0.3;
    T.thL = swing * 0.7; T.thR = sw2 * 0.7; T.knL = Math.max(0, swing) * 1.2; T.knR = Math.max(0, sw2) * 1.2;
    T.rootY = Math.abs(Math.sin(cc)) * 0.075 * walk;
    T.bz = swing * 0.07;
    if (Math.random() < dt * 3) g.fx.emit(m.x + Math.sin(m.yaw) * 1.5, m.y + 3.0, m.z + Math.cos(m.yaw) * 1.5, Math.sin(m.yaw) * 1.5, 0.4, Math.cos(m.yaw) * 1.5, 0xe6f4ff, 0.14, 0.6, -0.3);
  }

  const k = Math.min(1, dt * fast);
  const to = (obj, axis, v, kk = k) => {
    obj.rotation[axis] += (v - obj.rotation[axis]) * kk;
  };
  to(p.legL, 'x', T.thL); to(p.legR, 'x', T.thR);
  to(p.legL, 'z', -T.thZ); to(p.legR, 'z', T.thZ);
  to(p.kneeL, 'x', T.knL); to(p.kneeR, 'x', T.knR);
  to(p.armL, 'x', T.aLx); to(p.armR, 'x', T.aRx);
  to(p.armL, 'z', T.aLz); to(p.armR, 'z', T.aRz);
  to(p.elbowL, 'x', T.eL); to(p.elbowR, 'x', T.eR);
  to(p.body, 'x', T.bx); to(p.body, 'y', T.by); p.body.rotation.z = T.bz;
  to(p.head, 'x', T.hx);
  p.head.rotation.y += (c.lookSm * 0.7 - p.head.rotation.y) * Math.min(1, dt * 8);
  to(p.jaw, 'x', T.jaw, Math.min(1, dt * 20));
  p.body.scale.setScalar(T.chest);
  p.cloth.rotation.x = swing * 0.1 + Math.sin(t * 2) * 0.03 + (T.thL + T.thR) * 0.25;
  m.obj.scale.setScalar(spawnS * m.baseScale);
  if (st === 'hurlwind' || st === 'breathwind') {
    const gl = 0.22 + ew * 0.3 + Math.sin(t * 30) * 0.08;
    m.model.mat.emissive.setRGB(gl * 0.2, gl * 0.55, gl);
  }
  return { rootY: T.rootY, rootX: T.rootX };
}

function ease(x) {
  return x * x * (3 - 2 * x);
}
