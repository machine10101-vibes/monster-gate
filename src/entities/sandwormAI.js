import { TILE } from '../engine/materials.js';
import { W, ZONE } from '../world/terrain.js';
import { clamp } from '../engine/voxel.js';
import { TAU, angDiff, turn, stateClock, ease3 } from './beastMove.js';

/**
 * Sand Spine Worm: a level 125 dune predator.
 *
 * It travels under the sand. Only the tips of its horns break the surface,
 * dragging a wake. When it has the hunter it surfaces and fights reared up, the
 * back half still buried, then dives and hunts again. Its moves:
 *
 *   Erupting Maw   the sand trembles under the hunter, then the worm bursts
 *                  straight up through that spot, maw first
 *   Maw Slam       rears back and whips the whole front body down in a line
 *   Tusk Cyclone   coils and spins, raking every horn through a wide circle
 *   Sand Torrent   gulps air and blasts a cone of scouring sand
 *   Dune Rupture   from below, it drives a chain of sand geysers at the hunter
 *
 * Below half health it enrages: wind-ups shorten and it stays up longer.
 */
const COL = [0xe6c67c, 0xd2ae62, 0x8f6a45, 0xf2e4c6];
const SAND = [0xe6c67c, 0xd9b98a, 0xc29e6e, 0xb8915f];
const WIND = new Set(['eruptwind', 'slamwind', 'sweepwind', 'spewwind']);
const BUSY = new Set([...WIND, 'erupt', 'slam', 'sweep', 'spew', 'rupture', 'dive']);
const BURIED = new Set(['idle', 'wander', 'burrow', 'eruptwind', 'rupture']);

export const FX = {
  spark: [0xf2e4c6, 0xe6c67c, 0xffffff],
  burst: [0xd2ae62, 0xf2e4c6, 0x8f6a45, 0xa8463e],
  death: [0xd2ae62, 0xf2e4c6, 0xa8463e, 0x5e3f2a],
  tele: 0xe6a03a,
  accel: 8,
  accelFn: (m) => (m.state === 'eruptwind' ? 26 : BURIED.has(m.state) ? 9 : 4),
  knock: 9,
  stun: 0.04,
  plateY: 6.2,
  deathDur: 2.4,
  heavy: true,
  rage: true,
  rageText: 'The Dune Hungers!',
  slowmo: true,
  noLift: true,
};

export const busy = (m) => BUSY.has(m.state);
export const holdsWarn = (m) => WIND.has(m.state);

const DUR = { eruptwind: 0.95, erupt: 0.7, slamwind: 0.85, slam: 0.65, sweepwind: 0.7, sweep: 0.7, spewwind: 0.65, spew: 1.5, rupture: 2.1, dive: 0.8 };
const rageOf = (m) => (m.enraged ? 1.3 : 1);
const dur = (m, s) => (WIND.has(s) ? DUR[s] / rageOf(m) : DUR[s]);

const ERUPT_R = 3.8;
const SLAM_L = 11;
const SLAM_W = 3.4;
const SWEEP_R = 7;
const SPEW_L = 13;
const SPEW_ARC = 0.34;
const GEYSER_R = 2.4;

/* ------------------------------------------------------------------ */
/* effects                                                             */
/* ------------------------------------------------------------------ */

function spray(g, x, y, z, n, up = 2, out = 1.6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const r = Math.random() * 0.9;
    g.fx.emit(x + Math.cos(a) * r, y, z + Math.sin(a) * r, Math.cos(a) * out * Math.random(), up * (0.6 + Math.random()), Math.sin(a) * out * Math.random(), SAND[i % SAND.length], 0.1 + Math.random() * 0.08, 0.6, 7);
  }
}

/** A column of sand thrown straight up. */
function column(g, x, y, z, h = 9) {
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * TAU;
    const r = Math.random() * 1.2;
    g.fx.emit(x + Math.cos(a) * r, y + 0.2, z + Math.sin(a) * r, Math.cos(a) * 1.2, h * (0.5 + Math.random() * 0.6), Math.sin(a) * 1.2, SAND[i % SAND.length], 0.12 + Math.random() * 0.1, 0.9, 12);
  }
  g.fx.ring(x, y + 0.2, z, 0xe6b04a, 16, 4.2, 0.12, 0.5);
}

