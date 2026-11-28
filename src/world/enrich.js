import { fbm, hash2 } from '../engine/voxel.js';
import { W, ZONE, WATER_Y } from './terrain.js';
import { TILE } from '../engine/materials.js';
import { TILES, originOf } from './tiles.js';
import { OASIS } from './desert.js';
import { EXCHANGE } from './exchange.js';
import { NORTH_GROVE_SEED } from './northForest.js';

/**
 * Landscape detail pass. Oakhollow (tile 55) is the bar: dense mixed groves, lone big trees in
 * the open, flower meadows, undergrowth under the canopy, rock outcrops and fallen timber. Every
 * other built tile keeps its own environment and gets the same fullness from its own biome kit.
 *
 * Runs after every land has been dressed, so it only fills ground nothing else claimed: it never
 * touches roads (and keeps a verge beside them), water, towns, mines, farms, landmark clearings
 * or a terrace edge, and it respects every occupied spot. Placement is deterministic per tile.
 * Repeated props are instanced, and instanced props are grouped per tile, so a far tile costs
 * nothing until the hunter streams it in.
 */

/** Detail recipes. `grove` is how much of the tile is forest (0 none … 1 all). */
export const BIOME_DETAIL = {
  meadow: { grove: 0.3, trees: 0.3, under: 0.26, meadow: 0.32, tufts: 0.1, lone: 0.008, rocks: 0.006, timber: 0.003 },
  forest: { grove: 0.5, trees: 0.34, under: 0.3, meadow: 0.26, tufts: 0.1, lone: 0.01, rocks: 0.007, timber: 0.005 },
  river: { grove: 0.38, trees: 0.32, under: 0.28, meadow: 0.3, tufts: 0.1, lone: 0.008, rocks: 0.007, timber: 0.004 },
  lake: { grove: 0.36, trees: 0.32, under: 0.28, meadow: 0.3, tufts: 0.1, lone: 0.008, rocks: 0.006, timber: 0.004 },
  town: { grove: 0.26, trees: 0.28, under: 0.24, meadow: 0.3, tufts: 0.1, lone: 0.008, rocks: 0.005, timber: 0.003 },
  arctic: { grove: 0.34, trees: 0.28, under: 0.2, meadow: 0.2, tufts: 0.08, lone: 0.008, rocks: 0.012, timber: 0.004 },
  volcanic: { grove: 0.22, trees: 0.22, under: 0.2, meadow: 0.16, tufts: 0.06, lone: 0.006, rocks: 0.016, timber: 0.005 },
  oasis: { grove: 0.42, trees: 0.22, under: 0.34, meadow: 0.18, tufts: 0.14, lone: 0.003, rocks: 0.034, timber: 0.004, camp: 0.0016, size: 1.12, rockSize: 1.6 },
  jungle: { grove: 0.4, trees: 0.2, under: 0.24, meadow: 0.22, tufts: 0.08, lone: 0.006, rocks: 0.006, timber: 0.003 },
  coast: { grove: 0.26, trees: 0.24, under: 0.24, meadow: 0.24, tufts: 0.08, lone: 0.008, rocks: 0.01, timber: 0.004 },
  // Open beach and shingle inside another biome's tile: no trees, just what the tide leaves.
  strand: { grove: 0, trees: 0, under: 0.04, meadow: 0.05, tufts: 0.1, lone: 0, rocks: 0.012, timber: 0.01 },
};

/** Tiles whose purpose needs a different mix: the Endless Field is a battlefield and stays open. */
export const TILE_DETAIL = {
  24: { grove: 0.05, trees: 0.12, rocks: 0.022 },
  // The Northern Forest shares one grove field across its six tiles, matched by its ground paint.
  ...Object.fromEntries([17, 18, 19, 27, 28, 29].map((n) => [n, { groveSeed: NORTH_GROVE_SEED }])),
};

