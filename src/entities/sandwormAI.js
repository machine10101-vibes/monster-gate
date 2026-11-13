import { clamp } from '../engine/voxel.js';
import { TAU, turn, strike, ease3 } from './beastMove.js';

/**
 * Sand Spine Worm.
 * It travels under the dune. Only the bone ridge breaks the surface, with a
 * wake of sand. It breaches where the hunter stands, bites, then thrashes
 * the ridge before sinking again.
 */
const COL = [0xe6c67c, 0xf3e6c4, 0x8c6238];
const WIND = new Set(['windup']);
const BUSY = new Set(['breach', 'thrash']);

export const FX = {
  spark: [0xf3e6c4, 0xe6c67c, 0xffffff],
  burst: [0xd2ae62, 0xf3e6c4, 0x8c6238],
  death: [0xd2ae62, 0xf3e6c4, 0x6a3030, 0xffffff],
  tele: 0xe6b04a,
  accel: 7,
  knock: 4.2,
  stun: 0.12,
  plateY: 2.4,
  deathDur: 1.8,
  heavy: true,
  noLift: true,
};

export const busy = (m) => BUSY.has(m.state);
export const holdsWarn = (m) => WIND.has(m.state);

const DUR = { windup: 0.7, breach: 0.42, thrash: 0.55, recover: 0.6 };

function sand(m, n, y) {
  const g = m.game;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const r = Math.random() * 0.8;
    g.fx.emit(m.x + Math.cos(a) * r, m.y + y, m.z + Math.sin(a) * r, Math.cos(a) * 1.4, 1.6 + Math.random(), Math.sin(a) * 1.4, COL[i % 3], 0.08, 0.45, 2);
  }
}

export function think(m, dt, c) {
  const { g, P, dist, sees } = c;
  if (typeof m.wanderT !== 'number') m.wanderT = 2;
  const homeD = Math.hypot(m.x - m.home.x, m.z - m.home.z);
  const leashed = homeD > 42;
  let mvx = 0;
  let mvz = 0;
  const st = m.state;
  const done = (to) => {
    m.state = to;
    m.t = 0;
    m.hitDone = false;
  };

  if (st === 'idle' || st === 'wander' || st === 'chase') {
    if (sees && !leashed && dist < 18) {
      done('buried');
      m.cd = 0.4;
    } else if (sees && !leashed) {
      done('buried');
    } else {
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 2.5 + Math.random() * 3;
        const a = Math.random() * TAU;
        m.wx = m.home.x + Math.cos(a) * (4 + Math.random() * 8);
        m.wz = m.home.z + Math.sin(a) * (4 + Math.random() * 8);
        done('wander');
      }
      if (st === 'wander') {
        const tx = m.wx - m.x;
        const tz = m.wz - m.z;
        const td = Math.hypot(tx, tz);
        if (td < 1.2) done('idle');
        else {
          turn(m, Math.atan2(tx, tz), 2.2, dt);
          mvx = (tx / td) * m.def.speed * 0.45;
          mvz = (tz / td) * m.def.speed * 0.45;
        }
      }
    }
    return [mvx, mvz];
  }

  if (st === 'buried') {
    if (Math.random() < dt * 18) sand(m, 1, 0.15);
    if (!sees || leashed || dist > 26) {
      done('wander');
      return [0, 0];
    }
    const tx = P.pos.x - m.x;
    const tz = P.pos.z - m.z;
    turn(m, Math.atan2(tx, tz), 3.4, dt);
    const sp = m.def.speed * (dist > 6 ? 1.15 : 0.55);
    mvx = Math.sin(m.yaw) * sp;
    mvz = Math.cos(m.yaw) * sp;
    if (m.cd <= 0 && dist < 7.5) {
      done('windup');
      m.dive = { x: P.pos.x, z: P.pos.z };
      m.warn('circle', 2.4, 0, DUR.windup, true);
      g.audio.tone(70, 0.45, 'sawtooth', 0.08, -40);
    }
    return [mvx, mvz];
  }

  if (st === 'windup') {
    if (m.t > 0.15 && Math.random() < dt * 30) sand(m, 2, 0.3);
    if (m.dive) {
      const tx = m.dive.x - m.x;
      const tz = m.dive.z - m.z;
      if (Math.hypot(tx, tz) > 0.4) turn(m, Math.atan2(tx, tz), 4, dt);
    }
    if (m.t >= DUR.windup) {
      m.clearWarn();
      done('breach');
      g.fx.ring(m.x, m.y + 0.2, m.z, 0xe6b04a, 16, 3.2, 0.1, 0.45);
      g.shake(0.28);
      sand(m, 10, 0.4);
    }
    return [0, 0];
  }

  if (st === 'breach') {
    const lunge = Math.sin(clamp(m.t / 0.22, 0, 1) * Math.PI) * 7;
    mvx = Math.sin(m.yaw) * lunge;
    mvz = Math.cos(m.yaw) * lunge;
    if (!m.hitDone && m.t > 0.12) {
      m.hitDone = true;
      if (strike(m, P, { dmg: m.def.dmg + 2, reach: 3.1, arc: 0.9, knock: 5, col: COL })) g.audio.hit?.();
    }
    if (m.t >= DUR.breach) {
      done(dist < 3.4 ? 'thrash' : 'recover');
    }
    return [mvx, mvz];
  }

  if (st === 'thrash') {
    if (!m.hitDone && m.t > 0.18) {
      m.hitDone = true;
      if (strike(m, P, { dmg: m.def.dmg, reach: 3.4, arc: 1.6, knock: 6, col: COL })) g.audio.hit?.();
      sand(m, 6, 0.5);
    }
    if (m.t >= DUR.thrash) {
      done('recover');
      m.cd = 1.1;
    }
    return [0, 0];
  }

  if (st === 'recover') {
    if (m.t >= DUR.recover) done('buried');
    return [0, 0];
  }
  return [0, 0];
}

