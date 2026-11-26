import { RNG, hash3, jitter, shade } from '../engine/voxel.js';
import { YETI } from '../data/yeti.js';

// Surface-grown, directional fur, faceted ice and tapered claws. All positions
// are local voxel coordinates: no new bones or changes to the Yeti combat rig.
const TAU = Math.PI * 2;
function furPlates(M, cx, cy, cz, rx, ry, rz, seed, count, length, drop = -0.7) {
  const rng = new RNG(seed);
  for (let i = 0; i < count; i++) {
    const u = rng.range(-0.90, 0.92), angle = rng.range(0, TAU);
    const circle = Math.sqrt(1 - u * u);
    const nx = Math.cos(angle) * circle, nz = Math.sin(angle) * circle;
    const sx = cx + nx * rx, sy = cy + u * ry, sz = cz + nz * rz;
    const L = rng.int(Math.max(2, length - 2), length + 2);
    const flare = rng.range(0.3, 0.75);
    for (let k = 0; k <= L; k++) {
      const t = k / L;
      const x = Math.round(sx + nx * flare * k);
      const y = Math.round(sy + (drop + u * 0.36) * k);
      const z = Math.round(sz + nz * flare * k);
      const width = t < 0.30 ? 1.45 : t < 0.72 ? 1.0 : 0.48;
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          if (Math.hypot(dx, dz) > width) continue;
          const c = t > 0.7 ? YETI.furWhite : t > 0.33 ? YETI.furHi :
            (hash3(x + dx, y, z + dz, seed) > 0.35 ? YETI.fur : YETI.ice);
          M.set(x + dx, y, z + dz, jitter(c, 0.04, hash3(x + dx, y, z + dz, seed + 3)));
        }
    }
  }
}
function iceFlakes(M, cx, cy, cz, rx, ry, rz, seed, count) {
  const rng = new RNG(seed);
  for (let i = 0; i < count; i++) {
    const u = rng.range(-0.84, 0.84), a = rng.range(0, TAU);
    const v = Math.sqrt(1 - u * u), nx = Math.cos(a) * v, nz = Math.sin(a) * v;
    const x0 = cx + nx * rx, y0 = cy + u * ry, z0 = cz + nz * rz;
    const L = rng.int(2, 5);
    for (let k = 0; k <= L; k++) {
      const x = Math.round(x0 + nx * k * 0.6), y = Math.round(y0 - k * 0.6), z = Math.round(z0 + nz * k * 0.6);
      M.set(x, y, z, k === L ? YETI.iceHi : k > 1 ? YETI.ice : YETI.iceDeep);
    }
  }
}
function crystal(M, x, y, z, dx, dy, dz, len, r0 = 1.6) {
  const norm = Math.hypot(dx, dy, dz) || 1;
  for (let k = 0; k <= len; k++) {
    const t = k / len, r = Math.max(0.5, r0 * (1 - t));
    const X = Math.round(x + dx / norm * k), Y = Math.round(y + dy / norm * k), Z = Math.round(z + dz / norm * k);
    for (let a = -Math.ceil(r); a <= Math.ceil(r); a++)
      for (let b = -Math.ceil(r); b <= Math.ceil(r); b++)
        for (let c = -Math.ceil(r); c <= Math.ceil(r); c++) {
          if (a * a + b * b + c * c <= r * r)
            M.set(X + a, Y + b, Z + c, t > 0.7 ? YETI.iceHi : t > 0.28 ? YETI.ice : YETI.iceDeep);
        }
  }
}
function talon(M, x, y, z, dx, dy, dz, length, radius, seed, tooth = false) {
  for (let i = 0; i <= length; i++) {
    const t = i / length, r = Math.max(0.46, radius * (1 - t * 0.95));
    const px = x + dx * i, py = y + dy * i - (tooth ? 0 : t * t * 1.7);
    const pz = z + dz * i + (tooth ? 0 : Math.sin(t * Math.PI) * 1.3);
    for (let a = -Math.ceil(r); a <= Math.ceil(r); a++)
      for (let b = -Math.ceil(r); b <= Math.ceil(r); b++)
        for (let c = -Math.ceil(r); c <= Math.ceil(r); c++) {
          if (a * a + b * b + c * c > r * r) continue;
          const X = Math.round(px + a), Y = Math.round(py + b), Z = Math.round(pz + c);
          const base = tooth ? (t > 0.6 ? YETI.fang : YETI.fangLo) :
            (t > 0.74 ? YETI.clawTip : t > 0.24 ? YETI.claw : YETI.clawDark);
          M.set(X, Y, Z, jitter(base, 0.03, hash3(X, Y, Z, seed)));
        }
  }
}
function surfaceFront(M, x, y) {
  for (let z = M.sz - 1; z >= 0; z--) if (M.has(x, y, z)) return z;
  return -1;
}