/** Which models each biome draws from. Missing kits fall back to the temperate set. */
function kitFor(biome, m) {
  const A = m.arctic || {};
  const V = m.volcanic || {};
  const D = m.desert || {};
  const J = m.jungle || {};
  const temperate = {
    trees: [...m.oaks, ...m.oaks, ...m.oaks, ...m.oaks, ...m.pines, ...m.pines, m.blossoms[0], m.autumn[0]].filter(Boolean),
    big: m.giants?.length ? m.giants : m.oaks,
    under: [...m.bushes, ...m.ferns, ...m.tuftsForest, ...m.mushRed, ...m.mushBrown],
    meadow: [...m.flowers, ...m.flowers, ...m.tuftsGold],
    tufts: m.tufts,
    rocks: [...m.rocks, ...m.rocks, ...m.boulders],
    timber: [...m.logs, ...m.stumps],
  };
  switch (biome) {
    case 'forest':
      return { ...temperate, trees: [...m.pines, ...m.pines, ...m.pines, ...m.oaks, ...m.oaks, m.autumn[0]].filter(Boolean) };
    case 'arctic':
      return {
        trees: [...(A.frostPines || m.snowPines), ...m.snowPines, ...(A.deadTrees || [])],
        big: A.frostPines || m.snowPines,
        under: [...(A.frostBushes || []), ...(A.frostFlowers || []), ...(A.snowMounds || [])],
        meadow: [...(A.frostFlowers || []), ...(A.snowMounds || [])],
        tufts: A.snowMounds || m.tufts,
        rocks: [...(A.snowRocks || m.rocks), ...(A.snowBoulders || []), ...(A.iceClusters || [])],
        timber: A.frozenLogs || m.logs,
      };
    case 'volcanic':
      return {
        trees: V.ashTrees || m.pines,
        big: V.ashTrees || m.pines,
        under: [...(V.thornBushes || []), ...(V.ashMounds || [])],
        meadow: [...(V.emberBlooms || []), ...(V.thornBushes || [])],
        tufts: V.ashMounds || m.rocks,
        rocks: [...(V.rocks || m.rocks), ...(V.rocks || []), ...(V.boulders || []), ...(V.obsidianSpires || [])],
        timber: [...(V.logs || []), ...(V.ribs || [])],
      };
    case 'oasis':
      return {
        trees: [...(D.cactus || []), ...(D.cactus || []), ...(D.scrub || []), ...(A.deadTrees || [])],
        big: D.buttes?.length ? D.buttes : D.cactus || m.pines,
        under: [...(D.scrub || []), ...(D.scrub || [])],
        meadow: [...(D.scrub || []), ...(D.cactus || [])],
        tufts: D.scrub || m.tufts,
        rocks: [...m.rocks, ...m.boulders, ...m.rocks],
        timber: [...(V.ribs || []), ...(A.ribCage || []), ...(J.driftwood || [])],
        camp: D.tent?.length ? { tent: D.tent, crates: [...m.crate, ...m.barrel, ...(m.pots || [])] } : null,
      };
    case 'jungle':
      return {
        trees: [...(J.broadleaf || []), ...(J.palms || []), ...(J.bananas || []), ...(J.bamboo || [])],
        big: J.broadleaf?.length ? J.broadleaf : m.oaks,
        under: [...(J.ferns || []), ...(J.bigLeaves || []), ...(J.tropBush || []), ...(J.heliconia || [])],
        meadow: [...(J.orchids || []), ...(J.hibiscus || []), ...(J.heliconia || [])],
        tufts: J.ferns || m.tufts,
        rocks: [...(J.mossRocks || m.rocks), ...(J.mossBoulders || [])],
        timber: m.logs,
      };
    case 'strand':
      return {
        trees: [],
        big: [],
        under: J.beachRocks?.length ? J.beachRocks : m.rocks,
        meadow: J.shells?.length ? J.shells : m.tufts,
        tufts: m.tufts,
        rocks: [...(J.beachRocks || []), ...m.rocks],
        timber: J.driftwood?.length ? J.driftwood : m.logs,
      };
    case 'coast':
      return {
        trees: [...(J.palms || []), ...(J.palmsLean || []), ...(J.palmsShort || []), ...m.oaks],
        big: J.palms?.length ? J.palms : m.oaks,
        under: [...(J.tropBush || []), ...(J.ferns || []), ...m.bushes],
        meadow: [...m.flowers, ...(J.hibiscus || [])],
        tufts: m.tufts,
        rocks: [...(J.beachRocks || m.rocks), ...m.rocks],
        timber: J.driftwood?.length ? J.driftwood : m.logs,
      };
    default:
      return temperate;
  }
}

/** Open ground every landmark keeps around it. */
function clearings(world) {
  const out = [];
  const add = (p, r) => {
    if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) out.push({ x: p.x, z: p.z, r });
  };
  for (const v of world.tribe?.villages || []) add(v, (v.r || 14) + 5);
  add(world.demonKeep, 34);
  add(world.holyKeep, 34);
  add(world.warfield, 36);
  add(world.orcCamp, (world.orcCamp?.r || 16) + 6);
  add(world.yetiPeak, (world.yetiPeak?.r || 10) + 8);
  add(world.volcanumLair, 18);
  add(world.mine, 20);
  add(world.sandMine, (world.sandMine?.r || 20) + 8);
  add(world.waygate, 9);
  add(world.smithy, 10);
  add(world.forge, 10);
  add({ x: OASIS.x, z: OASIS.z }, OASIS.r + OASIS.shore + 4);
  add({ x: EXCHANGE.x, z: EXCHANGE.z }, EXCHANGE.flat + EXCHANGE.blend + 4);
  if (world.gilantre) add({ x: 432, z: 144 }, 50);
  for (const t of world.teleports || []) add(t, 6);
  for (const g of world.runeGates || []) add(g, 8);
  for (const f of world.fishSpots || []) add({ x: f.standX ?? f.x, z: f.standZ ?? f.z }, 4);
  for (const s of Object.values(world.npcSpots || {})) add(s, 4);
  return out;
}

