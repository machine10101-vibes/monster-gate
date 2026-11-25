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
  fireStream(m, g, dt, frenzy ? 1.25 : 1);
}

/**
 * The visible breath: a roaring cone of fire pouring from the jaws, white-hot
 * at the mouth, orange through the body of the stream and breaking into red
 * embers and smoke at its end, with light thrown along its length.
 */
function fireStream(m, g, dt, power = 1) {
  const o = mouth(m);
  const sweep = Math.sin(m.t * 3.4) * 0.22;
  const n = Math.min(14, Math.round(dt * 190 * power + Math.random()));
  for (let i = 0; i < n; i++) {
    const a = m.yaw + sweep + (Math.random() - 0.5) * 0.34;
    const sp = 11 + Math.random() * 7;
    const r = Math.random();
    const col = r < 0.22 ? 0xfff2c0 : r < 0.55 ? LAVA_HOT : r < 0.86 ? LAVA : r < 0.95 ? 0xc0200c : 0x2a1612;
    const size = r > 0.95 ? 0.34 : 0.16 + Math.random() * 0.2;
    g.fx.emit(o.x, o.y - 0.1, o.z, Math.sin(a) * sp, -1.2 - Math.random() * 2.4, Math.cos(a) * sp, col, size, 0.34 + Math.random() * 0.22, 2.2);
  }
  for (const d of [0, 2.2, 4.6]) {
    const a = m.yaw + sweep;
    g.vfx.glowNow(o.x + Math.sin(a) * d, o.y - d * 0.18, o.z + Math.cos(a) * d, d ? LAVA : 0xffe08a, (d ? 2.2 : 2.8) * power + Math.sin(m.t * 30 + d) * 0.4, 0.9);
  }
  m.streamScorch = (m.streamScorch || 0) - dt;
  if (m.streamScorch <= 0) {
    m.streamScorch = 0.18;
    const a = m.yaw + sweep;
    const d = 5 + Math.random() * 3;
    g.vfx.scorch(o.x + Math.sin(a) * d, o.z + Math.cos(a) * d, 0.9 + Math.random() * 0.6, 0x1a0a04, 0.45, 3);
  }
}

