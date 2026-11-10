import { clamp } from '../engine/voxel.js';
import { RAPTOR_LEG, RAPTOR_UNIT } from './raptorModel.js';
import { TAU, turn, lunge, tween, stateClock, chainEnd, strike, packmates, ease3 } from './beastMove.js';

/**
 * Battle Raptor: a fast pack hunter.
 *
 *   Chase      all-out sprint; with packmates nearby it strafes in a ring instead of stacking up
 *   Snap       a short bite (twice when enraged)
 *   Sickle     a coiled, telegraphed leap that lands both foot claws, then hops clear
 * Raptors take turns: while one is mid-attack the others circle and wait.
 */
const COL = [0x56653a, 0x6c1a1c, 0xeee2c4];
const WIND = new Set(['windup', 'bitewind']);
const BUSY = new Set(['bite', 'leap', 'roar']);
const ATTACKING = new Set(['windup', 'bitewind', 'bite', 'leap', 'land']);

export const FX = {
  spark: [0xfff2c0, 0xffb347, 0xffffff],
  burst: [0x56653a, 0x6c1a1c, 0x9a9ca1, 0xffffff],
  death: [0x56653a, 0x927b4c, 0x6c1a1c, 0x9a9ca1],
  tele: 0xc9411f,
  accel: 12,
  accelFn: (m) => (m.state === 'circle' ? 16 : m.state === 'chase' ? 13 : m.state === 'recover' || m.state === 'land' ? 15 : 10),
  knock: 3.2,
  stun: 0.18,
  plateY: 2.35,
  deathDur: 1.6,
  heavy: true,
  rage: true,
  rageText: 'Pack Frenzy!',
  noLift: true,
};

export const busy = (m) => BUSY.has(m.state);
export const holdsWarn = (m) => WIND.has(m.state);

const rageOf = (m) => (m.enraged || (m.puppet && m.hp < m.maxHp * 0.5) ? 1.3 : 1);
const DUR = { windup: 0.46, bitewind: 0.26, bite: 0.22, land: 0.3, recover: 0.36, roar: 0.85 };
const dur = (m, s) => (WIND.has(s) ? DUR[s] / rageOf(m) : DUR[s]);

function begin(m, kind, dist) {
  const g = m.game;
  m.t = 0;
  m.hitDone = false;
  if (kind === 'kick') {
    m.state = 'windup';
    m.leapL = clamp(dist + 0.6, 3.4, 7.2);
    m.warn('line', 1.55, m.leapL, dur(m, 'windup'));
    g.audio.tone(320, 0.36, 'sawtooth', 0.06, 260);
  } else {
    m.state = 'bitewind';
    m.warn('line', 1.5, 2.6, dur(m, 'bitewind'));
    g.audio.tone(240, 0.2, 'sawtooth', 0.06, 120);
  }
}

