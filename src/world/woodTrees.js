import { VoxelModel, RNG, hash3, jitter, mix, shade, clamp } from '../engine/voxel.js';
import { bundle } from './models.js';

const J = (c, x, y, z, s = 0, a = 0.07) => jitter(c, a, hash3(x, y, z, s));

function cyl(m, cx, cz, y0, y1, r, color) {
  const R = Math.ceil(r) + 1;
  for (let y = y0; y < y1; y++)
    for (let z = Math.floor(cz - R); z <= Math.ceil(cz + R); z++)
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const dx = x + 0.5 - cx;
        const dz = z + 0.5 - cz;
        if (dx * dx + dz * dz <= r * r) {
          const c = typeof color === 'function' ? color(x, y, z) : color;
          if (c !== null && c !== undefined) m.set(x, y, z, c);
        }
      }
}

function blob(m, cx, cy, cz, rx, ry, rz, color, seed, noise = 0.35) {
  for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++)
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const dz = (z + 0.5 - cz) / rz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d <= 1 + (hash3(x, y, z, seed) - 0.5) * noise) {
          const c = typeof color === 'function' ? color(x, y, z, d) : color;
          if (c !== null && c !== undefined) m.set(x, y, z, c);
        }
      }
}

/** Same bark language as the oak and pine trunks: jitter, seams, and a species mark. */
function paintBark(spec, cx, cz, seed) {
  return (x, y, z) => {
    const ang = Math.atan2(z + 0.5 - cz, x + 0.5 - cx);
    const h = hash3(x, y, z, seed);
    let col = spec.bark;
    const mark = spec.mark;
    if (mark === 'plate') {
      const seam = y % 4 === 0 || Math.sin(ang * 6 + y * 0.2) > 0.78;
      col = seam ? spec.barkDark : h > 0.62 ? spec.barkHi : spec.bark;
    } else if (mark === 'eyes') {
      const knot = (y % 5 === 2 && h > 0.55) || (y % 5 === 3 && hash3(x, y, z, seed + 2) > 0.78);
      col = knot ? 0x16130f : h > 0.45 ? spec.barkHi : spec.bark;
    } else if (mark === 'lenticel') {
      col = y % 2 === 0 && h > 0.38 ? spec.barkHi : h > 0.86 ? spec.barkDark : spec.bark;
    } else if (mark === 'stripe') {
      col = Math.sin(ang * 8 + y * 0.55) > 0.05 ? spec.barkHi : spec.barkDark;
    } else if (mark === 'swirl') {
      col = Math.sin(ang * 5 + y * 0.9 + Math.sin(y * 0.45) * 2.2) > 0 ? spec.heart : spec.bark;
    } else if (mark === 'heartwood') {
      const crack = Math.sin(ang * 7 + y * 0.35) > 0.48;
      col = crack ? spec.heart : h > 0.7 ? spec.barkHi : spec.bark;
    } else if (mark === 'furrow') {
      const groove = Math.sin(ang * 9) > 0.28;
      col = groove ? spec.barkDark : h > 0.68 ? spec.barkHi : spec.bark;
    } else if (mark === 'diamond') {
      const d = Math.sin(ang * 8) * Math.sin(y * 0.95);
      col = d > 0.35 ? spec.barkDark : d < -0.35 ? spec.barkHi : spec.bark;
    } else if (mark === 'sheen') {
      const light = Math.max(0, Math.cos(ang - 0.7));
      col = mix(spec.bark, spec.barkHi, light * 0.9);
      if (h > 0.9) col = spec.barkDark;
    } else {
      col = h > 0.66 ? spec.barkHi : h < 0.2 ? spec.barkDark : spec.bark;
    }
    return shade(J(col, x, y, z, seed, 0.06), hash3(x, 0, z, seed) > 0.62 ? 0.88 : 1);
  };
}

function leafColor(spec, seed) {
  const pal = spec.leaves;
  return (x, y, z, d) => {
    const t = clamp(y / 16, 0, 1);
    const idx = clamp(Math.floor(t * (pal.length - 0.8) + (hash3(x, y, z, seed + 5) - 0.5) * 1.7 + (d || 0) * 0.45), 0, pal.length - 1);
    let c = pal[idx];
    if (spec.flush && hash3(x, y, z, seed + 8) > spec.flush.at) c = spec.flush.color;
    if (spec.blossom && hash3(x, y, z, seed + 11) > spec.blossom.at) {
      const cols = spec.blossom.colors;
      c = cols[Math.floor(hash3(x, y, z, seed + 12) * cols.length) % cols.length];
    }
    return J(shade(c, 0.78 + t * 0.28), x, y, z, seed, 0.05);
  };
}

