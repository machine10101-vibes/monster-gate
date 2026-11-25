import { clamp } from '../engine/voxel.js';
import { TAU, angDiff, turn, lunge, tween, stateClock, ease3 } from './beastMove.js';

/**
 * Tyrant Rex: a level 200 apex predator.
 *
 * He walks a patrol from the Lagoon, through the Sunken jungle, down to Pirate
 * Shore and back, and anything that crosses his path is prey: the hunter, a
 * raptor, a tiger, a pirate on the docks. His moves:
 *
 *   Roar       on first sight, and when he enrages: the ground shakes
 *   Chomp      head drawn back, jaws flung wide, then a lunging bite that kills
 *              smaller monsters outright
 *   Stomp      rears onto one leg and drives it down: a shockwave ring
 *   Tail Sweep coils his hips, then spins the tail through everything behind
 *              and beside him
 *   Charge     lowers his head and thunders forward, trampling what's in front
 *
 * Kills he makes on other monsters give the hunter nothing (see onMonsterKilled).
 */
const COL = [0x56702e, 0x8a2a24, 0xc8b07e];
const WIND = new Set(['bitewind', 'stompwind', 'tailwind', 'chargewind']);
const BUSY = new Set([...WIND, 'bite', 'stomp', 'tail', 'charge', 'roar']);

export const FX = {
  spark: [0xfff2c0, 0xffb347, 0xffffff],
  burst: [0x56702e, 0x8a2a24, 0xc8b07e, 0xffffff],
  death: [0x56702e, 0x3d5222, 0x8a2a24, 0xc8b07e],
  tele: 0xd8401c,
  accel: 6,
  accelFn: (m) => (m.state === 'charge' ? 14 : m.state === 'roam' ? 4 : 7),
  knock: 9,
  stun: 0.04,
  plateY: 6.2,
  deathDur: 2.6,
  heavy: true,
  rage: true,
  rageText: 'Apex Fury!',
  slowmo: true,
  noLift: true,
};

export const busy = (m) => BUSY.has(m.state);
export const holdsWarn = (m) => WIND.has(m.state);

const rageOf = (m) => (m.enraged || (m.puppet && m.hp < m.maxHp * 0.5) ? 1.3 : 1);
const DUR = { bitewind: 0.62, bite: 0.42, stompwind: 0.85, stomp: 0.6, tailwind: 0.7, tail: 0.55, chargewind: 0.75, charge: 1.15, roar: 1.6, recover: 0.6 };
const dur = (m, s) => (WIND.has(s) ? DUR[s] / rageOf(m) : DUR[s]);

const SCALE = 3;
const BITE_REACH = 7.2;
const STOMP_R = 8.5;
const TAIL_R = 9.5;
const PREY_RANGE = 26;

/* ------------------------------------------------------------------ */
/* patrol route: The Lagoon -> Sunken -> Pirate Shore and back          */
/* ------------------------------------------------------------------ */

const ROUTE_KINDS = ['lagoon', 'sunken', 'pirateshore'];

function landSpot(w, x, z) {
  for (let r = 0; r < 60; r += 4)
    for (let a = 0; a < TAU; a += 0.5) {
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      if (!w.playable(px, pz) || w.isWater(px, pz)) continue;
      const hh = w.heightAt(px, pz);
      if (hh < 1 || hh > 7) continue;
      return { x: px, z: pz };
    }
  return null;
}