export function think(m, dt, c) {
  const { g, P, dx, dz, dist, sees, toP } = c;
  const rage = rageOf(m);
  const def = m.def;
  let mvx = 0;
  let mvz = 0;
  const homeD = Math.hypot(m.x - m.home.x, m.z - m.home.z);
  const leashed = homeD > 38;
  if (m.circleT === undefined) {
    m.circleT = 0;
    m.ringR = 3.4 + Math.random() * 1.8;
    m.orbit = m.orbitDir || (Math.random() < 0.5 ? -1 : 1);
  }
  const st = m.state;
  const done = (to = 'recover') => {
    m.state = to;
    m.t = 0;
  };

  if (m.enraged && !m.roared && !WIND.has(st) && !BUSY.has(st)) {
    m.roared = true;
    m.clearWarn();
    done('roar');
    m.cd = 0.4;
    g.audio.tone(260, 0.7, 'sawtooth', 0.14, -160);
    g.shake(0.2);
    return [0, 0];
  }

  if (st === 'idle' || st === 'wander') {
    if (sees && !leashed) {
      done('chase');
      m.cd = 0.25 + Math.random() * 0.3;
      g.audio.tone(380, 0.18, 'sawtooth', 0.05, -120);
    } else {
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 1.2 + Math.random() * 2.4;
        if (Math.random() < 0.35) m.target = { x: m.x, z: m.z };
        else {
          const a = Math.random() * TAU;
          const rr = Math.random() * 7;
          m.target = { x: m.home.x + Math.cos(a) * rr, z: m.home.z + Math.sin(a) * rr };
        }
      }
      const tx = m.target.x - m.x;
      const tz = m.target.z - m.z;
      const td = Math.hypot(tx, tz);
      if (td > 0.7) {
        const sp = leashed ? 3.2 : 1.7;
        mvx = (tx / td) * sp;
        mvz = (tz / td) * sp;
        turn(m, Math.atan2(tx, tz), 3.4, dt);
      }
    }
  } else if (st === 'chase' || st === 'circle') {
    if ((!sees && dist > def.aggro * 1.5) || leashed) {
      m.state = 'idle';
      m.target = { x: m.home.x, z: m.home.z };
      m.wanderT = 3;
      return [0, 0];
    }
    const spd = def.speed * rage;
    const mates = packmates(m, 16);
    const striking = mates.some((o) => ATTACKING.has(o.state) && o.t < 1.2);
    const fx = dx / Math.max(dist, 0.01);
    const fz = dz / Math.max(dist, 0.01);
    let sx = 0;
    let sz = 0;
    for (const o of mates) {
      const ox = m.x - o.x;
      const oz = m.z - o.z;
      const od = Math.hypot(ox, oz);
      if (od < 3.4 && od > 0.01) {
        const w = (3.4 - od) / 3.4;
        sx += (ox / od) * w;
        sz += (oz / od) * w;
      }
    }
    const circling = mates.length > 0 && dist < 13 && dist > 1.8 && (striking || m.circleT > 0);
    if (circling) {
      if (m.state !== 'circle') {
        m.state = 'circle';
        m.t = 0;
      }
      m.circleT = Math.max(0, m.circleT - dt);
      turn(m, toP, 9, dt);
      const radial = clamp((dist - m.ringR) * 0.7, -1, 1);
      mvx = (fx * radial - fz * m.orbit * 0.95) * spd * 0.85 + sx * spd * 0.9;
      mvz = (fz * radial + fx * m.orbit * 0.95) * spd * 0.85 + sz * spd * 0.9;
    } else {
      if (m.state !== 'chase') {
        m.state = 'chase';
        m.t = 0;
      }
      turn(m, toP, 9 * rage, dt);
      const wv = Math.sin(m.t * 3.1 + m.phase) * 0.12;
      if (dist > 1.7) {
        mvx = (fx - fz * wv) * spd + sx * spd * 0.6;
        mvz = (fz + fx * wv) * spd + sz * spd * 0.6;
      } else if (dist < 0.9) {
        mvx = -fx * spd * 0.45;
        mvz = -fz * spd * 0.45;
      }
    }
    const mayStrike = sees && m.cd <= 0 && !(mates.length > 0 && striking && dist > 1.9);
    if (mayStrike) {
      if (dist < 2.5) begin(m, 'bite', dist);
      else if (dist < 7 && dist > 3 && (m.kickNext ?? Math.random() < 0.5)) begin(m, 'kick', dist);
      else m.cd = 0.18;
    }
  } else if (st === 'bitewind') {
    turn(m, toP, 10 * rage, dt);
    if (m.t > dur(m, st)) {
      m.clearWarn();
      done('bite');
      lunge(m, 7.5, dist - m.radius * 0.8);
      m.kick = 1;
      g.audio.tone(200, 0.12, 'square', 0.1, -80);
    }
  } else if (st === 'bite') {
    if (!m.hitDone && m.t > 0.06) {
      m.hitDone = true;
      if (strike(m, P, { dmg: def.dmg, reach: m.radius + 1.7, arc: 0.95, knock: 5, col: COL })) g.audio.hit?.();
    }
    if (m.t > dur(m, st)) {
      if (rage > 1 && !m.second && dist < 3) {
        m.second = true;
        begin(m, 'bite', dist);
        m.t = 0.1;
      } else {
        m.second = false;
        done();
      }
    }
  } else if (st === 'windup') {
    const d = dur(m, st);
    if (m.t < d - 0.12) turn(m, toP, 8 * rage, dt);
    if (m.t > d) {
      const L = m.leapL || 5;
      m.state = 'leap';
      m.t = 0;
      m.leapT = clamp(L / 14, 0.3, 0.5);
      m.leapFrom = { x: m.x, z: m.z };
      m.leapDir = { x: Math.sin(m.yaw), z: Math.cos(m.yaw) };
      m.vy = 11 * m.leapT;
      m.air = true;
      g.fx.dust(m.x, m.y, m.z, 6, 1.3, 0xb59a6a);
      g.audio.tone(180, 0.3, 'sawtooth', 0.1, 220);
    }
  } else if (st === 'leap') {
    const L = m.leapL || 5;
    const u = clamp(m.t / m.leapT, 0, 1);
    m.moveBy(m.leapFrom.x + m.leapDir.x * L * u - m.x, m.leapFrom.z + m.leapDir.z * L * u - m.z);
    if (!m.hitDone && Math.hypot(P.pos.x - m.x, P.pos.z - m.z) < m.radius + 0.85) {
      if (strike(m, P, { dmg: def.dmg + 1, reach: 9, arc: Math.PI, knock: 8, col: COL, maxDy: 1.1 })) {
        m.hitDone = true;
        g.audio.hit?.();
      }
    }
    if ((m.t > 0.14 && !m.air) || m.t > m.leapT + 0.2) {
      m.air = false;
      m.vy = 0;
      m.state = 'land';
      m.t = 0;
      g.fx.dust(m.x, m.y, m.z, 6, 1.4, 0xb59a6a);
      if (!m.hitDone && strike(m, P, { dmg: def.dmg, reach: m.radius + 1.2, arc: Math.PI, knock: 6, col: COL })) m.hitDone = true;
      m.vx -= m.leapDir.x * 5.5;
      m.vz -= m.leapDir.z * 5.5;
    }
  } else if (st === 'land') {
    if (m.t > dur(m, st)) done();
  } else if (st === 'roar') {
    turn(m, toP, 3, dt);
    if (m.t > dur(m, st)) {
      m.state = 'chase';
      m.cd = 0.15;
      m.t = 0;
    }
  } else if (st === 'recover') {
    if (m.t > dur(m, st)) {
      m.state = 'chase';
      m.t = 0;
      m.cd = (0.45 + Math.random() * 0.5) / rage;
      m.kickNext = Math.random() < 0.5;
      if (packmates(m, 16).length) {
        m.circleT = 1.1 + Math.random() * 1.4;
        m.orbit = Math.random() < 0.5 ? -1 : 1;
      }
    }
  } else {
    done('chase');
  }
  return [mvx, mvz];
}

