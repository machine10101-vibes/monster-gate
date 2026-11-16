import { clamp } from '../engine/voxel.js';

/**
 * Volcanum, the dragon of Cinderfall.
 * He keeps to the lava-moated isle, circles a hunter who steps onto it,
 * and pours a stream of liquid lava from his jaws. Claws, a tail sweep
 * and a dusk-style climb-and-dive sit around that breath.
 */
const TAU = Math.PI * 2;
const LAVA = 0xff5a12;
const LAVA_HOT = 0xffe08a;
const PREFERRED = 10;
const BREATH_TIME = 1.2;
const GRAV = 16;
const HOVER = 1.0;
const AIR_H = 6.6;
const ASCEND = 0.95;
const AIR = 4.0;
const DESCEND = 0.75;

function ease(t) {
  return t * t * (3 - 2 * t);
}

function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

function mouth(m) {
  const reach = 1.55 * (m.baseScale || 2);
  return {
    x: m.x + Math.sin(m.yaw) * reach,
    y: m.y + (m.hover || 0) + 2.15 * ((m.baseScale || 2) / 2),
    z: m.z + Math.cos(m.yaw) * reach,
  };
}

/** One gob of liquid lava, lobbed so it falls onto the hunter. */
function spitLava(m, g, P, spread) {
  const o = mouth(m);
  const sp = 12 + Math.random() * 3.5;
  const a = m.yaw + spread;
  const tx = P.pos.x + (Math.random() - 0.5) * 1.4;
  const tz = P.pos.z + (Math.random() - 0.5) * 1.4;
  const dist = Math.max(2.5, Math.hypot(tx - o.x, tz - o.z));
  const T = clamp(dist / sp, 0.38, 1.05);
  const vy = (P.pos.y + 0.7 - o.y) / T + 0.5 * GRAV * T;
  g.spawnProjectile({
    owner: 'enemy',
    kind: 'lavabolt',
    x: o.x,
    y: o.y,
    z: o.z,
    vx: Math.sin(a) * sp,
    vz: Math.cos(a) * sp,
    vy,
    gravity: GRAV,
    dmg: Math.max(7, m.def.dmg - 4),
    life: T + 0.55,
    r: 0.62,
  });
}

function pour(m, g, P, dt, frenzy) {
  m.breathAcc = (m.breathAcc || 0) + dt;
  const gap = frenzy ? 0.055 : 0.078;
  const cap = frenzy ? 20 : 15;
  while (m.breathAcc >= gap && (m.breathN || 0) < cap) {
    m.breathAcc -= gap;
    m.breathN = (m.breathN || 0) + 1;
    const n = m.breathN;
    const fan = Math.sin(n * 0.85) * (frenzy ? 0.22 : 0.16);
    spitLava(m, g, P, fan + (Math.random() - 0.5) * 0.06);
  }
  const o = mouth(m);
  if (Math.random() < dt * 50) {
    g.fx.emit(o.x, o.y, o.z, Math.sin(m.yaw) * 4, 0.4, Math.cos(m.yaw) * 4, Math.random() < 0.4 ? LAVA_HOT : LAVA, 0.16, 0.28, 1.5);
  }
  g.vfx.glowNow(o.x, o.y, o.z, LAVA, 2.4 + Math.sin(m.t * 30) * 0.4, 0.95);
}

/**
 * @returns {[number, number]} desired horizontal move
 */