/** A roar: the dragon rears, flares its wings and bellows heat into the air. */
function roar(m, g) {
  m.roarT = 1.25;
  g.audio.tone(70, 1.0, 'sawtooth', 0.18, -35);
  g.audio.tone(140, 0.7, 'square', 0.06, -60);
  g.shake(0.35);
  g.fx.shockwave(m.x, m.y, m.z, 0xff8a24, 3.4);
  g.fx.ring(m.x, m.y + 0.4, m.z, LAVA, 20, 6, 0.12, 0.55);
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
  m.roarT = Math.max(0, (m.roarT || 0) - dt);
  m.tickStrikes(dt, P);
  const nd = dist || 1;
  const ux = dx / nd;
  const uz = dz / nd;

  if (m.state === 'idle' || m.state === 'wander') {
    if (sees && !far) {
      m.state = 'chase';
      m.cd = 1.5;
      roar(m, g);
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
    if (m.roarT > 0) {
      m.yaw += angDiff(m.yaw, toP) * Math.min(1, dt * 3);
      const o = mouth(m);
      if (Math.random() < dt * 40) g.fx.emit(o.x, o.y + 0.2, o.z, (Math.random() - 0.5) * 3, 3 + Math.random() * 3, (Math.random() - 0.5) * 3, Math.random() < 0.5 ? LAVA_HOT : LAVA, 0.14, 0.6, -1);
      return [0, 0];
    }
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
        g.fx.ring(m.x, m.y + 0.5, m.z, LAVA, 18, 7, 0.1, 0.45);
        g.shake(0.3);
        m.state = 'recover';
        m.t = 0;
        m.cd = 1.05;
      } else {
        if (dist < 8.6 && P.hurt(m.def.dmg + 4, m.x, m.z, 16)) g.fx.burst(P.pos.x, P.pos.y + 1, P.pos.z, [LAVA_HOT, 0xfff2c0], 10, 3.2, 0.1, 0.4);
        // The forefeet come down from the rear-up: the ground cracks and spits lava.
        const fx = m.x + Math.sin(m.yaw) * 3.2;
        const fz = m.z + Math.cos(m.yaw) * 3.2;
        g.fx.shockwave(fx, m.y, fz, 0xff8a24, 2.8);
        g.vfx.scorch(fx, fz, 2.4, 0x1a0a04, 0.55, 4);
        g.fx.burst(fx, m.y + 0.3, fz, [LAVA, LAVA_HOT, 0x2a1612], 16, 5, 0.14, 0.7, 12, 2.5);
        g.shake(0.4);
        g.punch(0.25);
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

/**
 * Volcanum's own animation layer, run after the shared dragon rig each frame.
 * It adds the moves that make the fight read: the lava veins beat like a
 * heart, the body heaves with each downstroke, he rears and roars when he
 * first sees a hunter, draws back before breathing and lunges into the
 * stream, rears onto his hind legs before a claw slam, coils and whips his
 * tail, and flares his wings to brake before he lands.
 */
export function volcanumPose(m, p, t, dt, { flying, diving, dive, flapRate, winding }) {
  const k = (r) => Math.min(1, dt * r);
  const towards = (obj, key, v, r) => {
    obj[key] += (v - obj[key]) * k(r);
  };

  // Lava pulse: a double heartbeat; flat out while breathing, roaring or enraged.
  const beat = Math.max(0, Math.sin(t * 2.4)) ** 6 + 0.6 * Math.max(0, Math.sin(t * 2.4 - 0.55)) ** 6;
  let glow = 0.7 + beat * 0.3;
  if (m.state === 'breath' || m.roarT > 0 || (winding && m.atk === 'breath')) glow = 0.9 + Math.random() * 0.1;
  else if (m.enraged) glow = Math.min(1, glow + 0.15);
  for (const mat of p.glowMats || []) mat.color.setScalar(glow);

  let bodyY = 7 * 0.05;
  if (flying) bodyY -= Math.cos(t * flapRate) * 0.07;
  let lean = null;
  let neckX = null;
  let headX = null;
  let jawX = null;
  let wingBase = null;
  let wingSweep = 0;
  let neckYaw = 0;
  let twist = 0;
  let frontThigh = null;
  let frontKnee = null;
  let backThigh = null;

  const roarK = m.roarT > 0 ? Math.sin(clamp((1.25 - m.roarT) / 1.25, 0, 1) * Math.PI) : 0;
  if (roarK > 0.01) {
    lean = -0.32 * roarK;
    neckX = -0.42 * roarK;
    headX = -0.5 * roarK + Math.sin(t * 40) * 0.03 * roarK;
    jawX = 1.25 * roarK;
    wingBase = 0.95;
    wingSweep = -0.3;
    frontThigh = -0.55 - 0.5 * roarK;
  } else if (winding && m.atk === 'breath') {
    // Draw the breath: rear back, chest out, wings lift.
    const w = ease(clamp(m.t / 0.85, 0, 1));
    lean = -0.3 * w;
    neckX = -0.36 * w;
    headX = -0.32 * w;
    jawX = 0.25 * w;
    wingBase = 0.35 + 0.7 * w;
    wingSweep = -0.28 * w;
  } else if (m.state === 'breath') {
    // Lunge into the stream; the head rakes across with the fire.
    lean = 0.22 + Math.sin(t * 18) * 0.02;
    neckX = 0.22;
    headX = 0.3 + Math.sin(t * 28) * 0.04;
    jawX = 1.15;
    neckYaw = Math.sin(m.t * 3.4) * 0.22;
    wingBase = 0.7;
    wingSweep = 0.15;
  } else if (winding && m.atk === 'slash') {
    // Rear up onto the hind legs, forefeet raised.
    const w = ease(clamp(m.t / 0.42, 0, 1));
    lean = -0.55 * w;
    neckX = -0.15 * w;
    headX = -0.22 * w;
    jawX = 0.65 * w;
    frontThigh = -0.55 - 1.25 * w;
    frontKnee = 0.85 + 0.65 * w;
    backThigh = 0.45 + 0.35 * w;
    wingBase = 0.35 + 0.6 * w;
    bodyY += 0.28 * w;
  } else if (m.state === 'recover' && m.atk === 'slash' && m.t >= 0 && m.t < 0.45) {
    // Crash down onto the forefeet.
    const r = 1 - m.t / 0.45;
    lean = 0.34 * r;
    headX = 0.38 * r;
    frontThigh = -0.55 + 0.5 * r;
    frontKnee = 0.85 - 0.6 * r;
    bodyY -= 0.09 * r;
  } else if (winding && m.atk === 'tail') {
    // Coil: hips turn away, tail loads up.
    const w = ease(clamp(m.t / 0.5, 0, 1));
    twist = -0.5 * w;
    p.tail.forEach((sg, i) => {
      sg.rotation.y += 0.45 * w * (0.6 + i * 0.2);
    });
  } else if (m.state === 'recover' && m.atk === 'tail' && m.t >= 0 && m.t < 0.7) {
    // Whip: hips spin through and the wave runs down the tail.
    twist = 0.65 * Math.sin(clamp(m.t / 0.35, 0, 1) * Math.PI * 0.5) * (1 - clamp((m.t - 0.3) / 0.4, 0, 1));
    p.tail.forEach((sg, i) => {
      const ph = clamp(m.t * 9 - i * 0.75, 0, Math.PI);
      sg.rotation.y -= Math.sin(ph) * (i === 0 ? 0.5 : 0.85);
    });
  }

  if (diving && dive > 0.62) {
    // Flare to brake, reach the legs down for the landing.
    const f = clamp((dive - 0.62) / 0.38, 0, 1);
    wingBase = 0.9 - 1.05 * f;
    wingSweep = -0.5 * f;
    lean = 0.6 - 0.8 * f;
    frontThigh = -1.15 + 0.4 * f;
    backThigh = -0.35 + 0.5 * f;
  }
  if (m.state === 'recover' && m.t < 0) {
    // Absorb the landing: crouch deep, wings half-folded and slammed down.
    const c = clamp(-m.t / 0.45, 0, 1);
    bodyY -= 0.2 * c;
    lean = 0.2 * c;
    wingBase = 0.95;
    wingSweep = 0.1;
  }

  towards(p.bodyG.position, 'y', bodyY, 12);
  towards(p.bodyG.rotation, 'y', twist, 12);
  if (lean != null) towards(p.bodyG.rotation, 'x', lean, 12);
  if (neckX != null && p.neck) towards(p.neck.rotation, 'x', neckX, 10);
  if (p.neck) p.neck.rotation.y += neckYaw * k(8);
  if (headX != null) towards(p.head.rotation, 'x', headX, 12);
  if (jawX != null) towards(p.jaw.rotation, 'x', jawX, 18);
  if (wingBase != null) {
    p.wings.forEach((w, i) => {
      const sgn = i === 0 ? -1 : 1;
      towards(w.rotation, 'z', sgn * (wingBase + Math.sin(t * flapRate) * 0.08), 10);
      towards(w.rotation, 'y', sgn * wingSweep, 10);
    });
  }
  p.legs.forEach((l, i) => {
    const front = i < 2;
    if (front && frontThigh != null) towards(l.rotation, 'x', frontThigh, 14);
    if (front && frontKnee != null) towards(p.knees[i].rotation, 'x', frontKnee, 14);
    if (!front && backThigh != null) towards(l.rotation, 'x', backThigh, 12);
  });
}
