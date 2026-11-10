import * as beasts from './beastAI.js';
import * as pirates from './pirateAI.js';

/**
 * Jungle and shipyard monsters live in their own modules. Each family exports:
 *   TYPES        Set of monster type ids
 *   DEFS         { type: { name, hp, radius, speed, dmg, gold: [lo, hi], aggro, build } }
 *   FX           { type: { spark, burst, death, tele, accel, knock, stun, plateY, deathDur, heavy, rage, rageText, slowmo, lift } }
 *   busy(m)      true while a hit must not stagger it
 *   holdsWarn(m) true while its telegraph should stay on screen
 *   think(m, dt, c) -> [mvx, mvz]
 *   animate(m, dt, ctx) -> { rootY, rootX }
 *   dead(m, dt, ctx)
 */
export const FAMILIES = [beasts, pirates];

export const FAMILY_BY_TYPE = new Map();
export const FAMILY_DEFS = {};
for (const f of FAMILIES) {
  for (const t of f.TYPES) FAMILY_BY_TYPE.set(t, f);
  Object.assign(FAMILY_DEFS, f.DEFS);
}

export const familyOf = (type) => FAMILY_BY_TYPE.get(type) || null;
export const familyFx = (type) => FAMILY_BY_TYPE.get(type)?.FX[type] || null;
