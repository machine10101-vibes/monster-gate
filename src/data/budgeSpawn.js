/**
 * Green Budge Dragons roam the whole overworld: ten live at a time,
 * and a kill opens that slot again after thirty minutes of wall-clock time.
 * Rift and cave dragons do not count against the cap.
 */

export const BUDGE_CAP = 10;
export const BUDGE_RESPAWN_MS = 30 * 60 * 1000;
export const BUDGE_LEVEL = 80;
export const BUDGE_STR = 80;
export const BUDGE_HEAVY = 85;
export const BUDGE_SEP = 48;
/** Interior pad inside a 144-unit land so dragons do not sit on tile rims. */
export const BUDGE_PAD = 18;
/** ZONE.TOWN / WATER / MINE / LAKE from terrain.js. */
export const BUDGE_BLOCKED_ZONES = new Set([3, 4, 7, 8]);

export function isOverworldBudge(m) {
  return !!m && !m.dead && m.type === 'budgedragon' && m.realm !== 'rift' && m.realm !== 'cave';
}

export function liveOverworldBudgeCount(monsters) {
  return (monsters || []).filter(isOverworldBudge).length;
}

/** How many overworld budges may spawn right now. Unfilled world slots fill immediately; kill slots wait out readyAt. */
export function budgeSpawnAllowance(now, live, readyAt, cap = BUDGE_CAP) {
  const room = Math.max(0, cap - (live | 0));
  if (room === 0) return 0;
  const ready = readyAt || [];
  let pending = 0;
  let due = 0;
  for (const t of ready) {
    if (t > now) pending++;
    else due++;
  }
  const unfilled = Math.max(0, cap - live - pending - due);
  return Math.min(room, due + unfilled);
}

export function consumeBudgeReady(now, readyAt) {
  const ready = readyAt || [];
  const i = ready.findIndex((t) => t <= now);
  if (i < 0) return ready.slice();
  return ready.filter((_, j) => j !== i);
}

export function scheduleBudgeRespawn(now, readyAt, realm) {
  const ready = (readyAt || []).slice();
  if (realm === 'rift' || realm === 'cave') return ready;
  ready.push(now + BUDGE_RESPAWN_MS);
  return ready;
}

/** A playable overworld point on a random land, kept off towns, water, the hunter, and other budges. */
export function pickBudgeWorldSpot(world, rng, player, live, minFromPlayer = 22) {
  const lands = world?.lands || [];
  if (!lands.length || !rng) return null;
  const P = player || { x: 72, z: 72 };
  const pack = live || [];
  for (let n = 0; n < 56; n++) {
    const land = lands[rng.int(0, lands.length - 1)];
    if (!land) continue;
    const x = land.x0 + rng.range(BUDGE_PAD, 144 - BUDGE_PAD);
    const z = land.z0 + rng.range(BUDGE_PAD, 144 - BUDGE_PAD);
    if (world.rift?.contains?.(x, z) || world.cave?.contains?.(x, z)) continue;
    if (world.playable && !world.playable(x, z)) continue;
    if (world.isWater?.(x, z)) continue;
    const zn = world.zoneAt?.(x, z);
    if (BUDGE_BLOCKED_ZONES.has(zn)) continue;
    const h = world.heightAt ? world.heightAt(x, z) : 2;
    if (h < 0.9 || h > 7.2) continue;
    if (world.free && !world.free(x, z, 1.2)) continue;
    if (minFromPlayer && Math.hypot(x - P.x, z - P.z) < minFromPlayer) continue;
    if (pack.some((m) => Math.hypot(m.x - x, m.z - z) < BUDGE_SEP)) continue;
    return { x, z };
  }
  return null;
}