/** Waypoints down the strip of jungle tiles, two per tile, north to south. */
export function trexRoute(world) {
  const lands = world.jungle?.lands || [];
  const pts = [];
  for (const kind of ROUTE_KINDS) {
    const land = lands.find((l) => l.kind === kind);
    if (!land) continue;
    for (const f of [0.3, 0.72]) {
      const p = landSpot(world, land.x0 + 72, land.z0 + 144 * f);
      if (p) pts.push(p);
    }
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/* prey                                                                */
/* ------------------------------------------------------------------ */

/** The closest living thing he can eat: the hunter, or any other monster. */
function choosePrey(m, c) {
  const { g, P, dist, sees } = c;
  let best = !P.dead && sees && dist < m.def.aggro ? { kind: 'player', d: dist } : null;
  for (const o of g.monsters) {
    if (o === m || o.dead || o.puppet || o.serverAuthoritative || o.type === m.type) continue;
    const d = Math.hypot(o.x - m.x, o.z - m.z);
    if (d > PREY_RANGE) continue;
    // He would rather finish the hunter, but anything close is fair game.
    const score = d + (best?.kind === 'player' ? 6 : 0);
    if (!best || score < best.d) best = { kind: 'mob', mob: o, d: score };
  }
  return best;
}

function preyPos(m, P) {
  if (m.prey?.kind === 'mob' && m.prey.mob && !m.prey.mob.dead) return { x: m.prey.mob.x, z: m.prey.mob.z, y: m.prey.mob.y, r: m.prey.mob.radius };
  return { x: P.pos.x, z: P.pos.z, y: P.pos.y, r: 0.4 };
}

/** Damage another monster. Kills credited to the rex give the hunter no loot. */
function maul(m, o, dmg, knock) {
  if (!o || o.dead || o.puppet || o.serverAuthoritative) return;
  const dx = o.x - m.x;
  const dz = o.z - m.z;
  const d = Math.hypot(dx, dz) || 1;
  o.slainBy = m.type;
  o.takeHit(dmg, dx / d, dz / d, knock, false);
  if (!o.dead) delete o.slainBy;
}

/** Hit everything in a circle (or an arc) around a point: hunter and monsters alike. */
function smash(m, c, x, z, r, dmg, knock, arc = Math.PI, yaw = m.yaw) {
  const { g, P } = c;
  let hit = false;
  const inArc = (tx, tz) => {
    const dd = Math.hypot(tx - x, tz - z);
    if (dd > r) return false;
    return arc >= Math.PI || Math.abs(angDiff(yaw, Math.atan2(tx - x, tz - z))) < arc;
  };
  if (!P.dead && inArc(P.pos.x, P.pos.z) && P.pos.y < g.world.heightAt(P.pos.x, P.pos.z) + 1.6) {
    if (P.hurt(dmg, m.x, m.z, knock)) {
      g.fx.burst(P.pos.x, P.pos.y + 1, P.pos.z, COL, 10, 3.6, 0.1, 0.45);
      hit = true;
    }
  }
  for (const o of g.monsters) {
    if (o === m || o.dead || o.type === m.type) continue;
    if (inArc(o.x, o.z)) maul(m, o, dmg * 4, knock);
  }
  return hit;
}

function roar(m, g) {
  m.state = 'roar';
  m.t = 0;
  g.audio.tone(55, 1.3, 'sawtooth', 0.2, -25);
  g.audio.tone(110, 0.9, 'square', 0.07, -50);
  g.shake(0.5);
  g.fx.shockwave(m.x, m.y, m.z, 0xd9c9a0, 4.5);
  g.fx.ring(m.x, m.y + 0.5, m.z, 0xd8401c, 22, 7, 0.12, 0.6);
}

function begin(m, atk, tgt) {
  const g = m.game;
  m.t = 0;
  m.hitDone = false;
  m.atk = atk;
  if (atk === 'bite') {
    m.state = 'bitewind';
    m.warn('line', 3.6, BITE_REACH, dur(m, 'bitewind'));
    g.audio.tone(90, 0.5, 'sawtooth', 0.1, 60);
  } else if (atk === 'stomp') {
    m.state = 'stompwind';
    m.warn('circle', STOMP_R, 0, dur(m, 'stompwind'), true);
    g.audio.tone(70, 0.6, 'sawtooth', 0.1, -20);
  } else if (atk === 'tail') {
    m.state = 'tailwind';
    m.warn('circle', TAIL_R, 0, dur(m, 'tailwind'), true);
    g.audio.tone(130, 0.5, 'triangle', 0.08, -60);
  } else {
    m.state = 'chargewind';
    m.chargeL = clamp(Math.hypot(tgt.x - m.x, tgt.z - m.z) + 3, 10, 24);
    m.warn('line', 4.4, m.chargeL, dur(m, 'chargewind'));
    g.audio.tone(60, 0.7, 'sawtooth', 0.12, 40);
  }
}

function pickAttack(m, d, behind) {
  const r = Math.random();
  if (behind && d < TAIL_R) return 'tail';
  if (d < BITE_REACH) return r < 0.55 ? 'bite' : r < 0.85 ? 'stomp' : 'tail';
  if (d < 12) return r < 0.5 ? 'stomp' : 'charge';
  if (d < 26) return r < 0.7 ? 'charge' : null;
  return null;
}

/* ------------------------------------------------------------------ */
/* brain                                                               */
/* ------------------------------------------------------------------ */

export function think(m, dt, c) {
  const { g, P } = c;
  const rage = rageOf(m);
  let mvx = 0;
  let mvz = 0;
  if (!m.route) {
    m.route = trexRoute(g.world);
    m.wp = 0;
    m.wpDir = 1;
    if (!m.state || m.state === 'idle') m.state = 'roam';
  }
  m.preyT = (m.preyT || 0) - dt;
  if (m.preyT <= 0) {
    m.preyT = 0.5;
    const pick = choosePrey(m, c);
    if (pick && !BUSY.has(m.state) && m.state !== 'recover') {
      if (!m.prey && pick.kind === 'player' && !m.roared) {
        m.roared = true;
        m.prey = pick;
        roar(m, g);
        return [0, 0];
      }
      m.prey = pick;
      if (m.state === 'roam' || m.state === 'idle' || m.state === 'wander') m.state = 'chase';
    } else if (!pick && m.state === 'chase') {
      m.prey = null;
      m.state = 'roam';
    }
  }
  if (m.prey?.kind === 'mob' && m.prey.mob?.dead) {
    m.prey = null;
    if (!BUSY.has(m.state)) m.state = 'roam';
  }
  const tgt = preyPos(m, P);
  const tdx = tgt.x - m.x;
  const tdz = tgt.z - m.z;
  const td = Math.hypot(tdx, tdz) || 1;
  const toT = Math.atan2(tdx, tdz);
  const st = m.state;

  if (st === 'roam' || st === 'idle' || st === 'wander') {
    m.state = 'roam';
    const wp = m.route[m.wp];
    if (wp) {
      const wx = wp.x - m.x;
      const wz = wp.z - m.z;
      const wd = Math.hypot(wx, wz);
      m.wpT = (m.wpT || 0) + dt;
      if (wd < 6 || m.wpT > 30) {
        // Reached it, or water and cliffs kept him from it: on to the next one.
        m.wpT = 0;
        if (m.wp + m.wpDir < 0 || m.wp + m.wpDir >= m.route.length) m.wpDir *= -1;
        m.wp += m.wpDir;
      } else {
        turn(m, Math.atan2(wx, wz), 1.1, dt);
        const sp = m.def.speed * 0.5;
        mvx = Math.sin(m.yaw) * sp;
        mvz = Math.cos(m.yaw) * sp;
      }
    }
  } else if (st === 'chase') {
    turn(m, toT, 2.2 * rage, dt);
    const face = Math.abs(angDiff(m.yaw, toT));
    if (td > BITE_REACH * 0.8 && face < 0.9) {
      const sp = m.def.speed * (m.prey?.kind === 'mob' ? 1.05 : 0.9) * rage;
      mvx = Math.sin(m.yaw) * sp;
      mvz = Math.cos(m.yaw) * sp;
    }
    if (m.cd <= 0) {
      const atk = pickAttack(m, td - (tgt.r || 0), face > 2.2);
      if (atk) begin(m, atk, tgt);
      else m.cd = 0.3;
    }
  } else if (st === 'roar') {
    turn(m, toT, 1.4, dt);
    if (m.t > 0.35 && m.t < 1.1 && Math.random() < dt * 10) g.shake(0.12);
    if (m.t > dur(m, 'roar')) {
      m.state = 'chase';
      m.cd = 0.4;
    }
  } else if (st === 'bitewind') {
    turn(m, toT, 3.4 * rage, dt);
    if (m.t > dur(m, st)) {
      m.clearWarn();
      m.state = 'bite';
      m.t = 0;
      lunge(m, 9, td - 2);
      g.audio.tone(160, 0.18, 'square', 0.12, -120);
    }
  } else if (st === 'bite') {
    if (!m.hitDone && m.t > 0.1) {
      m.hitDone = true;
      const jx = m.x + Math.sin(m.yaw) * BITE_REACH * 0.6;
      const jz = m.z + Math.cos(m.yaw) * BITE_REACH * 0.6;
      smash(m, c, m.x, m.z, BITE_REACH, m.def.dmg + 6, 12, 0.6);
      if (m.prey?.kind === 'mob') maul(m, m.prey.mob, m.def.dmg * 12, 6);
      g.fx.burst(jx, m.y + 3.4, jz, [0xf0e6cc, 0xa04a50, 0xffffff], 14, 4, 0.12, 0.45);
      g.shake(0.3);
      g.punch(0.25);
    }
    if (m.t > dur(m, st)) done(m, 0.55);
  } else if (st === 'stompwind') {
    turn(m, toT, 1.2, dt);
    if (m.t > dur(m, st)) {
      m.clearWarn();
      m.state = 'stomp';
      m.t = 0;
    }
  } else if (st === 'stomp') {
    if (!m.hitDone && m.t > 0.12) {
      m.hitDone = true;
      const fx = m.x + Math.sin(m.yaw) * 2.4;
      const fz = m.z + Math.cos(m.yaw) * 2.4;
      smash(m, c, fx, fz, STOMP_R, m.def.dmg + 2, 16);
      g.fx.shockwave(fx, m.y, fz, 0xd9c9a0, STOMP_R * 0.6);
      g.fx.ring(fx, m.y + 0.3, fz, 0xb39a68, 26, STOMP_R, 0.14, 0.6);
      g.fx.dust(fx, m.y, fz, 18, 4.5);
      g.vfx.scorch(fx, fz, 3.2, 0x2a1e10, 0.4, 4);
      g.shake(0.6);
      g.punch(0.35);
      g.audio.tone(50, 0.5, 'square', 0.16, -30);
    }
    if (m.t > dur(m, st)) done(m, 0.75);
  } else if (st === 'tailwind') {
    if (m.t > dur(m, st)) {
      m.clearWarn();
      m.state = 'tail';
      m.t = 0;
      m.spinFrom = m.yaw;
    }
  } else if (st === 'tail') {
    // The whole body spins so the tail sweeps a full circle.
    m.yaw = m.spinFrom + ease3(clamp(m.t / dur(m, 'tail'), 0, 1)) * TAU;
    if (!m.hitDone && m.t > 0.18) {
      m.hitDone = true;
      smash(m, c, m.x, m.z, TAIL_R, m.def.dmg + 3, 18);
      g.vfx.slashArc(m.x, m.y + 2.2, m.z, m.yaw, { radius: TAIL_R, thick: 2.6, sweep: TAU - 0.2, color: 0xb39a68, hot: 0xfff2c0, life: 0.4, sweepT: 0.3, tail: 0.9 });
      g.fx.dust(m.x, m.y, m.z, 14, 5);
      g.shake(0.35);
    }
    if (m.t > dur(m, st)) done(m, 0.7);
  } else if (st === 'chargewind') {
    turn(m, toT, 2 * rage, dt);
    if (m.t > dur(m, st)) {
      m.clearWarn();
      m.state = 'charge';
      m.t = 0;
      m.trampled = new Set();
      g.audio.tone(45, 1, 'sawtooth', 0.14, 30);
    }
  } else if (st === 'charge') {
    const sp = m.def.speed * 3.4 * rage;
    mvx = Math.sin(m.yaw) * sp;
    mvz = Math.cos(m.yaw) * sp;
    // Trample: anything under his feet or jaws as he passes.
    const hx = m.x + Math.sin(m.yaw) * 3;
    const hz = m.z + Math.cos(m.yaw) * 3;
    if (!m.trampled.has('P') && !P.dead && Math.hypot(P.pos.x - hx, P.pos.z - hz) < 4.2) {
      m.trampled.add('P');
      if (P.hurt(m.def.dmg + 4, m.x, m.z, 20)) g.fx.burst(P.pos.x, P.pos.y + 1, P.pos.z, COL, 12, 4, 0.1, 0.5);
    }
    for (const o of g.monsters) {
      if (o === m || o.dead || o.type === m.type || m.trampled.has(o)) continue;
      if (Math.hypot(o.x - hx, o.z - hz) < 4.2 + (o.radius || 0)) {
        m.trampled.add(o);
        maul(m, o, m.def.dmg * 8, 14);
      }
    }
    if (Math.random() < dt * 14) g.fx.dust(m.x, m.y, m.z, 2, 2.6);
    if (m.t > dur(m, st) || !g.world.playable(m.x + Math.sin(m.yaw) * 6, m.z + Math.cos(m.yaw) * 6)) {
      g.shake(0.25);
      done(m, 0.9);
    }
  } else if (st === 'recover') {
    if (m.t > dur(m, 'recover')) m.state = m.prey ? 'chase' : 'roam';
  }
  return [mvx, mvz];
}

function done(m, cd) {
  m.state = 'recover';
  m.t = 0;
  m.cd = cd / rageOf(m);
}

/* ------------------------------------------------------------------ */
/* body                                                                */
/* ------------------------------------------------------------------ */

export function animate(m, dt, ctx) {
  const p = m.model.parts;
  const st = m.state;
  const sc = stateClock(m, dt);
  const t = ctx.t;
  const spd = ctx.spd;
  const k = 1 - Math.exp(-10 * dt);
  const ka = 1 - Math.exp(-22 * dt);
  const g = m.game;

  // Heavy gait: long strides, weight dropping onto each foot.
  const stride = clamp(spd / 3.2, 0, 1.6);
  m.gait = (m.gait || 0) + dt * (1.6 + spd * 0.55);
  const ph = m.gait;
  const sL = Math.sin(ph);
  const sR = Math.sin(ph + Math.PI);
  let bodyY = 0;
  let pitch = 0;
  let roll = 0;
  let yaw = 0;
  let neckX = 0;
  let headX = 0;
  let jaw = 0.18 + Math.sin(t * 1.3) * 0.03;
  const legs = [sL, sR].map((s) => ({ thigh: -s * 0.42 * stride, shin: Math.max(0, -Math.cos(ph + (s === sL ? 0 : Math.PI))) * 0.55 * stride, foot: s * 0.25 * stride }));
  bodyY = -Math.abs(Math.cos(ph)) * 0.05 * stride;
  roll = Math.sin(ph) * 0.05 * stride;
  // The head stays level while the body pitches: a hunter's stabilised gaze.
  neckX = Math.cos(ph * 2) * 0.04 * stride;
  headX = -neckX * 0.8;

  // Footfalls shake the ground near him.
  const foot = Math.sin(ph) > 0 ? 1 : -1;
  if (stride > 0.25 && foot !== m.lastFoot) {
    m.lastFoot = foot;
    if (ctx.dist < 26) g.shake(0.06 + (26 - ctx.dist) * 0.004);
    g.fx.dust(m.x + Math.cos(m.yaw) * foot * 1.2, m.y, m.z - Math.sin(m.yaw) * foot * 1.2, 3, 1.4);
    if (ctx.dist < 30) g.audio.tone(42, 0.12, 'sine', 0.06, -10);
  }

  const u = clamp(sc / (dur(m, st) || 1), 0, 1);
  if (st === 'roar') {
    const r = Math.sin(clamp(sc / 1.4, 0, 1) * Math.PI);
    pitch = -0.28 * r;
    neckX = -0.55 * r;
    headX = -0.4 * r + Math.sin(t * 38) * 0.04 * r;
    jaw = 1.05 * r;
    if (Math.random() < dt * 30 * r) {
      const hx = m.x + Math.sin(m.yaw) * 5;
      const hz = m.z + Math.cos(m.yaw) * 5;
      g.fx.emit(hx, m.y + 5, hz, (Math.random() - 0.5) * 4, 2 + Math.random() * 2, (Math.random() - 0.5) * 4, 0xd9c9a0, 0.14, 0.6, -0.5);
    }
  } else if (st === 'bitewind') {
    // Rear the head back and up, jaws flung wide.
    const w = ease3(u);
    pitch = -0.12 * w;
    neckX = -0.45 * w;
    headX = -0.35 * w;
    jaw = 0.2 + 0.95 * w;
  } else if (st === 'bite') {
    // Lunge: the head drives down and forward and the jaws slam shut.
    const s = clamp(sc / 0.12, 0, 1);
    const back = clamp((sc - 0.2) / 0.22, 0, 1);
    pitch = 0.2 * s * (1 - back);
    neckX = (0.5 * s - 0.1) * (1 - back);
    headX = 0.3 * s * (1 - back);
    jaw = 1.15 * (1 - s) + 0.05;
  } else if (st === 'stompwind') {
    // Rear up on one leg, the other raised high.
    const w = ease3(u);
    pitch = -0.32 * w;
    bodyY = 0.35 * w;
    legs[0].thigh = -0.95 * w;
    legs[0].shin = 0.95 * w;
    legs[1].thigh = 0.25 * w;
    jaw = 0.5 * w;
    neckX = -0.2 * w;
  } else if (st === 'stomp') {
    // Drive it down.
    const s = clamp(sc / 0.12, 0, 1);
    const back = clamp((sc - 0.25) / 0.35, 0, 1);
    pitch = (-0.32 + 0.5 * s) * (1 - back);
    bodyY = (0.35 - 0.55 * s) * (1 - back);
    legs[0].thigh = (-0.95 + 1.05 * s) * (1 - back);
    legs[0].shin = 0.95 * (1 - s);
    jaw = 0.7 * (1 - back);
    headX = 0.2 * s * (1 - back);
  } else if (st === 'tailwind') {
    // Coil: hips turn away, tail loads up the other side.
    const w = ease3(u);
    yaw = -0.45 * w;
    bodyY = -0.1 * w;
    p.tail.forEach((sg, i) => tween(sg, 'y', 0.5 * w * (0.6 + i * 0.3), ka));
  } else if (st === 'tail') {
    // The body spins (yaw driven by the brain); the tail trails and whips.
    p.tail.forEach((sg, i) => tween(sg, 'y', -0.6 * Math.sin(clamp(sc * 6 - i * 0.6, 0, Math.PI)), ka));
    pitch = 0.08;
  } else if (st === 'chargewind') {
    // Head low, weight back, ready to explode forward.
    const w = ease3(u);
    pitch = 0.18 * w;
    neckX = 0.3 * w;
    headX = 0.1 * w;
    bodyY = -0.15 * w;
    jaw = 0.4 + 0.4 * w;
    legs[0].thigh = 0.2 * w;
    legs[1].thigh = 0.2 * w;
  } else if (st === 'charge') {
    pitch = 0.26;
    neckX = 0.32;
    headX = 0.1;
    jaw = 0.85;
  } else if (st === 'recover') {
    pitch = 0.06 * (1 - u);
  }

  // Idle breathing and an occasional head cock while he walks his patrol.
  if (st === 'roam' && stride < 0.2) {
    neckX += Math.sin(t * 0.9) * 0.05;
    headX += Math.sin(t * 0.5) * 0.08;
  }
  if (!st.endsWith('wind') && st !== 'tail') p.tail.forEach((sg, i) => tween(sg, 'y', Math.sin(ph - i * 0.7) * 0.12 * (stride + 0.25) - roll * (i + 1) * 0.5, k));
  p.tail.forEach((sg, i) => tween(sg, 'x', (i === 0 ? -0.04 : 0.02) + pitch * -0.4 + Math.sin(t * 1.1 - i) * 0.02, k));

  tween(p.torso, 'x', pitch, k);
  tween(p.torso, 'z', roll, k);
  tween(p.torso, 'y', yaw, k);
  if (m.torsoY0 == null) m.torsoY0 = p.torso.position.y;
  p.torso.position.y += (m.torsoY0 + bodyY / SCALE - p.torso.position.y) * k;
  tween(p.neck, 'x', neckX, ka);
  tween(p.neck, 'y', ctx.lookSm * 0.35, k);
  tween(p.head, 'x', headX, ka);
  tween(p.jaw, 'x', jaw, 1 - Math.exp(-30 * dt));
  p.legs.forEach((leg, i) => {
    tween(leg.thigh, 'x', legs[i].thigh, ka);
    tween(leg.shin, 'x', legs[i].shin, ka);
    tween(leg.meta, 'x', -legs[i].shin * 0.6, ka);
    tween(leg.foot, 'x', legs[i].foot - pitch * 0.5, ka);
  });
  p.arms.forEach((arm, i) => {
    tween(arm.up, 'x', Math.sin(t * 1.7 + i) * 0.12 - (st === 'roar' ? 0.4 : 0), k);
    tween(arm.fore, 'x', -0.3 + Math.sin(t * 2.1 + i) * 0.1, k);
  });

  // Rage: the amber eye blazes.
  m.model.mat.emissive.setRGB(m.enraged ? 0.08 : 0, 0, 0);
  return { rootY: 0, rootX: 0 };
}

export function dead(m, dt, c) {
  const { u, ease, side, bs, dissolve } = c;
  const o = m.obj;
  const p = m.model.parts;
  const kF = ease(clamp(u / 0.8, 0, 1));
  const a = side * Math.PI * 0.48 * kF;
  const cy = 1.0 * bs;
  const lx = -cy * Math.sin(a);
  const ly = cy * Math.cos(a);
  o.rotation.set(0, m.yaw, a);
  o.position.set(m.x - lx * Math.cos(m.yaw), m.y + (cy - ly) * 0.6, m.z + lx * Math.sin(m.yaw));
  if (!m.fellFx && u > 0.75) {
    m.fellFx = true;
    m.game.shake(0.6);
    m.game.fx.dust(m.x, m.y, m.z, 24, 6);
  }
  const tw = Math.exp(-clamp(u - 0.8, 0, 3) * 3) * Math.sin(u * 22) * 0.1;
  const curl = ease(clamp((u - 0.1) / 0.9, 0, 1));
  p.legs.forEach((leg, i) => {
    leg.thigh.rotation.x = -0.6 * curl + tw * (i ? 1 : -1);
    leg.shin.rotation.x = 0.8 * curl;
  });
  p.neck.rotation.x = 0.3 * kF;
  p.head.rotation.x = 0.2 * kF;
  p.jaw.rotation.x = 0.7 * kF;
  p.tail.forEach((s, i) => {
    s.rotation.y = side * 0.3 * curl * (i + 1) * 0.5;
  });
  const k2 = dissolve(1.6, 0.6, [0x56702e, 0xc8b07e, 0x8a2a24], 6);
  o.scale.setScalar(bs * (1 - k2 * k2));
}