/* ------------------------------ animation ------------------------------ */
function interrupt(m) {
  m.clearWarn?.();
  m.state = 'recover';
  m.t = 0;
  m.cd = 0.5;
}

export function animate(m, dt, ctx) {
  const p = m.model.parts;
  const st = m.state;
  const sc = stateClock(m, dt);
  const t = ctx.t;
  const spd = ctx.spd;
  const kf = 1 - Math.exp(-16 * dt);
  const ka = 1 - Math.exp(-30 * dt);

  if (m.stun > 0 && WIND.has(st) && !m.puppet) interrupt(m);

  let crouch = 0.25;
  let lean = 0;
  let neckX = 0;
  let neckY = 0;
  let headX = 0;
  let jaw = 0.14;
  let tail = 0;
  let tailLift = 0;
  let tailSway = 0.2;
  let arm = [0.35, -0.9, 0.2];
  let armSpread = 0;
  let spike = 0;
  let gaitAmp = 0;
  let stride = 1.5;
  let legPose = null;
  let flare = 0;

  const moving = clamp(spd / 1.2, 0, 1);
  const run = clamp((spd - 1.8) / 2.6, 0, 1);

  if (st === 'chase') {
    crouch = 0.35;
    lean = 0.2 + run * 0.15;
    neckX = -0.2;
    headX = -0.12;
    jaw = 0.36 + Math.sin(t * 9) * 0.04;
    arm = [0.6, -1.3, 0.3];
    armSpread = 0.2;
    spike = -0.18;
    gaitAmp = 0.62 + run * 0.28;
    tailLift = 0.06;
    tailSway = 0.3;
  } else if (st === 'circle') {
    crouch = 0.5;
    lean = 0.12;
    neckX = -0.1;
    neckY = 0;
    headX = -0.1;
    jaw = 0.3 + Math.sin(t * 6) * 0.06;
    arm = [0.2, -0.7, 0.4];
    armSpread = 0.55;
    gaitAmp = 0.5;
    spike = 0.05 + Math.sin(t * 6) * 0.05;
    tailSway = 0.45;
    stride = 1.2;
  } else if (st === 'bitewind') {
    const w = clamp(sc / dur(m, st), 0, 1);
    crouch = 0.6;
    lean = -0.12 * w;
    neckX = -0.55 * w;
    headX = 0.1;
    jaw = 0.85;
    arm = [0.4, -1.1, 0.3];
    flare = 0.25;
    tailLift = 0.1;
  } else if (st === 'bite') {
    const u = clamp(sc / DUR.bite, 0, 1);
    const snap = ease3(clamp(u * 4, 0, 1));
    crouch = 0.5;
    lean = 0.28;
    neckX = -0.55 + snap * 1.05;
    headX = -0.2 * snap;
    jaw = u < 0.3 ? 0.85 * (1 - snap) : 0.05;
    arm = [-0.3, -0.6, 0.2];
    armSpread = 0.4;
  } else if (st === 'windup') {
    const w = clamp(sc / dur(m, st), 0, 1);
    crouch = 1;
    lean = 0.18 * w;
    neckX = 0.1;
    headX = -0.3;
    jaw = 0.5;
    arm = [0.5, -1.2, 0.4];
    tailLift = 0.25;
    flare = 0.3;
    legPose = 'coil';
  } else if (st === 'leap') {
    const u = clamp(sc / (m.leapT || 0.4), 0, 1);
    crouch = 0;
    lean = -0.45;
    neckX = 0.1;
    headX = -0.1;
    jaw = 0.7;
    arm = [-0.9, -0.2, 0];
    armSpread = 0.9;
    tailLift = -0.35;
    flare = 0.4;
    legPose = 'kick';
    m._kickU = u;
  } else if (st === 'land') {
    crouch = 0.9;
    lean = 0.1;
    neckX = 0.1;
    jaw = 0.2;
    arm = [0.3, -0.8, 0.3];
    tailLift = 0.1;
  } else if (st === 'roar') {
    const u = clamp(sc / DUR.roar, 0, 1);
    const env = Math.sin(clamp(u * 1.1, 0, 1) * Math.PI);
    crouch = 0.1;
    lean = -0.25 * env;
    neckX = -0.75 * env;
    headX = -0.35 * env;
    jaw = 0.1 + 0.9 * env;
    arm = [-0.35, -0.5, 0.4];
    armSpread = 0.8 * env;
    flare = 0.5 * env;
    tailLift = 0.15;
  } else if (st === 'recover') {
    crouch = 0.3;
    neckX = -0.15;
    jaw = 0.25;
    arm = [0.3, -1.0, 0.3];
    flare = 0.1;
  } else {
    crouch = 0.28;
    lean = 0.06;
    const scan = Math.sin(t * 0.9) * 0.6 + (Math.sin(t * 3.7) > 0.93 ? 0.35 : 0);
    neckY = scan;
    neckX = -0.1 + Math.max(0, Math.sin(t * 1.7)) * 0.08;
    headX = 0.05;
    jaw = 0.1 + Math.max(0, Math.sin(t * 0.6)) * 0.06;
    arm = [0.25, -1.15, 0.3];
    gaitAmp = 0.48;
    stride = 1.0;
    spike = Math.sin(t * 1.5) * 0.04;
    tailSway = 0.25;
  }
  if (ctx.hk > 0) {
    jaw += ctx.hk * 0.5;
    flare += ctx.hk * 0.4;
  }

  const gaitK = clamp(spd / 1.2, 0, 1);
  m.gaitC = (m.gaitC || 0) + dt * TAU * (spd / stride);
  const c = m.gaitC;
  const A = gaitAmp * gaitK;
  const dys = [];
  p.legs.forEach((leg, i) => {
    const ph = c + i * Math.PI;
    const th1 = A * Math.sin(ph);
    const lf = Math.max(0, -Math.sin(ph + 0.55));
    let a = [0, 0, 0, 0];
    const cr = crouch;
    a[0] = -0.5 * cr + th1;
    a[1] = 0.85 * cr + lf * A * 2.0;
    a[2] = -0.45 * cr - lf * A * 0.9;
    a[3] = 0.3 * cr + lf * A * 0.3 - th1 * 0.5;
    if (legPose === 'coil') {
      a = [-0.95, 1.5, -0.85, 0.5];
    } else if (legPose === 'kick') {
      const u = m._kickU || 0;
      a = [-1.25 + u * 0.25, 0.4, -0.7, -0.25];
    }
    const kk = legPose ? ka : kf;
    tween(leg.thigh, 'x', a[0], kk);
    tween(leg.shin, 'x', a[1], kk);
    tween(leg.meta, 'x', a[2], kk);
    tween(leg.foot, 'x', a[3], kk);
    const ang = [leg.thigh.rotation.x, leg.shin.rotation.x, leg.meta.rotation.x, leg.foot.rotation.x];
    dys[i] = chainEnd(RAPTOR_LEG, ang)[0] - RAPTOR_LEG[4][0];
  });

  let rootY = 0;
  if (st !== 'leap') {
    const want = Math.min(dys[0], dys[1]);
    m._gD = (m._gD ?? want) + (want - (m._gD ?? want)) * kf;
    rootY = -clamp(m._gD, -3, 24) * RAPTOR_UNIT;
  } else m._gD = 0;
  rootY += Math.abs(Math.sin(c)) * 0.012 * gaitK * run;

  p.arms.forEach((arm3, i) => {
    const sgn = i === 0 ? 1 : -1;
    const swing = -Math.sin(c + i * Math.PI) * 0.25 * gaitK;
    tween(arm3.up, 'x', arm[0] + swing, kf);
    tween(arm3.fore, 'x', arm[1] - Math.abs(swing) * 0.3, kf);
    tween(arm3.hand, 'x', arm[2], kf);
    tween(arm3.up, 'z', -sgn * armSpread, kf);
    tween(arm3.hand, 'z', sgn * armSpread * 0.2, kf);
  });

  const breath = Math.sin(t * 3.4) * 0.012;
  p.torso.scale.y += (1 + breath - p.torso.scale.y) * kf;
  tween(p.torso, 'y', Math.sin(c) * 0.05 * gaitK * run, kf);
  tween(p.neck, 'x', neckX - lean * 0.6, kf);
  tween(p.neck, 'y', neckY + ctx.lookSm * 0.5 - Math.sin(c) * 0.05 * gaitK, kf);
  tween(p.head, 'x', headX - lean * 0.3, kf);
  tween(p.head, 'y', ctx.lookSm * 0.4, kf);
  tween(p.jaw, 'x', jaw, ka);
  p.tail.forEach((seg, i) => {
    tween(seg, 'y', Math.sin(t * (st === 'circle' ? 5 : 2.2) - i * 0.9 + (m.phase || 0)) * tailSway * (0.7 + i * 0.4) - Math.sin(c) * 0.12 * gaitK * run * (i + 1), kf);
    tween(seg, 'x', tailLift * (1 + i * 0.3) + lean * 0.7 * (i === 0 ? 1 : 0.3), kf);
  });
  p.spikes.forEach((sp, i) => {
    tween(sp, 'x', spike + flare + Math.sin(t * 5.5 - i * 0.55) * (0.05 + flare * 0.2), kf);
  });

  if (st === 'windup') m.model.mat.emissive.setRGB(0.32 + Math.sin(t * 28) * 0.12, 0.05, 0.02);

  return { rootY, rootX: lean * 0.55 };
}

