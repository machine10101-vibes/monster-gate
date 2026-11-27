import { clamp } from '../engine/voxel.js';
import { TAU, turn, strike, angDiff } from './beastMove.js';
import { OASIS } from '../world/desert.js';

/**
 * Oasis Crocodile.
 * Crocodiles haunt the Oasis waterline. They bask on the bank, slide into the shallows, and patrol
 * the edge looking for prey; now and then one hauls out a little way onto the sand. A hunter who
 * comes close is stalked low and fast, then:
 *   bite        snaps its jaws in front of it
 *   lunge       an explosive burst from a few lengths away that ends in a bite
 *   tail sweep  when the hunter is beside or behind it, the tail lashes round
 * Crocodiles never chase far from the water: past the leash they turn back to the pool.
 */
const COL = [0xc2b07e, 0x6b7a3a, 0xffffff];
const WIND = new Set(['bitewind', 'lungewind', 'tailwind']);
const BUSY = new Set(['bite', 'lunge', 'tail']);
/** How far a swimming crocodile settles below its floor height (the water surface sits just above). */
export const SINK = 0.2;
const DUR = { bitewind: 0.34, bite: 0.26, lungewind: 0.5, lunge: 0.48, tailwind: 0.38, tail: 0.34, recover: 0.5 };

/** Bands around the pool centre. */
export const CROC_ZONE = {
  swimIn: OASIS.r - 7, // shallowest water a crocodile swims to
  edge: OASIS.r, // waterline
  bank: OASIS.r + 7, // basking bank
  haul: OASIS.r + 18, // the furthest a wandering crocodile hauls out
  leash: OASIS.r + OASIS.shore + 12, // the furthest it will chase prey
};

export const FX = {
  spark: [0xe2d4a8, 0xc2b07e, 0xffffff],
  burst: [0x6b7a3a, 0x4c5828, 0xc2b07e],
  death: [0x6b7a3a, 0x5a4630, 0xc2b07e, 0x7fc4e8],
  tele: 0xe0a020,
  accel: 9,
  knock: 1.6,
  stun: 0.1,
  plateY: 1.6,
  deathDur: 1.7,
  heavy: true,
};

export const busy = (m) => BUSY.has(m.state);
export const holdsWarn = (m) => WIND.has(m.state);

const poolD = (x, z) => Math.hypot(x - OASIS.x, z - OASIS.z);
export const inPool = (x, z) => poolD(x, z) < OASIS.r;

/** Where a wandering crocodile heads next: mostly the waterline, sometimes the shallows, rarely up the bank. */
export function patrolPoint(m, roll = Math.random(), r1 = Math.random(), r2 = Math.random()) {
  const a = Math.atan2(m.z - OASIS.z, m.x - OASIS.x) + (r1 - 0.5) * 0.7;
  let r;
  if (roll < 0.6) r = CROC_ZONE.edge - 2 + r2 * 6;
  else if (roll < 0.85) r = CROC_ZONE.swimIn + r2 * (CROC_ZONE.edge - CROC_ZONE.swimIn - 1);
  else r = CROC_ZONE.bank + r2 * (CROC_ZONE.haul - CROC_ZONE.bank);
  return { x: OASIS.x + Math.cos(a) * r, z: OASIS.z + Math.sin(a) * r };
}