/** Hit the hunter if they stand on the ground inside a circle (or an arc of it). */
function smash(m, c, x, z, r, dmg, knock, arc = Math.PI) {
  const { g, P } = c;
  if (P.dead) return false;
  const dx = P.pos.x - x;
  const dz = P.pos.z - z;
  if (Math.hypot(dx, dz) > r) return false;
  if (arc < Math.PI && Math.abs(angDiff(m.yaw, Math.atan2(dx, dz))) > arc) return false;
  if (P.pos.y > g.world.heightAt(P.pos.x, P.pos.z) + 1.8) return false;
  if (!P.hurt(dmg, x, z, knock)) return false;
  g.fx.burst(P.pos.x, P.pos.y + 1, P.pos.z, COL, 12, 4, 0.1, 0.5);
  g.audio.hit?.();
  return true;
}

/** Roughly where the maw is while reared, in world space. */
function mawPos(m) {
  return { x: m.x + Math.sin(m.yaw) * 2.4, y: m.y + 4.6, z: m.z + Math.cos(m.yaw) * 2.4 };
}

/* ------------------------------------------------------------------ */
/* brain                                                               */
/* ------------------------------------------------------------------ */

export function wormSand(w, x, z) {
  const land = w.landAt(x, z);
  if (!land || !w.desert?.lands.includes(land) || !w.playable(x,z)) return false;
  const i = (Math.floor(z)-land.z0)*W + Math.floor(x)-land.x0;
  return land.data.top[i] === TILE.SAND && land.data.zone[i] !== ZONE.WATER;
}
export function think(m, dt, c) {
  const { g } = c;
  let { P, dist, sees } = c;
  for (const prey of g.monsters || []) {
    if (prey === m || prey.dead || prey.type === 'sandworm' || prey.serverAuthoritative || prey.puppet || (prey.realm || 'over') !== (m.realm || 'over') || !wormSand(g.world,prey.x,prey.z)) continue;
    const d = Math.hypot(prey.x-m.x,prey.z-m.z);
    if (d >= m.def.aggro || (sees && d >= dist)) continue;
    dist = d; sees = true;
    P = { pos: { x:prey.x,y:prey.y,z:prey.z }, get dead(){return prey.dead;}, hurt(dmg,x,z,knock){ if(prey.dead) return false; const dx=prey.x-x,dz=prey.z-z,len=Math.hypot(dx,dz)||1; prey.takeHit(dmg,dx/len,dz/len,knock); return true; } };
  }
  c = { ...c, P };
  if (typeof m.wanderT !== 'number') m.wanderT = 2;
  if (typeof m.cd !== 'number') m.cd = 0;
  const leashed = !wormSand(g.world, P.pos.x, P.pos.z);
  const st = m.state;
  const toP = Math.atan2(P.pos.x - m.x, P.pos.z - m.z);
  const done = (to) => {
    m.state = to;
    m.t = 0;
    m.hitDone = false;
  };
  const gy = (x, z) => g.world.heightAt(x, z);

  if (st === 'idle' || st === 'wander' || st === 'chase') {
    if (sees && !leashed && !P.dead) {
      done('burrow');
      g.audio.tone(55, 0.6, 'sawtooth', 0.07, -20);
      return [0, 0];
    }
    m.wanderT -= dt;
    if (m.wanderT <= 0) {
      m.wanderT = 12 + Math.random() * 12;
      for (let i = 0; i < 32; i++) {
        const a = Math.random() * TAU;
        const r = 18 + Math.random() * 42;
        const x = m.x + Math.cos(a)*r, z = m.z + Math.sin(a)*r;
        if (wormSand(g.world,x,z) && [0.25,0.5,0.75].every(f => wormSand(g.world,m.x+(x-m.x)*f,m.z+(z-m.z)*f))) {
          m.wx=x; m.wz=z; break;
        }
      }
      if (!Number.isFinite(m.wx)) return [0,0];
      done('wander');
    }
    if (m.state === 'wander') {
      const tx = m.wx - m.x;
      const tz = m.wz - m.z;
      const td = Math.hypot(tx, tz);
      if (td < 1.5) { m.wanderT = 0; done('idle'); }
      else {
        turn(m, Math.atan2(tx, tz), 1.8, dt);
        if (Math.random() < dt * 8) spray(g, m.x, m.y, m.z, 1, 1.2, 1);
        return [Math.sin(m.yaw) * m.def.speed * 0.45, Math.cos(m.yaw) * m.def.speed * 0.45];
      }
    }
    return [0, 0];
  }

  // Under the sand, closing in.
  if (st === 'burrow') {
    if (Math.random() < dt * 22) spray(g, m.x - Math.sin(m.yaw) * 1.5, m.y + 0.1, m.z - Math.cos(m.yaw) * 1.5, 1, 1.6, 1.4);
    if (!sees || leashed || P.dead || dist > 34) {
      done('wander');
      return [0, 0];
    }
    turn(m, toP, 3.2, dt);
    if (m.cd <= 0 && dist > 9 && dist < 22 && Math.random() < dt * 0.9) {
      done('rupture');
      const n = 5;
      m.geys = [];
      for (let i = 0; i < n; i++) {
        const f = (i + 1) / n;
        // Each geyser aims a little ahead of the last so a hunter who stands still is caught.
        const x = m.x + (P.pos.x - m.x) * f + (Math.random() - 0.5) * 0.8;
        const z = m.z + (P.pos.z - m.z) * f + (Math.random() - 0.5) * 0.8;
        m.geys.push({ x, z, t: -i * 0.22 / rageOf(m), warned: false, hit: false });
      }
      g.audio.tone(48, 0.9, 'sawtooth', 0.08, -10);
      return [0, 0];
    }
    if (m.cd <= 0 && dist < 8.5) {
      done('eruptwind');
      m.dive = { x: P.pos.x, z: P.pos.z };
      m.eruptSlot = g.fx.telegraph(m.dive.x, gy(m.dive.x, m.dive.z), m.dive.z, 0, 'circle', ERUPT_R, 0, FX.tele, dur(m, 'eruptwind'));
      g.audio.tone(40, 0.9, 'sawtooth', 0.1, -15);
      return [0, 0];
    }
    const sp = m.def.speed * (dist > 7 ? 1.2 : 0.7);
    return [Math.sin(m.yaw) * sp, Math.cos(m.yaw) * sp];
  }

  if (st === 'rupture') {
    let all = true;
    for (const q of m.geys || []) {
      q.t += dt;
      if (q.t >= 0 && !q.warned) {
        q.warned = true;
        g.fx.telegraph(q.x, gy(q.x, q.z), q.z, 0, 'circle', GEYSER_R, 0, FX.tele, 0.55);
      }
      if (q.t >= 0 && q.t < 0.55 && Math.random() < dt * 14) spray(g, q.x, gy(q.x, q.z) + 0.1, q.z, 1, 1.4, 1.2);
      if (q.t >= 0.55 && !q.hit) {
        q.hit = true;
        const y = gy(q.x, q.z);
        column(g, q.x, y, q.z);
        g.shake(0.16);
        g.audio.tone(90, 0.3, 'square', 0.06, -50);
        smash(m, c, q.x, q.z, GEYSER_R, m.def.dmg + 1, 9);
      }
      if (!q.hit) all = false;
    }
    if (all && m.t >= dur(m, 'rupture') * 0.6) {
      m.geys = null;
      m.cd = 0.6;
      done('burrow');
    }
    return [0, 0];
  }

  // Sliding under the marked spot while the sand trembles.
  if (st === 'eruptwind') {
    if (Math.random() < dt * 40) spray(g, m.dive.x, gy(m.dive.x, m.dive.z) + 0.1, m.dive.z, 2, 1.8, 2.4);
    const tx = m.dive.x - m.x;
    const tz = m.dive.z - m.z;
    const td = Math.hypot(tx, tz);
    if (td > 0.3) turn(m, Math.atan2(tx, tz), 6, dt);
    if (m.t >= dur(m, 'eruptwind')) {
      if (m.eruptSlot) g.fx.cancelTelegraph(m.eruptSlot);
      m.eruptSlot = null;
      done('erupt');
      const y = gy(m.x, m.z);
      column(g, m.x, y, m.z, 12);
      g.fx.ring(m.x, y + 0.3, m.z, 0xffd27a, 22, 6, 0.14, 0.5);
      g.shake(0.5);
      g.audio.tone(60, 0.7, 'sawtooth', 0.16, -30);
      smash(m, c, m.x, m.z, ERUPT_R, m.def.dmg + 8, 14);
      return [0, 0];
    }
    return td > 0.3 ? [(tx / td) * Math.min(14, td * 6), (tz / td) * Math.min(14, td * 6)] : [0, 0];
  }

  if (st === 'erupt') {
    if (m.t >= DUR.erupt) {
      done('reared');
      m.upT = 0;
      m.moves = 0;
      m.cd = 0.5;
    }
    return [0, 0];
  }

  // Surfaced: reared up, the back half still buried. Pick a move, then dive.
  if (st === 'reared') {
    m.upT = (m.upT || 0) + dt;
    turn(m, toP, 1.6, dt);
    if (Math.random() < dt * 6) spray(g, m.x, m.y + 0.1, m.z, 1, 1.2, 2);
    const maxMoves = m.enraged ? 3 : 2;
    if (P.dead || !sees || leashed || dist > 20 || m.moves >= maxMoves || m.upT > 9) {
      done('dive');
      return [0, 0];
    }
    if (m.cd > 0) return [0, 0];
    const facing = Math.abs(angDiff(m.yaw, toP)) < 0.5;
    if (dist < SWEEP_R - 0.8) {
      done('sweepwind');
      m.warn('circle', SWEEP_R, 0, dur(m, 'sweepwind'), true);
      g.audio.tone(80, 0.5, 'sawtooth', 0.08, -20);
    } else if (facing && dist < SLAM_L - 0.5 && (Math.random() < 0.6 || dist < 8)) {
      done('slamwind');
      m.warn('line', SLAM_W, SLAM_L, dur(m, 'slamwind'));
      g.audio.tone(70, 0.6, 'sawtooth', 0.1, 20);
    } else if (facing && dist < SPEW_L + 2) {
      done('spewwind');
      m.warn('line', 4.6, SPEW_L, dur(m, 'spewwind'));
      g.audio.tone(120, 0.6, 'triangle', 0.08, -60);
    }
    return [0, 0];
  }

  if (st === 'slamwind' || st === 'sweepwind' || st === 'spewwind') {
    if (st !== 'sweepwind') turn(m, toP, 0.8, dt);
    if (m.t >= dur(m, st)) {
      m.clearWarn();
      done(st.replace('wind', ''));
      m.tickT = 0;
    }
    return [0, 0];
  }

  if (st === 'slam') {
    if (!m.hitDone && m.t > 0.22) {
      m.hitDone = true;
      g.shake(0.45);
      g.audio.tone(55, 0.5, 'square', 0.12, -30);
      for (let i = 1; i <= 6; i++) {
        const f = (i / 6) * SLAM_L;
        const x = m.x + Math.sin(m.yaw) * f;
        const z = m.z + Math.cos(m.yaw) * f;
        spray(g, x, gy(x, z) + 0.1, z, 5, 4, 2.2);
      }
      if (!P.dead) {
        const dx = P.pos.x - m.x;
        const dz = P.pos.z - m.z;
        const along = dx * Math.sin(m.yaw) + dz * Math.cos(m.yaw);
        const side = Math.abs(dx * Math.cos(m.yaw) - dz * Math.sin(m.yaw));
        if (along > -0.5 && along < SLAM_L + 0.5 && side < SLAM_W * 0.55 + 0.4 && P.pos.y < gy(P.pos.x, P.pos.z) + 1.8) {
          if (P.hurt(m.def.dmg + 5, m.x, m.z, 11)) {
            g.fx.burst(P.pos.x, P.pos.y + 1, P.pos.z, COL, 12, 4, 0.1, 0.5);
            g.audio.hit?.();
          }
        }
      }
    }
    if (m.t >= DUR.slam) {
      m.moves++;
      m.cd = 0.7;
      done('reared');
    }
    return [0, 0];
  }

  if (st === 'sweep') {
    // One full turn: every horn rakes the circle.
    m.yaw += (TAU / DUR.sweep) * dt * (m.spinDir || 1);
    if (Math.random() < dt * 40) {
      const a = Math.random() * TAU;
      const r = 2 + Math.random() * (SWEEP_R - 2);
      spray(g, m.x + Math.cos(a) * r, m.y + 0.1, m.z + Math.sin(a) * r, 1, 2.4, 3);
    }
    if (!m.hitDone && m.t > 0.2) {
      m.hitDone = true;
      smash(m, c, m.x, m.z, SWEEP_R, m.def.dmg + 2, 13);
      g.shake(0.25);
    }
    if (m.t >= DUR.sweep) {
      m.spinDir = -(m.spinDir || 1);
      m.moves++;
      m.cd = 0.8;
      done('reared');
    }
    return [0, 0];
  }

  if (st === 'spew') {
    turn(m, toP, 0.5, dt);
    const mp = mawPos(m);
    for (let i = 0; i < 4; i++) {
      const a = m.yaw + (Math.random() - 0.5) * SPEW_ARC * 1.6;
      const sp = 10 + Math.random() * 6;
      g.fx.emit(mp.x, mp.y, mp.z, Math.sin(a) * sp, -2.5 - Math.random() * 2, Math.cos(a) * sp, SAND[(Math.random() * SAND.length) | 0], 0.14 + Math.random() * 0.1, 0.9, 3);
    }
    m.tickT = (m.tickT || 0) + dt;
    if (m.tickT >= 0.3) {
      m.tickT = 0;
      smash(m, c, m.x, m.z, SPEW_L, 4, 3, SPEW_ARC);
    }
    if (m.t >= DUR.spew) {
      m.moves++;
      m.cd = 0.9;
      done('reared');
    }
    return [0, 0];
  }

  if (st === 'dive') {
    if (!m.hitDone && m.t > DUR.dive * 0.55) {
      m.hitDone = true;
      const x = m.x + Math.sin(m.yaw) * 2.5;
      const z = m.z + Math.cos(m.yaw) * 2.5;
      column(g, x, gy(x, z), z, 7);
      g.shake(0.2);
    }
    if (m.t >= DUR.dive) {
      m.cd = m.enraged ? 0.8 : 1.4;
      done('burrow');
    }
    return [0, 0];
  }

  done('burrow');
  return [0, 0];
}

