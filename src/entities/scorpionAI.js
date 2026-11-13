import { clamp } from '../engine/voxel.js';
import { TAU, turn, strike } from './beastMove.js';

/**
 * Desert Scorpion.
 * It scuttles low, sidesteps to keep a claw on the hunter, then snaps.
 * When the hunter backs off, the tail rears and the sting comes down
 * where they are standing.
 */
const COL = [0xe0c078, 0x8d6a38, 0xe8d080];
const WIND = new Set(['windup', 'stingwind']);
const BUSY = new Set(['snap', 'sting']);

export const FX = {
  spark: [0xe8d080, 0xe0c078, 0xffffff],
  burst: [0xc4a15a, 0x8d6a38, 0xe8d2a4],
  death: [0xc4a15a, 0x4a3424, 0xe8d080, 0xffffff],
  tele: 0xe0b050,
  accel: 11,
  knock: 3.2,
  stun: 0.16,
  plateY: 1.6,
  deathDur: 1.5,
  heavy: false,
};

export const busy = (m) => BUSY.has(m.state);
export const holdsWarn = (m) => WIND.has(m.state);

const DUR = { windup: 0.38, snap: 0.28, stingwind: 0.62, sting: 0.34, recover: 0.45 };

export function think(m, dt, c) {
  const { g, P, dist, sees } = c;
  if (typeof m.wanderT !== 'number') m.wanderT = 2;
  const homeD = Math.hypot(m.x - m.home.x, m.z - m.home.z);
  const leashed = homeD > 36;
  let mvx = 0;
  let mvz = 0;
  const st = m.state;
  const done = (to) => {
    m.state = to;
    m.t = 0;
    m.hitDone = false;
  };

  if (st === 'idle' || st === 'wander' || st === 'chase') {
    if (sees && !leashed) {
      done('scuttle');
      m.side = Math.random() < 0.5 ? -1 : 1;
      m.cd = Math.max(m.cd || 0, 0.35);
    } else {
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 2 + Math.random() * 3;
        const a = Math.random() * TAU;
        m.wx = m.home.x + Math.cos(a) * (3 + Math.random() * 6);
        m.wz = m.home.z + Math.sin(a) * (3 + Math.random() * 6);
        done('wander');
      }
      if (st === 'wander' || m.wx) {
        const tx = (m.wx ?? m.home.x) - m.x;
        const tz = (m.wz ?? m.home.z) - m.z;
        const td = Math.hypot(tx, tz) || 1;
        if (td < 1) done('idle');
        else {
          turn(m, Math.atan2(tx, tz), 3, dt);
          mvx = (tx / td) * m.def.speed * 0.55;
          mvz = (tz / td) * m.def.speed * 0.55;
        }
      }
    }
    return [mvx, mvz];
  }

  if (st === 'scuttle') {
    if (!sees || leashed || dist > 20) {
      done('wander');
      return [0, 0];
    }
    const tx = P.pos.x - m.x;
    const tz = P.pos.z - m.z;
    turn(m, Math.atan2(tx, tz), 4.5, dt);
    const sp = m.def.speed;
    const forward = dist > 3.2 ? 1 : dist < 2.2 ? -0.35 : 0.15;
    const side = m.side || 1;
    mvx = Math.sin(m.yaw) * sp * forward + Math.cos(m.yaw) * sp * 0.55 * side;
    mvz = Math.cos(m.yaw) * sp * forward - Math.sin(m.yaw) * sp * 0.55 * side;
    if (m.cd <= 0 && dist < 2.8) {
      done('windup');
      m.warn('line', 2.2, 3.2, DUR.windup);
      g.audio.tone(180, 0.16, 'square', 0.05, 40);
    } else if (m.cd <= 0 && dist < 6.5 && dist > 3) {
      done('stingwind');
      m.dive = { x: P.pos.x, z: P.pos.z };
      m.warn('circle', 1.6, 0, DUR.stingwind, true);
      g.audio.tone(90, 0.35, 'sawtooth', 0.06, -20);
    }
    if (Math.random() < dt * 0.35) m.side = -m.side;
    return [mvx, mvz];
  }

  if (st === 'windup') {
    if (m.t >= DUR.windup) {
      m.clearWarn();
      done('snap');
    }
    return [Math.sin(m.yaw) * 1.5, Math.cos(m.yaw) * 1.5];
  }

  if (st === 'snap') {
    if (!m.hitDone && m.t > 0.08) {
      m.hitDone = true;
      if (strike(m, P, { dmg: m.def.dmg, reach: 2.6, arc: 0.8, knock: 3.5, col: COL })) g.audio.hit?.();
    }
    if (m.t >= DUR.snap) {
      done('recover');
      m.cd = 0.7;
    }
    return [0, 0];
  }

  if (st === 'stingwind') {
    if (m.dive) turn(m, Math.atan2(m.dive.x - m.x, m.dive.z - m.z), 3, dt);
    if (m.t >= DUR.stingwind) {
      m.clearWarn();
      done('sting');
      g.fx.ring(m.x + Math.sin(m.yaw) * 1.6, m.y + 0.15, m.z + Math.cos(m.yaw) * 1.6, 0xe8d080, 10, 1.8, 0.08, 0.35);
    }
    return [0, 0];
  }

  if (st === 'sting') {
    if (!m.hitDone && m.t > 0.1) {
      m.hitDone = true;
      if (strike(m, P, { dmg: m.def.dmg + 3, reach: 3.3, arc: 0.55, knock: 2.2, col: COL })) {
        g.audio.hit?.();
        g.hud.floatText(...g.screenOf(P.pos.x, P.pos.y + 1.6, P.pos.z), 'Stung', 'gold');
      }
    }
    if (m.t >= DUR.sting) {
      done('recover');
      m.cd = 1.3;
    }
    return [Math.sin(m.yaw) * 2, Math.cos(m.yaw) * 2];
  }

  if (st === 'recover') {
    if (m.t >= DUR.recover) done('scuttle');
    return [0, 0];
  }
  return [0, 0];
}

