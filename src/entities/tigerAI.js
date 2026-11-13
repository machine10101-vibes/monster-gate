import { clamp } from '../engine/voxel.js';
import { TIGER_CHAINS, TIGER_UNIT } from './tigerModel.js';
import { TAU, turn, lunge, tween, stateClock, chainEnd, strike, ease3 } from './beastMove.js';

/**
 * Bengal Tiger: a stalking ambusher.
 *
 *   Stalk     low creeping approach that quickens as the hunter gets closer
 *   Pounce    a coiled, wiggling wind-up (a line shows where it will land), then one long leap
 *   Swipe     a two-paw raking combo up close (a third overhead smash when enraged)
 * Below half health it roars, moves faster and winds up quicker.
 */
const COL = [0xe07a1e, 0x17110d, 0xf5efe2];
const WIND = new Set(['windup', 'swipewind']);
const BUSY = new Set(['leap', 'swipe1', 'swipe2', 'swipe3', 'roar']);

export const FX = {
  spark: [0xfff2c0, 0xffb347, 0xffffff],
  burst: [0xe07a1e, 0x17110d, 0xf5efe2],
  death: [0xe07a1e, 0x17110d, 0xf5efe2, 0xffd9a0],
  tele: 0xffa040,
  accel: 9,
  accelFn: (m) => (m.state === 'stalk' ? 6.5 : m.state === 'recover' || m.state === 'land' ? 14 : 10),
  knock: 3.4,
  stun: 0.16,
  plateY: 2.0,
  deathDur: 1.7,
  heavy: true,
  rage: true,
  rageText: 'Man-eater!',
  noLift: true,
};

export const busy = (m) => BUSY.has(m.state);
export const holdsWarn = (m) => WIND.has(m.state);

const rageOf = (m) => (m.enraged || (m.puppet && m.hp < m.maxHp * 0.5) ? 1.3 : 1);
const DUR = { windup: 0.46, swipewind: 0.34, swipe1: 0.26, swipe2: 0.3, swipe3: 0.55, land: 0.5, recover: 0.55, roar: 0.95 };
const dur = (m, s) => (WIND.has(s) ? DUR[s] / rageOf(m) : DUR[s]);

function begin(m, kind, dist) {
  const g = m.game;
  m.t = 0;
  m.hitDone = false;
  if (kind === 'pounce') {
    m.state = 'windup';
    m.leapL = clamp(dist + 0.8, 5.2, 8.6);
    m.warn('line', 1.9, m.leapL, dur(m, 'windup'));
    g.audio.tone(130, 0.42, 'sawtooth', 0.07, 70);
  } else {
    m.state = 'swipewind';
    m.warn('line', 2.7, 3.5, dur(m, 'swipewind'));
    g.audio.tone(100, 0.3, 'sawtooth', 0.08, -20);
  }
}

function claws(m, P, dmg, reach, arc, knock) {
  const hit = strike(m, P, { dmg, reach, arc, knock, col: COL });
  if (hit) m.game.audio.hit?.();
  return hit;
}