/* -------------------------------- death -------------------------------- */
export function dead(m, dt, c) {
  const { u, ease, side, bs, dissolve } = c;
  const o = m.obj;
  const p = m.model.parts;
  const kF = ease(clamp(u / 0.55, 0, 1));
  const a = side * Math.PI * 0.93 * kF;
  const cy = 1.1 * bs;
  const lx = -cy * Math.sin(a);
  const ly = cy * Math.cos(a);
  const wantY = cy + (0.45 * bs - cy) * kF;
  o.rotation.set(0, m.yaw, a);
  o.position.set(m.x - lx * Math.cos(m.yaw), m.y + (wantY - ly), m.z + lx * Math.sin(m.yaw));
  const tw = Math.exp(-clamp(u - 0.55, 0, 3) * 4) * Math.sin(u * 26) * 0.12;
  const curl = ease(clamp((u - 0.1) / 0.7, 0, 1));
  p.legs.forEach((leg, i) => {
    leg.thigh.rotation.x = -0.9 * curl + tw * (i ? 1 : -1);
    leg.shin.rotation.x = 1.1 * curl;
    leg.meta.rotation.x = -0.7 * curl;
    leg.foot.rotation.x = 0.5 * curl;
  });
  p.arms.forEach((arm3, i) => {
    arm3.up.rotation.x = -0.6 * curl;
    arm3.fore.rotation.x = -1.0 * curl + tw;
    arm3.hand.rotation.x = 0.4 * curl;
    arm3.up.rotation.z = (i ? 1 : -1) * 0.3 * curl;
  });
  p.neck.rotation.x = -0.5 * kF;
  p.head.rotation.x = -0.3 * kF;
  p.jaw.rotation.x = 0.8 * kF;
  p.tail.forEach((s, i) => {
    s.rotation.x = 0.35 * curl;
    s.rotation.y = side * 0.5 * curl * (i + 1) * 0.5;
  });
  p.spikes.forEach((sp) => {
    sp.rotation.x = -0.25 * curl;
  });
  const k2 = dissolve(1.05, 0.5, [0x56653a, 0x927b4c, 0x6c1a1c, 0x9a9ca1], 4);
  o.scale.setScalar(bs * (1 - k2 * k2));
}