export function detailYetiTorso(M) {
  const C = 34, Z = 22;
  for (const s of [-1, 1]) {
    furPlates(M, C + s * 13, 35, Z + 2, 9, 7, 11, 710 + s, 110, 6, -0.9);
    iceFlakes(M, C + s * 13, 33, Z - 5, 8, 7, 9, 730 + s, 34);
    for (let k = 0; k < 7; k++)
      crystal(M, C + s * (14 + k * 1.5), 43 - k * 1.2, 13 - k * 0.4, s * 0.45, 1, -0.4, 5 + k % 3 * 2, 1.45);
  }
  // Keep the crossed leather harness readable above the white mane.
  furPlates(M, C, 30, Z + 7, 17, 13, 8, 750, 205, 6, -0.95);
  iceFlakes(M, C, 28, Z + 7, 15, 13, 9, 755, 85);
  for (const [x0, y0, x1, y1] of [[C - 15, 41, C + 12, 11], [C + 15, 41, C - 12, 11]]) {
    for (let y = 13; y <= 40; y++) {
      const x = Math.round(x0 + (x1 - x0) * (y - y0) / (y1 - y0));
      const z = surfaceFront(M, x, y);
      if (z < 0) continue;
      M.set(x, y, Math.min(M.sz - 1, z + 1), y % 5 === 0 ? 0x987b5d : YETI.leather);
      for (const edge of [-2, 2]) {
        const zz = surfaceFront(M, x + edge, y);
        if (zz >= 0) M.set(x + edge, y, Math.min(M.sz - 1, zz + 1), YETI.leatherLo);
      }
    }
  }
  for (let i = 0; i < 18; i++) {
    const a = i * TAU / 18;
    crystal(M, C + Math.cos(a) * 12, 12, Z + Math.sin(a) * 10, Math.cos(a) * 0.2, -1, Math.sin(a) * 0.3, 3 + i * 7 % 5, 1.1);
  }
}

export function detailYetiHead(M) {
  const C = 22;
  for (const s of [-1, 1]) {
    furPlates(M, C + s * 9.8, 18, 18, 4.7, 7.4, 6.6, 790 + s, 75, 5, -0.95);
    iceFlakes(M, C + s * 9, 25, 15, 4.3, 5.5, 5.6, 800 + s, 25);
    for (let k = 0; k < 6; k++)
      crystal(M, C + s * (3 + k * 2), 31 - k * 0.8, 10 + k % 3, s * 0.42, 1, -0.38, 5 + k % 3 * 2, 1.4);
  }
  furPlates(M, C, 10, 25, 7.2, 5.5, 5, 813, 90, 7, -1.2);
  for (const s of [-1, 1]) {
    M.ellipsoid(C + s * 2.3, 12.8, 32, 1.3, 0.95, 1.2, 0x263444);
    for (let i = 0; i < 3; i++) M.set(C + s * 2, 11 - i, 32, shade(YETI.skinDark, 0.7));
  }
  for (const x of [C - 8, C - 4, C, C + 3, C + 7])
    talon(M, x, 10, 30, 0, -1, 0.12, x === C ? 3 : 4, 1.15, 825 + x, true);
}

export function detailYetiJaw(M) {
  furPlates(M, 17, 2.8, 19, 6.4, 2.4, 4.8, 840, 60, 5, -1);
  for (const side of [-1, 1])
    for (let z = 15; z <= 24; z += 3)
      talon(M, 17 + side * 5.6, 7, z, 0, 1, 0.08, 3, 1, z + (side + 1) * 31, true);
}

export function detailYetiArm(M, seed) {
  const C = 17, Z = 15;
  furPlates(M, C, 48, Z, 9.5, 8.1, 9, seed + 410, 130, 6, -0.78);
  furPlates(M, C, 22, Z + 0.5, 8.8, 9.2, 8.6, seed + 420, 120, 5, -0.86);
  iceFlakes(M, C, 23, Z, 8, 8, 8, seed + 430, 52);
  for (let i = 0; i < 4; i++)
    talon(M, C - 5.4 + i * 3.6, 3.3, Z + 11, (i - 1.5) * 0.1, -0.2, 1, 9 + i % 2, 1.75, seed + i);
}

export function detailYetiLeg(M, seed) {
  const C = 16, Z = 15;
  furPlates(M, C, 31, Z, 9.8, 9.2, 9.4, seed + 480, 140, 6, -0.85);
  furPlates(M, C, 14, Z, 7.7, 7.3, 7.5, seed + 490, 100, 5, -0.88);
  iceFlakes(M, C, 29, Z, 9.1, 8.3, 8.3, seed + 500, 38);
  for (let i = 0; i < 4; i++)
    talon(M, C - 5.6 + i * 3.8, 2.1, Z + 16.7, (i - 1.5) * 0.1, -0.04, 1, 8, 1.8, seed + i);
}