export function animate(m, dt, ctx) {
  const p = m.model.parts;
  const st = m.state;
  const moving = st === 'scuttle' || st === 'wander' || st === 'chase';
  m.step = (m.step || 0) + dt * (moving ? 14 : 3);
  const lift = moving ? 0.55 : 0.08;
  p.legs.forEach((leg, i) => {
    const phase = m.step + i * 0.9 + (i >= 4 ? Math.PI : 0);
    leg.rotation.x = Math.sin(phase) * lift;
    leg.rotation.z = (i < 4 ? 1 : -1) * (0.25 + Math.max(0, Math.sin(phase)) * 0.35);
  });
  const k = Math.min(1, dt * 10);
  let claw = 0.5;
  if (st === 'windup') claw = 0.5 + clamp(m.t / 0.38, 0, 1) * 0.7;
  if (st === 'snap') claw = 0.15;
  p.claws[0].rotation.z += ((-claw) - p.claws[0].rotation.z) * k;
  p.claws[1].rotation.z += (claw - p.claws[1].rotation.z) * k;
  p.claws[0].rotation.y = st === 'snap' ? -0.4 : -0.1;
  p.claws[1].rotation.y = st === 'snap' ? 0.4 : 0.1;

  const curl = st === 'stingwind' ? -0.9 * clamp(m.t / 0.62, 0, 1) : st === 'sting' ? 0.85 * (1 - clamp(m.t / 0.2, 0, 1)) : -0.35;
  p.tail.forEach((seg, i) => {
    seg.rotation.x += (curl * (0.5 + i * 0.18) - seg.rotation.x) * k;
  });
  p.sting.rotation.x += ((st === 'sting' ? 0.8 : curl * 0.4) - p.sting.rotation.x) * k;
  p.head.rotation.y = (ctx.lookSm || 0) * 0.4;
  const bob = moving ? Math.abs(Math.sin(m.step)) * 0.04 : 0;
  if (st === 'windup' || st === 'stingwind') m.model.mat.emissive.setRGB(0.28, 0.16, 0.02);
  return { rootY: bob + (st === 'sting' ? 0.06 : 0), rootX: st === 'snap' ? 0.12 : moving ? 0.04 : 0 };
}

export function dead(m, dt, c) {
  const { u, ease, side } = c;
  const o = m.obj;
  const p = m.model.parts;
  const k = ease(clamp(u / 0.45, 0, 1));
  o.rotation.set(side * 1.4 * k, m.yaw, 0);
  o.position.set(m.x, m.y, m.z);
  p.legs.forEach((leg, i) => {
    leg.rotation.x = 0.8 * k * (i % 2 ? 1 : -1);
  });
  p.claws.forEach((claw, i) => {
    claw.rotation.z = (i ? 1 : -1) * 0.2 * k;
  });
  p.tail.forEach((seg) => {
    seg.rotation.x = 0.4 * k;
  });
  void dt;
}