export function think(m, dt, c) {
  const { g, P, dx, dz, dist, sees, toP } = c;
  const rage = rageOf(m);
  const def = m.def;
  let mvx = 0;
  let mvz = 0;
  const homeD = Math.hypot(m.x - m.home.x, m.z - m.home.z);
  const leashed = homeD > 38;
  if (m.state === 'chase') {
    m.state = 'stalk';
    m.t = 0;
  }
  if (m.weave === undefined) m.weave = Math.random() < 0.5 ? -1 : 1;
  const st = m.state;
  const done = (to = 'recover') => {
    m.state = to;
    m.t = 0;
  };

  if (m.enraged && !m.roared && !WIND.has(st) && !BUSY.has(st)) {
    m.roared = true;
    m.clearWarn();
    done('roar');
    m.cd = 0.5;
    g.audio.tone(70, 0.9, 'sawtooth', 0.2, -25);
    g.shake(0.25);
    return [0, 0];
  }

  if (st === 'idle' || st === 'wander') {
    if (sees && !leashed) {
      done('stalk');
      m.cd = Math.max(m.cd, 0.7 + Math.random() * 0.7);
      m.weave = Math.random() < 0.5 ? -1 : 1;
    } else {
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 3 + Math.random() * 4;
        if (Math.random() < 0.4) m.target = { x: m.x, z: m.z };
        else {
          const a = Math.random() * TAU;
          const rr = Math.random() * 8;
          m.target = { x: m.home.x + Math.cos(a) * rr, z: m.home.z + Math.sin(a) * rr };
        }
      }
      const tx = m.target.x - m.x;
      const tz = m.target.z - m.z;
      const td = Math.hypot(tx, tz);
      if (td > 0.8) {
        const sp = leashed ? 2.4 : 1.15;
        mvx = (tx / td) * sp;
        mvz = (tz / td) * sp;
        turn(m, Math.atan2(tx, tz), 2.2, dt);
      }
    }
  } else if (st === 'stalk') {
    if ((!sees && dist > def.aggro * 1.5) || leashed) {
      m.state = 'idle';
      m.target = { x: m.home.x, z: m.home.z };
      m.wanderT = 4;
    }
    turn(m, toP, 4.6 * rage, dt);
    const near = clamp(1 - (dist - 3) / Math.max(1, def.aggro - 3), 0, 1);
    const sp = def.speed * rage * (0.26 + 0.62 * near * near + (m.hp < m.maxHp ? 0.15 : 0));
    if (dist > 2.3) {
      const fx = dx / dist;
      const fz = dz / dist;
      const wv = Math.sin(m.t * 1.25) * 0.32 * m.weave;
      mvx = (fx - fz * wv) * sp;
      mvz = (fz + fx * wv) * sp;
    } else if (dist < 1.1) {
      mvx = (-dx / Math.max(dist, 0.01)) * def.speed * 0.3;
      mvz = (-dz / Math.max(dist, 0.01)) * def.speed * 0.3;
    }
    if (m.cd <= 0 && sees) {
      if (dist < 3.2) begin(m, 'swipe', dist);
      else if (dist < 8.6 && dist > (m.enraged ? 3.4 : 4.2)) begin(m, 'pounce', dist);
      else m.cd = 0.2;
    }
  } else if (st === 'windup') {
    const d = dur(m, st);
    if (m.t < d - 0.13) turn(m, toP, 7 * rage, dt);
    if (m.t > d) {
      const L = m.leapL || 6;
      m.state = 'leap';
      m.t = 0;
      m.leapT = clamp(L / 12, 0.4, 0.65);
      m.leapFrom = { x: m.x, z: m.z };
      m.leapDir = { x: Math.sin(m.yaw), z: Math.cos(m.yaw) };
      m.vy = 11 * m.leapT;
      m.air = true;
      g.fx.dust(m.x, m.y, m.z, 7, 1.6, 0xb59a6a);
      g.audio.tone(110, 0.4, 'sawtooth', 0.11, 190);
      g.shake(0.08);
    }
  } else if (st === 'leap') {
    const L = m.leapL || 6;
    const u = clamp(m.t / m.leapT, 0, 1);
    m.moveBy(m.leapFrom.x + m.leapDir.x * L * u - m.x, m.leapFrom.z + m.leapDir.z * L * u - m.z);
    if (!m.hitDone && Math.hypot(P.pos.x - m.x, P.pos.z - m.z) < m.radius + 0.85 && claws(m, P, def.dmg + 2, 9, Math.PI, 9)) m.hitDone = true;
    if (Math.random() < dt * 40) g.fx.emit(m.x + (Math.random() - 0.5), m.y + 0.5, m.z + (Math.random() - 0.5), 0, -0.4, 0, COL[Math.floor(Math.random() * 3)], 0.08, 0.35, 0);
    if ((m.t > 0.18 && !m.air) || m.t > m.leapT + 0.25) {
      m.air = false;
      m.vy = 0;
      m.state = 'land';
      m.t = 0;
      g.fx.dust(m.x, m.y, m.z, 8, 1.8, 0xb59a6a);
      g.fx.ring(m.x, m.y + 0.2, m.z, 0xffa040, 12, 3.4, 0.1, 0.4);
      g.shake(0.2);
      g.audio.tone(60, 0.3, 'square', 0.14, -20);
      if (!m.hitDone && claws(m, P, def.dmg + 1, m.radius + 1.45, Math.PI, 8)) m.hitDone = true;
    }
  } else if (st === 'land') {
    if (m.t > dur(m, st)) {
      if (dist < 3 && rage > 1) {
        m.cd = 0;
        done('stalk');
      } else done();
    }
  } else if (st === 'swipewind') {
    turn(m, toP, 6.5 * rage, dt);
    if (m.t > dur(m, st)) {
      m.clearWarn();
      done('swipe1');
      lunge(m, 4.5, dist - m.radius * 0.8);
      m.kick = 1;
      g.audio.tone(90, 0.16, 'square', 0.11, -30);
    }
  } else if (st === 'swipe1') {
    if (!m.hitDone && m.t > 0.08) {
      m.hitDone = true;
      claws(m, P, def.dmg, m.radius + 1.55, 1.1, 6);
      g.shake(0.08);
    }
    if (m.t > dur(m, st)) {
      done('swipe2');
      turn(m, toP, 3, 1);
      lunge(m, 4, dist - m.radius * 0.8);
    }
  } else if (st === 'swipe2') {
    turn(m, toP, 4, dt);
    if (!m.hitDone && m.t > 0.1) {
      m.hitDone = true;
      claws(m, P, def.dmg, m.radius + 1.6, 1.15, 7);
      g.shake(0.1);
    }
    if (m.t > dur(m, st)) {
      if (rage > 1 && dist < 3.8) done('swipe3');
      else done();
    }
  } else if (st === 'swipe3') {
    turn(m, toP, 3, dt);
    if (!m.hitDone && m.t > 0.2) {
      m.hitDone = true;
      lunge(m, 5, dist - m.radius * 0.8);
      g.fx.ring(m.x + Math.sin(m.yaw) * 1.3, m.y + 0.2, m.z + Math.cos(m.yaw) * 1.3, 0xffa040, 10, 3, 0.1, 0.4);
      claws(m, P, def.dmg + 1, m.radius + 1.7, 1.3, 9);
      g.shake(0.16);
    }
    if (m.t > dur(m, st)) done();
  } else if (st === 'roar') {
    turn(m, toP, 2.5, dt);
    if (m.t > dur(m, st)) {
      m.state = 'stalk';
      m.cd = 0.2;
      m.t = 0;
    }
  } else if (st === 'recover') {
    if (m.t > dur(m, st)) {
      m.state = 'stalk';
      m.t = 0;
      m.cd = (0.7 + Math.random() * 0.7) / rage;
    }
  } else {
    done('stalk');
  }
  return [mvx, mvz];
}