const CROWNS = {
  full: { rx: 7.2, ry: 4.8, spread: 5.2, n: 5, noise: 0.48, cy: 7.6 },
  oval: { rx: 6.3, ry: 5.6, spread: 3.5, n: 4, noise: 0.42, cy: 8.4 },
  round: { rx: 5.5, ry: 5.0, spread: 3.1, n: 4, noise: 0.4, cy: 8.6 },
  column: { rx: 4.0, ry: 6.2, spread: 1.6, n: 5, noise: 0.36, cy: 11.2 },
  open: { rx: 6.6, ry: 4.2, spread: 5.2, n: 5, noise: 0.55, cy: 7.4 },
  spread: { rx: 8.0, ry: 3.8, spread: 6.0, n: 6, noise: 0.46, cy: 6.8 },
  tight: { rx: 5.4, ry: 4.2, spread: 2.8, n: 4, noise: 0.38, cy: 8.0 },
};

const TRUNKS = {
  standard: { h: 16, x0: 2, x1: 6, root: 3, reach: 1 },
  slender: { h: 18, x0: 3, x1: 6, root: 3, reach: 1 },
  tall: { h: 22, x0: 3, x1: 6, root: 4, reach: 1 },
  buttress: { h: 16, x0: 2, x1: 7, root: 6, reach: 2 },
  gnarled: { h: 15, x0: 2, x1: 7, root: 4, reach: 1, gnarl: true },
};

/** Hardwood: box trunk, root flare and blob crown, the same build as birch, oak and maple. */
function sculptHardwood(seed, spec) {
  const rng = new RNG(seed * 31 + 7);
  const crown = CROWNS[spec.crown] || CROWNS.full;
  const trunk = TRUNKS[spec.trunk] || TRUNKS.standard;
  const T = new VoxelModel(9, trunk.h, 9);
  const bark = paintBark(spec, 4.5, 4.5, seed);
  const limb = (x, y, z) => J(spec.limb, x, y, z, seed);
  T.box(trunk.x0, 0, trunk.x0, trunk.x1, trunk.h, trunk.x1, (x, y, z) => {
    if (trunk.gnarl && y > 3 && y < trunk.h - 3 && hash3(x, y, z, seed + 4) > 0.86) {
      const edge = x <= trunk.x0 || z <= trunk.x0 || x >= trunk.x1 - 1 || z >= trunk.x1 - 1;
      if (edge) return null;
    }
    return bark(x, y, z);
  });
  const reach = trunk.reach;
  const rh = trunk.root;
  T.box(trunk.x0 - reach, 0, trunk.x0, trunk.x0, rh, trunk.x1, bark);
  T.box(trunk.x1, 0, trunk.x0, trunk.x1 + reach, rh, trunk.x1, bark);
  T.box(trunk.x0, 0, trunk.x0 - reach, trunk.x1, rh, trunk.x0, bark);
  T.box(trunk.x0, 0, trunk.x1, trunk.x1, rh, trunk.x1 + reach, bark);
  if (trunk.reach > 1) {
    T.line(4, 4, 4, 0, 0, 0, bark, 2);
    T.line(4, 4, 4, 8, 0, 8, bark, 2);
    T.line(4, 4, 4, 0, 0, 8, bark, 2);
    T.line(4, 4, 4, 8, 0, 0, bark, 2);
  }
  const top = trunk.h - 1;
  T.line(4, top - 5, 4, 8, top, 4, limb, 2);
  T.line(4, top - 6, 4, 0, top - 1, 5, limb, 2);
  if (trunk.gnarl) {
    for (let i = 0; i < 4; i++) {
      const y = 4 + rng.int(0, Math.max(1, trunk.h - 8));
      const side = rng.chance(0.5) ? 1 : 6;
      T.box(side, y, rng.int(2, 5), side + 2, y + 2, rng.int(4, 6), bark);
    }
  }

  const F = new VoxelModel(24, 20, 24);
  const colorFn = leafColor(spec, seed);
  const noise = crown.noise;
  blob(F, 12, crown.cy, 12, crown.rx, crown.ry, crown.rx, colorFn, seed, noise);
  blob(F, 12, Math.max(3.2, crown.cy - crown.ry * 0.55), 12, Math.max(2.8, crown.rx * 0.42), 2.3, Math.max(2.8, crown.rx * 0.42), colorFn, seed + 3, 0.32);
  for (let i = 0; i < crown.n; i++) {
    const a = (i / crown.n) * Math.PI * 2 + rng.range(0, 0.6);
    blob(
      F,
      12 + Math.cos(a) * crown.spread,
      crown.cy - 1.6 + rng.range(-0.8, 1.6),
      12 + Math.sin(a) * crown.spread,
      rng.range(crown.rx * 0.4, crown.rx * 0.58),
      rng.range(2.3, 3.3),
      rng.range(crown.rx * 0.4, crown.rx * 0.58),
      colorFn,
      seed + 10 + i,
      noise,
    );
  }
  blob(F, 12 + rng.range(-1.5, 1.5), crown.cy + crown.ry * 0.55, 12 + rng.range(-1.5, 1.5), crown.rx * 0.58, 2.8, crown.rx * 0.58, colorFn, seed + 9, noise);
  // Seat the crown on the trunk. Voxel y maps to (y - foy) * 0.25.
  const trunkTop = trunk.h * 0.125;
  const bottomVoxel = Math.max(1.2, crown.cy - crown.ry);
  const foy = bottomVoxel - (trunkTop - 0.45) / 0.25;
  return {
    trunk: T,
    foliage: F,
    parts: [
      [T, 0.125, 4.5, 0, 4.5],
      [F, 0.25, 12, foy, 12],
    ],
  };
}