export function think(m, dt, c) {
  const { g, P, dist, sees } = c;
  if (typeof m.wanderT !== 'number') m.wanderT = 1 + Math.random() * 3;
  const st = m.state;
  const done = (to) => {
    m.state = to;
    m.t = 0;
    m.hitDone = false;
  };
  const sp = m.def.speed;
  const preyNear = sees && poolD(P.pos.x, P.pos.z) < CROC_ZONE.leash;
  const far = poolD(m.x, m.z) > CROC_ZONE.leash - 2;
  let mvx = 0;
  let mvz = 0;

  if (st === 'idle' || st === 'wander' || st === 'chase') {
    if (preyNear && !far) {
      done('stalk');
      m.cd = Math.max(m.cd || 0, 0.4);
      return [0, 0];
    }
    m.wanderT -= dt;
    if (m.wanderT <= 0 || far) {
      // Long still spells on the bank, short ones in the water.
      m.wanderT = inPool(m.x, m.z) ? 2 + Math.random() * 3 : 4 + Math.random() * 6;
      const p = far ? { x: OASIS.x + (m.x - OASIS.x) * 0.6, z: OASIS.z + (m.z - OASIS.z) * 0.6 } : patrolPoint(m);
      m.wx = p.x;
      m.wz = p.z;
      done('wander');
    }
    if (st === 'wander' && m.wx !== undefined) {
      const tx = m.wx - m.x;
      const tz = m.wz - m.z;
      const td = Math.hypot(tx, tz) || 1;
      if (td < 1.2) done('idle');
      else {
        turn(m, Math.atan2(tx, tz), 1.6, dt);
        // Crocodiles move where they face: a slow belly-crawl on land, a glide in water.
        const k = (inPool(m.x, m.z) ? 0.5 : 0.32) * sp * clamp(1 - Math.abs(angDiff(m.yaw, Math.atan2(tx, tz))) / 1.4, 0.15, 1);
        mvx = Math.sin(m.yaw) * k;
        mvz = Math.cos(m.yaw) * k;
      }
    }
    return [mvx, mvz];
  }

  if (st === 'stalk') {
    if (!preyNear || far) {
      done('wander');
      const p = patrolPoint(m, 0.1);
      m.wx = p.x;
      m.wz = p.z;
      return [0, 0];
    }
    const to = Math.atan2(P.pos.x - m.x, P.pos.z - m.z);
    const off = Math.abs(angDiff(m.yaw, to));
    // Prey beside or behind: the tail comes round.
    if (m.cd <= 0 && dist < 5 && off > 1.5) {
      done('tailwind');
      m.tailDir = angDiff(m.yaw, to) > 0 ? 1 : -1;
      m.warn('circle', 5, 0, DUR.tailwind, true);
      g.audio.tone(70, 0.3, 'sawtooth', 0.06, -10);
      return [0, 0];
    }
    turn(m, to, 2.6, dt);
    if (m.cd <= 0 && dist < 3.6 && off < 0.5) {
      done('bitewind');
      m.warn('line', 2.2, 3.6, DUR.bitewind);
      g.audio.tone(120, 0.2, 'square', 0.06, -30);
      return [0, 0];
    }
    if (m.cd <= 0 && dist > 5.5 && dist < 10 && off < 0.35 && Math.random() < dt * 1.4) {
      done('lungewind');
      m.lungeYaw = to;
      m.warn('line', 2.4, 9, DUR.lungewind);
      g.audio.tone(60, 0.45, 'sawtooth', 0.07, 20);
      return [0, 0];
    }
    const k = (dist > 3 ? 0.82 : 0.15) * sp * clamp(1 - off / 1.2, 0.1, 1);
    return [Math.sin(m.yaw) * k, Math.cos(m.yaw) * k];
  }

  if (st === 'bitewind') {
    turn(m, Math.atan2(P.pos.x - m.x, P.pos.z - m.z), 2, dt);
    if (m.t >= DUR.bitewind) {
      m.clearWarn();
      done('bite');
    }
    return [0, 0];
  }

  if (st === 'bite') {
    if (!m.hitDone && m.t > 0.07) {
      m.hitDone = true;
      if (strike(m, P, { dmg: m.def.dmg, reach: 3.7, arc: 0.7, knock: 4, col: COL })) g.audio.hit?.();
    }
    if (m.t >= DUR.bite) {
      done('recover');
      m.cd = 0.9;
    }
    return [Math.sin(m.yaw) * 2.5, Math.cos(m.yaw) * 2.5];
  }

  if (st === 'lungewind') {
    turn(m, m.lungeYaw ?? m.yaw, 1.2, dt);
    if (m.t >= DUR.lungewind) {
      m.clearWarn();
      done('lunge');
      g.fx.dust?.(m.x, m.y, m.z, 4, 1.4, 0xd8c89a);
    }
    return [0, 0];
  }

  if (st === 'lunge') {
    if (!m.hitDone && dist < 3.2) {
      m.hitDone = true;
      if (strike(m, P, { dmg: m.def.dmg + 3, reach: 3.4, arc: 0.9, knock: 6, col: COL })) {
        g.audio.hit?.();
        g.hud.floatText(...g.screenOf(P.pos.x, P.pos.y + 1.6, P.pos.z), 'Ambushed', 'gold');
      }
    }
    if (m.t >= DUR.lunge) {
      done('recover');
      m.cd = 1.6;
    }
    const v = 12 * (1 - clamp(m.t / DUR.lunge, 0, 1) * 0.6);
    return [Math.sin(m.yaw) * v, Math.cos(m.yaw) * v];
  }

  if (st === 'tailwind') {
    if (m.t >= DUR.tailwind) {
      m.clearWarn();
      done('tail');
      g.fx.ring(m.x, m.y + 0.2, m.z, 0xd8c89a, 12, 4.6, 0.08, 0.35);
    }
    return [0, 0];
  }

  if (st === 'tail') {
    if (!m.hitDone && m.t > 0.1) {
      m.hitDone = true;
      const back = angDiff(m.yaw + Math.PI, Math.atan2(P.pos.x - m.x, P.pos.z - m.z));
      if (Math.abs(back) < 1.9 && strike(m, P, { dmg: m.def.dmg - 1, reach: 5.4, arc: TAU, knock: 7, col: COL })) {
        g.audio.hit?.();
        g.hud.floatText(...g.screenOf(P.pos.x, P.pos.y + 1.6, P.pos.z), 'Tail lash', 'gold');
      }
    }
    if (m.t >= DUR.tail) {
      done('recover');
      m.cd = 1.1;
    }
    return [0, 0];
  }

  if (st === 'recover') {
    if (m.t >= DUR.recover) done('stalk');
    return [0, 0];
  }
  done('idle');
  return [0, 0];
}