/* ------------------------------ animation ------------------------------ */
const FRONT_CROUCH = [0.8, -1.45, 0.95];
const HIND_CROUCH = [-0.6, 1.05, -0.65];
const FRONT_STRETCH = [-1.15, 0.1, -0.35];
const HIND_STRETCH = [1.0, 0.0, 0.35];
const WALK_OFF = [0.25, 0.75, 0, 0.5];
const TROT_OFF = [0, 0.5, 0.5, 0];

function interrupt(m) {
  m.clearWarn?.();
  m.state = 'recover';
  m.t = 0;
  m.cd = 0.7;
}

export function animate(m, dt, ctx) {
  const p = m.model.parts;
  const st = m.state;
  const sc = stateClock(m, dt);
  const t = ctx.t;
  const rage = rageOf(m);
  const spd = ctx.spd;
  const kf = 1 - Math.exp(-15 * dt);
  const ka = 1 - Math.exp(-26 * dt);

  if (m.stun > 0 && WIND.has(st) && !m.puppet) interrupt(m);

  let crouch = 0;
  let stretch = 0;
  let neckX = 0;
  let headX = 0;
  let jaw = 0.12;
  let tailLow = -0.12;
  let tailTwitch = 0;
  let tailSway = 0.22;
  let ears = 0;
  let arch = 0;
  let gaitAmp = 0;
  let rise = 0;
  let wiggle = 0;
  let pawL = null;
  let pawR = null;
  let fast = false;
  let stride = 1.05;
  let lift = 1;

  const moving = clamp(spd / 1.6, 0, 1);
  if (st === 'stalk' || st === 'chase') {
    const near = clamp(spd / 3.6, 0, 1);
    crouch = 0.86 - near * 0.18;
    neckX = 0.5;
    headX = -0.28;
    jaw = 0.22 + Math.sin(t * 2.4) * 0.03;
    tailLow = -0.32;
    tailSway = 0.12;
    tailTwitch = 0.25 + (1 - near) * 0.3;
    ears = 0.85;
    gaitAmp = 0.42 + near * 0.28;
    stride = 0.62 + near * 0.35;
    lift = 1.35;
  } else if (st === 'windup') {
    const w = clamp(sc / dur(m, st), 0, 1);
    crouch = 0.9 + w * 0.1;
    neckX = 0.62;
    headX = -0.38;
    jaw = 0.3;
    tailLow = -0.2;
    tailTwitch = 1;
    ears = 1;
    wiggle = Math.sin(sc * 36) * (0.04 + w * 0.08);
    rise = w * 0.2;
  } else if (st === 'leap') {
    const u = clamp(sc / (m.leapT || 0.5), 0, 1);
    stretch = Math.sin(u * Math.PI) * 0.5 + (u > 0.5 ? (u - 0.5) * 1.1 : 0);
    stretch = clamp(stretch, 0, 1);
    crouch = 0;
    neckX = -0.15;
    headX = 0.05;
    jaw = 0.75;
    tailLow = 0.2;
    tailSway = 0.04;
    ears = 0.6;
    arch = -0.1 + u * 0.28;
    fast = true;
  } else if (st === 'land') {
    const u = clamp(sc / 0.5, 0, 1);
    crouch = 1 - u * 0.5;
    neckX = 0.35;
    jaw = 0.5 * (1 - u);
    tailLow = -0.1;
    ears = 0.6;
    fast = true;
  } else if (st === 'swipewind') {
    const w = clamp(sc / dur(m, st), 0, 1);
    crouch = 0.35 + w * 0.35;
    neckX = 0.3;
    headX = -0.2;
    jaw = 0.55 + w * 0.2;
    tailTwitch = 0.6;
    ears = 1;
    rise = w * 0.3;
    pawL = { a: [1.2 * w, 0.9 * w, 0.2], k: 1 };
    pawR = { a: [0.2, 0.2, 0], k: 1 };
  } else if (st === 'swipe1' || st === 'swipe2' || st === 'swipe3') {
    const d = dur(m, st);
    const u = clamp(sc / d, 0, 1);
    const sw = ease3(clamp(u * 2.2, 0, 1));
    crouch = 0.25;
    neckX = -0.1;
    headX = 0.1;
    jaw = 0.85;
    ears = 1;
    rise = 0.5;
    fast = true;
    if (st === 'swipe1') {
      pawL = { a: [1.2 - sw * 2.6, 0.9 - sw * 1.0, 0.2], k: 1 };
      pawR = { a: [0.3, 0.3, 0], k: 1 };
    } else if (st === 'swipe2') {
      pawR = { a: [1.2 - sw * 2.6, 0.9 - sw * 1.0, 0.2], k: 1 };
      pawL = { a: [0.3, 0.3, 0], k: 1 };
    } else {
      const up = clamp(sc / 0.2, 0, 1);
      const dn = ease3(clamp((sc - 0.2) / 0.18, 0, 1));
      const a = [-1.5 * up + (dn > 0 ? 2.2 * dn : 0), -0.2, 0];
      pawL = { a, k: 1 };
      pawR = { a, k: 1 };
      rise = 0.8 * (1 - dn * 0.6);
    }
  } else if (st === 'roar') {
    const u = clamp(sc / DUR.roar, 0, 1);
    const env = Math.sin(clamp(u * 1.15, 0, 1) * Math.PI);
    crouch = 0.1;
    neckX = -0.55 * env;
    headX = -0.4 * env;
    jaw = 0.95 * env + 0.1;
    ears = 0.8;
    rise = 0.35 * env;
    tailLow = 0.1;
    tailTwitch = 0.4;
  } else if (st === 'recover') {
    crouch = 0.35;
    neckX = 0.25;
    jaw = 0.1;
    tailLow = -0.2;
    ears = 0.4;
  } else {
    crouch = 0;
    neckX = Math.max(0, Math.sin(t * 0.7)) * 0.08;
    headX = -neckX * 0.5;
    gaitAmp = 0.5;
    stride = 0.9;
    jaw = 0.04;
    ears = Math.max(0, Math.sin(t * 0.5 + 1)) > 0.97 ? 0.4 : 0;
  }
  if (ctx.hk > 0) {
    jaw += ctx.hk * 0.4;
    ears = 1;
  }

  const gaitK = clamp(spd / 1.4, 0, 1);
  const run = clamp((spd - 2.4) / 1.6, 0, 1);
  m.gaitC = (m.gaitC || 0) + dt * TAU * (spd / stride);
  const c = m.gaitC;
  const A = gaitAmp * (st === 'idle' || st === 'wander' ? 0.8 + run * 0.5 : 1) * gaitK;
  const F = (0.9 + run * 0.4) * lift;

  const dys = [0, 0, 0, 0];
  const angs = [];
  p.legs.forEach((leg, i) => {
    const front = leg.front;
    const off = (WALK_OFF[i] * (1 - run) + TROT_OFF[i] * run) * TAU;
    const ph = c + off;
    const base = front ? FRONT_CROUCH : HIND_CROUCH;
    const str = front ? FRONT_STRETCH : HIND_STRETCH;
    const th1 = A * Math.sin(ph);
    const lf = Math.max(0, -Math.sin(ph + 0.6));
    const th2 = (front ? 1 : 0.8) * F * lf * A * 2.2;
    const th3 = front ? -th2 * 0.35 - th1 * 0.25 : -th2 * 0.55 + th1 * 0.2;
    let a = [0, 0, 0];
    for (let k = 0; k < 3; k++) a[k] = base[k] * crouch * (1 - stretch) + str[k] * stretch;
    a[0] += th1 * (1 - stretch);
    a[1] += th2 * (1 - stretch);
    a[2] += th3 * (1 - stretch);
    if (front) {
      const sp = i === 0 ? pawL : pawR;
      if (sp) {
        a = [sp.a[0], sp.a[1], sp.a[2]];
      }
    }
    const kk = pawL || pawR ? ka : kf;
    tween(leg.up, 'x', a[0], kk);
    tween(leg.mid, 'x', a[1], kk);
    tween(leg.paw, 'x', a[2], kk);
    leg.up.rotation.z += ((front ? (i === 0 ? 1 : -1) * 0.05 * crouch : 0) - leg.up.rotation.z) * kf;
    angs[i] = [leg.up.rotation.x, leg.mid.rotation.x, leg.paw.rotation.x];
    const chain = front ? TIGER_CHAINS.front : TIGER_CHAINS.hind;
    const rest = chain[chain.length - 1][0];
    dys[i] = chainEnd(chain, angs[i])[0] - rest;
  });

  let rootY = 0;
  let pitch = 0;
  if (st !== 'leap') {
    const dyF = Math.min(dys[0], dys[1]);
    const dyH = Math.min(dys[2], dys[3]);
    const wantD = (dyF + dyH) / 2;
    const wantA = (dyF - dyH) / 34;
    m._gD = (m._gD ?? wantD) + (wantD - (m._gD ?? wantD)) * kf;
    m._gA = (m._gA ?? wantA) + (wantA - (m._gA ?? wantA)) * kf;
    rootY = -clamp(m._gD, -2, 16) * TIGER_UNIT;
    pitch = clamp(m._gA, -0.5, 0.5);
  } else {
    m._gD = 0;
    m._gA = 0;
  }

  const bob = Math.sin(c * 2) * 0.012 * gaitK;
  rootY += bob;

  tween(p.chest, 'x', arch * 0.6 - wiggle * 0, kf);
  tween(p.chest, 'y', Math.sin(c) * 0.05 * gaitK * (1 - crouch * 0.5), kf);
  tween(p.hips, 'x', -arch * 0.6, kf);
  tween(p.hips, 'y', Math.sin(c + Math.PI) * 0.06 * gaitK * (1 - crouch * 0.5) + wiggle, kf);
  const breath = Math.sin(t * (st === 'windup' ? 9 : 2.6)) * (st === 'windup' ? 0.03 : 0.014);
  p.chest.scale.y += (1 + breath - p.chest.scale.y) * kf;
  tween(p.neck, 'x', neckX, kf);
  tween(p.head, 'x', headX, kf);
  tween(p.neck, 'y', ctx.lookSm * 0.45, kf);
  tween(p.head, 'y', ctx.lookSm * 0.5, kf);
  const jawT = jaw;
  tween(p.jaw, 'x', jawT, ka);
  p.ears.forEach((e, i) => {
    const sgn = i === 0 ? 1 : -1;
    const tw = Math.max(0, Math.sin(t * 7 + i * 2.1)) > 0.995 ? 0.5 : 0;
    tween(e, 'x', -0.75 * ears + tw, kf);
    tween(e, 'z', -sgn * 0.55 * ears, kf);
  });
  p.tail.forEach((seg, i) => {
    const tw = Math.sin(t * (tailTwitch > 0.9 ? 24 : 7.5) - i * 0.9) * tailTwitch * (0.2 + i * 0.28);
    tween(seg, 'y', Math.sin(t * 1.4 - i * 0.8) * tailSway * (1 + i * 0.4) + tw, kf);
    tween(seg, 'x', tailLow * (i === 0 ? 1 : 0.55) + (i === 2 ? 0.2 : 0) - arch * 0.5, kf);
  });

  if (st === 'windup') m.model.mat.emissive.setRGB(0.35 + Math.sin(t * 28) * 0.12, 0.14, 0.0);

  return { rootY: rootY + (st === 'windup' ? 0 : 0), rootX: pitch - rise * 0.5 + (st === 'leap' ? -0.1 + clamp((sc / (m.leapT || 0.5)), 0, 1) * 0.5 : 0) };
}