const BLOCKED = new Set([ZONE.WATER, ZONE.LAKE, ZONE.TOWN, ZONE.MINE, ZONE.FARM, ZONE.GATE]);
/** Ground kinds that stay clear whatever zone they are in: ploughed strips, roads and paving. */
const BARE_TOPS = new Set([TILE.FARMLAND, TILE.PATH, TILE.COBBLE].filter((t) => t !== undefined));

/** Ground a detail prop may stand on: dry land, off roads (with a verge), outside every clearing. */
function groundAt(world, x, z, clear) {
  const land = world.landAt(x, z);
  if (!land?.data?.pathMask) return null;
  const D = land.data;
  const lx = Math.floor(x) - land.x0;
  const lz = Math.floor(z) - land.z0;
  if (lx < 1 || lz < 1 || lx >= W - 1 || lz >= W - 1) return null;
  const i = lz * W + lx;
  if (BLOCKED.has(D.zone[i])) return null;
  if (D.top) {
    if (BARE_TOPS.has(D.top[i])) return null;
    // Fields keep a clear margin so no canopy spills over the furrows.
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++) {
        const nx = lx + dx;
        const nz = lz + dz;
        if (nx >= 0 && nz >= 0 && nx < W && nz < W && D.top[nz * W + nx] === TILE.FARMLAND) return null;
      }
  }
  for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (D.pathMask[i + dz * W + dx]) return null;
  const h = world.heightAt(x, z);
  if (h < WATER_Y + 0.3 || h > 12) return null;
  if (!world.playable(x, z)) return null;
  for (const c of clear) if (Math.hypot(x - c.x, z - c.z) < c.r) return null;
  return { h, land };
}

