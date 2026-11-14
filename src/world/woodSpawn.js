import { TILE } from '../engine/materials.js';
import { W, ZONE } from './terrain.js';

/**
 * Tier 4 timber only. These are the lands where monsters of level 7 and up hunt:
 * knights and the warden, yetis on the mesa, the Darksycle den, deep jungle, sandworms.
 */
export const EXOTIC_KINDS = new Set([
  'hellspire', 'dawnspire', 'warfield',
  'rimefang',
  'southford',
  'canopy', 'tigerwood', 'sunken',
  'deepwell', 'greenbowl', 'sunspill', 'glassroad',
]);

/** Local tile coords. Matches ARCTIC_SPECS.rimefang.mesa. */
export const RIMEFANG_MESA = { cx: 70, cz: 66, rTop: 17 };

/** Offsets from the mesa centre. Matches the nests in dressMesa. */
export const YETI_NESTS = [[0, 0], [-8.2, 6], [8.4, -5.5], [-3.4, -9.8]];

/** Southford local position of the den mouth. World z is this plus SOUTH_Z. */
export const CAVE_LOCAL = { x: 104, z: 44 };

const BANNED = new Set([ZONE.TOWN, ZONE.WATER, ZONE.LAKE, ZONE.FARM, ZONE.GATE, ZONE.MINE]);

export function landKindOf(land) {
  if (!land) return '';
  if (land.kind) return land.kind;
  if (land.role === 'south') return 'southford';
  if (land.role === 'oak') return 'oakhollow';
  return '';
}

/** True when this local spot is inside a high-level monster range, not merely on that tile. */
export function exoticLocal(kind, lx, lz) {
  if (kind === 'rimefang') {
    const dx = lx - RIMEFANG_MESA.cx;
    const dz = lz - RIMEFANG_MESA.cz;
    const d = Math.hypot(dx, dz);
    if (d < 7.6 || d > RIMEFANG_MESA.rTop - 2.2) return false;
    return !YETI_NESTS.some(([ox, oz]) => Math.hypot(lx - (RIMEFANG_MESA.cx + ox), lz - (RIMEFANG_MESA.cz + oz)) < 4.5);
  }
  if (kind === 'southford') {
    const d = Math.hypot(lx - CAVE_LOCAL.x, lz - CAVE_LOCAL.z);
    return d > 10 && d < 30;
  }
  return EXOTIC_KINDS.has(kind);
}

/** Pick a local tile cell. Tier 4 samples the monster ground, not the whole square. */
export function sampleWoodLocal(kind, rng, tier = 1) {
  if (tier >= 4 && kind === 'rimefang') {
    for (let n = 0; n < 8; n++) {
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(8.8, RIMEFANG_MESA.rTop - 3.4);
      const lx = Math.round(RIMEFANG_MESA.cx + Math.cos(a) * d);
      const lz = Math.round(RIMEFANG_MESA.cz + Math.sin(a) * d);
      if (exoticLocal('rimefang', lx, lz)) return { lx, lz };
    }
    return { lx: RIMEFANG_MESA.cx + 10, lz: RIMEFANG_MESA.cz };
  }
  if (tier >= 4 && kind === 'southford') {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(13, 26);
    const lx = clampTile(Math.round(CAVE_LOCAL.x + Math.cos(a) * d));
    const lz = clampTile(Math.round(CAVE_LOCAL.z + Math.sin(a) * d));
    if (exoticLocal('southford', lx, lz)) return { lx, lz };
    return { lx: CAVE_LOCAL.x + 16, lz: CAVE_LOCAL.z };
  }
  return { lx: rng.int(8, W - 9), lz: rng.int(8, W - 9) };
}

function clampTile(n) {
  return Math.max(6, Math.min(W - 7, n));
}

/**
 * Terrain and tier rules for one candidate cell.
 * `blocked` is for callers: groves, oasis, docks, spacing.
 */
export function woodSpotOk(wood, spot) {
  if (!wood || !spot || spot.blocked || spot.path) return false;
  if (spot.lx < 5 || spot.lz < 5 || spot.lx > W - 6 || spot.lz > W - 6) return false;
  const hi = wood.tier >= 4 && spot.kind === 'rimefang' ? 8.55 : 7.7;
  if (spot.h < 0.95 || spot.h > hi) return false;
  if ((spot.slope || 0) > 1.4) return false;
  if (BANNED.has(spot.zone)) return false;
  if (spot.top === TILE.LAVA || spot.top === TILE.ICE) return false;
  if (wood.tier >= 4) {
    if (!EXOTIC_KINDS.has(spot.kind)) return false;
    if (!exoticLocal(spot.kind, spot.lx, spot.lz)) return false;
  }
  return true;
}