/**
 * The tail is driven by one travelling wave: each joint takes the same swing a little later than the
 * one before it, and the swing grows toward the tip, so the tail flows instead of swinging stiffly.
 */
export function tailWave(phase, amp, i) {
  return Math.sin(phase - i * 0.75) * amp * (0.35 + i * 0.16);
}

export function animate(m, dt, ctx) {
  const p = m.model.parts;
  const st = m.state;
  const swim = inPool(m.x, m.z);
  const moving = st === 'wander' || st === 'stalk' || st === 'lunge';
  const pace = st === 'lunge' ? 2.6 : st === 'stalk' ? 1.35 : 1;
  m.step = (m.step || 0) + dt * (moving ? 7.5 * pace : 1.2);
  const k = Math.min(1, dt * 10);
  const ease = (o, key, v, kk = k) => {
    o[key] += (v - o[key]) * kk;
  };

  // Legs: diagonal pairs (front-left with back-right) on land; in water they fold back along the body.
  const lift = moving ? 0.5 : 0.04;
  p.legs.forEach((leg, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const diag = i === 0 || i === 3 ? 0 : Math.PI;
    const ph = m.step + diag;
    if (swim) {
      ease(leg.rotation, 'y', side * (i < 2 ? 0.9 : 1.1), dt * 4);
      ease(leg.rotation, 'z', side * -0.25, dt * 4);
      ease(leg.rotation, 'x', 0, dt * 4);
    } else {
      // Diagonal partners swing the same way; the foot lifts only while it swings forward.
      leg.rotation.y = side * Math.sin(ph) * lift;
      leg.rotation.z = side * (0.05 + Math.max(0, Math.cos(ph)) * lift * 0.5);
      ease(leg.rotation, 'x', 0);
    }
  });

  // Tail: a constant travelling wave whose speed and size follow the gait; bigger when swimming.
  m.tailPh = (m.tailPh || 0) + dt * (swim ? 5.5 : moving ? 6 * pace : 1.4);
  const amp = swim ? 0.32 : moving ? 0.2 : 0.06;
  let lash = 0;
  if (st === 'tailwind') lash = -(m.tailDir || 1) * 0.5 * clamp(m.t / DUR.tailwind, 0, 1);
  if (st === 'tail') lash = (m.tailDir || 1) * 1.1 * Math.sin(clamp(m.t / DUR.tail, 0, 1) * Math.PI);
  p.tail.forEach((seg, i) => {
    const want = tailWave(m.tailPh, amp, i) + lash * (0.25 + i * 0.12);
    ease(seg.rotation, 'y', want, Math.min(1, dt * 14));
    // The tip curls up a touch out of the water and lies flat on land.
    ease(seg.rotation, 'x', swim ? -0.02 * i : 0.015 * i);
  });

  // Head and jaw.
  let jaw = 0.03;
  let head = 0;
  if (st === 'idle' && !swim) jaw = Math.max(0, Math.sin(m.step * 0.35)) > 0.97 ? 0.6 : 0.05; // a bask-gape now and then
  if (st === 'bitewind') {
    jaw = 0.75 * clamp(m.t / DUR.bitewind, 0, 1);
    head = -0.18;
  }
  if (st === 'bite') jaw = 0.75 * (1 - clamp(m.t / 0.1, 0, 1));
  if (st === 'lungewind') {
    jaw = 0.35;
    head = -0.1;
  }
  if (st === 'lunge') jaw = m.hitDone ? 0 : 0.85;
  if (st === 'stalk') head = 0.06;
  ease(p.jaw.rotation, 'x', jaw, Math.min(1, dt * (st === 'bite' ? 30 : 12)));
  ease(p.head.rotation, 'x', head);
  p.head.rotation.y = (ctx.lookSm || 0) * 0.25 + (moving ? Math.sin(m.step) * 0.06 : 0);
  // The body snakes a little against the tail as it walks.
  p.body.rotation.y = moving && !swim ? Math.sin(m.step) * 0.07 : 0;

  if (WIND.has(st)) {
    const pulse = 0.1 + Math.sin(m.t * 26) * 0.05;
    m.model.mat.emissive.setRGB(pulse, pulse * 0.55, 0.01);
  }
  // In the water it rides low: only the back plates, the eyes and the ridge of the snout show.
  m.sink = (m.sink || 0) + ((swim && !BUSY.has(st) ? 1 : 0) - (m.sink || 0)) * Math.min(1, dt * 3);
  const bob = swim ? Math.sin(m.tailPh * 0.5) * 0.03 : moving ? Math.abs(Math.sin(m.step)) * 0.03 : 0;
  return { rootY: bob - m.sink * SINK, rootX: st === 'lunge' ? -0.05 : 0 };
}

export function dead(m, dt, c) {
  const { u, ease, side, bs, dissolve } = c;
  const o = m.obj;
  const p = m.model.parts;
  // It rolls onto its back, legs up, the way they die.
  const k = ease(clamp(u / 0.55, 0, 1));
  o.rotation.set(0, m.yaw, side * Math.PI * 0.95 * k);
  o.position.set(m.x, m.y + k * 0.35, m.z);
  p.legs.forEach((leg, i) => {
    leg.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.6 * k;
  });
  p.jaw.rotation.x = 0.4 * k;
  p.tail.forEach((seg, i) => {
    seg.rotation.y = side * 0.12 * i * k;
  });
  const k2 = dissolve(1.0, 0.65, [0x6b7a3a, 0x5a4630, 0xc2b07e, 0xffffff], 5);
  o.scale.setScalar(bs * (1 - k2 * k2));
  void dt;
}