/* ------------------------------------------------------------------ */
/* animation                                                           */
/* ------------------------------------------------------------------ */

const SINK_BURIED = -1.12;
const SINK_UP = -0.42;

/** The reared fighting stance, plus per-move key poses. b1 lifts, n1 bends, head pitches the maw. */
const POSE = {
  reared: { b1: -1.3, n1: -0.12, head: 0.95, jaw: 0.16 },
  slamwind: { b1: -1.55, n1: -0.35, head: 0.2, jaw: 0.55 },
  slam: { b1: -0.2, n1: 0.3, head: 0.5, jaw: 0.02 },
  sweepwind: { b1: -1.0, n1: 0.05, head: 0.7, jaw: 0.3 },
  sweep: { b1: -0.85, n1: 0.15, head: 0.6, jaw: 0.35 },
  spewwind: { b1: -1.45, n1: -0.35, head: 0.35, jaw: 0.6 },
  spew: { b1: -1.15, n1: -0.05, head: 1.0, jaw: 0.75 },
};

export function animate(m, dt, ctx) {
  void ctx;
  const p = m.model.parts;
  const st = m.state;
  const t = stateClock(m, dt);
  const k = Math.min(1, dt * 9);
  m.wave = (m.wave || 0) + dt * (st === 'burrow' ? 8 : st === 'rupture' ? 13 : 3.5);
  const buried = BURIED.has(st);

  // The buried half always undulates; the front joins in only underground.
  p.back.forEach((seg, i) => {
    const w = Math.sin(m.wave - (i + 2) * 0.8);
    seg.rotation.y += (w * (buried ? 0.32 : 0.14) - seg.rotation.y) * k;
    seg.rotation.z = Math.sin(m.wave * 0.5 - i) * 0.05;
  });

  let sink = SINK_BURIED;
  let pose;
  if (buried) {
    sink = st === 'eruptwind' ? SINK_BURIED - 0.25 + Math.sin(t * 40) * 0.02 : SINK_BURIED + Math.sin(m.wave * 0.5) * 0.03;
    const w = Math.sin(m.wave);
    pose = { b1: 0, n1: 0, head: st === 'eruptwind' ? -0.25 : 0.05, jaw: 0.05 };
    p.front.rotation.y += (w * 0.25 - p.front.rotation.y) * k;
    p.neck.rotation.y += (Math.sin(m.wave + 0.8) * 0.3 - p.neck.rotation.y) * k;
  } else if (st === 'erupt') {
    // Bursts straight up, maw to the sky, then folds forward over the hole.
    const u = clamp(t / 0.32, 0, 1);
    const e = ease3(u);
    const v = ease3(clamp((t - 0.36) / 0.34, 0, 1));
    sink = SINK_BURIED - 0.4 + (SINK_UP - SINK_BURIED + 0.4) * e + Math.sin(u * Math.PI) * 0.2;
    pose = { b1: -1.55 * e + 0.25 * v, n1: -0.25 * e + 0.13 * v, head: -0.2 * e + 1.15 * v, jaw: 0.9 * Math.sin(clamp(t / 0.6, 0, 1) * Math.PI) + 0.16 * v };
    snap(p, pose);
    level(p);
    return { rootY: sink, rootX: 0 };
  } else if (st === 'dive') {
    const u = ease3(clamp(t / DUR.dive, 0, 1));
    sink = SINK_UP + (SINK_BURIED - 0.55 - SINK_UP) * u;
    pose = { b1: -1.3 + 1.2 * u, n1: -0.12 + 0.4 * u, head: 0.95 + 0.2 * u, jaw: 0.16 - 0.12 * u };
  } else if (st === 'slam') {
    const u = ease3(clamp(t / 0.22, 0, 1));
    const back = ease3(clamp((t - 0.4) / 0.25, 0, 1));
    sink = SINK_UP;
    const a = POSE.slamwind;
    const b = POSE.slam;
    const c = POSE.reared;
    pose = {};
    for (const key of ['b1', 'n1', 'head', 'jaw']) pose[key] = a[key] + (b[key] - a[key]) * u + (c[key] - b[key]) * back;
    snap(p, pose);
    level(p);
    p.front.rotation.y = 0;
    return { rootY: sink, rootX: 0 };
  } else {
    sink = SINK_UP;
    pose = { ...(POSE[st] || POSE.reared) };
    const wk = WIND.has(st) ? clamp(t / 0.3, 0, 1) : 1;
    if (st === 'reared') {
      pose.b1 += Math.sin(t * 1.4) * 0.05;
      pose.head += Math.sin(t * 1.9) * 0.06;
      pose.jaw += (Math.sin(t * 2.3) * 0.5 + 0.5) * 0.12;
    }
    if (WIND.has(st)) {
      // Wind-ups tremble and the hide heats with warning.
      pose.b1 += Math.sin(t * 34) * 0.025 * wk;
      const hot = 0.15 + Math.sin(t * 22) * 0.08;
      m.model.mat.emissive.setRGB(hot, hot * 0.6, 0.02);
    }
    if (st === 'spew') pose.head += Math.sin(t * 30) * 0.03;
    const coil = st === 'sweepwind' ? -0.7 : st === 'sweep' ? 0.55 : Math.sin(t * 1.1) * 0.1;
    p.front.rotation.y += (coil - p.front.rotation.y) * k;
    p.neck.rotation.y += ((st === 'sweep' ? 0.35 : 0) - p.neck.rotation.y) * k;
  }

  p.front.rotation.x += (pose.b1 - p.front.rotation.x) * k;
  p.neck.rotation.x += (pose.n1 - p.neck.rotation.x) * k;
  p.head.rotation.x += (pose.head - p.head.rotation.x) * k;
  p.jaw.rotation.x += (pose.jaw - p.jaw.rotation.x) * Math.min(1, dt * 14);
  level(p);
  m._sink = typeof m._sink === 'number' ? m._sink + (sink - m._sink) * Math.min(1, dt * 7) : sink;
  return { rootY: m._sink, rootX: 0 };
}