/** Detail one built tile. Returns how many props it placed. */
export function enrichTile(world, tile, dens = 1) {
  const baseRecipe = { ...(BIOME_DETAIL[tile.biome] || BIOME_DETAIL.meadow), ...(TILE_DETAIL[tile.n] || {}) };
  const baseKit = kitFor(tile.biome, world.models);
  // A land can hand some cells to another kit (snow in a forest tile takes frost pines, sand takes driftwood).
  const kits = {};
  const mixFor = (land, x, z) => {
    const b = land.detailBiome?.(Math.floor(x) - land.x0, Math.floor(z) - land.z0);
    if (!b || b === tile.biome) return null;
    return kits[b] || (kits[b] = { recipe: { ...(BIOME_DETAIL[b] || baseRecipe) }, kit: kitFor(b, world.models) });
  };
  const pick = (list, k) => (list?.length ? list[Math.floor(k * list.length) % list.length] : null);
  const clear = world.__enrichClear || (world.__enrichClear = clearings(world));
  const o = originOf(tile);
  const seed = 900 + tile.n * 17;
  const step = 1.9;
  let placed = 0;
  const put = (parts, x, z, rot, scale, r, collide, opts) => {
    if (!parts) return false;
    if (!world.free(x, z, r)) return false;
    if (world.overLedge(x, z, 0.45 * scale)) return false;
    world.putAt(parts, x, z, rot, scale, { ...(opts || {}), detail: true });
    world.occupy(x, z, r);
    if (collide) world.circle(x, z, collide);
    placed++;
    return true;
  };
  // Giant canopies are landmark-sized already: they stand alone, at their own size, never in a grove.
  const tree = (list, x, z, k, big = false) => {
    const s = ((big ? 0.9 : 0.85) + hash2(x * 7, z * 3, seed + 5) * (big ? 0.25 : 0.45)) * (baseRecipe.size || 1);
    if (put(pick(list, k), x, z, Math.floor(hash2(x, z, seed + 6) * 4) * (Math.PI / 2), s, 0.95 * s, 0.32 * s)) world.treeDots?.push({ x, z });
  };
  const small = (list, x, z, k, scale, cover = true) => put(pick(list, k), x, z, hash2(x, z, seed + 8) * 6.28, scale * (baseRecipe.size ? Math.sqrt(baseRecipe.size) : 1), 0.35, 0, cover ? { cover: true } : undefined);

  for (let gz = 1.5; gz < W - 1.5; gz += step) {
    for (let gx = 1.5; gx < W - 1.5; gx += step) {
      const x = o.x + gx + (hash2(gx * 3.1, gz, seed) - 0.5) * step;
      const z = o.z + gz + (hash2(gx, gz * 2.7, seed + 1) - 0.5) * step;
      const g = groundAt(world, x, z, clear);
      if (!g) continue;
      const mix = mixFor(g.land, x, z);
      const recipe = mix ? mix.recipe : baseRecipe;
      const kit = mix ? mix.kit : baseKit;
      const roll = hash2(x * 1.3, z * 1.7, seed + 2);
      const k = hash2(x * 0.7, z * 0.9, seed + 3);
      if (roll > dens) continue; // lower quality keeps a share of every kind
      const r = roll / Math.max(0.05, dens);
      const grove = fbm(x * 0.032, z * 0.032, baseRecipe.groveSeed ?? seed + 11, 3);
      const patch = fbm(x * 0.09 + 7, z * 0.09, seed + 13, 2);
      const forestLine = 0.62 - recipe.grove * 0.3;
      if (grove > forestLine) {
        // In a grove: a closed canopy with undergrowth between the trunks.
        if (r < recipe.trees) tree(kit.trees, x, z, k);
        else if (r < recipe.trees + recipe.under) small(kit.under, x, z, k, 0.9 + k * 0.4, true);
      } else if (grove > forestLine - 0.06) {
        // The grove's edge: scattered young trees, bushes and flowers.
        if (r < recipe.trees * 0.3) tree(kit.trees, x, z, k);
        else if (r < recipe.trees * 0.3 + recipe.under * 0.6) small(kit.under, x, z, k, 0.85 + k * 0.4);
        else if (r < recipe.trees * 0.3 + recipe.under * 0.6 + recipe.meadow * 0.5) small(kit.meadow, x, z, k, 1);
      } else {
        // Open ground: flower meadows in patches, tufts, a lone big tree, an outcrop, fallen timber.
        if (patch > 0.56 && r < recipe.meadow) small(kit.meadow, x, z, k, 1);
        else if (r < recipe.tufts) small(kit.tufts, x, z, k, 0.9 + k * 0.3);
        else if (r > 1 - recipe.lone) tree(kit.big, x, z, k, true);
        else if (r > 1 - recipe.lone - recipe.rocks) {
          for (let n = 0; n < 4; n++) {
            const a = hash2(x + n, z, seed + 20) * 6.28;
            const d = n === 0 ? 0 : 1 + hash2(x, z + n, seed + 21) * 1.6;
            const rx = x + Math.cos(a) * d;
            const rz = z + Math.sin(a) * d;
            if (!groundAt(world, rx, rz, clear)) continue;
            const s = (n === 0 ? 1.1 + k * 0.9 : 0.6 + hash2(rx, rz, seed + 22) * 0.5) * (recipe.rockSize || 1);
            put(pick(kit.rocks, hash2(rx, rz, seed + 23)), rx, rz, a, s, 0.7 * s, n === 0 ? 0.5 * s : 0);
          }
        } else if (r > 1 - recipe.lone - recipe.rocks - recipe.timber) put(pick(kit.timber, k), x, z, k * 6.28, 1.1, 0.9, 0.5);
        else if (kit.camp && recipe.camp && r > 1 - recipe.lone - recipe.rocks - recipe.timber - recipe.camp && world.free(x, z, 5)) {
          if (put(pick(kit.camp.tent, k), x, z, k * 6.28, 1, 2.2, 1.4)) {
            for (let n = 0; n < 5; n++) {
              const a = k * 6.28 + 1.2 + n * 0.9;
              const cx = x + Math.cos(a) * 3.2;
              const cz = z + Math.sin(a) * 3.2;
              if (groundAt(world, cx, cz, clear)) put(pick(n < 3 ? kit.camp.crates : kit.rocks, hash2(cx, cz, seed + 30)), cx, cz, a, n < 3 ? 1 : 0.8, 0.5, 0.35);
            }
          }
        }
      }
    }
  }
  return placed;
}

/** Detail every built tile except Oakhollow, which is the reference. */
export function enrichWorld(world) {
  const q = world.quality || {};
  const dens = Math.max(0.2, Math.min(1, q.scatter ?? q.density ?? 1));
  const shared = world.instanceProps;
  world.instanceProps = true;
  const counts = {};
  try {
    for (const tile of TILES) {
      if (!tile.built || tile.n === 55) continue;
      counts[tile.n] = enrichTile(world, tile, dens);
    }
  } finally {
    world.instanceProps = shared;
    world.__enrichClear = null;
  }
  world.enrichCounts = counts;
  return counts;
}