export function volcanumThink(m, dt, { g, P, dx, dz, dist, sees, toP }) {
  const frenzy = !!m.enraged;
  let mvx = 0;
  let mvz = 0;
  const homeD = Math.hypot(m.x - m.home.x, m.z - m.home.z);
  const far = homeD > 36;
  if (far && (m.state === 'chase' || m.state === 'idle' || m.state === 'wander' || m.state === 'recover')) {
    sees = false;
  }
  m.skyCd -= dt;
  m.tickStrikes(dt, P);
  const nd = dist || 1;
  const ux = dx / nd;
  const uz = dz / nd;

  if (m.state === 'idle' || m.state === 'wander') {
    if (sees && !far) {
      m.state = 'chase';
      m.cd = 0.6;
      g.audio.tone(90, 0.55, 'sawtooth', 0.14, -40);
      g.hud.floatText(...g.screenOf(m.x, m.y + m.hover + 3.2, m.z), 'Volcanum', 'crit');
    } else {
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 2.8 + Math.random() * 3;
        const a = Math.random() * TAU;
        const rr = 2 + Math.random() * 4;
        m.target = { x: m.home.x + Math.cos(a) * rr, z: m.home.z + Math.sin(a) * rr };
      }
      const tx = m.target.x - m.x;
      const tz = m.target.z - m.z;
      const td = Math.hypot(tx, tz);
      if (td > 0.8) {
        mvx = (tx / td) * 1.1;
        mvz = (tz / td) * 1.1;
        m.yaw += angDiff(m.yaw, Math.atan2(tx, tz)) * Math.min(1, dt * 2.4);
      }
    }
  } else if (m.state === 'chase') {
    if ((!sees && dist > m.def.aggro * 1.5) || far) m.state = 'idle';
    m.yaw += angDiff(m.yaw, toP) * Math.min(1, dt * 5);
    const away = dist < PREFERRED - 2.2 ? -1 : dist > PREFERRED + 3 ? 1 : 0;
    const orbit = Math.sin(m.t * 0.55 + m.phase);
    const sp = m.def.speed * (frenzy ? 1.2 : 1);
    mvx = ux * sp * away * (away < 0 ? 1.2 : 1) + uz * orbit * sp * 0.7;
    mvz = uz * sp * away * (away < 0 ? 1.2 : 1) - ux * orbit * sp * 0.7;
    if (m.cd <= 0.15 && m.skyCd <= 0 && sees && dist < 18 && homeD < 28) {
      m.beginFlight();
    } else if (m.cd <= 0 && sees) {
      if (dist < 6.2) m.atk = Math.random() < 0.45 ? 'tail' : 'slash';
      else if (dist < 17) m.atk = Math.random() < (frenzy ? 0.82 : 0.7) ? 'breath' : 'slash';
      else m.atk = null;
      if (m.atk) {
        m.state = 'windup';
        m.t = 0;
        const wt = { slash: 0.42, tail: 0.5, breath: 0.85 }[m.atk] / (frenzy ? 1.2 : 1);
        if (m.atk === 'slash') m.warn('circle', 8.4, 0, wt, true);
        else if (m.atk === 'tail') m.warn('circle', 7.2, 0, wt, true);
        else m.warn('line', frenzy ? 5.2 : 4.2, 16, wt);
      }
    }
  } else if (m.state === 'windup') {
    m.yaw += angDiff(m.yaw, toP) * Math.min(1, dt * (m.atk === 'breath' ? 3.2 : 8));
    if (m.atk !== 'breath') {
      mvx = -ux * 0.5;
      mvz = -uz * 0.5;
    }
    const wind = { slash: 0.42, tail: 0.5, breath: 0.85 }[m.atk] / (frenzy ? 1.2 : 1);
    if (m.t > wind) {
      m.clearWarn();
      m.kick = 1;
      if (m.atk === 'breath') {
        m.state = 'breath';
        m.t = 0;
        m.breathAcc = 0;
        m.breathN = 0;
        g.audio.tone(70, 0.9, 'sawtooth', 0.16, 40);
        g.shake(0.2);
      } else if (m.atk === 'tail') {
        const a = Math.atan2(dx, dz);
        if (dist < 8.2 && P.hurt(m.def.dmg + 3, m.x, m.z, 14)) g.fx.burst(P.pos.x, P.pos.y + 1, P.pos.z, [LAVA_HOT, LAVA], 8, 3, 0.1, 0.35);
        g.vfx.slashArc(m.x, m.y + m.hover + 1.2, m.z, a + 1.2, { radius: 6.2, thick: 2.2, sweep: 4.4, color: LAVA, hot: LAVA_HOT, life: 0.38, sweepT: 0.2, tail: 0.9, follow: () => ({ x: m.x, y: m.y + m.hover, z: m.z }) });
        g.fx.dust(m.x, m.y, m.z, 5, 2.2, 0xff6a12);
        m.state = 'recover';
        m.t = 0;
        m.cd = 1.05;
      } else {
        if (dist < 8.6 && P.hurt(m.def.dmg + 4, m.x, m.z, 16)) g.fx.burst(P.pos.x, P.pos.y + 1, P.pos.z, [LAVA_HOT, 0xfff2c0], 10, 3.2, 0.1, 0.4);
        g.fx.ring(m.x, m.y + m.hover - 0.2, m.z, LAVA, 16, 7.6, 0.1, 0.4);
        g.vfx.slashArc(m.x, m.y + m.hover + 1.8, m.z, Math.atan2(dx, dz), { radius: 6.4, thick: 2.6, sweep: 5.4, color: LAVA, hot: LAVA_HOT, life: 0.4, sweepT: 0.22, tail: 0.95, follow: () => ({ x: m.x, y: m.y + m.hover, z: m.z }) });
        g.fx.dust(m.x, m.y, m.z, 6, 2.4, 0xff8a24);
        m.vx = -ux * 8;
        m.vz = -uz * 8;
        g.audio.tone(140, 0.16, 'square', 0.1, -80);
        m.state = 'recover';
        m.t = 0;
        m.cd = frenzy ? 0.7 : 1.05;
      }
    }
  } else if (m.state === 'breath') {
    m.yaw += angDiff(m.yaw, toP) * Math.min(1, dt * (frenzy ? 2.4 : 1.7));
    pour(m, g, P, dt, frenzy);
    const dur = BREATH_TIME * (frenzy ? 1.25 : 1);
    if (m.t > dur) {
      m.state = 'recover';
      m.t = 0;
      m.cd = (frenzy ? 1.3 : 2.15) + Math.random() * 0.4;
      g.audio.tone(50, 0.25, 'sine', 0.08, -20);
    }
  } else if (m.state === 'recover') {
    mvx = -ux * 0.7;
    mvz = -uz * 0.7;
    if (m.t > 0.48) m.state = sees && !far ? 'chase' : 'idle';
  } else if (m.state === 'ascend') {
    m.yaw += angDiff(m.yaw, toP) * Math.min(1, dt * 6);
    m.hover = HOVER + (AIR_H - HOVER) * ease(clamp(m.t / ASCEND, 0, 1));
    mvx = -ux * 1.2;
    mvz = -uz * 1.2;
    if (Math.random() < dt * 40) g.fx.dust(m.x + (Math.random() - 0.5) * 2.4, m.y, m.z + (Math.random() - 0.5) * 2.4, 1, 2.4, LAVA);
    if (m.t >= ASCEND) {
      m.state = 'air';
      m.t = 0;
      m.airEv = 0;
    }
  } else if (m.state === 'air') {
    m.hover = AIR_H;
    m.yaw += angDiff(m.yaw, toP) * Math.min(1, dt * 8);
    const away = dist < 7 ? -1 : dist > 12 ? 1 : 0;
    const sp = m.def.speed * (frenzy ? 1.3 : 1.12);
    mvx = ux * sp * away + uz * sp * 0.85 * m.orbitDir;
    mvz = uz * sp * away - ux * sp * 0.85 * m.orbitDir;
    if (m.t > 0.45 && m.t < 2.3) pour(m, g, P, dt * 0.45, frenzy);
    if (m.t >= AIR) m.beginDescend(P);
  } else if (m.state === 'descend') {
    const d = m.dive;
    m.yaw += angDiff(m.yaw, Math.atan2(d.x - m.x, d.z - m.z)) * Math.min(1, dt * 8);
    const u = clamp(m.t / DESCEND, 0, 1);
    m.hover = AIR_H + (HOVER - AIR_H) * u * u;
    const k = Math.min(1, dt * 4.5);
    m.moveBy((d.x - m.x) * k, (d.z - m.z) * k);
    if (m.t >= DESCEND) m.slam(P);
  }

  if (frenzy && m.state !== 'breath' && Math.random() < dt * 4) {
    g.fx.burst(m.x, m.y + m.hover + 1.2, m.z, [LAVA, 0x1a1010], 1, 0.7, 0.1, 0.55, -0.4, 0.4);
  }
  return [mvx, mvz];
}