/** Conifer: round trunk and stacked needle discs, the same build as the pines. */
function sculptConifer(seed, spec) {
  const rng = new RNG(seed * 97 + 5);
  const narrow = spec.silhouette === 'narrow';
  const wide = spec.silhouette === 'wide';
  const T = new VoxelModel(12, 20, 12);
  const c = 6;
  const bark = paintBark(spec, c, c, seed);
  const baseR = narrow ? 1.55 : wide ? 2.05 : 1.8;
  for (let y = 0; y < 18; y++) {
    const flare = y < 4 ? (4 - y) * 0.45 : 0;
    const taper = y > 14 ? (y - 14) * 0.2 : 0;
    cyl(T, c, c, y, y + 1, baseR + flare - taper, bark);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.35;
    T.line(c + Math.cos(a) * baseR, 3, c + Math.sin(a) * baseR, c + Math.cos(a) * (baseR + 2.2), 0, c + Math.sin(a) * (baseR + 2.2), bark, 2);
  }
  for (let i = 0; i < 3; i++) {
    const a = rng.range(0, Math.PI * 2);
    const y = 7 + i * 2;
    T.line(c, y, c, c + Math.cos(a) * 3.1, y - 1, c + Math.sin(a) * 3.1, (x, y2, z) => J(spec.limb, x, y2, z, seed), 1);
  }

  const tiers = narrow ? 8 : wide ? 6 : 7;
  const R0 = narrow ? 5.0 : wide ? 6.5 : 5.6;
  const radii = [];
  for (let t = 0; t < tiers; t++) {
    const base = R0 - t * (narrow ? 0.4 : wide ? 0.82 : 0.6);
    radii.push(Math.max(1.15, base));
    radii.push(Math.max(0.85, base - (narrow ? 0.72 : 0.42)));
  }
  radii.push(1.05, 0.65);
  const pad = 4;
  const F = new VoxelModel(Math.ceil(R0 * 2 + pad * 2), radii.length + 1, Math.ceil(R0 * 2 + pad * 2));
  const cc = R0 + pad;
  const pal = spec.leaves;
  radii.forEach((r, ly) => {
    const t = ly / radii.length;
    const droop = narrow && ly % 2 === 1;
    const rr = droop ? r * 0.86 : r;
    for (let z = 0; z < F.sz; z++)
      for (let x = 0; x < F.sx; x++) {
        const dx = x + 0.5 - cc;
        const dz = z + 0.5 - cc;
        const d = Math.sqrt(dx * dx + dz * dz);
        const ang = Math.atan2(dz, dx);
        const edgeNoise = hash3(x, ly, z, seed) * 0.85 + Math.sin(ang * 5 + ly) * 0.32;
        if (d > rr + edgeNoise * 0.5 - (ly % 2 === 1 ? 0.18 : 0)) continue;
        const idx = Math.min(pal.length - 1, Math.floor(hash3(x, ly, z, seed + 3) * pal.length));
        let col = mix(pal[idx], pal[pal.length - 1], t * 0.42);
        col = shade(col, ly % 2 === 0 ? 0.84 : 1);
        if (droop) col = shade(col, 0.78);
        if (d > rr - 0.55) col = mix(col, spec.tip || pal[pal.length - 1], 0.4);
        if (spec.cones && hash3(x, ly, z, seed + 9) > 0.975 && d < rr - 0.35 && ly > 1 && ly < radii.length - 3) col = spec.cones;
        F.set(x, ly, z, J(col, x, ly, z, seed, 0.05));
      }
  });
  return {
    trunk: T,
    foliage: F,
    parts: [
      [T, 0.125, c, 0, c],
      [F, 0.25, cc, narrow ? -4.6 : wide ? -2.8 : -3.5, cc],
    ],
  };
}

/** Voxel models before they become geometry, so tests can audit the sculpt. */
export function sculptWoodTree(seed, spec) {
  return spec.form === 'conifer' ? sculptConifer(seed, spec) : sculptHardwood(seed, spec);
}

/** Geometry parts in the same bundle layout as buildOak and buildPine. */
export function buildWoodTree(seed, spec) {
  return bundle(sculptWoodTree(seed, spec).parts);
}
