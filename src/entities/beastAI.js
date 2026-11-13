import { buildBengalTiger, buildBattleRaptor } from './jungleBeasts.js';
import * as tiger from './tigerAI.js';
import * as raptor from './raptorAI.js';

/**
 * Jungle beasts: the Bengal Tiger (a stalking ambusher) and the Battle Raptor (a pack hunter).
 * Each lives in its own module; this file is the family contract that mobFamilies.js consumes.
 */
const BY_TYPE = { tiger, raptor };

export const TYPES = new Set(['tiger', 'raptor']);
export const DEFS = {
  tiger: { name: 'Bengal Tiger', hp: 120, radius: 0.9, speed: 4.4, dmg: 5, gold: [30, 50], aggro: 16, build: buildBengalTiger },
  raptor: { name: 'Battle Raptor', hp: 90, radius: 0.75, speed: 4.8, dmg: 4, gold: [25, 45], aggro: 16, build: buildBattleRaptor },
};
export const FX = { tiger: tiger.FX, raptor: raptor.FX };

export const busy = (m) => BY_TYPE[m.type].busy(m);
export const holdsWarn = (m) => BY_TYPE[m.type].holdsWarn(m);
export const think = (m, dt, c) => BY_TYPE[m.type].think(m, dt, c);
export const animate = (m, dt, ctx) => BY_TYPE[m.type].animate(m, dt, ctx);
export const dead = (m, dt, ctx) => BY_TYPE[m.type].dead(m, dt, ctx);
