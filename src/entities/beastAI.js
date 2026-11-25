import { buildBengalTiger, buildBattleRaptor, buildTyrantRex } from './jungleBeasts.js';
import * as tiger from './tigerAI.js';
import * as raptor from './raptorAI.js';
import * as trex from './trexAI.js';

/**
 * Jungle beasts: the Bengal Tiger (a stalking ambusher), the Battle Raptor (a pack hunter)
 * and the Tyrant Rex (a level 200 apex predator that roams from the Lagoon to Pirate Shore).
 * Each lives in its own module; this file is the family contract that mobFamilies.js consumes.
 */
const BY_TYPE = { tiger, raptor, trex };

export const TYPES = new Set(['tiger', 'raptor', 'trex']);
export const DEFS = {
  tiger: { name: 'Bengal Tiger', hp: 120, radius: 0.9, speed: 4.4, dmg: 5, gold: [30, 50], aggro: 16, build: buildBengalTiger },
  raptor: { name: 'Battle Raptor', hp: 90, radius: 0.75, speed: 4.8, dmg: 4, gold: [25, 45], aggro: 16, build: buildBattleRaptor },
  trex: { name: 'Tyrant Rex', hp: 1800, radius: 2.6, speed: 3.6, dmg: 11, gold: [500, 800], aggro: 24, build: buildTyrantRex },
};
export const FX = { tiger: tiger.FX, raptor: raptor.FX, trex: trex.FX };

export const busy = (m) => BY_TYPE[m.type].busy(m);
export const holdsWarn = (m) => BY_TYPE[m.type].holdsWarn(m);
export const think = (m, dt, c) => BY_TYPE[m.type].think(m, dt, c);
export const animate = (m, dt, ctx) => BY_TYPE[m.type].animate(m, dt, ctx);
export const dead = (m, dt, ctx) => BY_TYPE[m.type].dead(m, dt, ctx);