/* -------------------------------- death -------------------------------- */
export function dead(m, dt, c) {
  const { u, ease, side, bs, dissolve } = c;
  const o = m.obj;
  const p = m.model.parts;
  const k = ease(clamp(u / 0.5, 0, 1));
  const a = side * 1.5 * k;
  const cy = 1.0 * bs;
  o.rotation.set(0, m.yaw, a);
  o.position.set(m.x + cy * Math.sin(a) * Math.cos(m.yaw) * -1 * -1, m.y + Math.max(0, 0.42 * k * bs) , m.z - cy * Math.sin(a) * Math.sin(m.yaw) * -1 * -1);
  const tw = Math.exp(-clamp(u - 0.5, 0, 3) * 5) * Math.sin(u * 30) * 0.05;
  p.legs.forEach((leg, i) => {
    leg.up.rotation.x = (leg.front ? -0.7 : 0.5) * k + tw * (i % 2 ? 1 : -1);
    leg.mid.rotation.x = (leg.front ? -0.3 : 0.2) * k;
    leg.paw.rotation.x = 0.15 * k;
  });
  p.neck.rotation.x = 0.1 * k;
  p.head.rotation.x = 0.35 * k;
  p.jaw.rotation.x = 0.7 * k;
  p.tail.forEach((s, i) => {
    s.rotation.y = side * 0.4 * k * (i + 1) * 0.5;
    s.rotation.x = -0.1 * k;
  });
  p.ears.forEach((e) => {
    e.rotation.x = -0.6 * k;
  });
  p.chest.rotation.x = 0;
  const k2 = dissolve(1.05, 0.6, [0xe07a1e, 0x17110d, 0xf5efe2, 0xffd9a0], 4);
  o.scale.setScalar(bs * (1 - k2 * k2));
}