export function animate(m, dt, ctx) {
  const p = m.model.parts;
  const st = m.state;
  const gait = st === 'buried' || st === 'wander' ? 1 : st === 'breach' ? 0.4 : 0.15;
  m.wave = (m.wave || 0) + dt * (st === 'buried' ? 9 : 4.5);
  const amp = st === 'buried' ? 0.55 : st === 'thrash' ? 0.9 : 0.28;
  p.segs.forEach((seg, i) => {
    const w = Math.sin(m.wave - i * 0.85);
    seg.rotation.y = w * amp * (i === 0 ? 0.45 : 1);
    seg.rotation.z = Math.sin(m.wave * 0.5 - i) * 0.08 * gait;
  });
  const buried = st === 'buried' || st === 'wander' || st === 'idle' || st === 'windup';
  let sink = buried ? (st === 'windup' ? -0.35 : -0.72) : 0;
  if (st === 'windup') sink = -0.72 + ease3(clamp(m.t / 0.7, 0, 1)) * 0.45;
  if (st === 'breach') {
    const u = clamp(m.t / 0.2, 0, 1);
    sink = -0.25 + Math.sin(u * Math.PI) * 0.85;
    p.head.rotation.x = -0.7 * (1 - u) + 0.35 * u;
    p.jaw.rotation.x = 0.8 * Math.sin(clamp(m.t / 0.3, 0, 1) * Math.PI);
  } else if (st === 'thrash') {
    sink = 0.05;
    p.head.rotation.x = Math.sin(m.t * 16) * 0.35;
    p.jaw.rotation.x = 0.4;
    p.segs.forEach((seg, i) => {
      seg.rotation.z = Math.sin(m.t * 14 - i) * 0.45;
    });
  } else {
    p.head.rotation.x += ((buried ? 0.35 : 0.05) - p.head.rotation.x) * Math.min(1, dt * 6);
    p.jaw.rotation.x += ((buried ? 0.1 : 0.2) - p.jaw.rotation.x) * Math.min(1, dt * 6);
  }
  if (st === 'windup') m.model.mat.emissive.setRGB(0.35, 0.22, 0.05);
  return { rootY: sink, rootX: st === 'breach' ? -0.15 : buried ? 0.08 : 0 };
}

export function dead(m, dt, c) {
  const { u, ease, side, bs } = c;
  const o = m.obj;
  const p = m.model.parts;
  const k = ease(clamp(u / 0.55, 0, 1));
  o.rotation.set(0, m.yaw, side * 1.2 * k);
  o.position.set(m.x, m.y + 0.2 * (1 - k), m.z);
  p.segs.forEach((seg, i) => {
    seg.rotation.y = side * 0.35 * k * (i - 2) * 0.3;
    seg.rotation.x = 0.2 * k;
  });
  p.jaw.rotation.x = 0.6 * k;
  o.scale.setScalar(bs * (1 - Math.max(0, u - 1.1) * 0.35));
  void dt;
}