/**
 * The segment behind the reared front carries on down into the hole at the same
 * slope; the one after it bends back level, so the rest of the body runs flat
 * under the dune.
 */
function level(p) {
  p.back[0].rotation.x = 0;
  p.back[1].rotation.x = -p.front.rotation.x * 0.9;
}

function snap(p, pose) {
  p.front.rotation.x = pose.b1;
  p.neck.rotation.x = pose.n1;
  p.head.rotation.x = pose.head;
  p.jaw.rotation.x = pose.jaw;
}

export function dead(m, dt, c) {
  const { u, ease, side, bs, dissolve } = c;
  const o = m.obj;
  const p = m.model.parts;
  // Topples forward out of its stance and slumps across the sand.
  const k = ease(clamp(u / 0.5, 0, 1));
  o.rotation.set(0, m.yaw, side * 0.25 * k);
  o.position.set(m.x, m.y, m.z);
  p.front.rotation.x += (0.05 - p.front.rotation.x) * k * 0.2;
  p.neck.rotation.x += (0.15 - p.neck.rotation.x) * k * 0.2;
  p.head.rotation.x += (0.35 - p.head.rotation.x) * k * 0.2;
  p.jaw.rotation.x = 0.6 * k;
  level(p);
  p.back.forEach((seg, i) => {
    seg.rotation.y = side * 0.18 * k * Math.sin(i);
  });
  m.model.root.position.y = SINK_UP + (-0.75 - SINK_UP) * k;
  const k2 = dissolve(1.05, 0.6, FX.death, 4);
  o.scale.setScalar(bs * (1 - k2 * k2));
  void dt;
}
