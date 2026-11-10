import { clamp } from '../engine/voxel.js';

export const TAU = Math.PI * 2;

export function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export const turn = (m, to, rate, dt) => {
  m.yaw += clamp(angDiff(m.yaw, to), -rate * dt, rate * dt);
};

export const lunge = (m, v, gap = Infinity) => {
  v = Math.min(v, Math.max(0, gap) * 6);
  m.vx += Math.sin(m.yaw) * v;
  m.vz += Math.cos(m.yaw) * v;
};

export const ease3 = (t) => t * t * (3 - 2 * t);

/** Moves a rotation channel toward a target with an exponential response k (already scaled by dt). */
export function tween(o, key, target, k) {
  o.rotation[key] += (target - o.rotation[key]) * k;
}

/**
 * Per-state clock that survives network puppets (their state flips without resetting m.t).
 * Returns seconds spent in the current state.
 */
export function stateClock(m, dt) {
  if (m._bst !== m.state) {
    m._bst = m.state;
    m._bt = 0;
  }
  m._bt += dt;
  return m._bt;
}

/** Position of the end of a planar (y, z) bone chain after rotating each joint about x. */
export function chainEnd(chain, ang) {
  let y = chain[0][0];
  let z = chain[0][1];
  let a = 0;
  for (let i = 1; i < chain.length; i++) {
    let vy = chain[i][0] - chain[i - 1][0];
    let vz = chain[i][1] - chain[i - 1][1];
    a += ang[i - 1] || 0;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const ny = vy * c - vz * s;
    const nz = vy * s + vz * c;
    y += ny;
    z += nz;
    vy = ny;
    vz = nz;
  }
  return [y, z];
}

/** The hunters other than the beast that are of its own kind and still alive. */
export function packmates(m, range) {
  const g = m.game;
  const out = [];
  if (!g?.monsters) return out;
  for (const o of g.monsters) {
    if (o === m || o.dead || o.type !== m.type || o.puppet) continue;
    if (Math.hypot(o.x - m.x, o.z - m.z) < range) out.push(o);
  }
  return out;
}

/** A lateral hit test: a reach and an arc ahead of the beast, and the hunter must not be well above it. */
export function strike(m, P, o) {
  if (P.dead) return false;
  const dx = P.pos.x - m.x;
  const dz = P.pos.z - m.z;
  const d = Math.hypot(dx, dz);
  if (d > o.reach) return false;
  if (o.arc < Math.PI && Math.abs(angDiff(m.yaw, Math.atan2(dx, dz))) > o.arc) return false;
  const gy = m.game.world.heightAt(P.pos.x, P.pos.z);
  if (P.pos.y > gy + (o.maxDy ?? 1.25)) return false;
  if (!P.hurt(o.dmg, m.x, m.z, o.knock)) return false;
  m.game.fx.burst(P.pos.x, P.pos.y + 1.0, P.pos.z, o.col, 9, 3.4, 0.09, 0.4);
  return true;
}
